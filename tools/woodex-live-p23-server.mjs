import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../woodex-live-p23");
const PORT = +process.env.PORT || 8082;
const PRIV = path.join(ROOT, "_private");
const DEV_CFG = path.join(PRIV, "dev-password.txt");
let PASSWORD = process.env.WX_DEV_PASSWORD || (fs.existsSync(DEV_CFG) ? fs.readFileSync(DEV_CFG, "utf8").trim() : "") || "Woodex@2026";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".woff2": "font/woff2",
  ".xml": "application/xml",
  ".txt": "text/plain",
  ".ico": "image/x-icon",
  ".zip": "application/zip",
  ".sql": "text/plain; charset=utf-8"
};

function safeJoin(urlPath) {
  let p;
  try { p = decodeURIComponent(urlPath.split("?")[0]); } catch { return null; }
  if (p.includes("\0")) return null;
  const abs = path.normalize(path.join(ROOT, p));
  if (abs !== ROOT && !abs.startsWith(ROOT + path.sep)) return null;
  return abs;
}

const server = http.createServer((req, res) => {
  // CORS & Preview security headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, HEAD");
  res.setHeader("Access-Control-Allow-Headers", "*");
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  const u = new URL(req.url, "http://localhost");
  let pathname = u.pathname;

  // Mock API responses for local preview if needed
  if (pathname.startsWith("/api/")) {
    if (pathname.includes("admin.php") || pathname.includes("forms.php")) {
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ ok: true, status: "active", message: "Woodex Live API Ready" }));
    }
  }

  let filePath = safeJoin(pathname);
  if (!filePath) {
    res.writeHead(403);
    return res.end("Forbidden");
  }

  // Handle directory requests -> index.html
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, "index.html");
  }

  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    const notFound = path.join(ROOT, "404.html");
    if (fs.existsSync(notFound)) {
      res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
      return res.end(fs.readFileSync(notFound));
    }
    res.writeHead(404);
    return res.end("Not Found");
  }

  const ext = path.extname(filePath).toLowerCase();
  const ctype = MIME[ext] || "application/octet-stream";
  res.writeHead(200, { "Content-Type": ctype, "Cache-Control": "no-cache" });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Woodex Live P23 Preview running on port ${PORT} (0.0.0.0:${PORT})`);
});
