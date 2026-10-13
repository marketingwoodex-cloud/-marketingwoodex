/**
 * live.ts — read api/v2 for real, or say why not.
 *
 * The prototype shipped with `mock.ts` and a banner that said so. Phase 2 gave the API every endpoint
 * the screens below need, so the rule is now: **when the API answers, the screens use it.** No screen
 * invents a number the server did not send, and no screen quietly papers over a failed request with
 * demo data — that is the difference between a prototype and a product, and it is the difference the
 * v2.1 admin never made (a failed load left the previous numbers on screen, which is how a stale
 * invoice total gets quoted to a client).
 *
 * `useLive` therefore has three states and shows all of them: loading, ready, or the failure with its
 * request-id. Cancellation matters too — a screen that unmounts mid-flight must not setState after.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { ApiFailure, api } from "./api";
import { useSession } from "./session";

export interface Health {
  service: string;
  version: string;
  php: string;
  ready: boolean;
  db: { reachable: boolean; migrated: boolean; error?: string };
  time: string;
}

export interface LiveState<T> {
  data: T | null;
  error: ApiFailure | null;
  loading: boolean;
  reload: () => void;
}

/**
 * Fetch `path` whenever the caller is signed in, and re-fetch when `key` changes.
 *
 * @param path the resource path, e.g. "/dashboard" — or null to stay idle
 * @param key  a value to watch (a filter, a page number); it is not sent, it only triggers a reload
 */
export function useLive<T>(path: string | null, key: unknown = null): LiveState<T> {
  const { link, me } = useSession();
  const enabled = link === "live" && me !== null && path !== null;
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiFailure | null>(null);
  /* Starts true whenever a request is actually going to happen: between mount and the first reply the
     honest answer is "loading", and a screen that renders zeros in that window has shown a number that
     was never in the database. (The smoke test caught this — it asserted the loading state and found
     "No data yet" instead.) */
  const [loading, setLoading] = useState(enabled);
  const [nonce, setNonce] = useState(0);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled || path === null) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    api
      .get<T>(path)
      .then((d) => {
        if (alive.current) {
          setData(d);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!alive.current) return;
        // A 401 here means the session ended between screens; the client already notified the shell,
        // and the shell will show the sign-in screen. Anything else is shown to the person.
        if (err instanceof ApiFailure) {
          if (err.isAuthFailure) setData(null);
          else setError(err);
        }
      })
      .finally(() => {
        if (alive.current) setLoading(false);
      });
  }, [enabled, path, key, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { data, error, loading, reload };
}

/* ------------------------------------------------------------------ response shapes
   Kept beside the client, in the same voice as api.ts: a shape that drifts from the PHP handler is
   visible from both sides. */

export interface DashLeadStage {
  count: number;
  value: number;
}

export interface DashboardData {
  leads: { byStage: Record<string, DashLeadStage>; open: number; openValue: number; unread: number };
  quotes: { total: number; open: number; value: number };
  chats: { open: number; unread: number; needs: number };
  bookings: { pending: number; today: number };
  attention: { kind: string; id: number | null; title: string; detail: string; stage?: string }[];
  rules: Record<string, number>;
}

export interface BellItem {
  kind: string;
  id: number;
  t: string;
  title: string;
  text: string;
  path: string;
  href?: string;
}

export interface BellData {
  leads: number;
  chats: number;
  approvals: number;
  total: number;
  items: BellItem[];
  stamp: string;
}

export interface LeadRow {
  id: number;
  created_at: string;
  name: string;
  phone: string | null;
  email: string | null;
  company: string | null;
  location: string | null;
  source: string;
  service: string | null;
  stage: string;
  value: number;
  valueDisplay?: string;
  is_read: boolean;
  last_contact: string | null;
  next_at: string | null;
}

export interface LeadsData {
  leads: LeadRow[];
  total: number;
  limit: number;
  offset: number;
  board?: Record<string, { count: number; value: number }>;
  stages?: string[];
}

export interface RedirectRule {
  id: number;
  from: string;
  to: string;
  type: number;
  match: "exact" | "prefix";
  src: string;
  on: boolean;
  hits: number;
  lastHit: string | null;
}

export interface RedirectsData {
  redirects: RedirectRule[];
  cfg: { www: boolean; spam: boolean };
  planCount: number;
  /** One verdict per rule, in the same order as `redirects`. */
  test: { i: number; status: "ok" | "off" | "warn" | "bad"; msg: string }[];
  missed: number;
  imported: { rules: number; misses: number } | null;
  htaccess: { exists: boolean; writable: boolean; published: boolean };
  lines: number;
}

export interface MissRow {
  path: string;
  n: number;
  last: string;
  ref: string;
  redirect: { to: string; type: number; on: boolean } | null;
}

export interface MissesData {
  rows: MissRow[];
  total: number;
  suggestions: { from: string; to: string; type: number; match: "exact"; src: string; on: boolean; n: number }[];
}

export interface MediaFile {
  url: string;
  name: string;
  folder: string;
  size: number;
  mtime: string;
  alt: string;
  checked: boolean;
  sizes: number[];
  used: string[];
}

export interface MediaData {
  files: MediaFile[];
  folders: string[];
  trash: number;
  missingAlt: number;
  tree: { rel: string; label: string; writable: boolean }[];
  import: { alt: number; trash: number } | null;
}

export interface AltQueueData {
  missing: MediaFile[];
  usedOn: Record<string, number>;
  total: number;
  checked: number;
}

export interface TrashRow {
  id: number;
  url: string;
  bytes: number;
  why: string;
  at: string;
  by: string;
  onDisk: boolean;
  addressFree: boolean;
}

/** What a write returns when the v2.1 policy says a Manager's change waits for the Master. */
export interface PendingResult {
  pending: true;
  message: string;
  approval: { id: number; summary: string; at: string };
}

export function isPending(v: unknown): v is PendingResult {
  return typeof v === "object" && v !== null && (v as PendingResult).pending === true;
}

/** One line for the shell: what the API is, whether it is usable, and why not if it is not. */
export function linkLabel(health: Health | null, link: string, reason: string): string {
  if (link === "checking") return "Checking api/v2…";
  if (link === "offline") return `Demo data · api/v2 not reachable${reason ? ` — ${reason}` : ""}`;
  if (!health) return "Demo data";
  if (!health.ready) {
    const why = !health.db.reachable
      ? "the database is not reachable"
      : !health.db.migrated
        ? "the database has not been migrated"
        : "the platform is not ready";
    return `api/v2 ${health.version} is answering, but ${why} — screens are showing demo data`;
  }
  return `Live · api/v2 ${health.version} · PHP ${health.php}`;
}
