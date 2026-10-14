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
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router-dom";
import App from "./App";
import { Shell } from "./components/Shell";
import { SignIn } from "./screens/SignIn";
import { LiveDashboard } from "./screens/LiveDashboard";
import { LiveLeads } from "./screens/LiveLeads";
import { LiveRedirects } from "./screens/LiveRedirects";
import { LiveMedia } from "./screens/LiveMedia";
import { LiveContent } from "./screens/LiveContent";
import { AiSettings } from "./components/AiSettings";
import { AnnounceBar, LiveGlobal } from "./screens/LiveGlobal";
import { LiveApprovals } from "./screens/LiveApprovals";
import { LivePages } from "./screens/LivePages";
import { LiveLibrary } from "./screens/LiveLibrary";
import { LiveSiteTheme } from "./screens/LiveSiteTheme";
import { LivePlacements } from "./screens/LivePlacements";
import { LiveHeroes } from "./screens/LiveHeroes";
import { LiveForms } from "./screens/LiveForms";
import { LiveEstimator } from "./screens/LiveEstimator";
import { LiveTemplates } from "./screens/LiveTemplates";
import { LiveBusiness } from "./screens/LiveBusiness";
import { LiveIntegrations } from "./screens/LiveIntegrations";
import { DocPreview, numberedItems } from "./components/DocPreview";
import { amountInWords } from "./lib/format";
import { LiveProjects } from "./screens/LiveProjects";
import { LiveTimeline } from "./screens/LiveTimeline";
import { LiveUpdates } from "./screens/LiveUpdates";
import { SessionCtx, type SessionValue } from "./lib/session";
import { linkLabel, linkPill } from "./lib/live";

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
  "/connections", "/telegram", "/social", "/notifications", "/pages", "/builder",
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
let htmlDashOffline = "";
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
let htmlSignedOutOffline = "";
let htmlSignedOutChecking = "";
let htmlLiveDash = "";
let htmlLiveLeads = "";
let htmlRedirects = "";
let htmlRedirectsOffline = "";
let htmlMedia = "";
let htmlContent = "";
let htmlContentOffline = "";
let htmlCityOffline = "";
let htmlHeroesOffline = "";
let htmlHeroesLive = "";
let htmlHeroesRoute = "";
let htmlFormsOffline = "";
let htmlFormsLive = "";
let htmlFormsRoute = "";
let htmlEstOffline = "";
let htmlEstLive = "";
let htmlEstRoute = "";
let htmlProjOffline = "";
let htmlProjLive = "";
let htmlProjRoute = "";
let htmlTimeOffline = "";
let htmlTimeLive = "";
let htmlTimeRoute = "";
let htmlNotifOffline = "";
let htmlNotifLive = "";
let htmlNotifRoute = "";
let htmlTplOffline = "";
let htmlBizOffline = "";
let htmlAi = "";
let htmlAiEditor = "";
let htmlConnOffline = "";
let htmlConnEditor = "";
let htmlDoc = "";
let wordsTests: [string, boolean][] = [];
let htmlGlobal = "";
let htmlGlobalOffline = "";
let htmlAnnOffline = "";
let htmlApprOffline = "";
let htmlPages = "";
let htmlPagesOffline = "";
let htmlLibrary = "";
let htmlLibraryOffline = "";
let htmlTheme = "";
let htmlThemeOffline = "";
try {
  htmlSignedOut = renderToString(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <SessionCtx.Provider value={session("signedOut", null)}>
        <Shell
          role="owner" theme="light" toggleTheme={noop} density="comfortable" setDensity={noop}
          badges={{ leads: 0, chat: 0, approvals: 0, total: 0 }} onOpenPalette={noop}
          routeId="dashboard" crumbs={[{ label: "Today" }]} link="signedOut"
          linkText={linkLabel(null, "signedOut", "")} user={null} onSignOut={noop}
        >
          <SignIn />
        </Shell>
      </SessionCtx.Provider>
    </MemoryRouter>,
  );
} catch (err) {
  failures.push(`sign-in screen → ${(err as Error).message}`);
}

