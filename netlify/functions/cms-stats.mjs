// Dashboard API: aggregate stats for the AdminLTE home view.
// GET /.netlify/functions/cms-stats — requires CMS session.
import { bearerSession, json, verifySession } from "./_auth.mjs";
import { sbConfigured, sbRest } from "./_supabase.mjs";

async function rows(table, query) {
  const { status, data } = await sbRest(table, { query });
  return status === 200 && Array.isArray(data) ? data : [];
}

export default async (req) => {
  if (req.method !== "GET") return json(405, { error: "Method not allowed." });
  const user = await verifySession(bearerSession(req));
  if (!user) return json(401, { error: bearerSession(req) ? "Session expired. Please sign in again." : "Authentication required. Please sign in." });
  if (!sbConfigured()) return json(503, { error: "Database is not configured yet." });

  const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
  const [enquiries, leads, posts, projects, activity, recent] = await Promise.all([
    rows("enquiries", "?select=id,status,created_at&order=created_at.desc&limit=500"),
    rows("estimator_leads", "?select=id&limit=1"),
    rows("blog_posts", "?select=id,status&limit=500"),
    rows("projects", "?select=id&limit=500"),
    rows("activity", "?select=kind,text,created_at&order=created_at.desc&limit=10"),
    rows(
      "enquiries",
      "?select=id,name,phone,project_type,status,created_at&order=created_at.desc&limit=5"
    ),
  ]);

  const byStatus = { new: 0, contacted: 0, site_visit: 0, quoted: 0, won: 0, lost: 0 };
  let newThisWeek = 0;
  enquiries.forEach((e) => {
    if (byStatus[e.status] !== undefined) byStatus[e.status] += 1;
    if (e.status === "new" && new Date(e.created_at).getTime() >= weekAgo) newThisWeek += 1;
  });

  return json(200, {
    stats: {
      enquiries_total: enquiries.length,
      enquiries_new: byStatus.new,
      enquiries_new_week: newThisWeek,
      enquiries_by_status: byStatus,
      estimator_leads: leads.length,
      blog_posts: posts.length,
      blog_published: posts.filter((p) => p.status === "published").length,
      projects: projects.length,
    },
    recent_enquiries: recent,
    activity,
  });
};
