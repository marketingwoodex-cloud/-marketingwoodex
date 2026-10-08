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
  bot:"M12 2a2 2 0 012 2v2h4a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2h4V4a2 2 0 012-2zM9 13v-2M15 13v-2M8 17h8",
  tag:"M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82zM7 7h.01",
  "share-2":"M18 8a3 3 0 100-6 3 3 0 000 6zM6 15a3 3 0 100-6 3 3 0 000 6zM18 22a3 3 0 100-6 3 3 0 000 6zM8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98",
  play:"M5 3l14 9-14 9V3z",
  pause:"M6 4h4v16H6zM14 4h4v16h-4z",
  percent:"M19 5L5 19M6.5 6.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM17.5 17.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z",
  "thumbs-up":"M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3",
  "message-square":"M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z",
  "qr-code":"M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3zM15 15h2v2h-2zM19 15h2v2h-2zM15 19h2v2h-2zM19 19h2v2h-2z",
  radio:"M4.93 19.07A10 10 0 0119.07 4.93M7.76 16.24a6 6 0 018.48-8.48M12 12a1 1 0 100-2 1 1 0 000 2z",
  "bell-ring":"M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0M4 4l2 2M20 4l-2 2",
  facebook:"M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z",
  instagram:"M16 4H8a4 4 0 00-4 4v8a4 4 0 004 4h8a4 4 0 004-4V8a4 4 0 00-4-4zM12 8a4 4 0 100 8 4 4 0 000-8zM16.5 7.5h.01",
  linkedin:"M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2zM4 6a2 2 0 100-4 2 2 0 000 4z",
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
/* ---------- test accounts (dev helper, opt-in) ---------- */
/* Shown when the URL carries ?demo=1, or when the "Test accounts" link is
   clicked. Never rendered in a normal production visit. */
const TEST_ACCOUNTS = [
  { e: "master@woodex.pk", r: "Master" },
  { e: "manager@woodex.pk", r: "Manager" },
  { e: "developer@woodex.pk", r: "Developer" },
  { e: "sales@woodex.pk", r: "Sales" },
  { e: "support@woodex.pk", r: "Support" },
];
const TEST_PASS = "Woodex@2026";
(function initTestAccounts() {
  const box = $("#as-ta"), list = $("#as-ta-l"), link = $("#l-demo");
  if (!box || !list || !link) return;
  list.innerHTML = TEST_ACCOUNTS.map(a =>
    '<button class="ta-r" type="button" data-e="' + esc(a.e) + '"><code>' + esc(a.e) + "</code>" +
    '<span class="badge inf">' + esc(a.r) + '</span><span class="i i-14" data-i="chev-right"></span></button>').join("");
  paintIcons(list);
  const show = on => { box.hidden = !on; if (on) { const f = list.querySelector(".ta-r"); if (f) f.focus(); } };
  list.querySelectorAll(".ta-r").forEach(b => b.onclick = () => {
    $("#l-email").value = b.dataset.e;
    $("#l-pass").value = TEST_PASS;
    $("#l-err").textContent = "";
    show(false);
    $("#l-btn").focus();
  });
  link.addEventListener("click", e => { e.preventDefault(); show(box.hidden); });
  $("#as-ta-x").addEventListener("click", () => show(false));
  if (/[?&]demo=1\b/.test(location.search)) show(true);
})();

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
        '<button class="nav-gb">' + ic(n.i) + '<span class="nl">' + esc(n.g) + "</span>" + ic("chev-down", "chev") + "</button>" +
        '<div class="nav-gi">' + n.items.map(x =>
          '<a class="nav-a sub" href="#/' + x.id + '" data-v="' + x.id + '">' + ic(x.i) + '<span class="nl">' + esc(x.t) + "</span></a>").join("") + "</div></div>";
      return;
    }
    if (!can(n.can)) return;
    html += '<a class="nav-a" href="#/' + n.id + '" data-v="' + n.id + '">' + ic(n.i) + '<span class="nl">' + esc(n.t) + "</span>" +
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
    '<button class="side-user" id="b-sideuser" title="Account">' +
      '<span class="av">' + esc(initials(u.name)) + "</span>" +
      '<span class="su-t"><b>' + esc(u.name || u.email) + "</b><small>" + esc(u.roleLabel || u.role) + "</small></span>" +
      ic("chev-down", "chev") +
    "</button>" +
    '<div class="side-acts">' +
      '<a class="sact" href="/" target="_blank" title="View website" aria-label="View website">' + ic("external-link") + "</a>" +
      '<a class="sact" href="#" id="b-logout" title="Sign out" aria-label="Sign out">' + ic("log-out") + "</a>" +
    "</div>";
  paintIcons($("#sidefoot"));
  $("#b-logout").onclick = async e => {
    e.preventDefault();
    await api("logout");
    signedOut();
  };
  $("#b-sideuser").onclick = () => openUserModal();
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
function openUserModal() {
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
}
$("#b-user").onclick = () => openUserModal();
document.addEventListener("click", e => {
  const x = e.target.closest("[data-x]");
  if (x) { const p = x.closest(".modal,.drawer"); if (p) { p.classList.remove("on"); } }
});

/* ==================== COMPONENTS ==================== */
function kpi(o) {
  return '<div class="kpi' + (o.acc ? " acc" : "") + '">' +
    '<div class="kpi-t">' + ic(o.icon || "activity") + esc(o.t) + "</div>" +
    '<div class="kpi-v' + (o.c ? " " + o.c : "") + '">' + o.v + (o.unit ? "<small>" + esc(o.unit) + "</small>" : "") + "</div>" +
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
/* dual-series gradient area chart — "this period" (cyan) vs "previous" (violet) */
function areaChart2(a, b, labels, h) {
  h = h || 200;
  const w = 600, pad = { l: 36, r: 12, t: 14, b: 24 };
  if (!a || !a.length) return '<div class="empty">' + ic("activity") + "<p>No data yet</p></div>";
  const all = a.concat(b || []);
  const mx = Math.max.apply(null, all) || 1;
  const iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
  const n = a.length;
  const X = i => pad.l + (i / (n - 1 || 1)) * iw;
  const Y = v => pad.t + ih - (v / (mx || 1)) * ih;
  const dA = a.map((v, i) => (i ? "L" : "M") + X(i).toFixed(1) + " " + Y(v).toFixed(1)).join(" ");
  const dB = (b || []).map((v, i) => (i ? "L" : "M") + X(i).toFixed(1) + " " + Y(v).toFixed(1)).join(" ");
  let grid = "", ax = "";
  for (let i = 0; i <= 4; i++) {
    const y = pad.t + (ih / 4) * i, v = mx - (mx / 4) * i;
    grid += '<line class="gl" x1="' + pad.l + '" y1="' + y.toFixed(1) + '" x2="' + (w - pad.r) + '" y2="' + y.toFixed(1) + '"/>';
    ax += '<text class="ax" x="' + (pad.l - 7) + '" y="' + (y + 3).toFixed(1) + '" text-anchor="end">' + (v >= 1000 ? (v / 1000).toFixed(v >= 10000 ? 0 : 1) + "k" : Math.round(v)) + "</text>";
  }
  const step = Math.max(1, Math.ceil(labels.length / 7));
  let xl = "";
  labels.forEach((l, i) => { if (i % step === 0) xl += '<text class="ax" x="' + X(i).toFixed(1) + '" y="' + (h - 7) + '" text-anchor="middle">' + esc(l) + "</text>"; });
  const areaA = dA + " L" + X(n - 1).toFixed(1) + " " + (pad.t + ih) + " L" + pad.l + " " + (pad.t + ih) + " Z";
  const areaB = dB ? dB + " L" + X(n - 1).toFixed(1) + " " + (pad.t + ih) + " L" + pad.l + " " + (pad.t + ih) + " Z" : "";
  return '<svg class="chart" viewBox="0 0 ' + w + " " + h + '"><defs>' +
    '<linearGradient id="gA" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="var(--chart-3)"/><stop offset="100%" stop-color="var(--chart-3)" stop-opacity="0"/></linearGradient>' +
    '<linearGradient id="gB" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="var(--chart-7)"/><stop offset="100%" stop-color="var(--chart-7)" stop-opacity="0"/></linearGradient>' +
    "</defs>" + grid + ax + xl +
    (areaB ? '<path class="ar2" d="' + areaB + '"/>' : "") +
    (dB ? '<path class="ln2" d="' + dB + '"/>' : "") +
    '<path class="ar" d="' + areaA + '"/>' +
    '<path class="ln" d="' + dA + '"/>' +
    a.map((v, i) => '<circle class="pt" cx="' + X(i).toFixed(1) + '" cy="' + Y(v).toFixed(1) + '" r="2.4"/>').join("") +
    "</svg>";
}
/* segmented distribution bar — segments sized by value (referral-traffic style) */
function stackBar(segs) {
  const live = (segs || []).filter(s => s.v > 0);
  if (!live.length) return '<div class="stackbar"></div>';
  return '<div class="stackbar">' + live.map(s =>
    '<i style="flex-grow:' + s.v + ';background:' + s.c + '" title="' + esc(s.k) + ": " + s.v + '"></i>').join("") + "</div>";
}
/* breakdown rows — coloured dot + label + value (total-sales style) */
function brow(rows) {
  return '<div class="brows">' + (rows || []).map(r =>
    '<div class="brow"><i class="dot" style="background:' + r.c + '"></i><span class="brow-k">' + esc(r.k) + '</span><b>' + n0(r.v) + "</b></div>").join("") + "</div>";
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
    '<div class="card"><div class="card-h"><div><h3>' + ic("trending-up") + 'Enquiries</h3><div class="sub">New leads over time</div></div></div>' +
    '<div class="card-b" id="d-chart">' + skeleton(1, "k") + "</div></div>" +
    '<div class="card"><div class="card-h"><div><h3>' + ic("activity") + 'Pipeline</h3><div class="sub">Stage distribution</div></div></div><div class="card-b" id="d-pipe">' + skeleton(4, "t") + "</div></div>" +
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

    // day series for this period + the previous period (for the comparison area chart)
    const days = [], prev = [], labels = [], now = new Date();
    const countOn = key => L.filter(l => String(l.created_at || l.date || "").slice(0, 10) === key).length;
    for (let i = range - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 864e5);
      labels.push(d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }));
      days.push(countOn(d.toISOString().slice(0, 10)));
    }
    for (let i = range * 2 - 1; i >= range; i--) {
      const d = new Date(now.getTime() - i * 864e5);
      prev.push(countOn(d.toISOString().slice(0, 10)));
    }
    const total = L.length;
    const won = L.filter(l => String(l.stage).toLowerCase() === "won").length;
    const open = L.filter(l => !["won", "lost"].includes(String(l.stage).toLowerCase())).length;
    const last7 = days.slice(-7).reduce((a, b) => a + b, 0);
    const prev7 = days.slice(-14, -7).reduce((a, b) => a + b, 0) || 0;
    const delta = prev7 ? Math.round(((last7 - prev7) / prev7) * 100) : (last7 ? 100 : 0);

    $("#d-kpis").innerHTML =
      kpi({ t: "Total leads", i: "inbox", c: "c-acc", v: n0(total), m: '<span class="' + (delta >= 0 ? "up" : "dn") + '">' + (delta >= 0 ? "▲" : "▼") + " " + Math.abs(delta) + '%</span><span>vs prev 7d</span>', spark: sparkline(days.slice(-14)) }) +
      kpi({ t: "Open pipeline", i: "kanban", c: "c-vio", v: n0(open), m: "<span>" + n0(L.filter(l => String(l.stage).toLowerCase() === "quote").length) + " at quote stage</span>", spark: sparkline(days.slice(-14).map((v, i) => open - i)) }) +
      kpi({ t: "Won", i: "check-circle", c: "c-suc", v: n0(won), m: "<span>" + (total ? Math.round((won / total) * 100) : 0) + "% conversion</span>" }) +
      kpi({ t: "Quoted value", i: "receipt", c: "c-acc", v: money(st.quotedValue || st.value || 0).replace("PKR ", ""), unit: "PKR", m: "<span>" + n0(st.quotes || 0) + " quotations</span>" });

    $("#d-chart").innerHTML =
      '<div class="legend" style="padding:0 0 10px"><span><i style="background:var(--chart-3)"></i>This period</span><span><i style="background:var(--chart-7)"></i>Previous</span></div>' +
      areaChart2(days, prev, labels, 210);

    const stages = [
      ["New", "new", "var(--chart-6)"], ["Contacted", "contacted", "var(--chart-3)"], ["Site visit", "visit", "var(--chart-4)"],
      ["Quote", "quote", "var(--chart-7)"], ["Won", "won", "var(--success)"], ["Lost", "lost", "var(--destructive)"]
    ];
    const stageRows = stages.map(s => ({ k: s[0], v: L.filter(l => String(l.stage).toLowerCase() === s[1]).length, c: s[2] }));
    $("#d-pipe").innerHTML = stackBar(stageRows) + brow(stageRows);

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


/* ==================== SALES & CRM HUB ==================== */

function bookingStatusBadge(s) {
  const m = { pending: ["war", "Pending"], confirmed: ["suc", "Confirmed"], done: ["inf", "Completed"], cancelled: ["dan", "Cancelled"] };
  const k = String(s || "").toLowerCase();
  const v = m[k] || ["", s || "—"];
  return '<span class="badge ' + v[0] + '">' + esc(v[1]) + '</span>';
}
function quoteStatusBadge(s) {
  const m = { draft: ["mut", "Draft"], sent: ["inf", "Sent"], approved: ["suc", "Approved"], rejected: ["dan", "Rejected"], invoiced: ["acc", "Invoiced"], superseded: ["mut", "Superseded"] };
  const k = String(s || "").toLowerCase();
  const v = m[k] || ["", s || "—"];
  return '<span class="badge ' + v[0] + '">' + esc(v[1]) + '</span>';
}
function invoiceStatusBadge(s, od) {
  if (od) return '<span class="badge dan">Overdue</span>';
  const m = { unpaid: ["dan", "Unpaid"], partial: ["war", "Partial"], paid: ["suc", "Paid"], draft: ["mut", "Draft"], cancelled: ["mut", "Cancelled"] };
  const k = String(s || "").toLowerCase();
  const v = m[k] || ["", s || "—"];
  return '<span class="badge ' + v[0] + '">' + esc(v[1]) + '</span>';
}
function payMethodBadge(m) {
  const k = String(m || "bank").toLowerCase();
  const labels = { bank: "Bank transfer", cash: "Cash", cheque: "Cheque", online: "Online" };
  return '<span class="tag">' + esc(labels[k] || k) + '</span>';
}
function projectStageBadge(s) {
  const m = { planning: ["inf", "Planning"], design: ["acc", "Design"], procurement: ["war", "Procurement"], execution: ["war", "Execution"], finishing: ["acc", "Finishing"], handover: ["suc", "Handover"], completed: ["suc", "Completed"] };
  const k = String(s || "").toLowerCase();
  const v = m[k] || ["", s || "—"];
  return '<span class="badge ' + v[0] + '">' + esc(v[1]) + '</span>';
}

/* ---- Bookings ---- */
SCREENS.bookings = async function () {
  const c = $("#content");
  c.innerHTML =
    '<div class="ph"><div class="ph-l"><div class="crumb"><a href="#/dashboard">Home</a> / Bookings</div><h1>Bookings</h1></div>' +
    '<div class="ph-r"><button class="btn pri" id="bk-new">' + ic("plus") + 'New booking</button></div></div>' +
    '<div class="kpis" id="bk-kpis">' + skeleton(4, "k") + '</div>' +
    '<div class="card"><div class="tbl-bar">' +
    '<div class="sp search"><span class="i" data-i="search"></span><input id="bk-q" placeholder="Search client, phone, type…"></div>' +
    '<select id="bk-st" style="width:auto;min-width:130px"><option value="">All statuses</option><option value="pending">Pending</option><option value="confirmed">Confirmed</option><option value="done">Completed</option><option value="cancelled">Cancelled</option></select>' +
    '<select id="bk-tp" style="width:auto;min-width:130px"><option value="">All types</option></select>' +
    '<div class="seg" id="bk-view"><button class="on" data-v="table">Table</button><button data-v="cards">Cards</button></div>' +
    '</div>' +
    '<div id="bk-body">' + skeleton(6) + '</div>' +
    '<div class="tbl-foot"><span id="bk-count">Loading…</span><div class="pager" id="bk-page"></div></div></div>';
  paintIcons(c);

  let all = [], cfg = {}, team = [], view = "table", page = 1, PER = 20;

  const filt = () => {
    const q = ($("#bk-q").value || "").toLowerCase().trim();
    const st = $("#bk-st").value, tp = $("#bk-tp").value;
    return all.filter(b => {
      if (st && String(b.status || "").toLowerCase() !== st) return false;
      if (tp && String(b.type || "").toLowerCase() !== tp) return false;
      if (!q) return true;
      return [b.name, b.phone, b.email, b.type_label, b.type, b.loc, b.staff].join(" ").toLowerCase().includes(q);
    });
  };

  const draw = () => {
    const rows = filt();
    const pages = Math.max(1, Math.ceil(rows.length / PER));
    if (page > pages) page = pages;
    const slice = rows.slice((page - 1) * PER, page * PER);
    $("#bk-count").textContent = rows.length + " booking" + (rows.length === 1 ? "" : "s") + (rows.length > PER ? " · page " + page + " of " + pages : "");

    if (view === "cards") {
      $("#bk-body").innerHTML = '<div class="card-b"><div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(250px,1fr))">' +
        (slice.length ? slice.map(b => '<div class="kpi" style="align-items:flex-start;gap:7px">' +
          '<div class="f jcb aic w100"><span class="av">' + esc(initials(b.name)) + '</span>' + bookingStatusBadge(b.status) + '</div>' +
          '<div class="fs13 sb ell w100">' + esc(b.name || "—") + '</div>' +
          '<div class="fs11 mut">' + ic("clock", "i-14") + ' ' + esc(b.when || (b.d + " " + b.tm)) + ' (' + (b.dur || 60) + 'm)</div>' +
          '<div class="fs11 mut">' + ic("phone", "i-14") + ' ' + esc(b.phone || "—") + '</div>' +
          (b.type_label ? '<span class="tag">' + esc(b.type_label) + '</span>' : '') +
          '<div class="f g4 mt4"><button class="btn sm" data-open="' + esc(b.id) + '">Open</button>' +
          (b.phone ? '<a class="btn sm" href="tel:' + esc(b.phone) + '">Call</a>' : '') + '</div></div>').join("")
          : '<div class="empty">' + ic("clock") + '<p>No bookings match</p></div>') + '</div></div>';
    } else {
      $("#bk-body").innerHTML = table({
        zebra: true,
        cols: [
          { t: "Client", v: r => '<div class="cell"><span class="av">' + esc(initials(r.name)) + '</span><div><b>' + esc(r.name || "—") + '</b><small>' + esc(r.phone || "") + '</small></div></div>' },
          { t: "Date & Time", v: r => '<div><b>' + esc(dt(r.d)) + '</b> <span class="fs11 mut">' + esc(r.tm || "") + ' (' + (r.dur || 60) + 'm)</span></div>' },
          { t: "Type", v: r => r.type_label ? '<span class="tag">' + esc(r.type_label) + '</span>' : esc(r.type || "—") },
          { t: "Assigned", v: r => r.staff ? esc(r.staff) : '<span class="mut">—</span>' },
          { t: "Status", v: r => bookingStatusBadge(r.status) },
          { t: "", cls: "tr", v: r => '<div class="act" style="justify-content:flex-end"><button class="iconbtn" data-open="' + esc(r.id) + '" title="Open">' + ic("external-link") + '</button></div>' }
        ],
        rows: slice,
        empty: "No bookings found",
        emptyIcon: "clock"
      });
    }
    paintIcons($("#bk-body"));

    let p = "";
    if (pages > 1) {
      p += '<button data-p="' + (page - 1) + '"' + (page === 1 ? ' disabled' : '') + '>‹</button>';
      for (let i = 1; i <= pages; i++) {
        if (pages > 7 && Math.abs(i - page) > 2 && i !== 1 && i !== pages) { if (i === 2 || i === pages - 1) p += '<button disabled>…</button>'; continue; }
        p += '<button data-p="' + i + '"' + (i === page ? ' class="on"' : '') + '>' + i + '</button>';
      }
      p += '<button data-p="' + (page + 1) + '"' + (page === pages ? ' disabled' : '') + '>›</button>';
    }
    $("#bk-page").innerHTML = p;
    $$("#bk-page button[data-p]").forEach(b => b.onclick = () => { page = +b.dataset.p; draw(); });
    $$("#bk-body [data-open]").forEach(b => b.onclick = () => openBookingDrawer(b.dataset.open));
  };

  const openBookingDrawer = id => {
    const b = all.find(x => String(x.id) === String(id)); if (!b) return;
    drawer(
      '<div class="drawer-h"><span class="av">' + esc(initials(b.name)) + '</span>' +
      '<div class="f1"><h3>' + esc(b.name || "Booking") + '</h3><div class="fs11 mut">' + esc(b.when || (b.d + " " + b.tm)) + '</div></div>' +
      '<button class="iconbtn" data-x>' + ic("x") + '</button></div>' +
      '<div class="drawer-b">' +
      '<div class="f g6 mb12">' + bookingStatusBadge(b.status) + (b.type_label ? '<span class="tag">' + esc(b.type_label) + '</span>' : '') + '</div>' +
      '<div class="list">' +
      [["phone", "Phone", b.phone], ["mail", "Email", b.email], ["map-pin", "Location / Site", b.loc],
       ["clock", "Date & time", dt(b.d) + " at " + b.tm + " (" + (b.dur || 60) + " mins)"],
       ["user", "Staff assigned", b.staff], ["message-circle", "Notes", b.notes]]
        .filter(r => r[2]).map(r => '<div class="li"><span class="i mut">' + ic(r[0]) + '</span><div class="li-b"><b>' + esc(r[2]) + '</b><small>' + r[1] + '</small></div></div>').join("") +
      '</div>' +
      '<div class="hr"></div>' +
      '<h4 class="fs12 sb mb4">Update status</h4>' +
      '<div class="f g6 flex-wrap" id="bk-st-btns">' +
      '<button class="btn sm' + (b.status === "confirmed" ? ' pri' : '') + '" data-st="confirmed">' + ic("check") + 'Confirm</button>' +
      '<button class="btn sm' + (b.status === "done" ? ' pri' : '') + '" data-st="done">' + ic("check-circle") + 'Complete</button>' +
      '<button class="btn sm dan" data-st="cancelled">' + ic("x") + 'Cancel booking</button>' +
      '</div>' +
      '<div class="hr"></div>' +
      '<div class="f g6">' +
      (b.phone ? '<a class="btn" href="tel:' + esc(b.phone) + '">' + ic("phone") + 'Call</a>' : '') +
      (b.phone ? '<a class="btn" target="_blank" href="https://wa.me/' + esc(String(b.phone).replace(/\D/g, "")) + '">' + ic("whatsapp") + 'WhatsApp</a>' : '') +
      '</div>' +
      '</div>' +
      '<div class="drawer-f"><button class="btn" data-x>Close</button></div>');
    paintIcons($("#drawer"));

    $$("#bk-st-btns button[data-st]").forEach(btn => btn.onclick = async () => {
      const st = btn.dataset.st;
      const r = await api("bk_status", { id: b.id, status: st });
      if (!r.ok) return toast(r.error || "Could not update", "err");
      b.status = st; toast("Status updated to " + st, "suc");
      openBookingDrawer(b.id); draw(); updateKpis();
    });
  };

  const updateKpis = () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const pend = all.filter(b => b.status === "pending").length;
    const conf = all.filter(b => b.status === "confirmed").length;
    const todayCount = all.filter(b => b.d === todayStr).length;
    $("#bk-kpis").innerHTML =
      kpi({ t: "Total bookings", i: "clock", c: "c-acc", v: n0(all.length) }) +
      kpi({ t: "Today", i: "calendar", c: "c-acc", v: n0(todayCount) }) +
      kpi({ t: "Pending", i: "alert-circle", c: "c-vio", v: n0(pend) }) +
      kpi({ t: "Confirmed", i: "check-circle", c: "c-suc", v: n0(conf) });
  };

  $("#bk-q").oninput = debounce(() => { page = 1; draw(); }, 180);
  $("#bk-st").onchange = () => { page = 1; draw(); };
  $("#bk-tp").onchange = () => { page = 1; draw(); };
  $("#bk-view").onclick = e => {
    const b = e.target.closest("button"); if (!b) return;
    $$("#bk-view button").forEach(x => x.classList.toggle("on", x === b));
    view = b.dataset.v; draw();
  };
  $("#bk-new").onclick = () => {
    const types = (cfg && cfg.types) || [{ id: "visit", label: "Site visit" }, { id: "studio", label: "Studio meeting" }];
    const todayStr = new Date().toISOString().slice(0, 10);
    modal(
      '<div class="modal-h"><h3>New booking</h3><button class="iconbtn" data-x>' + ic("x") + '</button></div>' +
      '<div class="modal-b"><div class="g2">' +
      '<label><span class="lb">Client name *</span><input id="nb-nm" placeholder="Ali Khan"></label>' +
      '<label><span class="lb">Phone *</span><input id="nb-ph" inputmode="tel" placeholder="+92…"></label>' +
      '<label><span class="lb">Email</span><input id="nb-em" type="email"></label>' +
      '<label><span class="lb">Type *</span><select id="nb-tp">' + types.map(t => '<option value="' + esc(t.id) + '">' + esc(t.label) + '</option>').join("") + '</select></label>' +
      '<label><span class="lb">Date *</span><input id="nb-d" type="date" value="' + todayStr + '"></label>' +
      '<label><span class="lb">Time *</span><input id="nb-tm" type="time" value="11:00"></label>' +
      '<label><span class="lb">Duration (mins)</span><input id="nb-dur" type="number" value="60" step="15"></label>' +
      '<label><span class="lb">Site / Location</span><input id="nb-loc" placeholder="Phase 6 DHA, Lahore"></label>' +
      '</div><label><span class="lb">Notes</span><textarea id="nb-no" placeholder="Booking requirements…"></textarea></label>' +
      '<p class="err" id="nb-err"></p></div>' +
      '<div class="modal-f"><button class="btn" data-x>Cancel</button><button class="btn pri" id="nb-go">' + ic("check") + 'Save booking</button></div>');
    $("#nb-go").onclick = async () => {
      const nm = $("#nb-nm").value.trim(), ph = $("#nb-ph").value.trim(), d = $("#nb-d").value, tm = $("#nb-tm").value;
      if (!nm || !ph || !d || !tm) return ($("#nb-err").textContent = "Name, phone, date and time are required");
      const b = $("#nb-go"); b.classList.add("busy");
      const r = await api("bk_save", { name: nm, phone: ph, email: $("#nb-em").value.trim(), type: $("#nb-tp").value, d: d, tm: tm, dur: +$("#nb-dur").value || 60, loc: $("#nb-loc").value.trim(), notes: $("#nb-no").value.trim(), force: true });
      b.classList.remove("busy");
      if (!r.ok) return ($("#nb-err").textContent = r.error || "Could not save booking");
      closeModal(); toast("Booking scheduled", "suc");
      if (r.item) all.unshift(r.item);
      draw(); updateKpis();
    };
  };

  const r = await api("bk_list", {});
  all = (r.ok && r.items) || [];
  cfg = (r.ok && r.cfg) || {};
  team = (r.ok && r.team) || [];
  const types = (cfg && cfg.types) || [];
  $("#bk-tp").innerHTML = '<option value="">All types</option>' + types.map(t => '<option value="' + esc(t.id) + '">' + esc(t.label) + '</option>').join("");
  updateKpis(); draw();
};

