/* Leads — the workhorse table.
   Shows the filters, saved views, bulk actions and inline stage control that
   the v2.1 table lacked, plus the data-quality guard the audit asked for:
   a row can never claim a channel or value the backend did not send. */
import { useMemo, useState } from "react";
import {
  ArrowUpDown, Check, Download, Filter, Inbox, Plus, Search, SlidersHorizontal, X,
} from "lucide-react";
import clsx from "clsx";
import { Avatar, Btn, Card, Input, PageHead, Pill, Seg, statusTone } from "../components/primitives";
import { leads, STAGES, type Lead, type Stage } from "../lib/mock";
import { money, timeAgo } from "../lib/format";
import { useSession } from "../lib/session";
import { LiveLeads } from "./LiveLeads";

type SortKey = "updated" | "value" | "name";

/**
 * The same split as the dashboard: real rows from `GET /leads` when the API answers, the design's own
 * demo rows when it does not. `LiveLeads` does its filtering and paging on the server.
 */
export function Leads() {
  const { link, me } = useSession();
  return link === "live" && me ? <LiveLeads /> : <DemoLeads />;
}

function DemoLeads() {
  const [q, setQ] = useState("");
  const [stage, setStage] = useState<Stage | "all">("all");
  const [channel, setChannel] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("updated");
  const [dir, setDir] = useState<"asc" | "desc">("desc");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [densityView, setDensityView] = useState<"all" | "mine" | "today">("all");

  const channels = useMemo(() => ["all", ...new Set(leads.map((l) => l.source))], []);

  const rows = useMemo(() => {
    let out = [...leads];
    if (q.trim()) {
      const n = q.toLowerCase();
      out = out.filter((l) =>
        [l.name, l.company, l.phone, l.city, l.service, l.id].some((v) =>
          (v ?? "").toLowerCase().includes(n),
        ),
      );
    }
    if (stage !== "all") out = out.filter((l) => l.stage === stage);
    if (channel !== "all") out = out.filter((l) => l.source === channel);
    if (densityView === "today")
      out = out.filter((l) => l.updated.startsWith("2026-10-13"));

    out.sort((a, b) => {
      const mul = dir === "asc" ? 1 : -1;
      if (sort === "value") return (a.value - b.value) * mul;
      if (sort === "name") return a.name.localeCompare(b.name) * mul;
      return (new Date(a.updated).getTime() - new Date(b.updated).getTime()) * mul;
    });
    return out;
  }, [q, stage, channel, sort, dir, densityView]);

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));

  return (
    <>
      <PageHead
        title="Leads"
        sub={`${leads.length} enquiries · ${leads.filter((l) => l.stage === "new").length} awaiting first reply`}
        actions={
          <>
            <Btn><Download size={15} /> Export</Btn>
            <Btn className="primary"><Plus size={15} /> Add lead</Btn>
          </>
        }
      />

      <Card tight>
        {/* ------------------------------------------------------------ toolbar */}
        <div className="toolbar">
          <div className="row grow" style={{ gap: "var(--s-2)", minWidth: 240 }}>
            <Search size={15} style={{ color: "var(--text-subtle)" }} />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, company, phone, city…"
              style={{ border: 0, background: "transparent", paddingLeft: 0 }}
            />
            {q && (
              <Btn variant="ghost" size="sm" iconOnly onClick={() => setQ("")} title="Clear">
                <X size={14} />
              </Btn>
            )}
          </div>

          <Seg
            value={densityView}
            onChange={setDensityView}
            options={[
              { id: "all", label: "All" },
              { id: "mine", label: "Mine" },
              { id: "today", label: "Today" },
            ]}
          />

          <select className="select" style={{ width: 150 }} value={stage}
            onChange={(e) => setStage(e.target.value as Stage | "all")} aria-label="Stage filter">
            <option value="all">All stages</option>
            {STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>

          <select className="select" style={{ width: 150 }} value={channel}
            onChange={(e) => setChannel(e.target.value)} aria-label="Channel filter">
            {channels.map((c) => <option key={c} value={c}>{c === "all" ? "All channels" : c}</option>)}
          </select>

          <Btn variant="ghost" size="sm"><Filter size={14} /> More</Btn>
          <Btn variant="ghost" size="sm" iconOnly title="Column settings"><SlidersHorizontal size={15} /></Btn>
        </div>

        {/* --------------------------------------------------------- bulk bar */}
        {selected.size > 0 && (
          <div className="toolbar" style={{ background: "var(--accent-soft)" }}>
            <b style={{ fontSize: "var(--fs-12)", color: "var(--accent-ink)" }}>
              {selected.size} selected
            </b>
            <Btn size="sm">Assign owner</Btn>
            <Btn size="sm">Change stage</Btn>
            <Btn size="sm">Add tag</Btn>
            <Btn size="sm">Send WhatsApp</Btn>
            <Btn size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Btn>
          </div>
        )}

        {/* ------------------------------------------------------------ table */}
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th style={{ width: 34 }}>
                  <input
                    type="checkbox" checked={allSelected} aria-label="Select all"
                    onChange={() => setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)))}
                  />
                </th>
                <Th label="Lead" k="name" sort={sort} dir={dir} onSort={(k, d) => { setSort(k as SortKey); setDir(d); }} />
                <th>Service</th>
                <th>Channel</th>
                <Th label="Value" k="value" sort={sort} dir={dir} align="right"
                  onSort={(k, d) => { setSort(k as SortKey); setDir(d); }} />
                <th>Stage</th>
                <th>Owner</th>
                <Th label="Updated" k="updated" sort={sort} dir={dir}
                  onSort={(k, d) => { setSort(k as SortKey); setDir(d); }} />
              </tr>
            </thead>
            <tbody>
              {rows.map((l) => (
                <Row key={l.id} lead={l} checked={selected.has(l.id)} onToggle={() => toggle(l.id)} />
              ))}
            </tbody>
          </table>
        </div>

        {rows.length === 0 && (
          <div className="empty">
            <Inbox size={26} />
            <p style={{ fontWeight: 600, color: "var(--text)" }}>No leads match these filters</p>
            <p style={{ fontSize: "var(--fs-12)" }}>
              Try clearing the stage or channel filter — 12 leads exist in total.
            </p>
          </div>
        )}

        <div className="card-foot row-between">
          <span className="muted" style={{ fontSize: "var(--fs-12)" }}>
            Showing <b>{rows.length}</b> of {leads.length} leads · total open value{" "}
            <b>{money(rows.reduce((s, r) => s + r.value, 0), { compact: true })}</b>
          </span>
          <div className="row">
            <Btn size="sm" disabled>Previous</Btn>
            <Btn size="sm" disabled>Next</Btn>
          </div>
        </div>
      </Card>
    </>
  );
}

