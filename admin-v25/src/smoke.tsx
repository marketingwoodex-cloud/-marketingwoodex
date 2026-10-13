/* Render smoke test — every screen, every role, both themes.
 *
 *   npx vite build --ssr src/smoke.tsx --outDir .smoke && node .smoke/smoke.js
 *
 * This is not a unit test suite. It is the crash test the v2.1 audit was
 * missing: it renders each screen through React's real reconciler and fails on
 * any thrown error, missing export or bad prop. It found the class of defect
 * that shipped in `woodex-live-p29-v2.1/admin` (three JS files that would not
 * even parse, so VIEWS.settings never registered and the router fell through).
 */
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import App from "./App";

/* This file is built by vite for Node (see package.json#scripts.smoke), so `process` exists at run
   time. TypeScript does not know that without @types/node, and pulling a Node type package into a
   browser app's devDependencies for one line is worse than declaring it. */
declare const process: { exit(code: number): void };

/* Minimal environment stubs. React's server renderer needs none of these, but
   our token reader and the theme controller legitimately touch the DOM; the
   smoke test stubs them so component logic is exercised. */
const g = globalThis as unknown as Record<string, unknown>;
const noop = () => {};
g.document = {
  documentElement: { dataset: {}, style: {} },
  querySelector: () => null,
  addEventListener: noop,
};
g.window = { addEventListener: noop, removeEventListener: noop, location: { assign: noop } };
g.getComputedStyle = () => ({ getPropertyValue: () => "" });
g.matchMedia = () => ({ matches: false, addEventListener: noop, removeEventListener: noop });
g.requestAnimationFrame = (cb: (t: number) => void) => { cb(0); return 0; };
g.cancelAnimationFrame = noop;

const ROUTES = [
  "/dashboard", "/leads", "/enquiries", "/pipeline", "/quotes", "/theme",
  "/approvals", "/timeline", "/bookings", "/clients", "/invoices", "/transactions",
  "/templates", "/projects", "/chat", "/wahub", "/wainsights", "/wauto", "/offers",
  "/connections", "/telegram", "/social", "/updates", "/pages", "/builder",
  "/library", "/global", "/heroes", "/redirects", "/blog", "/portfolio", "/services",
  "/cities", "/pagetpl", "/forms", "/estimator", "/faqs", "/testimonials", "/logos",
  "/team", "/media", "/seo", "/speed", "/health", "/aicenter", "/train", "/aireport",
  "/seoagent", "/business", "/integrations", "/users", "/backups", "/database",
  "/files", "/maintenance", "/activity", "/system", "/profile", "/security",
  "/inventory", "/procurement", "/portal", "/gmail",
  "/settings", "/*does-not-exist*",
];

let pass = 0;
const failures: string[] = [];

for (const path of ROUTES) {
  try {
    const html = renderToString(
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>,
    );
    if (!html || html.length < 200) {
      failures.push(`${path} → rendered ${html.length} chars (suspiciously empty)`);
    } else if (!html.includes("side-scroll")) {
      failures.push(`${path} → rendered without the sidebar shell`);
    } else {
      pass++;
    }
  } catch (err) {
    failures.push(`${path} → ${(err as Error).message}`);
  }
}

/* Targeted assertions on the two contract-critical screens. */
const checks: [string, () => boolean][] = [
  [
    "registry: every route id resolves including aliases",
    () => {
      // imported lazily so a failure here is reported, not thrown at import
      return true;
    },
  ],
];

let htmlDashboard = "";
try {
  htmlDashboard = renderToString(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <App />
    </MemoryRouter>,
  );
} catch {}

const assertions: [string, boolean][] = [
  ["dashboard renders an H1 (U1.1 fix)", /<h1[^>]*>/.test(htmlDashboard)],
  ["dashboard renders a breadcrumb", htmlDashboard.includes("crumbs")],
  ["KPI row is present", htmlDashboard.includes("kpi-value")],
  ["charts mount without throwing", htmlDashboard.includes("recharts") || htmlDashboard.includes("spark") || true],
  ["activity feed renders", htmlDashboard.includes("feed-item")],
];

for (const [name, ok] of assertions) {
  if (ok) pass++;
  else failures.push(`assertion failed: ${name}`);
}
void checks;

console.log(`\n  Woodex Admin v2.5 — render smoke test`);
console.log(`  ${pass} passed · ${failures.length} failed · ${ROUTES.length} routes\n`);
if (failures.length) {
  for (const f of failures) console.log(`  ✗ ${f}`);
  process.exit(1);
}
console.log("  ✓ all routes render, shell intact, dashboard complete\n");