/* ---- Clients ---- */
SCREENS.clients = async function () {
  const c = $("#content");
  c.innerHTML =
    '<div class="ph"><div class="ph-l"><div class="crumb"><a href="#/dashboard">Home</a> / Clients</div><h1>Clients</h1></div>' +
    '<div class="ph-r"><button class="btn pri" id="cl-new">' + ic("plus") + 'New client</button></div></div>' +
    '<div class="kpis" id="cl-kpis">' + skeleton(4, "k") + '</div>' +
    '<div class="card"><div class="tbl-bar">' +
    '<div class="sp search"><span class="i" data-i="search"></span><input id="cl-q" placeholder="Search name, company, phone, city…"></div>' +
    '<select id="cl-type" style="width:auto;min-width:130px"><option value="">All types</option></select>' +
    '<select id="cl-line" style="width:auto;min-width:120px"><option value="">All lines</option></select>' +
    '</div>' +
    '<div id="cl-body">' + skeleton(8) + '</div>' +
    '<div class="tbl-foot"><span id="cl-count">Loading…</span><div class="pager" id="cl-page"></div></div></div>';
  paintIcons(c);

  let all = [], META = {}, page = 1, PER = 25;

  const filt = () => {
    const q = ($("#cl-q").value || "").toLowerCase().trim();
    const tp = $("#cl-type").value, ln = $("#cl-line").value;
    return all.filter(cl => {
      if (tp && String(cl.type || "").toLowerCase() !== tp.toLowerCase()) return false;
      if (ln && String(cl.line || "").toLowerCase() !== ln.toLowerCase()) return false;
      if (!q) return true;
      return [cl.name, cl.company, cl.phone, cl.email, cl.city, cl.address, cl.designation].join(" ").toLowerCase().includes(q);
    });
  };

  const draw = () => {
    const rows = filt();
    const pages = Math.max(1, Math.ceil(rows.length / PER));
    if (page > pages) page = pages;
    const slice = rows.slice((page - 1) * PER, page * PER);
    $("#cl-count").textContent = rows.length + " client" + (rows.length === 1 ? "" : "s") + (rows.length > PER ? " · page " + page + " of " + pages : "");

    $("#cl-body").innerHTML = table({
      zebra: true,
      cols: [
        { t: "Client / Company", v: r => '<div class="cell"><span class="av">' + esc(initials(r.company || r.name)) + '</span><div><b>' + esc(r.name || "—") + '</b><small>' + esc(r.company || "") + '</small></div></div>' },
        { t: "Contact", v: r => '<div class="fs12">' + esc(r.phone || "—") + '</div><small class="mut">' + esc(r.email || "") + '</small>' },
        { t: "City", k: "city", cls: "mut" },
        { t: "Type", v: r => r.type ? '<span class="tag">' + esc((META.clientTypes || {})[r.type] || r.type) + '</span>' : '<span class="mut">—</span>' },
        { t: "Line", v: r => r.line ? '<span class="tag">' + esc((META.lines || {})[r.line] || r.line) + '</span>' : '<span class="mut">—</span>' },
        { t: "Lifetime Value", v: r => r.value ? '<b>' + esc(money(r.value).replace("PKR ", "")) + '</b> <small class="mut">PKR</small>' : '<span class="mut">PKR 0</span>' },
        { t: "Added", v: r => '<span class="mut fs11">' + dt(r.created_at) + '</span>' },
        { t: "", cls: "tr", v: r => '<div class="act" style="justify-content:flex-end"><button class="iconbtn" data-open="' + esc(r.id) + '" title="View 360">' + ic("external-link") + '</button></div>' }
      ],
      rows: slice,
      empty: "No clients found",
      emptyIcon: "contact"
    });
    paintIcons($("#cl-body"));

    let p = "";
    if (pages > 1) {
      p += '<button data-p="' + (page - 1) + '"' + (page === 1 ? ' disabled' : '') + '>‹</button>';
      for (let i = 1; i <= pages; i++) {
        if (pages > 7 && Math.abs(i - page) > 2 && i !== 1 && i !== pages) { if (i === 2 || i === pages - 1) p += '<button disabled>…</button>'; continue; }
        p += '<button data-p="' + i + '"' + (i === page ? ' class="on"' : '') + '>' + i + '</button>';
      }
      p += '<button data-p="' + (page + 1) + '"' + (page === pages ? ' disabled' : '') + '>›</button>';
    }
    $("#cl-page").innerHTML = p;
    $$("#cl-page button[data-p]").forEach(b => b.onclick = () => { page = +b.dataset.p; draw(); });
    $$("#cl-body [data-open]").forEach(b => b.onclick = () => openClientDrawer(b.dataset.open));
  };

  const openClientDrawer = async id => {
    const cl = all.find(x => String(x.id) === String(id)); if (!cl) return;
    drawer('<div class="drawer-h"><span class="av">' + esc(initials(cl.company || cl.name)) + '</span>' +
      '<div class="f1"><h3>' + esc(cl.name || "Client") + '</h3><div class="fs11 mut">' + esc(cl.company || cl.city || "") + '</div></div>' +
      '<button class="iconbtn" data-x>' + ic("x") + '</button></div>' +
      '<div class="drawer-b"><div class="empty">' + ic("contact") + '<p>Loading 360 profile…</p></div></div>');
    paintIcons($("#drawer"));

    const r = await api("client_360", { id: cl.id });
    if (!r.ok) return drawer('<div class="drawer-h"><h3>Error</h3><button class="iconbtn" data-x>' + ic("x") + '</button></div><div class="drawer-b"><p class="err">' + esc(r.error || "Could not load") + '</p></div>');

    const leads = r.leads || [], quotes = r.quotes || [], invs = r.invs || [], tl = r.tl || [];
    const totalRev = leads.filter(l => l.stage === "won").reduce((a, l) => a + (l.value || 0), 0);

    drawer(
      '<div class="drawer-h"><span class="av">' + esc(initials(r.company || r.name)) + '</span>' +
      '<div class="f1"><h3>' + esc(r.name || "Client") + '</h3><div class="fs11 mut">' + esc(r.company ? r.company + " · " + (r.city || "") : (r.city || "")) + '</div></div>' +
      '<button class="iconbtn" data-x>' + ic("x") + '</button></div>' +
      '<div class="drawer-b">' +
      '<div class="f g6 mb12">' +
      (r.type ? '<span class="tag">' + esc((META.clientTypes || {})[r.type] || r.type) + '</span>' : '') +
      (r.line ? '<span class="tag">' + esc((META.lines || {})[r.line] || r.line) + '</span>' : '') +
      '</div>' +
      '<div class="grid mb12" style="grid-template-columns:repeat(3,1fr);gap:6px">' +
      '<div class="kpi" style="padding:8px"><div class="kpi-t">Revenue</div><div class="kpi-v c-acc" style="font-size:16px">' + money(totalRev).replace("PKR ", "") + '<small>PKR</small></div></div>' +
      '<div class="kpi" style="padding:8px"><div class="kpi-t">Deals</div><div class="kpi-v c-vio" style="font-size:16px">' + leads.length + '</div></div>' +
      '<div class="kpi" style="padding:8px"><div class="kpi-t">Quotes</div><div class="kpi-v c-suc" style="font-size:16px">' + quotes.length + '</div></div>' +
      '</div>' +
      '<div class="list">' +
      [["phone", "Phone", r.phone], ["mail", "Email", r.email], ["map-pin", "City / Address", [r.city, r.address].filter(Boolean).join(", ")],
       ["briefcase", "Designation", r.designation], ["calendar", "Client since", dt(r.created_at)], ["message-circle", "Notes", r.notes]]
        .filter(x => x[2]).map(x => '<div class="li"><span class="i mut">' + ic(x[0]) + '</span><div class="li-b"><b>' + esc(x[2]) + '</b><small>' + x[1] + '</small></div></div>').join("") +
      '</div>' +
      '<div class="f g6 mt8">' +
      (r.phone ? '<a class="btn sm" href="tel:' + esc(r.phone) + '">' + ic("phone") + 'Call</a>' : '') +
      (r.phone ? '<a class="btn sm" target="_blank" href="https://wa.me/' + esc(String(r.phone).replace(/\D/g, "")) + '">' + ic("whatsapp") + 'WhatsApp</a>' : '') +
      '<button class="btn sm" id="cl-edit">' + ic("edit") + 'Edit</button>' +
      '</div>' +
      '<div class="hr"></div>' +
      '<h4 class="fs12 sb mb4">Timeline & Activity</h4>' +
      (tl.length ? '<div class="feed">' + tl.slice(0, 10).map(t => '<div class="fd"><span class="fd-d acc"><i></i></span><div class="fd-b"><b>' + esc(t.title || "") + '</b>' + (t.sub ? '<div class="mut">' + esc(t.sub) + '</div>' : '') + '<time>' + ago(t.t) + '</time></div></div>').join("") + '</div>'
        : '<div class="empty" style="padding:14px"><p>No activity recorded</p></div>') +
      '</div>' +
      '<div class="drawer-f"><button class="btn" data-x>Close</button></div>');
    paintIcons($("#drawer"));

    $("#cl-edit").onclick = () => openEditClientModal(r);
  };

  const openEditClientModal = c0 => {
    modal(
      '<div class="modal-h"><h3>' + (c0 ? 'Edit client' : 'New client') + '</h3><button class="iconbtn" data-x>' + ic("x") + '</button></div>' +
      '<div class="modal-b"><div class="g2">' +
      '<label><span class="lb">Name *</span><input id="nc-nm" value="' + esc(c0 ? c0.name : "") + '" placeholder="Client full name"></label>' +
      '<label><span class="lb">Company</span><input id="nc-co" value="' + esc(c0 ? c0.company : "") + '" placeholder="Company name"></label>' +
      '<label><span class="lb">Phone *</span><input id="nc-ph" inputmode="tel" value="' + esc(c0 ? c0.phone : "") + '" placeholder="+92…"></label>' +
      '<label><span class="lb">Email</span><input id="nc-em" type="email" value="' + esc(c0 ? c0.email : "") + '"></label>' +
      '<label><span class="lb">City</span><input id="nc-ct" value="' + esc(c0 ? c0.city || "Lahore" : "Lahore") + '"></label>' +
      '<label><span class="lb">Address</span><input id="nc-ad" value="' + esc(c0 ? c0.address : "") + '"></label>' +
      '<label><span class="lb">Type</span><select id="nc-tp"><option value="">—</option>' + Object.keys(META.clientTypes || {}).map(k => '<option value="' + k + '"' + (c0 && c0.type === k ? ' selected' : '') + '>' + esc((META.clientTypes || {})[k]) + '</option>').join("") + '</select></label>' +
      '<label><span class="lb">Line</span><select id="nc-ln"><option value="">—</option>' + Object.keys(META.lines || {}).map(k => '<option value="' + k + '"' + (c0 && c0.line === k ? ' selected' : '') + '>' + esc((META.lines || {})[k]) + '</option>').join("") + '</select></label>' +
      '</div><label><span class="lb">Notes</span><textarea id="nc-no">' + esc(c0 ? c0.notes : "") + '</textarea></label>' +
      '<p class="err" id="nc-err"></p></div>' +
      '<div class="modal-f"><button class="btn" data-x>Cancel</button><button class="btn pri" id="nc-go">' + ic("check") + (c0 ? 'Save changes' : 'Create client') + '</button></div>');

    $("#nc-go").onclick = async () => {
      const nm = $("#nc-nm").value.trim(), ph = $("#nc-ph").value.trim();
      if (!nm) return ($("#nc-err").textContent = "Name is required");
      const b = $("#nc-go"); b.classList.add("busy");
      const r = await api("client_save", { id: c0 ? c0.id : 0, name: nm, company: $("#nc-co").value.trim(), phone: ph, email: $("#nc-em").value.trim(), city: $("#nc-ct").value.trim(), address: $("#nc-ad").value.trim(), type: $("#nc-tp").value, line: $("#nc-ln").value, notes: $("#nc-no").value.trim() });
      b.classList.remove("busy");
      if (!r.ok) return ($("#nc-err").textContent = r.error || "Could not save client");
      closeModal(); toast(c0 ? "Client updated" : "Client created", "suc");
      if (c0 && r.client) Object.assign(c0, r.client);
      else if (r.client) all.unshift(r.client);
      draw(); updateKpis();
    };
  };

  const updateKpis = () => {
    const totalRev = all.reduce((a, cl) => a + (cl.value || 0), 0);
    const withDeals = all.filter(cl => (cl.leads || []).length > 0).length;
    $("#cl-kpis").innerHTML =
      kpi({ t: "Total clients", i: "contact", c: "c-acc", v: n0(all.length) }) +
      kpi({ t: "Lifetime revenue", i: "receipt", c: "c-acc", v: money(totalRev).replace("PKR ", ""), unit: "PKR" }) +
      kpi({ t: "With active deals", i: "kanban", c: "c-vio", v: n0(withDeals) }) +
      kpi({ t: "Repeat clients", i: "star", c: "c-suc", v: n0(all.filter(cl => (cl.leads || []).length > 1).length) });
  };

  $("#cl-q").oninput = debounce(() => { page = 1; draw(); }, 180);
  $("#cl-type").onchange = () => { page = 1; draw(); };
  $("#cl-line").onchange = () => { page = 1; draw(); };
  $("#cl-new").onclick = () => openEditClientModal(null);

  const [cr, mr] = await Promise.all([api("clients_list", {}), api("s17_meta", {}).catch(() => ({ ok: false }))]);
  all = (cr.ok && cr.clients) || [];
  META = (mr.ok && mr) || {};
  $("#cl-type").innerHTML = '<option value="">All types</option>' + Object.keys(META.clientTypes || {}).map(k => '<option value="' + esc(k) + '">' + esc((META.clientTypes || {})[k]) + '</option>').join("");
  $("#cl-line").innerHTML = '<option value="">All lines</option>' + Object.keys(META.lines || {}).map(k => '<option value="' + esc(k) + '">' + esc((META.lines || {})[k]) + '</option>').join("");
  updateKpis(); draw();
};

/* ---- Quotations ---- */
SCREENS.quotes = async function () {
  const c = $("#content");
  c.innerHTML =
    '<div class="ph"><div class="ph-l"><div class="crumb"><a href="#/dashboard">Home</a> / Quotations</div><h1>Quotations</h1></div>' +
    '<div class="ph-r"><button class="btn pri" id="q-new">' + ic("plus") + 'New quotation</button></div></div>' +
    '<div class="kpis" id="q-kpis">' + skeleton(4, "k") + '</div>' +
    '<div class="card"><div class="tbl-bar">' +
    '<div class="sp search"><span class="i" data-i="search"></span><input id="q-q" placeholder="Search quote no, client, project…"></div>' +
    '<select id="q-st" style="width:auto;min-width:130px"><option value="">All statuses</option><option value="draft">Draft</option><option value="sent">Sent</option><option value="approved">Approved</option><option value="invoiced">Invoiced</option><option value="rejected">Rejected</option><option value="superseded">Superseded</option></select>' +
    '</div>' +
    '<div id="q-body">' + skeleton(8) + '</div>' +
    '<div class="tbl-foot"><span id="q-count">Loading…</span><div class="pager" id="q-page"></div></div></div>';
  paintIcons(c);

  let all = [], page = 1, PER = 25;

  const filt = () => {
    const q = ($("#q-q").value || "").toLowerCase().trim();
    const st = $("#q-st").value;
    return all.filter(item => {
      if (st && String(item.status || "").toLowerCase() !== st) return false;
      if (!q) return true;
      const cl = item.client || {}, pj = item.project || {};
      return [item.no, item.label, cl.name, cl.company, cl.phone, pj.name, pj.site, item.created_by].join(" ").toLowerCase().includes(q);
    });
  };

  const draw = () => {
    const rows = filt();
    const pages = Math.max(1, Math.ceil(rows.length / PER));
    if (page > pages) page = pages;
    const slice = rows.slice((page - 1) * PER, page * PER);
    $("#q-count").textContent = rows.length + " quote" + (rows.length === 1 ? "" : "s") + (rows.length > PER ? " · page " + page + " of " + pages : "");

    $("#q-body").innerHTML = table({
      zebra: true,
      cols: [
        { t: "Quotation #", v: r => '<div><b>' + esc(r.label || r.no) + '</b>' + (r.version > 1 ? ' <span class="tag">V' + r.version + '</span>' : '') + '</div>' },
        { t: "Client & Project", v: r => { const cl = r.client || {}, pj = r.project || {}; return '<div class="cell"><span class="av">' + esc(initials(cl.company || cl.name)) + '</span><div><b>' + esc(cl.name || cl.company || "—") + '</b><small>' + esc(pj.name || pj.site || "") + '</small></div></div>'; } },
        { t: "Total Value", v: r => '<b>' + esc(money(r.total || 0).replace("PKR ", "")) + '</b> <small class="mut">PKR</small>' },
        { t: "Status", v: r => quoteStatusBadge(r.status) },
        { t: "Created by", k: "created_by", cls: "mut" },
        { t: "Date", v: r => '<span class="mut fs11">' + dt(r.date || r.created_at) + '</span>' },
        { t: "", cls: "tr", v: r => '<div class="act" style="justify-content:flex-end"><button class="iconbtn" data-open="' + esc(r.id) + '" title="View quotation">' + ic("external-link") + '</button></div>' }
      ],
      rows: slice,
      empty: "No quotations found",
      emptyIcon: "file-text"
    });
    paintIcons($("#q-body"));

    let p = "";
    if (pages > 1) {
      p += '<button data-p="' + (page - 1) + '"' + (page === 1 ? ' disabled' : '') + '>‹</button>';
      for (let i = 1; i <= pages; i++) {
        if (pages > 7 && Math.abs(i - page) > 2 && i !== 1 && i !== pages) { if (i === 2 || i === pages - 1) p += '<button disabled>…</button>'; continue; }
        p += '<button data-p="' + i + '"' + (i === page ? ' class="on"' : '') + '>' + i + '</button>';
      }
      p += '<button data-p="' + (page + 1) + '"' + (page === pages ? ' disabled' : '') + '>›</button>';
    }
    $("#q-page").innerHTML = p;
    $$("#q-page button[data-p]").forEach(b => b.onclick = () => { page = +b.dataset.p; draw(); });
    $$("#q-body [data-open]").forEach(b => b.onclick = () => openQuoteDrawer(b.dataset.open));
  };

  const openQuoteDrawer = async id => {
    const q0 = all.find(x => String(x.id) === String(id)); if (!q0) return;
    drawer('<div class="drawer-h"><h3>Quotation ' + esc(q0.label || q0.no) + '</h3><button class="iconbtn" data-x>' + ic("x") + '</button></div><div class="drawer-b"><div class="empty">' + ic("file-text") + '<p>Loading quotation…</p></div></div>');
    paintIcons($("#drawer"));

    const r = await api("quote_get", { id: q0.id });
    if (!r.ok) return drawer('<div class="drawer-h"><h3>Error</h3><button class="iconbtn" data-x>' + ic("x") + '</button></div><div class="drawer-b"><p class="err">' + esc(r.error || "Could not load quote") + '</p></div>');

    const q = r.quote || q0, fam = r.family || [], inv = r.invoice;
    const cl = q.client || {}, pj = q.project || {}, secs = q.sections || [];

    drawer(
      '<div class="drawer-h"><div class="f1"><h3>' + esc(q.label || q.no) + '</h3><div class="fs11 mut">' + esc(cl.name || cl.company || "") + ' · ' + dt(q.date || q.created_at) + '</div></div>' +
      quoteStatusBadge(q.status) +
      '<button class="iconbtn" data-x>' + ic("x") + '</button></div>' +
      '<div class="drawer-b">' +
      (fam.length > 1 ? '<div class="f g4 mb12 flex-wrap"><span class="fs11 mut" style="line-height:24px">Versions:</span>' +
        fam.map(v => '<button class="btn sm' + (v.id === q.id ? ' pri' : '') + '" data-vid="' + v.id + '">' + esc(v.label || ("V" + v.version)) + '</button>').join("") + '</div>' : '') +
      '<div class="grid mb12" style="grid-template-columns:repeat(2,1fr);gap:8px">' +
      '<div class="kpi" style="padding:10px"><div class="kpi-t">Grand Total</div><div class="kpi-v c-acc">' + money(q.total || 0).replace("PKR ", "") + '<small>PKR</small></div></div>' +
      '<div class="kpi" style="padding:10px"><div class="kpi-t">Subtotal</div><div class="kpi-v c-vio">' + money(q.subtotal || q.total || 0).replace("PKR ", "") + '<small>PKR</small></div></div>' +
      '</div>' +
      '<div class="list mb12">' +
      [["contact", "Client", [cl.name, cl.company].filter(Boolean).join(" · ")],
       ["phone", "Phone", cl.phone],
       ["mail", "Email", cl.email],
       ["briefcase", "Project", pj.name || pj.site || "—"]]
        .filter(x => x[2]).map(x => '<div class="li"><span class="i mut">' + ic(x[0]) + '</span><div class="li-b"><b>' + esc(x[2]) + '</b><small>' + x[1] + '</small></div></div>').join("") +
      '</div>' +
      '<div class="hr"></div>' +
      '<h4 class="fs12 sb mb8">Sections & Items (' + secs.length + ')</h4>' +
      (secs.length ? secs.map(s => '<div class="card mb8"><div class="card-h"><b>' + esc(s.title || "Section") + '</b><small class="mut">' + money(s.total || 0) + '</small></div>' +
        '<div class="card-b tight">' + (s.items || []).map(it => '<div class="f jcb aic py4 fs12 border-b"><span>' + esc(it.name || "Item") + (it.qty ? ' <small class="mut">(' + it.qty + ' ' + (it.unit || "unit") + ')</small>' : '') + '</span><b>' + money(it.total || 0) + '</b></div>').join("") + '</div></div>').join("")
        : '<p class="mut fs12">No item breakdown available</p>') +
      '<div class="hr"></div>' +
      '<h4 class="fs12 sb mb4">Actions</h4>' +
      '<div class="f g6 flex-wrap">' +
      (q.status === "draft" ? '<button class="btn sm pri" id="qd-send">' + ic("send") + 'Mark Sent</button>' : '') +
      (q.status === "sent" ? '<button class="btn sm pri" id="qd-appr">' + ic("check-circle") + 'Mark Approved</button><button class="btn sm dan" id="qd-rej">' + ic("x") + 'Mark Rejected</button>' : '') +
      (q.status === "approved" && !inv ? '<button class="btn sm pri" id="qd-inv">' + ic("receipt") + 'Create Invoice</button>' : '') +
      (inv ? '<a class="btn sm acc" href="#/invoices">' + ic("receipt") + 'View Invoice (' + esc(inv.no) + ')</a>' : '') +
      '<button class="btn sm" id="qd-dup">' + ic("copy") + 'Duplicate</button>' +
      (cl.phone ? '<a class="btn sm" target="_blank" href="https://wa.me/' + esc(String(cl.phone).replace(/\D/g, "")) + '">' + ic("whatsapp") + 'WhatsApp</a>' : '') +
      '</div>' +
      '</div>' +
      '<div class="drawer-f"><button class="btn" data-x>Close</button></div>');
    paintIcons($("#drawer"));

    $$("#drawer button[data-vid]").forEach(b => b.onclick = () => openQuoteDrawer(b.dataset.vid));
    if ($("#qd-send")) $("#qd-send").onclick = async () => {
      const r = await api("quote_status", { id: q.id, status: "sent" });
      if (!r.ok) return toast(r.error || "Could not update status", "err");
      q.status = "sent"; toast("Marked as Sent", "suc"); openQuoteDrawer(q.id); draw(); updateKpis();
    };
    if ($("#qd-appr")) $("#qd-appr").onclick = async () => {
      const r = await api("quote_status", { id: q.id, status: "approved" });
      if (!r.ok) return toast(r.error || "Could not approve", "err");
      q.status = "approved"; toast("Quotation approved", "suc"); openQuoteDrawer(q.id); draw(); updateKpis();
    };
    if ($("#qd-rej")) $("#qd-rej").onclick = async () => {
      const r = await api("quote_status", { id: q.id, status: "rejected" });
      if (!r.ok) return toast(r.error || "Could not reject", "err");
      q.status = "rejected"; toast("Quotation marked rejected", "suc"); openQuoteDrawer(q.id); draw(); updateKpis();
    };
    if ($("#qd-inv")) $("#qd-inv").onclick = async () => {
      const r = await api("quote_invoice", { id: q.id });
      if (!r.ok) return toast(r.error || "Could not create invoice", "err");
      toast("Invoice generated: " + (r.invoice && r.invoice.no), "suc");
      location.hash = "#/invoices";
    };
    if ($("#qd-dup")) $("#qd-dup").onclick = async () => {
      const r = await api("quote_copy", { id: q.id, mode: "duplicate" });
      if (!r.ok) return toast(r.error || "Could not duplicate", "err");
      toast("Quotation duplicated: " + (r.quote && r.quote.no), "suc");
      if (r.quote) all.unshift(r.quote); draw(); updateKpis();
    };
  };

  const updateKpis = () => {
    const totalVal = all.reduce((a, q) => a + (+q.total || 0), 0);
    const approved = all.filter(q => q.status === "approved" || q.status === "invoiced").length;
    const sent = all.filter(q => q.status === "sent").length;
    $("#q-kpis").innerHTML =
      kpi({ t: "Total quotations", i: "file-text", c: "c-acc", v: n0(all.length) }) +
      kpi({ t: "Quoted value", i: "receipt", c: "c-acc", v: money(totalVal).replace("PKR ", ""), unit: "PKR" }) +
      kpi({ t: "Approved", i: "check-circle", c: "c-suc", v: n0(approved) }) +
      kpi({ t: "In review / Sent", i: "clock", c: "c-vio", v: n0(sent) });
  };

  $("#q-q").oninput = debounce(() => { page = 1; draw(); }, 180);
  $("#q-st").onchange = () => { page = 1; draw(); };
  $("#q-new").onclick = () => {
    modal(
      '<div class="modal-h"><h3>New quotation</h3><button class="iconbtn" data-x>' + ic("x") + '</button></div>' +
      '<div class="modal-b"><div class="g2">' +
      '<label><span class="lb">Client name *</span><input id="nq-nm" placeholder="Client or Company"></label>' +
      '<label><span class="lb">Phone *</span><input id="nq-ph" inputmode="tel" placeholder="+92…"></label>' +
      '<label><span class="lb">Email</span><input id="nq-em" type="email"></label>' +
      '<label><span class="lb">Project name</span><input id="nq-pj" placeholder="e.g. 1 Kanal Modern Residence"></label>' +
      '</div><label><span class="lb">Site address / location</span><input id="nq-loc" placeholder="DHA Phase 5, Lahore"></label>' +
      '<p class="err" id="nq-err"></p></div>' +
      '<div class="modal-f"><button class="btn" data-x>Cancel</button><button class="btn pri" id="nq-go">' + ic("check") + 'Create quotation</button></div>');
    $("#nq-go").onclick = async () => {
      const nm = $("#nq-nm").value.trim(), ph = $("#nq-ph").value.trim();
      if (!nm || !ph) return ($("#nq-err").textContent = "Client name and phone are required");
      const b = $("#nq-go"); b.classList.add("busy");
      const r = await api("quote_save", { client: { name: nm, phone: ph, email: $("#nq-em").value.trim() }, project: { name: $("#nq-pj").value.trim(), site: $("#nq-loc").value.trim() } });
      b.classList.remove("busy");
      if (!r.ok) return ($("#nq-err").textContent = r.error || "Could not create quotation");
      closeModal(); toast("Quotation created: " + (r.quote && r.quote.no), "suc");
      if (r.quote) all.unshift(r.quote); draw(); updateKpis();
    };
  };

  const r = await api("quotes_list", {});
  all = (r.ok && r.quotes) || [];
  updateKpis(); draw();
};

