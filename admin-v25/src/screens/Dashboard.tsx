/* Dashboard — the master overview.
   Layout rule from the v2.1 audit (U1.2): KPI row is always 4-up with a 16px
   gap; every screen starts with an H1 + breadcrumb (U1.1, 57/57 routes). */
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight, BookOpen, Clock, FileText, HeartPulse, Inbox, Kanban, Send, ShieldCheck,
  Sparkles, TrendingUp, Briefcase, Gauge, Zap,
} from "lucide-react";
import { Bar, Card, Delta, Empty, Note, PageHead, Pill, Seg, statusTone } from "../components/primitives";
import { ChannelBars, RevenueChart, Sparkline } from "../components/charts";
import {
  activity, approvals, channelMix, kpis, leads, quotations, revenueSeries, serviceMix, systemHealth,
} from "../lib/mock";
import { timeAgo } from "../lib/format";
import type { Role } from "../lib/nav";
import { useSession } from "../lib/session";
import { LiveDashboard } from "./LiveDashboard";

const ICONS: Record<string, typeof Inbox> = {
  Briefcase, Inbox, TrendingUp, Gauge, FileText, Kanban, Send, Clock, HeartPulse, BookOpen,
};

/**
 * Two dashboards, one route.
 *
 * When api/v2 answers, the screen shows the server's numbers (LiveDashboard). When there is no API —
 * a static preview, a host that has not been migrated — the original design renders from `mock.ts`,
 * because a layout with nothing in it teaches nobody anything. Which one you are looking at is stated
 * in the shell, always; the failure mode this avoids is a mock number wearing a live label.
 */
export function Dashboard({ role }: { role: Role }) {
  const { link, me } = useSession();
  return link === "live" && me ? <LiveDashboard role={role} /> : <DemoDashboard role={role} />;
}

