// Dashboard API: system health checks. Requires CMS session (any role).
// GET /.netlify/functions/cms-health
import { bearerSession, json, verifySession } from "./_auth.mjs";
import { sbConfigured, sbRest } from "./_supabase.mjs";

export default async (req) => {
  const user = await verifySession(bearerSession(req));
  if (!user) return json(401, { error: bearerSession(req) ? "Session expired. Please sign in again." : "Authentication required. Please sign in." });
  if (req.method !== "GET") return json(405, { error: "Method not allowed." });

  let supabase = "down";
  if (sbConfigured()) {
    try {
      const { status } = await sbRest("site_settings", { query: "?select=key&limit=1" });
      if (status === 200) supabase = "ok";
    } catch { /* stays down */ }
  }

  let github = "down";
  const token = process.env.CMS_GITHUB_TOKEN || "";
  if (token) {
    try {
      const res = await fetch("https://api.github.com/rate_limit", {
        headers: { authorization: `Bearer ${token}`, "user-agent": "woodex-cms" },
      });
      if (res.ok) github = "ok";
    } catch { /* stays down */ }
  }

  return json(200, { supabase, github, time: new Date().toISOString() });
};