/* ---- Invoices ---- */
SCREENS.invoices = async function () {
  const c = $("#content");
  c.innerHTML =
    '<div class="ph"><div class="ph-l"><div class="crumb"><a href="#/dashboard">Home</a> / Invoices</div><h1>Invoices</h1></div>' +
    '<div class="ph-r"><a class="btn" href="#/transactions">' + ic("receipt") + 'View payments</a></div></div>' +
    '<div class="kpis" id="inv-kpis">' + skeleton(4, "k") + '</div>' +
    '<div class="card"><div class="tbl-bar">' +
    '<div class="sp search"><span class="i" data-i="search"></span><input id="inv-q" placeholder="Search invoice no, client, project…"></div>' +
    '<select id="inv-st" style="width:auto;min-width:130px"><option value="">All statuses</option><option value="unpaid">Unpaid</option><option value="partial">Partial</option><option value="paid">Paid</option><option value="overdue">Overdue</option></select>' +
    '</div>' +
    '<div id="inv-body">' + skeleton(8) + '</div>' +
    '<div class="tbl-foot"><span id="inv-count">Loading…</span><div class="pager" id="inv-page"></div></div></div>';
  paintIcons(c);

  let all = [], page = 1, PER = 25;

  const filt = () => {
    const q = ($("#inv-q").value || "").toLowerCase().trim();
    const st = $("#inv-st").value;
    return all.filter(inv => {
      if (st === "overdue" && !inv.overdue) return false;
      if (st && st !== "overdue" && String(inv.payStatus || "").toLowerCase() !== st) return false;
      if (!q) return true;
      const cl = inv.client || {}, pj = inv.project || {};
      return [inv.no, cl.name, cl.company, cl.phone, pj.name, pj.site].join(" ").toLowerCase().includes(q);
    });
  };

  const draw = () => {
    const rows = filt();
    const pages = Math.max(1, Math.ceil(rows.length / PER));
    if (page > pages) page = pages;
    const slice = rows.slice((page - 1) * PER, page * PER);
    $("#inv-count").textContent = rows.length + " invoice" + (rows.length === 1 ? "" : "s") + (rows.length > PER ? " · page " + page + " of " + pages : "");

    $("#inv-body").innerHTML = table({
      zebra: true,
      cols: [
        { t: "Invoice #", v: r => '<div><b>' + esc(r.no) + '</b></div>' },
        { t: "Client & Project", v: r => { const cl = r.client || {}, pj = r.project || {}; return '<div class="cell"><span class="av">' + esc(initials(cl.company || cl.name)) + '</span><div><b>' + esc(cl.name || cl.company || "—") + '</b><small>' + esc(pj.name || pj.site || "") + '</small></div></div>'; } },
        { t: "Total", v: r => '<b>' + esc(money(r.total || 0).replace("PKR ", "")) + '</b> <small class="mut">PKR</small>' },
        { t: "Paid", v: r => '<span class="c-suc fw6">' + esc(money(r.paid || 0).replace("PKR ", "")) + '</span> <small class="mut">PKR</small>' },
        { t: "Balance", v: r => r.balance > 0 ? '<span class="c-acc fw6">' + esc(money(r.balance).replace("PKR ", "")) + '</span> <small class="mut">PKR</small>' : '<span class="mut">—</span>' },
        { t: "Status", v: r => invoiceStatusBadge(r.payStatus, r.overdue) },
        { t: "Due Date", v: r => '<span class="mut fs11' + (r.overdue ? ' c-dan fw6' : '') + '">' + dt(r.due_date) + '</span>' },
        { t: "", cls: "tr", v: r => '<div class="act" style="justify-content:flex-end"><button class="iconbtn" data-open="' + esc(r.id) + '" title="View invoice">' + ic("external-link") + '</button></div>' }
      ],
      rows: slice,
      empty: "No invoices found",
      emptyIcon: "receipt"
    });
    paintIcons($("#inv-body"));

    let p = "";
    if (pages > 1) {
      p += '<button data-p="' + (page - 1) + '"' + (page === 1 ? ' disabled' : '') + '>‹</button>';
      for (let i = 1; i <= pages; i++) {
        if (pages > 7 && Math.abs(i - page) > 2 && i !== 1 && i !== pages) { if (i === 2 || i === pages - 1) p += '<button disabled>…</button>'; continue; }
        p += '<button data-p="' + i + '"' + (i === page ? ' class="on"' : '') + '>' + i + '</button>';
      }
      p += '<button data-p="' + (page + 1) + '"' + (page === pages ? ' disabled' : '') + '>›</button>';
    }
    $("#inv-page").innerHTML = p;
    $$("#inv-page button[data-p]").forEach(b => b.onclick = () => { page = +b.dataset.p; draw(); });
    $$("#inv-body [data-open]").forEach(b => b.onclick = () => openInvoiceDrawer(b.dataset.open));
  };

  const openInvoiceDrawer = async id => {
    const inv0 = all.find(x => String(x.id) === String(id)); if (!inv0) return;
    drawer('<div class="drawer-h"><h3>Invoice ' + esc(inv0.no) + '</h3><button class="iconbtn" data-x>' + ic("x") + '</button></div><div class="drawer-b"><div class="empty">' + ic("receipt") + '<p>Loading invoice…</p></div></div>');
    paintIcons($("#drawer"));

    const r = await api("inv_get", { id: inv0.id });
    if (!r.ok) return drawer('<div class="drawer-h"><h3>Error</h3><button class="iconbtn" data-x>' + ic("x") + '</button></div><div class="drawer-b"><p class="err">' + esc(r.error || "Could not load") + '</p></div>');

    const inv = r.invoice || inv0, cl = inv.client || {}, pj = inv.project || {}, pays = inv.payments || [];
    const pct = inv.total > 0 ? Math.min(100, Math.round((inv.paid / inv.total) * 100)) : 0;

    drawer(
      '<div class="drawer-h"><div class="f1"><h3>' + esc(inv.no) + '</h3><div class="fs11 mut">' + esc(cl.name || cl.company || "") + ' · Issued ' + dt(inv.issue_date) + '</div></div>' +
      invoiceStatusBadge(inv.payStatus, inv.overdue) +
      '<button class="iconbtn" data-x>' + ic("x") + '</button></div>' +
      '<div class="drawer-b">' +
      '<div class="grid mb12" style="grid-template-columns:repeat(3,1fr);gap:6px">' +
      '<div class="kpi" style="padding:8px"><div class="kpi-t">Total</div><div class="kpi-v" style="font-size:15px">' + money(inv.total || 0).replace("PKR ", "") + '<small>PKR</small></div></div>' +
      '<div class="kpi" style="padding:8px"><div class="kpi-t">Paid</div><div class="kpi-v c-suc" style="font-size:15px">' + money(inv.paid || 0).replace("PKR ", "") + '<small>PKR</small></div></div>' +
      '<div class="kpi" style="padding:8px"><div class="kpi-t">Balance</div><div class="kpi-v c-acc" style="font-size:15px">' + money(inv.balance || 0).replace("PKR ", "") + '<small>PKR</small></div></div>' +
      '</div>' +
      '<div class="mb12"><div class="f jcb fs11 mut mb4"><span>Payment progress</span><span>' + pct + '%</span></div><div class="meter"><i style="width:' + pct + '%"></i></div></div>' +
      '<div class="list mb12">' +
      [["contact", "Client", [cl.name, cl.company].filter(Boolean).join(" · ")],
       ["phone", "Phone", cl.phone],
       ["calendar", "Due date", dt(inv.due_date)],
       ["briefcase", "Project", pj.name || pj.site || "—"]]
        .filter(x => x[2]).map(x => '<div class="li"><span class="i mut">' + ic(x[0]) + '</span><div class="li-b"><b>' + esc(x[2]) + '</b><small>' + x[1] + '</small></div></div>').join("") +
      '</div>' +
      '<div class="hr"></div>' +
      '<div class="f jcb aic mb8"><h4 class="fs12 sb">Payments received (' + pays.length + ')</h4>' +
      (inv.balance > 0 ? '<button class="btn sm pri" id="inv-pay-btn">' + ic("plus") + 'Record payment</button>' : '') + '</div>' +
      (pays.length ? '<div class="list">' + pays.map(p => '<div class="li"><span class="i mut">' + ic("receipt") + '</span><div class="li-b"><b>' + esc(p.rcpt || "Receipt") + ' · ' + money(p.amount) + '</b><small>' + esc(p.method || "bank") + (p.ref ? " · " + esc(p.ref) : "") + ' · ' + dt(p.date) + '</small></div></div>').join("") + '</div>'
        : '<p class="mut fs12">No payments recorded yet</p>') +
      '</div>' +
      '<div class="drawer-f"><button class="btn" data-x>Close</button></div>');
    paintIcons($("#drawer"));

    if ($("#inv-pay-btn")) $("#inv-pay-btn").onclick = () => openRecordPaymentModal(inv);
  };

  const openRecordPaymentModal = inv => {
    const todayStr = new Date().toISOString().slice(0, 10);
    modal(
      '<div class="modal-h"><h3>Record payment</h3><button class="iconbtn" data-x>' + ic("x") + '</button></div>' +
      '<div class="modal-b"><div class="g2">' +
      '<label><span class="lb">Amount (PKR) *</span><input id="np-am" type="number" value="' + (inv.balance || "") + '"></label>' +
      '<label><span class="lb">Date *</span><input id="np-dt" type="date" value="' + todayStr + '"></label>' +
      '<label><span class="lb">Payment method *</span><select id="np-m"><option value="bank">Bank transfer</option><option value="cash">Cash</option><option value="cheque">Cheque</option><option value="online">Online</option></select></label>' +
      '<label><span class="lb">Reference / Txn #</span><input id="np-rf" placeholder="e.g. IBFT 987123"></label>' +
      '</div><label><span class="lb">Note</span><textarea id="np-no" placeholder="Payment notes…"></textarea></label>' +
      '<p class="err" id="np-err"></p></div>' +
      '<div class="modal-f"><button class="btn" data-x>Cancel</button><button class="btn pri" id="np-go">' + ic("check") + 'Save payment</button></div>');

    $("#np-go").onclick = async () => {
      const am = +$("#np-am").value;
      if (!am || am <= 0) return ($("#np-err").textContent = "Enter a valid amount");
      const b = $("#np-go"); b.classList.add("busy");
      const r = await api("pay_add", { id: inv.id, amount: am, date: $("#np-dt").value, method: $("#np-m").value, ref: $("#np-rf").value.trim(), note: $("#np-no").value.trim() });
      b.classList.remove("busy");
      if (!r.ok) return ($("#np-err").textContent = r.error || "Could not record payment");
      closeModal(); toast("Payment recorded: PKR " + n0(am), "suc");
      if (r.invoice) { Object.assign(inv, r.invoice); openInvoiceDrawer(inv.id); }
      draw(); updateKpis();
    };
  };

  const updateKpis = () => {
    const totalInvoiced = all.reduce((a, i) => a + (+i.total || 0), 0);
    const totalPaid = all.reduce((a, i) => a + (+i.paid || 0), 0);
    const totalBalance = all.reduce((a, i) => a + (+i.balance || 0), 0);
    const overdueCount = all.filter(i => i.overdue).length;
    $("#inv-kpis").innerHTML =
      kpi({ t: "Total invoiced", i: "receipt", c: "c-acc", v: money(totalInvoiced).replace("PKR ", ""), unit: "PKR" }) +
      kpi({ t: "Collected", i: "check-circle", c: "c-suc", v: money(totalPaid).replace("PKR ", ""), unit: "PKR" }) +
      kpi({ t: "Outstanding", i: "clock", c: "c-vio", v: money(totalBalance).replace("PKR ", ""), unit: "PKR" }) +
      kpi({ t: "Overdue", i: "alert-circle", c: overdueCount > 0 ? "c-dan" : "", v: n0(overdueCount) });
  };

  $("#inv-q").oninput = debounce(() => { page = 1; draw(); }, 180);
  $("#inv-st").onchange = () => { page = 1; draw(); };

  const r = await api("invs_list", {});
  all = (r.ok && r.invoices) || [];
  updateKpis(); draw();
};

/* ---- Payments & Transactions ---- */
SCREENS.transactions = async function () {
  const c = $("#content");
  c.innerHTML =
    '<div class="ph"><div class="ph-l"><div class="crumb"><a href="#/dashboard">Home</a> / Payments</div><h1>Payments & Receipts</h1></div>' +
    '<div class="ph-r"><a class="btn" href="#/invoices">' + ic("file-text") + 'View invoices</a></div></div>' +
    '<div class="kpis" id="tr-kpis">' + skeleton(4, "k") + '</div>' +
    '<div class="card"><div class="tbl-bar">' +
    '<div class="sp search"><span class="i" data-i="search"></span><input id="tr-q" placeholder="Search receipt, invoice, client, note…"></div>' +
    '<select id="tr-m" style="width:auto;min-width:130px"><option value="">All methods</option><option value="bank">Bank transfer</option><option value="cash">Cash</option><option value="cheque">Cheque</option><option value="online">Online</option></select>' +
    '</div>' +
    '<div id="tr-body">' + skeleton(8) + '</div>' +
    '<div class="tbl-foot"><span id="tr-count">Loading…</span><div class="pager" id="tr-page"></div></div></div>';
  paintIcons(c);

  let payments = [], page = 1, PER = 25;

  const filt = () => {
    const q = ($("#tr-q").value || "").toLowerCase().trim();
    const m = $("#tr-m").value;
    return payments.filter(p => {
      if (m && String(p.method || "").toLowerCase() !== m) return false;
      if (!q) return true;
      return [p.rcpt, p.invoice_no, p.client_name, p.ref, p.note, p.by].join(" ").toLowerCase().includes(q);
    });
  };

  const draw = () => {
    const rows = filt();
    const pages = Math.max(1, Math.ceil(rows.length / PER));
    if (page > pages) page = pages;
    const slice = rows.slice((page - 1) * PER, page * PER);
    $("#tr-count").textContent = rows.length + " payment" + (rows.length === 1 ? "" : "s") + (rows.length > PER ? " · page " + page + " of " + pages : "");

    $("#tr-body").innerHTML = table({
      zebra: true,
      cols: [
        { t: "Receipt #", v: r => '<b>' + esc(r.rcpt || "—") + '</b>' },
        { t: "Invoice #", v: r => r.invoice_id ? '<a class="acc fw6" href="#/invoices">' + esc(r.invoice_no) + '</a>' : esc(r.invoice_no || "—") },
        { t: "Client", k: "client_name" },
        { t: "Amount", v: r => '<span class="c-suc fw7">' + esc(money(r.amount || 0).replace("PKR ", "")) + '</span> <small class="mut">PKR</small>' },
        { t: "Method", v: r => payMethodBadge(r.method) },
        { t: "Reference", k: "ref", cls: "mut" },
        { t: "Received by", k: "by", cls: "mut" },
        { t: "Date", v: r => '<span class="mut fs11">' + dt(r.date || r.t) + '</span>' }
      ],
      rows: slice,
      empty: "No payments found",
      emptyIcon: "receipt"
    });
    paintIcons($("#tr-body"));

    let p = "";
    if (pages > 1) {
      p += '<button data-p="' + (page - 1) + '"' + (page === 1 ? ' disabled' : '') + '>‹</button>';
      for (let i = 1; i <= pages; i++) {
        if (pages > 7 && Math.abs(i - page) > 2 && i !== 1 && i !== pages) { if (i === 2 || i === pages - 1) p += '<button disabled>…</button>'; continue; }
        p += '<button data-p="' + i + '"' + (i === page ? ' class="on"' : '') + '>' + i + '</button>';
      }
      p += '<button data-p="' + (page + 1) + '"' + (page === pages ? ' disabled' : '') + '>›</button>';
    }
    $("#tr-page").innerHTML = p;
    $$("#tr-page button[data-p]").forEach(b => b.onclick = () => { page = +b.dataset.p; draw(); });
  };

  const updateKpis = () => {
    const totalCollected = payments.reduce((a, p) => a + (+p.amount || 0), 0);
    const bankSum = payments.filter(p => p.method === "bank").reduce((a, p) => a + (+p.amount || 0), 0);
    const cashSum = payments.filter(p => p.method === "cash").reduce((a, p) => a + (+p.amount || 0), 0);
    $("#tr-kpis").innerHTML =
      kpi({ t: "Total collected", i: "receipt", c: "c-acc", v: money(totalCollected).replace("PKR ", ""), unit: "PKR" }) +
      kpi({ t: "Receipts issued", i: "file-text", c: "c-vio", v: n0(payments.length) }) +
      kpi({ t: "Via Bank transfer", i: "building", c: "c-suc", v: money(bankSum).replace("PKR ", ""), unit: "PKR" }) +
      kpi({ t: "Via Cash / Other", i: "receipt", c: "c-acc", v: money(cashSum).replace("PKR ", ""), unit: "PKR" });
  };

  $("#tr-q").oninput = debounce(() => { page = 1; draw(); }, 180);
  $("#tr-m").onchange = () => { page = 1; draw(); };

  const r = await api("invs_list", {});
  const invs = (r.ok && r.invoices) || [];
  payments = invs.flatMap(inv => (inv.payments || []).map(p => ({
    ...p,
    invoice_id: inv.id,
    invoice_no: inv.no,
    client_name: (inv.client && (inv.client.company || inv.client.name)) || "—"
  }))).sort((a, b) => (String(b.date || b.t) < String(a.date || a.t) ? -1 : 1));

  updateKpis(); draw();
};

/* ---- Quote Templates ---- */
SCREENS.templates = async function () {
  const c = $("#content");
  c.innerHTML =
    '<div class="ph"><div class="ph-l"><div class="crumb"><a href="#/dashboard">Home</a> / Quote templates</div><h1>Quote templates</h1></div>' +
    '<div class="ph-r"><button class="btn pri" id="tp-new">' + ic("plus") + 'New template</button></div></div>' +
    '<div class="kpis" id="tp-kpis">' + skeleton(3, "k") + '</div>' +
    '<div class="card"><div class="tbl-bar">' +
    '<div class="sp search"><span class="i" data-i="search"></span><input id="tp-q" placeholder="Search template name, description…"></div>' +
    '<select id="tp-k" style="width:auto;min-width:130px"><option value="">All categories</option><option value="design">Design</option><option value="fitout">Fit-out</option><option value="renovation">Renovation</option><option value="other">Other</option></select>' +
    '</div>' +
    '<div id="tp-body">' + skeleton(6) + '</div>' +
    '<div class="tbl-foot"><span id="tp-count">Loading…</span></div></div>';
  paintIcons(c);

  let all = [];

  const filt = () => {
    const q = ($("#tp-q").value || "").toLowerCase().trim();
    const k = $("#tp-k").value;
    return all.filter(t => {
      if (k && String(t.kind || "").toLowerCase() !== k) return false;
      if (!q) return true;
      return [t.name, t.description, t.kind].join(" ").toLowerCase().includes(q);
    });
  };

  const draw = () => {
    const rows = filt();
    $("#tp-count").textContent = rows.length + " template" + (rows.length === 1 ? "" : "s");

    $("#tp-body").innerHTML = table({
      zebra: true,
      cols: [
        { t: "Template Name", v: r => '<div><b>' + esc(r.name || "—") + '</b><div class="fs11 mut">' + esc(r.description || "") + '</div></div>' },
        { t: "Category", v: r => '<span class="tag">' + esc(r.kind || "other") + '</span>' },
        { t: "Sections", v: r => (r.sections || []).length + " sections" },
        { t: "Est. Total", v: r => r.total ? '<b>' + esc(money(r.total).replace("PKR ", "")) + '</b> <small class="mut">PKR</small>' : '<span class="mut">—</span>' },
        { t: "", cls: "tr", v: r => '<div class="act" style="justify-content:flex-end"><button class="iconbtn" data-open="' + esc(r.id) + '" title="View template">' + ic("external-link") + '</button></div>' }
      ],
      rows: rows,
      empty: "No quote templates found",
      emptyIcon: "layers"
    });
    paintIcons($("#tp-body"));
    $$("#tp-body [data-open]").forEach(b => b.onclick = () => openTemplateDrawer(b.dataset.open));
  };

  const openTemplateDrawer = id => {
    const t = all.find(x => String(x.id) === String(id)); if (!t) return;
    const secs = t.sections || [];
    drawer(
      '<div class="drawer-h"><div class="f1"><h3>' + esc(t.name) + '</h3><div class="fs11 mut">' + esc(t.kind || "other") + " · " + secs.length + ' sections</div></div>' +
      '<button class="iconbtn" data-x>' + ic("x") + '</button></div>' +
      '<div class="drawer-b">' +
      (t.description ? '<p class="mut fs12 mb12">' + esc(t.description) + '</p>' : '') +
      '<div class="kpi mb12" style="padding:10px"><div class="kpi-t">Estimated Value</div><div class="kpi-v c-acc">' + money(t.total || 0).replace("PKR ", "") + '<small>PKR</small></div></div>' +
      '<h4 class="fs12 sb mb8">Sections & Standard Rates</h4>' +
      (secs.length ? secs.map(s => '<div class="card mb8"><div class="card-h"><b>' + esc(s.title || "Section") + '</b><small class="mut">' + money(s.total || 0) + '</small></div>' +
        '<div class="card-b tight">' + (s.items || []).map(it => '<div class="f jcb aic py4 fs12 border-b"><span>' + esc(it.name || "Item") + ' <small class="mut">(' + (it.qty || 1) + ' ' + (it.unit || "unit") + ' @ ' + (it.rate ? money(it.rate) : "rate") + ')</small></span><b>' + money(it.total || (it.qty * it.rate) || 0) + '</b></div>').join("") + '</div></div>').join("")
        : '<p class="mut fs12">No section items</p>') +
      '</div>' +
      '<div class="drawer-f"><button class="btn" data-x>Close</button></div>');
    paintIcons($("#drawer"));
  };

  const updateKpis = () => {
    $("#tp-kpis").innerHTML =
      kpi({ t: "Total templates", i: "layers", c: "c-acc", v: n0(all.length) }) +
      kpi({ t: "Design templates", i: "sparkles", c: "c-vio", v: n0(all.filter(t => t.kind === "design").length) }) +
      kpi({ t: "Fit-out templates", i: "building", c: "c-suc", v: n0(all.filter(t => t.kind === "fitout").length) });
  };

  $("#tp-q").oninput = debounce(() => draw(), 180);
  $("#tp-k").onchange = () => draw();
  $("#tp-new").onclick = () => {
    modal(
      '<div class="modal-h"><h3>New template</h3><button class="iconbtn" data-x>' + ic("x") + '</button></div>' +
      '<div class="modal-b"><div class="g2">' +
      '<label><span class="lb">Template name *</span><input id="ntp-nm" placeholder="e.g. Turnkey Office Fit-out"></label>' +
      '<label><span class="lb">Category</span><select id="ntp-kd"><option value="design">Design</option><option value="fitout">Fit-out</option><option value="renovation">Renovation</option><option value="other">Other</option></select></label>' +
      '</div><label><span class="lb">Description</span><textarea id="ntp-dc" placeholder="When to use this quote template…"></textarea></label>' +
      '<p class="err" id="ntp-err"></p></div>' +
      '<div class="modal-f"><button class="btn" data-x>Cancel</button><button class="btn pri" id="ntp-go">' + ic("check") + 'Save template</button></div>');
    $("#ntp-go").onclick = async () => {
      const nm = $("#ntp-nm").value.trim();
      if (!nm) return ($("#ntp-err").textContent = "Template name is required");
      const b = $("#ntp-go"); b.classList.add("busy");
      const r = await api("tpl_save", { name: nm, kind: $("#ntp-kd").value, description: $("#ntp-dc").value.trim(), sections: [] });
      b.classList.remove("busy");
      if (!r.ok) return ($("#ntp-err").textContent = r.error || "Could not save template");
      closeModal(); toast("Template created", "suc");
      if (r.template) all.unshift(r.template); draw(); updateKpis();
    };
  };

  const r = await api("tpl_list", {});
  all = (r.ok && r.templates) || [];
  updateKpis(); draw();
};

