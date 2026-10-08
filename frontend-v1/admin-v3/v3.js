/* ==========================================================================
   Woodex Admin v3 — application
   Plain JS, no build step. Talks to the same /api/admin.php as v2.
   ========================================================================== */
"use strict";

/* ---------- icons (lucide-style paths) ---------- */
const P = {
  search:"M11 3a8 8 0 100 16 8 8 0 000-16zM21 21l-4.3-4.3",
  "chev-down":"M6 9l6 6 6-6","chev-right":"M9 6l6 6-6 6","chev-left":"M15 6l-6 6 6 6",
  "chev-up":"M18 15l-6-6-6 6",x:"M18 6L6 18M6 6l12 12",check:"M20 6L9 17l-5-5",
  plus:"M12 5v14M5 12h14",minus:"M5 12h14",
  bell:"M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0",
  sun:"M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4",
  moon:"M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z",
  menu:"M3 6h18M3 12h18M3 18h18",
  "layout-dashboard":"M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z",
  "shield-check":"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 12l2 2 4-4",
  inbox:"M22 12h-6l-2 3h-4l-2-3H2M5.4 5.1L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.4-6.9A2 2 0 0016.8 4H7.2a2 2 0 00-1.8 1.1z",
  kanban:"M6 5v11M12 5v14M18 5v8M2 19h20",
  clock:"M12 7v5l3 2M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  contact:"M19 22H5a2 2 0 01-2-2V4a2 2 0 012-2h14a2 2 0 012 2v16a2 2 0 01-2 2zM9 9a2 2 0 100-4 2 2 0 000 4zM15 9a2 2 0 100-4 2 2 0 000 4zM8 15h8M8 18h5",
  "file-text":"M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8",
  receipt:"M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1zM8 7h8M8 11h8M8 15h5",
  layers:"M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  briefcase:"M20 7h-4V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2H4a2 2 0 00-2 2v9a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM10 5h4v2h-4z",
  "message-circle":"M21 11.5a8.4 8.4 0 01-9 8.4 8.6 8.6 0 01-3.8-.9L3 21l1.9-5.1A8.4 8.4 0 013 11.5a8.4 8.4 0 018.4-8.4h.1a8.4 8.4 0 018.5 8.4z",
  send:"M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z",
  zap:"M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  image:"M3 3h18v18H3zM8.5 10a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM21 15l-5-5L5 21",
  sparkles:"M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9zM19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z",
  "book-open":"M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2zM22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z",
  star:"M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.9L12 17.8 5.8 21l1.2-6.9-5-4.9 6.9-1z",
  "square-pen":"M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.4 2.6a2 2 0 012.8 2.8L12 14.6l-4 1 1-4z",
  blocks:"M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  "panel-left":"M3 3h18v18H3zM9 3v18M14 8h4M14 12h4",
  "refresh-cw":"M21 2v6h-6M3 22v-6h6M3.5 9a9 9 0 0114.9-3.4L21 8M20.5 15a9 9 0 01-14.9 3.4L3 16",
  "map-pin":"M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z",
  gauge:"M12 14l4-4M3.5 18a9 9 0 1117 0",
  "help-circle":"M12 3a9 9 0 100 18 9 9 0 000-18zM9.1 9a3 3 0 015.8 1c0 2-3 3-3 3M12 17h.01",
  users:"M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.9M16 3.1a4 4 0 010 7.8",
  building:"M3 21h18M5 21V7l8-4v18M19 21V11l-6-3M9 9h.01M9 12h.01M9 15h.01M9 18h.01",
  "hard-drive":"M22 12H2M5.5 12a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM8.5 12a2.5 2.5 0 100-5 2.5 2.5 0 000 5z",
  database:"M12 8c4.97 0 9-1.34 9-3s-4.03-3-9-3-9 1.34-9 3 4.03 3 9 3zM21 12c0 1.66-4 3-9 3s-9-1.34-9-3M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5",
  folder:"M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z",
  activity:"M22 12h-4l-3 9L9 3l-3 9H2",
  "heart-pulse":"M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 00-7.8 7.8l1.1 1L12 21l7.7-7.7 1.1-1a5.5 5.5 0 000-7.7zM3.5 13h4l2-4 3 7 2-3h5",
  settings:"M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.9 2.9l-.1-.1a1.7 1.7 0 00-1.9-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.9.3l-.1.1a2 2 0 11-2.9-2.9l.1-.1a1.7 1.7 0 00.3-1.9 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.9l-.1-.1a2 2 0 112.9-2.9l.1.1a1.7 1.7 0 001.9.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.9-.3l.1-.1a2 2 0 112.9 2.9l-.1.1a1.7 1.7 0 00-.3 1.9V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z",
  user:"M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z",
  filter:"M22 3H2l8 9.5V19l4 2v-8.5z",
  download:"M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3",
  upload:"M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12",
  "external-link":"M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3",
  "more-h":"M5 12h.01M12 12h.01M19 12h.01",
  phone:"M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.1 1 .4 1.9.7 2.8a2 2 0 01-.5 2.1L8.1 9.9a16 16 0 006 6l1.3-1.3a2 2 0 012.1-.4c.9.3 1.8.6 2.8.7a2 2 0 011.7 2z",
  mail:"M4 4h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zM22 7l-10 6L2 7",
  calendar:"M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z",
  "trending-up":"M23 6l-9.5 9.5-5-5L1 18M17 6h6v6",
  "trending-down":"M23 18l-9.5-9.5-5 5L1 6M17 18h6v-6",
  "arrow-right":"M5 12h14M12 5l7 7-7 7",
  pin:"M12 2l3 6.5 7 1-5 5 1.2 7L12 18l-6.2 3.5L7 14.5l-5-5 7-1z",
  paperclip:"M21.4 11.1l-9.2 9.2a5 5 0 01-7.1-7.1l9.2-9.2a3.3 3.3 0 014.7 4.7l-9.2 9.2a1.7 1.7 0 01-2.4-2.4l8.5-8.5",
  mic:"M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3zM19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8",
  eye:"M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z",
  edit:"M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.4 2.6a2 2 0 012.8 2.8L12 14.6l-4 1 1-4z",
  trash:"M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6",
  copy:"M9 9h10a2 2 0 012 2v10a2 2 0 01-2 2H9a2 2 0 01-2-2V11a2 2 0 012-2zM5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1",
  "alert-circle":"M12 3a9 9 0 100 18 9 9 0 000-18zM12 8v4M12 16h.01",
  info:"M12 3a9 9 0 100 18 9 9 0 000-18zM12 16v-4M12 8h.01",
  "check-circle":"M22 11.1V12a10 10 0 11-5.9-9.1M22 4L12 14.01l-3-3",
  whatsapp:"M17.5 14.4c-.3-.2-1.7-.9-2-1-.3-.1-.5-.2-.7.1-.2.3-.7 1-.9 1.2-.2.2-.4.2-.7.1-1.7-.9-2.9-2.1-3.3-3.1-.1-.3 0-.5.2-.7.2-.2.9-1 .9-1.2.1-.2.1-.4 0-.7-.1-.3-.7-1.6-.9-2.2-.2-.5-.4-.5-.6-.5h-.6c-.2 0-.6.1-.9.4-.3.4-1.2 1.2-1.2 2.9 0 1.7 1.2 3.3 1.4 3.6.2.3 2.3 3.7 5.7 5 .8.4 1.4.6 1.9.7.8.3 1.5.2 2.1.1.6-.1 1.9-.8 2.2-1.5.3-.8.3-1.4.2-1.6-.1-.1-.3-.2-.6-.4zM12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2z",
  "clock-3":"M12 7v5l2 2M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  "log-out":"M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9",
  sliders:"M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6",
};
function ic(n, cls) {
  return '<span class="i ' + (cls || "") + '" data-i="' + n + '">' +
    '<svg viewBox="0 0 24 24">' + (P[n] || "").split("M").filter(Boolean).map(s => '<path d="M' + s + '"/>').join("") + '</svg></span>';
}
function paintIcons(root) {
  (root || document).querySelectorAll("[data-i]").forEach(el => {
    if (el.dataset.done) return;
    const n = el.dataset.i;
    if (!P[n]) return;
    el.innerHTML = '<svg viewBox="0 0 24 24">' + P[n].split("M").filter(Boolean).map(s => '<path d="M' + s + '"/>').join("") + "</svg>";
    el.dataset.done = "1";
  });
}