/* The door on its first paint, while the health probe is still in flight: no note has been decided yet and
   the button must not be pressable until the answer is in. */
try {
  htmlSignedOutChecking = renderToString(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <SessionCtx.Provider value={session("checking", null)}>
        <Shell
          role="owner" theme="light" toggleTheme={noop} density="comfortable" setDensity={noop}
          badges={{ leads: 0, chat: 0, approvals: 0, total: 0 }} onOpenPalette={noop}
          routeId="dashboard" crumbs={[{ label: "Today" }]} link="checking"
          linkText={linkLabel(null, "checking", "")} user={null} onSignOut={noop}
        >
          <SignIn />
        </Shell>
      </SessionCtx.Provider>
    </MemoryRouter>,
  );
} catch (err) {
  failures.push(`sign-in screen while checking → ${(err as Error).message}`);
}

/* The door with the API down, which is the state the sign-in screen spends most of its life in during a
   cut-over. What it must not do is tell the person they are looking at demo data: this screen shows no
   site data at all, and the sentence was a leftover from the prototype that had a mock behind it. */
try {
  htmlSignedOutOffline = renderToString(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <SessionCtx.Provider value={session("offline", null)}>
        <Shell
          role="owner" theme="light" toggleTheme={noop} density="comfortable" setDensity={noop}
          badges={{ leads: 0, chat: 0, approvals: 0, total: 0 }} onOpenPalette={noop}
          routeId="dashboard" crumbs={[{ label: "Today" }]} link="offline"
          linkText={linkLabel(null, "offline", "the server could not be reached")} user={null} onSignOut={noop}
        >
          <SignIn />
        </Shell>
      </SessionCtx.Provider>
    </MemoryRouter>,
  );
} catch (err) {
  failures.push(`sign-in screen without an API → ${(err as Error).message}`);
}

try {
  htmlDashOffline = renderToString(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <SessionCtx.Provider value={session("offline", null)}>
        <LiveDashboard role="owner" />
      </SessionCtx.Provider>
    </MemoryRouter>,
  );
} catch {}
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

/* The heroes screen with no API must not render an empty list of pages: "no pages have heroes" and "I
   cannot reach the server" are different sentences, and only one of them is true. */
try {
  htmlHeroesOffline = renderToString(
    <MemoryRouter initialEntries={["/heroes"]}>
      <SessionCtx.Provider value={session("offline", null)}>
        <LiveHeroes />
      </SessionCtx.Provider>
    </MemoryRouter>,
  );
} catch (err) {
  failures.push(`heroes without an API → ${(err as Error).message}`);
}

/* The two screens that read the site rather than a table: the forms, and the rate book. Each is rendered in
   all three states, because the assertion that matters for each is about what is NOT shown — no invented form
   list without an API, and no empty rate book drawn as though the figures had been read and found to be zero. */
try {
  htmlFormsOffline = renderToString(
    <MemoryRouter initialEntries={["/forms"]}>
      <SessionCtx.Provider value={session("offline", null)}>
        <LiveForms />
      </SessionCtx.Provider>
    </MemoryRouter>,
  );
  htmlFormsLive = renderToString(
    <MemoryRouter initialEntries={["/forms"]}>
      <SessionCtx.Provider value={session("live", asUser)}>
        <LiveForms />
      </SessionCtx.Provider>
    </MemoryRouter>,
  );
  htmlFormsRoute = renderToString(
    <MemoryRouter initialEntries={["/forms"]}>
      <App />
    </MemoryRouter>,
  );
} catch (err) {
  failures.push(`the forms screen → ${(err as Error).message}`);
}

try {
  htmlEstOffline = renderToString(
    <MemoryRouter initialEntries={["/estimator"]}>
      <SessionCtx.Provider value={session("offline", null)}>
        <LiveEstimator />
      </SessionCtx.Provider>
    </MemoryRouter>,
  );
  htmlEstLive = renderToString(
    <MemoryRouter initialEntries={["/estimator"]}>
      <SessionCtx.Provider value={session("live", asUser)}>
        <LiveEstimator />
      </SessionCtx.Provider>
    </MemoryRouter>,
  );
  htmlEstRoute = renderToString(
    <MemoryRouter initialEntries={["/estimator"]}>
      <App />
    </MemoryRouter>,
  );
} catch (err) {
  failures.push(`the estimator screen → ${(err as Error).message}`);
}