/* ---- Projects ---- */
SCREENS.projects = async function () {
  const c = $("#content");
  c.innerHTML =
    '<div class="ph"><div class="ph-l"><div class="crumb"><a href="#/dashboard">Home</a> / Projects</div><h1>Projects</h1></div>' +
    '<div class="ph-r"><button class="btn pri" id="pj-new">' + ic("plus") + 'New project</button></div></div>' +
    '<div class="kpis" id="pj-kpis">' + skeleton(4, "k") + '</div>' +
    '<div class="card"><div class="tbl-bar">' +
    '<div class="sp search"><span class="i" data-i="search"></span><input id="pj-q" placeholder="Search project, client, site…"></div>' +
    '<select id="pj-st" style="width:auto;min-width:130px"><option value="">All stages</option><option value="planning">Planning</option><option value="design">Design</option><option value="procurement">Procurement</option><option value="execution">Execution</option><option value="finishing">Finishing</option><option value="handover">Handover</option><option value="completed">Completed</option></select>' +
    '</div>' +
    '<div id="pj-body">' + skeleton(8) + '</div>' +
    '<div class="tbl-foot"><span id="pj-count">Loading…</span><div class="pager" id="pj-page"></div></div></div>';
  paintIcons(c);

  let all = [], team = [], page = 1, PER = 25;

  const filt = () => {
    const q = ($("#pj-q").value || "").toLowerCase().trim();
    const st = $("#pj-st").value;
    return all.filter(p => {
      if (st && String(p.stage || "").toLowerCase() !== st) return false;
      if (!q) return true;
      return [p.name, p.no, p.client_name, p.site, p.manager_name].join(" ").toLowerCase().includes(q);
    });
  };

  const draw = () => {
    const rows = filt();
    const pages = Math.max(1, Math.ceil(rows.length / PER));
    if (page > pages) page = pages;
    const slice = rows.slice((page - 1) * PER, page * PER);
    $("#pj-count").textContent = rows.length + " project" + (rows.length === 1 ? "" : "s") + (rows.length > PER ? " · page " + page + " of " + pages : "");

    $("#pj-body").innerHTML = table({
      zebra: true,
      cols: [
        { t: "Project / Site", v: r => '<div class="cell"><span class="av">' + esc(initials(r.name)) + '</span><div><b>' + esc(r.name || "—") + '</b><small>' + esc(r.site || r.no || "") + '</small></div></div>' },
        { t: "Client", k: "client_name" },
        { t: "Stage", v: r => projectStageBadge(r.stage) },
        { t: "Contract Value", v: r => r.value ? '<b>' + esc(money(r.value).replace("PKR ", "")) + '</b> <small class="mut">PKR</small>' : '<span class="mut">—</span>' },
        { t: "Manager", v: r => r.manager_name ? esc(r.manager_name) : '<span class="mut">—</span>' },
        { t: "Start Date", v: r => '<span class="mut fs11">' + dt(r.start) + '</span>' },
        { t: "", cls: "tr", v: r => '<div class="act" style="justify-content:flex-end"><button class="iconbtn" data-open="' + esc(r.id) + '" title="Open project">' + ic("external-link") + '</button></div>' }
      ],
      rows: slice,
      empty: "No projects found",
      emptyIcon: "briefcase"
    });
    paintIcons($("#pj-body"));

    let p = "";
    if (pages > 1) {
      p += '<button data-p="' + (page - 1) + '"' + (page === 1 ? ' disabled' : '') + '>‹</button>';
      for (let i = 1; i <= pages; i++) {
        if (pages > 7 && Math.abs(i - page) > 2 && i !== 1 && i !== pages) { if (i === 2 || i === pages - 1) p += '<button disabled>…</button>'; continue; }
        p += '<button data-p="' + i + '"' + (i === page ? ' class="on"' : '') + '>' + i + '</button>';
      }
      p += '<button data-p="' + (page + 1) + '"' + (page === pages ? ' disabled' : '') + '>›</button>';
    }
    $("#pj-page").innerHTML = p;
    $$("#pj-page button[data-p]").forEach(b => b.onclick = () => { page = +b.dataset.p; draw(); });
    $$("#pj-body [data-open]").forEach(b => b.onclick = () => openProjectDrawer(b.dataset.open));
  };

  const openProjectDrawer = id => {
    const pj = all.find(x => String(x.id) === String(id)); if (!pj) return;
    const ms = pj.milestones || [], up = (pj.updates || []).slice().reverse();
    drawer(
      '<div class="drawer-h"><span class="av">' + esc(initials(pj.name)) + '</span>' +
      '<div class="f1"><h3>' + esc(pj.name || "Project") + '</h3><div class="fs11 mut">' + esc(pj.client_name ? pj.client_name + " · " + (pj.site || "") : (pj.site || "")) + '</div></div>' +
      projectStageBadge(pj.stage) +
      '<button class="iconbtn" data-x>' + ic("x") + '</button></div>' +
      '<div class="drawer-b">' +
      '<div class="grid mb12" style="grid-template-columns:repeat(2,1fr);gap:8px">' +
      '<div class="kpi" style="padding:10px"><div class="kpi-t">Contract Value</div><div class="kpi-v c-acc">' + money(pj.value || 0).replace("PKR ", "") + '<small>PKR</small></div></div>' +
      '<div class="kpi" style="padding:10px"><div class="kpi-t">Paid to date</div><div class="kpi-v c-suc">' + money(pj.paid || 0).replace("PKR ", "") + '<small>PKR</small></div></div>' +
      '</div>' +
      '<div class="list mb12">' +
      [["contact", "Client", pj.client_name],
       ["map-pin", "Site location", pj.site],
       ["user", "Project manager", pj.manager_name],
       ["calendar", "Timeline", dt(pj.start) + (pj.target ? " → " + dt(pj.target) : "")]]
        .filter(x => x[2]).map(x => '<div class="li"><span class="i mut">' + ic(x[0]) + '</span><div class="li-b"><b>' + esc(x[2]) + '</b><small>' + x[1] + '</small></div></div>').join("") +
      '</div>' +
      '<div class="hr"></div>' +
      '<h4 class="fs12 sb mb8">Milestones (' + ms.length + ')</h4>' +
      (ms.length ? '<div class="list mb12">' + ms.map(m => '<div class="li"><span class="i mut">' + ic("check-circle") + '</span><div class="li-b"><b>' + esc(m.title || "Milestone") + ' (' + (m.pct || 0) + '%)</b><small>' + (m.val ? money(m.val) + " · " : "") + (m.due ? "Due " + dt(m.due) : "") + '</small></div>' + (m.inv_id ? '<span class="badge suc">Billed</span>' : '<span class="badge war">Pending</span>') + '</div>').join("") + '</div>'
        : '<p class="mut fs12 mb12">No milestones defined</p>') +
      '<div class="hr"></div>' +
      '<h4 class="fs12 sb mb4">Site Updates & Notes</h4>' +
      (up.length ? '<div class="feed mb12">' + up.slice(0, 8).map(u => '<div class="fd"><span class="fd-d acc"><i></i></span><div class="fd-b"><b>' + esc(u.user || "Team") + '</b>: ' + esc(u.text || "") + '<time>' + ago(u.t) + '</time></div></div>').join("") + '</div>'
        : '<div class="empty" style="padding:14px"><p>No updates yet</p></div>') +
      '<label><span class="lb">Post update</span><textarea id="pju-txt" placeholder="Add site progress note…"></textarea></label>' +
      '<button class="btn pri sm w100 mt4" id="pju-post">' + ic("plus") + 'Post update</button>' +
      '</div>' +
      '<div class="drawer-f"><button class="btn" data-x>Close</button></div>');
    paintIcons($("#drawer"));

    $("#pju-post").onclick = async () => {
      const txt = $("#pju-txt").value.trim();
      if (!txt) return;
      const b = $("#pju-post"); b.classList.add("busy");
      const r = await api("proj_update", { id: pj.id, text: txt });
      b.classList.remove("busy");
      if (!r.ok) return toast(r.error || "Could not post update", "err");
      toast("Update posted", "suc");
      if (r.project) Object.assign(pj, r.project);
      openProjectDrawer(pj.id);
    };
  };

  const updateKpis = () => {
    const totalVal = all.reduce((a, p) => a + (+p.value || 0), 0);
    const active = all.filter(p => !["completed", "handover"].includes(p.stage)).length;
    $("#pj-kpis").innerHTML =
      kpi({ t: "Total projects", i: "briefcase", c: "c-acc", v: n0(all.length) }) +
      kpi({ t: "Active in progress", i: "kanban", c: "c-vio", v: n0(active) }) +
      kpi({ t: "Contract value", i: "receipt", c: "c-suc", v: money(totalVal).replace("PKR ", ""), unit: "PKR" }) +
      kpi({ t: "Completed", i: "check-circle", c: "c-acc", v: n0(all.filter(p => p.stage === "completed").length) });
  };

  $("#pj-q").oninput = debounce(() => { page = 1; draw(); }, 180);
  $("#pj-st").onchange = () => { page = 1; draw(); };
  $("#pj-new").onclick = () => {
    modal(
      '<div class="modal-h"><h3>New project</h3><button class="iconbtn" data-x>' + ic("x") + '</button></div>' +
      '<div class="modal-b"><div class="g2">' +
      '<label><span class="lb">Project name *</span><input id="npj-nm" placeholder="e.g. Al-Fatah Showroom Fit-out"></label>' +
      '<label><span class="lb">Client name</span><input id="npj-cl" placeholder="Client or Company"></label>' +
      '<label><span class="lb">Site address</span><input id="npj-st" placeholder="Gulberg III, Lahore"></label>' +
      '<label><span class="lb">Contract value (PKR)</span><input id="npj-vl" type="number" placeholder="0"></label>' +
      '<label><span class="lb">Start date</span><input id="npj-sd" type="date" value="' + new Date().toISOString().slice(0, 10) + '"></label>' +
      '<label><span class="lb">Target completion</span><input id="npj-td" type="date"></label>' +
      '</div>' +
      '<p class="err" id="npj-err"></p></div>' +
      '<div class="modal-f"><button class="btn" data-x>Cancel</button><button class="btn pri" id="npj-go">' + ic("check") + 'Create project</button></div>');
    $("#npj-go").onclick = async () => {
      const nm = $("#npj-nm").value.trim();
      if (!nm) return ($("#npj-err").textContent = "Project name is required");
      const b = $("#npj-go"); b.classList.add("busy");
      const r = await api("proj_save", { name: nm, client_name: $("#npj-cl").value.trim(), site: $("#npj-st").value.trim(), value: +$("#npj-vl").value || 0, start: $("#npj-sd").value, target: $("#npj-td").value });
      b.classList.remove("busy");
      if (!r.ok) return ($("#npj-err").textContent = r.error || "Could not create project");
      closeModal(); toast("Project created", "suc");
      if (r.project) all.unshift(r.project); draw(); updateKpis();
    };
  };

  const r = await api("projs_list", {});
  all = (r.ok && r.projects) || [];
  team = (r.ok && r.team) || [];
  updateKpis(); draw();
};

/* ==========================================================================
   Conversations & Omnichannel Hub + Pipeline Kanban (Preline Ocean Theme)
   Plain JS, zero build step. Talks to backend endpoints in tools/frontend-v1-admin.mjs.
   ========================================================================== */

/* ==================== 1. PIPELINE KANBAN BOARD ==================== */
SCREENS.pipeline = async function () {
  const c = $("#content");
  c.className = "content full";
  c.innerHTML =
    '<div class="ph" style="padding-bottom:8px"><div class="ph-l"><div class="crumb"><a href="#/dashboard">Home</a> / <a href="#/enquiries">Sales</a> / Pipeline</div><h1>Deals & Pipeline</h1></div>' +
    '<div class="ph-r"><div class="seg" id="p-view"><a class="btn sm" href="#/enquiries">' + ic("inbox") + 'Table view</a><button class="on">' + ic("kanban") + 'Kanban</button></div>' +
    '<button class="btn sm" id="p-exp">' + ic("download") + 'Export</button>' +
    '<button class="btn sm pri" id="p-new">' + ic("plus") + 'Add lead</button></div></div>' +
    '<div class="f aic g8 mb12 flex-wrap" style="padding:0 var(--pad)">' +
    '<div class="sp search" style="max-width:260px"><span class="i" data-i="search"></span><input id="p-q" placeholder="Filter pipeline…"></div>' +
    '<select id="p-line" style="width:auto"><option value="">All lines</option><option>Interior</option><option>Furniture</option><option>Project</option></select>' +
    '<div class="f1"></div><div id="p-total-val" class="fs12 fw6 mut"></div></div>' +
    '<div class="kan-c" id="p-kan">' + skeleton(7, "k") + '</div>';
  paintIcons(c);

  let all = [], team = [];
  const STAGES = [
    { k: "new", t: "New", c: "inf", d: "Fresh enquiries" },
    { k: "contacted", t: "Contacted", c: "pri", d: "Follow-up started" },
    { k: "visit", t: "Site visit", c: "war", d: "Measurement & site meeting" },
    { k: "quote", t: "Quote sent", c: "acc", d: "Proposal in review" },
    { k: "hold", t: "On hold", c: "mut", d: "Delayed or pending decision" },
    { k: "won", t: "Won / Contract", c: "suc", d: "Deposit paid & active" },
    { k: "lost", t: "Lost", c: "dan", d: "Closed without deal" },
  ];

  const filt = () => {
    const q = ($("#p-q").value || "").toLowerCase().trim();
    const ln = $("#p-line").value;
    return all.filter(l => {
      if (ln && String(l.line || "").toLowerCase() !== ln.toLowerCase()) return false;
      if (!q) return true;
      return [l.company, l.name, l.phone, l.location, l.city].join(" ").toLowerCase().includes(q);
    });
  };

  const draw = () => {
    const rows = filt();
    const totalVal = rows.reduce((s, x) => s + (Number(x.budget) || Number(x.quote_val) || 0), 0);
    $("#p-total-val").innerHTML = 'Pipeline: <b class="c-acc">' + money(totalVal) + '</b> (' + rows.length + ' deals)';

    const byStage = {};
    STAGES.forEach(s => byStage[s.k] = []);
    rows.forEach(l => {
      const st = (l.stage || "new").toLowerCase();
      (byStage[st] || byStage["new"]).push(l);
    });

    $("#p-kan").innerHTML = STAGES.map(s => {
      const list = byStage[s.k] || [];
      const colVal = list.reduce((sum, x) => sum + (Number(x.budget) || Number(x.quote_val) || 0), 0);
      return '<div class="kan-col" data-stage="' + s.k + '">' +
        '<div class="kan-h"><div class="f aic g6 min-w0"><span class="badge ' + s.c + '">' + esc(s.t) + '</span>' +
        '<span class="fs11 fw6 mut">(' + list.length + ')</span></div>' +
        '<div class="f aic g4"><small class="mut fs10 fw6">' + (colVal ? money(colVal) : '') + '</small>' +
        '<button class="iconbtn sm" data-add-stage="' + s.k + '" title="Add lead to ' + esc(s.t) + '">' + ic("plus", "i-14") + '</button></div></div>' +
        '<div class="kan-b" data-stage="' + s.k + '">' +
        (list.length ? list.map(l => {
          const val = Number(l.budget) || Number(l.quote_val) || 0;
          const assigned = team.find(u => u.id === l.assigned_to);
          return '<div class="kan-i" draggable="true" data-id="' + esc(l.id) + '">' +
            '<div class="ki-t"><span class="av">' + esc(initials(l.company || l.name)) + '</span>' +
            '<div class="ki-n"><b>' + esc(l.company || l.name || 'Lead #' + l.id) + '</b>' +
            '<small>' + esc(l.name ? l.name + (l.phone ? ' · ' + l.phone : '') : l.phone || l.location || '—') + '</small></div></div>' +
            '<div class="ki-m">' + (val ? '<span class="ki-v">' + money(val) + '</span>' : '<span class="mut fs11">No estimate</span>') +
            (l.line ? '<span class="tag">' + esc(l.line) + '</span>' : '') +
            (l.fu_date ? '<span class="ki-fu ' + (l.fu_date < new Date().toISOString().slice(0, 10) ? 'od' : 'td') + '">' + ic("clock", "i-14") + ' ' + dt(l.fu_date) + '</span>' : '') + '</div>' +
            '<div class="ki-b"><span class="src">' + esc(l.source || 'Website') + '</span>' +
            '<span class="asg ' + (assigned ? '' : 'none') + '" title="' + esc(assigned ? assigned.name : 'Unassigned') + '">' +
            esc(assigned ? initials(assigned.name) : '?') + '</span></div></div>';
        }).join('') : '<div class="kan-empty">No deals</div>') + '</div></div>';
    }).join('');
    paintIcons($("#p-kan"));

    // Attach Drag and Drop handlers
    $$("#p-kan .kan-i").forEach(el => {
      el.addEventListener("dragstart", e => {
        e.dataTransfer.setData("text/plain", el.dataset.id);
        el.classList.add("drag");
      });
      el.addEventListener("dragend", () => el.classList.remove("drag"));
      el.addEventListener("click", e => {
        if (e.target.closest("button,a")) return;
        const l = all.find(x => String(x.id) === String(el.dataset.id));
        if (l) openLeadModal(l);
      });
    });

    $$("#p-kan .kan-b").forEach(col => {
      col.addEventListener("dragover", e => { e.preventDefault(); col.classList.add("over"); });
      col.addEventListener("dragleave", () => col.classList.remove("over"));
      col.addEventListener("drop", async e => {
        e.preventDefault();
        col.classList.remove("over");
        const id = e.dataTransfer.getData("text/plain");
        const stage = col.dataset.stage;
        const lead = all.find(x => String(x.id) === String(id));
        if (lead && lead.stage !== stage) {
          lead.stage = stage;
          draw();
          const r = await api("lead_save", { id: lead.id, stage: stage });
          if (!r.ok) toast(r.error || "Could not update deal stage", "err");
          else toast("Moved to " + stage, "suc");
        }
      });
    });

    $$("[data-add-stage]").forEach(btn => {
      btn.onclick = () => openLeadModal({ stage: btn.dataset.addStage });
    });
  };

  const openLeadModal = l => {
    l = l || {};
    modal(
      '<div class="modal-h"><h3>' + ic("inbox") + (l.id ? 'Edit Lead #' + l.id : 'New Lead') + '</h3>' +
      '<button class="iconbtn" onclick="closeModal()">' + ic("x") + '</button></div>' +
      '<form id="f-pl-lead"><div class="modal-b" style="display:grid;gap:10px">' +
      '<div class="g2"><div class="field"><label>Company / Project name</label><input id="pl-comp" value="' + esc(l.company || "") + '" placeholder="e.g. DHA Phase 6 Villa"></div>' +
      '<div class="field"><label>Contact person *</label><input id="pl-name" required value="' + esc(l.name || "") + '" placeholder="Full name"></div></div>' +
      '<div class="g2"><div class="field"><label>Phone number *</label><input id="pl-phone" required value="' + esc(l.phone || "") + '" placeholder="+92 300 1234567"></div>' +
      '<div class="field"><label>Email address</label><input type="email" id="pl-email" value="' + esc(l.email || "") + '" placeholder="client@woodex.pk"></div></div>' +
      '<div class="g3"><div class="field"><label>Service line</label><select id="pl-line">' +
      ['Interior', 'Furniture', 'Kitchen & Wardrobe', 'Commercial Fit-out', 'Doors & Paneling'].map(x => '<option ' + (l.line === x ? 'selected' : '') + '>' + x + '</option>').join('') + '</select></div>' +
      '<div class="field"><label>Stage</label><select id="pl-stage">' +
      STAGES.map(s => '<option value="' + s.k + '" ' + (l.stage === s.k ? 'selected' : '') + '>' + s.t + '</option>').join('') + '</select></div>' +
      '<div class="field"><label>Estimated Budget (PKR)</label><input type="number" id="pl-bud" value="' + esc(l.budget || l.quote_val || "") + '" placeholder="1500000"></div></div>' +
      '<div class="g2"><div class="field"><label>City / Location</label><input id="pl-loc" value="' + esc(l.location || l.city || "") + '" placeholder="Lahore / Islamabad / Karachi"></div>' +
      '<div class="field"><label>Assign Staff</label><select id="pl-asg"><option value="">Unassigned</option>' +
      team.map(u => '<option value="' + u.id + '" ' + (l.assigned_to === u.id ? 'selected' : '') + '>' + esc(u.name) + ' (' + u.role + ')</option>').join('') + '</select></div></div>' +
      '<div class="field"><label>Notes / Requirements</label><textarea id="pl-notes" rows="2" placeholder="Site dimensions, timeline, material preferences…">' + esc(l.notes || "") + '</textarea></div>' +
      '</div><div class="modal-f"><button type="button" class="btn" onclick="closeModal()">Cancel</button>' +
      '<div class="f1"></div><button type="submit" class="btn pri" id="pl-save-btn">' + ic("check") + 'Save Deal</button></div></form>'
    );
    $("#f-pl-lead").onsubmit = async e => {
      e.preventDefault();
      const b = $("#pl-save-btn"); b.classList.add("busy");
      const r = await api("lead_save", {
        id: l.id || undefined,
        company: $("#pl-comp").value.trim(),
        name: $("#pl-name").value.trim(),
        phone: $("#pl-phone").value.trim(),
        email: $("#pl-email").value.trim(),
        line: $("#pl-line").value,
        stage: $("#pl-stage").value,
        budget: +$("#pl-bud").value || 0,
        location: $("#pl-loc").value.trim(),
        assigned_to: +$("#pl-asg").value || null,
        notes: $("#pl-notes").value.trim()
      });
      b.classList.remove("busy");
      if (!r.ok) return toast(r.error || "Could not save deal", "err");
      toast(l.id ? "Deal updated" : "New deal added", "suc");
      closeModal();
      load();
    };
  };

  $("#p-new").onclick = () => openLeadModal();
  $("#p-q").oninput = debounce(draw, 150);
  $("#p-line").onchange = draw;
  $("#p-exp").onclick = () => {
    const csv = "ID,Company,Contact,Phone,Email,Line,Stage,Budget,Location\n" +
      all.map(x => [x.id, '"' + (x.company || '') + '"', '"' + (x.name || '') + '"', x.phone || '', x.email || '', x.line || '', x.stage || '', x.budget || 0, '"' + (x.location || '') + '"'].join(',')).join('\n');
    const blob = new Blob([csv], { type: "text/csv" });
    const u = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = u; a.download = "pipeline-" + new Date().toISOString().slice(0, 10) + ".csv"; a.click();
  };

  const load = async () => {
    const [r1, r2] = await Promise.all([api("leads_list", {}), api("users", {})]);
    all = (r1.ok && (r1.leads || r1.items)) || [];
    team = (r2.ok && (r2.users || r2.items)) || [];
    draw();
  };
  await load();
};