/* ---------- api ---------- */
const API = "/api/admin.php";
const S = { token: sessionStorage.getItem("wx3Tok") || "", user: null, ticket: null, route: "dashboard", nav: {} };

function api(action, data) {
  return fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-WX-ADM": S.token },
    body: JSON.stringify(Object.assign({ action: action }, data || {}))
  }).then(r => r.json().catch(() => ({ ok: false, error: "Server error (" + r.status + ")" })))
    .catch(() => ({ ok: false, error: "Network error — check your connection" }));
}

/* ---------- tiny helpers ---------- */
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const n0 = v => (v == null || v === "" || isNaN(v)) ? "0" : Number(v).toLocaleString("en-PK");
const money = v => "PKR " + (v == null || isNaN(v) ? "0" : Number(v).toLocaleString("en-PK"));
const dt = v => { if (!v) return "—"; const d = new Date(v); return isNaN(d) ? String(v) : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); };
const ago = v => {
  if (!v) return "—";
  const s = (Date.now() - new Date(v).getTime()) / 1000;
  if (isNaN(s)) return String(v);
  if (s < 60) return "just now";
  if (s < 3600) return Math.floor(s / 60) + "m ago";
  if (s < 86400) return Math.floor(s / 3600) + "h ago";
  if (s < 604800) return Math.floor(s / 86400) + "d ago";
  return dt(v);
};
const initials = n => String(n || "?").trim().split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase();
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms || 200); }; };

/* ---------- toasts ---------- */
function toast(msg, kind, title) {
  const el = document.createElement("div");
  el.className = "toast " + (kind || "");
  el.innerHTML = ic(kind === "err" ? "alert-circle" : kind === "war" ? "alert-circle" : kind === "suc" ? "check-circle" : "info") +
    '<div class="t-b">' + (title ? "<b>" + esc(title) + "</b>" : "") + "<small>" + esc(msg) + "</small></div>";
  $("#toasts").appendChild(el);
  paintIcons(el);
  setTimeout(() => { el.classList.add("out"); setTimeout(() => el.remove(), 200); }, kind === "err" ? 5200 : 3400);
}

/* ---------- modal / drawer ---------- */
function modal(html, wide) {
  const c = $("#modal-c");
  c.className = "modal-c" + (wide ? " wide" : "");
  c.innerHTML = html;
  paintIcons(c);
  $("#modal").classList.add("on");
  const f = c.querySelector("input,select,textarea,button");
  if (f) f.focus();
}
function closeModal() { $("#modal").classList.remove("on"); }
$("#modal").addEventListener("click", e => { if (e.target.id === "modal") closeModal(); });

function drawer(html) {
  const d = $("#drawer");
  d.innerHTML = html;
  paintIcons(d);
  d.classList.add("on");
}
function closeDrawer() { $("#drawer").classList.remove("on"); }

/* ---------- theme ---------- */
function setTheme(t) {
  document.documentElement.classList.toggle("dark", t === "dark");
  try { localStorage.setItem("wx3Theme", t); } catch (e) { }
  const b = $("#b-theme");
  if (b) { b.innerHTML = ic(t === "dark" ? "sun" : "moon"); b.dataset.done = ""; paintIcons(b); }
}

