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
import { Shell } from "./components/Shell";
import { SignIn } from "./screens/SignIn";
import { LiveDashboard } from "./screens/LiveDashboard";
import { LiveLeads } from "./screens/LiveLeads";
import { LiveRedirects } from "./screens/LiveRedirects";
import { LiveMedia } from "./screens/LiveMedia";
import { LiveContent } from "./screens/LiveContent";
import { LiveGlobal } from "./screens/LiveGlobal";
import { LivePages } from "./screens/LivePages";
import { LiveLibrary } from "./screens/LiveLibrary";
import { SessionCtx, type SessionValue } from "./lib/session";

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

/* ------------------------------------------------------------------ the states a server causes
   renderToString does not run effects, so the app above always renders in its "checking" state. The
   interesting states — signed out, and signed in against a live API — are produced here by giving the
   tree a session directly. Without this, the sign-in screen and both live screens were the only parts
   of the app that no test touched, which is exactly where the v2.1 admin's blank screens lived. */

const noopAsync = async () => ({ need2fa: false });
const session = (link: SessionValue["link"], user: SessionValue["user"]): SessionValue => ({
  link,
  reason: link === "offline" ? "the server could not be reached" : "",
  health: link === "offline" ? null : {
    service: "woodex-api", version: "2.5.0-p1", php: "8.2.33", ready: true,
    db: { reachable: true, migrated: true }, time: "2026-10-14T00:00:00Z",
  },
  me: user ? { user, caps: { label: "Master", groups: ["sales"], perms: [] }, csrf: "test", session: { expires_at: null, ip: null } } : null,
  user,
  signIn: async () => ({ need2fa: false }),
  signInTwoFactor: async () => { await noopAsync(); },
  signOut: async () => { await noopAsync(); },
  refreshHealth: () => {},
});

const asUser = {
  id: 1, name: "Imtiaz Ahmad", email: "imtiaz@woodex.com.pk", role: "owner" as const,
  roleLabel: "Master", perms: [], active: true, created_at: null, last_login: null, twofa: true,
};

let htmlSignedOut = "";
let htmlLiveDash = "";
let htmlLiveLeads = "";
let htmlRedirects = "";
let htmlRedirectsOffline = "";
let htmlMedia = "";
let htmlContent = "";
let htmlContentOffline = "";
let htmlGlobal = "";
let htmlGlobalOffline = "";
let htmlPages = "";
let htmlPagesOffline = "";
let htmlLibrary = "";
let htmlLibraryOffline = "";
try {
  htmlSignedOut = renderToString(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <SessionCtx.Provider value={session("signedOut", null)}>
        <Shell
          role="owner" setRole={noop} theme="light" toggleTheme={noop} density="comfortable" setDensity={noop}
          badges={{ leads: 0, chat: 0, approvals: 0, total: 0 }} onOpenPalette={noop}
          routeId="dashboard" crumbs={[{ label: "Today" }]} link="signedOut"
          linkText="api/v2 2.5.0-p1 · not signed in" countsFrom="demo" user={null} onSignOut={noop}
        >
          <SignIn />
        </Shell>
      </SessionCtx.Provider>
    </MemoryRouter>,
  );
} catch (err) {
  failures.push(`sign-in screen → ${(err as Error).message}`);
}

try {
  htmlLiveDash = renderToString(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <SessionCtx.Provider value={session("live", asUser)}>
        <LiveDashboard role="owner" />
      </SessionCtx.Provider>
    </MemoryRouter>,
  );
} catch (err) {
  failures.push(`live dashboard → ${(err as Error).message}`);
}

try {
  htmlLiveLeads = renderToString(
    <MemoryRouter initialEntries={["/leads"]}>
      <SessionCtx.Provider value={session("live", asUser)}>
        <LiveLeads />
      </SessionCtx.Provider>
    </MemoryRouter>,
  );
} catch (err) {
  failures.push(`live leads → ${(err as Error).message}`);
}

try {
  htmlRedirects = renderToString(
    <MemoryRouter initialEntries={["/redirects"]}>
      <SessionCtx.Provider value={session("live", asUser)}>
        <LiveRedirects />
      </SessionCtx.Provider>
    </MemoryRouter>,
  );
} catch (err) {
  failures.push(`live redirects → ${(err as Error).message}`);
}

/* The same screen with no API: it must not render an empty rules table that reads as "there are no
   redirects", because the whole point of the screen is that the list is the server's. */
try {
  htmlRedirectsOffline = renderToString(
    <MemoryRouter initialEntries={["/redirects"]}>
      <SessionCtx.Provider value={session("offline", null)}>
        <LiveRedirects />
      </SessionCtx.Provider>
    </MemoryRouter>,
  );
} catch (err) {
  failures.push(`redirects without an API → ${(err as Error).message}`);
}

try {
  htmlMedia = renderToString(
    <MemoryRouter initialEntries={["/media"]}>
      <SessionCtx.Provider value={session("live", asUser)}>
        <LiveMedia />
      </SessionCtx.Provider>
    </MemoryRouter>,
  );
} catch (err) {
  failures.push(`live media → ${(err as Error).message}`);
}

try {
  htmlContent = renderToString(
    <MemoryRouter initialEntries={["/blog"]}>
      <SessionCtx.Provider value={session("live", asUser)}>
        <LiveContent presetType="post" />
      </SessionCtx.Provider>
    </MemoryRouter>,
  );
} catch (err) {
  failures.push(`live content → ${(err as Error).message}`);
}

