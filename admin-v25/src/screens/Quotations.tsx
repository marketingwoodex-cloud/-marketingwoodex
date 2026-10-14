/* Quotations — how the 34-line BOQ document is built and printed.
   This screen is the strongest argument for the rewrite: the v2.1 builder
   recalculated totals in the browser with floating-point maths and wrote the
   result into a LONGTEXT JSON blob. Here the total is shown as a *projection*
   and marked as authoritative only when the server confirms it — the plan's
   rule that money is never trusted from the client. */
import { useMemo, useState } from "react";
import {
  Building2, Calculator, Download, FileText, Landmark, Plus, Printer, Send, Trash2,
} from "lucide-react";
import { Btn, Card, Input, PageHead, Pill, Seg, statusTone } from "../components/primitives";
import { quotations, type Quotation } from "../lib/mock";
import { dateShort, money } from "../lib/format";
import { useSession } from "../lib/session";
import { ROUTES } from "../lib/nav";
import { Placeholder } from "./Placeholder";

interface Line {
  id: number;
  desc: string;
  unit: string;
  qty: number;
  rate: number;
}

const SEED_LINES: Line[] = [
  { id: 1, desc: "Site survey, measurement and as-built drawings", unit: "lot", qty: 1, rate: 85_000 },
  { id: 2, desc: "Demolition and debris removal", unit: "sq ft", qty: 1_450, rate: 42 },
  { id: 3, desc: "Electrical rework — points, conduit, DB upgrade", unit: "point", qty: 68, rate: 3_400 },
  { id: 4, desc: "Gypsum false ceiling with cove lighting", unit: "sq ft", qty: 820, rate: 385 },
  { id: 5, desc: "Vitrified tile flooring 600×1200", unit: "sq ft", qty: 1_240, rate: 465 },
  { id: 6, desc: "Custom veneer joinery — reception counter", unit: "ft", qty: 14, rate: 18_500 },
  { id: 7, desc: "Workstations with wire management", unit: "no", qty: 18, rate: 62_000 },
  { id: 8, desc: "Paint — premium emulsion, 2 coats plus primer", unit: "sq ft", qty: 3_100, rate: 78 },
];

/**
 * Demo mode, or the build plan — the same rule as the pipeline board beside it.
 *
 * The builder here is the design for the screen that will write quotations (`quote_save`), and it computes
 * its total in the browser to make the point that the server's figure is the authoritative one. Nothing on it
 * is read from the studio's data, so on a host where that data exists it would be a document-shaped lie.
 */
export function Quotations() {
  const { demo } = useSession();
  const route = ROUTES.find((r) => r.id === "quotes");
  if (demo && route) return <DemoQuotations />;
  return route ? <Placeholder route={route} /> : null;
}