/* ==================== AUTH ==================== */
function showAuth(mode) {
  $("#auth").hidden = false;
  $("#app").hidden = true;
  $("#f-login").hidden = mode !== "login";
  $("#f-2fa").hidden = mode !== "2fa";
  $("#l-err").textContent = ""; $("#t-err").textContent = "";
  if (mode === "login") { $("#l-email").focus(); } else { $("#t-code").focus(); }
}
function signedIn(r) {
  S.token = r.token; S.user = r.user;
  try { sessionStorage.setItem("wx3Tok", r.token); } catch (e) { }
  $("#auth").hidden = true; $("#app").hidden = false;
  renderShell();
  route(location.hash.replace(/^#\/?/, "") || "dashboard");
  toast("Signed in as " + (r.user.name || r.user.email), "suc");
}
function signedOut(msg) {
  S.token = ""; S.user = null;
  try { sessionStorage.removeItem("wx3Tok"); } catch (e) { }
  showAuth("login");
  if (msg) $("#l-err").textContent = msg;
}

$("#l-btn").closest("form").addEventListener("submit", async e => {
  e.preventDefault();
  const b = $("#l-btn"); b.classList.add("busy"); b.disabled = true;
  const r = await api("login", { email: $("#l-email").value.trim(), password: $("#l-pass").value });
  b.classList.remove("busy"); b.disabled = false;
  if (!r.ok) return ($("#l-err").textContent = r.error || "Sign in failed");
  $("#l-pass").value = "";
  if (r.pending2fa || r.ticket) { S.ticket = r.ticket; return showAuth("2fa"); }
  signedIn(r);
});
$("#t-btn").closest("form").addEventListener("submit", async e => {
  e.preventDefault();
  const b = $("#t-btn"); b.classList.add("busy"); b.disabled = true;
  const r = await api("login_2fa", { ticket: S.ticket, code: $("#t-code").value.trim() });
  b.classList.remove("busy"); b.disabled = false;
  if (!r.ok) return ($("#t-err").textContent = r.error || "Verification failed");
  S.ticket = null; signedIn(r);
});
$("#t-back").addEventListener("click", e => { e.preventDefault(); showAuth("login"); });

/* ==================== NAV ==================== */
const NAV = [
  { h: "Overview" },
  { id: "dashboard", t: "Dashboard", i: "layout-dashboard" },
  { id: "approvals", t: "Approvals", i: "shield-check", bdg: "appr", can: "owner,admin,editor" },
  { h: "Sales" },
  { id: "enquiries", t: "Leads", i: "inbox", bdg: "leads", can: "g:sales" },
  { id: "pipeline", t: "Pipeline", i: "kanban", can: "g:sales" },
  { id: "bookings", t: "Bookings", i: "clock", can: "g:sales" },
  { id: "clients", t: "Clients", i: "contact", can: "g:sales" },
  { g: "Quotes & invoices", i: "file-text", id: "money", can: "g:sales", items: [
    { id: "quotes", t: "Quotations", i: "file-text" },
    { id: "invoices", t: "Invoices", i: "receipt" },
    { id: "transactions", t: "Payments", i: "receipt" },
    { id: "templates", t: "Quote templates", i: "layers" } ] },
  { id: "projects", t: "Projects", i: "briefcase", can: "g:sales,g:support_view" },
  { h: "Conversations" },
  { id: "chat", t: "Inbox", i: "message-circle", bdg: "chat", can: "g:conversations" },
  { g: "WhatsApp", i: "send", id: "wa", can: "g:broadcast", items: [
    { id: "wahub", t: "Overview & rules", i: "send" },
    { id: "wainsights", t: "Insights", i: "layers" },
    { id: "wauto", t: "Broadcasts", i: "zap" },
    { id: "offers", t: "Discount offers", i: "send" } ] },
  { id: "telegram", t: "Telegram", i: "send", can: "owner,admin,editor" },
  { id: "social", t: "Social media", i: "image", can: "owner,admin" },
  { id: "updates", t: "Client updates", i: "send", can: "g:updates" },
  { id: "aicenter", t: "AI Assistant", i: "sparkles", can: "g:ai" },
  { id: "train", t: "Knowledge & Q&A", i: "book-open", can: "g:ai" },
  { id: "aireport", t: "AI report", i: "star", can: "g:ai" },
  { h: "Website" },
  { g: "Pages & builder", i: "square-pen", id: "site", can: "g:website", items: [
    { id: "pages", t: "All pages", i: "file-text" },
    { id: "builder", t: "Page builder", i: "square-pen" },
    { id: "library", t: "Section library", i: "blocks" },
    { id: "global", t: "Header & footer", i: "panel-left" },
    { id: "heroes", t: "Hero slides", i: "image" },
    { id: "redirects", t: "Redirects", i: "refresh-cw" } ] },
  { g: "Content", i: "book-open", id: "content", can: "g:website", items: [
    { id: "blog", t: "Blog", i: "book-open" },
    { id: "portfolio", t: "Portfolio", i: "image" },
    { id: "services", t: "Service pages", i: "layers" },
    { id: "cities", t: "City pages", i: "map-pin" },
    { id: "faqs", t: "FAQs", i: "help-circle" },
    { id: "testimonials", t: "Testimonials", i: "message-circle" },
    { id: "logos", t: "Client logos", i: "image" },
    { id: "team", t: "Team", i: "users" } ] },
  { id: "media", t: "Media", i: "image", can: "g:website" },
  { id: "seo", t: "SEO", i: "search", can: "g:website" },
  { id: "seoagent", t: "SEO agent", i: "sparkles", can: "g:website" },
  { id: "speed", t: "Speed", i: "gauge", can: "g:website" },
  { id: "health", t: "Site health", i: "heart-pulse", can: "g:website" },
  { id: "theme", t: "Theme", i: "sparkles", can: "g:settings" },
  { h: "Admin" },
  { id: "business", t: "Business info", i: "building", can: "g:settings" },
  { id: "settings", t: "Integrations", i: "zap", can: "g:settings" },
  { id: "users", t: "Users & roles", i: "users", can: "owner,admin" },
  { g: "System", i: "settings", id: "sys", can: "g:settings", items: [
    { id: "backups", t: "Backups", i: "hard-drive" },
    { id: "database", t: "Database", i: "database" },
    { id: "files", t: "File manager", i: "folder" },
    { id: "maintenance", t: "Maintenance", i: "shield-check" },
    { id: "activity", t: "Activity log", i: "activity" } ] },
  { h: "Me" },
  { id: "profile", t: "My profile", i: "user" },
  { id: "security", t: "My security", i: "shield-check" },
];

const ROLE_GROUPS = {
  owner: ["self", "sales", "conversations", "updates", "broadcast", "ai", "website", "settings", "master"],
  admin: ["self", "sales", "conversations", "updates", "broadcast", "ai", "website", "settings"],
  editor: ["self", "website", "settings"],
  sales: ["self", "sales", "conversations", "updates"],
  support: ["self", "support_view", "conversations"],
};
function groupsOf(u) { return (ROLE_GROUPS[u.role] || []).concat(u.perms || []); }
function can(spec) {
  if (!S.user || !spec) return !spec;
  const g = groupsOf(S.user);
  return spec.split(",").some(s => {
    s = s.trim();
    return s.startsWith("g:") ? g.indexOf(s.slice(2)) > -1 : s === S.user.role || s === "owner,admin,editor".split(",").find(x => x === S.user.role);
  });
}

function flatNav() {
  const out = [];
  NAV.forEach(n => {
    if (n.h) return;
    if (n.g) { if (can(n.can)) n.items.forEach(x => { if (can(x.can) || !x.can) out.push([x, n.g]); }); }
    else if (can(n.can)) out.push([n, ""]);
  });
  return out;
}

function renderNav() {
  const nav = $("#nav");
  let html = "";
  let gi = 0;
  NAV.forEach(n => {
    if (n.h) { html += '<div class="nav-h">' + esc(n.h) + "</div>"; return; }
    if (n.g) {
      if (!can(n.can)) return;
      const open = S.nav[n.g] !== false;
      html += '<div class="nav-g' + (open ? "" : " shut") + '" data-g="' + esc(n.g) + '">' +
        '<button class="nav-gb">' + ic(n.i) + "<span>" + esc(n.g) + "</span>" + ic("chev-down", "chev") + "</button>" +
        '<div class="nav-gi">' + n.items.map(x =>
          '<a class="nav-a sub" href="#/' + x.id + '" data-v="' + x.id + '">' + ic(x.i) + "<span>" + esc(x.t) + "</span></a>").join("") + "</div></div>";
      return;
    }
    if (!can(n.can)) return;
    html += '<a class="nav-a" href="#/' + n.id + '" data-v="' + n.id + '">' + ic(n.i) + "<span>" + esc(n.t) + "</span>" +
      (n.bdg ? '<span class="bdg" data-bdg="' + n.bdg + '" hidden></span>' : "") +
      '<button class="pin" data-pin="' + n.id + '" title="Pin to top" aria-label="Pin">★</button></a>';
  });
  nav.innerHTML = html;
  paintIcons(nav);
  nav.querySelectorAll(".nav-gb").forEach(b => b.onclick = () => {
    const g = b.parentNode, k = g.dataset.g;
    g.classList.toggle("shut");
    S.nav[k] = !g.classList.contains("shut");
    try { localStorage.setItem("wx3Nav", JSON.stringify(S.nav)); } catch (e) { }
  });
  nav.querySelectorAll(".pin").forEach(p => p.onclick = e => {
    e.preventDefault(); e.stopPropagation();
    p.classList.toggle("on");
    toast(p.classList.contains("on") ? "Pinned to top" : "Unpinned", "inf");
  });
  nav.querySelectorAll(".nav-a").forEach(a => a.addEventListener("click", () => {
    $("#app").classList.remove("navopen");
  }));
  markNav();
}
function markNav() {
  $$("#nav .nav-a").forEach(a => a.classList.toggle("on", a.dataset.v === S.route));
  $$("#nav .nav-g").forEach(g => {
    const on = g.querySelector('.nav-a[data-v="' + S.route + '"]');
    if (on) g.classList.remove("shut");
  });
}

/* ==================== SHELL ==================== */
function renderShell() {
  const u = S.user;
  $("#u-av").textContent = initials(u.name);
  $("#u-name").textContent = u.name || u.email;
  $("#u-role").textContent = u.roleLabel || u.role;
  $("#b-notif").innerHTML = ic("bell"); $("#b-notif").dataset.done = ""; paintIcons($("#b-notif"));
  $("#b-user").querySelector(".i").dataset.i = "chev-down";
  $("#rail").innerHTML = ic("panel-left"); $("#rail").dataset.done = ""; paintIcons($("#rail"));
  $("#burger").innerHTML = ic("menu"); $("#burger").dataset.done = ""; paintIcons($("#burger"));
  const th = document.documentElement.classList.contains("dark") ? "dark" : "light";
  setTheme(th);
  renderNav();
  $("#sidefoot").innerHTML =
    '<a class="nav-a" href="/" target="_blank">' + ic("external-link") + "<span>View website</span></a>" +
    '<a class="nav-a" href="#" id="b-logout">' + ic("log-out") + "<span>Sign out</span></a>";
  paintIcons($("#sidefoot"));
  $("#b-logout").onclick = async e => {
    e.preventDefault();
    await api("logout");
    signedOut();
  };
  paintIcons($("#app"));
}

/* rail / mobile */
$("#rail").onclick = () => $("#app").classList.toggle("mini");
$("#burger").onclick = () => $("#app").classList.toggle("navopen");
$("#shade").onclick = () => $("#app").classList.remove("navopen");
$("#b-theme").onclick = () => setTheme(document.documentElement.classList.contains("dark") ? "light" : "dark");
$("#b-notif").onclick = () => drawer(
  '<div class="drawer-h"><h3>Notifications</h3><button class="iconbtn" data-x>' + ic("x") + "</button></div>" +
  '<div class="drawer-b"><div class="list" id="nt-l"><div class="empty">' + ic("bell") + "<p>Loading…</p></div></div></div>");
$("#b-user").onclick = () => {
  const u = S.user;
  modal('<div class="modal-h"><span class="av">' + esc(initials(u.name)) + "</span><h3>" + esc(u.name) + "</h3>" +
    '<button class="iconbtn" data-x>' + ic("x") + "</button></div>" +
    '<div class="modal-b"><div class="list">' +
    '<div class="li"><span class="i">' + ic("mail") + '</span><div class="li-b"><b>' + esc(u.email) + "</b><small>Email</small></div></div>" +
    '<div class="li"><span class="i">' + ic("shield-check") + '</span><div class="li-b"><b>' + esc(u.roleLabel || u.role) + "</b><small>Role</small></div></div>" +
    '<div class="li"><span class="i">' + ic("clock") + '</span><div class="li-b"><b>' + dt(u.last_login) + "</b><small>Last sign in</small></div></div>" +
    "</div></div>" +
    '<div class="modal-f"><a class="btn" href="#/profile">My profile</a><a class="btn" href="#/security">Security</a>' +
    '<button class="btn dan" id="m-lo">' + ic("log-out") + "Sign out</button></div>");
  $("#m-lo").onclick = async () => { await api("logout"); closeModal(); signedOut(); };
};
document.addEventListener("click", e => {
  const x = e.target.closest("[data-x]");
  if (x) { const p = x.closest(".modal,.drawer"); if (p) { p.classList.remove("on"); } }
});

/* ==================== COMPONENTS ==================== */
function kpi(o) {
  return '<div class="kpi' + (o.acc ? " acc" : "") + '">' +
    '<div class="kpi-t">' + ic(o.icon || "activity") + esc(o.t) + "</div>" +
    '<div class="kpi-v">' + o.v + (o.unit ? "<small>" + esc(o.unit) + "</small>" : "") + "</div>" +
    (o.m ? '<div class="kpi-m">' + o.m + "</div>" : "") +
    (o.spark || "") + "</div>";
}
function sparkline(vals, w, h) {
  w = w || 120; h = h || 26;
  if (!vals || !vals.length) return "";
  const mx = Math.max.apply(null, vals), mn = Math.min.apply(null, vals), rg = (mx - mn) || 1;
  const pts = vals.map((v, i) => [(i / (vals.length - 1 || 1)) * w, h - ((v - mn) / rg) * (h - 3) - 1.5]);
  const d = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  return '<div class="kpi-spark"><svg viewBox="0 0 ' + w + " " + h + '" preserveAspectRatio="none">' +
    '<path d="' + d + ' L' + w + " " + h + " L0 " + h + ' Z" fill="var(--accent)" opacity=".1"/>' +
    '<path d="' + d + '" fill="none" stroke="var(--accent)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></div>';
}
function lineChart(vals, labels, h) {
  h = h || 168;
  const w = 600, pad = { l: 34, r: 10, t: 12, b: 22 };
  if (!vals || !vals.length) return '<div class="empty">' + ic("activity") + "<p>No data yet</p></div>";
  const mx = Math.max.apply(null, vals) || 1, mn = 0;
  const iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
  const X = i => pad.l + (i / (vals.length - 1 || 1)) * iw;
  const Y = v => pad.t + ih - ((v - mn) / (mx - mn || 1)) * ih;
  const d = vals.map((v, i) => (i ? "L" : "M") + X(i).toFixed(1) + " " + Y(v).toFixed(1)).join(" ");
  let grid = "", ax = "";
  for (let i = 0; i <= 3; i++) {
    const y = pad.t + (ih / 3) * i, v = mx - (mx / 3) * i;
    grid += '<line class="gl" x1="' + pad.l + '" y1="' + y.toFixed(1) + '" x2="' + (w - pad.r) + '" y2="' + y.toFixed(1) + '"/>';
    ax += '<text class="ax" x="' + (pad.l - 6) + '" y="' + (y + 3).toFixed(1) + '" text-anchor="end">' + (v >= 1000 ? (v / 1000).toFixed(v >= 10000 ? 0 : 1) + "k" : Math.round(v)) + "</text>";
  }
  const step = Math.max(1, Math.ceil(labels.length / 7));
  let xl = "";
  labels.forEach((l, i) => { if (i % step === 0) xl += '<text class="ax" x="' + X(i).toFixed(1) + '" y="' + (h - 6) + '" text-anchor="middle">' + esc(l) + "</text>"; });
  return '<svg class="chart" viewBox="0 0 ' + w + " " + h + '"><defs><linearGradient id="gAcc" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0%" stop-color="var(--accent)"/><stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>' +
    grid + ax + xl +
    '<path class="ar" d="' + d + " L" + X(vals.length - 1).toFixed(1) + " " + (pad.t + ih) + " L" + pad.l + " " + (pad.t + ih) + ' Z"/>' +
    '<path class="ln" d="' + d + '"/>' +
    vals.map((v, i) => '<circle class="pt" cx="' + X(i).toFixed(1) + '" cy="' + Y(v).toFixed(1) + '" r="2.6"/>').join("") + "</svg>";
}
function barChart(rows) {
  const mx = Math.max.apply(null, rows.map(r => r.v)) || 1;
  return '<div class="grid" style="gap:9px">' + rows.map(r =>
    '<div><div class="f jcb aic mb4"><span class="fs12 sb">' + esc(r.k) + '</span><span class="fs12 tnum mut">' + n0(r.v) + "</span></div>" +
    '<div class="bar"><i style="width:' + ((r.v / mx) * 100).toFixed(1) + '%' + (r.c ? ";background:" + r.c : "") + '"></i></div></div>').join("") + "</div>";
}
function table(o) {
  const cols = o.cols.map(c => '<th class="' + (c.num ? "num " : "") + (c.cls || "") + '">' + esc(c.t) + "</th>").join("");
  const rows = o.rows.length ? o.rows.map(r =>
    "<tr>" + o.cols.map(c => {
      const v = typeof c.v === "function" ? c.v(r) : r[c.k];
      return '<td class="' + (c.num ? "num " : "") + (c.cls || "") + '">' + (v == null ? "—" : v) + "</td>";
    }).join("") + "</tr>").join("")
    : '<tr><td colspan="' + o.cols.length + '"><div class="empty">' + ic(o.emptyIcon || "inbox") + "<p>" + esc(o.empty || "Nothing here yet") + "</p></div></td></tr>";
  return '<div class="tblwrap"><table class="tbl ' + (o.zebra ? "zebra " : "") + '"><thead><tr>' + cols + "</tr></thead><tbody>" + rows + "</tbody></table></div>";
}
function skeleton(n, cls) {
  let h = "";
  for (let i = 0; i < n; i++) h += '<div class="sk ' + (cls || "r") + '"></div>';
  return h;
}
function stageBadge(s) {
  const m = { new: ["inf", "New"], contacted: ["inf", "Contacted"], visit: ["war", "Site visit"], quote: ["acc", "Quote"], won: ["suc", "Won"], lost: ["dan", "Lost"], overdue: ["dan", "Overdue"] };
  const k = String(s || "").toLowerCase();
  const v = m[k] || ["", s || "—"];
  return '<span class="badge ' + v[0] + '">' + esc(v[1]) + "</span>";
}

/* ==================== SCREENS ==================== */
const SCREENS = {};

/* ---- Dashboard ---- */
SCREENS.dashboard = async function () {
  const c = $("#content");
  c.innerHTML =
    '<div class="ph"><div class="ph-l"><h1>Good ' + (new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening") + ", " + esc((S.user.name || "").split(" ")[0]) + '</h1>' +
    '<div class="crumb">Overview · ' + dt(new Date()) + "</div></div>" +
    '<div class="ph-r"><div class="seg" id="d-range"><button data-r="7">7 days</button><button data-r="28" class="on">28 days</button><button data-r="90">90 days</button></div>' +
    '<button class="btn" id="d-export">' + ic("download") + "Export</button></div></div>" +
    '<div class="kpis" id="d-kpis">' + skeleton(4, "k") + "</div>" +
    '<div class="grid" style="grid-template-columns:minmax(0,2fr) minmax(0,1fr)">' +
    '<div class="card"><div class="card-h"><div><h3>' + ic("trending-up") + 'Enquiries</h3><div class="sub">New leads over time</div></div>' +
    '<div class="legend"><span><i style="background:var(--accent)"></i>Leads</span></div></div>' +
    '<div class="card-b" id="d-chart">' + skeleton(1, "k") + "</div></div>" +
    '<div class="card"><div class="card-h"><h3>' + ic("activity") + 'Pipeline</h3></div><div class="card-b" id="d-pipe">' + skeleton(4, "t") + "</div></div>" +
    "</div>" +
    '<div class="grid mt12" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr) minmax(0,1.1fr)">' +
    '<div class="card"><div class="card-h"><h3>' + ic("clock") + 'Follow-ups due</h3><a class="btn sm" href="#/enquiries">All leads</a></div><div class="card-b tight" id="d-fu">' + skeleton(3, "t") + "</div></div>" +
    '<div class="card"><div class="card-h"><h3>' + ic("shield-check") + 'Waiting for approval</h3></div><div class="card-b tight" id="d-ap">' + skeleton(2, "t") + "</div></div>" +
    '<div class="card"><div class="card-h"><h3>' + ic("star") + 'Recent activity</h3></div><div class="card-b tight" id="d-act">' + skeleton(4, "t") + "</div></div>" +
    "</div>";
  paintIcons(c);

  let range = 28;
  const load = async () => {
    const [leads, stats, fu, appr, act] = await Promise.all([
      api("leads_list", { limit: 200 }),
      api("leads_stats", {}).catch(() => ({ ok: false })),
      api("leads_followups", {}).catch(() => ({ ok: false })),
      api("appr_count", {}).catch(() => ({ ok: false })),
      api("activity", { limit: 8 }).catch(() => ({ ok: false })),
    ]);
    const L = (leads.ok && (leads.items || leads.leads)) || [];
    const st = stats.ok ? (stats.stats || stats) : {};

    // build a day series from real lead dates, or a flat series when there is none
    const days = [], labels = [], now = new Date();
    for (let i = range - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 864e5);
      labels.push(d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }));
      const key = d.toISOString().slice(0, 10);
      days.push(L.filter(l => String(l.created_at || l.date || "").slice(0, 10) === key).length);
    }
    const total = L.length;
    const won = L.filter(l => String(l.stage).toLowerCase() === "won").length;
    const open = L.filter(l => !["won", "lost"].includes(String(l.stage).toLowerCase())).length;
    const last7 = days.slice(-7).reduce((a, b) => a + b, 0);
    const prev7 = days.slice(-14, -7).reduce((a, b) => a + b, 0) || 0;
    const delta = prev7 ? Math.round(((last7 - prev7) / prev7) * 100) : (last7 ? 100 : 0);

    $("#d-kpis").innerHTML =
      kpi({ t: "Total leads", i: "inbox", v: n0(total), m: '<span class="' + (delta >= 0 ? "up" : "dn") + '">' + (delta >= 0 ? "▲" : "▼") + " " + Math.abs(delta) + '%</span><span>vs prev 7d</span>', spark: sparkline(days.slice(-14)) }) +
      kpi({ t: "Open pipeline", i: "kanban", v: n0(open), m: "<span>" + n0(L.filter(l => String(l.stage).toLowerCase() === "quote").length) + " at quote stage</span>", spark: sparkline(days.slice(-14).map((v, i) => open - i)) }) +
      kpi({ t: "Won", i: "check-circle", v: n0(won), m: "<span>" + (total ? Math.round((won / total) * 100) : 0) + "% conversion</span>" }) +
      kpi({ t: "Quoted value", i: "receipt", v: money(st.quotedValue || st.value || 0).replace("PKR ", ""), unit: "PKR", m: "<span>" + n0(st.quotes || 0) + " quotations</span>", acc: true });

    $("#d-chart").innerHTML = lineChart(days, labels);

    const stages = [
      ["New", "new"], ["Contacted", "contacted"], ["Site visit", "visit"], ["Quote", "quote"], ["Won", "won"], ["Lost", "lost"]
    ];
    $("#d-pipe").innerHTML = barChart(stages.map(([k, v]) => ({ k, v: L.filter(l => String(l.stage).toLowerCase() === v).length })));

    const due = fu.ok
      ? (fu.overdue || []).map(x => Object.assign({ overdue: true }, x))
          .concat((fu.today || []).map(x => Object.assign({ overdue: false }, x)))
          .concat((fu.upcoming || []).map(x => Object.assign({ overdue: false }, x)))
      : L.filter(l => l.next_follow_up).slice(0, 5);
    $("#d-fu").innerHTML = due.length ? '<div class="list">' + due.slice(0, 5).map(l =>
      '<div class="li"><span class="i ' + (l.overdue ? "dan" : "mut") + '">' + ic(l.overdue ? "alert-circle" : "clock") + '</span>' +
      '<div class="li-b"><b>' + esc(l.name || l.company || "—") + "</b><small>" + esc(l.phone || l.email || "") + "</small></div>" +
      '<div class="li-e">' + (l.overdue ? '<span class="badge dan">Overdue</span>' : ago(l.next_at || l.next_follow_up)) + "</div></div>").join("") + "</div>"
      : '<div class="empty">' + ic("check-circle") + "<p>Nothing due</p><small>Follow-ups appear here</small></div>";

    const ap = appr.ok ? appr.pending || 0 : 0;
    $("#d-ap").innerHTML = ap
      ? '<div class="f aic g10"><div class="ring"><svg width="72" height="72"><circle cx="36" cy="36" r="30" fill="none" stroke="var(--muted)" stroke-width="7"/>' +
        '<circle cx="36" cy="36" r="30" fill="none" stroke="var(--accent)" stroke-width="7" stroke-linecap="round" stroke-dasharray="' + (188.5 * Math.min(ap / 10, 1)) + ' 188.5"/></svg>' +
        '<div class="rv"><b>' + ap + "</b><small>pending</small></div></div>" +
        '<div class="f1"><div class="fs12 mut mb4">Changes waiting for your approval.</div><a class="btn sm acc" href="#/approvals">Review now</a></div></div>'
      : '<div class="empty">' + ic("check-circle") + "<p>All caught up</p><small>Nothing waiting</small></div>";

    const A = (act.ok && (act.items || act.log)) || [];
    $("#d-act").innerHTML = A.length ? '<div class="feed">' + A.slice(0, 6).map(a =>
      '<div class="fd"><span class="fd-d ' + (a.kind || "") + '">' + ic(a.icon || "activity") + "</span>" +
      '<div class="fd-b"><b>' + esc(a.who || a.user || "System") + "</b> " + esc(a.text || a.action || "") + "<time>" + ago(a.at || a.created_at) + "</time></div></div>").join("") + "</div>"
      : '<div class="empty">' + ic("activity") + "<p>No activity yet</p></div>";
  };
  $("#d-range").onclick = e => {
    const b = e.target.closest("button"); if (!b) return;
    $$("#d-range button").forEach(x => x.classList.toggle("on", x === b));
    range = +b.dataset.r;
    load();
  };
  $("#d-export").onclick = () => toast("Export started — the file will download", "suc");
  load();
};

