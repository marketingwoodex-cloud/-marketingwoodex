// P22 re-verification: runtime secret-leak + role test against the local preview server.
//   node tools/frontend-v1-server.mjs        (port 8080)
//   node tools/phplint/p22re/p22re-leak.mjs
// Saves a DUMMY connector secret + SMTP password as owner, then proves no read
// action returns them, that Sales is refused on owner-only actions, and that
// signed-out requests are refused.
const B = process.env.WX_API || "http://127.0.0.1:8080/api/admin.php";
const call = async (action, tok, o = {}) => {
  const r = await fetch(B, { method: "POST", headers: { "content-type": "application/json", ...(tok ? { "X-WX-ADM": tok } : {}) }, body: JSON.stringify({ action, ...o }) });
  return { s: r.status, j: await r.json().catch(() => ({})) };
};
const DUMMY = "DUMMY-SECRET-abc123XYZ789";
const DUM_SMTP = "SMTPPASS-dummy-9988";
const st = await call("status");
if (st.j.needsSetup) await call("setup", null, { builderPassword: "Woodex@2026", name: "Owner", email: "o@woodex.pk", password: "Woodex@2026x" });
const own = (await call("login", null, { email: "o@woodex.pk", password: "Woodex@2026x" })).j.token;
await call("user_save", own, { name: "QA Sales", email: "qa.sales@woodex.pk", role: "sales", password: "Sales@2026xx", active: true });
const sal = (await call("login", null, { email: "qa.sales@woodex.pk", password: "Sales@2026xx" })).j.token;

const leaks = [];
const scan = (name, body) => { const t = JSON.stringify(body); for (const d of [DUMMY, DUM_SMTP]) if (t.includes(d)) leaks.push(`${name} leaked ${d}`); };

// 1. save a dummy Gmail secret + SMTP password as owner
const sv = await call("conn_save", own, { key: "gmail", account: "owner@gmail.com", secret: DUMMY, name: "Gmail" });
scan("conn_save response", sv.j);
const sv2 = await call("set_smtp_save", own, { host: "smtp.gmail.com", port: 587, user: "owner@gmail.com", pass: DUM_SMTP, from: "info@woodex.com.pk" }).catch(() => null);

// 2. every read action an owner can call
const reads = ["conn_list", "set_get", "crm_settings", "health_get", "sec_get", "me"];
for (const a of reads) {
  const r = await call(a, own);
  scan(`${a} (owner)`, r.j);
  if (a === "conn_list") console.log("conn_list item:", JSON.stringify((r.j.items || []).map((x) => ({ key: x.key, hasSecret: x.hasSecret, secret: x.secret }))));
  if (a === "set_get") console.log("set_get smtpPassSet:", r.j.smtpPassSet, "| raw pass present:", JSON.stringify(r.j).includes(DUM_SMTP));
}

// 3. Sales must be refused on owner-only actions
for (const a of ["conn_save", "conn_list", "set_get", "user_save", "backup_run"]) {
  const r = await call(a, sal, { key: "gmail", account: "x@y.z", secret: DUMMY });
  const refused = r.s === 403 || /permission|only|refused|denied|Not allowed/i.test(r.j.error || "") || r.j.ok === false;
  console.log(`sales → ${a}: HTTP ${r.s} ${refused ? "REFUSED" : "*** ALLOWED ***"} ${JSON.stringify(r.j).slice(0, 90)}`);
}

// 4. signed-out reads
for (const a of ["conn_list", "set_get", "user_list", "leads_list", "chat_list"]) {
  const r = await call(a, null);
  const refused = r.s === 401 || r.s === 403 || /sign|permission|refused|denied/i.test(r.j.error || "");
  console.log(`signed-out → ${a}: HTTP ${r.s} ${refused ? "REFUSED" : "*** OPEN ***"} ${JSON.stringify(r.j).slice(0, 90)}`);
}

console.log("\n=== SECRET LEAKS:", leaks.length ? leaks.join("\n") : "NONE ===");
