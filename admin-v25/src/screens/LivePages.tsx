/**
 * LivePages — the site's pages and their history, grouped by change.
 *
 * This is the screen that closes the Phase 3 gate. The gate's sentence has three parts — an editor
 * publishes an article, the header changes across 150 pages, the change is rolled back from page history
 * — and the third part needs one thing above all: **a person must be able to see what changed, as a
 * change.** A list of file versions cannot do that. The change that rewrote 148 pages is 148 rows with one
 * batch id, and 148 rows is a wall that hides the single undo button that matters.
 *
 * So the history tab shows *changes*: "148 pages · header/footer updated · 4 minutes ago · Imtiaz" with
 * one **Undo this change** button. Pressing it calls `POST /pages/rollback` with that batch, which restores
 * the oldest version of every page in it and returns a *new* batch id — the undo is itself undoable, and
 * the screen says so rather than leaving the person to wonder.
 *
 * The pages tab is deliberately quiet: which folders exist, which pages the site has, which ones were
 * written by a newer version of v2.1 than the index knows about (`stale` — the v2.1 case of a file edited
 * by hand), and how many versions each one has. Selecting a page shows its versions, and any of them can be
 * put back.
 */
import { useEffect, useMemo, useState } from "react";
import { FileStack, History, RefreshCw, Undo2 } from "lucide-react";
import { Btn, Card, Empty, Note, PageHead, Pill, Seg } from "../components/primitives";
import { api, ApiFailure } from "../lib/api";
import { useSession } from "../lib/session";
import {
  isPending, useLive,
  type PageChange, type PageDetail, type PagesData, type RollbackResult,
} from "../lib/live";
import { bytes, timeAgo } from "../lib/format";

type Tab = "pages" | "history";