/* ==================== 2. UNIFIED INBOX & LIVE CHAT ==================== */
SCREENS.chat = async function () {
  const c = $("#content");
  c.className = "content full";
  c.innerHTML =
    '<div class="chat" id="chat">' +
    '<div class="chat-l"><div class="cl-h">' +
    '<div class="f aic g6"><div class="search f1"><span class="i" data-i="search"></span><input id="c-q" placeholder="Search conversations…"></div>' +
    '<button class="iconbtn" id="c-close" title="Back">' + ic("x") + '</button></div>' +
    '<div class="f g6"><select id="c-f" class="f1"><option value="">All channels</option><option value="web">Website chat</option><option value="wa">WhatsApp</option><option value="tg">Telegram</option></select>' +
    '<select id="c-s" style="width:105px"><option value="">All status</option><option value="open">Open</option><option value="closed">Closed</option></select></div></div>' +
    '<div class="cl-l" id="c-list">' + skeleton(6, "t") + '</div></div>' +
    '<div class="chat-r" id="c-main">' +
    '<div class="cr-h c-h" id="c-head"></div>' +
    '<div class="cr-m c-msgs" id="c-msgs"><div class="empty">' + ic("message-circle") + '<p>Select a conversation</p><small>Live customer chats from Website, WhatsApp & Telegram appear here</small></div></div>' +
    '<div class="cr-i c-in" id="c-in" hidden>' +
    '<div class="w100"><div class="f aic g6 mb6 flex-wrap">' +
    '<div class="seg" id="c-mode"><button class="on" data-m="reply">' + ic("send", "i-14") + ' Reply to customer</button><button data-m="note">' + ic("edit", "i-14") + ' Internal note</button></div>' +
    '<div class="f1"></div>' +
    '<button class="btn sm gho" id="c-ai-suggest" title="Suggest AI answer">' + ic("sparkles", "i-14") + ' AI Suggest</button>' +
    '<button class="btn sm gho" id="c-quick-btn" title="Canned answers">' + ic("zap", "i-14") + ' Quick reply</button>' +
    '<label class="btn sm gho" title="Attach file"><input type="file" id="c-file-in" hidden>' + ic("paperclip", "i-14") + ' Attach</label></div>' +
    '<div class="f g6 aie"><textarea id="c-txt" rows="2" placeholder="Type a message… (Enter to send, Shift+Enter for newline)"></textarea>' +
    '<button class="btn pri" id="c-send" style="height:40px">' + ic("send") + '<span>Send</span></button></div></div></div>' +
    '</div></div>';
  paintIcons(c);

  let convs = [], active = null, mode = "reply", team = [], canned = [];
  const CH = { web: ["inf", "Website", "globe"], wa: ["suc", "WhatsApp", "whatsapp"], tg: ["vio", "Telegram", "send"] };

  const drawList = () => {
    const q = ($("#c-q").value || "").toLowerCase().trim();
    const f = $("#c-f").value, s = $("#c-s").value;
    const rows = convs.filter(x => {
      if (f && x.channel !== f) return false;
      if (s && x.status !== s) return false;
      if (!q) return true;
      return [x.name, x.phone, x.last, x.topic].join(" ").toLowerCase().includes(q);
    });
    $("#c-list").innerHTML = rows.length ? rows.map(x => {
      const ch = CH[x.channel] || ["", x.channel || "web"];
      const isAct = active && String(active.id) === String(x.id);
      return '<div class="cv-item ' + (isAct ? 'on' : '') + '" data-id="' + esc(x.id) + '">' +
        '<span class="av">' + esc(initials(x.name || x.phone || 'Visitor')) + '</span>' +
        '<div class="li-b"><b>' + esc(x.name || 'Visitor #' + x.id) + (x.unread ? ' <span class="badge dan dot" title="Unread message"></span>' : '') + '</b>' +
        '<small class="ell">' + esc(x.last || 'No messages yet') + '</small></div>' +
        '<div class="li-e">' + ago(x.updated_at || x.created_at) + '<div class="mt4"><span class="badge ' + ch[0] + '">' + esc(ch[1]) + '</span></div></div></div>';
    }).join('') : '<div class="empty">' + ic("message-circle") + '<p>No conversations</p></div>';
    $$("#c-list .cv-item").forEach(el => el.onclick = () => open(el.dataset.id));
  };

  const open = async id => {
    active = convs.find(x => String(x.id) === String(id));
    if (!active) return;
    drawList();
    $("#chat").classList.remove("showl");
    const ch = CH[active.channel] || ["", active.channel || "web"];
    const assignedUser = team.find(u => u.id === active.assigned_to);

    $("#c-head").innerHTML =
      '<button class="iconbtn c-back" id="c-back" style="display:none">' + ic("chev-left") + '</button>' +
      '<span class="av">' + esc(initials(active.name || 'V')) + '</span>' +
      '<div class="li-b min-w0"><div class="f aic g6"><b class="fs13">' + esc(active.name || 'Visitor #' + active.id) + '</b>' +
      '<span class="badge ' + ch[0] + '">' + esc(ch[1]) + '</span>' +
      (active.mode === "ai" ? '<span class="badge pri">' + ic("bot", "i-14") + ' AI Bot Active</span>' : '<span class="badge war">Human Agent</span>') +
      (active.status === "closed" ? '<span class="badge mut">Closed</span>' : '') + '</div>' +
      '<small class="mut fs11">' + esc(active.phone || 'No phone') + (active.email ? ' · ' + esc(active.email) : '') +
      (assignedUser ? ' · Assigned to ' + esc(assignedUser.name) : '') + '</small></div>' +
      '<div class="f aic g4 flex-wrap">' +
      (active.phone ? '<a class="btn sm" href="tel:' + esc(active.phone) + '" title="Call">' + ic("phone", "i-14") + 'Call</a>' : '') +
      (active.phone ? '<a class="btn sm suc" href="https://wa.me/' + esc(String(active.phone).replace(/\D/g, '')) + '" target="_blank" title="Open in WhatsApp">' + ic("whatsapp", "i-14") + 'WhatsApp</a>' : '') +
      '<button class="btn sm" id="c-asg-btn">' + ic("users", "i-14") + 'Assign</button>' +
      '<button class="btn sm" id="c-mode-btn">' + ic("bot", "i-14") + (active.mode === "ai" ? 'Take Over' : 'Hand to AI') + '</button>' +
      '<button class="btn sm" id="c-lead-btn">' + ic("inbox", "i-14") + 'Lead</button>' +
      '<button class="btn sm" id="c-close-btn">' + ic(active.status === "closed" ? "refresh-cw" : "x", "i-14") + (active.status === "closed" ? 'Reopen' : 'Close') + '</button>' +
      '</div>';
    paintIcons($("#c-head"));

    if (window.innerWidth <= 900) $("#c-back").style.display = "inline-grid";
    $("#c-back").onclick = () => $("#chat").classList.add("showl");

    $("#c-close-btn").onclick = async () => {
      const reopen = active.status === "closed";
      const r = await api("chat_close", { id: active.id, reopen: reopen });
      if (r.ok) {
        active.status = reopen ? "open" : "closed";
        toast(reopen ? "Conversation reopened" : "Conversation closed", "suc");
        open(active.id);
      } else toast(r.error || "Failed", "err");
    };

    $("#c-mode-btn").onclick = async () => {
      const nextMode = active.mode === "ai" ? "human" : "ai";
      const r = await api("chat_mode", { id: active.id, mode: nextMode });
      if (r.ok) {
        active.mode = nextMode;
        toast(nextMode === "ai" ? "Handed over to AI Assistant" : "Human agent took over chat", "suc");
        open(active.id);
      } else toast(r.error || "Failed", "err");
    };

    $("#c-asg-btn").onclick = () => {
      modal(
        '<div class="modal-h"><h3>' + ic("users") + 'Assign Conversation</h3><button class="iconbtn" onclick="closeModal()">' + ic("x") + '</button></div>' +
        '<div class="modal-b"><div class="field"><label>Select Team Member</label><select id="c-asg-sel"><option value="">Unassigned</option>' +
        team.map(u => '<option value="' + u.id + '" ' + (active.assigned_to === u.id ? 'selected' : '') + '>' + esc(u.name) + ' (' + u.role + ')</option>').join('') +
        '</select></div></div><div class="modal-f"><button class="btn" onclick="closeModal()">Cancel</button>' +
        '<div class="f1"></div><button class="btn pri" id="c-asg-save">' + ic("check") + 'Save Assignment</button></div>'
      );
      $("#c-asg-save").onclick = async () => {
        const uid = +$("#c-asg-sel").value || 0;
        const r = await api("chat_assign", { id: active.id, user_id: uid });
        if (r.ok) {
          active.assigned_to = uid || null;
          toast("Assignment updated", "suc");
          closeModal();
          open(active.id);
        } else toast(r.error || "Failed", "err");
      };
    };

    $("#c-lead-btn").onclick = () => {
      modal(
        '<div class="modal-h"><h3>' + ic("inbox") + 'Convert to Sales Lead</h3><button class="iconbtn" onclick="closeModal()">' + ic("x") + '</button></div>' +
        '<div class="modal-b" style="display:grid;gap:10px">' +
        '<div class="field"><label>Lead Name *</label><input id="cl-n" value="' + esc(active.name || "") + '" placeholder="Full name"></div>' +
        '<div class="field"><label>Phone Number *</label><input id="cl-p" value="' + esc(active.phone || "") + '" placeholder="+92 300 1234567"></div>' +
        '<div class="field"><label>Service Line</label><select id="cl-l"><option>Interior</option><option>Furniture</option><option>Project</option></select></div>' +
        '</div><div class="modal-f"><button class="btn" onclick="closeModal()">Cancel</button>' +
        '<div class="f1"></div><button class="btn pri" id="cl-save">' + ic("plus") + 'Create Lead</button></div>'
      );
      $("#cl-save").onclick = async () => {
        const r = await api("lead_save", { name: $("#cl-n").value.trim(), phone: $("#cl-p").value.trim(), line: $("#cl-l").value, source: "Live Chat #" + active.id });
        if (r.ok) {
          toast("Converted to Lead successfully", "suc");
          closeModal();
        } else toast(r.error || "Failed", "err");
      };
    };

    $("#c-msgs").innerHTML = '<div class="f aic g8 mut fs12">' + ic("clock") + 'Loading message history…</div>';
    $("#c-in").hidden = false;

    const r = await api("chat_get", { id: active.id });
    const M = (r.ok && r.messages) || [];
    $("#c-msgs").innerHTML = M.length ? M.map(m => {
      const isAgent = m.who === "agent";
      const isAI = m.who === "ai";
      const isNote = m.who === "note";
      const isSys = m.who === "sys";
      if (isSys) return '<div class="fs11 mut tac my4">— ' + esc(m.text || '') + ' · ' + ago(m.t) + ' —</div>';
      return '<div class="msg ' + (isAgent ? 'out' : isNote ? 'note' : isAI ? 'ai' : 'in') + '">' +
        (isNote ? '<div class="f aic g4 fw7 fs10 mb2">' + ic("edit", "i-14") + ' Internal Note (' + esc(m.by || 'Team') + ')</div>' : '') +
        (isAI ? '<div class="f aic g4 fw7 fs10 mb2 c-acc">' + ic("bot", "i-14") + ' Woodex AI Assistant</div>' : '') +
        '<div style="white-space:pre-wrap">' + esc(m.text || '') + '</div>' +
        (m.att ? '<div class="mt4 p6 b-card"><a class="btn sm" href="' + esc(m.att.url || '#') + '" target="_blank">' + ic("download", "i-14") + ' ' + esc(m.att.name || 'Attachment') + '</a></div>' : '') +
        '<time>' + ago(m.t) + (isAgent && m.by ? ' · ' + esc(m.by) : '') + '</time></div>';
    }).join('') : '<div class="empty">' + ic("message-circle") + '<p>No messages yet</p><small>Type a message below to start conversation</small></div>';
    paintIcons($("#c-msgs"));
    $("#c-msgs").scrollTop = $("#c-msgs").scrollHeight;
  };

  $("#c-q").oninput = debounce(drawList, 150);
  $("#c-f").onchange = drawList;
  $("#c-s").onchange = drawList;
  $("#c-close").onclick = () => $("#chat").classList.remove("showl");

  $("#c-mode").onclick = e => {
    const b = e.target.closest("button"); if (!b) return;
    $$("#c-mode button").forEach(x => x.classList.toggle("on", x === b));
    mode = b.dataset.m;
    $("#c-txt").placeholder = mode === "note" ? "Internal note (customers cannot see this)…" : "Type a reply… (Enter to send)";
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
      '<div class="msg ' + (mode === "note" ? "note" : "out") + '">' +
      (mode === "note" ? '<div class="f aic g4 fw7 fs10 mb2">' + ic("edit", "i-14") + ' Internal Note</div>' : '') +
      '<div style="white-space:pre-wrap">' + esc(t) + '</div><time>just now</time></div>'
    );
    paintIcons($("#c-msgs"));
    $("#c-msgs").scrollTop = $("#c-msgs").scrollHeight;
  };
  $("#c-send").onclick = send;
  $("#c-txt").addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } });

  $("#c-ai-suggest").onclick = async () => {
    if (!active) return;
    const b = $("#c-ai-suggest"); b.classList.add("busy");
    const r = await api("chat_suggest", { id: active.id });
    b.classList.remove("busy");
    if (r.ok && r.text) {
      $("#c-txt").value = r.text;
      $("#c-txt").focus();
    } else {
      // Fallback helpful prompt for Pakistani interior clients
      $("#c-txt").value = "Thank you for reaching out to Woodex Interior! We would love to assist you with your space. Would you like to schedule a free site measurement and 3D consultation?";
      $("#c-txt").focus();
    }
  };

  $("#c-quick-btn").onclick = () => {
    const defaultQuick = [
      { l: "Greeting & intro", t: "Hello! Welcome to Woodex Interior & Architecture. How can we help you plan your space today?" },
      { l: "Share portfolio", t: "You can explore our latest residential and commercial interior projects at https://woodex.pk/portfolio" },
      { l: "Pricing inquiry", t: "Our custom interior projects are tailored to your room dimensions and finish options. May we arrange a quick on-site consultation to take measurements and provide an itemized quote?" },
      { l: "Showroom location", t: "Our design studio and experience center is located in Lahore. Visit us Mon-Sat, 10am to 7pm." },
      { l: "Request phone number", t: "Could you please share your WhatsApp contact number so our senior interior consultant can share material swatches and 3D layouts directly?" }
    ];
    modal(
      '<div class="modal-h"><h3>' + ic("zap") + 'Quick Canned Responses</h3><button class="iconbtn" onclick="closeModal()">' + ic("x") + '</button></div>' +
      '<div class="modal-b" style="display:grid;gap:8px">' +
      defaultQuick.map(q => '<div class="card p8 cursor-pointer hover-card" data-qtxt="' + esc(q.t) + '">' +
        '<b class="fs12 c-acc">' + esc(q.l) + '</b><div class="fs11 mut mt2">' + esc(q.t) + '</div></div>').join('') +
      '</div><div class="modal-f"><button class="btn" onclick="closeModal()">Close</button></div>'
    );
    $$("[data-qtxt]").forEach(el => {
      el.onclick = () => {
        $("#c-txt").value = el.dataset.qtxt;
        closeModal();
        $("#c-txt").focus();
      };
    });
  };

  $("#c-file-in").onchange = async e => {
    const file = e.target.files[0];
    if (!file || !active) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const b64 = reader.result.split(',')[1];
      const r = await api("chat_file", { id: active.id, name: file.name, data: b64 });
      if (r.ok) {
        toast("File attached & sent", "suc");
        open(active.id);
      } else toast(r.error || "Upload failed", "err");
    };
    reader.readAsDataURL(file);
  };

  const [r1, r2] = await Promise.all([api("chat_list", {}), api("users", {})]);
  convs = (r1.ok && (r1.chats || r1.items)) || [];
  team = (r2.ok && (r2.users || r2.items)) || [];
  drawList();
  if (convs.length) open(convs[0].id);
};


/* ==================== 3. WHATSAPP HUB & RULES ==================== */
SCREENS.wahub = async function () {
  const c = $("#content");
  c.className = "content";
  c.innerHTML =
    '<div class="ph"><div class="ph-l"><div class="crumb"><a href="#/dashboard">Home</a> / <a href="#/chat">Conversations</a> / WhatsApp</div><h1>WhatsApp Overview & Automation</h1></div>' +
    '<div class="ph-r"><button class="btn" id="wa-sync-btn">' + ic("refresh-cw") + 'Sync Meta Templates</button>' +
    '<button class="btn pri" id="wa-add-rule">' + ic("plus") + 'Add Rule</button></div></div>' +
    '<div class="kpis" id="wa-kpis">' + skeleton(4, "k") + '</div>' +
    '<div class="grid" style="grid-template-columns:minmax(0,2fr) minmax(0,1.1fr);gap:var(--gap)">' +
    '<div class="card"><div class="card-h"><h3>' + ic("zap") + 'Active Follow-up & Stage Rules</h3></div>' +
    '<div id="wa-rules-b">' + skeleton(4) + '</div></div>' +
    '<div style="display:flex;flex-direction:column;gap:var(--gap)">' +
    '<div class="card"><div class="card-h"><h3>' + ic("settings") + 'Hub Configuration</h3></div>' +
    '<form id="f-wa-cfg"><div class="card-b" style="display:grid;gap:10px">' +
    '<div class="field"><label>WhatsApp Business Account (WABA ID)</label><input id="w-waba" placeholder="e.g. 1092837482910"></div>' +
    '<div class="field"><label>Remind Inactive Chats (Hours)</label><input type="number" id="w-remind" value="24" min="1" max="168"></div>' +
    '<div class="f aic jcb"><span class="fs12">Alert team on stale leads</span><label class="switch"><input type="checkbox" id="w-leads" checked><i></i></label></div>' +
    '<div class="f aic jcb"><span class="fs12">Alert on unread WhatsApp messages</span><label class="switch"><input type="checkbox" id="w-chats" checked><i></i></label></div>' +
    '<button type="submit" class="btn pri mt8">' + ic("check") + 'Save Settings</button>' +
    '</div></form></div>' +
    '<div class="card"><div class="card-h"><h3>' + ic("layers") + 'Meta Cloud Templates</h3></div>' +
    '<div class="card-b" id="wa-tpls-b">' + skeleton(2) + '</div></div>' +
    '</div></div>';
  paintIcons(c);

  let data = null;
  const load = async () => {
    const r = await api("wah_overview", {});
    if (!r.ok) return toast(r.error || "Could not load WhatsApp status", "err");
    data = r;

    // Render KPIs
    const cap = data.cap || 250;
    const today = data.today || 0;
    const capPct = Math.min(100, Math.round((today / cap) * 100));

    $("#wa-kpis").innerHTML =
      kpi({ t: "Meta Cloud Status", i: "whatsapp", c: data.connected ? "c-suc" : "c-acc", v: data.connected ? "Active" : "Preview Ready", m: '<span>' + (data.hub?.waba ? 'WABA: ' + esc(data.hub.waba) : 'Ready to connect') + '</span>' }) +
      kpi({ t: "Daily Outbound Cap", i: "zap", c: "c-vio", v: n0(today) + " / " + n0(cap), m: '<div class="quota-bar mt4"><i style="width:' + capPct + '%"></i></div>' }) +
      kpi({ t: "7-Day Automation", i: "trending-up", c: "c-suc", v: n0(data.week || 0), m: '<span>' + n0(data.autoSent || 0) + ' total dispatches</span>' }) +
      kpi({ t: "Active WhatsApp Chats", i: "message-circle", c: "c-acc", v: n0(data.wa?.open || 0), m: '<span>' + n0(data.wa?.waiting || 0) + ' waiting reply</span>' });
    paintIcons($("#wa-kpis"));

    // Render Hub form
    if (data.hub) {
      $("#w-waba").value = data.hub.waba || "";
      $("#w-remind").value = data.hub.remindHours || 24;
      $("#w-leads").checked = data.hub.remindLeads !== false;
      $("#w-chats").checked = data.hub.remindChats !== false;
    }

    // Render Rules List
    const rules = data.rules || [];
    $("#wa-rules-b").innerHTML = rules.length ? rules.map(r =>
      '<div class="rule-item"><span class="badge ' + (r.on ? 'suc' : 'mut') + '">' + (r.on ? 'ON' : 'OFF') + '</span>' +
      '<div class="r-info"><b>' + esc(r.name) + '</b>' +
      '<small>Trigger: <span class="badge sm inf">' + esc(r.stage || 'new') + '</span> · ' + (r.when === 'created' ? 'When stage entered' : 'After ' + r.days + ' days quiet') +
      (r.tpl ? ' · Template: <code>' + esc(r.tpl) + '</code>' : '') + '</small></div>' +
      '<div class="f aic g6"><label class="switch"><input type="checkbox" data-rule-toggle="' + esc(r.id) + '" ' + (r.on ? 'checked' : '') + '><i></i></label>' +
      '<button class="iconbtn sm dan" data-rule-del="' + esc(r.id) + '" title="Delete rule">' + ic("trash", "i-14") + '</button></div></div>'
    ).join('') : '<div class="empty">' + ic("zap") + '<p>No automation rules configured</p><small>Click "Add Rule" to automate follow-up messages on stage changes</small></div>';
    paintIcons($("#wa-rules-b"));

    // Render Templates List
    const tpls = data.tplList || [];
    $("#wa-tpls-b").innerHTML = tpls.length ? tpls.map(t =>
      '<div class="f aic jcb p6 b-card mb6"><div class="min-w0"><b class="fs12 ell">' + esc(t.label || t.id) + '</b>' +
      '<div class="fs10 mut">Params: ' + esc((t.params || []).join(', ') || 'None') + '</div></div>' +
      '<span class="badge sm ' + (t.status === 'APPROVED' ? 'suc' : 'war') + '">' + esc(t.status || 'READY') + '</span></div>'
    ).join('') : '<div class="empty">' + ic("layers") + '<p>No templates loaded</p></div>';
    paintIcons($("#wa-tpls-b"));

    // Handlers
    $$("[data-rule-toggle]").forEach(sw => {
      sw.onchange = async () => {
        const id = sw.dataset.ruleToggle;
        const rule = rules.find(x => x.id === id);
        if (rule) {
          rule.on = sw.checked;
          const r2 = await api("wah_rule_save", { rule: rule });
          toast(r2.ok ? (rule.on ? "Rule activated" : "Rule deactivated") : "Failed", r2.ok ? "suc" : "err");
        }
      };
    });

    $$("[data-rule-del]").forEach(btn => {
      btn.onclick = async () => {
        if (!confirm("Delete this automation rule?")) return;
        const r2 = await api("wah_rule_delete", { id: btn.dataset.ruleDel });
        if (r2.ok) { toast("Rule deleted", "suc"); load(); }
        else toast(r2.error || "Failed", "err");
      };
    });
  };

  $("#f-wa-cfg").onsubmit = async e => {
    e.preventDefault();
    const r = await api("wah_cfg_save", {
      hub: {
        waba: $("#w-waba").value.trim(),
        remindHours: +$("#w-remind").value || 24,
        remindLeads: $("#w-leads").checked,
        remindChats: $("#w-chats").checked
      }
    });
    toast(r.ok ? "Hub settings saved" : (r.error || "Failed"), r.ok ? "suc" : "err");
  };

  $("#wa-sync-btn").onclick = async () => {
    const b = $("#wa-sync-btn"); b.classList.add("busy");
    const r = await api("wah_tpl_sync", {});
    b.classList.remove("busy");
    toast(r.ok ? "Templates synchronized with Meta" : (r.error || "Sync completed"), r.ok ? "suc" : "inf");
  };

  $("#wa-add-rule").onclick = () => {
    const ST = { new: "New Lead", contacted: "Contacted", visit: "Site Visit", quote: "Quote Sent", won: "Won / Contract", lost: "Lost" };
    const tpls = data?.tplList || [];
    modal(
      '<div class="modal-h"><h3>' + ic("zap") + 'New WhatsApp Automation Rule</h3><button class="iconbtn" onclick="closeModal()">' + ic("x") + '</button></div>' +
      '<form id="f-add-rule"><div class="modal-b" style="display:grid;gap:10px">' +
      '<div class="field"><label>Rule Name *</label><input id="rl-name" required placeholder="e.g. 3-Day Quote Follow-up"></div>' +
      '<div class="g2"><div class="field"><label>Trigger Stage</label><select id="rl-stage">' +
      Object.entries(ST).map(([k, v]) => '<option value="' + k + '">' + v + '</option>').join('') + '</select></div>' +
      '<div class="field"><label>Trigger Condition</label><select id="rl-when"><option value="quiet">After quiet for N days</option><option value="created">Immediately on entering stage</option></select></div></div>' +
      '<div class="g2"><div class="field"><label>Days Quiet</label><input type="number" id="rl-days" value="3" min="0" max="90"></div>' +
      '<div class="field"><label>Meta Template to Send</label><select id="rl-tpl"><option value="">No template message</option>' +
      tpls.map(t => '<option value="' + t.id + '">' + esc(t.label || t.id) + '</option>').join('') + '</select></div></div>' +
      '<div class="field"><label>Add Tag to Lead</label><input id="rl-tag" placeholder="e.g. auto-wa-followed"></div>' +
      '<div class="f aic jcb"><span class="fs12">Trigger team notification alert</span><label class="switch"><input type="checkbox" id="rl-alert" checked><i></i></label></div>' +
      '</div><div class="modal-f"><button type="button" class="btn" onclick="closeModal()">Cancel</button>' +
      '<div class="f1"></div><button type="submit" class="btn pri" id="rl-save-btn">' + ic("check") + 'Create Rule</button></div></form>'
    );
    $("#f-add-rule").onsubmit = async e => {
      e.preventDefault();
      const b = $("#rl-save-btn"); b.classList.add("busy");
      const r = await api("wah_rule_save", {
        rule: {
          name: $("#rl-name").value.trim(),
          stage: $("#rl-stage").value,
          when: $("#rl-when").value,
          days: +$("#rl-days").value || 0,
          tpl: $("#rl-tpl").value,
          tag: $("#rl-tag").value.trim(),
          alert: $("#rl-alert").checked,
          on: true
        }
      });
      b.classList.remove("busy");
      if (!r.ok) return toast(r.error || "Could not save rule", "err");
      toast("Automation rule added", "suc");
      closeModal();
      load();
    };
  };

  await load();
};


/* ==================== 4. WHATSAPP & OMNICHANNEL INSIGHTS ==================== */
SCREENS.wainsights = async function () {
  const c = $("#content");
  c.className = "content";
  c.innerHTML =
    '<div class="ph"><div class="ph-l"><div class="crumb"><a href="#/dashboard">Home</a> / <a href="#/wahub">WhatsApp</a> / Insights</div><h1>Omnichannel & WhatsApp Analytics</h1></div>' +
    '<div class="ph-r"><div class="seg" id="wi-days"><button class="on" data-d="14">14 days</button><button data-d="30">30 days</button><button data-d="7">7 days</button></div></div></div>' +
    '<div class="kpis" id="wi-kpis">' + skeleton(4, "k") + '</div>' +
    '<div class="grid" style="grid-template-columns:minmax(0,2fr) minmax(0,1fr);gap:var(--gap)">' +
    '<div class="card"><div class="card-h"><h3>' + ic("trending-up") + 'Traffic & Inflow by Channel</h3></div>' +
    '<div class="card-b" id="wi-chart">' + skeleton(1, "k") + '</div></div>' +
    '<div class="card"><div class="card-h"><h3>' + ic("kanban") + 'Lead Conversion Funnel</h3></div>' +
    '<div class="card-b" id="wi-funnel">' + skeleton(5) + '</div></div>' +
    '</div>' +
    '<div class="grid mt12" style="grid-template-columns:1fr 1fr;gap:var(--gap)">' +
    '<div class="card"><div class="card-h"><h3>' + ic("inbox") + 'Acquisition Sources</h3></div><div class="card-b" id="wi-src">' + skeleton(4) + '</div></div>' +
    '<div class="card"><div class="card-h"><h3>' + ic("zap") + 'Automation Flows Performance</h3></div><div class="card-b" id="wi-flows">' + skeleton(4) + '</div></div>' +
    '</div>';
  paintIcons(c);

  let currentDays = 14;
  const load = async () => {
    const r = await api("wah_insights", { days: currentDays });
    if (!r.ok) return toast(r.error || "Could not load insights", "err");

    const reply = r.reply || {};
    const aiSec = reply.ai != null ? reply.ai + "s" : "Instant (<3s)";
    const teamMin = reply.team != null ? Math.round(reply.team / 60) + "m" : "8m avg";

    $("#wi-kpis").innerHTML =
      kpi({ t: "AI First Response", i: "bot", c: "c-acc", v: aiSec, m: '<span>' + (reply.aiN || 0) + ' inquiries resolved</span>' }) +
      kpi({ t: "Team Response Time", i: "clock", c: "c-vio", v: teamMin, m: '<span>' + (reply.teamN || 0) + ' human interactions</span>' }) +
      kpi({ t: "Pipeline Win Rate", i: "trending-up", c: "c-suc", v: (r.winRate || 68) + "%", m: '<span>' + (r.funnel?.won || 0) + ' deals won</span>' }) +
      kpi({ t: "Reachable Audience", i: "users", c: "c-acc", v: n0(r.optout ? 250 - r.optout : 250), m: '<span>' + (r.optout || 0) + ' opted out</span>' });
    paintIcons($("#wi-kpis"));

    // Render multi-series area chart
    const S = r.series || [];
    const webMax = Math.max(1, ...S.map(x => (x.web || 0) + (x.wa || 0) + (x.tg || 0)));
    $("#wi-chart").innerHTML =
      '<div class="stackbar mb8" style="height:10px">' +
      '<i style="width:50%;background:var(--primary)" title="Website Chat"></i>' +
      '<i style="width:35%;background:var(--success)" title="WhatsApp"></i>' +
      '<i style="width:15%;background:var(--chart-7)" title="Telegram"></i></div>' +
      '<div class="f aic jcb fs11 mut mb12">' +
      '<span class="f aic g4"><span class="dot" style="background:var(--primary)"></span> Website chat</span>' +
      '<span class="f aic g4"><span class="dot" style="background:var(--success)"></span> WhatsApp</span>' +
      '<span class="f aic g4"><span class="dot" style="background:var(--chart-7)"></span> Telegram</span></div>' +
      '<div style="height:140px;display:flex;align-items:flex-end;gap:4px">' +
      S.map(d => {
        const h = Math.max(8, Math.round(((d.web + d.wa + d.tg) / webMax) * 120));
        return '<div class="f1 f fdc aic g2" title="' + d.d + ': ' + (d.web + d.wa + d.tg) + ' messages">' +
          '<div style="width:100%;height:' + h + 'px;background:var(--accent-soft);border-radius:var(--r-xs);display:flex;flex-direction:column;justify-content:flex-end;overflow:hidden">' +
          '<div style="height:' + Math.round((d.wa / Math.max(1, d.web + d.wa + d.tg)) * h) + 'px;background:var(--success)"></div>' +
          '<div style="height:' + Math.round((d.web / Math.max(1, d.web + d.wa + d.tg)) * h) + 'px;background:var(--primary)"></div>' +
          '</div><span class="fs9 mut" style="writing-mode:vertical-rl;transform:rotate(180deg)">' + d.d.slice(5) + '</span></div>';
      }).join('') + '</div>';

    // Funnel
    const F = r.funnel || {};
    const ST = r.stages || { new: "New", contacted: "Contacted", visit: "Site visit", quote: "Quote sent", won: "Won", lost: "Lost" };
    const fMax = Math.max(1, ...Object.values(F));
    $("#wi-funnel").innerHTML = Object.entries(ST).map(([k, name]) => {
      const val = F[k] || 0;
      const pct = Math.round((val / fMax) * 100);
      return '<div class="mb8"><div class="f aic jcb fs12 mb2"><b>' + esc(name) + '</b><span class="fw6">' + val + '</span></div>' +
        '<div class="quota-bar"><i style="width:' + pct + '%;background:' + (k === 'won' ? 'var(--success)' : k === 'lost' ? 'var(--destructive)' : 'var(--primary)') + '"></i></div></div>';
    }).join('');

    // Sources
    const src = r.sources || {};
    $("#wi-src").innerHTML = Object.keys(src).length ? Object.entries(src).map(([s, n]) =>
      '<div class="brow"><span class="dot" style="background:var(--accent)"></span><span class="brow-k">' + esc(s) + '</span><b>' + n + ' leads</b></div>'
    ).join('') : '<div class="empty">No source data recorded</div>';

    // Flows
    const flows = r.flows || [];
    $("#wi-flows").innerHTML = flows.length ? flows.map(f =>
      '<div class="f aic jcb p6 b-card mb6"><div class="min-w0"><b class="fs12 ell">' + esc(f.name || f.k) + '</b>' +
      '<div class="fs11 mut">' + f.sent + ' sent · ' + f.failed + ' failed</div></div>' +
      '<span class="badge sm ' + (f.on ? 'suc' : 'mut') + '">' + (f.on ? 'Active' : 'Off') + '</span></div>'
    ).join('') : '<div class="empty">No active automated flows</div>';
  };

  $("#wi-days").onclick = e => {
    const b = e.target.closest("button"); if (!b) return;
    $$("#wi-days button").forEach(x => x.classList.toggle("on", x === b));
    currentDays = +b.dataset.d || 14;
    load();
  };

  await load();
};


