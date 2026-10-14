/* Pipeline — drag-and-drop stage board.
   Native HTML5 drag events (no library). Keyboard fallback included: focus a
   card and press ← / → to move it, so the board is not mouse-only (the v2.1
   board was, which the accessibility audit flagged). */
import { useMemo, useState, type DragEvent, type KeyboardEvent } from "react";
import { Building2, Filter, GripVertical, LayoutGrid, Plus, Users } from "lucide-react";
import { Btn, Card, Delta, PageHead, Pill, Seg, statusTone } from "../components/primitives";
import { ConversionLine } from "../components/charts";
import { leads as seed, STAGES, type Lead, type Stage } from "../lib/mock";
import { money, timeAgo } from "../lib/format";
import { useSession } from "../lib/session";
import { ROUTES } from "../lib/nav";
import { Placeholder } from "./Placeholder";

const CONV = [
  { m: "May", conv: 16.2 }, { m: "Jun", conv: 17.8 }, { m: "Jul", conv: 15.9 },
  { m: "Aug", conv: 19.4 }, { m: "Sep", conv: 18.1 }, { m: "Oct", conv: 18.7 },
];

/**
 * Demo mode, or the build plan.
 *
 * The board is still the design: it moves the sample's cards and saves nothing, because the live stage board
 * has no route yet (`leads_list` gives the rows; a stage change is `lead_save`). Drawing sample cards with no
 * store behind them, on a host where the real pipeline exists in the database, is the demo-data problem in
 * its purest form — so outside demo mode this screen is the build plan for the screen it will become.
 */
export function Pipeline() {
  const { demo } = useSession();
  const route = ROUTES.find((r) => r.id === "pipeline");
  if (demo && route) return <DemoPipeline />;
  return route ? <Placeholder route={route} /> : null;
}

