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
import { Btn, Card, PageHead } from "./components/primitives";

/** Route ids implemented by a real screen in this prototype (Phase 0). */
const BUILT_IDS = new Set(["dashboard", "leads", "enquiries", "pipeline", "quotes", "theme"]);

export default function App() {
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

  const badges: Badges = useMemo(
    () => ({
      leads: leads.filter((l) => l.stage === "new").length,
      chat: 3,
      approvals: role === "support" ? 0 : approvals.length,
    }),
    [role],
  );

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
      >
        <Routes>
          {/* Phase 0 — screens implemented in this prototype */}
          <Route path="/dashboard" element={<Dashboard role={role} />} />
          <Route path="/leads" element={<Leads />} />
          <Route path="/enquiries" element={<Leads />} />
          <Route path="/pipeline" element={<Pipeline />} />
          <Route path="/quotes" element={<Quotations />} />
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