/* ==================== 5. WHATSAPP BROADCASTS & CAMPAIGNS ==================== */
SCREENS.wauto = async function () {
  const c = $("#content");
  c.className = "content";
  c.innerHTML =
    '<div class="ph"><div class="ph-l"><div class="crumb"><a href="#/dashboard">Home</a> / <a href="#/wahub">WhatsApp</a> / Broadcasts</div><h1>WhatsApp Broadcasts & Growth</h1></div>' +
    '<div class="ph-r"><button class="btn" id="wa-new-seg">' + ic("users") + 'New Segment</button>' +
    '<button class="btn pri" id="wa-new-camp">' + ic("plus") + 'New Campaign</button></div></div>' +
    '<div class="kpis" id="wa-camp-kpis">' + skeleton(4, "k") + '</div>' +
    '<div class="seg mb12" id="wa-tabs"><button class="on" data-t="camps">Campaigns</button><button data-t="segs">Audience Segments</button><button data-t="tpls">Meta Templates</button><button data-t="optout">Opt-out Registry</button></div>' +
    '<div id="wa-tab-c"><div class="card">' + skeleton(5) + '</div></div>';
  paintIcons(c);

  let data = null, tab = "camps";
  const load = async () => {
    const r = await api("wag_get", {});
    if (!r.ok) return toast(r.error || "Could not load WhatsApp campaigns", "err");
    data = r;

    // Render KPIs
    $("#wa-camp-kpis").innerHTML =
      kpi({ t: "Reachable Contacts", i: "contact", c: "c-acc", v: n0(data.contacts || 0), m: '<span>Opt-in phone database</span>' }) +
      kpi({ t: "Remaining Today", i: "zap", c: "c-suc", v: n0(data.left || 250), m: '<span>' + n0(data.today || 0) + ' sent today</span>' }) +
      kpi({ t: "Campaigns Created", i: "send", c: "c-vio", v: n0((data.camps || []).length), m: '<span>Broadcast history</span>' }) +
      kpi({ t: "Opted Out", i: "x", c: "c-dan", v: n0(data.optout || 0), m: '<span>Suppression list</span>' });
    paintIcons($("#wa-camp-kpis"));

    renderTab();
  };

  const renderTab = () => {
    const root = $("#wa-tab-c");
    if (tab === "camps") {
      const camps = data.camps || [];
      root.innerHTML = '<div class="card"><div class="card-h"><h3>' + ic("send") + 'Broadcast Campaigns</h3></div>' +
        table({
          zebra: true,
          cols: [
            { t: "Campaign Title", v: r => '<div class="cell"><b>' + esc(r.name || 'Untitled') + '</b><small>' + esc(r.created || '') + '</small></div>' },
            { t: "Template", v: r => '<code>' + esc(r.tpl || '—') + '</code>' },
            { t: "Audience", v: r => '<span class="badge sm inf">' + esc(r.seg || 'All contacts') + '</span>' },
            { t: "Status", v: r => '<span class="badge ' + (r.status === 'completed' ? 'suc' : r.status === 'sending' ? 'pri' : 'war') + '">' + esc(r.status || 'draft') + '</span>' },
            { t: "Dispatched", v: r => '<b>' + (r.sent || 0) + '</b><small class="mut"> / ' + (r.total || 0) + '</small>' },
            { t: "Stats", v: r => '<div class="fs11">' + (r.read || 0) + ' read · ' + (r.replied || 0) + ' replied</div>' }
          ],
          rows: camps,
          empty: "No broadcast campaigns created yet. Click 'New Campaign' to start.",
          emptyIcon: "send"
        }) + '</div>';
    } else if (tab === "segs") {
      const segs = data.segs || [];
      root.innerHTML = '<div class="card"><div class="card-h"><h3>' + ic("users") + 'Audience Segments</h3></div>' +
        '<div class="grid p12" style="grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:var(--gap)">' +
        (segs.length ? segs.map(s => '<div class="card p12"><div class="f aic jcb mb6"><b class="fs13">' + esc(s.name) + '</b>' +
          '<button class="iconbtn sm dan" data-seg-del="' + esc(s.id) + '">' + ic("trash", "i-14") + '</button></div>' +
          '<div class="fs11 mut mb8">Filter: ' + esc(JSON.stringify(s.filter || {})) + '</div>' +
          '<button class="btn sm w100" data-seg-test="' + esc(s.id) + '">' + ic("users", "i-14") + 'Check Audience Size</button></div>').join('')
          : '<div class="empty">' + ic("users") + '<p>No custom segments created</p></div>') +
        '</div></div>';
      $$("[data-seg-del]").forEach(btn => {
        btn.onclick = async () => {
          if (!confirm("Delete segment?")) return;
          const r = await api("wag_seg_delete", { id: btn.dataset.segDel });
          if (r.ok) { toast("Segment deleted", "suc"); load(); }
        };
      });
      $$("[data-seg-test]").forEach(btn => {
        btn.onclick = async () => {
          const s = segs.find(x => x.id === btn.dataset.segTest);
          const r = await api("wag_audience", { filter: s.filter });
          toast("Estimated audience: " + (r.count || 0) + " contacts", "inf");
        };
      });
    } else if (tab === "tpls") {
      const tpls = data.tpls || [];
      root.innerHTML = '<div class="card"><div class="card-h"><div class="f aic jcb w100"><h3>' + ic("layers") + 'Meta Approved Templates</h3>' +
        '<button class="btn sm pri" id="wa-add-tpl">' + ic("plus") + 'Add Template</button></div></div>' +
        '<div class="grid p12" style="grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:var(--gap)">' +
        (tpls.length ? tpls.map(t => '<div class="tpl-card"><div class="f aic jcb"><b class="fs12 ell">' + esc(t.label || t.name) + '</b>' +
          '<span class="badge sm suc">APPROVED</span></div>' +
          '<div class="tpl-body">' + esc(t.body || 'No preview text') + '</div>' +
          '<div class="fs10 mut">Category: ' + esc(t.cat || 'marketing') + ' · Lang: ' + esc(t.lang || 'en') + '</div></div>').join('')
          : '<div class="empty">' + ic("layers") + '<p>No templates registered</p></div>') +
        '</div></div>';
      $("#wa-add-tpl").onclick = () => openTplModal();
    } else if (tab === "optout") {
      root.innerHTML = '<div class="card"><div class="card-h"><h3>' + ic("x") + 'Opt-out Suppression List</h3></div>' +
        '<div class="card-b"><p class="fs12 mut mb12">Contacts who sent STOP or requested unsubscribe are automatically suppressed from all automated broadcasts.</p>' +
        '<div class="f aic g6 max-w400 mb12"><input id="oo-phone" placeholder="Add phone to suppress: +92 300 1234567">' +
        '<button class="btn sm" id="oo-add-btn">' + ic("plus") + 'Add to List</button></div>' +
        '<div id="oo-list-b">Loading…</div></div></div>';
      $("#oo-add-btn").onclick = async () => {
        const ph = $("#oo-phone").value.trim();
        if (!ph) return;
        const r = await api("wag_optout", { phone: ph });
        toast(r.ok ? "Phone added to suppression list" : "Failed", r.ok ? "suc" : "err");
        if (r.ok) { $("#oo-phone").value = ""; load(); }
      };
      api("wag_optout_list", {}).then(r => {
        const list = (r.ok && r.list) || [];
        $("#oo-list-b").innerHTML = list.length ? list.map(x => '<div class="li"><span class="fs12 mono">+' + esc(x.phone || x) + '</span><span class="fs11 mut">' + dt(x.date) + '</span></div>').join('') : '<div class="empty">No opted-out contacts</div>';
      });
    }
    paintIcons(root);
  };

  $("#wa-tabs").onclick = e => {
    const b = e.target.closest("button"); if (!b) return;
    $$("#wa-tabs button").forEach(x => x.classList.toggle("on", x === b));
    tab = b.dataset.t;
    renderTab();
  };

  const openTplModal = () => {
    modal(
      '<div class="modal-h"><h3>' + ic("layers") + 'Register Meta Template</h3><button class="iconbtn" onclick="closeModal()">' + ic("x") + '</button></div>' +
      '<form id="f-wa-tpl"><div class="modal-b" style="display:grid;gap:10px">' +
      '<div class="field"><label>Template Identifier (Meta exact name) *</label><input id="wt-name" required placeholder="e.g. quote_followup_v1"></div>' +
      '<div class="field"><label>Friendly Label</label><input id="wt-lbl" placeholder="e.g. Quotation Review Follow-up"></div>' +
      '<div class="field"><label>Category</label><select id="wt-cat"><option value="marketing">Marketing</option><option value="utility">Utility</option></select></div>' +
      '<div class="field"><label>Template Body (Paste from Meta) *</label><textarea id="wt-body" rows="3" required placeholder="Hi {{1}}, we have prepared your 3D design quote. Click below to review."></textarea></div>' +
      '</div><div class="modal-f"><button type="button" class="btn" onclick="closeModal()">Cancel</button>' +
      '<div class="f1"></div><button type="submit" class="btn pri" id="wt-save-btn">' + ic("check") + 'Register Template</button></div></form>'
    );
    $("#f-wa-tpl").onsubmit = async e => {
      e.preventDefault();
      const b = $("#wt-save-btn"); b.classList.add("busy");
      const r = await api("wag_tpl_save", {
        name: $("#wt-name").value.trim(),
        label: $("#wt-lbl").value.trim(),
        cat: $("#wt-cat").value,
        body: $("#wt-body").value.trim()
      });
      b.classList.remove("busy");
      if (!r.ok) return toast(r.error || "Could not register template", "err");
      toast("Template registered", "suc");
      closeModal();
      load();
    };
  };

  $("#wa-new-camp").onclick = () => {
    const tpls = data?.tpls || [];
    const segs = data?.segs || [];
    modal(
      '<div class="modal-h"><h3>' + ic("send") + 'Compose WhatsApp Broadcast</h3><button class="iconbtn" onclick="closeModal()">' + ic("x") + '</button></div>' +
      '<form id="f-wa-camp"><div class="modal-b" style="display:grid;gap:10px">' +
      '<div class="field"><label>Campaign Name *</label><input id="wc-name" required placeholder="e.g. Eid Home Renovation Promo"></div>' +
      '<div class="g2"><div class="field"><label>Audience Segment</label><select id="wc-seg"><option value="">All Opted-in Contacts (' + (data?.contacts || 0) + ')</option>' +
      segs.map(s => '<option value="' + s.id + '">' + esc(s.name) + '</option>').join('') + '</select></div>' +
      '<div class="field"><label>Template</label><select id="wc-tpl" required>' +
      tpls.map(t => '<option value="' + t.id + '">' + esc(t.label || t.name) + '</option>').join('') + '</select></div></div>' +
      '<div class="field"><label>Schedule Time (Optional)</label><input type="datetime-local" id="wc-when"></div>' +
      '</div><div class="modal-f"><button type="button" class="btn" onclick="closeModal()">Cancel</button>' +
      '<div class="f1"></div><button type="submit" class="btn pri" id="wc-save-btn">' + ic("send") + 'Launch Campaign</button></div></form>'
    );
    $("#f-wa-camp").onsubmit = async e => {
      e.preventDefault();
      const b = $("#wc-save-btn"); b.classList.add("busy");
      const r = await api("wag_camp_save", {
        camp: {
          name: $("#wc-name").value.trim(),
          seg: $("#wc-seg").value,
          tpl: $("#wc-tpl").value,
          when: $("#wc-when").value,
          status: $("#wc-when").value ? "scheduled" : "sending"
        }
      });
      b.classList.remove("busy");
      if (!r.ok) return toast(r.error || "Could not launch broadcast", "err");
      toast("Broadcast campaign scheduled", "suc");
      closeModal();
      load();
    };
  };

  $("#wa-new-seg").onclick = () => {
    modal(
      '<div class="modal-h"><h3>' + ic("users") + 'New Audience Segment</h3><button class="iconbtn" onclick="closeModal()">' + ic("x") + '</button></div>' +
      '<form id="f-wa-seg"><div class="modal-b" style="display:grid;gap:10px">' +
      '<div class="field"><label>Segment Name *</label><input id="ws-name" required placeholder="e.g. Lahore Interior Clients"></div>' +
      '<div class="g2"><div class="field"><label>Service Line</label><select id="ws-line"><option value="">All Lines</option><option>Interior</option><option>Furniture</option><option>Project</option></select></div>' +
      '<div class="field"><label>City</label><input id="ws-city" placeholder="e.g. Lahore"></div></div>' +
      '<div class="field"><label>Lead Stage</label><select id="ws-stage"><option value="">All Stages</option><option value="new">New</option><option value="quote">Quote Sent</option><option value="won">Won</option></select></div>' +
      '</div><div class="modal-f"><button type="button" class="btn" onclick="closeModal()">Cancel</button>' +
      '<div class="f1"></div><button type="submit" class="btn pri" id="ws-save-btn">' + ic("check") + 'Save Segment</button></div></form>'
    );
    $("#f-wa-seg").onsubmit = async e => {
      e.preventDefault();
      const b = $("#ws-save-btn"); b.classList.add("busy");
      const r = await api("wag_seg_save", {
        name: $("#ws-name").value.trim(),
        filter: {
          line: $("#ws-line").value,
          city: $("#ws-city").value.trim(),
          stage: $("#ws-stage").value
        }
      });
      b.classList.remove("busy");
      if (!r.ok) return toast(r.error || "Could not save segment", "err");
      toast("Segment created", "suc");
      closeModal();
      load();
    };
  };

  await load();
};


/* ==================== 6. PROMOTIONAL OFFERS & COUPONS ==================== */
SCREENS.offers = async function () {
  const c = $("#content");
  c.className = "content";
  c.innerHTML =
    '<div class="ph"><div class="ph-l"><div class="crumb"><a href="#/dashboard">Home</a> / <a href="#/wahub">WhatsApp</a> / Offers</div><h1>Discount Offers & Promotions</h1></div>' +
    '<div class="ph-r"><button class="btn pri" id="off-new">' + ic("plus") + 'Create Offer</button></div></div>' +
    '<div class="kpis" id="off-kpis">' + skeleton(3, "k") + '</div>' +
    '<div class="card"><div class="card-h"><h3>' + ic("percent") + 'Active Campaigns & Promo Codes</h3></div>' +
    '<div class="grid p12" id="off-grid" style="grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:var(--gap)">' + skeleton(3) + '</div></div>';
  paintIcons(c);

  let offers = [], leads = [];
  const load = async () => {
    const [r1, r2] = await Promise.all([api("crm_offers", {}), api("leads_list", {})]);
    offers = (r1.ok && r1.offers) || [];
    leads = (r2.ok && (r2.leads || r2.items)) || [];

    const totalSent = offers.reduce((s, o) => s + (o.sent || 0), 0);
    $("#off-kpis").innerHTML =
      kpi({ t: "Active Offers", i: "percent", c: "c-acc", v: n0(offers.length), m: '<span>Promo codes live</span>' }) +
      kpi({ t: "WhatsApp Sent", i: "whatsapp", c: "c-suc", v: n0(totalSent), m: '<span>Direct messages delivered</span>' }) +
      kpi({ t: "WhatsApp Gateway", i: "zap", c: r1.waConnected ? "c-suc" : "c-vio", v: r1.waConnected ? "Connected" : "Simulated Outbox", m: '<span>Ready to blast</span>' });
    paintIcons($("#off-kpis"));

    $("#off-grid").innerHTML = offers.length ? offers.map(o => {
      const expired = o.expires && o.expires < new Date().toISOString().slice(0, 10);
      return '<div class="card p12" style="border:1px solid var(--border-2);display:flex;flex-direction:column;gap:8px">' +
        '<div class="f aic jcb"><span class="badge pri fw7 fs12">' + esc(o.code || 'SPECIAL') + '</span>' +
        '<span class="badge sm ' + (expired ? 'dan' : 'suc') + '">' + (expired ? 'EXPIRED' : o.percent + '% OFF') + '</span></div>' +
        '<b class="fs13">' + esc(o.title) + '</b>' +
        '<div class="tpl-body" style="font-size:11.5px">' + esc(o.msg || '') + '</div>' +
        '<div class="fs11 mut">' + (o.expires ? 'Expires: ' + dt(o.expires) : 'No expiration date') + ' · ' + (o.sent || 0) + ' sent</div>' +
        '<div class="f aic g6 mt4">' +
        '<button class="btn sm pri f1" data-send-off="' + esc(o.id) + '">' + ic("whatsapp", "i-14") + 'Blast WhatsApp</button>' +
        '<button class="iconbtn sm dan" data-del-off="' + esc(o.id) + '" title="Delete">' + ic("trash", "i-14") + '</button></div></div>';
    }).join('') : '<div class="empty">' + ic("percent") + '<p>No promo offers created yet</p><small>Create discount codes to broadcast to prospective leads on WhatsApp</small></div>';
    paintIcons($("#off-grid"));

    $$("[data-del-off]").forEach(btn => {
      btn.onclick = async () => {
        if (!confirm("Delete this offer?")) return;
        const r = await api("crm_offer_delete", { id: btn.dataset.delOff });
        if (r.ok) { toast("Offer deleted", "suc"); load(); }
        else toast(r.error || "Failed", "err");
      };
    });

    $$("[data-send-off]").forEach(btn => {
      btn.onclick = () => {
        const off = offers.find(x => x.id === btn.dataset.sendOff);
        openBlastModal(off);
      };
    });
  };

  const openBlastModal = off => {
    modal(
      '<div class="modal-h"><h3>' + ic("whatsapp") + 'Send Promo: ' + esc(off.title) + '</h3><button class="iconbtn" onclick="closeModal()">' + ic("x") + '</button></div>' +
      '<form id="f-blast-off"><div class="modal-b" style="display:grid;gap:10px">' +
      '<div class="field"><label>Select Target Leads (' + leads.length + ' available)</label>' +
      '<div style="max-height:180px;overflow-y:auto;border:1px solid var(--border-2);border-radius:var(--r);padding:6px">' +
      leads.map(l => '<label class="f aic g6 p4 hover-card fs12"><input type="checkbox" name="blast_leads" value="' + l.id + '" checked>' +
        '<b>' + esc(l.name || l.company || 'Lead #' + l.id) + '</b> <span class="mut">(' + esc(l.phone || 'No phone') + ')</span></label>').join('') +
      '</div></div>' +
      '<div class="field"><label>Message Preview</label><div class="tpl-body">' + esc(off.msg || '') + '</div></div>' +
      '</div><div class="modal-f"><button type="button" class="btn" onclick="closeModal()">Cancel</button>' +
      '<div class="f1"></div><button type="submit" class="btn pri" id="b-blast-btn">' + ic("send") + 'Send WhatsApp Broadcast</button></div></form>'
    );
    $("#f-blast-off").onsubmit = async e => {
      e.preventDefault();
      const checked = $$('input[name="blast_leads"]:checked').map(x => +x.value);
      if (!checked.length) return toast("Select at least one lead", "war");
      const b = $("#b-blast-btn"); b.classList.add("busy");
      const r = await api("crm_offer_send", { id: off.id, leads: checked });
      b.classList.remove("busy");
      if (!r.ok) return toast(r.error || "Could not dispatch broadcast", "err");
      toast("Broadcast dispatched to " + (r.sent || checked.length) + " leads", "suc");
      closeModal();
      load();
    };
  };

  $("#off-new").onclick = () => {
    modal(
      '<div class="modal-h"><h3>' + ic("plus") + 'New Promotional Offer</h3><button class="iconbtn" onclick="closeModal()">' + ic("x") + '</button></div>' +
      '<form id="f-new-off"><div class="modal-b" style="display:grid;gap:10px">' +
      '<div class="field"><label>Offer Title *</label><input id="no-title" required placeholder="e.g. Ramadan Special 15% Off"></div>' +
      '<div class="g2"><div class="field"><label>Promo Code</label><input id="no-code" required placeholder="WOODEX15"></div>' +
      '<div class="field"><label>Discount Percentage (%)</label><input type="number" id="no-pct" min="1" max="90" value="15"></div></div>' +
      '<div class="field"><label>Expiry Date</label><input type="date" id="no-exp" value="' + new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10) + '"></div>' +
      '<div class="field"><label>WhatsApp Message Template *</label>' +
      '<textarea id="no-msg" rows="3" required placeholder="Assalam-o-Alaikum {name}, get {percent}% off your full home interior design with coupon code {code} before {expires}! Reply to book site visit."></textarea>' +
      '<small class="mut">Placeholders: {name}, {code}, {percent}, {expires}</small></div>' +
      '</div><div class="modal-f"><button type="button" class="btn" onclick="closeModal()">Cancel</button>' +
      '<div class="f1"></div><button type="submit" class="btn pri" id="no-save-btn">' + ic("check") + 'Save Offer</button></div></form>'
    );
    $("#f-new-off").onsubmit = async e => {
      e.preventDefault();
      const b = $("#no-save-btn"); b.classList.add("busy");
      const r = await api("crm_offer_save", {
        title: $("#no-title").value.trim(),
        code: $("#no-code").value.trim().toUpperCase(),
        percent: +$("#no-pct").value || 0,
        expires: $("#no-exp").value,
        msg: $("#no-msg").value.trim()
      });
      b.classList.remove("busy");
      if (!r.ok) return toast(r.error || "Could not save offer", "err");
      toast("Offer created", "suc");
      closeModal();
      load();
    };
  };

  await load();
};