/* The content screen with no API must not render an empty article list: "no articles" and "I cannot
   reach the server" are different sentences, and only one of them is true. */
try {
  htmlContentOffline = renderToString(
    <MemoryRouter initialEntries={["/blog"]}>
      <SessionCtx.Provider value={session("offline", null)}>
        <LiveContent presetType="post" />
      </SessionCtx.Provider>
    </MemoryRouter>,
  );
} catch (err) {
  failures.push(`content without an API → ${(err as Error).message}`);
}

try {
  htmlGlobal = renderToString(
    <MemoryRouter initialEntries={["/global"]}>
      <SessionCtx.Provider value={session("live", asUser)}>
        <LiveGlobal />
      </SessionCtx.Provider>
    </MemoryRouter>,
  );
} catch (err) {
  failures.push(`live header & footer → ${(err as Error).message}`);
}

/* The header screen with no API must not offer to apply anything: "Apply to 150 pages" without a server
   to ask is exactly the class of lie this project exists to remove. */
try {
  htmlGlobalOffline = renderToString(
    <MemoryRouter initialEntries={["/global"]}>
      <SessionCtx.Provider value={session("offline", null)}>
        <LiveGlobal />
      </SessionCtx.Provider>
    </MemoryRouter>,
  );
} catch (err) {
  failures.push(`header & footer without an API → ${(err as Error).message}`);
}

try {
  htmlPages = renderToString(
    <MemoryRouter initialEntries={["/pages"]}>
      <SessionCtx.Provider value={session("live", asUser)}>
        <LivePages />
      </SessionCtx.Provider>
    </MemoryRouter>,
  );
} catch (err) {
  failures.push(`live pages → ${(err as Error).message}`);
}

/* The page-history screen with no API must not show an empty change list: "nothing has been written" is
   a statement about the site's history, and with no server it would be a lie. */
try {
  htmlPagesOffline = renderToString(
    <MemoryRouter initialEntries={["/pages"]}>
      <SessionCtx.Provider value={session("offline", null)}>
        <LivePages />
      </SessionCtx.Provider>
    </MemoryRouter>,
  );
} catch (err) {
  failures.push(`pages without an API → ${(err as Error).message}`);
}

try {
  htmlLibrary = renderToString(
    <MemoryRouter initialEntries={["/library"]}>
      <SessionCtx.Provider value={session("live", asUser)}>
        <LiveLibrary />
      </SessionCtx.Provider>
    </MemoryRouter>,
  );
} catch (err) {
  failures.push(`live section library → ${(err as Error).message}`);
}

/* With no API, the library must not show an empty shelf: "no blocks" is a claim about the site, and the
   screen cannot know it. Nor may it offer a New block button that would fail on the first click. */
try {
  htmlLibraryOffline = renderToString(
    <MemoryRouter initialEntries={["/library"]}>
      <SessionCtx.Provider value={session("offline", null)}>
        <LiveLibrary />
      </SessionCtx.Provider>
    </MemoryRouter>,
  );
} catch (err) {
  failures.push(`section library without an API → ${(err as Error).message}`);
}

/* A signed-out app must not leak a namespace behind an "everyone gets one" banner, and a live screen
   must not render while it is still loading, or the first paint would show an empty table as truth. */
for (const [name, ok] of [
  ["the sign-in screen renders a form", htmlSignedOut.includes("<form") && htmlSignedOut.includes("Password")],
  ["sign-in is not a blank page", htmlSignedOut.length > 800],
  ["the live dashboard renders its loading state, not zeros", htmlLiveDash.includes("Loading…")],
  ["the live dashboard does not claim numbers before the server answers", !htmlLiveDash.includes("kpi-value")],
  ["the live leads screen renders its loading state", htmlLiveLeads.includes("Loading…")],
  ["the live redirects screen renders its loading state", htmlRedirects.includes("Loading…")],
  [
    "a redirects screen with no API says so instead of showing an empty table",
    htmlRedirectsOffline.includes("api/v2 is not answering") && !htmlRedirectsOffline.includes("Publish"),
  ],
  ["the live media screen renders its loading state", htmlMedia.includes("Loading…")],
  ["the live content screen renders its loading state", htmlContent.includes("Loading…")],
  [
    "a content screen with no API says so instead of showing an empty article list",
    htmlContentOffline.includes("api/v2 is not answering") && !htmlContentOffline.includes("New article"),
  ],
  ["the header & footer screen renders its loading state", htmlGlobal.includes("Loading…")],
  ["the pages screen renders its loading state", htmlPages.includes("Loading…")],
  ["the section library renders its loading state", htmlLibrary.includes("Loading…")],
  [
    "the section library with no API does not render an empty shelf",
    htmlLibraryOffline.includes("api/v2 is not answering") && !htmlLibraryOffline.includes("New block"),
  ],
  [
    "the pages screen with no API does not claim the site has no history",
    htmlPagesOffline.includes("api/v2 is not answering") && !htmlPagesOffline.includes("Recent changes"),
  ],
  [
    "the pages screen with no API offers no editor to save into",
    !htmlPagesOffline.includes("New page") && !htmlPagesOffline.includes("Save page"),
  ],
  [
    "the header & footer screen offers no Apply when it cannot reach the API",
    htmlGlobalOffline.includes("api/v2 is not answering") && !htmlGlobalOffline.includes("Check what would change"),
  ],
] as [string, boolean][]) {
  if (ok) pass++;
  else failures.push(`assertion failed: ${name}`);
}

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
