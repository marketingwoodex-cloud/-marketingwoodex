/**
 * LiveGlobal — the header, the menu and the footer, and the two numbers that make the screen honest.
 *
 * This is the Phase 3 gate's second sentence: *"changes the header across 150 pages"*. The site is not
 * templated — every page is its own finished HTML document — so "change the header" means finding the
 * header in every page and replacing it while keeping what is genuinely per-page:
 *
 *   · the current page's own link gets `aria-current="page"`, or the menu highlights nothing;
 *   · the home page's brand is marked as the current page;
 *   · the mobile menu keeps *this page's* "Get a quote" target, which differs by page;
 *   · the footer keeps this page's own section anchors and its own intro sentence — and a footer link
 *     written `/#page-contact` becomes `#page-contact` on the pages that actually have that section.
 *
 * All of that happens on the server (`lib/chrome.php`), and it is why this screen has two buttons rather
 * than one. **Check** runs the whole edit and writes nothing; **Apply** runs the same edit and writes.
 * The count on the Apply button is the count Check measured, so "148 pages will change" is a measurement
 * rather than a promise — and after Apply, the screen reports the batch id, because the same page
 * history that versions a single page versions this change too, and one call rolls all of it back.
 *
 * The coverage line at the top is the other number that matters: if 12 pages have no `<footer
 * class="footer">`, a footer edit cannot reach them, and a screen that said "150 pages · done" would be
 * telling the person something untrue.
 */
import { useEffect, useMemo, useState } from "react";
import { ArrowRightLeft, Eye, History, RefreshCw, Rocket, Undo2 } from "lucide-react";
import { Btn, Card, Empty, Note, PageHead, Pill, Seg } from "../components/primitives";
import { api, ApiFailure } from "../lib/api";
import { useSession } from "../lib/session";
import {
  isPending, useLive,
  type ChromeData, type ChromeDiff, type ChromeResult, type ReplaceResult,
} from "../lib/live";
import { timeAgo } from "../lib/format";

type Tab = "header" | "menu" | "footer" | "replace";

/** What each tab edits, and which region of the page it is. */
const TAB_REGIONS: Record<Exclude<Tab, "replace">, string[]> = {
  header: ["brand", "cta", "design"],
  menu: ["menu"],
  footer: ["footer"],
};

