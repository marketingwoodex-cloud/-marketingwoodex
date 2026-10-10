// tools/pro-preview-server.mjs - Dedicated server for woodex-live-p29-v2.1-pro
import http from "node:http";
import zlib from "node:zlib";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { createAdmin } from "./frontend-v1-admin.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../woodex-live-p29-v2.1-pro");
const PRIV = path.join(ROOT, "_private");
const BACKUPS = path.join(PRIV, "backups");
const UPLOADS = path.join(ROOT, "assets/uploads");
const PORT = +process.env.PORT || 8080;
const DEV_CFG = path.join(PRIV, "dev-password.txt");

fs.mkdirSync(BACKUPS, { recursive: true });
fs.mkdirSync(PRIV, { recursive: true });

// Seed admin database in _private/admin-db.json if not present
const DBF = path.join(PRIV, "admin-db.json");
if (!fs.existsSync(DBF)) {
  const hash = (pw) => { const s = crypto.randomBytes(16).toString("hex"); return "scrypt$" + s + "$" + crypto.scryptSync(pw, s, 32).toString("hex"); };
  const db = {
    users: [
      { id: 1, name: "Master Admin", email: "master@woodex.pk", role: "owner", perms: ["settings","crm","quotes","invoices","projects","chats","users","pages","media"], pass_hash: hash("admin"), active: 1, pw_ver: 1, created_at: "2026-10-10 12:00:00", last_login: null },
      { id: 2, name: "Woodex Owner", email: "admin@woodex.pk", role: "owner", perms: ["settings","crm","quotes","invoices","projects","chats","users","pages","media"], pass_hash: hash("admin"), active: 1, pw_ver: 1, created_at: "2026-10-10 12:00:00", last_login: null },
      { id: 3, name: "Admin", email: "admin", role: "owner", perms: ["settings","crm","quotes","invoices","projects","chats","users","pages","media"], pass_hash: hash("admin"), active: 1, pw_ver: 1, created_at: "2026-10-10 12:00:00", last_login: null },
      { id: 4, name: "Ar. Bilal Ahmed", email: "manager@woodex.pk", role: "admin", perms: ["crm","quotes","invoices","projects","chats","pages","media"], pass_hash: hash("admin"), active: 1, pw_ver: 1, created_at: "2026-10-10 12:00:00", last_login: null },
      { id: 5, name: "Engr. Hamza Farooq", email: "developer@woodex.pk", role: "editor", perms: ["pages","media","seo","speed"], pass_hash: hash("admin"), active: 1, pw_ver: 1, created_at: "2026-10-10 12:00:00", last_login: null },
      { id: 6, name: "Usman Ali", email: "sales@woodex.pk", role: "sales", perms: ["forms","crm","quotes","invoices"], pass_hash: hash("admin"), active: 1, pw_ver: 1, created_at: "2026-10-10 12:00:00", last_login: null },
      { id: 7, name: "Dr. Sarah Mansoor", email: "support@woodex.pk", role: "support", perms: ["forms","chats"], pass_hash: hash("admin"), active: 1, pw_ver: 1, created_at: "2026-10-10 12:00:00", last_login: null }
    ],
    activity: [
      { id: 1, user_id: 1, user_name: "Master Admin", action: "system.init", target: "Woodex Live P29 v2.1 Pro initialized", ip: "127.0.0.1", created_at: "2026-10-10 12:00:00" }
    ],
    seqU: 7,
    seqA: 1,
    leads: [
      { id: 1, name: "Malik Tariq", email: "malik.tariq@estatecorp.pk", phone: "+92 300 8472910", service: "Full Luxury Villa Architecture & Interior", source: "Website Consultation Form", stage: "proposal", value: 4500000, unread: false, read: true, created_at: "2026-10-08 14:20:00", notes: [] },
      { id: 2, name: "Ayesha Jahangir", email: "ayesha.j@nexusfin.pk", phone: "+92 321 9988112", service: "Corporate Headquarters Turnkey Fit-out", source: "WhatsApp Live Chat", stage: "qualified", value: 8200000, unread: false, read: true, created_at: "2026-10-09 11:15:00", notes: [] },
      { id: 3, name: "Dr. Omair Rasheed", email: "omair.rasheed@gmail.com", phone: "+92 333 4455667", service: "Penthouse Renovation & Custom Joinery", source: "Website Quote Calculator", stage: "new", value: 3100000, unread: true, read: false, created_at: "2026-10-10 09:30:00", notes: [] }
    ],
    seqL: 3,
    quotes: [
      { id: 101, number: "WX-EST-2026-089", title: "DHA Phase 6 Villa Modern Interior & Joinery", client: "Malik Tariq", email: "malik.tariq@estatecorp.pk", phone: "+92 300 8472910", status: "sent", total: 4500000, advance: 1350000, date: "2026-10-08", items: [{ desc: "Architectural Layout & 3D Spatial Rendering", qty: 1, rate: 450000, amount: 450000 }, { desc: "Master Bedroom & Living Bespoke Italian Joinery", qty: 1, rate: 2150000, amount: 2150000 }, { desc: "False Ceiling, Ambient Lighting & Electrical Fixtures", qty: 1, rate: 850000, amount: 850000 }, { desc: "Custom Italian Kitchen with Quartz Countertops", qty: 1, rate: 1050000, amount: 1050000 }] }
    ],
    seqQ: 101,
    invoices: [
      { id: 201, number: "WX-INV-2026-042", title: "Mobilization Advance - DHA Villa Project", quote_id: 101, client: "Malik Tariq", email: "malik.tariq@estatecorp.pk", phone: "+92 300 8472910", status: "paid", total: 1350000, paid: 1350000, balance: 0, date: "2026-10-09", bank: "Bank Alfalah Islamic - Principal Collection Account (PK36 ALFH 0042 0100 8829 1102)" }
    ],
    seqI: 201,
    projects: [
      { id: 1, title: "DHA Phase 6 Luxury Residence", client: "Malik Tariq", stage: "3d_design", progress: 40, budget: 4500000, lead_architect: "Ar. Bilal Ahmed", start_date: "2026-10-01", target_date: "2026-12-15" },
      { id: 2, title: "Nexus Fintech Corporate HQ Fit-out", client: "Ayesha Jahangir", stage: "civil_work", progress: 25, budget: 8200000, lead_architect: "Ar. Bilal Ahmed", start_date: "2026-09-20", target_date: "2026-11-30" },
      { id: 3, title: "Gulberg Executive Penthouse Redesign", client: "Dr. Omair Rasheed", stage: "consultation", progress: 10, budget: 3100000, lead_architect: "Kamran Tariq", start_date: "2026-10-10", target_date: "2027-01-20" }
    ],
    seqP: 3
  };
  fs.writeFileSync(DBF, JSON.stringify(db, null, 2));
}

