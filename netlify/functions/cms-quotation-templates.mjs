// Session-authenticated CRUD for quotation templates (per work type).
// GET    -> { templates: [...] }  (ordered by name)
// POST   -> { ok, id }            (create; name unique)
// PATCH  -> { ok }                (update by id)
// DELETE -> { ok }                (delete by id)
import { bearerSession, json, verifySession } from "./_auth.mjs";
import { sbConfigured, sbRest } from "./_supabase.mjs";

const UNITS = ["job", "nos", "sft", "rft"];
const UUID = /^[0-9a-f-]{36}$/i;

function cleanItems(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((it) => ({
      desc: String(it.desc || "").slice(0, 500).trim(),
      qty: Math.max(0, Number(it.qty) || 0),
      unit: UNITS.includes(it.unit) ? it.unit : "job",
      rate: Math.max(0, Number(it.rate) || 0),
    }))
    .filter((it) => it.desc);
}

export default async (req) => {
  const user = verifySession(bearerSession(req));
  if (!user) return json(401, { error: "Session expired. Please sign in again." });
  if (!sbConfigured()) return json(503, { error: "Database is not configured yet." });

  if (req.method === "GET") {
    const { status, data } = await sbRest("quotation_templates", {
      query: "?select=id,name,items,terms,created_at&order=name.asc&limit=200",
    });
    if (status !== 200) return json(502, { error: "Could not load templates." });
    return json(200, { templates: data || [] });
  }

  let body = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  if (req.method === "POST") {
    const name = String(body?.name || "").trim().slice(0, 120);
    if (name.length < 2) return json(400, { error: "Template name required." });
    let ins = null;
    try {
      ins = await sbRest("quotation_templates", {
        method: "POST",
        body: {
          name,
          items: cleanItems(body?.items),
          terms: String(body?.terms || "").slice(0, 5000),
        },
      });
    } catch {
      ins = null;
    }
    if (!ins || (ins.status !== 201 && ins.status !== 200))
      return json(502, { error: "Could not save the template." });
    return json(200, { ok: true, id: ins.data?.[0]?.id || null });
  }

  if (req.method === "PATCH") {
    const id = String(body?.id || "");
    if (!UUID.test(id)) return json(400, { error: "Invalid id." });
    const patch = { updated_at: new Date().toISOString() };
    if (body?.name !== undefined) {
      const name = String(body.name).trim().slice(0, 120);
      if (name.length < 2) return json(400, { error: "Template name required." });
      patch.name = name;
    }
    if (body?.items !== undefined) patch.items = cleanItems(body.items);
    if (body?.terms !== undefined) patch.terms = String(body.terms).slice(0, 5000);
    let res = null;
    try {
      res = await sbRest("quotation_templates", { method: "PATCH", query: `?id=eq.${id}`, body: patch });
    } catch {
      res = null;
    }
    if (!res || (res.status !== 200 && res.status !== 204))
      return json(502, { error: "Could not update the template." });
    return json(200, { ok: true });
  }

  if (req.method === "DELETE") {
    const id = String(body?.id || "");
    if (!UUID.test(id)) return json(400, { error: "Invalid id." });
    let res = null;
    try {
      res = await sbRest("quotation_templates", { method: "DELETE", query: `?id=eq.${id}` });
    } catch {
      res = null;
    }
    if (!res || (res.status !== 200 && res.status !== 204))
      return json(502, { error: "Could not delete the template." });
    return json(200, { ok: true });
  }

  return json(405, { error: "Method not allowed." });
};