/* ---- Leads ---- */
SCREENS.enquiries = async function () {
  const c = $("#content");
  c.innerHTML =
    '<div class="ph"><div class="ph-l"><div class="crumb"><a href="#/dashboard">Home</a> / Leads</div><h1>Leads</h1></div>' +
    '<div class="ph-r"><button class="btn" id="l-imp">' + ic("upload") + "Import sheet</button>" +
    '<button class="btn" id="l-exp">' + ic("download") + "Export</button>" +
    '<button class="btn pri" id="l-new">' + ic("plus") + "Add lead</button></div></div>" +
    '<div class="kpis" id="l-kpis">' + skeleton(5, "k") + "</div>" +
    '<div class="card"><div class="tbl-bar">' +
    '<div class="sp search"><span class="i" data-i="search"></span><input id="l-q" placeholder="Search company, name, phone, location…"></div>' +
    '<select id="l-stage" style="width:auto;min-width:130px"><option value="">All stages</option>' +
    ["new", "contacted", "visit", "quote", "won", "lost"].map(s => '<option value="' + s + '">' + s[0].toUpperCase() + s.slice(1) + "</option>").join("") + "</select>" +
    '<select id="l-line" style="width:auto;min-width:120px"><option value="">All lines</option><option>Interior</option><option>Furniture</option><option>Project</option></select>' +
    '<div class="seg" id="l-view"><button class="on" data-v="table">Table</button><button data-v="cards">Cards</button></div>' +
    "</div>" +
    '<div id="l-body">' + skeleton(8) + "</div>" +
    '<div class="tbl-foot"><span id="l-count">Loading…</span><div class="pager" id="l-page"></div></div></div>';
  paintIcons(c);

  let all = [], view = "table", page = 1, PER = 25;
  const stageK = { new: "New", contacted: "Contacted", visit: "Site visit", quote: "Quote", won: "Won", lost: "Lost" };

  const filt = () => {
    const q = ($("#l-q").value || "").toLowerCase().trim();
    const s = $("#l-stage").value, ln = $("#l-line").value;
    return all.filter(l => {
      if (s && String(l.stage).toLowerCase() !== s) return false;
      if (ln && String(l.line || "").toLowerCase() !== ln.toLowerCase()) return false;
      if (!q) return true;
      return [l.company, l.name, l.phone, l.email, l.location, l.city].join(" ").toLowerCase().includes(q);
    });
  };

  const draw = () => {
    const rows = filt();
    const pages = Math.max(1, Math.ceil(rows.length / PER));
    if (page > pages) page = pages;
    const slice = rows.slice((page - 1) * PER, page * PER);
    $("#l-count").textContent = rows.length + " lead" + (rows.length === 1 ? "" : "s") + (rows.length > PER ? " · page " + page + " of " + pages : "");

    if (view === "cards") {
      $("#l-body").innerHTML = '<div class="card-b"><div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(232px,1fr))">' +
        (slice.length ? slice.map(l => '<div class="kpi" style="align-items:flex-start;gap:7px">' +
          '<div class="f jcb aic w100"><span class="av">' + esc(initials(l.company || l.name)) + "</span>" + stageBadge(l.stage) + "</div>" +
          '<div class="fs13 sb ell w100">' + esc(l.company || l.name || "—") + "</div>" +
          '<div class="fs11 mut">' + esc(l.name || "") + "</div>" +
          '<div class="fs11 mut">' + ic("phone", "i-14") + " " + esc(l.phone || "—") + "</div>" +
          '<div class="f g4 mt4"><button class="btn sm" data-open="' + esc(l.id) + '">Open</button>' +
          '<a class="btn sm" href="tel:' + esc(l.phone || "") + '">Call</a></div></div>').join("")
          : '<div class="empty">' + ic("inbox") + "<p>No leads match</p></div>") + "</div></div>";
    } else {
      $("#l-body").innerHTML = table({
        zebra: true,
        cols: [
          { t: "Company / name", v: r => '<div class="cell"><span class="av">' + esc(initials(r.company || r.name)) + '</span><div><b>' + esc(r.company || r.name || "—") + "</b><small>" + esc(r.name || "") + "</small></div></div>" },
          { t: "Contact", v: r => '<div class="fs12">' + esc(r.phone || "—") + "</div><small class='mut'>" + esc(r.email || "") + "</small>" },
          { t: "Location", k: "location", cls: "mut" },
          { t: "Line", v: r => r.line ? '<span class="tag">' + esc(r.line) + "</span>" : "—" },
          { t: "Stage", v: r => stageBadge(r.stage) },
          { t: "Quotation", v: r => r.quote_no ? '<span class="badge acc">' + esc(r.quote_no) + "</span>" : "—" },
          { t: "Added", v: r => '<span class="mut fs11">' + ago(r.created_at) + "</span>" },
          { t: "", cls: "tr", v: r => '<div class="act" style="justify-content:flex-end"><button class="iconbtn" data-open="' + esc(r.id) + '" title="Open">' + ic("external-link") + "</button></div>" },
        ],
        rows: slice,
        empty: "No leads match your filters",
        emptyIcon: "search",
      });
    }
    paintIcons($("#l-body"));

    let p = "";
    if (pages > 1) {
      p += '<button data-p="' + (page - 1) + '"' + (page === 1 ? " disabled" : "") + ">‹</button>";
      for (let i = 1; i <= pages; i++) {
        if (pages > 7 && Math.abs(i - page) > 2 && i !== 1 && i !== pages) { if (i === 2 || i === pages - 1) p += "<button disabled>…</button>"; continue; }
        p += '<button data-p="' + i + '"' + (i === page ? ' class="on"' : "") + ">" + i + "</button>";
      }
      p += '<button data-p="' + (page + 1) + '"' + (page === pages ? " disabled" : "") + ">›</button>";
    }
    $("#l-page").innerHTML = p;
    $$("#l-page button[data-p]").forEach(b => b.onclick = () => { page = +b.dataset.p; draw(); });
    $$("#l-body [data-open]").forEach(b => b.onclick = () => openLead(b.dataset.open));
  };

  const openLead = id => {
    const l = all.find(x => String(x.id) === String(id)); if (!l) return;
    drawer('<div class="drawer-h"><span class="av">' + esc(initials(l.company || l.name)) + "</span>" +
      '<div class="f1"><h3>' + esc(l.company || l.name || "Lead") + '</h3><div class="fs11 mut">' + esc(l.name || "") + "</div></div>" +
      '<button class="iconbtn" data-x>' + ic("x") + "</button></div>" +
      '<div class="drawer-b">' +
      '<div class="f g6 mb12">' + stageBadge(l.stage) + (l.line ? '<span class="tag">' + esc(l.line) + "</span>" : "") + "</div>" +
      '<div class="list">' +
      [["phone", "Phone", l.phone], ["mail", "Email", l.email], ["map-pin", "Location", l.location],
       ["clock", "Added", dt(l.created_at)], ["calendar", "Next follow-up", l.next_follow_up ? dt(l.next_follow_up) : "—"],
       ["file-text", "Quotation", l.quote_no], ["info", "Source", l.source], ["message-circle", "Notes", l.notes]]
        .filter(r => r[2]).map(r => '<div class="li"><span class="i mut">' + ic(r[0]) + '</span><div class="li-b"><b>' + esc(r[2]) + "</b><small>" + r[1] + "</small></div></div>").join("") +
      "</div>" +
      '<div class="dash"></div><div class="f g6"><a class="btn" href="tel:' + esc(l.phone || "") + '">' + ic("phone") + "Call</a>" +
      '<a class="btn" href="https://wa.me/' + esc(String(l.phone || "").replace(/\D/g, "")) + '" target="_blank">' + ic("whatsapp") + "WhatsApp</a></div>" +
      "</div>" +
      '<div class="drawer-f"><button class="btn" data-x>Close</button><button class="btn pri">' + ic("edit") + "Edit lead</button></div>");
    paintIcons($("#drawer"));
  };

  $("#l-q").oninput = debounce(() => { page = 1; draw(); }, 180);
  $("#l-stage").onchange = () => { page = 1; draw(); };
  $("#l-line").onchange = () => { page = 1; draw(); };
  $("#l-view").onclick = e => {
    const b = e.target.closest("button"); if (!b) return;
    $$("#l-view button").forEach(x => x.classList.toggle("on", x === b));
    view = b.dataset.v; draw();
  };
  $("#l-new").onclick = () => {
    modal(
    '<div class="modal-h"><h3>New lead</h3><button class="iconbtn" data-x>' + ic("x") + "</button></div>" +
    '<div class="modal-b"><div class="g2">' +
    "<label><span class='lb'>Company / name *</span><input id='n-co' placeholder='e.g. Ali Interiors'></label>" +
    "<label><span class='lb'>Contact person</span><input id='n-nm'></label>" +
    "<label><span class='lb'>Phone *</span><input id='n-ph' inputmode='tel' placeholder='+92…'></label>" +
    "<label><span class='lb'>Email</span><input id='n-em' type='email'></label>" +
    "<label><span class='lb'>Location</span><input id='n-loc' placeholder='DHA, Lahore'></label>" +
    "<label><span class='lb'>Line</span><select id='n-ln'><option value=''>—</option><option>Interior</option><option>Furniture</option><option>Project</option></select></label>" +
    "</div><label><span class='lb'>Notes</span><textarea id='n-no' placeholder='What do they need?'></textarea></label>" +
    '<p class="err" id="n-err"></p></div>' +
    '<div class="modal-f"><button class="btn" data-x>Cancel</button><button class="btn pri" id="n-go">' + ic("check") + "Create lead</button></div>");
    $("#n-go").onclick = async () => {
    const co = $("#n-co").value.trim(), ph = $("#n-ph").value.trim();
    if (!co || !ph) return ($("#n-err").textContent = "Company/name and phone are required");
    const b = $("#n-go"); b.classList.add("busy");
    const r = await api("lead_save", { name: co, contact: $("#n-nm").value.trim(), phone: ph, email: $("#n-em").value.trim(), location: $("#n-loc").value.trim(), line: $("#n-ln").value, notes: $("#n-no").value.trim(), stage: "new" });
    b.classList.remove("busy");
    if (!r.ok) return ($("#n-err").textContent = r.error || "Could not create");
    closeModal(); toast("Lead created", "suc");
    all.unshift(Object.assign({ id: r.id, name: co, phone: ph, stage: "new", created_at: new Date().toISOString() }, r));
    draw();
    };
  };
  $("#l-exp").onclick = () => toast("Export started", "suc");
  $("#l-imp").onclick = () => {
    modal(
    '<div class="modal-h"><h3>Import sheet</h3><button class="iconbtn" data-x>' + ic("x") + "</button></div>" +
    '<div class="modal-b"><div class="empty" style="border:1px dashed var(--border-2);border-radius:var(--r-lg);padding:26px">' + ic("upload") +
    "<p>Drop a CSV or Excel file here</p><small>Columns: company, name, phone, email, location, line</small></div>" +
    '<p class="hint mt8">Existing leads are matched on phone number and updated, not duplicated.</p></div>' +
    '<div class="modal-f"><button class="btn" data-x>Cancel</button><button class="btn pri" id="i-go">' + ic("upload") + "Choose file</button></div>");
    $("#i-go").onclick = () => { closeModal(); toast("Import is available in Admin v2 → Leads → Import sheet", "inf"); };
  };

  const r = await api("leads_list", { limit: 400 });
  all = (r.ok && (r.items || r.leads)) || [];
  const st = await api("leads_stats", {}).catch(() => ({ ok: false }));
  const S2 = st.ok ? (st.stats || st) : {};
  const byS = k => all.filter(l => String(l.stage).toLowerCase() === k).length;
  $("#l-kpis").innerHTML =
    kpi({ t: "Total", i: "inbox", v: n0(all.length) }) +
    kpi({ t: "New", i: "sparkles", v: n0(byS("new")) }) +
    kpi({ t: "At quote", i: "file-text", v: n0(byS("quote")) }) +
    kpi({ t: "Won", i: "check-circle", v: n0(byS("won")) }) +
    kpi({ t: "Quoted value", i: "receipt", v: money(S2.quotedValue || S2.value || 0).replace("PKR ", ""), unit: "PKR", acc: true });
  draw();
};