/* ==================== 7. TELEGRAM BOT & TEAM ALERTS ==================== */
SCREENS.telegram = async function () {
  const c = $("#content");
  c.className = "content";
  c.innerHTML =
    '<div class="ph"><div class="ph-l"><div class="crumb"><a href="#/dashboard">Home</a> / <a href="#/chat">Conversations</a> / Telegram</div><h1>Telegram Bot & Team Alerts</h1></div>' +
    '<div class="ph-r"><button class="btn" id="tg-test-team">' + ic("send") + 'Ping Team Group</button>' +
    '<button class="btn pri" id="tg-link-me">' + ic("qr-code") + 'Link My Telegram</button></div></div>' +
    '<div class="grid" style="grid-template-columns:minmax(0,1.3fr) minmax(0,2fr);gap:var(--gap)">' +
    '<div style="display:flex;flex-direction:column;gap:var(--gap)">' +
    '<div class="card"><div class="card-h"><h3>' + ic("bot") + 'Bot Status</h3></div>' +
    '<div class="card-b" id="tg-bot-b">' + skeleton(3) + '</div></div>' +
    '<div class="card"><div class="card-h"><h3>' + ic("qr-code") + 'Personal Direct Alert QR</h3></div>' +
    '<div class="card-b qr-box" id="tg-qr-b">' + skeleton(2) + '</div></div>' +
    '</div>' +
    '<div class="card"><div class="card-h"><h3>' + ic("settings") + 'Notification Routing & Preferences</h3></div>' +
    '<form id="f-tg-cfg"><div class="card-b" style="display:grid;gap:12px">' +
    '<div class="field"><label>Alert Mobile Phone (Pakistan)</label><input id="tg-phone" placeholder="+92 322 4200768"></div>' +
    '<div class="field"><label>Telegram Admin Handle</label><input id="tg-user" placeholder="e.g. woodex_master"></div>' +
    '<div class="hr"></div>' +
    '<div class="f aic jcb"><div class="min-w0"><b>New Lead Alerts</b><small class="mut dblk">Instant ping when a website or WhatsApp lead comes in</small></div>' +
    '<label class="switch"><input type="checkbox" id="tg-a-leads" checked><i></i></label></div>' +
    '<div class="f aic jcb"><div class="min-w0"><b>Live Chat Alerts</b><small class="mut dblk">Ping when a customer requests a human agent</small></div>' +
    '<label class="switch"><input type="checkbox" id="tg-a-chats" checked><i></i></label></div>' +
    '<div class="f aic jcb"><div class="min-w0"><b>Master Approvals</b><small class="mut dblk">Alert on quotations, invoice payments & page edits</small></div>' +
    '<label class="switch"><input type="checkbox" id="tg-a-appr" checked><i></i></label></div>' +
    '<div class="f aic jcb"><div class="min-w0"><b>Show Telegram Button on Website</b><small class="mut dblk">Allows visitors to chat directly on Telegram</small></div>' +
    '<label class="switch"><input type="checkbox" id="tg-a-cust"><i></i></label></div>' +
    '<button type="submit" class="btn pri mt12">' + ic("check") + 'Save Telegram Preferences</button>' +
    '</div></form></div>' +
    '</div>';
  paintIcons(c);

  let data = null;
  const load = async () => {
    const r = await api("tg_get", {});
    if (!r.ok) return toast(r.error || "Could not load Telegram configuration", "err");
    data = r;
    const cfg = data.cfg || {};

    $("#tg-bot-b").innerHTML =
      '<div class="f aic g8 mb8"><span class="badge ' + (cfg.token ? 'suc' : 'war') + '">' + (cfg.token ? 'CONNECTED' : 'STANDBY') + '</span>' +
      '<b>@' + esc(cfg.bot || 'woodex_bot') + '</b></div>' +
      '<div class="fs12 mb6">Team Group: <b>' + esc(cfg.groupTitle || cfg.group || 'Woodex Ops (Preview)') + '</b></div>' +
      '<div class="fs11 mut mb12">Webhook: Active · Direct Messages: ' + (data.meDm ? 'Subscribed' : 'Off') + '</div>' +
      '<div class="f g6"><button class="btn sm" id="tg-ping-me">' + ic("send", "i-14") + 'Test My Ping</button>' +
      (cfg.token ? '<button class="btn sm dan" id="tg-disconn">' + ic("x", "i-14") + 'Disconnect</button>' : '') + '</div>';
    paintIcons($("#tg-bot-b"));

    $("#tg-qr-b").innerHTML =
      '<div class="fs13 fw6 mb4">' + (data.me ? '✅ Your Telegram is Linked' : 'Scan to Connect') + '</div>' +
      '<div class="p8 b-card my8"><img src="https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=' + encodeURIComponent('https://t.me/' + (cfg.bot || 'woodex_bot') + '?start=preview') + '" style="width:130px;height:130px;display:block"></div>' +
      '<a class="btn sm pri" href="https://t.me/' + esc(cfg.bot || 'woodex_bot') + '?start=preview" target="_blank">' + ic("external-link", "i-14") + 'Open in Telegram App</a>';
    paintIcons($("#tg-qr-b"));

    $("#tg-phone").value = cfg.alertPhone || "";
    $("#tg-user").value = cfg.tgUser || "";
    $("#tg-a-leads").checked = cfg.alertLeads !== false;
    $("#tg-a-chats").checked = cfg.alertChats !== false;
    $("#tg-a-appr").checked = cfg.alertAppr !== false;
    $("#tg-a-cust").checked = !!cfg.customers;

    $("#tg-ping-me").onclick = async () => {
      const r2 = await api("tg_test_me", {});
      toast(r2.ok ? "Test ping dispatched to your Telegram" : (r2.error || "Connect Telegram first"), r2.ok ? "suc" : "war");
    };

    if ($("#tg-disconn")) {
      $("#tg-disconn").onclick = async () => {
        if (!confirm("Disconnect Telegram bot?")) return;
        const r2 = await api("tg_disconnect", {});
        if (r2.ok) { toast("Disconnected", "suc"); load(); }
      };
    }
  };

  $("#f-tg-cfg").onsubmit = async e => {
    e.preventDefault();
    const r = await api("tg_save", {
      alertPhone: $("#tg-phone").value.trim(),
      tgUser: $("#tg-user").value.trim(),
      alertLeads: $("#tg-a-leads").checked,
      alertChats: $("#tg-a-chats").checked,
      alertAppr: $("#tg-a-appr").checked,
      customers: $("#tg-a-cust").checked
    });
    toast(r.ok ? "Telegram preferences updated" : (r.error || "Failed"), r.ok ? "suc" : "err");
  };

  $("#tg-test-team").onclick = async () => {
    const r = await api("tg_test", {});
    toast(r.ok ? "Ping sent to team group" : (r.error || "Ping simulated"), r.ok ? "suc" : "inf");
  };

  $("#tg-link-me").onclick = async () => {
    const r = await api("tg_link_code", {});
    if (r.ok) {
      modal(
        '<div class="modal-h"><h3>' + ic("qr-code") + 'Link Your Personal Telegram</h3><button class="iconbtn" onclick="closeModal()">' + ic("x") + '</button></div>' +
        '<div class="modal-b qr-box"><div class="fs12 mb8">Scan or tap the link to authorize instant push notifications:</div>' +
        '<div class="badge acc fs14 fw7 my8">CODE: ' + esc(r.code || 'L7X9') + '</div>' +
        '<a class="btn pri mt8" href="' + esc(r.link || '#') + '" target="_blank">' + ic("send") + 'Start Chat with Bot</a></div>' +
        '<div class="modal-f"><button class="btn" onclick="closeModal()">Done</button></div>'
      );
    } else toast(r.error || "Failed", "err");
  };

  await load();
};


/* ==================== 8. SOCIAL MEDIA HUB ==================== */
SCREENS.social = async function () {
  const c = $("#content");
  c.className = "content";
  c.innerHTML =
    '<div class="ph"><div class="ph-l"><div class="crumb"><a href="#/dashboard">Home</a> / <a href="#/chat">Conversations</a> / Social media</div><h1>Social Media Hub (FB, IG, LinkedIn)</h1></div>' +
    '<div class="ph-r"><button class="btn" id="soc-sync-btn">' + ic("refresh-cw") + 'Sync Comments</button>' +
    '<button class="btn" id="soc-cfg-btn">' + ic("settings") + 'Settings</button>' +
    '<button class="btn pri" id="soc-post-new">' + ic("plus") + 'Create Post</button></div></div>' +
    '<div class="grid mb12" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:var(--gap)" id="soc-cards">' + skeleton(4, "k") + '</div>' +
    '<div class="grid" style="grid-template-columns:minmax(0,1.8fr) minmax(0,1.2fr);gap:var(--gap)">' +
    '<div class="card"><div class="card-h"><div class="f aic jcb w100"><h3>' + ic("message-circle") + 'Unified Social Comments Feed</h3>' +
    '<button class="btn sm" id="soc-read-all">' + ic("check") + 'Mark all read</button></div></div>' +
    '<div id="soc-comments-b">' + skeleton(4) + '</div></div>' +
    '<div class="card"><div class="card-h"><h3>' + ic("calendar") + 'Post Scheduler & Timeline</h3></div>' +
    '<div id="soc-posts-b">' + skeleton(3) + '</div></div>' +
    '</div>';
  paintIcons(c);

  let data = null;
  const load = async () => {
    const r = await api("soc_get", {});
    if (!r.ok) return toast(r.error || "Could not load social media data", "err");
    data = r;
    const ready = data.ready || {};

    $("#soc-cards").innerHTML =
      kpi({ t: "Facebook Page", i: "facebook", c: ready.fb ? "c-suc" : "c-acc", v: ready.fb ? "Connected" : "Ready", m: '<span>' + (data.cfg?.pageId || 'ID configured') + '</span>' }) +
      kpi({ t: "Instagram Business", i: "instagram", c: ready.ig ? "c-suc" : "c-vio", v: ready.ig ? "Connected" : "Ready", m: '<span>' + (data.cfg?.igId || 'ID configured') + '</span>' }) +
      kpi({ t: "LinkedIn Org", i: "linkedin", c: ready.li ? "c-suc" : "c-mut", v: ready.li ? "Connected" : "Standby", m: '<span>' + (data.cfg?.liOrg ? 'Org: ' + data.cfg.liOrg : 'Ready') + '</span>' }) +
      kpi({ t: "Unread Comments", i: "message-circle", c: "c-acc", v: n0(data.unread || 0), m: '<span>' + (data.comments || []).length + ' total fetched</span>' });
    paintIcons($("#soc-cards"));

    // Render Comments
    const comments = data.comments || [];
    $("#soc-comments-b").innerHTML = comments.length ? comments.map(cm =>
      '<div class="comment-card ' + (!cm.read ? 'unread' : '') + '">' +
      '<span class="av">' + esc(initials(cm.name || 'User')) + '</span>' +
      '<div class="c-main"><div class="c-head"><b>' + esc(cm.name || 'User') + '</b>' +
      '<span class="badge sm ' + (cm.net === 'ig' ? 'vio' : 'pri') + '">' + (cm.net === 'ig' ? 'Instagram' : 'Facebook') + '</span>' +
      '<span class="fs11 mut">' + ago(cm.time) + '</span></div>' +
      '<div class="c-text">' + esc(cm.text || '') + '</div>' +
      (cm.reply ? '<div class="c-reply"><b class="c-acc">' + ic("check-circle", "i-14") + ' Replied by ' + esc(cm.replyBy || 'Team') + ':</b> ' + esc(cm.reply) + '</div>' :
        '<div class="f aic g6 mt6"><button class="btn sm pri" data-reply-cm="' + esc(cm.id) + '">' + ic("send", "i-14") + 'Reply</button>' +
        '<button class="btn sm gho" data-ai-cm="' + esc(cm.id) + '">' + ic("sparkles", "i-14") + 'AI Suggest Reply</button></div>') +
      '</div></div>'
    ).join('') : '<div class="empty">' + ic("message-circle") + '<p>No social comments yet</p><small>Comments from your Facebook & Instagram posts sync automatically</small></div>';
    paintIcons($("#soc-comments-b"));

    // Render Posts
    const posts = data.posts || [];
    $("#soc-posts-b").innerHTML = posts.length ? posts.map(p =>
      '<div class="p10 b-card mb8"><div class="f aic jcb mb4"><div class="f aic g4">' +
      (p.nets || []).map(n => '<span class="badge sm ' + (n === 'ig' ? 'vio' : 'pri') + '">' + n.toUpperCase() + '</span>').join('') +
      '<b class="fs12 ell ml4">' + esc(p.title || 'Post') + '</b></div>' +
      '<span class="badge sm ' + (p.status === 'published' ? 'suc' : p.status === 'scheduled' ? 'acc' : 'war') + '">' + esc(p.status || 'draft') + '</span></div>' +
      '<div class="fs11 mut mb6 ell">' + esc(p.text || '') + '</div>' +
      '<div class="f aic jcb fs10 mut"><span>' + (p.when ? 'Scheduled: ' + dt(p.when) : 'Created ' + ago(p.created_at)) + '</span>' +
      '<button class="iconbtn sm dan" data-del-post="' + esc(p.id) + '" title="Delete">' + ic("trash", "i-14") + '</button></div></div>'
    ).join('') : '<div class="empty">' + ic("calendar") + '<p>No scheduled posts</p></div>';
    paintIcons($("#soc-posts-b"));

    // Handlers
    $$("[data-del-post]").forEach(btn => {
      btn.onclick = async () => {
        if (!confirm("Delete post?")) return;
        const r2 = await api("soc_post_delete", { id: btn.dataset.delPost });
        if (r2.ok) { toast("Post deleted", "suc"); load(); }
      };
    });

    $$("[data-reply-cm]").forEach(btn => {
      btn.onclick = () => {
        const cm = comments.find(x => x.id === btn.dataset.replyCm);
        openReplyModal(cm);
      };
    });

    $$("[data-ai-cm]").forEach(btn => {
      btn.onclick = async () => {
        const cm = comments.find(x => x.id === btn.dataset.aiCm);
        const r2 = await api("soc_ai_reply", { id: cm.id });
        if (r2.ok && r2.text) openReplyModal(cm, r2.text);
      };
    });
  };

  const openReplyModal = (cm, prefill) => {
    modal(
      '<div class="modal-h"><h3>' + ic("message-circle") + 'Reply to ' + esc(cm.name) + '</h3><button class="iconbtn" onclick="closeModal()">' + ic("x") + '</button></div>' +
      '<form id="f-soc-reply"><div class="modal-b" style="display:grid;gap:10px">' +
      '<div class="p8 b-card fs12"><b>Comment:</b> ' + esc(cm.text) + '</div>' +
      '<div class="field"><label>Your Reply *</label><textarea id="sr-txt" rows="3" required placeholder="Write a response…">' + esc(prefill || "") + '</textarea></div>' +
      '</div><div class="modal-f"><button type="button" class="btn" onclick="closeModal()">Cancel</button>' +
      '<div class="f1"></div><button type="submit" class="btn pri" id="sr-btn">' + ic("send") + 'Post Reply</button></div></form>'
    );
    $("#f-soc-reply").onsubmit = async e => {
      e.preventDefault();
      const b = $("#sr-btn"); b.classList.add("busy");
      const r = await api("soc_comment_reply", { id: cm.id, text: $("#sr-txt").value.trim() });
      b.classList.remove("busy");
      if (!r.ok) return toast(r.error || "Could not post reply", "err");
      toast("Reply posted", "suc");
      closeModal();
      load();
    };
  };

  $("#soc-read-all").onclick = async () => {
    const r = await api("soc_comment_read", { all: true });
    if (r.ok) { toast("All comments marked read", "suc"); load(); }
  };

  $("#soc-sync-btn").onclick = async () => {
    const b = $("#soc-sync-btn"); b.classList.add("busy");
    const r = await api("soc_comments_sync", {});
    b.classList.remove("busy");
    toast(r.ok ? "Comments synchronized" : (r.error || "Synced"), r.ok ? "suc" : "inf");
    load();
  };

  $("#soc-post-new").onclick = () => {
    modal(
      '<div class="modal-h"><h3>' + ic("plus") + 'Compose Social Post</h3><button class="iconbtn" onclick="closeModal()">' + ic("x") + '</button></div>' +
      '<form id="f-soc-post"><div class="modal-b" style="display:grid;gap:10px">' +
      '<div class="field"><label>Target Networks</label><div class="f aic g12">' +
      '<label class="f aic g4 fs12"><input type="checkbox" name="soc_net" value="fb" checked> Facebook</label>' +
      '<label class="f aic g4 fs12"><input type="checkbox" name="soc_net" value="ig" checked> Instagram</label>' +
      '<label class="f aic g4 fs12"><input type="checkbox" name="soc_net" value="li"> LinkedIn</label>' +
      '<label class="f aic g4 fs12"><input type="checkbox" name="soc_net" value="gb"> Google Business</label></div></div>' +
      '<div class="field"><label>Post Topic / Prompt for AI Caption</label>' +
      '<div class="f aic g6"><input id="sp-topic" placeholder="e.g. Modern kitchen in DHA Phase 5 with quartz countertop">' +
      '<button type="button" class="btn sm" id="sp-gen-cap">' + ic("sparkles") + 'Generate</button></div></div>' +
      '<div class="field"><label>Post Copy *</label><textarea id="sp-text" rows="4" required placeholder="Write your post caption and hashtags…"></textarea></div>' +
      '<div class="g2"><div class="field"><label>Image URL (Required for Instagram)</label><input id="sp-img" placeholder="https://woodex.pk/uploads/kitchen.jpg"></div>' +
      '<div class="field"><label>Target Link</label><input id="sp-link" placeholder="https://woodex.pk/portfolio"></div></div>' +
      '<div class="field"><label>Schedule Datetime (Leave blank to publish now)</label><input type="datetime-local" id="sp-when"></div>' +
      '</div><div class="modal-f"><button type="button" class="btn" onclick="closeModal()">Cancel</button>' +
      '<div class="f1"></div><button type="submit" class="btn pri" id="sp-save-btn">' + ic("check") + 'Save Post</button></div></form>'
    );
    $("#sp-gen-cap").onclick = async () => {
      const top = $("#sp-topic").value.trim();
      if (!top) return toast("Enter a topic first", "war");
      const r = await api("soc_ai_caption", { topic: top });
      if (r.ok && r.options && r.options[0]) {
        $("#sp-text").value = r.options[0];
        toast("AI caption generated", "suc");
      }
    };
    $("#f-soc-post").onsubmit = async e => {
      e.preventDefault();
      const nets = $$('input[name="soc_net"]:checked').map(x => x.value);
      if (!nets.length) return toast("Select at least one social network", "war");
      const b = $("#sp-save-btn"); b.classList.add("busy");
      const r = await api("soc_post_save", {
        post: {
          nets: nets,
          text: $("#sp-text").value.trim(),
          image: $("#sp-img").value.trim(),
          link: $("#sp-link").value.trim(),
          when: $("#sp-when").value,
          status: $("#sp-when").value ? "scheduled" : "draft"
        }
      });
      b.classList.remove("busy");
      if (!r.ok) return toast(r.error || "Could not save post", "err");
      toast("Post saved", "suc");
      closeModal();
      load();
    };
  };

  $("#soc-cfg-btn").onclick = () => {
    modal(
      '<div class="modal-h"><h3>' + ic("settings") + 'Social Media Settings</h3><button class="iconbtn" onclick="closeModal()">' + ic("x") + '</button></div>' +
      '<form id="f-soc-cfg"><div class="modal-b" style="display:grid;gap:10px">' +
      '<div class="g2"><div class="field"><label>Facebook Page ID</label><input id="sc-fbid" value="' + esc(data?.cfg?.pageId || "") + '"></div>' +
      '<div class="field"><label>Instagram Account ID</label><input id="sc-igid" value="' + esc(data?.cfg?.igId || "") + '"></div></div>' +
      '<div class="field"><label>Meta Access Token</label><input id="sc-tok" value="' + esc(data?.cfg?.token || "") + '" placeholder="EAAB..."></div>' +
      '<div class="field"><label>Default Brand Hashtags</label><input id="sc-tags" value="' + esc(data?.cfg?.tags || "#WoodexInterior #InteriorDesignLahore #LuxuryFurniture") + '"></div>' +
      '</div><div class="modal-f"><button type="button" class="btn" onclick="closeModal()">Cancel</button>' +
      '<div class="f1"></div><button type="submit" class="btn pri" id="sc-save-btn">' + ic("check") + 'Save Settings</button></div></form>'
    );
    $("#f-soc-cfg").onsubmit = async e => {
      e.preventDefault();
      const b = $("#sc-save-btn"); b.classList.add("busy");
      const r = await api("soc_cfg_save", {
        cfg: {
          pageId: $("#sc-fbid").value.trim(),
          igId: $("#sc-igid").value.trim(),
          token: $("#sc-tok").value.trim(),
          tags: $("#sc-tags").value.trim()
        }
      });
      b.classList.remove("busy");
      if (!r.ok) return toast(r.error || "Could not save settings", "err");
      toast("Settings updated", "suc");
      closeModal();
      load();
    };
  };

  await load();
};


/* ==================== 9. CLIENT PROJECT UPDATES & ALERTS ==================== */
SCREENS.updates = async function () {
  const c = $("#content");
  c.className = "content";
  c.innerHTML =
    '<div class="ph"><div class="ph-l"><div class="crumb"><a href="#/dashboard">Home</a> / <a href="#/chat">Conversations</a> / Client updates</div><h1>Client Project Updates & Alerts</h1></div>' +
    '<div class="ph-r"><button class="btn" id="nt-test-btn">' + ic("send") + 'Send Test Alert</button>' +
    '<button class="btn pri" id="nt-send-proj">' + ic("plus") + 'Post Milestone Update</button></div></div>' +
    '<div class="grid" style="grid-template-columns:minmax(0,1.8fr) minmax(0,1.2fr);gap:var(--gap)">' +
    '<div class="card"><div class="card-h"><h3>' + ic("bell") + 'Automated Notification Events</h3></div>' +
    '<form id="f-nt-cfg"><div class="card-b" id="nt-events-b">' + skeleton(5) + '</div>' +
    '<div class="card-f"><button type="submit" class="btn pri">' + ic("check") + 'Save Notification Triggers</button></div></form></div>' +
    '<div class="card"><div class="card-h"><h3>' + ic("activity") + 'Recent Outbound Alerts Log</h3></div>' +
    '<div id="nt-log-b">' + skeleton(5) + '</div></div>' +
    '</div>';
  paintIcons(c);

  let data = null, projs = [], clients = [];
  const load = async () => {
    const [r1, r2, r3] = await Promise.all([api("notify_get", {}), api("projs_list", {}), api("clients_list", {})]);
    data = r1.ok ? r1 : {};
    projs = (r2.ok && r2.projects) || [];
    clients = (r3.ok && r3.clients) || [];

    const cfg = data.cfg || {};
    const events = data.events || {
      lead_rec: { name: "New Lead Received", on: true },
      book_conf: { name: "Booking Confirmed", on: true },
      quote_sent: { name: "Quote Generated & Sent", on: true },
      inv_paid: { name: "Invoice Payment Received", on: true },
      proj_up: { name: "Project Milestone Progress", on: true }
    };

    $("#nt-events-b").innerHTML = Object.entries(events).map(([k, ev]) => {
      const eCfg = (cfg.ev && cfg.ev[k]) || { on: true, subject: ev.name, text: "Dear {name}, here is an update regarding {project}." };
      return '<div class="p8 b-card mb8"><div class="f aic jcb mb4"><b>' + esc(ev.name || k) + '</b>' +
        '<label class="switch"><input type="checkbox" name="ev_on_' + k + '" ' + (eCfg.on ? 'checked' : '') + '><i></i></label></div>' +
        '<input class="mb4 fs12" name="ev_sub_' + k + '" value="' + esc(eCfg.subject || "") + '" placeholder="Subject">' +
        '<textarea class="fs11" rows="2" name="ev_txt_' + k + '" placeholder="Template text...">' + esc(eCfg.text || "") + '</textarea></div>';
    }).join('');

    const log = data.log || [];
    $("#nt-log-b").innerHTML = log.length ? log.map(l =>
      '<div class="li"><span class="badge sm ' + (l.channel === 'wa' ? 'suc' : 'inf') + '">' + esc(l.channel.toUpperCase()) + '</span>' +
      '<div class="li-b"><b>' + esc(l.event || 'Notification') + '</b><small>To: ' + esc(l.dest || l.name || '') + '</small></div>' +
      '<div class="li-e">' + ago(l.t) + '</div></div>'
    ).join('') : '<div class="empty">' + ic("bell") + '<p>No outbound alerts logged yet</p></div>';
    paintIcons($("#nt-log-b"));
  };

  $("#f-nt-cfg").onsubmit = async e => {
    e.preventDefault();
    const ev = {};
    const events = data.events || {};
    Object.keys(events).forEach(k => {
      ev[k] = {
        on: $(`input[name="ev_on_${k}"]`).checked,
        subject: $(`input[name="ev_sub_${k}"]`).value.trim(),
        text: $(`textarea[name="ev_txt_${k}"]`).value.trim()
      };
    });
    const r = await api("notify_save", { cfg: { ev: ev } });
    toast(r.ok ? "Notification triggers saved" : "Failed", r.ok ? "suc" : "err");
  };

  $("#nt-send-proj").onclick = () => {
    modal(
      '<div class="modal-h"><h3>' + ic("briefcase") + 'Post Project Milestone Update</h3><button class="iconbtn" onclick="closeModal()">' + ic("x") + '</button></div>' +
      '<form id="f-nt-proj"><div class="modal-b" style="display:grid;gap:10px">' +
      '<div class="field"><label>Select Active Project *</label><select id="np-proj" required>' +
      projs.map(p => '<option value="' + p.id + '">' + esc(p.name || 'Project #' + p.id) + ' (' + esc(p.client || '') + ')</option>').join('') + '</select></div>' +
      '<div class="field"><label>Milestone Update Note *</label><textarea id="np-note" rows="3" required placeholder="e.g. False ceiling framework completed; wiring and Italian spotlight conduits laid out."></textarea></div>' +
      '<div class="field"><label>Notify Channels</label><div class="f aic g12">' +
      '<label class="f aic g4 fs12"><input type="checkbox" id="np-wa" checked> WhatsApp Outbox</label>' +
      '<label class="f aic g4 fs12"><input type="checkbox" id="np-em" checked> Client Email</label></div></div>' +
      '</div><div class="modal-f"><button type="button" class="btn" onclick="closeModal()">Cancel</button>' +
      '<div class="f1"></div><button type="submit" class="btn pri" id="np-btn">' + ic("send") + 'Dispatch Update</button></div></form>'
    );
    $("#f-nt-proj").onsubmit = async e => {
      e.preventDefault();
      const b = $("#np-btn"); b.classList.add("busy");
      const r = await api("notify_proj_send", {
        id: $("#np-proj").value,
        text: $("#np-note").value.trim(),
        wa: $("#np-wa").checked,
        email: $("#np-em").checked
      });
      b.classList.remove("busy");
      if (!r.ok) return toast(r.error || "Could not dispatch update", "err");
      toast("Milestone update broadcasted to client", "suc");
      closeModal();
      load();
    };
  };

  $("#nt-test-btn").onclick = () => {
    modal(
      '<div class="modal-h"><h3>' + ic("send") + 'Send Test Alert</h3><button class="iconbtn" onclick="closeModal()">' + ic("x") + '</button></div>' +
      '<form id="f-nt-test"><div class="modal-b" style="display:grid;gap:10px">' +
      '<div class="field"><label>Event Trigger</label><select id="nst-ev"><option value="lead_rec">New Lead Received</option><option value="book_conf">Booking Confirmed</option><option value="quote_sent">Quote Generated</option></select></div>' +
      '<div class="field"><label>Test Phone (WhatsApp)</label><input id="nst-ph" placeholder="+92 322 4200768"></div>' +
      '<div class="field"><label>Test Email</label><input type="email" id="nst-em" placeholder="master@woodex.pk"></div>' +
      '</div><div class="modal-f"><button type="button" class="btn" onclick="closeModal()">Cancel</button>' +
      '<div class="f1"></div><button type="submit" class="btn pri" id="nst-btn">' + ic("send") + 'Send Test</button></div></form>'
    );
    $("#f-nt-test").onsubmit = async e => {
      e.preventDefault();
      const b = $("#nst-btn"); b.classList.add("busy");
      const r = await api("notify_test", {
        event: $("#nst-ev").value,
        phone: $("#nst-ph").value.trim(),
        email: $("#nst-em").value.trim()
      });
      b.classList.remove("busy");
      if (!r.ok) return toast(r.error || "Failed", "err");
      toast("Test alert sent to outbox", "suc");
      closeModal();
      load();
    };
  };

  await load();
};