function DemoQuotations() {
  const [tab, setTab] = useState<"list" | "builder">("list");
  const [lines, setLines] = useState<Line[]>(SEED_LINES);
  const [bank, setBank] = useState<"alfalah" | "meezan">("alfalah");
  const [template, setTemplate] = useState("Envelope");

  const subtotal = useMemo(() => lines.reduce((s, l) => s + l.qty * l.rate, 0), [lines]);
  const tax = Math.round(subtotal * 0.05);
  const total = subtotal + tax;

  const setLine = (id: number, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  return (
    <>
      <PageHead
        title="Quotations"
        sub="8 starter templates · dual-bank routing · HMAC-signed public view"
        actions={
          <>
            <Btn><Download size={15} /> Export</Btn>
            <Btn className="primary" onClick={() => setTab(tab === "builder" ? "list" : "builder")}>
              {tab === "builder" ? <><FileText size={15} /> Back to list</> : <><Plus size={15} /> New quotation</>}
            </Btn>
          </>
        }
      />

      <div style={{ marginBottom: "var(--s-4)" }}>
        <Seg
          value={tab}
          onChange={setTab}
          options={[
            { id: "list", label: `All quotations (${quotations.length})` },
            { id: "builder", label: "Builder" },
          ]}
        />
      </div>

      {tab === "list" ? <List /> : (
        <>
          <div className="grid split">
            <Card
              title="Bill of quantities"
              sub="Line items · quantities come from the rate book"
              actions={<Pill tone="accent" plain><Calculator size={11} /> {lines.length} lines</Pill>}
              tight
            >
              <div className="table-wrap">
                <table className="data">
                  <thead>
                    <tr>
                      <th style={{ width: 30 }}>#</th>
                      <th>Description</th>
                      <th style={{ width: 78 }}>Unit</th>
                      <th style={{ width: 88 }} className="right">Qty</th>
                      <th style={{ width: 110 }} className="right">Rate</th>
                      <th style={{ width: 120 }} className="right">Amount</th>
                      <th style={{ width: 40 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((l, i) => (
                      <tr key={l.id}>
                        <td className="muted">{i + 1}</td>
                        <td>
                          <input
                            className="input"
                            style={{ border: 0, background: "transparent", padding: 0, height: "auto" }}
                            value={l.desc}
                            onChange={(e) => setLine(l.id, { desc: e.target.value })}
                            aria-label={`Description for line ${i + 1}`}
                          />
                        </td>
                        <td className="muted">{l.unit}</td>
                        <td className="num">
                          <input
                            className="input" type="number" style={{ textAlign: "right", height: 26 }}
                            value={l.qty} aria-label={`Quantity for line ${i + 1}`}
                            onChange={(e) => setLine(l.id, { qty: Number(e.target.value) })}
                          />
                        </td>
                        <td className="num">
                          <input
                            className="input" type="number" style={{ textAlign: "right", height: 26 }}
                            value={l.rate} aria-label={`Rate for line ${i + 1}`}
                            onChange={(e) => setLine(l.id, { rate: Number(e.target.value) })}
                          />
                        </td>
                        <td className="num"><b>{money(l.qty * l.rate)}</b></td>
                        <td>
                          <Btn variant="ghost" size="sm" iconOnly title="Remove line"
                            onClick={() => setLines((ls) => ls.filter((x) => x.id !== l.id))}>
                            <Trash2 size={13} />
                          </Btn>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="card-foot">
                <Btn size="sm" onClick={() =>
                  setLines((ls) => [...ls, { id: Date.now(), desc: "", unit: "no", qty: 1, rate: 0 }])
                }>
                  <Plus size={14} /> Add line
                </Btn>
              </div>
            </Card>

            <div className="stack" style={{ gap: "var(--s-4)" }}>
              <Card title="Document settings">
                <div className="stack" style={{ gap: "var(--s-3)" }}>
                  <Field label="Template">
                    <select className="select" value={template} onChange={(e) => setTemplate(e.target.value)}>
                      {["Envelope", "Classic", "Minimal", "Premium"].map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Client">
                    <Input defaultValue="Raza Textiles (Pvt) Ltd" />
                  </Field>
                  <Field label="Project">
                    <Input defaultValue="Office fit-out — Gulberg III, Lahore" />
                  </Field>
                  <Field label="Validity">
                    <Input type="date" defaultValue="2026-11-05" />
                  </Field>
                </div>
              </Card>

              <Card title="Payment routing" sub="Two accounts, chosen per document">
                <div className="row" style={{ gap: "var(--s-2)" }}>
                  <Btn
                    className={bank === "alfalah" ? "primary" : ""}
                    onClick={() => setBank("alfalah")}
                    style={{ flex: 1 }}
                  >
                    <Landmark size={14} /> Bank Alfalah
                  </Btn>
                  <Btn
                    className={bank === "meezan" ? "primary" : ""}
                    onClick={() => setBank("meezan")}
                    style={{ flex: 1 }}
                  >
                    <Landmark size={14} /> Meezan Bank
                  </Btn>
                </div>
                <div className="note" style={{ marginTop: "var(--s-3)" }}>
                  <Building2 size={15} />
                  <div>
                    <b>{bank === "alfalah" ? "Bank Alfalah" : "Meezan Bank"}</b>
                    <div className="mono" style={{ fontSize: "var(--fs-11)" }}>
                      {bank === "alfalah"
                        ? "PK36 ALFH 0112 3456 7890 1234"
                        : "PK11 MEZN 0009 8765 4321 0987"}
                    </div>
                    <div className="muted" style={{ fontSize: "var(--fs-11)" }}>
                      Woodex Interior · Model Town Link Road, Lahore
                    </div>
                  </div>
                </div>
              </Card>

              <Card title="Totals">
                <div className="stack">
                  <Row2 k="Subtotal" v={money(subtotal)} />
                  <Row2 k="Sales tax (5%)" v={money(tax)} />
                  <Row2 k="Round-off" v="PKR 0" muted />
                  <div style={{ borderTop: "1px solid var(--border)", paddingTop: "var(--s-3)" }}>
                    <Row2 k="Grand total" v={money(total)} strong />
                  </div>
                </div>
                <div className="note warn" style={{ marginTop: "var(--s-3)" }}>
                  <Calculator size={15} />
                  <div>
                    <b>Projection only.</b> This total is calculated in the browser. It becomes the
                    document of record only after <span className="mono">POST /api/v2/quotations</span>{" "}
                    returns the server-computed total and the PDF hash.
                  </div>
                </div>
                <div className="row" style={{ marginTop: "var(--s-3)", gap: "var(--s-2)" }}>
                  <Btn className="primary grow"><Send size={15} /> Save &amp; send</Btn>
                  <Btn><Printer size={15} /></Btn>
                </div>
              </Card>
            </div>
          </div>
        </>
      )}
    </>
  );
}

function List() {
  return (
    <Card tight>
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Number</th><th>Client</th><th>Project</th><th>Template</th>
              <th className="right">Items</th><th className="right">Amount</th>
              <th>Status</th><th>Issued</th><th>Valid until</th>
            </tr>
          </thead>
          <tbody>
            {quotations.map((q) => <Row key={q.no} q={q} />)}
          </tbody>
        </table>
      </div>
      <div className="card-foot row-between">
        <span className="muted" style={{ fontSize: "var(--fs-12)" }}>
          {quotations.length} documents ·{" "}
          <b>{money(quotations.reduce((s, q) => s + q.amount, 0), { compact: true })}</b> quoted this period
        </span>
        <Btn size="sm" className="ghost">Server PDF batch <Printer size={13} /></Btn>
      </div>
    </Card>
  );
}

function Row({ q }: { q: Quotation }) {
  return (
    <tr>
      <td className="mono">{q.no}</td>
      <td className="cell-main">{q.client}</td>
      <td className="cell-sub truncate" style={{ maxWidth: 240 }}>{q.project}</td>
      <td><span className="cell-sub">{q.template}</span></td>
      <td className="num">{q.items}</td>
      <td className="num">{money(q.amount, { compact: true })}</td>
      <td><Pill tone={statusTone(q.status) as never}>{q.status}</Pill></td>
      <td className="muted nowrap">{dateShort(q.issued)}</td>
      <td className="muted nowrap">{dateShort(q.validUntil)}</td>
    </tr>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="stack" style={{ gap: 6 }}>
      <span className="muted" style={{ fontSize: "var(--fs-11)", fontWeight: 600 }}>{label}</span>
      {children}
    </label>
  );
}

function Row2({ k, v, strong, muted }: { k: string; v: string; strong?: boolean; muted?: boolean }) {
  return (
    <div className="row-between">
      <span className={muted ? "muted" : ""} style={{ fontWeight: strong ? 650 : 500 }}>{k}</span>
      <span style={{ fontWeight: strong ? 700 : 550, fontSize: strong ? "var(--fs-16)" : undefined }}>
        {v}
      </span>
    </div>
  );
}
