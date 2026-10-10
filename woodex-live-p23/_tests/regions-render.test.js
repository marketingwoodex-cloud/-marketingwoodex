/* Woodex v2.6 — Regional Operations headless render test.
 *
 * Purpose: exercise admin/regions-preview.html (the fixture harness for the real
 * admin/admin-regions.js module) across all ten tabs and every Block-1 control, so the
 * module is verified end to end without a MySQL instance or a signed-in session.
 *
 * Run:
 *   1. cd woodex-live-p23 && python3 -m http.server 8102 --bind 0.0.0.0
 *   2. mkdir -p /tmp/pvtest && cd /tmp/pvtest && npm install jsdom --no-audit --no-fund
 *   3. node woodex-live-p23/_tests/regions-render.test.js 8102
 *
 * Exit code 0 = all checks green. Chart.js is stubbed (the vendored UMD build needs a real
 * 2D canvas context) so the assertion surface is DOM + API contract, not canvas pixels.
 */
let jsdom;
try { jsdom = require("jsdom"); } catch (e) { jsdom = require("/tmp/pvtest/node_modules/jsdom"); }
const { JSDOM, VirtualConsole, requestInterceptor } = jsdom;
const PORT = process.argv[2] || process.env.WX_TEST_PORT || "8102";
const BASE = "http://127.0.0.1:" + PORT + "/admin/regions-preview.html";

const chartBlocker = requestInterceptor(request => {
  if (request.url.indexOf("chart.umd.js") > -1) {
    return new Response("/* chart stub for the headless run */", { headers: { "Content-Type": "application/javascript" } });
  }
  return undefined;
});
const errors = [];
const vc = new VirtualConsole();
vc.on("jsdomError", e => { if (!/Could not parse CSS|Not implemented/.test(String(e.message))) errors.push("jsdomError: " + e.message); });
vc.on("error", (...a) => errors.push("console.error: " + a.join(" ")));

const wait = ms => new Promise(r => setTimeout(r, ms));
const fails = [];
const passes = [];
function check(name, cond, extra) { var line = name + (extra ? " → " + extra : ""); (cond ? passes : fails).push(line); console.log((cond ? "  ✓ " : "  ✗ ") + line); }

