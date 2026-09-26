// Dashboard API: quotations (BOQ format). Requires CMS session.
// GET /.netlify/functions/cms-quotations[?status=draft]
// POST { client_name*, phone?, email?, project?, site?, location?, title?, items[], discount?, terms?, notes? }
// PATCH { id, status? | client_name?, ..., items[]?, discount?, terms?, notes? }
// DELETE { id }
import { bearerSession, json, verifySession } from "./_auth.mjs";
import { sbConfigured, sbRest } from "./_supabase.mjs";

const STATUSES = ["draft", "sent", "approved", "rejected"];
const UNITS = ["job", "nos", "sft", "rft"];
const clean = (v, n) => String(v ?? "").trim().slice(0, n);
const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

function sanitizeItems(items) {
  if (!Array.isArray(items)) return [];
  return items.slice(0, 100).map((it) => {
    const desc = clean(it?.desc, 300);
    const qty = num(it?.qty);
    const unit = UNITS.includes(String(it?.unit || "").toLowerCase())
      ? String(it.unit).toLowerCase()
      : "job";
    const rate = num(it?.rate);
    return { desc, qty, unit, rate, amount: Math.round(qty * rate * 100) / 100 };
  }).filter((it) => it.desc);
}

function totals(items, discount) {
  const subtotal = items.reduce((a, it) => a + it.amount, 0);
  const d = Math.min(num(discount), subtotal);
  return { subtotal: Math.round(subtotal), discount: Math.round(d), total: Math.round(subtotal - d) };
}

async function nextRef() {
  const yy = String(new Date().getFullYear()).slice(2);
  let seq = 1;
  try {
    const { status, data } = await sbRest("quotations", { query: "?select=ref_no&limit=1000" });
    if (status === 200 && Array.isArray(data)) {
      const re = new RegExp(`^WI/Q-(\\d{4})/${yy}$`);
      for (const r of data) {
        const m = re.exec(r.ref_no || "");
        if (m) seq = Math.max(seq, Number(m[1]) + 1);
      }
    }
  } catch { /* fall through with seq=1 */ }
  return `WI/Q-${String(seq).padStart(4, "0")}/${yy}`;
}

export default async (req) => {
  const user = verifySession(bearerSession(req));
  if (!user) return json(401, { error: "Session expired. Please sign in again." });
  if (!sbConfigured()) return json(503, { error: "Database is not configured yet." });

  if (req.method === "GET") {
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const q =
      `?select=*&order=created_at.desc&limit=100` +
      (STATUSES.includes(status) ? `&status=eq.${status}` : "");
    const { status: s, data } = await sbRest("quotations", { query: q });
    if (s !== 200) return json(502, { error: "Could not load quotations." });
    return json(200, { quotations: data });
  }

  let body = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  if (req.method === "POST") {
    const client_name = clean(body?.client_name, 160);
    if (client_name.length < 2) return json(400, { error: "Client name is required." });
    const items = sanitizeItems(body?.items);
    if (!items.length) return json(400, { error: "Add at least one line item." });
    const t = totals(items, body?.discount);
    const ref_no = await nextRef();
    let ins = null;
    try {
      ins = await sbRest("quotations", {
        method: "POST",
        body: {
          ref_no,
          client_name,
          phone: clean(body?.phone, 40) || null,
          email: clean(body?.email, 160) || null,
          project: clean(body?.project, 200) || null,
          site: clean(body?.site, 200) || null,
          location: clean(body?.location, 200) || null,
          title: clean(body?.title, 120) || "Interior",
          items,
          ...t,
          terms: clean(body?.terms, 2000) || null,
          notes: clean(body?.notes, 2000) || null,
          status: "draft",
        },
      });
    } catch { ins = null; }
    if (!ins || (ins.status !== 201 && ins.status !== 200))
      return json(502, { error: "Could not save the quotation." });
    try {
      await sbRest("activity", {
        method: "POST",
        body: { kind: "quotation", text: `Quotation ${ref_no} created for ${client_name}`, meta: {} },
      });
    } catch { /* best-effort */ }
    return json(200, { ok: true, ref_no, quotation: ins.data?.[0] || null });
  }

  if (req.method === "PATCH") {
    const id = String(body?.id || "");
    if (!/^[0-9a-f-]{36}$/i.test(id)) return json(400, { error: "Invalid id." });
    const patch = { updated_at: new Date().toISOString() };
    if (STATUSES.includes(body?.status)) patch.status = body.status;
    // full edit (only sensible for drafts, but not enforced here)
    if (body?.items) {
      const items = sanitizeItems(body.items);
      if (!items.length) return json(400, { error: "Add at least one line item." });
      patch.items = items;
      Object.assign(patch, totals(items, body?.discount));
    }
    for (const k of ["client_name", "phone", "email", "project", "site", "location", "title", "terms", "notes"]) {
      if (typeof body?.[k] === "string") patch[k] = clean(body[k], k === "terms" || k === "notes" ? 2000 : 200) || null;
    }
    if (patch.client_name !== undefined && patch.client_name !== null && patch.client_name.length < 2)
      return json(400, { error: "Client name is required." });
    let res = null;
    try {
      res = await sbRest("quotations", { method: "PATCH", query: `?id=eq.${id}`, body: patch });
    } catch { res = null; }
    if (!res || (res.status !== 200 && res.status !== 204))
      return json(502, { error: "Could not update the quotation." });
    return json(200, { ok: true });
  }

  if (req.method === "DELETE") {
    const id = String(body?.id || new URL(req.url).searchParams.get("id") || "");
    if (!/^[0-9a-f-]{36}$/i.test(id)) return json(400, { error: "Invalid id." });
    let res = null;
    try {
      res = await sbRest("quotations", { method: "DELETE", query: `?id=eq.${id}` });
    } catch { res = null; }
    if (!res || (res.status !== 200 && res.status !== 204))
      return json(502, { error: "Could not delete the quotation." });
    return json(200, { ok: true });
  }

  return json(405, { error: "Method not allowed." });
};