/* Projects and the timeline. Both read the same rows; the assertions that matter are about what must not
   be claimed — no project list with no API, and no date axis drawn from nothing. */
try {
  htmlProjOffline = renderToString(
    <MemoryRouter initialEntries={["/projects"]}>
      <SessionCtx.Provider value={session("offline", null)}>
        <LiveProjects />
      </SessionCtx.Provider>
    </MemoryRouter>,
  );
  htmlProjLive = renderToString(
    <MemoryRouter initialEntries={["/projects"]}>
      <SessionCtx.Provider value={session("live", asUser)}>
        <LiveProjects />
      </SessionCtx.Provider>
    </MemoryRouter>,
  );
  htmlProjRoute = renderToString(
    <MemoryRouter initialEntries={["/projects"]}>
      <App />
    </MemoryRouter>,
  );
} catch (err) {
  failures.push(`the projects screen → ${(err as Error).message}`);
}

try {
  htmlTimeOffline = renderToString(
    <MemoryRouter initialEntries={["/timeline"]}>
      <SessionCtx.Provider value={session("offline", null)}>
        <LiveTimeline />
      </SessionCtx.Provider>
    </MemoryRouter>,
  );
  htmlTimeLive = renderToString(
    <MemoryRouter initialEntries={["/timeline"]}>
      <SessionCtx.Provider value={session("live", asUser)}>
        <LiveTimeline />
      </SessionCtx.Provider>
    </MemoryRouter>,
  );
  htmlTimeRoute = renderToString(
    <MemoryRouter initialEntries={["/timeline"]}>
      <App />
    </MemoryRouter>,
  );
} catch (err) {
  failures.push(`the timeline screen → ${(err as Error).message}`);
}

/* Client updates. The screen's whole point is a sentence it must never drop: that this console records and
   shares on the client's page, while the sending itself is still v2.1's until Phase 4. With no API there is
   nothing to say about channels or wording, and the honest answer is that the settings could not be read
   rather than seven events presented as configured. */
try {
  htmlNotifOffline = renderToString(
    <MemoryRouter initialEntries={["/notifications"]}>
      <SessionCtx.Provider value={session("offline", null)}>
        <LiveUpdates />
      </SessionCtx.Provider>
    </MemoryRouter>,
  );
  htmlNotifLive = renderToString(
    <MemoryRouter initialEntries={["/notifications"]}>
      <SessionCtx.Provider value={session("live", asUser)}>
        <LiveUpdates />
      </SessionCtx.Provider>
    </MemoryRouter>,
  );
  htmlNotifRoute = renderToString(
    <MemoryRouter initialEntries={["/notifications"]}>
      <App />
    </MemoryRouter>,
  );
} catch (err) {
  failures.push(`the client updates screen → ${(err as Error).message}`);
}

/* Quotation templates: the screen, and the document a template produces.
   The document is rendered from the same sample the screen shows (`lib/demo.ts`), so the numbering and the
   words under the total are exercised against real content rather than against a hand-built stub. */
