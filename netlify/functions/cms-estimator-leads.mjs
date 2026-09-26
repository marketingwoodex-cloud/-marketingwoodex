// Dashboard API: list and update estimator leads. Requires CMS session.
// GET /.netlify/functions/cms-estimator-leads[?status=new]
// PATCH { id, status? }
import { bearerSession, json, verifySession } from "./_auth.mjs";
import { sbConfigured, sbRest } from "./_supabase.mjs";

const STATUSES = ["new", "contacted", "quoted", "closed"];

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
    const { status: s, data } = await sbRest("estimator_leads", { query: q });
    if (s !== 200) return json(502, { error: "Could not load estimator leads." });
    return json(200, { leads: data });
  }

  if (req.method === "PATCH") {
    let body = null;
    try {
      body = await req.json();
    } catch {
      return json(400, { error: "Invalid request." });
    }
    const { id, status: st } = body || {};
    if (!/^[0-9a-f-]{36}$/i.test(String(id || "")))
      return json(400, { error: "Invalid id." });
    if (!STATUSES.includes(st)) return json(400, { error: "Invalid status." });
    const { status: s } = await sbRest("estimator_leads", {
      method: "PATCH",
      query: `?id=eq.${id}`,
      body: { status: st },
    });
    if (s !== 200 && s !== 204) return json(502, { error: "Could not update lead." });
    return json(200, { ok: true });
  }

  return json(405, { error: "Method not allowed." });
};