function DemoDashboard({ role }: { role: Role }) {
  const [range, setRange] = useState<"30d" | "90d" | "12m">("12m");
  const canSeeMoney = role === "owner" || role === "admin" || role === "sales";
  const visibleKpis = canSeeMoney ? kpis : kpis.filter((k) => k.id !== "pipeline" && k.id !== "won");

  const fmt = (k: (typeof kpis)[number]) =>
    k.kind === "money"
      ? `PKR ${(k.value / 100000).toFixed(1)}L`
      : k.kind === "percent"
        ? `${(k.value * 100).toFixed(1)}%`
        : String(k.value);

  return (
    <>
      <PageHead
        title="Good afternoon, Imtiaz"
        sub="Lahore studio · Monday 13 October 2026 · 4 things need you today"
        actions={
          <>
            <Seg
              value={range}
              onChange={setRange}
              options={[
                { id: "30d", label: "30 days" },
                { id: "90d", label: "90 days" },
                { id: "12m", label: "12 months" },
              ]}
            />
            <Link to="/quotes" className="btn primary">
              <FileText size={15} /> New quotation
            </Link>
          </>
        }
      />

      {approvals.length > 0 && role !== "support" && (
        <div style={{ marginBottom: "var(--s-4)" }}>
          <Note tone="warn">
            {/* The count is the design's own sample. Saying "3 changes are waiting for the master" in a
                preview is a claim about somebody's business, and this screen is the one that must not make
                one: it is the dashboard, and a number on it is read as the truth about the studio. */}
            <b>In this sample, {approvals.length} changes are waiting for the master.</b> With api/v2
            connected this counts what is really queued. Managers can request edits; only the master
            approves them.{" "}
            <Link to="/approvals" style={{ textDecoration: "underline" }}>Open approvals →</Link>
          </Note>
        </div>
      )}

      {/* ------------------------------------------------------------ KPI row */}
      <div className="grid kpi" style={{ marginBottom: "var(--s-4)" }}>
        {visibleKpis.map((k) => {
          const Icon = ICONS[k.icon] ?? Inbox;
          return (
            <Card key={k.id} className="kpi">
              <div className="kpi-top">
                <span className="kpi-label">{k.label}</span>
                <span className="kpi-icon" data-tone={k.tone}>
                  <Icon size={15} />
                </span>
              </div>
              <div className="kpi-value">{fmt(k)}</div>
              <div className="kpi-foot">
                <Delta value={k.delta} />
                <span className="muted">vs previous period</span>
              </div>
              <Sparkline data={k.spark} tone={k.tone === "warn" ? "var(--warn)" : undefined} />
            </Card>
          );
        })}
      </div>

      {/* ------------------------------------------------------- chart + feed */}
      <div className="grid split" style={{ marginBottom: "var(--s-4)" }}>
        <Card
          title="Quoted vs won value"
          sub="PKR lakh · roll-up of approved quotations and closed leads"
          actions={<Pill tone="accent" plain><TrendingUp size={11} /> 12 months</Pill>}
        >
          <RevenueChart data={revenueSeries} />
          <div className="row-between" style={{ marginTop: "var(--s-3)" }}>
            <div className="row" style={{ gap: "var(--s-5)" }}>
              <Stat label="Avg. quotation" value="PKR 4.2L" />
              <Stat label="Win rate" value="18.7%" delta={-0.019} />
              <Stat label="Avg. deal size" value="PKR 3.9L" delta={0.061} />
            </div>
            <Link to="/quotes" className="btn sm ghost">All quotations <ArrowUpRight size={13} /></Link>
          </div>
        </Card>

        <Card title="Needs attention" sub="Computed, not decorative">
          <div className="feed">
            {approvals.slice(0, 2).map((a, i) => (
              <div className="feed-item" key={i}>
                <span className="feed-dot"><ShieldCheck size={13} /></span>
                <div className="feed-body grow">
                  <p><b>{a.who}</b> requests: {a.what}</p>
                  <time>{timeAgo(a.asked)}</time>
                </div>
              </div>
            ))}
            <div className="feed-item">
              <span className="feed-dot"><Zap size={13} /></span>
              <div className="feed-body grow">
                <p><b>3 leads</b> have had no reply for over 48 hours</p>
                <time>oldest: L-4810 · 5d ago</time>
              </div>
            </div>
            <div className="feed-item">
              <span className="feed-dot"><Send size={13} /></span>
              <div className="feed-body grow">
                <p><b>2 WhatsApp campaigns</b> paused — template rejected by Meta</p>
                <time>Eid offer · Winter promo</time>
              </div>
            </div>
            <div className="feed-item">
              <span className="feed-dot"><HeartPulse size={13} /></span>
              <div className="feed-body grow">
                <p>Site health <b>{systemHealth.healthScore}/100</b> — {systemHealth.findings.altText} images need alt text</p>
                <time>scanned {timeAgo(systemHealth.lastScan)}</time>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* ------------------------------------------------------ mix + services */}
      <div className="grid c2" style={{ marginBottom: "var(--s-4)" }}>
        <Card title="Where leads come from" sub="Last 30 days · 184 leads">
          <ChannelBars data={channelMix} />
        </Card>

        <Card title="Service mix" sub="Leads and value by service line">
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Service line</th>
                  <th className="right">Leads</th>
                  <th className="right">Value</th>
                  <th style={{ width: 120 }}>Share</th>
                </tr>
              </thead>
              <tbody>
                {serviceMix.map((s) => (
                  <tr key={s.name}>
                    <td className="cell-main">{s.name}</td>
                    <td className="num">{s.count}</td>
                    <td className="num">PKR {(s.value / 100000).toFixed(1)}L</td>
                    <td><Bar value={s.count} max={62} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* ------------------------------------------------ recent + activity */}
      <div className="grid split">
        <Card
          title="Latest quotations"
          sub="Server-generated PDFs, dual-bank routing"
          actions={<Link to="/quotes" className="btn sm ghost">Open <ArrowUpRight size={13} /></Link>}
          tight
        >
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Number</th><th>Client</th><th>Projects</th>
                  <th className="right">Amount</th><th>Status</th><th>Issued</th>
                </tr>
              </thead>
              <tbody>
                {quotations.slice(0, 6).map((q) => (
                  <tr key={q.no}>
                    <td className="mono">{q.no}</td>
                    <td className="cell-main">{q.client}</td>
                    <td className="truncate" style={{ maxWidth: 220 }}>
                      <span className="cell-sub">{q.project}</span>
                    </td>
                    <td className="num">PKR {(q.amount / 100000).toFixed(2)}L</td>
                    <td><Pill tone={statusTone(q.status)}>{q.status}</Pill></td>
                    <td className="muted">{timeAgo(q.issued + "T10:00:00+05:00")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card
          title="Studio activity"
          sub="Every action, who and when"
          actions={<Link to="/activity" className="btn sm ghost">Log <ArrowUpRight size={13} /></Link>}
        >
          <div className="feed">
            {activity.map((a, i) => {
              const Icon = ICONS[a.icon] ?? Sparkles;
              return (
                <div className="feed-item" key={i}>
                  <span className="feed-dot"><Icon size={13} /></span>
                  <div className="feed-body">
                    <p><b>{a.who}</b> {a.what}</p>
                    <time>{timeAgo(a.when)}</time>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* -------------------------------------------------- quick actions */}
      <div style={{ marginTop: "var(--s-4)" }}>
        <Card title="Quick actions" sub="The six things a studio does most">
          {leads.length === 0 ? (
            <Empty title="Nothing yet" />
          ) : (
            <div className="tile-grid">
              {[
                { icon: Inbox, label: "Add a lead", to: "/enquiries" },
                { icon: Clock, label: "Book a site visit", to: "/bookings" },
                { icon: FileText, label: "Build a quotation", to: "/quotes" },
                { icon: Kanban, label: "Open the pipeline", to: "/pipeline" },
                { icon: Send, label: "Send a client update", to: "/updates" },
                { icon: BookOpen, label: "Publish an article", to: "/blog" },
              ].map((q) => (
                <Link key={q.label} to={q.to} className="card tile">
                  <span className="tile-ic"><q.icon size={16} /></span>
                  <b>{q.label}</b>
                  <p>Opens the screen with the new-record form ready.</p>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

function Stat({ label, value, delta }: { label: string; value: string; delta?: number }) {
  return (
    <div>
      <div className="muted" style={{ fontSize: "var(--fs-11)" }}>{label}</div>
      <div className="row" style={{ gap: "var(--s-2)" }}>
        <b style={{ fontSize: "var(--fs-14)" }}>{value}</b>
        {delta !== undefined && <Delta value={delta} />}
      </div>
    </div>
  );
}
