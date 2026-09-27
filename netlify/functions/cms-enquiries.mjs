// Dashboard API: list, update and delete enquiries. Requires CMS session.
// GET /.netlify/functions/cms-enquiries[?status=new]
// PATCH { id, status?, notes?, pipeline_stage? }
// DELETE { id }
import { bearerSession, json, verifySession, canWrite } from "./_auth.mjs";
import { sbConfigured, sbRest } from "./_supabase.mjs";

const STATUSES = ["new", "contacted", "site_visit", "quoted", "won", "lost"];
const PIPELINE_STAGES = ["new", "contacted", "site_visit", "quoted", "won", "lost"];
const LEGACY = { in_progress: "contacted", closed: "won" };
const normStatus = (st) => LEGACY[st] || st;

export default async (req) => {
  const user = verifySession(bearerSession(req));
  if (!user) return json(401, { error: "Session expired. Please sign in again." });
  if (req.method !== "GET" && !canWrite(user)) return json(403, { error: "Your role is read-only." });
  if (!sbConfigured()) return json(503, { error: "Database is not configured yet." });

  if (req.method === "GET") {
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const q =
      `?select=*&order=created_at.desc&limit=100` +
      (STATUSES.includes(status) ? `&status=eq.${status}` : "");
    const { status: s, data } = await sbRest("enquiries", { query: q });
    if (s !== 200) return json(502, { error: "Could not load enquiries." });
    return json(200, { enquiries: data });
  }

  if (req.method === "PATCH") {
    let body = null;
    try {
      body = await req.json();
    } catch {
      return json(400, { error: "Invalid request." });
    }
    const { id, status: st, notes, pipeline_stage } = body || {};
    if (!/^[0-9a-f-]{36}$/i.test(String(id || "")))
      return json(400, { error: "Invalid id." });
    const patch = {};
    const nst = normStatus(st);
    if (STATUSES.includes(nst)) patch.status = nst;
    if (pipeline_stage !== undefined) {
      if (!PIPELINE_STAGES.includes(pipeline_stage))
        return json(400, { error: "Invalid pipeline stage." });
      patch.pipeline_stage = pipeline_stage;
    }
    if (typeof notes === "string") patch.notes = notes.slice(0, 2000);
    if (!Object.keys(patch).length) return json(400, { error: "Nothing to update." });
    const { status: s } = await sbRest("enquiries", {
      method: "PATCH",
      query: `?id=eq.${id}`,
      body: patch,
    });
    if (s !== 200 && s !== 204) return json(502, { error: "Could not update enquiry." });
    return json(200, { ok: true });
  }

  if (req.method === "DELETE") {
    let body = null;
    try {
      body = await req.json();
    } catch {
      return json(400, { error: "Invalid request." });
    }
    const { id } = body || {};
    if (!/^[0-9a-f-]{36}$/i.test(String(id || "")))
      return json(400, { error: "Invalid id." });
    const { status: s } = await sbRest("enquiries", {
      method: "DELETE",
      query: `?id=eq.${id}`,
    });
    if (s !== 200 && s !== 204) return json(502, { error: "Could not delete enquiry." });
    return json(200, { ok: true });
  }

  return json(405, { error: "Method not allowed." });
};
