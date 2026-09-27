// Dashboard API: page version history and restore. Requires CMS session.
// GET /.netlify/functions/cms-versions?path=index.html
// POST { id }  — restore a version (writes the page back to the repo)
import { bearerSession, json, verifySession, canWrite } from "./_auth.mjs";
import { sbConfigured, sbRest } from "./_supabase.mjs";
import { ghPutFile, toBase64, validPagePath } from "./_github.mjs";

const UUID = /^[0-9a-f-]{36}$/i;

export default async (req) => {
  const user = verifySession(bearerSession(req));
  if (!user) return json(401, { error: "Session expired. Please sign in again." });
  if (req.method !== "GET" && !canWrite(user)) return json(403, { error: "Your role is read-only." });
  if (!sbConfigured()) return json(503, { error: "Database is not configured yet." });

  if (req.method === "GET") {
    const path = new URL(req.url).searchParams.get("path") || "";
    if (!validPagePath(path)) return json(400, { error: "Invalid page path." });
    const { status, data } = await sbRest("page_versions", {
      query: `?select=id,page_path,created_by,note,created_at,html&page_path=eq.${encodeURIComponent(path)}&order=created_at.desc&limit=50`,
    });
    if (status !== 200) return json(502, { error: "Could not load versions." });
    const versions = (data || []).map((r) => ({
      id: r.id,
      page_path: r.page_path,
      created_by: r.created_by,
      note: r.note,
      created_at: r.created_at,
      size: (r.html || "").length,
    }));
    return json(200, { versions });
  }

  if (req.method === "POST") {
    let body = null;
    try { body = await req.json(); } catch { body = null; }
    const id = body?.id || "";
    if (!UUID.test(id)) return json(400, { error: "Invalid id." });
    const { status, data } = await sbRest("page_versions",
      { query: `?select=page_path,html,created_at&id=eq.${id}&limit=1` });
    if (status !== 200 || !data?.[0]) return json(404, { error: "Version not found." });
    const v = data[0];
    if (!validPagePath(v.page_path)) return json(400, { error: "Invalid page path." });
    try {
      await ghPutFile(v.page_path, toBase64(v.html),
        `CMS: restore ${v.page_path} to version ${v.created_at} (by ${user.username})`);
    } catch (e) {
      return json(502, { error: "Could not restore to the site." });
    }
    await sbRest("activity", { method: "POST",
      body: { kind: "pages", text: `Page "${v.page_path}" restored to version ${v.created_at}` } }).catch(() => {});
    return json(200, { ok: true });
  }

  return json(405, { error: "Method not allowed." });
};