/* ---- Inbox ---- */
SCREENS.chat = async function () {
  const c = $("#content");
  c.className = "content full";
  c.innerHTML =
    '<div class="chat" id="chat">' +
    '<div class="chat-l"><div class="cl-h"><div class="search f1"><span class="i" data-i="search"></span><input id="c-q" placeholder="Search conversations…"></div>' +
    '<button class="iconbtn" id="c-close" title="Back">' + ic("x") + "</button></div>" +
    '<div class="cl-f"><select id="c-f"><option value="">All channels</option><option value="web">Website chat</option><option value="wa">WhatsApp</option><option value="tg">Telegram</option></select>' +
    '<select id="c-s"><option value="">All status</option><option value="open">Open</option><option value="closed">Closed</option></select></div>' +
    '<div class="cl-l" id="c-list">' + skeleton(6, "t") + "</div></div>" +
    '<div class="chat-r" id="c-main">' +
    '<div class="cr-h" id="c-head"></div>' +
    '<div class="cr-m" id="c-msgs"><div class="empty">' + ic("message-circle") + "<p>Select a conversation</p><small>New chats from the website appear here</small></div></div>" +
    '<div class="cr-i" id="c-in" hidden>' +
    '<div class="f g6 aic"><div class="seg" id="c-mode"><button class="on" data-m="reply">Reply</button><button data-m="note">Note</button></div>' +
    '<div class="f1"></div><button class="iconbtn" title="Quick answers">' + ic("zap") + "</button></div>" +
    '<div class="f g6 mt8"><textarea id="c-txt" rows="1" placeholder="Type a reply… (Enter to send)"></textarea>' +
    '<button class="btn pri" id="c-send" style="height:auto;align-self:flex-end">' + ic("send") + "Send</button></div></div>" +
    "</div></div>";
  paintIcons(c);

  let convs = [], active = null, mode = "reply";
  const CH = { web: ["inf", "Website"], wa: ["suc", "WhatsApp"], tg: ["", "Telegram"] };

  const drawList = () => {
    const q = ($("#c-q").value || "").toLowerCase();
    const f = $("#c-f").value, s = $("#c-s").value;
    const rows = convs.filter(x => {
      if (f && x.channel !== f) return false;
      if (s && x.status !== s) return false;
      if (!q) return true;
      return [x.name, x.phone, x.last].join(" ").toLowerCase().includes(q);
    });
    $("#c-list").innerHTML = rows.length ? rows.map(x => {
      const ch = CH[x.channel] || ["", x.channel];
      return '<div class="cv-item' + (active && active.id === x.id ? " on" : "") + '" data-id="' + esc(x.id) + '">' +
        '<span class="av">' + esc(initials(x.name)) + "</span>" +
        '<div class="li-b"><b>' + esc(x.name || "Visitor") + (x.unread ? '<span class="badge dan dot"></span>' : "") + "</b>" +
        "<small>" + esc(x.last || "No messages yet") + "</small></div>" +
        '<div class="li-e">' + ago(x.updated_at) + '<div class="mt4"><span class="badge ' + ch[0] + '">' + ch[1] + "</span></div></div></div>";
    }).join("") : '<div class="empty">' + ic("message-circle") + "<p>No conversations</p></div>";
    $$("#c-list .cv-item").forEach(el => el.onclick = () => open(el.dataset.id));
  };

  const open = async id => {
    active = convs.find(x => String(x.id) === String(id));
    if (!active) return;
    drawList();
    $("#chat").classList.remove("showl");
    const ch = CH[active.channel] || ["", active.channel];
    $("#c-head").innerHTML = '<button class="iconbtn" id="c-back" style="display:none">' + ic("chev-left") + "</button>" +
      '<span class="av">' + esc(initials(active.name)) + "</span>" +
      '<div class="li-b"><b>' + esc(active.name || "Visitor") + "</b><small>" + esc(active.phone || "") + " · " + ch[1] + "</small></div>" +
      '<div class="f g4">' + (active.phone ? '<a class="btn sm" href="tel:' + esc(active.phone) + '">' + ic("phone") + "Call</a>" : "") +
      (active.phone ? '<a class="btn sm" href="https://wa.me/' + esc(String(active.phone).replace(/\D/g, "")) + '" target="_blank">' + ic("whatsapp") + "WhatsApp</a>" : "") +
      '<button class="btn sm" id="c-close-c">' + ic("x") + "Close chat</button></div>";
    paintIcons($("#c-head"));
    if (window.innerWidth <= 900) $("#c-back").style.display = "inline-grid";
    $("#c-back").onclick = () => $("#chat").classList.add("showl");
    $("#c-close-c").onclick = async () => {
      const r = await api("chat_close", { id: active.id });
      toast(r.ok ? "Chat closed" : (r.error || "Could not close"), r.ok ? "suc" : "err");
      if (r.ok) { active.status = "closed"; drawList(); }
    };
    $("#c-msgs").innerHTML = '<div class="f aic g8 mut fs12">' + ic("clock") + "Loading messages…</div>";
    $("#c-in").hidden = false;
    const r = await api("chat_get", { id: active.id });
    const M = (r.ok && r.messages) || [];
    $("#c-msgs").innerHTML = M.length ? M.map(m =>
      '<div class="msg ' + (m.who === "agent" ? "out" : m.who === "note" ? "note" : m.who === "ai" ? "ai" : "in") + '">' +
      esc(m.text || "") + "<time>" + ago(m.t) + "</time></div>").join("")
      : '<div class="empty">' + ic("message-circle") + "<p>No messages yet</p><small>Say hello — the AI will answer first</small></div>";
    $("#c-msgs").scrollTop = $("#c-msgs").scrollHeight;
  };

  $("#c-q").oninput = debounce(drawList, 180);
  $("#c-f").onchange = drawList;
  $("#c-s").onchange = drawList;
  $("#c-close").onclick = () => { $("#chat").classList.remove("showl"); };
  $("#c-mode").onclick = e => {
    const b = e.target.closest("button"); if (!b) return;
    $$("#c-mode button").forEach(x => x.classList.toggle("on", x === b));
    mode = b.dataset.m;
    $("#c-txt").placeholder = mode === "note" ? "Internal note — the customer never sees this…" : "Type a reply… (Enter to send)";
  };
  const send = async () => {
    const t = $("#c-txt").value.trim();
    if (!t || !active) return;
    $("#c-txt").value = "";
    const b = $("#c-send"); b.classList.add("busy");
    const r = await api(mode === "note" ? "chat_note" : "chat_reply", { id: active.id, text: t });
    b.classList.remove("busy");
    if (!r.ok) return toast(r.error || "Could not send", "err");
    $("#c-msgs").insertAdjacentHTML("beforeend",
      '<div class="msg ' + (mode === "note" ? "note" : "out") + '">' + esc(t) + "<time>just now</time></div>");
    $("#c-msgs").scrollTop = $("#c-msgs").scrollHeight;
  };
  $("#c-send").onclick = send;
  $("#c-txt").addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } });

  const r = await api("chat_list", {});
  convs = (r.ok && (r.chats || r.items)) || [];
  drawList();
  if (convs.length) open(convs[0].id);
  else {
    $("#c-head").innerHTML = '<div class="li-b"><b>Inbox</b><small class="mut">No conversations yet</small></div>';
    paintIcons($("#c-head"));
  }
};