function DemoPipeline() {
  const [items, setItems] = useState<Lead[]>(seed);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<Stage | null>(null);
  const [line, setLine] = useState<"all" | "interior" | "fitout">("all");

  const filtered = useMemo(() => {
    if (line === "all") return items;
    if (line === "interior") return items.filter((i) => /interior|kitchen|wardrobe|bathroom|farmhouse/i.test(i.service));
    return items.filter((i) => /fit-out|retail|clinic|pharmacy|office|cafe|showroom/i.test(i.service));
  }, [items, line]);

  const byStage = (s: Stage) => filtered.filter((i) => i.stage === s);
  const total = filtered.reduce((n, i) => n + i.value, 0);
  const won = filtered.filter((i) => i.stage === "won").reduce((n, i) => n + i.value, 0);

  const move = (id: string, to: Stage) =>
    setItems((prev) => prev.map((p) => (p.id === id ? { ...p, stage: to } : p)));

  const onDrop = (e: DragEvent, stage: Stage) => {
    e.preventDefault();
    const id = dragId ?? e.dataTransfer.getData("text/plain");
    if (id) move(id, stage);
    setDragId(null);
    setOverStage(null);
  };

  const onKey = (e: KeyboardEvent, lead: Lead) => {
    const i = STAGES.findIndex((s) => s.id === lead.stage);
    if (e.key === "ArrowRight" && i < STAGES.length - 1) {
      e.preventDefault();
      move(lead.id, STAGES[i + 1].id);
    }
    if (e.key === "ArrowLeft" && i > 0) {
      e.preventDefault();
      move(lead.id, STAGES[i - 1].id);
    }
  };

  return (
    <>
      <PageHead
        title="Pipeline"
        sub="Drag a card to move it · or focus a card and press ← / →"
        actions={
          <>
            <Btn><Filter size={15} /> Filters</Btn>
            <Btn className="primary"><Plus size={15} /> Add lead</Btn>
          </>
        }
      />

      <div className="grid kpi" style={{ marginBottom: "var(--s-4)" }}>
        <Kpi label="Total pipeline" value={money(total, { compact: true })} foot="Across every open stage" />
        <Kpi label="Active leads" value={String(filtered.filter((i) => i.stage !== "won").length)} foot={`${filtered.length} in this line`} />
        <Kpi label="Won value" value={money(won, { compact: true })} delta={0.231} foot="Closed this quarter" />
        <Kpi label="Weighted forecast" value={money(Math.round(total * 0.31), { compact: true })} delta={0.058} foot="Stage probability applied" />
      </div>

      <div style={{ marginBottom: "var(--s-4)" }}>
        <div className="row-between">
          <Seg
            value={line}
            onChange={setLine}
            options={[
              { id: "all", label: "All lines" },
              { id: "interior", label: "Interior" },
              { id: "fitout", label: "Fit-out" },
            ]}
          />
          <span className="muted" style={{ fontSize: "var(--fs-12)" }}>
            <GripVertical size={12} /> changes save instantly — no Save button
          </span>
        </div>
      </div>

      <Card tight className="card" /* board scrolls horizontally on narrow screens */>
        <div className="card-body tight">
          <div className="kanban">
            {STAGES.map((s) => {
              const cards = byStage(s.id);
              const sum = cards.reduce((n, c) => n + c.value, 0);
              return (
                <div
                  key={s.id}
                  className="kcol"
                  onDragOver={(e) => { e.preventDefault(); setOverStage(s.id); }}
                  onDragLeave={() => setOverStage((v) => (v === s.id ? null : v))}
                  onDrop={(e) => onDrop(e, s.id)}
                >
                  <div className="kcol-head">
                    <div className="row">
                      <Pill tone={statusTone(s.id) as never}>{s.label}</Pill>
                      <span className="muted" style={{ fontSize: "var(--fs-11)" }}>{cards.length}</span>
                    </div>
                    <span className="cell-sub num">{money(sum, { compact: true })}</span>
                  </div>
                  <div className="kcol-body" data-over={overStage === s.id}>
                    {cards.map((c) => (
                      <article
                        key={c.id}
                        className="kcard"
                        draggable
                        tabIndex={0}
                        data-dragging={dragId === c.id}
                        onDragStart={(e) => { setDragId(c.id); e.dataTransfer.setData("text/plain", c.id); }}
                        onDragEnd={() => { setDragId(null); setOverStage(null); }}
                        onKeyDown={(e) => onKey(e, c)}
                        aria-label={`${c.name}, ${c.service}, stage ${s.label}. Use left and right arrows to move.`}
                      >
                        <div className="row-between">
                          <b>{c.name}</b>
                          {c.badge === "hot" && <Pill tone="danger">hot</Pill>}
                          {c.badge === "overdue" && <Pill tone="warn">48h+</Pill>}
                        </div>
                        <div className="cell-sub row" style={{ gap: 5 }}>
                          {c.company ? <Building2 size={11} /> : <Users size={11} />}
                          {c.company ?? c.city} · {c.service}
                        </div>
                        <div className="meta">
                          <span>{money(c.value, { compact: true })}</span>
                          <span>{timeAgo(c.updated)}</span>
                        </div>
                        <div className="kbar">
                          <i style={{
                            width: `${((STAGES.findIndex((x) => x.id === c.stage) + 1) / STAGES.length) * 100}%`,
                            background: `var(--${s.tone === "ok" ? "ok" : s.tone === "warn" ? "warn" : "accent"})`,
                          }} />
                        </div>
                      </article>
                    ))}
                    {cards.length === 0 && (
                      <p className="muted" style={{ fontSize: "var(--fs-11)", padding: "var(--s-4)", textAlign: "center" }}>
                        Drop a card here
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      <div className="grid split" style={{ marginTop: "var(--s-4)" }}>
        <Card title="Conversion rate" sub="Lead → client, six-month trend">
          <ConversionLine data={CONV} />
        </Card>
        <Card title="Stage discipline" sub="Where deals sit longest">
          <div className="bars">
            {[
              { label: "New → contacted", days: "1.2 days", pct: 82 },
              { label: "Contacted → visit", days: "4.6 days", pct: 61 },
              { label: "Visit → quote", days: "2.1 days", pct: 88 },
              { label: "Quote → won", days: "9.3 days", pct: 34 },
            ].map((r) => (
              <div className="bar-row" key={r.label}>
                <span className="muted">{r.label}</span>
                <span className="bar-track"><i className="bar-fill" style={{ width: `${r.pct}%`, display: "block", height: "100%" }} /></span>
                <span className="num" style={{ textAlign: "right" }}>{r.days}</span>
              </div>
            ))}
          </div>
          <p className="muted" style={{ fontSize: "var(--fs-11)", marginTop: "var(--s-3)" }}>
            <LayoutGrid size={11} /> The longest delay is quote → won. A follow-up task is created
            automatically 3 days after a quotation is viewed but not answered.
          </p>
        </Card>
      </div>
    </>
  );
}

function Kpi({ label, value, delta, foot }: { label: string; value: string; delta?: number; foot: string }) {
  return (
    <Card className="kpi">
      <span className="kpi-label">{label}</span>
      <span className="kpi-value">{value}</span>
      <span className="kpi-foot">
        {delta !== undefined && <Delta value={delta} />}
        <span className="muted">{foot}</span>
      </span>
    </Card>
  );
}