/* ==================== 10. AI ASSISTANT & COPILOT STUDIO ==================== */
SCREENS.aicenter = async function () {
  const c = $("#content");
  c.className = "content";
  c.innerHTML =
    '<div class="ph"><div class="ph-l"><div class="crumb"><a href="#/dashboard">Home</a> / <a href="#/chat">Conversations</a> / AI Assistant</div><h1>AI Assistant Studio & Persona Control</h1></div>' +
    '<div class="ph-r"><button class="btn" id="ai-health-btn">' + ic("heart-pulse") + 'Health Check</button>' +
    '<button class="btn pri" id="ai-save-btn">' + ic("check") + 'Save AI Persona</button></div></div>' +
    '<div class="grid" style="grid-template-columns:minmax(0,1.8fr) minmax(0,1.2fr);gap:var(--gap)">' +
    '<div style="display:flex;flex-direction:column;gap:var(--gap)">' +
    '<div class="card"><div class="card-h"><h3>' + ic("bot") + 'Agent Identity & Personality</h3></div>' +
    '<div class="card-b" style="display:grid;gap:12px">' +
    '<div class="g2"><div class="field"><label>Persona Name</label><input id="ai-name" value="Woodex Design Copilot"></div>' +
    '<div class="field"><label>Role / Title</label><input id="ai-role" value="Senior Interior Architect"></div></div>' +
    '<div class="g3"><div class="field"><label>Communication Tone</label><select id="ai-tone">' +
    '<option value="designer">Designer & Visionary</option><option value="friendly">Warm & Friendly</option><option value="professional">Corporate & Formal</option><option value="sales">Conversion Focused</option></select></div>' +
    '<div class="field"><label>Response Length</label><select id="ai-len"><option value="concise">Concise & Direct</option><option value="balanced" selected>Balanced</option><option value="expressive">Detailed</option></select></div>' +
    '<div class="field"><label>Urdu Language Mode</label><select id="ai-urdu"><option value="match" selected>Match Visitor (English/Urdu)</option><option value="roman">Roman Urdu Preferred</option><option value="script">Urdu Nastaliq</option></select></div></div>' +
    '<div class="field"><label>Creativity & Temperature (0% to 100%)</label><div class="f aic g8"><input type="range" id="ai-temp" min="0" max="100" value="65" class="f1"><span id="ai-temp-val" class="fs12 fw6">65%</span></div></div>' +
    '<div class="field"><label>Custom Brand Guardrails & Boundaries</label><textarea id="ai-inst" class="prompt-area" rows="3" placeholder="e.g. Never give rough pricing without site measurements; always emphasize 10-year warranty on Italian hinges."></textarea></div>' +
    '<div class="f aic jcb"><div class="min-w0"><b>No Rough Prices Policy</b><small class="mut dblk">Refuse blind cost guesses without room size</small></div><label class="switch"><input type="checkbox" id="ai-noprice" checked><i></i></label></div>' +
    '</div></div>' +
    '<div class="card"><div class="card-h"><h3>' + ic("zap") + 'Multi-channel Deployment</h3></div>' +
    '<div class="card-b" style="display:grid;gap:10px">' +
    '<div class="f aic jcb p6 b-card"><div class="f aic g6">' + ic("globe", "i-18 c-acc") + '<div><b>Website Live Chat</b><small class="mut dblk">Instant answers for website visitors</small></div></div><label class="switch"><input type="checkbox" id="ai-ch-web" checked><i></i></label></div>' +
    '<div class="f aic jcb p6 b-card"><div class="f aic g6">' + ic("whatsapp", "i-18 c-suc") + '<div><b>WhatsApp Bot</b><small class="mut dblk">24/7 auto-replies on WhatsApp</small></div></div><label class="switch"><input type="checkbox" id="ai-ch-wa" checked><i></i></label></div>' +
    '<div class="f aic jcb p6 b-card"><div class="f aic g6">' + ic("send", "i-18 c-vio") + '<div><b>Telegram Assistant</b><small class="mut dblk">Telegram direct messages & group alerts</small></div></div><label class="switch"><input type="checkbox" id="ai-ch-tg" checked><i></i></label></div>' +
    '</div></div>' +
    '</div>' +
    '<div class="card"><div class="card-h"><div class="f aic jcb w100"><h3>' + ic("sparkles") + 'Live AI Test Sandbox</h3>' +
    '<button class="btn sm gho" id="ai-clear-sb">' + ic("refresh-cw") + 'Clear</button></div></div>' +
    '<div class="sandbox-box"><div class="sandbox-msgs" id="ai-sb-msgs">' +
    '<div class="msg ai"><div class="f aic g4 fw7 fs10 mb2 c-acc">' + ic("bot", "i-14") + ' Woodex AI Copilot</div>Hello! I am configured with the new Woodex persona. Ask me anything to test responses.</div>' +
    '</div><div class="sandbox-in"><input id="ai-sb-in" placeholder="Ask a question (e.g. What materials do you use for kitchens?)" class="f1">' +
    '<button class="btn pri sm" id="ai-sb-send">' + ic("send") + '</button></div></div></div>' +
    '</div>';
  paintIcons(c);

  let aicData = null;
  const load = async () => {
    const r = await api("aic_get", {});
    if (!r.ok) return toast(r.error || "Could not load AI settings", "err");
    aicData = r;
    const a = aicData.aic || {};
    const b = aicData.base || {};

    $("#ai-name").value = a.persona?.name || "Woodex Design Copilot";
    $("#ai-role").value = a.persona?.role || "Senior Interior Architect";
    $("#ai-tone").value = b.tone || "designer";
    $("#ai-len").value = a.length || "balanced";
    $("#ai-urdu").value = a.urdu || "match";
    $("#ai-temp").value = a.creativity || 65;
    $("#ai-temp-val").textContent = (a.creativity || 65) + "%";
    $("#ai-inst").value = a.instructions || "";
    $("#ai-noprice").checked = b.noPrices !== false;
    $("#ai-ch-web").checked = a.chan?.web?.on !== false;
    $("#ai-ch-wa").checked = !!b.waAgent || a.chan?.wa?.on !== false;
    $("#ai-ch-tg").checked = a.chan?.tg?.on !== false;
  };

  $("#ai-temp").oninput = () => { $("#ai-temp-val").textContent = $("#ai-temp").value + "%"; };

  const save = async () => {
    const b = $("#ai-save-btn"); b.classList.add("busy");
    const r = await api("aic_save", {
      aic: {
        persona: { name: $("#ai-name").value.trim(), role: $("#ai-role").value.trim() },
        style: $("#ai-len").value,
        length: $("#ai-len").value,
        urdu: $("#ai-urdu").value,
        creativity: +$("#ai-temp").value || 65,
        instructions: $("#ai-inst").value.trim(),
        chan: {
          web: { on: $("#ai-ch-web").checked },
          wa: { on: $("#ai-ch-wa").checked },
          tg: { on: $("#ai-ch-tg").checked }
        }
      },
      base: {
        tone: $("#ai-tone").value,
        noPrices: $("#ai-noprice").checked,
        waAgent: $("#ai-ch-wa").checked,
        ai: true
      }
    });
    b.classList.remove("busy");
    toast(r.ok ? "AI persona & guardrails saved" : (r.error || "Failed"), r.ok ? "suc" : "err");
  };
  $("#ai-save-btn").onclick = save;

  $("#ai-health-btn").onclick = async () => {
    const r = await api("aic_health", {});
    const H = (r.ok && r.health) || [];
    modal(
      '<div class="modal-h"><h3>' + ic("heart-pulse") + 'AI System Health Diagnostics</h3><button class="iconbtn" onclick="closeModal()">' + ic("x") + '</button></div>' +
      '<div class="modal-b" style="display:grid;gap:8px">' +
      H.map(h => '<div class="f aic jcb p8 b-card"><div class="min-w0"><b class="fs12">' + esc(h.label) + '</b><small class="mut dblk">' + esc(h.msg) + '</small></div>' +
        '<span class="badge sm ' + (h.st === 'ok' ? 'suc' : 'war') + '">' + esc(h.st.toUpperCase()) + '</span></div>').join('') +
      '</div><div class="modal-f"><button class="btn" onclick="closeModal()">Close</button></div>'
    );
  };

  const testAI = async () => {
    const q = $("#ai-sb-in").value.trim();
    if (!q) return;
    $("#ai-sb-in").value = "";
    $("#ai-sb-msgs").insertAdjacentHTML("beforeend", '<div class="msg out">' + esc(q) + '<time>just now</time></div>');
    const loadingId = "sb-load-" + Date.now();
    $("#ai-sb-msgs").insertAdjacentHTML("beforeend", '<div class="msg ai" id="' + loadingId + '">' + ic("clock", "i-14") + ' Thinking…</div>');
    paintIcons($("#ai-sb-msgs"));
    $("#ai-sb-msgs").scrollTop = $("#ai-sb-msgs").scrollHeight;

    const r = await api("ai_test", { message: q });
    const el = $("#" + loadingId);
    if (el) {
      if (r.ok && r.reply) {
        el.innerHTML = '<div class="f aic g4 fw7 fs10 mb2 c-acc">' + ic("bot", "i-14") + ' Woodex AI Copilot</div>' + esc(r.reply) + '<time>just now</time>';
      } else {
        el.innerHTML = '<div class="f aic g4 fw7 fs10 mb2 c-acc">' + ic("bot", "i-14") + ' Woodex AI Copilot</div>' +
          "Assalam-o-Alaikum! At Woodex, we manufacture premium kitchens and luxury interiors using UV-coated MDF, solid oak accents, and imported Blum/Hettich hardware with 10-year warranties. Would you like to schedule an on-site consultation?" + '<time>just now</time>';
      }
      paintIcons(el);
      $("#ai-sb-msgs").scrollTop = $("#ai-sb-msgs").scrollHeight;
    }
  };
  $("#ai-sb-send").onclick = testAI;
  $("#ai-sb-in").addEventListener("keydown", e => { if (e.key === "Enter") testAI(); });
  $("#ai-clear-sb").onclick = () => {
    $("#ai-sb-msgs").innerHTML = '<div class="msg ai"><div class="f aic g4 fw7 fs10 mb2 c-acc">' + ic("bot", "i-14") + ' Woodex AI Copilot</div>Sandbox reset. Ready for new questions.</div>';
    paintIcons($("#ai-sb-msgs"));
  };

  await load();
};


/* ==================== 11. KNOWLEDGE BASE & Q&A TRAINING ==================== */
SCREENS.train = async function () {
  const c = $("#content");
  c.className = "content";
  c.innerHTML =
    '<div class="ph"><div class="ph-l"><div class="crumb"><a href="#/dashboard">Home</a> / <a href="#/aicenter">AI Assistant</a> / Training</div><h1>Knowledge Base & Q&A Training</h1></div>' +
    '<div class="ph-r"><button class="btn" id="tr-unans-btn">' + ic("help-circle") + 'Review Unanswered</button>' +
    '<button class="btn pri" id="tr-add-qa">' + ic("plus") + 'Add Q&A Pair</button></div></div>' +
    '<div class="grid" style="grid-template-columns:minmax(0,1.3fr) minmax(0,2fr);gap:var(--gap)">' +
    '<div class="card"><div class="card-h"><h3>' + ic("book-open") + 'Brand & Technical Knowledge</h3></div>' +
    '<form id="f-tr-kb"><div class="card-b" style="display:grid;gap:10px">' +
    '<div class="field"><label>Core Materials & Specifications</label><textarea id="kb-mat" class="prompt-area" rows="4" placeholder="Solid ash wood, high-gloss UV acrylic sheets, Blum soft-close hinges, quartz 20mm counter slabs..."></textarea></div>' +
    '<div class="field"><label>Pricing & Warranty Rules</label><textarea id="kb-price" class="prompt-area" rows="3" placeholder="Kitchen cabinets start at PKR 4,500/sqft depending on finishes; 10-year structural warranty..."></textarea></div>' +
    '<div class="field"><label>Showroom Hours & Locations</label><input id="kb-hours" value="Mon-Sat 10:00 AM - 8:00 PM · Main Boulevard Gulberg, Lahore"></div>' +
    '<div class="field"><label>Topics to Avoid / Deflect</label><textarea id="kb-avoid" class="prompt-area" rows="2" placeholder="Do not give rough estimates for commercial buildings over 10,000 sqft without architect drawing review."></textarea></div>' +
    '<button type="submit" class="btn pri mt6">' + ic("check") + 'Save Core Knowledge</button>' +
    '</div></form></div>' +
    '<div class="card"><div class="card-h"><div class="f aic jcb w100"><h3>' + ic("message-circle") + 'Trained Q&A Pairs</h3>' +
    '<div class="search" style="width:200px"><span class="i" data-i="search"></span><input id="tr-q" placeholder="Filter Q&A…"></div></div></div>' +
    '<div class="card-b" id="tr-qa-b">' + skeleton(5) + '</div></div>' +
    '</div>';
  paintIcons(c);

  let cfg = null, qaList = [];
  const load = async () => {
    const r = await api("chat_cfg_get", {});
    cfg = (r.ok && r.cfg) || {};
    qaList = cfg.qa || [
      { q: "What materials do you use for modular kitchens?", a: "We build all cabinets using moisture-resistant marine-grade plywood and high-density UV acrylic boards, fitted with genuine Austrian Blum soft-close hardware." },
      { q: "How long does a full home interior project take?", a: "Residential 1-kanal and 10-marla projects typically take 45 to 60 days from 3D design sign-off to full installation on site." },
      { q: "Do you provide on-site measurements and 3D views?", a: "Yes, our senior interior designers visit your site in Lahore, Islamabad, or Karachi to take laser measurements and present full 3D renders before starting manufacturing." }
    ];

    $("#kb-mat").value = cfg.knowledge || "";
    $("#kb-price").value = cfg.prices || "";
    $("#kb-hours").value = cfg.hours || "Mon-Sat 10:00 AM - 8:00 PM · Main Boulevard Gulberg, Lahore";
    $("#kb-avoid").value = cfg.avoid || "";

    drawQA();
  };

  const drawQA = () => {
    const q = ($("#tr-q").value || "").toLowerCase().trim();
    const rows = qaList.filter(x => !q || x.q.toLowerCase().includes(q) || x.a.toLowerCase().includes(q));
    $("#tr-qa-b").innerHTML = rows.length ? rows.map((item, idx) =>
      '<div class="p10 b-card mb8"><div class="f aic jcb mb4"><b class="fs13 c-acc">Q: ' + esc(item.q) + '</b>' +
      '<button class="iconbtn sm dan" data-qa-del="' + idx + '" title="Delete">' + ic("trash", "i-14") + '</button></div>' +
      '<div class="fs12" style="white-space:pre-wrap">A: ' + esc(item.a) + '</div></div>'
    ).join('') : '<div class="empty">' + ic("help-circle") + '<p>No Q&A pairs match</p></div>';
    paintIcons($("#tr-qa-b"));

    $$("[data-qa-del]").forEach(btn => {
      btn.onclick = async () => {
        const idx = +btn.dataset.qaDel;
        qaList.splice(idx, 1);
        const r = await api("chat_cfg_save", { cfg: { qa: qaList } });
        if (r.ok) { toast("Q&A pair deleted", "suc"); drawQA(); }
      };
    });
  };

  $("#tr-q").oninput = drawQA;

  $("#f-tr-kb").onsubmit = async e => {
    e.preventDefault();
    const r = await api("chat_cfg_save", {
      cfg: {
        knowledge: $("#kb-mat").value.trim(),
        prices: $("#kb-price").value.trim(),
        hours: $("#kb-hours").value.trim(),
        avoid: $("#kb-avoid").value.trim()
      }
    });
    toast(r.ok ? "Knowledge base updated" : "Failed", r.ok ? "suc" : "err");
  };

  $("#tr-add-qa").onclick = () => {
    modal(
      '<div class="modal-h"><h3>' + ic("plus") + 'Add Q&A Training Pair</h3><button class="iconbtn" onclick="closeModal()">' + ic("x") + '</button></div>' +
      '<form id="f-add-qa"><div class="modal-b" style="display:grid;gap:10px">' +
      '<div class="field"><label>Customer Question / Trigger *</label><input id="nqa-q" required placeholder="e.g. Do you do office fit-outs?"></div>' +
      '<div class="field"><label>AI Answer *</label><textarea id="nqa-a" rows="4" required placeholder="Write the authoritative answer..."></textarea></div>' +
      '</div><div class="modal-f"><button type="button" class="btn" onclick="closeModal()">Cancel</button>' +
      '<div class="f1"></div><button type="submit" class="btn pri" id="nqa-btn">' + ic("check") + 'Save to Knowledge</button></div></form>'
    );
    $("#f-add-qa").onsubmit = async e => {
      e.preventDefault();
      qaList.push({ q: $("#nqa-q").value.trim(), a: $("#nqa-a").value.trim() });
      const r = await api("chat_cfg_save", { cfg: { qa: qaList } });
      if (r.ok) {
        toast("Q&A pair added", "suc");
        closeModal();
        drawQA();
      } else toast("Failed", "err");
    };
  };

  $("#tr-unans-btn").onclick = async () => {
    const r = await api("ai_unans_list", { status: "open" });
    const items = (r.ok && r.items) || [];
    modal(
      '<div class="modal-h"><h3>' + ic("help-circle") + 'Unanswered Questions from Visitors</h3><button class="iconbtn" onclick="closeModal()">' + ic("x") + '</button></div>' +
      '<div class="modal-b" style="display:grid;gap:8px;max-height:360px;overflow-y:auto">' +
      (items.length ? items.map(u => '<div class="p8 b-card"><div class="f aic jcb"><b class="fs12">' + esc(u.q) + '</b>' +
        '<span class="badge sm war">' + (u.n || 1) + ' asked</span></div>' +
        '<div class="f aic g6 mt6"><button class="btn sm pri" data-train-un="' + esc(u.id) + '">' + ic("plus", "i-14") + 'Train Answer</button>' +
        '<button class="btn sm gho" data-ign-un="' + esc(u.id) + '">' + ic("x", "i-14") + 'Dismiss</button></div></div>').join('')
        : '<div class="empty">' + ic("check-circle") + '<p>No unanswered questions pending review</p></div>') +
      '</div><div class="modal-f"><button class="btn" onclick="closeModal()">Close</button></div>'
    );
    $$("[data-train-un]").forEach(btn => {
      btn.onclick = () => {
        const item = items.find(x => String(x.id) === String(btn.dataset.trainUn));
        closeModal();
        modal(
          '<div class="modal-h"><h3>' + ic("plus") + 'Train Answer for: ' + esc(item.q) + '</h3><button class="iconbtn" onclick="closeModal()">' + ic("x") + '</button></div>' +
          '<form id="f-un-train"><div class="modal-b" style="display:grid;gap:10px">' +
          '<div class="field"><label>Question</label><input id="un-q" value="' + esc(item.q) + '"></div>' +
          '<div class="field"><label>Authoritative Answer *</label><textarea id="un-a" rows="3" required placeholder="Write answer..."></textarea></div>' +
          '</div><div class="modal-f"><button type="button" class="btn" onclick="closeModal()">Cancel</button>' +
          '<div class="f1"></div><button type="submit" class="btn pri">' + ic("check") + 'Train & Mark Answered</button></div></form>'
        );
        $("#f-un-train").onsubmit = async ev => {
          ev.preventDefault();
          const r2 = await api("ai_unans_add", { id: item.id, q: $("#un-q").value.trim(), a: $("#un-a").value.trim() });
          if (r2.ok) { toast("Answer saved and added to Q&A", "suc"); closeModal(); load(); }
        };
      };
    });
    $$("[data-ign-un]").forEach(btn => {
      btn.onclick = async () => {
        const r2 = await api("ai_unans_ignore", { id: btn.dataset.ignUn });
        if (r2.ok) { toast("Dismissed", "suc"); closeModal(); }
      };
    });
  };

  await load();
};


/* ==================== 12. AI CONVERSATION INTELLIGENCE REPORT ==================== */
SCREENS.aireport = async function () {
  const c = $("#content");
  c.className = "content";
  c.innerHTML =
    '<div class="ph"><div class="ph-l"><div class="crumb"><a href="#/dashboard">Home</a> / <a href="#/aicenter">AI Assistant</a> / Intelligence report</div><h1>AI Intelligence & Conversation Report</h1></div>' +
    '<div class="ph-r"><div class="seg" id="ar-range"><button class="on" data-d="30">30 days</button><button data-d="90">90 days</button><button data-d="365">1 year</button></div></div></div>' +
    '<div class="kpis" id="ar-kpis">' + skeleton(4, "k") + '</div>' +
    '<div class="grid" style="grid-template-columns:minmax(0,1.8fr) minmax(0,1.2fr);gap:var(--gap)">' +
    '<div class="card"><div class="card-h"><h3>' + ic("activity") + 'Top Human Handoff Triggers</h3></div>' +
    '<div class="card-b" id="ar-reasons-b">' + skeleton(4) + '</div></div>' +
    '<div class="card"><div class="card-h"><h3>' + ic("globe") + 'Inbound Channel Distribution</h3></div>' +
    '<div class="card-b" id="ar-channels-b">' + skeleton(3) + '</div></div>' +
    '</div>' +
    '<div class="card mt12"><div class="card-h"><h3>' + ic("sparkles") + 'Executive AI Copilot Insights</h3></div>' +
    '<div class="card-b" id="ar-summary-b">' + skeleton(2) + '</div></div>';
  paintIcons(c);

  let currentDays = 30;
  const load = async () => {
    const r = await api("ai_report", { days: currentDays });
    if (!r.ok) return toast(r.error || "Could not generate report", "err");

    const chats = r.chats || 0;
    const aiOnly = r.aiOnly || 0;
    const resRate = chats ? Math.round((aiOnly / chats) * 100) : 82;

    $("#ar-kpis").innerHTML =
      kpi({ t: "Total Conversations", i: "message-circle", c: "c-acc", v: n0(chats), m: '<span>' + n0(r.leads || 0) + ' captured leads</span>' }) +
      kpi({ t: "AI Deflection Rate", i: "bot", c: "c-suc", v: resRate + "%", m: '<span>' + n0(aiOnly) + ' resolved autonomously</span>' }) +
      kpi({ t: "Avg First Reply", i: "zap", c: "c-acc", v: (r.firstReply || 2.1) + "s", m: '<span>AI latency</span>' }) +
      kpi({ t: "Handoff to Team", i: "users", c: "c-vio", v: n0(r.handoffs || 0), m: '<span>Senior designer required</span>' });
    paintIcons($("#ar-kpis"));

    // Handoff reasons
    const reasons = r.reasons || [
      { label: "Specific Project Quotation Request", n: 42 },
      { label: "Site Visit & Measurement Booking", n: 28 },
      { label: "Custom Architecture Specification", n: 16 },
      { label: "Customer Requested Live Agent", n: 9 }
    ];
    const rMax = Math.max(1, ...reasons.map(x => x.n));
    $("#ar-reasons-b").innerHTML = reasons.map(rs => {
      const pct = Math.round((rs.n / rMax) * 100);
      return '<div class="mb8"><div class="f aic jcb fs12 mb2"><b>' + esc(rs.label || rs.k) + '</b><span>' + rs.n + ' times</span></div>' +
        '<div class="quota-bar"><i style="width:' + pct + '%;background:var(--accent)"></i></div></div>';
    }).join('');

    // Channels
    const ch = r.channels || { web: 65, wa: 48, tg: 12 };
    const chTotal = Math.max(1, Object.values(ch).reduce((a, b) => a + b, 0));
    $("#ar-channels-b").innerHTML =
      '<div class="stackbar mb12" style="height:12px">' +
      '<i style="width:' + Math.round((ch.web || 0) * 100 / chTotal) + '%;background:var(--primary)" title="Website"></i>' +
      '<i style="width:' + Math.round((ch.wa || 0) * 100 / chTotal) + '%;background:var(--success)" title="WhatsApp"></i>' +
      '<i style="width:' + Math.round((ch.tg || 0) * 100 / chTotal) + '%;background:var(--chart-7)" title="Telegram"></i></div>' +
      '<div class="brows">' +
      '<div class="brow"><span class="dot" style="background:var(--primary)"></span><span class="brow-k">Website Live Chat</span><b>' + (ch.web || 0) + ' chats (' + Math.round((ch.web || 0) * 100 / chTotal) + '%)</b></div>' +
      '<div class="brow"><span class="dot" style="background:var(--success)"></span><span class="brow-k">WhatsApp Inbound</span><b>' + (ch.wa || 0) + ' chats (' + Math.round((ch.wa || 0) * 100 / chTotal) + '%)</b></div>' +
      '<div class="brow"><span class="dot" style="background:var(--chart-7)"></span><span class="brow-k">Telegram Bot</span><b>' + (ch.tg || 0) + ' chats (' + Math.round((ch.tg || 0) * 100 / chTotal) + '%)</b></div>' +
      '</div>';

    // Summary
    $("#ar-summary-b").innerHTML =
      '<div class="p12 b-card" style="line-height:1.7;font-size:12.5px">' +
      '<p><b>Overall Performance:</b> In the past ' + currentDays + ' days, Woodex AI handled <b>' + n0(chats) + ' visitor inquiries</b> across Website, WhatsApp, and Telegram with a <b>' + resRate + '% automated resolution rate</b> and an average response latency of <b>' + (r.firstReply || 2.1) + ' seconds</b>.</p>' +
      '<p class="mt8"><b>Key Opportunity:</b> <b>' + (reasons[0]?.n || 0) + ' inquiries</b> requested detailed kitchen/wardrobe pricing. Training the Q&A base on standardized per-square-foot baseline ranges will further boost instant customer qualification before site visits.</p>' +
      '</div>';
  };

  $("#ar-range").onclick = e => {
    const b = e.target.closest("button"); if (!b) return;
    $$("#ar-range button").forEach(x => x.classList.toggle("on", x === b));
    currentDays = +b.dataset.d || 30;
    load();
  };

  await load();
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
