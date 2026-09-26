// Woodex CMS auth — verifies the dashboard username/password and issues a
// short-lived HMAC session token. The GitHub token never leaves the server.
//
// Env: CMS_ADMIN_USER, CMS_ADMIN_PASS_SHA256, CMS_SESSION_SECRET
import { issueSession, json, safeEqual, sha256hex } from "./_auth.mjs";

const MAX_ATTEMPTS = 25;
const WINDOW_MS = 10 * 60 * 1000;
const attempts = new Map();

const clientIp = (req) =>
  req.headers.get("x-nf-client-connection-ip") ||
  (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
  "unknown";

export default async (req) => {
  if (req.method !== "POST") return json(405, { error: "Method not allowed." });

  const ip = clientIp(req);
  const now = Date.now();
  const entry = attempts.get(ip);
  if (entry && now <= entry.resetAt && entry.count >= MAX_ATTEMPTS) {
    return json(429, { error: "Too many attempts. Please wait a few minutes." });
  }

  let body = null;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Invalid request." });
  }

  const expectedUser = process.env.CMS_ADMIN_USER || "";
  const expectedPassHash = process.env.CMS_ADMIN_PASS_SHA256 || "";
  const secret = process.env.CMS_SESSION_SECRET || "";

  const userOk = expectedUser !== "" && safeEqual(body?.username, expectedUser);
  const passOk =
    expectedPassHash !== "" &&
    /^[0-9a-f]{64}$/i.test(expectedPassHash) &&
    safeEqual(sha256hex(body?.password), expectedPassHash.toLowerCase());

  if (!userOk || !passOk || !secret) {
    const e = attempts.get(ip);
    if (!e || now > e.resetAt) attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    else e.count += 1;
    return json(401, { error: "Incorrect username or password." });
  }

  attempts.delete(ip);
  return json(200, { session: issueSession(expectedUser) });
};
