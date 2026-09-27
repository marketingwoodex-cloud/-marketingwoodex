// Public analytics tracker. No auth by design (called by the live website).
// POST { path } — records a page view. Always returns { ok: true }.
import { json } from "./_auth.mjs";
import { sbConfigured, sbRest } from "./_supabase.mjs";

export default async (req) => {
  if (req.method !== "POST") return json(405, { error: "Method not allowed." });
  try {
    const body = await req.json();
    const path = body?.path;
    if (typeof path === "string" && path.startsWith("/") && path.length <= 200 && sbConfigured()) {
      await sbRest("page_views", { method: "POST", body: { path } });
    }
  } catch { /* never leak errors */ }
  return json(200, { ok: true });
};
