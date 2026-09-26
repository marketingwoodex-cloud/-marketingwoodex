// Shared session-token helpers for the Woodex CMS functions.
// Session tokens are HMAC-signed (CMS_SESSION_SECRET) so the browser never
// holds the GitHub token; every privileged function verifies the session.
import { createHmac, createHash, timingSafeEqual } from "node:crypto";

const b64url = (buf) =>
  Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64url = (s) =>
  Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");

export const sha256hex = (value) =>
  createHash("sha256").update(String(value ?? ""), "utf8").digest("hex");

export const safeEqual = (a, b) => {
  const x = Buffer.from(String(a ?? ""), "utf8");
  const y = Buffer.from(String(b ?? ""), "utf8");
  return x.length === y.length && timingSafeEqual(x, y);
};

export function issueSession(username) {
  const secret = process.env.CMS_SESSION_SECRET || "";
  const payload = b64url(JSON.stringify({ u: username, exp: Date.now() + 12 * 3600 * 1000 }));
  const sig = b64url(createHmac("sha256", secret).update(payload).digest());
  return `${payload}.${sig}`;
}

export function verifySession(token) {
  try {
    const secret = process.env.CMS_SESSION_SECRET || "";
    if (!secret || !token || typeof token !== "string") return null;
    const [payload, sig] = token.split(".");
    if (!payload || !sig) return null;
    const expected = b64url(createHmac("sha256", secret).update(payload).digest());
    if (!safeEqual(sig, expected)) return null;
    const data = JSON.parse(unb64url(payload).toString("utf8"));
    if (!data.u || !data.exp || Date.now() > data.exp) return null;
    return data.u;
  } catch {
    return null;
  }
}

export const json = (status, data) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

export const bearerSession = (req) => {
  const h = req.headers.get("authorization") || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
};