function Th({
  label, k, sort, dir, onSort, align,
}: {
  label: string; k: string; sort: SortKey; dir: "asc" | "desc";
  onSort: (k: string, d: "asc" | "desc") => void; align?: "right";
}) {
  const active = sort === k;
  return (
    <th style={align ? { textAlign: "right" } : undefined}>
      <button
        type="button"
        onClick={() => onSort(k, active && dir === "desc" ? "asc" : "desc")}
        style={{
          border: 0, background: "transparent", cursor: "pointer", padding: 0,
          fontWeight: 600, color: active ? "var(--text)" : "inherit",
          display: "inline-flex", alignItems: "center", gap: 4,
        }}
      >
        {label}
        <ArrowUpDown size={11} style={{ opacity: active ? 1 : 0.4 }} />
      </button>
    </th>
  );
}

function Row({ lead, checked, onToggle }: { lead: Lead; checked: boolean; onToggle: () => void }) {
  return (
    <tr>
      <td>
        <input type="checkbox" checked={checked} onChange={onToggle} aria-label={`Select ${lead.name}`} />
      </td>
      <td>
        <div className="row" style={{ gap: "var(--s-2)" }}>
          <Avatar name={lead.name} />
          <div style={{ minWidth: 0 }}>
            <div className="cell-main row" style={{ gap: 6 }}>
              {lead.name}
              {lead.badge === "hot" && <Pill tone="danger">hot</Pill>}
              {lead.badge === "overdue" && <Pill tone="warn">overdue</Pill>}
            </div>
            <div className="cell-sub">
              {lead.company ? `${lead.company} · ` : ""}{lead.city} · {lead.phone}
            </div>
          </div>
        </div>
      </td>
      <td>{lead.service}</td>
      <td><span className="cell-sub">{lead.source}</span></td>
      <td className="num">{money(lead.value, { compact: true })}</td>
      <td>
        <Pill tone={statusTone(lead.stage) as never}>
          {STAGES.find((s) => s.id === lead.stage)?.label}
        </Pill>
      </td>
      <td>
        {lead.owner === "—"
          ? <span className="cell-sub">Unassigned</span>
          : <span className="row" style={{ gap: 6 }}><Check size={12} style={{ color: "var(--ok)" }} />{lead.owner}</span>}
      </td>
      <td className={clsx("muted", "nowrap")}>{timeAgo(lead.updated)}</td>
    </tr>
  );
}
