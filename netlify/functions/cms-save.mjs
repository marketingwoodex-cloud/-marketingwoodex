// Woodex CMS save — commits edited page HTML to the website repo.
// POST { path, html, message } with Authorization: Bearer <session>
import { bearerSession, json, verifySession, canWrite } from "./_auth.mjs";
import { ghPutFile, toBase64, validPagePath } from "./_github.mjs";

export default async (req) => {
  if (req.method !== "POST") return json(405, { error: "Method not allowed." });
  const user = verifySession(bearerSession(req));
  if (!user) return json(401, { error: "Session expired. Please sign in again." });
  if (req.method !== "GET" && !canWrite(user)) return json(403, { error: "Your role is read-only." });

  let body = null;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Invalid request." });
  }

  const { path, html } = body || {};
  if (!validPagePath(path)) return json(400, { error: "Invalid page path." });
  // Only the two dashboard-managed JS config files may be published this way.
  const isJsConfig = path === "assets/js/estimator-rates.js" || path === "assets/js/site-config.js";
  if (typeof html !== "string" || html.length < 100 || html.length > 2_000_000) {
    return json(400, { error: "Invalid page content." });
  }
  if (!isJsConfig && !/^[\s\S]*<html[\s>][\s\S]*<\/html>\s*$/.test(html)) {
    return json(400, { error: "Content does not look like a full page." });
  }
  if (isJsConfig && !/window\.(WX_RATES|WOODEX_CONFIG)\s*=/.test(html)) {
    return json(400, { error: "Config file does not look valid." });
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
