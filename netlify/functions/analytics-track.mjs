// Public analytics tracker. No auth by design (called by the live website).
// POST { path } — records a page view. Always returns { ok: true } so the
// endpoint never reveals whether a path was accepted.
import { json } from "./_auth.mjs";
import { sbConfigured, sbRest } from "./_supabase.mjs";

// The website only ever sends location.pathname: slash-separated segments of
// URL-safe characters (percent-escapes allowed). Anything else is a bot or
// junk and is dropped silently.
const SEG = "(?:[A-Za-z0-9\\-_~.]+|%[0-9A-Fa-f]{2})+";
const PATH_RE = new RegExp(`^/(?:${SEG}(?:/${SEG})*/?)?$`);
const DOT_SEG_RE = /(?:^|\/)\.\.?(?:\/|$)/;
// Common scanner probes that are never real site pages.
const PROBE_RE = /\/(?:wp-|wordpress|wp-admin|phpmyadmin|\.env|\.git|xmlrpc|boaform|actuator|console|manager|server-status)(?:\/|$)/i;

const validPath = (p) =>
  typeof p === "string" &&
  p.length >= 1 &&
  p.length <= 120 &&
  !p.includes("//") &&
  !p.includes("\\") &&
  PATH_RE.test(p) &&
  !DOT_SEG_RE.test(p) &&
  !PROBE_RE.test(p);

export default async (req) => {
  if (req.method !== "POST") return json(405, { error: "Method not allowed." });
  try {
    const body = await req.json();
    const path = body?.path;
    if (validPath(path) && sbConfigured()) {
      await sbRest("page_views", { method: "POST", body: { path } });
    }
  } catch { /* never leak errors */ }
  return json(200, { ok: true });
};
