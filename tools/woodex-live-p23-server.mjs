import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { createAdmin } from "./frontend-v1-admin.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../woodex-live-p23");
const PRIV = path.join(ROOT, "_private");
const DEV_CFG = path.join(PRIV, "dev-password.txt");
let PASSWORD = process.env.WX_DEV_PASSWORD || (fs.existsSync(DEV_CFG) ? fs.readFileSync(DEV_CFG, "utf8").trim() : "") || "Woodex@2026";
const secret = () => crypto.createHash("sha256").update("wx-dev|" + PASSWORD).digest("hex");
const PORT = +process.env.PORT || 8082;

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

const adminApi = createAdmin({ ROOT, secret, builderPassword: () => PASSWORD });

function safeJoin(urlPath) {
  let p;
  try { p = decodeURIComponent(urlPath.split("?")[0]); } catch { return null; }
  if (p.includes("\0")) return null;
  const abs = path.normalize(path.join(ROOT, p));
  if (abs !== ROOT && !abs.startsWith(ROOT + path.sep)) return null;
  return abs;
}

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, HEAD");
  res.setHeader("Access-Control-Allow-Headers", "*");
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  const u = new URL(req.url, "http://localhost");
  const pathname = u.pathname;

  if (pathname === "/api/admin.php") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      try {
        let inp = {};
        if (body.trim()) {
          try { inp = JSON.parse(body); } catch { inp = {}; }
        }
        for (const [k, v] of u.searchParams.entries()) {
          if (!(k in inp)) inp[k] = v;
        }
        const r = await adminApi(req, inp);
        if (r && r.status === 302 && r.location) {
          res.writeHead(302, { Location: r.location });
          return res.end();
        }
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify(r || { ok: false, error: "Empty response" }));
      } catch (e) {
        const code = e.code && Number.isInteger(e.code) && e.code >= 400 && e.code < 600 ? e.code : 400;
        res.writeHead(code, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ ok: false, error: e.message || "Request failed" }));
      }
    });
    return;
  }

  let filePath = safeJoin(pathname);
  if (!filePath) {
    res.writeHead(403);
    return res.end("Forbidden");
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    if (!pathname.endsWith("/")) {
      res.writeHead(301, { Location: pathname + "/" + u.search });
      return res.end();
    }
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
  console.log(`Woodex Live P23 Preview running on port ${PORT} (0.0.0.0:${PORT}) with full Admin API & Database`);
});