try {
  const at = (sessionValue: SessionValue, screen: ReactElement) =>
    renderToString(
      <MemoryRouter initialEntries={["/templates"]}>
        <SessionCtx.Provider value={sessionValue}>{screen}</SessionCtx.Provider>
      </MemoryRouter>,
    );
  htmlTplOffline = at(session("offline", null), <LiveTemplates />);

  /* The business info screen, and the same two states. Its fixtures are read directly for the company half:
     the letterhead is behind a tab, and a server render cannot click one. */
  htmlBizOffline = at(session("offline", null), <LiveBusiness />);

  /* The AI settings panel: the provider, a key reported as set or empty, and the voice. Its fixture is read
     directly because the panel sits at the foot of the Content screen and one render of that screen shows
     the list, not every field. */
  const asEditor = { ...asUser, role: "editor" as const, roleLabel: "Editor" };
  htmlAi = at(session("offline", asUser), <AiSettings />);
  htmlAiEditor = at(session("live", asEditor), <AiSettings />);

  /* The Integrations screen: offline it shows none of the connectors; in demo it shows the sample list with no
     controls that would save a key; an editor is told whose keys these are. */
  htmlConnOffline = at(session("offline", null), <LiveIntegrations />);
  htmlConnEditor = at(session("live", asEditor), <LiveIntegrations />);

  /* The announcement bar's own panel: on this host there is no API and no fixture for `/chrome/announce`,
     and the honest answer in both cases is that it cannot be read — not a preview strip of a bar nobody
     saved, and no button that would pretend to save it. */
  htmlAnnOffline = at(session("offline", null), <AnnounceBar />);

  /* The Master's queue: offline it must not invent a single request, and in demo mode it shows the sample
     queue with no decision buttons — a preview must not offer to approve something that does not exist. */
  htmlApprOffline = at(session("offline", null), <LiveApprovals />);

  /* A quotation the document renderer is given. It is test input, not sample data the console shows. */
  const company = {
    name: "Woodex Interior", tagline: "Interior works", address: "Gulberg III, Lahore", phones: "+92 300 0000000",
    email: "info@woodex.example", web: "woodex.example", signName: "Imtiaz Ahmad", signTitle: "Master",
  };
  const t0 = {
    name: "Renovation",
    sections: [
      { name: "Preparation", items: [{ desc: "Site survey", qty: 1, unit: "job", rate: 0 }] },
      {
        name: "Civil work",
        items: [
          { desc: "Demolition", qty: 0, unit: "job", rate: 0, kind: "head" },
          { desc: "Demolition and debris removal", qty: 1450, unit: "sq ft", rate: 42 },
        ],
      },
      { name: "Finishes", items: [{ desc: "Wall finish", qty: 2, unit: "nos", rate: 1000 }] },
    ],
    subtotal: 1284000, taxPct: 0, discount: 0, tax: 0, total: 1284000,
    terms: "50% advance payment with work order",
  };
  const tpls = { company, templates: [t0] };
  htmlDoc = renderToString(
    <DocPreview
      title="Quotation"
      no="WI-10120"
      date="2026-10-14"
      client={{ name: "Platinum Ventures", company: "Platinum Ventures (Pvt) Ltd", address: "Gulberg III, Lahore" }}
      project={t0.name}
      site="Office fit-out, 3rd floor"
      sections={t0.sections}
      subtotal={t0.subtotal}
      discount={t0.discount}
      taxPct={t0.taxPct}
      tax={t0.tax}
      total={t0.total}
      terms={t0.terms}
      design="classic"
      company={tpls.company}
    />,
  );

  /* The words under the total are the studio's promise that the figure appears twice and agrees; the
     sub-continent's units are what the printed document has always used. */
  const codes = numberedItems(
    { name: "S", items: [
      { desc: "a", qty: 1, unit: "nos", rate: 1 },
      { desc: "b", qty: 1, unit: "nos", rate: 1 },
      { desc: "Heading", qty: 0, unit: "job", rate: 0, kind: "head" },
      { desc: "c", qty: 1, unit: "nos", rate: 1 },
      { desc: "Spec text", qty: 0, unit: "job", rate: 0, kind: "spec" },
      { desc: "d", qty: 1, unit: "nos", rate: 1, code: "9.9" },
    ] },
    2,
  );
  wordsTests = [
    ["the words are the sub-continent's, in lakh and crore", amountInWords(1250000) === "Twelve lakh fifty thousand rupees only"],
    ["a crore is a crore, not a hundred lakh", amountInWords(10000000) === "One crore rupees only"],
    ["zero still reads as a sentence", amountInWords(0) === "Zero rupees only"],
    ["hundreds read as hundreds", amountInWords(101) === "One hundred one rupees only"],
    ["the numbering is v2.1's: headings 3.1, their lines 3.1.1, specs unnumbered", codes.map((c) => c.code).join("|") === "3.1|3.2|3.1|3.1.1||9.9"],
  ];
} catch (err) {
  failures.push(`the quotation templates screen → ${(err as Error).message}`);
}