export function LiveGlobal() {
  const { link, reason } = useSession();
  const mine = useLive<ChromeData>("/chrome");

  const [tab, setTab] = useState<Tab>("header");
  const [brand, setBrand] = useState("");
  const [cta, setCta] = useState("");
  const [phone, setPhone] = useState("");
  const [style, setStyle] = useState("");
  const [menuDesktop, setMenuDesktop] = useState("");
  const [menuMobile, setMenuMobile] = useState("");
  const [footer, setFooter] = useState("");
  const [introAll, setIntroAll] = useState(false);

  const [find, setFind] = useState("");
  const [replace, setReplace] = useState("");
  const [scope, setScope] = useState<string[]>(["header"]);

  const [diff, setDiff] = useState<ChromeDiff | null>(null);
  const [rep, setRep] = useState<ReplaceResult | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [bad, setBad] = useState<ApiFailure | null>(null);
  const [busy, setBusy] = useState(false);

  const data = mine.data;
  const stored = data?.chrome;

  /* Loading the stored chrome *into the fields* is what makes this a form: the fields hold what the
     editor is about to apply, not what the site currently says. The empty state matters — on a fresh
     install nothing is stored, and the screen offers the header the site actually has, read off a real
     page, as the starting point. */
  useEffect(() => {
    if (!stored) return;
    const source = data?.fromPage;
    setBrand((b) => b || stored.brand || source?.brand || "");
    setCta((c) => c || stored.cta || "");
    setPhone((p) => p || stored.phone || source?.phone || "");
    setStyle((s) => s || stored.style || source?.style || "");
    setMenuDesktop((m) => m || stored.menuDesktop || source?.menuDesktop || "");
    setMenuMobile((m) => m || stored.menuMobile || source?.menuMobile || "");
    setFooter((f) => f || stored.footer || source?.footer || "");
    /* Fields are filled once, from the first answer: typing must not be overwritten by a refresh, and an
       editor who clears a field means it. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stored]);

  const edit = useMemo(() => {
    if (tab === "menu") return { regions: TAB_REGIONS.menu, menuDesktop, menuMobile };
    if (tab === "footer") return { regions: TAB_REGIONS.footer, footer, introAll };
    if (tab === "header") return { regions: TAB_REGIONS.header, brand, cta, phone, style, introAll };
    return {};
  }, [tab, brand, cta, phone, style, menuDesktop, menuMobile, footer, introAll]);

  async function run<T>(fn: () => Promise<T>): Promise<T | null> {
    setBusy(true);
    setBad(null);
    setResult(null);
    try {
      return await fn();
    } catch (err) {
      setBad(err instanceof ApiFailure ? err : new ApiFailure({ code: "INTERNAL", message: String(err) }, 0, "client"));
      return null;
    } finally {
      setBusy(false);
    }
  }

  /** Check: the whole edit, no writes. */
  async function check() {
    const r = await run(() => api.post<ChromeDiff | { pending: true; message: string }>("/chrome/preview", { ...edit, limit: 40 }));
    setRep(null);
    if (r && isPending(r)) setResult(r.message);
    else setDiff(r as ChromeDiff);
  }

  /** Apply: the same edit, written. */
  async function apply() {
    const r = await run(() => api.post<ChromeResult | { pending: true; message: string }>("/chrome", { ...edit, note: `${tab} updated from the admin` }));
    if (r && isPending(r)) {
      setResult(r.message);
      return;
    }
    if (r && "batch" in r) {
      setDiff(null);
      const skipped = r.skipped ? ` ${r.skipped} page${r.skipped === 1 ? "" : "s"} already matched and were left alone.` : "";
      setResult(
        `${r.pages} page${r.pages === 1 ? "" : "s"} changed out of ${r.scanned} read.${skipped} ` +
        `The change is batch ${r.batch.slice(0, 8)} in page history — one call rolls all of it back.`,
      );
      mine.reload();
    }
  }

  async function dryRun() {
    const r = await run(() => api.post<ReplaceResult | { pending: true; message: string }>("/chrome/replace", { find, replace, scope, dry: true }));
    if (r && isPending(r)) setResult(r.message);
    else setRep(r as ReplaceResult);
  }

  async function doReplace() {
    const r = await run(() => api.post<ReplaceResult | { pending: true; message: string }>("/chrome/replace", { find, replace, scope, dry: false }));
    if (r && isPending(r)) {
      setResult(r.message);
      return;
    }
    if (r && "total" in r) {
      setRep(null);
      setResult(`${r.total} replacement${r.total === 1 ? "" : "s"} in ${r.pages.length} page${r.pages.length === 1 ? "" : "s"}${r.batch ? ` — batch ${r.batch.slice(0, 8)}, one undo` : ""}.`);
      mine.reload();
    }
  }

  async function restore(id: number) {
    const r = await run(() => api.post<{ chrome: ChromeData["chrome"]; restored: number; applied: boolean; hint: string } | { pending: true; message: string }>(`/chrome/versions/${id}`, {}));
    if (r && !isPending(r) && "hint" in r) {
      setBrand(r.chrome.brand);
      setCta(r.chrome.cta);
      setPhone(r.chrome.phone);
      setStyle(r.chrome.style);
      setMenuDesktop(r.chrome.menuDesktop);
      setMenuMobile(r.chrome.menuMobile);
      setFooter(r.chrome.footer);
      setResult(`Version ${r.restored} is loaded into the fields. ${r.hint}`);
      mine.reload();
    } else if (r && isPending(r)) {
      setResult(r.message);
    }
  }

  /* ---------------- the states that must not lie ---------------- */

  if (link !== "live") {
    return (
      <>
        <PageHead title="Header & footer" sub="One change, every page" />
        <Note tone="warn" title="Not connected">
          {link === "offline"
            ? "api/v2 is not answering. The header could be changed by hand on the server, but this screen will not pretend it knows what the site says."
            : "Sign in to change the header and the footer."}
          {reason ? ` — ${reason}` : ""}
        </Note>
      </>
    );
  }

  if (!data && mine.loading) {
    return (
      <>
        <PageHead title="Header & footer" sub="One change, every page" />
        <Card><div className="muted" style={{ padding: 18 }}>Loading…</div></Card>
      </>
    );
  }

  if (!data && mine.error) {
    return (
      <>
        <PageHead title="Header & footer" sub="One change, every page" />
        <Note tone="danger" title="The chrome could not be read">{mine.error.message}</Note>
      </>
    );
  }

  const cov = data?.coverage;

  return (
    <>
      <PageHead
        title="Header & footer"
        sub={
          cov
            ? `${cov.pages} pages carry a header · ${cov.regions.footer ?? 0} carry a footer · ${cov.regions.menuDesktop ?? 0} have a desktop menu`
            : "One change, every page"
        }
        actions={
          <>
            <Btn icon={<RefreshCw size={15} />} onClick={mine.reload}>Refresh</Btn>
            <Btn variant="primary" icon={<Eye size={15} />} onClick={check} disabled={busy || tab === "replace"}>
              Check what would change
            </Btn>
          </>
        }
      />

      {!stored?.brand && !stored?.footer && data?.fromPage && (
        <Note tone="info" title={`Nothing has been applied from here yet — starting from ${data.fromPage.rel}`}>
          The header and the footer below were read off a real page, so the first Apply replaces the site's
          own header with the site's own header. Nothing changes until you edit something.
        </Note>
      )}

      {result && <Note tone="ok" title="Done">{result}</Note>}
      {bad && <Note tone="danger" title="That did not work">{bad.message}{bad.detail ? ` — ${bad.detail}` : ""}</Note>}

      <div className="toolbar">
        <Seg
          options={[
            { id: "header", label: "Header" },
            { id: "menu", label: "Menus" },
            { id: "footer", label: "Footer" },
            { id: "replace", label: "Find & replace" },
          ]}
          value={tab}
          onChange={(t) => { setTab(t as Tab); setDiff(null); setRep(null); }}
        />
        {data?.versions && data.versions.length > 0 && (
          <span className="cell-sub">
            <History size={13} /> last applied {stored?.updatedAt ? timeAgo(stored.updatedAt) : "—"} by {stored?.updatedBy || "—"}
          </span>
        )}
      </div>

      {tab === "header" && (
        <Card>
          <div className="stack">
            <label className="stack">
              <span className="field-label">Brand (the logo link in the header)</span>
              <textarea className="input mono" rows={2} value={brand} onChange={(e) => setBrand(e.target.value)}
                placeholder={'<a class="brand" href="/">…</a>'} />
              <span className="cell-sub">The home page's brand gets <code>aria-current="page"</code> automatically.</span>
            </label>
            <div className="grid-2">
              <label className="stack">
                <span className="field-label">Header button text</span>
                <input className="input" maxLength={40} value={cta} onChange={(e) => setCta(e.target.value)} placeholder="Get a quote" />
              </label>
              <label className="stack">
                <span className="field-label">Header phone</span>
                <input className="input mono" value={phone} onChange={(e) => setPhone(e.target.value)}
                  placeholder={'<a class="wx-hphone" href="tel:+92…">…</a>'} />
                <span className="cell-sub">Leave empty and any existing phone is removed — this is how you turn it off.</span>
              </label>
            </div>
            <label className="stack">
              <span className="field-label">Design block (the single style element the site reads its colours from)</span>
              <textarea className="input mono" rows={4} value={style} onChange={(e) => setStyle(e.target.value)}
                placeholder={'<style id="wx-chrome-style" data-cfg="…">…</style>'} />
              <span className="cell-sub">Applied twice, it produces the same page — the element is rewritten, never added twice.</span>
            </label>
          </div>
        </Card>
      )}

      {tab === "menu" && (
        <Card>
          <div className="stack">
            <label className="stack">
              <span className="field-label">Desktop navigation</span>
              <textarea className="input mono" rows={6} value={menuDesktop} onChange={(e) => setMenuDesktop(e.target.value)}
                placeholder={'<nav class="desktop-nav">…</nav>'} />
              <span className="cell-sub">Each page's own link is marked <code>aria-current="page"</code> when this is applied.</span>
            </label>
            <label className="stack">
              <span className="field-label">Mobile panel</span>
              <textarea className="input mono" rows={5} value={menuMobile} onChange={(e) => setMenuMobile(e.target.value)}
                placeholder={'<nav class="mobile-panel">…</nav>'} />
              <span className="cell-sub">The mobile "Get a quote" button keeps whatever target the page already had — a service page and the blog point somewhere different on purpose.</span>
            </label>
          </div>
        </Card>
      )}

      {tab === "footer" && (
        <Card>
          <div className="stack">
            <label className="stack">
              <span className="field-label">Footer</span>
              <textarea className="input mono" rows={10} value={footer} onChange={(e) => setFooter(e.target.value)}
                placeholder={'<footer class="footer">…</footer>'} />
            </label>
            <label className="row">
              <input type="checkbox" checked={introAll} onChange={(e) => setIntroAll(e.target.checked)} />
              <span>Use this footer's intro sentence on every page</span>
            </label>
            <span className="cell-sub">
              Off (the default), each page keeps the sentence that describes it. On, this text replaces all of them.
              Each page's own section anchors (process, services, FAQs) are kept either way.
            </span>
          </div>
        </Card>
      )}

      {tab === "replace" && (
        <Card>
          <div className="stack">
            <div className="row">
              <input className="input" value={find} onChange={(e) => setFind(e.target.value)} placeholder="Find — at least two characters" />
              <ArrowRightLeft size={16} />
              <input className="input" value={replace} onChange={(e) => setReplace(e.target.value)} placeholder="Replace with (empty removes it)" />
            </div>
            <div className="row">
              {[["header", "Header"], ["mobile", "Mobile menu"], ["footer", "Footer"]].map(([id, label]) => (
                <label className="row" key={id}>
                  <input
                    type="checkbox"
                    checked={scope.includes(id)}
                    onChange={(e) => setScope(e.target.checked ? [...scope, id] : scope.filter((s) => s !== id))}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
            <p className="cell-sub">
              Scoped to one part of the page on purpose: a find-and-replace over whole pages is how a
              rename of a CSS class takes the layout with it. Check first — it writes nothing.
            </p>
            <div className="row">
              <Btn icon={<Eye size={15} />} onClick={dryRun} disabled={busy || find.length < 2 || scope.length === 0}>Check</Btn>
              <Btn variant="primary" icon={<Rocket size={15} />} onClick={doReplace} disabled={busy || find.length < 2 || scope.length === 0 || rep === null}
                title={rep === null ? "Check first — this touches every page's header, menu and footer" : undefined}>
                Replace in all pages
              </Btn>
            </div>
          </div>
        </Card>
      )}

      {diff && (
        <Card>
          <div className="row-between">
            <h2 className="cell-main">
              {diff.pages === 0 ? "Nothing would change" : `${diff.pages} page${diff.pages === 1 ? "" : "s"} would change`}
            </h2>
            <Btn variant="primary" icon={<Rocket size={15} />} onClick={apply} disabled={busy || diff.pages === 0}>
              Apply to {diff.pages} page{diff.pages === 1 ? "" : "s"}
            </Btn>
          </div>
          <p className="cell-sub">
            {diff.scanned} pages read · {diff.skipped} already match and will be left alone
            {diff.missing.length > 0 ? ` · ${diff.missing.length} named page${diff.missing.length === 1 ? " is" : "s are"} missing from disk` : ""}.
          </p>
          {diff.changed.length === 0 ? (
            <Empty title="Nothing to do" sub="Every page already says this. Applying now would write nothing." />
          ) : (
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr><th>Page</th><th>Before</th><th>After</th><th>Size</th></tr>
                </thead>
                <tbody>
                  {diff.changed.map((c) => (
                    <tr key={c.rel}>
                      <td className="mono truncate">{c.url}</td>
                      <td className="truncate muted">{c.before.ctaLabel ?? c.before.brand ?? c.before.menuDesktop ?? "…"}</td>
                      <td className="truncate">{c.after.ctaLabel ?? c.after.brand ?? c.after.menuDesktop ?? "…"}</td>
                      <td className="nowrap mono">{c.bytes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {diff.changed.length < diff.pages && (
            <p className="cell-sub">Showing the first {diff.changed.length} of {diff.pages}. All of them are written.</p>
          )}
        </Card>
      )}

      {rep && (
        <Card>
          <div className="row-between">
            <h2 className="cell-main">
              {rep.total === 0 ? "That text is not in any page" : `${rep.total} match${rep.total === 1 ? "" : "es"} in ${rep.pages.length} page${rep.pages.length === 1 ? "" : "s"}`}
            </h2>
            <Pill tone="info" title="Nothing was written">Check only</Pill>
          </div>
          {rep.pages.length > 0 && (
            <div className="table-wrap">
              <table className="data">
                <thead><tr><th>Page</th><th>Matches</th></tr></thead>
                <tbody>
                  {rep.pages.map((p) => (
                    <tr key={p.rel}><td className="mono truncate">{p.rel}</td><td>{p.count}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="cell-sub">{rep.scanned} pages read. Use “Replace in all pages” above to do it.</p>
        </Card>
      )}

      {data?.versions && data.versions.length > 0 && (
        <Card>
          <h2 className="cell-main">Previous headers</h2>
          <p className="cell-sub">
            This is the header *text*, not the pages. Restoring one loads it into the fields above; press
            Apply to write it across the site. The pages themselves have their own history, with an undo per
            change.
          </p>
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>Version</th><th>Note</th><th>When</th><th>By</th><th></th></tr></thead>
              <tbody>
                {data.versions.map((v) => (
                  <tr key={v.id}>
                    <td>v{v.version}</td>
                    <td className="truncate">{v.note || "—"}</td>
                    <td className="nowrap">{timeAgo(v.at)}</td>
                    <td>{v.by}</td>
                    <td>
                      <Btn icon={<Undo2 size={14} />} onClick={() => restore(v.id)} disabled={busy} title="Load this into the fields">
                        Load
                      </Btn>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}