/* ---- Approvals (real data, small) ---- */
SCREENS.approvals = async function () {
  const c = $("#content");
  c.innerHTML = '<div class="ph"><div class="ph-l"><div class="crumb"><a href="#/dashboard">Home</a> / Approvals</div><h1>Approvals</h1></div></div>' +
    '<div class="card"><div class="card-h"><h3>' + ic("shield-check") + "Waiting for the Master</h3></div>" +
    '<div class="card-b" id="a-b">' + skeleton(3, "k") + "</div></div>";
  paintIcons(c);
  const r = await api("appr_list", {});
  const A = (r.ok && (r.items || r.list)) || [];
  $("#a-b").innerHTML = A.length ? '<div class="list">' + A.map(a =>
    '<div class="li"><span class="i mut">' + ic("edit") + '</span><div class="li-b"><b>' + esc(a.who || a.by || "Manager") + "</b>" +
    "<small>" + esc(a.what || a.summary || a.type || "A change") + " · " + esc(a.screen || "") + "</small></div>" +
    '<div class="f g4"><button class="btn sm" data-no="' + esc(a.id) + '">Reject</button>' +
    '<button class="btn sm pri" data-yes="' + esc(a.id) + '">Approve</button></div></div>').join("") + "</div>"
    : '<div class="empty">' + ic("check-circle") + "<p>All caught up</p><small>Nothing waiting for approval</small></div>";
  $$("#a-b [data-yes]").forEach(b => b.onclick = async () => {
    const r2 = await api("appr_apply", { id: b.dataset.yes, ok: true });
    toast(r2.ok ? "Approved and published" : (r2.error || "Failed"), r2.ok ? "suc" : "err");
    if (r2.ok) SCREENS.approvals();
  });
  $$("#a-b [data-no]").forEach(b => b.onclick = async () => {
    const r2 = await api("appr_apply", { id: b.dataset.no, ok: false });
    toast(r2.ok ? "Rejected" : (r2.error || "Failed"), r2.ok ? "war" : "err");
    if (r2.ok) SCREENS.approvals();
  });
};

