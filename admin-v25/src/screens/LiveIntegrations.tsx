/**
 * LiveIntegrations — the studio's connectors (GitHub, Google Drive, Gmail, the social accounts), and the keys they use.
 *
 * This is v2.1's Integrations screen, and the first part of it to move. It does three things, and the rest of
 * this comment is about why each one is shaped the way it is.
 *
 *   · **A key is write-only.** The server answers each connector with `hasSecret` and the last four characters,
 *     never the key. The form reports a stored key as *stored, ends in …abcd*, and a save that does not type a
 *     new key sends no key at all. Deleting a key is a button you press (Clear), not something a form does
 *     because a field was left empty.
 *   · **Counts come from the server.** The strip above the list is the server's `counts`, not a sum the screen
 *     works out. A screen that re-adds numbers is a screen that can disagree with the list under it.
 *   · **It says what it has not done.** Testing a connector against its provider and pushing a backup still run
 *     from the v2.1 admin. The screen says so, and it does not show a green tick the console has not earned.
 *
 * Who may open it: the owner and admins, as v2.1 asked. Anyone else sees one line saying so. In demo mode the
 * list is the sample and the write controls are not shown at all — a preview must not offer to save a key.
 */
import { useState } from "react";
import { KeyRound, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { Btn, Card, Empty, Input, Note, PageHead, Pill, statusTone, Switch } from "../components/primitives";
import { api, ApiFailure } from "../lib/api";
import { useSession } from "../lib/session";
import { isPending, useLive, type ConnItem, type ConnSaveResult, type ConnState, type PendingResult } from "../lib/live";

/** The keys v2.1 knew about, offered as suggestions. Any other lower-case key is accepted too. */
const KNOWN_KEYS = ["github", "gdrive", "gmail", "facebook", "messenger", "instagram", "threads", "custom"];

/** What the form holds. `secret` is only what somebody typed in this session — never what is stored. */
interface Draft {
  id: string | null;
  name: string;
  key: string;
  cat: string;
  account: string;
  url: string;
  notes: string;
  on: boolean;
  secret: string;
  secretClear: boolean;
  /** The stored record's key hint, for "stored — ends in …abcd". Empty for a new connector. */
  hint: string;
  hasSecret: boolean;
}

const NEW_DRAFT: Draft = {
  id: null, name: "", key: "custom", cat: "Custom", account: "", url: "", notes: "",
  on: true, secret: "", secretClear: false, hint: "", hasSecret: false,
};

function draftOf(c: ConnItem): Draft {
  return {
    id: c.id, name: c.name, key: c.key, cat: c.cat, account: c.account, url: c.url, notes: c.notes,
    on: c.on, secret: "", secretClear: false, hint: c.hint, hasSecret: c.hasSecret,
  };
}

/** The statuses as the person reads them. The server's word is the status; this only names it. */
const STATUS_WORD: Record<ConnItem["status"], string> = {
  connected: "connected",
  setup: "needs setup",
  error: "error",
};

export function LiveIntegrations() {
  const { link, reason, demo, user } = useSession();
  const canEdit = user?.role === "owner" || user?.role === "admin";
  const read = useLive<ConnState>(canEdit ? "/connectors" : null);

  /* The form is null until somebody opens one. There is no effect that fills it after the first paint: React does
     not run effects during a server render, so the smoke test would see an empty form. */
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [bad, setBad] = useState<ApiFailure | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const data = read.data;
  /* Writes are offered only to someone who may make them, against a server that will answer, and never in demo. */
  const writable = canEdit && !demo && link === "live";

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d));

  function open(d: Draft) {
    setDone(null);
    setBad(null);
    setConfirmDelete(false);
    setDraft(d);
  }

  function close() {
    setDraft(null);
    setConfirmDelete(false);
    setBad(null);
  }

  async function save() {
    if (!draft) return;
    setBusy(true);
    setBad(null);
    setDone(null);
    /* Absent means keep. The key is sent only if one was typed; Clear is sent only if asked for. */
    const body: Record<string, unknown> = {
      name: draft.name,
      key: draft.key,
      cat: draft.cat,
      account: draft.account,
      url: draft.url,
      notes: draft.notes,
      on: draft.on,
    };
    if (draft.id) body.id = draft.id;
    if (draft.secret.trim() !== "") body.secret = draft.secret;
    if (draft.secretClear) body.secretClear = true;
    try {
      const r = await api.post<ConnSaveResult | PendingResult>("/connectors", body);
      if (isPending(r)) {
        setDone(r.message);
        close();
      } else {
        setDone(`Saved ${r.item.name}. ${r.item.hasSecret ? `A key is stored, ending …${r.item.hint}.` : "No key is stored."}`);
        setDraft(null);
        read.reload();
      }
    } catch (err) {
      setBad(err instanceof ApiFailure ? err : new ApiFailure({ code: "INTERNAL", message: String(err) }, 0, "client"));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!draft?.id) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setBusy(true);
    setBad(null);
    try {
      const r = await api.post<ConnState | PendingResult>(`/connectors/${encodeURIComponent(draft.id)}/delete`, {});
      if (isPending(r)) setDone(r.message);
      else setDone("Removed the connector and its key.");
      close();
      read.reload();
    } catch (err) {
      setBad(err instanceof ApiFailure ? err : new ApiFailure({ code: "INTERNAL", message: String(err) }, 0, "client"));
    } finally {
      setBusy(false);
    }
  }

  /* The header is the same on every state, so the screen never changes its title under a person. */
  const head = (
    <PageHead
      title="Integrations"
      sub="Connectors and their keys. A key is write-only: after it is saved, only its last four characters come back."
    />
  );

  if (link !== "live" && !demo) {
    return (
      <>
        {head}
        <Note tone={link === "offline" ? "danger" : "warn"} title={link === "offline" ? "Not connected" : "Sign in"}>
          {link === "offline"
            ? "api/v2 is not answering. Connectors and keys live on the server, so this screen shows none of them rather than a list it cannot vouch for."
            : "Sign in to see the connectors."}
          {reason ? ` — ${reason}` : ""}
        </Note>
      </>
    );
  }

  if (!canEdit) {
    return (
      <>
        {head}
        <Note tone="info" title="Owner and admins">
          Connectors hold the studio&apos;s keys to GitHub, Gmail and Drive, so only the owner and admins can open this
          screen. Ask one of them to change a connector.
        </Note>
      </>
    );
  }

  if (!data && read.loading) {
    return (
      <>
        {head}
        <Note tone="info">Reading the connectors…</Note>
      </>
    );
  }

  if (!data && read.error) {
    return (
      <>
        {head}
        <Note tone="danger" title="The connectors did not load">
          {read.error.message}
          <span className="muted"> · {read.error.detail}</span>
        </Note>
      </>
    );
  }

  const items = data?.items ?? [];
  const counts = data?.counts ?? { total: 0, connected: 0, setup: 0, error: 0, off: 0 };

  return (
    <>
      {head}

      {done ? <Note tone="ok">{done}</Note> : null}
      {bad ? (
        <Note tone="danger" title="Not saved">
          {bad.message}
          {bad.field ? <span> · field: {bad.field}</span> : null}
          <span className="muted"> · {bad.detail}</span>
        </Note>
      ) : null}

      <Card
        title="Connectors"
        sub={`${counts.total} on the list · ${counts.connected} connected · ${counts.setup} need setup · ${counts.error} with an error · ${counts.off} off`}
        actions={
          writable ? (
            <Btn variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => open({ ...NEW_DRAFT })}>
              Add connector
            </Btn>
          ) : undefined
        }
      >
        {data && data.server.live === false ? (
          <Note tone="warn" title="Saving here does not test anything">
            A save changes the record. Testing a connector against its provider, and pushing a backup, still run from
            the v2.1 admin until they are wired here, so a connected status here means a key or an account is on file,
            not that it has been checked.
          </Note>
        ) : null}

        {items.length === 0 ? (
          <Empty title="No connectors yet" sub="Add GitHub or Google Drive to make off-site backups, or Gmail to send alerts." />
        ) : (
          <div className="stack" style={{ marginTop: "var(--s-3)" }}>
            {items.map((c) => (
              <div key={c.id} className="row-between" style={{ alignItems: "flex-start", gap: "var(--s-3)" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", gap: "var(--s-2)", alignItems: "center", flexWrap: "wrap" }}>
                    <strong>{c.name}</strong>
                    <Pill tone="neutral" plain>{c.cat}</Pill>
                    <Pill tone={statusTone(c.status)}>{STATUS_WORD[c.status]}</Pill>
                    {!c.on ? <Pill tone="neutral">off</Pill> : null}
                  </div>
                  <div className="muted" style={{ fontSize: "var(--fs-12)", marginTop: 2 }}>
                    <KeyRound size={12} style={{ verticalAlign: "-2px" }} />{" "}
                    {c.hasSecret ? `key stored, ends …${c.hint}` : "no key stored"}
                    {c.account ? ` · ${c.account}` : ""}
                  </div>
                  {c.note ? <div style={{ fontSize: "var(--fs-12)", marginTop: 2 }}>{c.note}</div> : null}
                </div>
                {writable ? (
                  <Btn size="sm" icon={<Pencil size={14} />} onClick={() => open(draftOf(c))}>
                    Edit
                  </Btn>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Card>

      {draft ? (
        <Card
          title={draft.id ? `Edit ${draft.name}` : "New connector"}
          sub="The key goes to the server and is never shown again. Leave the key field empty to keep the one stored."
          actions={
            <Btn size="sm" icon={<X size={14} />} onClick={close} disabled={busy}>
              Close
            </Btn>
          }
        >
          <div className="stack">
            <div className="grid grid-2">
              <label className="stack">
                <span className="field-label">Name</span>
                <Input value={draft.name} disabled={!writable || busy} onChange={(e) => set("name", e.target.value)} />
              </label>
              <label className="stack">
                <span className="field-label">Kind</span>
                <Input
                  list="conn-keys"
                  value={draft.key}
                  disabled={!writable || busy}
                  onChange={(e) => set("key", e.target.value.toLowerCase())}
                />
                <datalist id="conn-keys">
                  {KNOWN_KEYS.map((k) => (
                    <option key={k} value={k} />
                  ))}
                </datalist>
              </label>
              <label className="stack">
                <span className="field-label">Category</span>
                <Input value={draft.cat} disabled={!writable || busy} onChange={(e) => set("cat", e.target.value)} />
              </label>
              <label className="stack">
                <span className="field-label">Account</span>
                <Input
                  value={draft.account}
                  disabled={!writable || busy}
                  placeholder="owner/repo, an email, or a folder link"
                  onChange={(e) => set("account", e.target.value)}
                />
              </label>
              <label className="stack">
                <span className="field-label">Address</span>
                <Input
                  value={draft.url}
                  disabled={!writable || busy}
                  placeholder="https://"
                  onChange={(e) => set("url", e.target.value)}
                />
              </label>
              <label className="stack">
                <span className="field-label">Notes</span>
                <Input value={draft.notes} disabled={!writable || busy} onChange={(e) => set("notes", e.target.value)} />
              </label>
            </div>

            <label className="stack">
              <span className="field-label">Key or token</span>
              <Input
                type="password"
                autoComplete="new-password"
                value={draft.secret}
                disabled={!writable || busy || draft.secretClear}
                placeholder={draft.hasSecret ? `Stored — ends …${draft.hint}. Type a new one to replace it.` : "Paste the key or token"}
                onChange={(e) => {
                  set("secret", e.target.value);
                  if (e.target.value !== "") set("secretClear", false);
                }}
              />
            </label>
            {draft.hasSecret && writable ? (
              <div className="row-between">
                <span className="muted" style={{ fontSize: "var(--fs-12)" }}>
                  {draft.secretClear ? "The stored key will be removed when you save." : "The stored key is kept unless you clear it."}
                </span>
                <Btn
                  size="sm"
                  disabled={busy}
                  onClick={() => set("secretClear", !draft.secretClear)}
                >
                  {draft.secretClear ? "Keep the stored key" : "Clear the stored key"}
                </Btn>
              </div>
            ) : null}

            <div className="row-between">
              <span className="field-label">Active</span>
              <Switch checked={draft.on} onChange={(v) => set("on", v)} label="Connector is active" />
            </div>

            <div className="row-between">
              <div style={{ display: "flex", gap: "var(--s-2)" }}>
                {draft.id && writable ? (
                  <Btn
                    size="sm"
                    icon={<Trash2 size={14} />}
                    disabled={busy}
                    onClick={() => void remove()}
                  >
                    {confirmDelete ? "Press again to remove it" : "Remove connector"}
                  </Btn>
                ) : null}
              </div>
              {writable ? (
                <Btn variant="primary" icon={<Save size={14} />} disabled={busy || draft.name.trim() === ""} onClick={() => void save()}>
                  {busy ? "Saving…" : "Save connector"}
                </Btn>
              ) : null}
            </div>
            {canEdit && !writable ? (
              <Note tone="info">Demo data: nothing here can be saved, and no key is read from anywhere.</Note>
            ) : null}
            <Note tone="info">
              If approvals are on for admins, a change from this screen waits for the Master&apos;s approval, and the
              message above says so.
            </Note>
          </div>
        </Card>
      ) : null}
    </>
  );
}
