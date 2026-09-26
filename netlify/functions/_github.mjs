// Shared GitHub Contents API helpers for the Woodex CMS functions.
const OWNER = process.env.CMS_GITHUB_OWNER || "marketingwoodex-cloud";
const REPO = process.env.CMS_GITHUB_REPO || "-marketingwoodex";
const BRANCH = process.env.CMS_GITHUB_BRANCH || "main";
const API = "https://api.github.com";

const headers = () => ({
  authorization: `Bearer ${process.env.CMS_GITHUB_TOKEN || ""}`,
  accept: "application/vnd.github+json",
  "content-type": "application/json",
  "user-agent": "woodex-cms",
});

export async function ghGetFile(path) {
  const res = await fetch(
    `${API}/repos/${OWNER}/${REPO}/contents/${encodeURIComponent(path)}?ref=${BRANCH}`,
    { headers: headers() }
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub read failed (${res.status})`);
  return res.json();
}

export async function ghPutFile(path, base64Content, message) {
  if (!process.env.CMS_GITHUB_TOKEN) throw new Error("CMS not configured (token missing)");
  const existing = await ghGetFile(path);
  const body = {
    message,
    content: base64Content,
    branch: BRANCH,
  };
  if (existing?.sha) body.sha = existing.sha;
  const res = await fetch(`${API}/repos/${OWNER}/${REPO}/contents/${encodeURIComponent(path)}`, {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`GitHub write failed (${res.status}): ${text.slice(0, 200)}`);
  }
  return res.json();
}

export const toBase64 = (str) => Buffer.from(str, "utf8").toString("base64");

// Only page HTML files inside the site may be written (never admin/, netlify/, .git/).
export function validPagePath(p) {
  if (typeof p !== "string" || p.length > 200) return false;
  if (!/^[A-Za-z0-9][A-Za-z0-9._/-]*\.html$/.test(p)) return false;
  if (p.includes("..") || p.startsWith("admin/") || p.startsWith("netlify/")) return false;
  return true;
}