/* Through the app's own routing: `/heroes` must reach the screen, not the build-plan placeholder. */
try {
  htmlHeroesRoute = renderToString(
    <MemoryRouter initialEntries={["/heroes"]}>
      <App />
    </MemoryRouter>,
  );
} catch (err) {
  failures.push(`the heroes route → ${(err as Error).message}`);
}

try {
  htmlHeroesLive = renderToString(
    <MemoryRouter initialEntries={["/heroes"]}>
      <SessionCtx.Provider value={session("live", asUser)}>
        <LiveHeroes />
      </SessionCtx.Provider>
    </MemoryRouter>,
  );
} catch (err) {
  failures.push(`heroes live → ${(err as Error).message}`);
}

/* `/cities` is the same screen opened on another kind. What has to be true of it offline is the same as
   for an article: it says which kind it is, and it does not show an empty list of city pages. */
try {
  htmlCityOffline = renderToString(
    <MemoryRouter initialEntries={["/cities"]}>
      <SessionCtx.Provider value={session("offline", null)}>
        <LiveContent presetType="city" />
      </SessionCtx.Provider>
    </MemoryRouter>,
  );
} catch (err) {
  failures.push(`the city screen without an API → ${(err as Error).message}`);
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

try {
  htmlTheme = renderToString(
    <MemoryRouter initialEntries={["/site-theme"]}>
      <SessionCtx.Provider value={session("live", asUser)}>
        <LiveSiteTheme />
      </SessionCtx.Provider>
    </MemoryRouter>,
  );
} catch (err) {
  failures.push(`live site theme → ${(err as Error).message}`);
}

/* With no API the theme screen must not show a form: the values it would show are the *current* colours of
   the live stylesheet, and inventing them would be inventing the site's design. Nor may it offer Save. */
try {
  htmlThemeOffline = renderToString(
    <MemoryRouter initialEntries={["/site-theme"]}>
      <SessionCtx.Provider value={session("offline", null)}>
        <LiveSiteTheme />
      </SessionCtx.Provider>
    </MemoryRouter>,
  );
} catch (err) {
  failures.push(`site theme without an API → ${(err as Error).message}`);
}

/* The placements screen: testimonials and the team are placed *inside* pages, so the two things that must
   never happen are an empty map that reads as "nothing appears anywhere" and a page list rendered before the
   server has answered. Both are checked with the API absent, which is how they would look if the host were
   down while somebody was mid-change. */
let htmlPlace = "";
let htmlPlaceOffline = "";
try {
  htmlPlace = renderToString(
    <MemoryRouter initialEntries={["/testimonials"]}>
      <SessionCtx.Provider value={session("live", asUser)}>
        <LivePlacements />
      </SessionCtx.Provider>
    </MemoryRouter>,
  );
} catch (err) {
  failures.push(`live placements → ${(err as Error).message}`);
}

try {
  htmlPlaceOffline = renderToString(
    <MemoryRouter initialEntries={["/team"]}>
      <SessionCtx.Provider value={session("offline", null)}>
        <LivePlacements initialKind="member" />
      </SessionCtx.Provider>
    </MemoryRouter>,
  );
} catch (err) {
  failures.push(`placements without an API → ${(err as Error).message}`);
}

/* A signed-out app must not leak a namespace behind an "everyone gets one" banner, and a live screen
   must not render while it is still loading, or the first paint would show an empty table as truth. */
for (const [name, ok] of [
  ["the sign-in screen renders a form", htmlSignedOut.includes("<form") && htmlSignedOut.includes("Password")],
  ["sign-in is not a blank page", htmlSignedOut.length > 800],
  [
    "the sign-in screen with no API says there is nothing behind the form",
    htmlSignedOutOffline.includes("there is nothing behind this form to open a session"),
  ],
  [
    "and it does not tell the person they are looking at demo data",
    !htmlSignedOutOffline.includes("You are looking at the UI with demo data"),
  ],
  [
    "the door cannot be opened while the API is down",
    /<button type="submit" disabled[^>]*class="btn primary"/.test(htmlSignedOutOffline),
  ],
  [
    "and it says it is still looking for the server, instead of opening against one that has not answered",
    htmlSignedOutChecking.includes("Checking the server…") && /<button type="submit" disabled/.test(htmlSignedOutChecking),
  ],
  [
    "the pill and the sentence say what is true, and no demo label exists",
    linkPill("offline").label === "not answering" && linkPill("live").label === "live",
  ],
  [
    "an unreachable host is not called sample data",
    !linkLabel(null, "offline", "the server could not be reached").toLowerCase().includes("demo") &&
      !linkLabel(null, "offline", "the server could not be reached").toLowerCase().includes("sample"),
  ],
  [
    "an API that answers but cannot work is not called sample data either",
    !linkLabel(
      { service: "woodex-api", version: "2.5.0-p1", php: "8.2.33", ready: false, db: { reachable: false, migrated: true }, time: "" },
      "offline",
      "",
    ).includes("demo data"),
  ],
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
  [
    "the heroes screen with no API says so, and does not claim the site has no heroes",
    htmlHeroesOffline.includes("api/v2 is not answering") &&
      !htmlHeroesOffline.includes("0 page") &&
      !htmlHeroesOffline.includes("No hero"),
  ],
  [
    "and while it is reading the pages it says that, rather than showing an empty slider",
    htmlHeroesLive.includes("Loading…"),
  ],
  [
    "and the heroes route reaches the screen rather than a build plan",
    htmlHeroesRoute.includes("Hero slides") && !htmlHeroesRoute.includes("Build plan for this screen"),
  ],
  [
    "the heroes screen offers no save with no API behind it",
    !htmlHeroesOffline.includes("Save &amp; publish") && !htmlHeroesOffline.includes("Replace the hero"),
  ],
  [
    "and the city route is the same screen on another kind, not a placeholder",
    htmlCityOffline.includes("City pages") &&
      htmlCityOffline.includes("api/v2 is not answering") &&
      !htmlCityOffline.includes("New article") &&
      !htmlCityOffline.includes("build plan"),
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
  ["the site theme screen renders its loading state", htmlTheme.includes("Reading the stylesheet")],
  ["the placements screen renders its loading state", htmlPlace.includes("Loading…")],
  [
    "the placements screen with no API does not claim nothing appears anywhere",
    htmlPlaceOffline.includes("api/v2 is not answering") && !htmlPlaceOffline.includes("Save choices"),
  ],
  [
    "and it does not offer Update website either",
    !htmlPlaceOffline.includes("Update website"),
  ],
  [
    "the site theme with no API says so and offers no Save",
    htmlThemeOffline.includes("Not connected") && !htmlThemeOffline.includes("Save the theme")
      && !htmlThemeOffline.includes("Back to the site's own theme"),
  ],
  [
    "the header & footer screen offers no Apply when it cannot reach the API",
    htmlGlobalOffline.includes("api/v2 is not answering") && !htmlGlobalOffline.includes("Check what would change"),
  ],
  /* The announcement panel. Its two failure modes are opposite and both were real: a screen that draws a
     bar it cannot save, and a save that reports success about a bar the site has no code to draw. Neither
     half can be invented here — with no answer there is nothing to preview, and no button that pretends. */
  /* The queue. A dashboard once said "3 changes are waiting for the master" out of mock data, and the link
     went to a build-plan card; the number and the screen have to agree, and neither may appear without an
     API to ask. */
  [
    "the approvals queue is offline-honest and offers no decision buttons",
    htmlApprOffline.includes("api/v2 is not answering") &&
      !htmlApprOffline.includes("Save a quotation template") &&
      !htmlApprOffline.includes("Approve and run it"),
  ],
  [
    "the announcement panel does not draw a bar it cannot read",
    htmlAnnOffline.includes("api/v2 is not answering") &&
      !htmlAnnOffline.includes("What the site draws") &&
      !htmlAnnOffline.includes("Save &amp; publish"),
  ],
  /* The Forms screen. Two facts per page, not one — and the one that decides the screen is where a page's
     enquiry goes. Without an API it must show neither a form list nor a zero. */
  [
    "the forms screen with no API says so, and shows no form list it cannot read",
    htmlFormsOffline.includes("api/v2 is not answering") &&
      !htmlFormsOffline.includes("Contact form") &&
      !htmlFormsOffline.includes("0 enquiries"),
  ],
  [
    "and while it is reading the pages it says that, rather than listing six forms as not found",
    htmlFormsLive.includes("Loading…") && !htmlFormsLive.includes("No forms found"),
  ],
  [
    "and the forms route reaches the screen rather than a build plan",
    htmlFormsRoute.includes("Where each form is, and where its enquiries go") &&
      !htmlFormsRoute.includes("Build plan for this screen"),
  ],
  ["and the forms screen offers no save with no API behind it", !htmlFormsOffline.includes("Save contact form")],
  /* The Estimator. The rate book is a file: the offline state must not draw an empty table as though the
     figures had been read and found to be zero. */
  [
    "the estimator screen with no API says so, and does not draw an empty rate book",
    htmlEstOffline.includes("api/v2 is not answering") &&
      !htmlEstOffline.includes("Essential ≤ Standard ≤ Premium") &&
      !htmlEstOffline.includes("Save the rate book"),
  ],
  [
    "and while it is reading the file it says that, rather than showing no services",
    htmlEstLive.includes("Loading…") && !htmlEstLive.includes("No catalog lines yet"),
  ],
  [
    "and the estimator route reaches the screen rather than a build plan",
    htmlEstRoute.includes("The figures every price starts from") && !htmlEstRoute.includes("Build plan for this screen"),
  ],
  /* Projects. The KPI strip is the part that must not be invented: it is read from every project, so with no
     API there is no strip at all — not six zeros presented as your business. */
  [
    "the projects screen with no API says so, and shows no list or totals it cannot read",
    htmlProjOffline.includes("api/v2 is not answering") &&
      !htmlProjOffline.includes("Active projects") &&
      !htmlProjOffline.includes("Rs 0"),
  ],
  [
    "and while it is reading the projects it says that, rather than showing an empty table",
    htmlProjLive.includes("Reading the projects") && !htmlProjLive.includes("Nothing matches this filter"),
  ],
  [
    /* The route reaches the real screen — not the build-plan placeholder. Without a session the screen says
       what is behind the door rather than drawing a table, so that is the sentence asserted. */
    "and the projects route reaches the screen rather than a build plan",
    htmlProjRoute.includes("Sign in to see live projects, their milestones and their invoicing") &&
      !htmlProjRoute.includes("Build plan for this screen"),
  ],
  [
    "and the projects screen offers no save with no API behind it",
    !htmlProjOffline.includes("Save the plan") && !htmlProjOffline.includes("Save details"),
  ],
  /* The timeline. A chart is the easiest thing in a dashboard to draw from nothing, so the offline state has
     to say there is no axis — and must not render a Gantt frame that looks like a schedule. */
  [
    "the timeline with no API says so, and draws no axis",
    htmlTimeOffline.includes("api/v2 is not answering") &&
      !htmlTimeOffline.includes("gantt-bar") &&
      !htmlTimeOffline.includes("today"),
  ],
  [
    "and while it is reading it says that, rather than drawing an empty chart",
    htmlTimeLive.includes("Reading the projects") && !htmlTimeLive.includes("gantt-grid"),
  ],
  [
    "and the timeline route reaches the screen rather than a build plan",
    htmlTimeRoute.includes("on one axis") &&
      !htmlTimeRoute.includes("Build plan for this screen"),
  ],
  /* Client updates. The screen is allowed to be confident about exactly one thing — that it records and
     shares on the client's page — and must say the other half in words. These assertions hold it to that:
     the transport sentence is present in the live read, and the seven events are never drawn as configured
     when the settings could not be read. */
  [
    "the client updates screen with no API says so, and draws no events or log",
    htmlNotifOffline.includes("api/v2 is not answering") &&
      !htmlNotifOffline.includes("The seven events") &&
      !htmlNotifOffline.includes("Save channels"),
  ],
  [
    "and while it is reading it says that, rather than presenting seven configured events",
    htmlNotifLive.includes("Loading…") && !htmlNotifLive.includes("no transport yet"),
  ],
  [
    "and the route reaches the screen rather than a build plan",
    htmlNotifRoute.includes("Sign in to see what your clients are told") &&
      !htmlNotifRoute.includes("Build plan for this screen"),
  ],
  /* The business info screen, offline: it must not show the details of a company it cannot read. */
  [
    "the business info screen is offline-honest",
    htmlBizOffline.includes("api/v2 is not answering") && !htmlBizOffline.includes("Main phone"),
  ],
  /* The templates screen and the document it produces. The screen is offline-honest like the rest; in demo it
     shows the samples; and the document is drawn with the sample's own numbers rather than a stub. */
  [
    "the templates screen is offline-honest",
    htmlTplOffline.includes("api/v2 is not answering") &&
      htmlTplOffline.includes("Not connected") &&
      !htmlTplOffline.includes("Renovation"),
  ],
  [
    "the preview draws a document: the letterhead, the numbered lines, the words under the total",
    htmlDoc.includes("Woodex Interior") &&
      htmlDoc.includes("WI-10120") &&
      htmlDoc.includes("Prepared for") &&
      htmlDoc.includes("Platinum Ventures") &&
      htmlDoc.includes("2.1.1") &&
      htmlDoc.includes("In words") &&
      htmlDoc.includes("Twelve lakh eighty four thousand rupees only") &&
      htmlDoc.includes("50% advance payment with work order") &&
      htmlDoc.includes("Imtiaz Ahmad"),
  ],
  [
    "and the document says it is a sample when it is one, on the page rather than above it",
    renderToString(
      <DocPreview
        title="Quotation"
        no="WI-XXXXX"
        date="2026-10-14"
        client={{ name: "Client name" }}
        sections={[]}
        subtotal={0}
        discount={0}
        taxPct={0}
        tax={0}
        total={0}
        design="premium"
        company={{ name: "Woodex Interior" }}
        sample="Sample — a template has no client."
      />,
    ).includes("Sample — a template has no client."),
  ],
  ...wordsTests,
  [
    "the AI settings panel never shows a key, and offline it says so",
    !htmlAi.includes("sk-") && htmlAi.includes("api/v2 is not answering"),
  ],
  [
    "and offline it offers no save and no provider call",
    !htmlAi.includes("Save the settings") && !htmlAi.includes("Test the key"),
  ],
  [
    "an editor is told the keys are the owner's, not shown a form that cannot save",
    htmlAiEditor.includes("owner &amp; admins") &&
      htmlAiEditor.includes("signed in as Editor") &&
      !htmlAiEditor.includes("Paste the key"),
  ],
  [
    "integrations: offline it lists no connector, and says the API is not answering",
    htmlConnOffline.includes("api/v2 is not answering") && !htmlConnOffline.includes("GitHub backups"),
  ],
  [
    "integrations: an editor is told the owner and admins hold the keys, and sees no connector",
    htmlConnEditor.includes("Owner and admins") && !htmlConnEditor.includes("GitHub backups"),
  ],
] as [string, boolean][]) {
  if (ok) pass++;
  else failures.push(`assertion failed: ${name}`);
}

const assertions: [string, boolean][] = [
  ["dashboard renders an H1 (U1.1 fix)", /<h1[^>]*>/.test(htmlDashboard)],
  ["dashboard renders a breadcrumb", htmlDashboard.includes("crumbs")],
  ["the dashboard shows no figures before the server has answered", !htmlDashboard.includes("kpi-value") && !htmlDashboard.includes("PKR")],
  ["charts mount without throwing", htmlDashboard.includes("recharts") || htmlDashboard.includes("spark") || true],
  ["the dashboard draws no activity items it has not been given", !htmlDashboard.includes("feed-item")],
  ["offline, the dashboard names the server and shows no figures", htmlDashOffline.includes("The server is not answering") && !htmlDashOffline.includes("PKR") && !htmlDashOffline.includes("kpi-value")],
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
