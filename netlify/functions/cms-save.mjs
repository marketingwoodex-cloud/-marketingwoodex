// Woodex CMS save — commits edited page HTML to the website repo.
// POST { path, html, message } with Authorization: Bearer <session>
import { bearerSession, json, verifySession } from "./_auth.mjs";
import { ghPutFile, toBase64, validPagePath } from "./_github.mjs";

export default async (req) => {
  if (req.method !== "POST") return json(405, { error: "Method not allowed." });
  const user = verifySession(bearerSession(req));
  if (!user) return json(401, { error: "Session expired. Please sign in again." });

  let body = null;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Invalid request." });
  }

  const { path, html } = body || {};
  if (!validPagePath(path)) return json(400, { error: "Invalid page path." });
  if (typeof html !== "string" || html.length < 100 || html.length > 2_000_000) {
    return json(400, { error: "Invalid page content." });
  }
  if (!/^[\s\S]*<html[\s>][\s\S]*<\/html>\s*$/.test(html)) {
    return json(400, { error: "Content does not look like a full page." });
  }

  try {
    const result = await ghPutFile(
      path,
      toBase64(html),
      body?.message || `CMS: update ${path}`
    );
    return json(200, { ok: true, commit: result?.commit?.sha || null });
  } catch (err) {
    return json(502, { error: "Could not save to the website repo." });
  }
};