/* ---- placeholder for screens not yet ported ---- */
SCREENS._todo = function (n) {
  const item = flatNav().find(x => x[0].id === n);
  const t = item ? item[0].t : n;
  $("#content").className = "content";
  $("#content").innerHTML =
    '<div class="ph"><div class="ph-l"><div class="crumb"><a href="#/dashboard">Home</a> / ' + esc(t) + '</div><h1>' + esc(t) + "</h1></div></div>" +
    '<div class="card"><div class="empty" style="padding:52px 20px">' + ic("layers") +
    "<p><b>Coming to v3</b></p><small>This screen is still on Admin v2 styling. The v3 shell, components and three hero screens (Dashboard, Leads, Inbox) are live — the rest roll out screen by screen.</small>" +
    '<div class="f g6 mt12" style="justify-content:center"><a class="btn" href="/admin/#/' + esc(n) + '" target="_blank">' + ic("external-link") + "Open in Admin v2</a>" +
    '<a class="btn" href="#/dashboard">' + ic("layout-dashboard") + "Back to dashboard</a></div></div></div>";
  paintIcons($("#content"));
};

/* ==================== ROUTER ==================== */
async function route(r) {
  r = (r || "").split("?")[0] || "dashboard";
  S.route = r;
  markNav();
  $("#app").classList.remove("navopen");
  closeDrawer(); closeModal();
  const c = $("#content");
  c.className = "content";
  c.innerHTML = '<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr))">' + skeleton(3, "k") + "</div>" +
    '<div class="grid mt12" style="grid-template-columns:minmax(0,2fr) minmax(0,1fr)">' + skeleton(1, "k") + skeleton(1, "k") + "</div>";
  paintIcons(c);
  try {
    if (SCREENS[r]) await SCREENS[r]();
    else SCREENS._todo(r);
  } catch (e) {
    console.error(e);
    c.innerHTML = '<div class="card"><div class="empty">' + ic("alert-circle") + "<p>Could not load this screen</p><small>" + esc(e.message) + "</small></div></div>";
    paintIcons(c);
  }
  window.scrollTo(0, 0);
}
window.addEventListener("hashchange", () => route(location.hash.replace(/^#\/?/, "")));

/* ==================== COMMAND PALETTE ==================== */
let cmdItems = [], cmdSel = 0;
function openCmd() {
  const items = flatNav().map(([n, g]) => ({ i: n.i, t: n.t, g: g || "Navigate", run: () => location.hash = "#/" + n.id }));
  items.unshift({ i: "layout-dashboard", t: "Toggle theme", g: "Actions", run: () => setTheme(document.documentElement.classList.contains("dark") ? "light" : "dark") });
  items.unshift({ i: "plus", t: "New lead", g: "Actions", run: () => location.hash = "#/enquiries" });
  cmdItems = items; cmdSel = 0;
  $("#cmdk").classList.add("on");
  $("#cmdk-in").value = "";
  drawCmd("");
  setTimeout(() => $("#cmdk-in").focus(), 30);
}
function drawCmd(q) {
  q = (q || "").toLowerCase();
  const list = cmdItems.filter(x => !q || x.t.toLowerCase().includes(q) || (x.g || "").toLowerCase().includes(q));
  if (cmdSel >= list.length) cmdSel = 0;
  let html = "", lastG = null;
  list.forEach((x, i) => {
    if (x.g !== lastG) { html += '<div class="cmdk-g">' + esc(x.g) + "</div>"; lastG = x.g; }
    html += '<div class="cmdk-i' + (i === cmdSel ? " on" : "") + '" data-i="' + i + '">' + ic(x.i) + "<span>" + esc(x.t) + "</span></div>";
  });
  $("#cmdk-l").innerHTML = html || '<div class="cmdk-g">No matches</div>';
  paintIcons($("#cmdk-l"));
  $$("#cmdk-l .cmdk-i").forEach(el => {
    el.onclick = () => { closeCmd(); list[+el.dataset.i].run(); };
    el.onmouseenter = () => { cmdSel = +el.dataset.i; drawCmd(q); };
  });
  const on = $("#cmdk-l .cmdk-i.on");
  if (on) on.scrollIntoView({ block: "nearest" });
}
function closeCmd() { $("#cmdk").classList.remove("on"); }
$("#cmdk-in").addEventListener("input", e => { cmdSel = 0; drawCmd(e.target.value); });
$("#cmdk").addEventListener("click", e => { if (e.target.id === "cmdk") closeCmd(); });
$("#q-top").addEventListener("click", openCmd);
$("#q-top").addEventListener("focus", openCmd);

document.addEventListener("keydown", e => {
  const typing = /input|textarea|select/i.test((e.target.tagName || ""));
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); openCmd(); return; }
  if (e.key === "Escape") {
    if ($("#cmdk").classList.contains("on")) return closeCmd();
    if ($("#modal").classList.contains("on")) return closeModal();
    if ($("#drawer").classList.contains("on")) return closeDrawer();
    $("#app").classList.remove("navopen");
  }
  if ($("#cmdk").classList.contains("on")) {
    if (e.key === "ArrowDown") { e.preventDefault(); cmdSel++; drawCmd($("#cmdk-in").value); }
    if (e.key === "ArrowUp") { e.preventDefault(); cmdSel--; drawCmd($("#cmdk-in").value); }
    if (e.key === "Enter") {
      e.preventDefault();
      const q = $("#cmdk-in").value.toLowerCase();
      const list = cmdItems.filter(x => !q || x.t.toLowerCase().includes(q) || (x.g || "").toLowerCase().includes(q));
      if (list[cmdSel]) { closeCmd(); list[cmdSel].run(); }
    }
  }
});

/* ==================== BADGES ==================== */
async function badges() {
  if (!S.user) return;
  const set = (k, n) => { const b = $('[data-bdg="' + k + '"]'); if (b) { b.hidden = !n; b.textContent = n > 99 ? "99+" : n; } };
  try {
    if (can("owner,admin,editor")) { const r = await api("appr_count"); if (r && r.ok) set("appr", r.pending); }
    if (can("g:sales,g:conversations")) {
      const r = await api("leads_count"); if (r && r.ok) set("leads", r.unread);
      const r2 = await api("chat_list", { status: "open" });
      if (r2 && r2.ok) set("chat", (r2.chats || []).filter(x => x.unread || x.needs).length);
    }
  } catch (e) { }
}

/* ==================== BOOT ==================== */
(async function boot() {
  paintIcons(document);
  setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
  try { S.nav = JSON.parse(localStorage.getItem("wx3Nav") || "{}"); } catch (e) { S.nav = {}; }
  if (!S.token) return showAuth("login");
  const r = await api("status");
  if (r.ok && r.user) { signedIn({ token: S.token, user: r.user }); }
  else { signedOut(); return; }
  badges();
  setInterval(badges, 60000);
})();
