// Woodex CMS auth broker — Netlify Function.
//
// POST /.netlify/functions/cms-auth  { username, password }
// Verifies the dashboard username/password against server-side env vars and,
// on success, returns the GitHub personal access token Sveltia CMS needs to
// read/write the site repo. The token is never stored in the repo or in
// client-side code; it only exists in Netlify environment variables.
//
// Required env vars (Netlify dashboard → Site configuration → Environment):
//   CMS_ADMIN_USER         dashboard username
//   CMS_ADMIN_PASS_SHA256  sha256 hex of the dashboard password
//   CMS_GITHUB_TOKEN       fine-grained GitHub PAT (Contents: read & write)
//                          scoped to the website repo

import { createHash, timingSafeEqual } from "node:crypto";

const MAX_ATTEMPTS = 25;
const WINDOW_MS = 10 * 60 * 1000;
const attempts = new Map(); // ip -> { count, resetAt } (per function instance)

const sha256hex = (value) =>
  createHash("sha256").update(String(value ?? ""), "utf8").digest("hex");

const safeEqual = (a, b) => {
  const x = Buffer.from(String(a ?? ""), "utf8");
  const y = Buffer.from(String(b ?? ""), "utf8");
  return x.length === y.length && timingSafeEqual(x, y);
};

const json = (status, data) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

const clientIp = (req) =>
  req.headers.get("x-nf-client-connection-ip") ||
  (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
  "unknown";

const isRateLimited = (ip) => {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry) return false;
  if (now > entry.resetAt) {
    attempts.delete(ip);
    return false;
  }
  return entry.count >= MAX_ATTEMPTS;
};

const recordFailure = (ip) => {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
  } else {
    entry.count += 1;
  }
};

export default async (req) => {
  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed." });
  }

  const ip = clientIp(req);
  if (isRateLimited(ip)) {
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
  const githubToken = process.env.CMS_GITHUB_TOKEN || "";

  const userOk = expectedUser !== "" && safeEqual(body?.username, expectedUser);
  const passOk =
    expectedPassHash !== "" &&
    /^[0-9a-f]{64}$/i.test(expectedPassHash) &&
    safeEqual(sha256hex(body?.password), expectedPassHash.toLowerCase());

  if (!userOk || !passOk) {
    recordFailure(ip);
    // Generic message: never reveal which field was wrong.
    return json(401, { error: "Incorrect username or password." });
  }

  if (!githubToken) {
    return json(500, { error: "Dashboard is not fully configured yet." });
  }

  attempts.delete(ip);
  return json(200, { token: githubToken });
};