let PASSWORD = process.env.WX_DEV_PASSWORD || "admin";
const secret = () => crypto.createHash("sha256").update("wx-dev|" + PASSWORD).digest("hex");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "text/javascript",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".woff2": "font/woff2",
  ".xml": "application/xml",
  ".txt": "text/plain",
  ".sql": "text/plain",
  ".ico": "image/x-icon"
};

const adminApi = createAdmin({ ROOT, secret, builderPassword: () => PASSWORD });

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  let p = decodeURIComponent(url.pathname);

  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-WX-Adm, X-WX-CSRF");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // Handle Admin API
  if (p === "/api/admin.php" || p === "/api/admin") {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    let status = 200, out;
    try {
      let inp = {};
      try { inp = JSON.parse(Buffer.concat(chunks).toString() || "{}"); } catch {}
      if (req.method === "GET" && url.searchParams.get("action") === "cron") inp = { action: "cron" };
      out = await adminApi(req, inp);
    } catch (e) {
      status = e.code || 500;
      out = { ok: false, error: e.code ? e.message : "Server error" };
    }
    res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
    return res.end(JSON.stringify(out));
  }

  // Handle Forms API
  if (p === "/api/forms.php" || p === "/api/forms") {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    let status = 200, out;
    try {
      let inp = {};
      const raw = Buffer.concat(chunks).toString();
      try { inp = JSON.parse(raw || "{}"); } catch { inp = Object.fromEntries(new URLSearchParams(raw)); }
      if (req.method === "GET") inp = { action: "config" };
      out = await adminApi.forms(req, inp);
    } catch (e) {
      status = e.code || 500;
      out = { ok: false, error: e.code ? e.message : "Server error" };
    }
    res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
    return res.end(JSON.stringify(out));
  }

  // Static routing
  let file = path.join(ROOT, p);
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
    if (!p.endsWith("/")) {
      res.writeHead(301, { Location: p + "/" + url.search });
      return res.end();
    }
    file = path.join(file, "index.html");
  }

  if (fs.existsSync(file) && fs.statSync(file).isFile()) {
    const ext = path.extname(file).toLowerCase();
    const mime = MIME[ext] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": mime, "Cache-Control": "no-cache" });
    fs.createReadStream(file).pipe(res);
    return;
  }

  const f404 = path.join(ROOT, "404.html");
  if (fs.existsSync(f404)) {
    res.writeHead(404, { "Content-Type": MIME[".html"] });
    fs.createReadStream(f404).pipe(res);
  } else {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("404 Not Found");
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Woodex Live P29 v2.1 Pro Preview running on http://0.0.0.0:${PORT}/`);
});