export function LivePages() {
  const { link, reason } = useSession();
  const [tab, setTab] = useState<Tab>("pages");
  const [folder, setFolder] = useState("");
  const [q, setQ] = useState("");
  const [rel, setRel] = useState<string | null>(null);

  const pages = useLive<PagesData>("/pages");
  const history = useLive<{ changes: PageChange[]; grouped: boolean }>(tab === "history" ? "/pages/history?limit=40" : null, tab);
  const detail = useLive<PageDetail>(rel === null ? null : `/pages/${rel}`, rel);

  const [result, setResult] = useState<string | null>(null);
  const [bad, setBad] = useState<ApiFailure | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setResult(null);
    setBad(null);
  }, [tab, rel]);

  async function run<T>(fn: () => Promise<T>): Promise<T | null> {
    setBusy(true);
    setBad(null);
    try {
      return await fn();
    } catch (err) {
      setBad(err instanceof ApiFailure ? err : new ApiFailure({ code: "INTERNAL", message: String(err) }, 0, "client"));
      return null;
    } finally {
      setBusy(false);
    }
  }

  /** Undo a whole change — the gate's last sentence, in one call. */
  async function undo(batch: string) {
    const r = await run(
      () => api.post<RollbackResult | { pending: true; message: string }>("/pages/rollback", { batch }),
    );
    setResult(null);
    if (r && isPending(r)) {
      setResult(r.message);
      return;
    }
    if (r && "restored" in r) {
      const extra = [
        r.missing.length ? `${r.missing.length} page${r.missing.length === 1 ? " is" : "s are"} no longer on disk` : "",
        r.errors.length ? `${r.errors.length} could not be written` : "",
      ].filter(Boolean).join("; ");
      setResult(
        `Put ${r.restored.length} page${r.restored.length === 1 ? "" : "s"} back to how they were before this change` +
        `${extra ? ` (${extra})` : ""}. That undo is itself a change — batch ${r.undoBatch.slice(0, 8)} — so it can be undone too.`,
      );
      history.reload();
      pages.reload();
    }
  }

  /** Put one version of one page back. `versionId` is the history row, which is what the API restores. */
  async function restore(relName: string, versionId: number) {
    const r = await run(
      () => api.post<{ rel: string; version: number } | { pending: true; message: string }>(
        `/pages/${relName}/restore`, { version: versionId },
      ),
    );
    if (r && isPending(r)) {
      setResult(r.message);
      return;
    }
    if (r && "version" in r) {
      setResult(`${relName} is back to history version #${versionId}. What it replaced was written to the history first, so this restore is itself reversible.`);
      detail.reload();
      history.reload();
      pages.reload();
    }
  }

  const filtered = useMemo(() => {
    const list = pages.data?.pages ?? [];
    return list
      .filter((p) => (folder === "" ? true : (p.folder === "" ? "(root)" : p.folder) === folder))
      .filter((p) => (q === "" ? true : p.rel.toLowerCase().includes(q.toLowerCase()) || (p.title ?? "").toLowerCase().includes(q.toLowerCase())));
  }, [pages.data, folder, q]);

  /* ---------------- the states that must not lie ---------------- */

  if (link !== "live") {
    return (
      <>
        <PageHead title="All pages" sub="Every public page, and the history of every change" />
        <Note tone="warn" title="Not connected">
          {link === "offline"
            ? "api/v2 is not answering. The 150 pages are on the server and could be edited by hand, but this screen will not show a list it cannot read."
            : "Sign in to see the pages and their history."}
          {reason ? ` — ${reason}` : ""}
        </Note>
      </>
    );
  }

  if (!pages.data && pages.loading) {
    return (
      <>
        <PageHead title="All pages" sub="Every public page, and the history of every change" />
        <Card><div className="muted" style={{ padding: 18 }}>Loading…</div></Card>
      </>
    );
  }

  if (!pages.data && pages.error) {
    return (
      <>
        <PageHead title="All pages" sub="Every public page, and the history of every change" />
        <Note tone="danger" title="The page list could not be read">{pages.error.message}</Note>
      </>
    );
  }

  const data = pages.data;

  return (
    <>
      <PageHead
        title="All pages"
        sub={
          data
            ? `${data.count} pages${data.missing.length ? ` · ${data.missing.length} indexed and no longer on disk` : ""}${data.stale ? ` · ${data.stale} changed outside v2.5` : ""}`
            : ""
        }
        actions={<Btn icon={<RefreshCw size={15} />} onClick={() => { pages.reload(); history.reload(); }}>Refresh</Btn>}
      />

      {data && data.missing.length > 0 && (
        <Note tone="warn" title={`${data.missing.length} indexed page${data.missing.length === 1 ? " is" : "s are"} not on disk`}>
          The index remembers files that are gone — {data.missing.slice(0, 4).join(", ")}{data.missing.length > 4 ? ` and ${data.missing.length - 4} more` : ""}. Its history is safe; nobody can restore a page to a file that is not there.
        </Note>
      )}
      {data && data.stale > 0 && (
        <Note tone="info" title={`${data.stale} page${data.stale === 1 ? "" : "s"} changed outside v2.5`}>
          The size on disk does not match the size in the index, which means something else wrote the file.
          Opening the page's history will record the current bytes as a version — nothing is lost either way,
          but the history is only useful if the newest version is the one that is live.
        </Note>
      )}

      {result && <Note tone="ok" title="Done">{result}</Note>}
      {bad && <Note tone="danger" title="That did not work">{bad.message}{bad.detail ? ` — ${bad.detail}` : ""}</Note>}

      <div className="toolbar">
        <Seg
          options={[{ id: "pages", label: "Pages" }, { id: "history", label: "History" }]}
          value={tab}
          onChange={(t) => setTab(t as Tab)}
        />
        {tab === "pages" && (
          <>
            <div className="grow" />
            <Seg
              options={[{ id: "", label: "Every folder" }, ...Object.entries(data?.folders ?? {}).map(([f, n]) => ({ id: f, label: `${f} (${n})` }))]}
              value={folder}
              onChange={setFolder}
            />
            <input className="input" placeholder="Filter by address or title…" value={q} onChange={(e) => setQ(e.target.value)} />
          </>
        )}
      </div>

      {tab === "history" && (
        <Card>
          <h2 className="cell-main">Recent changes</h2>
          <p className="cell-sub">
            One entry per change, not per file: the header across 148 pages is one line with one undo. A
            change with no batch id is a single write from before batches existed — it cannot be undone as a
            group, and the screen says so instead of guessing.
          </p>
          {!history.data && history.loading && <div className="muted" style={{ padding: 18 }}>Loading…</div>}
          {history.data && history.data.changes.length === 0 && (
            <Empty title="Nothing has been written yet" sub="Every page write is recorded here the first time it happens." />
          )}
          {history.data && history.data.changes.length > 0 && (
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr><th>Change</th><th>Pages</th><th>When</th><th>By</th><th></th></tr>
                </thead>
                <tbody>
                  {history.data.changes.map((c) => (
                    <tr key={c.batch || `${c.at}-${c.sample[0]}`}>
                      <td>
                        <span className="cell-main">{c.note || "(no note)"}</span>
                        <span className="cell-sub mono truncate">
                          {c.sample.slice(0, 3).join(", ")}{c.pages > 3 ? ` and ${c.pages - 3} more` : ""}
                        </span>
                      </td>
                      <td className="nowrap">
                        {c.pages} page{c.pages === 1 ? "" : "s"}
                        <span className="cell-sub"> · {bytes(c.bytes)}</span>
                      </td>
                      <td className="nowrap">{timeAgo(c.at)}</td>
                      <td>{c.by || "—"}</td>
                      <td>
                        {c.undoable ? (
                          <Btn icon={<Undo2 size={14} />} onClick={() => undo(c.batch)} disabled={busy}
                            title={`Put all ${c.pages} page${c.pages === 1 ? "" : "s"} in this change back to the version before it`}>
                            Undo this change
                          </Btn>
                        ) : (
                          <Pill tone="neutral" title="This version predates batch ids, so there is no group to undo — open the page and restore the version instead.">
                            Open the page
                          </Pill>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {tab === "pages" && (
        <div className="content-split">
          <Card>
            <h2 className="cell-main">{filtered.length} pages</h2>
            {filtered.length === 0 ? (
              <Empty title="Nothing matches" sub="Try another folder or clear the filter." />
            ) : (
              <div className="table-wrap">
                <table className="data">
                  <thead>
                    <tr><th>Page</th><th>Size</th><th>Versions</th></tr>
                  </thead>
                  <tbody>
                    {filtered.map((p) => (
                      <tr key={p.rel} className={rel === p.rel ? "is-selected" : undefined} style={{ cursor: "pointer" }} onClick={() => setRel(p.rel)}>
                        <td>
                          <span className="cell-main">{p.title || p.rel}</span>
                          <span className="cell-sub mono truncate">/{p.rel}</span>
                        </td>
                        <td className="nowrap mono">{bytes(p.bytes)}</td>
                        <td className="nowrap">
                          {p.versions || "—"}
                          {p.stale && <Pill tone="warn" title="The file on disk is not the size the index recorded">changed</Pill>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card>
            {!rel ? (
              <Empty title="Nothing selected" sub="Pick a page to see its versions and restore one." />
            ) : !detail.data && detail.loading ? (
              <div className="muted" style={{ padding: 18 }}>Loading…</div>
            ) : detail.error ? (
              <Note tone="danger" title="That page could not be read">{detail.error.message}</Note>
            ) : detail.data ? (
              /* The panel is its own component: the narrowing of `detail.data` cannot travel into the
                 callbacks defined in the same render, and a prop is a better answer than a cast. */
              <PagePanel p={detail.data} busy={busy} onRestore={restore} />
            ) : null}
          </Card>
        </div>
      )}
    </>
  );
}

/** One page's versions, with the restore button for each. */
function PagePanel({ p, busy, onRestore }: { p: PageDetail; busy: boolean; onRestore: (rel: string, versionId: number) => void }) {
  return (
<div className="stack">
                <div className="row-between">
                  <h2 className="cell-main">{p.index?.title || p.rel}</h2>
                  <span className="cell-sub mono">/{p.rel}</span>
                </div>
                <div className="row">
                  <Pill tone="neutral">{bytes(p.bytes)}</Pill>
                  <Pill tone={p.fresh ? "ok" : "warn"} title={p.fresh ? "The index agrees with the file on disk" : "The file on disk differs from the index"}>
                    {p.fresh ? "index agrees with disk" : "changes outside v2.5"}
                  </Pill>
                  {p.index?.updatedBy && <Pill tone="neutral" title={`Last written through v2.5 by ${p.index.updatedBy}`}>{p.index.updatedBy}</Pill>}
                </div>
                <p className="cell-sub">
                  {p.versions.length === 0
                    ? "No versions yet: this page has not been written through v2.5. The first write records the version it replaces."
                    : `${p.versions.length} version${p.versions.length === 1 ? "" : "s"} — the newest first. Restoring one writes a new version, so a restore can itself be undone.`}
                </p>
                <div className="table-wrap">
                  <table className="data">
                    <thead><tr><th>When</th><th>By</th><th>Note</th><th>Size</th><th></th></tr></thead>
                    <tbody>
                      {p.versions.map((v) => (
                        <tr key={v.id}>
                          <td className="nowrap">{timeAgo(v.at)}</td>
                          <td>{v.by || "—"}</td>
                          <td className="truncate">{v.note || "—"}{v.restoredFrom ? ` (restored from #${v.restoredFrom})` : ""}</td>
                          <td className="nowrap mono">{bytes(v.bytes)}</td>
                          <td>
                            <Btn icon={<History size={14} />} onClick={() => onRestore(p.rel, v.id)} disabled={busy}>
                              Restore
                            </Btn>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="cell-sub">
                  <FileStack size={13} /> The history is per page; the *change* across many pages is on the
                  History tab, where one undo puts every page in it back.
                </p>
              </div>
  );
}