(async () => {
  const dom = await JSDOM.fromURL(BASE, {
    runScripts: "dangerously", resources: { interceptors: [chartBlocker] }, pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(win) {
      function Chart(el) { this.canvas = el; }
      Chart.prototype.destroy = function () {};
      win.HTMLCanvasElement.prototype.getContext = function () {
        return { createLinearGradient: function () { return { addColorStop: function () {} }; } };
      };
      win.Chart = Chart;
      win.URL.createObjectURL = function () { return "blob:preview"; };
      win.URL.revokeObjectURL = function () {};
      win.onerror = function (m) { errors.push("window.onerror: " + m); };
    }
  });
  const win = dom.window, doc = win.document;
  await wait(2500);

  const q = s => doc.querySelector(s), qa = s => Array.prototype.slice.call(doc.querySelectorAll(s));
  check("boot: node registry loaded", !!q(".rgn-filters"), (q(".rgn-dd-btn b") || {}).textContent);
  check("boot: tab bar rendered", qa("#rg-tabs button").length === 10, String(qa("#rg-tabs button").length) + " tabs");

  async function tab(name, ms) {
    win.location.hash = "#/regional/" + name;
    win.dispatchEvent(new win.Event("hashchange"));
    await wait(ms || 700);
  }

  // 1 dashboard
  await tab("dashboard", 900);
  check("dashboard: 4 KPI values filled", qa("#rg-kpis .rgn-kpi .val").length === 4 && qa("#rg-kpis .rgn-kpi .val").every(e => e.textContent.indexOf("—") < 0), qa("#rg-kpis .val").map(e => e.textContent.trim().slice(0, 26)).join(" | "));
  check("dashboard: 4 spark canvases mounted", qa("#rg-kpis .rgn-spark canvas").length === 4);
  check("dashboard: alert strip", !!q(".rgn-alerts"), (q(".rgn-alerts .rgn-alert b") || {}).textContent);
  check("dashboard: node cards", qa(".rgn-nodes .rgn-node").length > 0, String(qa(".rgn-nodes .rgn-node").length) + " node cards");
  check("dashboard: funnel rows", qa(".rgn-bar").length >= 6);
  check("dashboard: recent leads table", qa(".rgn-table tbody tr").length > 0, String(qa(".rgn-table tbody tr").length) + " rows");

  // 2 pipeline
  await tab("pipeline");
  check("pipeline: swimlanes", qa(".rgn-swim").length > 0, String(qa(".rgn-swim").length) + " zones");
  check("pipeline: kanban lanes", qa(".rgn-kan").length > 0 && qa(".rgn-lane").length % 6 === 0, qa(".rgn-lane").length + " lanes");
  check("pipeline: project cards", qa(".rgn-card").length > 0, String(qa(".rgn-card").length) + " cards");
  const zoneText = qa(".rgn-swim").map(e => e.textContent.trim().split("·")[0].trim()).join(" / ");
  check("pipeline: zone labels", zoneText.indexOf("Zone A") > -1, zoneText);

  // 3 configs
  await tab("configs");
  check("configs: search + facet chips", !!q("#rg-lq") && qa(".rgn-faces .rgn-chip").length >= 10, String(qa(".rgn-faces .rgn-chip").length) + " chips");
  check("configs: paginated table", qa(".rgn-table tbody tr").length > 0, String(qa(".rgn-table tbody tr").length) + " rows/page");
  check("configs: pager", !!q("#rg-next") && !!q("#rg-prev"), (q(".rgn-pager span") || {}).textContent);
  const before = qa(".rgn-table tbody tr").length;
  q("#rg-lq").value = "zzzz-no-match";
  q("#rg-lq").dispatchEvent(new win.Event("input"));
  await wait(600);
  check("configs: search filters rows", qa(".rgn-table tbody tr").length === 1, "rows " + before + " → " + qa(".rgn-table tbody tr").length + " (empty-state row)");
  q("#rg-lq").value = ""; q("#rg-lq").dispatchEvent(new win.Event("input")); await wait(600);

  // 4 projects
  await tab("projects");
  const pRows = qa(".rgn-table tbody tr").length;
  check("projects: register table", pRows > 0, pRows + " rows");
  check("projects: stage segments", qa("#rg-pstage button").length === 7, qa("#rg-pstage button").length + " segments");
  q("#rg-pstage button:nth-child(4)").click(); await wait(700);
  const stageRows = qa(".rgn-table tbody tr").length;
  check("projects: stage filter works", stageRows <= pRows, "filtered " + stageRows + " ≤ " + pRows);
  q("#rg-pstage button:nth-child(1)").click(); await wait(700);

  // 5 approvals
  await tab("approvals");
  check("approvals: timeline rows", qa(".rgn-tl-row").length > 0, String(qa(".rgn-tl-row").length) + " pending milestones");
  check("approvals: approve buttons", qa("[data-ok]").length > 0 && qa("[data-rj]").length > 0);
  const beforeAppr = qa(".rgn-tl-row").length;
  qa("[data-ok]")[0].click(); await wait(900);
  check("approvals: approve posts + refreshes", qa(".rgn-tl-row").length <= beforeAppr, beforeAppr + " → " + qa(".rgn-tl-row").length);

  // 6 ledger
  await tab("ledger");
  check("ledger: kinds + status segs", qa("#rg-lk button").length === 5 && qa("#rg-ls button").length === 4);
  check("ledger: entries table", qa(".rgn-table tbody tr").length > 0, String(qa(".rgn-table tbody tr").length) + " entries");
  const badges = qa(".rgn-faces .badge").map(e => e.textContent.trim()).join(" · ");
  check("ledger: received/receivable/overdue badges", /received .+receivable .+overdue/.test(badges), badges);
  q("#rg-lk button:nth-child(4)").click(); await wait(700);
  check("ledger: kind filter (po) works", qa(".rgn-table tbody tr").length > 0, String(qa(".rgn-table tbody tr").length) + " po rows");
  q("#rg-lk button:nth-child(1)").click(); await wait(700);

  // 7 estimator
  await tab("estimator", 1200);
  const lineRows = qa("#rg-elines .rgn-lines tbody tr").length;
  check("estimator: quotation lines computed", lineRows >= 8, lineRows + " line items");
  check("estimator: sections present", qa("#rg-elines tr.sec").length >= 4, qa("#rg-elines tr.sec").map(r => r.textContent).join(" / "));
  check("estimator: board-foot preview", !!q("#rg-panelbf") && q("#rg-panelbf").textContent.indexOf("bf") > -1, q("#rg-panelbf").textContent.replace(/\s+/g, " ").slice(0, 90));
  check("estimator: reconciliation totals", !!q("#rg-erecon .total"), qa("#rg-erecon .total").map(e => e.textContent.replace(/\s+/g, " ")).join(" | "));
  check("estimator: formula basis strings", qa("#rg-elines .basis").length === qa("#rg-elines tbody tr").length - qa("#rg-elines tbody tr.sec").length, qa("#rg-elines .basis").length + " basis strings");
  const recon = q("#rg-erecon").textContent;
  check("estimator: labour per board foot regional", /Fabrication rate/.test(recon), (recon.match(/Fabrication ratePKR [\d.,]+\/bf/) || [])[0] || "missing");
  // node switch re-prices
  q("#rg-enode").value = "ISB";
  q("#rg-enode").dispatchEvent(new win.Event("change", { bubbles: true })); await wait(1400);
  const isbRecon = q("#rg-erecon").textContent;
  check("estimator: node switch rebinds rates", isbRecon !== recon, "LHR total " + (recon.match(/TotalPKR [\d.,]+ ?C?r?/) || [])[0] + " → ISB " + (isbRecon.match(/TotalPKR [\d.,]+ ?C?r?/) || [])[0]);
  const isbBadge = q(".rgn-block .badge.gold").textContent;
  check("estimator: ISB index 1.12 shown", isbBadge.indexOf("1.12") > -1, isbBadge);
  // create quotation
  q("#rg-equote").click(); await wait(200);
  check("estimator: quote form opens", !q("#rg-equoteform").hidden);
  q("#rg-qname").value = "Preview Client";
  q("#rg-qproject").value = "1 Kanal turnkey interior";
  q("#rg-qarea").value = "DHA";
  q("#rg-qsave").click(); await wait(900);
  const out = q("#rg-qout").textContent;
  check("estimator: quotation created", /Quotation WI-/.test(out), out.replace(/\s+/g, " ").slice(0, 150));
  check("estimator: project + milestones seeded", /milestones/.test(out), (out.match(/Project [A-Z]{3}-\d\d-\d+ created with \d+ milestones/) || [])[0] || "no project note");

  // 8 rates
  await tab("rates", 1100);
  check("rates: 21 service×finish rows", qa("[data-rate]").length === 21, qa("[data-rate]").length + " rows");
  check("rates: node segment", qa("#rg-rnode button").length === 12);
  check("rates: species override matrix", qa("[data-var]").length === 8, qa("[data-var]").length + " species rows");
  check("rates: formula reference block", /board_feet_metric/.test(q(".rgn-recon").textContent), (q(".rgn-block .rgn-recon") || {}).textContent ? "present" : "missing");
  const firstRate = q('[data-rate] [data-k="base_rate"]');
  firstRate.value = String(Number(firstRate.value) + 111);
  q("[data-save]").click(); await wait(800);
  check("rates: inline save posts", doc.querySelector("#pv-toast").textContent.indexOf("Rate card saved") > -1, doc.querySelector("#pv-toast").textContent);
  const varInput = q('[data-var="walnut-us-fas"] [data-k="rate_bf"]');
  varInput.value = "5100";
  q('[data-var="walnut-us-fas"] [data-vsave]').click(); await wait(800);
  check("rates: variant override saved", doc.querySelector("#pv-toast").textContent.indexOf("Override saved") > -1, doc.querySelector("#pv-toast").textContent);
  qa("#rg-rnode button")[1].click(); await wait(1000);
  check("rates: node switch reloads book", qa("[data-rate]").length === 21 && q(".rgn-faces .badge.gold").textContent.indexOf("1.12") > -1, q(".rgn-faces .badge.gold").textContent);

  // 9 reports
  await tab("reports", 1000);
  check("reports: 12-month matrix", qa(".rgn-table tbody tr").length === 12, qa(".rgn-table tbody tr").length + " month rows");
  check("reports: node ranking", qa(".rgn-node").length >= 1, qa(".rgn-node").length + " ranked nodes (node filter is global)");
  check("reports: best/weakest footer", /Best node .+ weakest/.test(doc.body.textContent), (doc.body.textContent.match(/Best node .+?\./) || [])[0] || "missing");

  // 10 health
  await tab("health", 900);
  const hrows = qa(".rgn-hrow").length;
  check("health: check rows", hrows === 15, hrows + " checks");
  check("health: score ring", !!q(".rgn-score .ring span"), (q(".rgn-score .ring span") || {}).textContent);
  check("health: grouped swimlanes", qa(".rgn-swim").length >= 5, qa(".rgn-swim").map(e => e.textContent.split("·")[0].trim()).join(" / "));

  // export + refresh + preset + node multiselect from the shell
  await tab("configs");
  q("#rg-export").click(); await wait(600);
  check("shell: CSV export builds filename", doc.querySelector("#pv-toast").textContent.indexOf("Exported") > -1, doc.querySelector("#pv-toast").textContent);
  const boots = win.__pvCalls.rgn_boot || 0;
  q("#rg-refresh").click(); await wait(1400);
  check("shell: refresh re-boots the registry", (win.__pvCalls.rgn_boot || 0) > boots, "rgn_boot calls " + boots + " → " + (win.__pvCalls.rgn_boot || 0));
  check("shell: refresh keeps KPIs filled", qa("#rg-kpis .rgn-kpi .val").every(e => e.textContent.indexOf("—") < 0));

  // tab buttons must keep working after the tab bar is re-rendered by load()
  const tabBtn = doc.querySelector('#rg-tabs button[data-tab="ledger"]');
  tabBtn.click(); await wait(900);
  check("shell: tab click switches canvas", win.location.hash === "#/regional/ledger" && !!q(".rgn-table"), win.location.hash + " · table " + (!!q(".rgn-table")));
  const tabBtn2 = doc.querySelector('#rg-tabs button[data-tab="estimator"]');
  tabBtn2.click(); await wait(1300);
  check("shell: second tab click still alive", win.location.hash === "#/regional/estimator" && !!q("#rg-elines"), win.location.hash);
  q("#rg-preset button[data-preset='7d']").click(); await wait(900);
  check("shell: preset switch reloads", q("#rg-preset button.on[data-preset='7d']") !== null, "7d active");
  q("#rg-dnbtn").click();
  const box = q('#rg-dnmenu input[data-node="KHI"]');
  box.checked = true; box.dispatchEvent(new win.Event("change", { bubbles: true })); await wait(900);
  check("shell: node multi-select routes", q(".rgn-dd-btn b").textContent.indexOf("Karachi") > -1, q(".rgn-dd-btn b").textContent);
  q("#rg-nnone").click(); await wait(900);
  check("shell: clear nodes → all 12", /All 12 nodes/.test(q(".rgn-dd-btn b").textContent), q(".rgn-dd-btn b").textContent);

  // charts: canvases must stay attached and unique per paint
  const canvases = qa("canvas");
  check("charts: no duplicated canvases", canvases.length === new Set(canvases).size, canvases.length + " canvases");
  check("charts: all canvases attached", canvases.every(c => doc.contains(c)), canvases.filter(c => !doc.contains(c)).length + " detached");
  check("no runtime errors", errors.length === 0, errors.slice(0, 6).join(" || ") || "clean");

  console.log("\n===== PASS " + passes.length + " =====");
  passes.forEach(p => console.log("  ✓ " + p));
  console.log("\n===== FAIL " + fails.length + " =====");
  fails.forEach(f => console.log("  ✗ " + f));
  await dom.window.close();
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error("harness crashed:", e); process.exit(2); });
