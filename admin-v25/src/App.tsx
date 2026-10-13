import { useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { Shell, type Badges } from "./components/Shell";
import { CommandPalette } from "./components/CommandPalette";
import { Dashboard } from "./screens/Dashboard";
import { Leads } from "./screens/Leads";
import { Pipeline } from "./screens/Pipeline";
import { Quotations } from "./screens/Quotations";
import { Theme } from "./screens/Theme";
import { Placeholder } from "./screens/Placeholder";
import { ROUTES, resolveRoute, type Role } from "./lib/nav";
import { useAppearance } from "./lib/theme";
import { approvals, leads } from "./lib/mock";
import { SessionProvider, useSession } from "./lib/session";
import { SignIn } from "./screens/SignIn";
import { LiveRedirects } from "./screens/LiveRedirects";
import { LiveMedia } from "./screens/LiveMedia";
import { LiveContent } from "./screens/LiveContent";
import { LiveGlobal } from "./screens/LiveGlobal";
import { LivePages } from "./screens/LivePages";
import { LiveLibrary } from "./screens/LiveLibrary";
import { LiveSiteTheme } from "./screens/LiveSiteTheme";
import { LivePlacements } from "./screens/LivePlacements";
import { LiveHeroes } from "./screens/LiveHeroes";
import { LiveForms } from "./screens/LiveForms";
import { LiveEstimator } from "./screens/LiveEstimator";
import { LiveProjects } from "./screens/LiveProjects";
import { LiveTimeline } from "./screens/LiveTimeline";
import { LiveUpdates } from "./screens/LiveUpdates";
import { LiveTemplates } from "./screens/LiveTemplates";
import { LiveBusiness } from "./screens/LiveBusiness";
import { linkLabel, useLive, type BellData } from "./lib/live";
import { demoOn, setDemo } from "./lib/demo";
import { Btn, Card, Note, PageHead } from "./components/primitives";

/** Route ids implemented by a real screen in this prototype (Phase 0). */
const BUILT_IDS = new Set([
  "dashboard", "leads", "enquiries", "pipeline", "quotes", "theme", "redirects", "media", "blog", "portfolio", "cities", "global", "pages", "library", "site-theme",
  "testimonials", "team", "heroes",
  "forms", "estimator", "projects", "timeline", "notifications", "templates",
  "business",
]);

/** The public entry point: one provider, then the app proper. */
export default function App() {
  /* `?demo=1` (or a build with VITE_WX_DEMO=1) is the static-preview mode: no API is called at all, and the
     screens that have sample data answer from it. The flag lives in `lib/demo.ts` because it has to survive a
     click — a query string does not, and a preview that stops working on the first navigation is a puzzle
     rather than a preview. Everything else tries the API. */
  const demo = demoOn();
  return (
    <SessionProvider demo={demo}>
      <Frame demo={demo} />
    </SessionProvider>
  );
}

/**
 * The frame: health, session, badges, routes.
 *
 * Four states, and the sign-in screen is one of them rather than an overlay:
 *   · the API is being looked for → the strip says so, and the door will not open yet
 *   · the API is not answering  → the strip says that, in those words, and nothing is invented for it
 *   · the API is there, nobody is signed in → SignIn
 *   · signed in → the app, with the role and the counts the *server* reported
 *
 * `demo` (from `?demo=1` or the build flag) is the only thing any of this calls a demo; without it, an
 * unreachable host is reported as an unreachable host.
 */
function Frame({ demo }: { demo: boolean }) {
  const appearance = useAppearance();
  const [role, setRole] = useState<Role>("owner");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const loc = useLocation();
  const navigate = useNavigate();

  const path = loc.pathname.replace(/^\//, "") || "dashboard";
  const route = useMemo(() => resolveRoute(path), [path]);
  const routeId = route?.id ?? path;

  /* The v2.1 router fell through to the dashboard loader when a path did not
     match (AD-4) and threw "Cannot set properties of null" on late replies
     (Phase A1 note). Here an unknown path is an explicit 404 screen. */

  const { link, reason, health, user, signOut } = useSession();
  const live = link === "live" && user !== null;

  /* The bell, from the server when there is a server. One poll a minute — the same cadence and endpoint
     the SPA will use, and the first screen that proves `GET /notifications/poll` end to end. */
  const bell = useLive<BellData>(live ? "/notifications/poll" : null, role);

  const badges: Badges = useMemo(() => {
    if (bell.data) {
      return {
        leads: bell.data.leads,
        chat: bell.data.chats,
        approvals: bell.data.approvals,
        total: bell.data.total,
      };
    }
    /* Demo counts, from the design's own mock data — used only while the API is not answering, and
       labelled as such in the strip. */
    return {
      leads: leads.filter((l) => l.stage === "new").length,
      chat: 3,
      approvals: role === "support" ? 0 : approvals.length,
      total: leads.filter((l) => l.stage === "new").length + 3 + approvals.length,
    };
  }, [bell.data, role]);

  /* `demo` is the only thing that may be called a demo: it is set by `?demo=1` or the build flag, and the
     strip, the pill and the plan label are all derived from it together with the link state. */
  const strip = linkLabel(health, link, reason, demo);

  /* The role the *server* says, when there is one. The demo switcher still drives the design preview. */
  const effectiveRole = live && user ? (user.role as Role) : role;

  // ⌘K / Ctrl-K opens the palette
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
      if (e.key === "Escape") setPaletteOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const crumbs = useMemo(() => {
    if (!route) return [{ label: "Not found" }];
    return [{ label: route.section }, { label: route.label }];
  }, [route]);

  // `/` and `/index` land on the dashboard, like the v2.1 default route
  if (loc.pathname === "/" || loc.pathname === "/index") {
    return <Navigate to="/dashboard" replace />;
  }

  /* Signed out, with the API answering: the door. Everything else in the app would be a screen of
     empty tables whose emptiness has no explanation. */
  if (link === "signedOut") {
    return (
      <Shell
        role={role}
        setRole={setRole}
        theme={appearance.theme}
        toggleTheme={appearance.toggleTheme}
        density={appearance.density}
        setDensity={appearance.setDensity}
        badges={{ leads: 0, chat: 0, approvals: 0, total: 0 }}
        onOpenPalette={() => setPaletteOpen(true)}
        routeId={routeId}
        crumbs={crumbs}
        link={link}
        linkText={strip}
        demo={demo}
        user={null}
        onSignOut={() => void signOut()}
      >
        <SignIn door={<DemoDoor on={demo} />} />
      </Shell>
    );
  }

  return (
    <>
      <Shell
        role={role}
        setRole={setRole}
        theme={appearance.theme}
        toggleTheme={appearance.toggleTheme}
        density={appearance.density}
        setDensity={appearance.setDensity}
        badges={badges}
        onOpenPalette={() => setPaletteOpen(true)}
        routeId={routeId}
        crumbs={crumbs}
        link={link}
        linkText={strip}
        demo={demo}
        user={user ? { name: user.name, roleLabel: user.roleLabel } : null}
        onSignOut={() => void signOut()}
      >
        {/* A host that is not answering is the other place the door belongs: every screen below is about to say
            it cannot read anything, and the person should not have to guess that a preview mode exists. */}
        {link === "offline" && !demo ? <DemoDoor on={false} /> : null}
        <DemoBanner on={demo} />
        <Routes>
          {/* Phase 0 — screens implemented in this prototype */}
          <Route path="/dashboard" element={<Dashboard role={effectiveRole} />} />
          <Route path="/leads" element={<Leads />} />
          <Route path="/enquiries" element={<Leads />} />
          <Route path="/pipeline" element={<Pipeline />} />
          <Route path="/quotes" element={<Quotations />} />
          {/* Phase 3 — delivery. These have no demo layout on purpose: a design of the redirect table
              that is not connected to a redirect table teaches nobody anything, and the two screens
              read the site's own files. Offline they say so, in words, rather than showing an empty
              table that looks like data. */}
          <Route path="/redirects" element={<LiveRedirects />} />
          <Route path="/media" element={<LiveMedia />} />
          {/* The content CMS. Three routes, one screen: an article, a case study and a city page are the
              same kind of thing — the difference is the address they take and the page furniture they
              publish into. A city page is root-level, because that is where v2.1 put them. */}
          <Route path="/blog" element={<LiveContent presetType="post" />} />
          <Route path="/portfolio" element={<LiveContent presetType="study" />} />
          <Route path="/cities" element={<LiveContent presetType="city" />} />
          {/* The hero at the top of every page, and the home page's slider. Three tabs over one idea:
              the first thing a visitor sees, written as rules rather than by hand in 150 files. */}
          <Route path="/heroes" element={<LiveHeroes />} />
          {/* The forms: which pages carry one, where the enquiry goes, and what the visitor is told back. */}
          <Route path="/forms" element={<LiveForms />} />
          {/* The rate book behind /estimator/ and the quotation builder — a file, written as JavaScript. */}
          <Route path="/estimator" element={<LiveEstimator />} />
          {/* Live work: stages and milestones, and the money each one bills. A project is opened by an
              approved quotation, so there is no "new" here — only what is already running. */}
          <Route path="/projects" element={<LiveProjects />} />
          {/* The same projects on a date axis: start to handover, filled by what has been invoiced. */}
          <Route path="/timeline" element={<LiveTimeline />} />
          {/* Client updates: the seven events and their wording, the channels, the log — and the sentence the
              screen refuses to hide, that the sending itself is still v2.1's until Phase 4. */}
          <Route path="/notifications" element={<LiveUpdates />} />
          {/* The header and the footer: one edit, every page, one undo. */}
          {/* Quotation templates — the shapes every quotation is built from. The plan calls this route
              `/quotations/templates`; the registry declares that as an alias and the redirect below opens it. */}
          <Route path="/templates" element={<LiveTemplates />} />
          <Route path="/business" element={<LiveBusiness />} />
          <Route path="/global" element={<LiveGlobal />} />
          {/* Every page and every change — where the header change across 150 pages is undone. */}
          <Route path="/pages" element={<LivePages />} />
          {/* The reusable pieces a page is assembled from, and the global sections pushed from one edit. */}
          <Route path="/library" element={<LiveLibrary />} />
          {/* The site's own colours and type — the file every page is drawn from, not the admin's palette. */}
          <Route path="/site-theme" element={<LiveSiteTheme />} />
          {/* Two nav entries, one screen: what changes between them is which kind it opens on. Testimonials
              and the team are placed *inside* pages rather than living at addresses of their own. */}
          <Route path="/testimonials" element={<LivePlacements initialKind="testimonial" />} />
          <Route path="/team" element={<LivePlacements initialKind="member" />} />
          <Route
            path="/theme"
            element={
              <Theme
                theme={appearance.theme}
                setTheme={appearance.setTheme}
                accent={appearance.accent}
                setAccent={appearance.setAccent}
                density={appearance.density}
                setDensity={appearance.setDensity}
              />
            }
          />
          {/* Aliases are declared once, in the registry, and open the screen they name here. Without this a
              path somebody was given — `#/quotations/templates`, `#/settings/connections` — landed on the
              not-found page while the screen existed, which is the AD-4 defect in a new coat. */}
          {ROUTES.flatMap((r) =>
            (r.aliases ?? []).map((alias) => (
              <Route key={alias} path={`/${alias}`} element={<Navigate to={`/${r.id}`} replace />} />
            )),
          )}
          {/* every other registered route renders its build plan */}
          {ROUTES.filter((r) => !BUILT_IDS.has(r.id)).map((r) => (
            <Route key={r.id} path={`/${r.id}`} element={<Placeholder route={r} />} />
          ))}
          <Route
            path="*"
            element={<NotFound onHome={() => navigate("/dashboard")} path={loc.pathname} />}
          />
        </Routes>
      </Shell>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} role={role} />
    </>
  );
}

function NotFound({ path, onHome }: { path: string; onHome: () => void }) {
  return (
    <>
      <PageHead title="Screen not found" sub={`No registered route matches “${path}”.`} />
      <Card title="This is deliberate" sub="v2.1 defect AD-4 — the old router fell through to the dashboard">
        <p style={{ fontSize: "var(--fs-13)" }}>
          In v2.1, an unknown path executed the dashboard loader silently, and aliases such as{" "}
          <span className="mono">#/integrations</span> were unreachable even though the screen
          existed. The registry now resolves aliases and reports anything else honestly.
        </p>
        <div className="row" style={{ marginTop: "var(--s-4)" }}>
          <Btn className="primary" onClick={onHome}>Go to the dashboard</Btn>
          <Btn onClick={() => window.location.assign("/#/integrations")}>Open Integrations</Btn>
        </div>
      </Card>
    </>
  );
}

/**
 * The door into demo mode, and the banner that keeps it honest.
 *
 * Exported for the render smoke test, exactly like `SessionCtx`: they are the two elements that carry the
 * promise "this is not your data", and a promise nobody can test is a promise nobody keeps.
 *
 * Both exist because of the same repeated experience: a console that reads a real API shows nothing at all
 * where there is no API — a laptop, this sandbox, a hosted preview — and the person looking at it cannot tell
 * whether the product is broken or the host is. The door is offered **by name**, and the banner is impossible
 * to mistake for the product: it says the data is made up, it names where it came from, and it offers the way
 * back out. Nothing here turns itself on.
 */
export function DemoDoor({ on }: { on: boolean }) {
  return (
    <Note tone="info" title={on ? "Demo mode is on" : "No server here?"}>
      {on ? (
        <>
          This console is showing sample data so its design can be reviewed. Turn it off to read your own
          server again.{" "}
          <button type="button" className="link-btn" onClick={() => setDemo(false)}>
            Leave demo mode
          </button>
        </>
      ) : (
        <>
          If this is a preview with no PHP and no MySQL behind it,{" "}
          <button type="button" className="link-btn" onClick={() => setDemo(true)}>
            open the console with sample data
          </button>{" "}
          — same screens, invented figures, and it says so on every one of them.
        </>
      )}
    </Note>
  );
}

export function DemoBanner({ on }: { on: boolean }) {
  if (!on) return null;
  return (
    <div className="demo-banner" role="status">
      <b>Demo data.</b> Everything on this screen is a sample written for the design review — no part of it came
      from your server. Turn it off to read the real thing.{" "}
      <button type="button" className="link-btn" onClick={() => setDemo(false)}>
        Leave demo mode
      </button>
    </div>
  );
}
