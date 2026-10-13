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
import { demoFixture } from "./demo";
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
  /** True when what is on screen is the sample data from `lib/demo.ts`, not a server's answer. */
  demo: boolean;
  reload: () => void;
}

/**
 * Fetch `path` whenever the caller is signed in, and re-fetch when `key` changes.
 *
 * @param path the resource path, e.g. "/dashboard" — or null to stay idle
 * @param key  a value to watch (a filter, a page number); it is not sent, it only triggers a reload
 */
export function useLive<T>(path: string | null, key: unknown = null): LiveState<T> {
  const { link, me, demo } = useSession();
  const enabled = link === "live" && me !== null && path !== null;
  /* Demo mode answers from `lib/demo.ts` instead of the network. Only a path with a fixture gets an answer:
     a screen whose data nobody has invented yet keeps its own honest "not answering" state, which is how the
     next slice announces itself. */
  const sample = demo && path !== null ? demoFixture(path) : null;
  const [data, setData] = useState<T | null>((sample as T | null) ?? null);
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
  /* In demo mode there is nothing to reload: the sample does not come from anywhere, and a screen that
     pretended to fetch it again would be pretending twice. */
  return { data, error, loading: sample !== null ? false : loading, demo: sample !== null, reload };
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

/* ------------------------------------------------------------------ content (Phase 3)
   An item is its *content*. The page is composed by the server at publish time out of the site's own
   page furniture, so nothing here is HTML the browser made. */

export type ContentStatus = "draft" | "scheduled" | "published";

export interface ContentSection {
  kind: string;
  text?: string;
  level?: number;
  items?: string[];
  ordered?: boolean;
  url?: string;
  alt?: string;
  caption?: string;
  by?: string;
  q?: string;
  a?: string;
  label?: string;
  href?: string;
  links?: { label: string; href: string }[];
}

export interface ContentItem {
  id: number;
  type: string;
  status: ContentStatus;
  slug: string;
  title: string;
  rel: string | null;
  url: string | null;
  where: string | null;
  data: { hero?: Record<string, string>; sections?: ContentSection[]; visibility?: string };
  seo: { title?: string; desc?: string; og?: string; kw?: string; related?: string[] };
  tpl: number | null;
  order: number;
  imported: boolean;
  publishAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  createdBy: string;
  updatedAt: string | null;
  updatedBy: string;
}

export interface ContentData {
  items: ContentItem[];
  counts: Record<string, Record<string, number>>;
  due: number;
  total: number;
  import: { items: number; tpls: number } | null;
  types: string[];
  sections: string[];
  shells: { post?: string; study?: string; city?: string; hint?: string; cityHint?: string };
}

export interface ContentSaveResult {
  item: ContentItem;
}

export interface ContentPublishResult {
  item: ContentItem;
  rel: string;
  url: string;
  bytes: number;
  batch: string;
  version: number;
  sections: number;
}

export interface ContentPreview {
  item: ContentItem;
  preview: string | null;
  tpls: { id: number; type: string; name: string; default: boolean; tpl: Record<string, unknown> }[];
}

export interface TickResult {
  published: { id: number; title: string; url: string }[];
  failed: { id: number; title: string; message: string }[];
  checked: number;
}

/* --------------------------------------------------------- the header and the footer
   One edit, every page, as one batch — and the same call previews it, so the number on the button is
   the number of pages that change. */

/* ---- heroes: the top of every page, and the home slider ---- */

/** One slide of the home slider, as the server reads it out of the page. `i` is its place in the file. */
export interface HeroSlide {
  kicker: string; title: string; lead: string;
  img: string; alt: string;
  b1t: string; b1h: string; b2t: string; b2h: string;
  word: string; m1: string; m2: string;
  off: boolean;
  crumbs?: boolean;
}

export interface HeroTemplate { id: string; label: string; desc: string }

export interface HeroHomeData {
  rel: string; url: string; title: string;
  present: boolean;
  slides: HeroSlide[];
  interval: number;
  hidden?: number;
  /** [id, label, note] — the design the hero carries now. */
  family: [string, string, string];
  templates: HeroTemplate[];
}

export interface HeroPageFields {
  kicker: string; title: string; lead: string;
  img: string; alt: string;
  b1t: string; b1h: string; b2t: string; b2h: string;
  crumbs: boolean;
}

export interface HeroPageData {
  rel: string; url: string; title: string; bytes: number;
  family: [string, string, string];
  tpl: string;
  hasHero: boolean;
  fields: HeroPageFields;
  templates: HeroTemplate[];
}

export interface HeroPageRow {
  rel: string; url: string; title: string;
  family: string; familyLabel: string; familyNote: string;
  heroTitle: string; home: boolean;
}

export interface HeroScanData {
  pages: HeroPageRow[];
  counts: Record<string, number>;
  total: number;
  without: number;
  templates: HeroTemplate[];
  home: string;
  families: Record<string, string>;
}

export interface HeroPageSave {
  rel: string; url: string; changed: boolean;
  how?: string;
  family: [string, string, string];
  tpl: string;
  fields?: HeroPageFields;
  bytes?: number; version?: number; batch: string;
}

export interface HeroHomeSave {
  rel: string; url?: string; changed: boolean;
  slides: number; showing?: number; interval: number;
  bytes?: number; version?: number; batch: string;
  read?: HeroSlide[];
}

export interface HeroTemplatePreview {
  tpl: string; label: string; desc: string; html: string;
}

export interface ChromeData {
  chrome: {
    brand: string;
    cta: string;
    footer: string;
    menuDesktop: string;
    menuMobile: string;
    style: string;
    phone: string;
    version: number;
    updatedAt: string;
    updatedBy: string;
  };
  coverage: { pages: number; skipped: number; regions: Record<string, number> };
  versions: { id: number; version: number; note: string; at: string; by: string }[];
  fromPage: null | {
    rel: string;
    brand: string;
    footer: string;
    menuDesktop: string;
    menuMobile: string;
    style: string;
    phone: string;
  };
}

export interface ChromeChange {
  rel: string;
  url: string;
  bytes: string;
  before: Record<string, string>;
  after: Record<string, string>;
}

export interface ChromeDiff {
  scanned: number;
  changed: ChromeChange[];
  skipped: number;
  missing: string[];
  pages: number;
  truncated?: boolean;
}

export interface ChromeResult extends Omit<ChromeDiff, "truncated"> {
  batch: string;
  note: string;
  chrome?: ChromeData["chrome"];
  versions?: ChromeData["versions"];
}

export interface ReplacePage {
  rel: string;
  count: number;
}

export interface ReplaceResult {
  pages: ReplacePage[];
  total: number;
  dry: boolean;
  batch: string | null;
  scanned: number;
}

/* --------------------------------------------------------------- pages and history
   The history is grouped by *change*, because the change that rewrote 148 pages is one entry with one
   undo — not 148 entries that each look like a file edit. */

export interface PageRow {
  rel: string;
  title: string;
  folder: string;
  bytes: number;
  mtime: string;
  updatedAt: string | null;
  updatedBy: string | null;
  stale: boolean;
  versions: number;
}

export interface PagesData {
  pages: PageRow[];
  missing: string[];
  folders: Record<string, number>;
  count: number;
  stale: number;
}

export interface PageChange {
  batch: string;
  note: string;
  by: string;
  at: string;
  pages: number;
  bytes: number;
  sample: string[];
  undoable: boolean;
}

export interface PageVersion {
  id: number;
  bytes: number;
  note: string;
  batch: string | null;
  restoredFrom: number | null;
  at: string;
  by: string;
  byId: number | null;
}

export interface PageDetail {
  rel: string;
  html: string;
  bytes: number;
  version: number;
  versions: PageVersion[];
  fresh: boolean;
  index: { title: string; bytes: number; updatedAt: string | null; updatedBy: string | null } | null;
  mtime: string | null;
}

export interface RollbackResult {
  batch: string;
  undoBatch: string;
  restored: string[];
  missing: string[];
  errors: { rel: string; message: string }[];
}

/* ------------------------------------------------------------ the section library
   A block is a piece of a page. A *global* block is inserted by reference — its root element carries
   `data-wx-global="<token>"` in the page — and editing it and pushing rewrites every page that carries
   that token, as one change with one undo. */

export interface Block {
  blk: string;
  name: string;
  kind: "section" | "element";
  cat: string;
  tags: string[];
  global: boolean;
  bytes: number;
  html: string;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

export interface BlocksData {
  blocks: Block[];
  cats: string[];
  counts: Record<string, number>;
  globals: number;
  total: number;
  limit: number;
  import: { blocks: number } | null;
}

export interface BlocksUsage {
  usage: Record<string, { name: string; pages: string[] }>;
  globals: number;
  placements: number;
  pages: number;
}

export interface BlockSaveResult {
  block: Block;
  usedOn: string[];
  canPush: boolean;
}

export interface BlockSyncResult {
  blk: string;
  usedOn: string[];
  batch: string;
  changed: string[];
  skipped: number;
  pages: number;
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

/**
 * The label the shell carries for the link, and the sentence beside it — one function each, and they are
 * built from the same two facts: is the API answering, and is any of this demo data?
 *
 * The distinction the strip has to keep is between **"we cannot reach your site"** and **"this is a design
 * preview"**. v2.5's first strip said "Demo data" for both, which is a claim about where the numbers came
 * from — and during a cut-over the API is unreachable most of the time for reasons that have nothing to do
 * with a demo: the host is down, the database has not been migrated, the deploy half-finished. Saying
 * "demo data" then is not a harmless hedge; it tells the person their admin is a mock-up when it is really
 * a door that cannot open yet.
 *
 * `demo` is only ever true when demo mode was asked for (`?demo=1` or `VITE_WX_DEMO=1`). Everything else
 * that ends up offline says so in the words that are true of it.
 */
export function linkLabel(health: Health | null, link: string, reason: string, demo = false): string {
  if (link === "checking") return "Looking for api/v2…";
  if (link === "offline") {
    return demo
      ? "Demo data — a design preview. Nothing on these screens is read from your site."
      : `api/v2 is not answering${reason ? ` — ${reason}` : ""}. Nothing on these screens is read from your site.`;
  }
  if (link === "signedOut") {
    return health
      ? `api/v2 ${health.version} is answering · PHP ${health.php} · sign in to see your site`
      : "api/v2 is answering · sign in to see your site";
  }
  if (!health) return "api/v2 is answering";
  if (!health.ready) {
    const why = !health.db.reachable
      ? "the database is not reachable"
      : !health.db.migrated
        ? "the database has not been migrated"
        : "the platform is not ready";
    return `api/v2 ${health.version} is answering, but ${why} — the screens say so rather than show numbers that may be out of date`;
  }
  return `Live · api/v2 ${health.version} · PHP ${health.php}`;
}

/** The pill the strip leads with, which has to agree with the sentence beside it. */
export function linkPill(link: string, demo = false): { tone: "ok" | "info" | "warn" | "danger"; label: string } {
  if (link === "live") return { tone: "ok", label: "live" };
  if (link === "checking") return { tone: "info", label: "checking" };
  if (link === "signedOut") return { tone: "info", label: "signed out" };
  return demo ? { tone: "warn", label: "demo data" } : { tone: "danger", label: "not answering" };
}

/* ---------------------------------------------------------------- the site theme (routes/theme.php) */

/** One setting the Theme screen offers, with what it is called, what it does and what the file says. */
export interface ThemeToken {
  name: string;
  type: "color" | "len" | "font" | "name";
  label: string;
  /** The custom properties in `assets/site.css` this value is aliased onto. */
  targets: string[];
  /** What `_private/theme.json` remembers. */
  chosen: string;
  /** What is actually written in the stylesheet the site is serving. */
  live: string;
}

export interface ThemeMeta {
  bytes: number;
  sha: string;
  lines: number;
  theme: boolean;
  markers: boolean;
  mtime: string;
  mtimeEpoch: number;
}

export interface ThemeVersion {
  id: number;
  bytes: number;
  note: string;
  at: string;
  by: string;
}

export interface ThemeState {
  file: string;
  exists: boolean;
  meta: ThemeMeta | null;
  chosen: Record<string, string>;
  live: Record<string, string>;
  drift: boolean;
  tokens: ThemeToken[];
  untouched: string[];
  fonts: Record<string, string>;
  local: Record<string, string[]>;
  history: ThemeVersion[];
}

export interface ThemeSave {
  changed: boolean;
  vars: Record<string, string>;
  version: number;
  bytes: number;
  meta: ThemeMeta;
}

export interface ThemeRollback {
  rolledBackTo: number;
  saved: number;
  vars: Record<string, string>;
  meta: ThemeMeta;
}

/* ------------------------------------------- the sections the CMS places (routes/placements.php)
   Testimonials and the team do not become pages: they are written *inside* pages, wrapped in a marker pair
   that says the section is generated. The state below is deliberately v2.1's own shape — `placements` with a
   list per kind and a `<kind>Set` record beside it — because the v2.1 admin reads the same thing through
   `cms_placements` and two shapes would drift while both admins are live. */

export interface PlaceKind {
  kind: string;
  title: string;
  one: string;
}

export interface PlaceDesign {
  id: string;
  label: string;
  note: string;
}

export interface PlaceItem {
  id: number;
  title: string;
  rating: number;
  order: number;
}

export interface PlaceSet {
  kicker: string;
  heading: string;
  design: string;
  max: number;
  designs: Record<string, string>;
}

export interface PlacementsData {
  /** v2.1's shape: `testimonial` → pages, `testimonialSet` → the settings, and the same for `member`. */
  placements: Record<string, string[] | PlaceSet>;
  kinds: PlaceKind[];
  designs: PlaceDesign[];
  counts: Record<string, number>;
  /** Pages that carry the marker right now — found by looking, not by asking the settings. */
  markerPages: Record<string, string[]>;
  anchors: string[];
  items: Record<string, PlaceItem[]>;
  import: { imported: boolean; why?: string; placements?: Record<string, number> } | null;
}

/** What would happen to one page: replaced, inserted, removed, already right, or nowhere to put it. */
export interface PlaceStep {
  kind: string;
  action: string;
  anchor: string;
  bytes: number;
}

export interface PlacePlan {
  pages: { rel: string; kinds: PlaceStep[] }[];
  changed: number;
  unchanged: number;
  blocked: number;
  bytes: number;
}

export interface PlacePreview {
  kind: string;
  design: string;
  items: number;
  html: string;
  bytes: number;
  marker: string;
  plan: { action: string; anchor: string; at: number | null; block: number; changed: boolean } | null;
  around: { before: string; after: string; at: string } | null;
}

export interface PlacePush {
  batch: string;
  changed: string[];
  skipped: number;
  versions: Record<string, number>;
  items: Record<string, number>;
}

/* --------------------------------------------------------- the website's forms, and the rate book
   Two screens that answer two questions a person actually asks: "is my contact form reaching me?" and
   "what do we charge?". Both read the site rather than a table — a form is markup on a page, and the
   rate book is a file the public page reads — so what the screens show is what the site does. */

/** One form's alert settings. The keys are v2.1's own. */
export interface FormCfg {
  alertTo: string;
  waTo: string;
  waAlert: boolean;
  reply: boolean;
  replyText: string;
}

/** One page that carries a form, and where its enquiry goes. */
export interface FormPage {
  rel: string;
  url: string;
  forms: string[];
  formLabels: string[];
  endpoints: string[];
  /** Does an enquiry from this page arrive in this console? */
  lands: boolean;
  landsLabel: string;
  managed: boolean;
}

export interface FormRow {
  id: string;
  label: string;
  pages: string[];
  pageCount: number;
  total: number;
  month: number;
  last: string | null;
  fields: string[];
  cfg: FormCfg;
  note: string;
}

export interface FormsData {
  forms: FormRow[];
  web: Record<string, string>;
  scan: { pages: FormPage[] };
}

export interface FormSaveResult {
  forms: Record<string, FormCfg>;
}

/* ---- the rate book */

export interface EstService {
  key: string;
  label: string;
  hint: string;
  unit: "sqft" | "views";
  unitLabel: string;
  rates: { essential: number; standard: number; premium: number };
}

export interface EstFinish { key: string; label: string; hint: string }

export interface EstCatalog { cat: string; desc: string; unit: string; rate: number }

export interface EstRates {
  services: EstService[];
  finishes: EstFinish[];
  catalog: EstCatalog[];
  terms: string[];
}

export interface EstTemplate {
  name: string;
  at: string;
  by: string;
  rates: EstRates;
}

export interface EstData {
  rel: string;
  url: string;
  exists: boolean;
  rates: EstRates | null;
  bytes: number;
  mtime: string | null;
  pages: string[];
  units: Record<string, string>;
  finishes: Record<string, string>;
  templates: EstTemplate[];
}

export interface EstSaveResult {
  rates: EstRates;
  before: number;
  bytes: number;
  version: string;
  pages: string[];
  batch: string;
  changed: number;
  same: boolean;
}

export interface EstTemplateResult {
  templates: EstTemplate[];
}

/* --------------------------------------------------------- projects, and the timeline
   A project is the point where work becomes money: it is created by an approved quotation, billed one
   milestone at a time, and it is the thing a client rings up about. The screens read one row shape, built
   on the server by `wx_proj_row()` — so the table and the drawer cannot disagree about how far a project
   has got or what it has billed. */

export interface ProjMilestone {
  label: string;
  pct: number;
  amount: number;
  amountDisplay: string;
  inv_id: number | null;
  inv_no: string;
  paid: number;
  /** unbilled | billed | partial | paid | missing — "missing" is an invoice that was deleted */
  status: string;
}

export interface ProjRow {
  id: number;
  no: string;
  name: string;
  client_id: number;
  client_name: string;
  site: string;
  line: string;
  ptype: string;
  area: number;
  stage: string;
  start: string;
  target: string;
  late: boolean;
  /** how far along the studio's stages, as a bar */
  stageProgress: number;
  /** how much of the contract has been invoiced */
  billedPct: number;
  value: number;
  valueDisplay: string;
  invoiced: number;
  invoicedDisplay: string;
  received: number;
  receivedDisplay: string;
  balance: number;
  balanceDisplay: string;
  unbilled: number;
  unbilledDisplay: string;
  milestones: ProjMilestone[];
  milestonesDone: number;
  milestoneCount: number;
  manager: number | null;
  manager_name: string;
  team: number[];
  team_names: string[];
  quote_id: number | null;
  invoice_id: number | null;
  photos: number;
  last: { t: string; text: string } | null;
}

export interface ProjKpi {
  active: number;
  value: number;
  late: number;
  invoiced: number;
  received: number;
  balance: number;
  receivedPct: number;
  valueDisplay: string;
  invoicedDisplay: string;
  receivedDisplay: string;
  balanceDisplay: string;
}

export interface ProjList {
  projects: ProjRow[];
  total: number;
  limit: number;
  offset: number;
  stages: string[];
  stageLabels: Record<string, string>;
  lines: Record<string, string>;
  kpi: ProjKpi;
  view: string;
  stage: string;
  line: string;
  team: { id: number; name: string }[];
}

export interface ProjInvoice {
  id: number;
  no: string;
  total: number;
  totalDisplay: string;
  paid: number;
  paidDisplay: string;
  balance: number;
  balanceDisplay: string;
  status: string;
  issued: string;
  due: string;
}

export interface ProjUpdate { t: string; user: string; text: string; photo: string; sys: boolean; toClient?: boolean; stage?: string }

export interface ProjDetail {
  project: ProjRow;
  invoices: ProjInvoice[];
  updates: ProjUpdate[];
  photos: { url?: string; caption?: string }[];
  document: {
    name: string; no: string; site: string; start: string; target: string; value: number;
    line: string; ptype: string; area: number; manager: number | null; team: number[];
    plan: { label: string; pct: number }[];
  };
  stages: string[];
  stageLabels: Record<string, string>;
  lines: Record<string, string>;
  team: { id: number; name: string }[];
  full_invoice: boolean;
  client: ProjClientLink;
}

/* -------------------------------------------------------------- client updates */

/** One event's wording. `textNoPhotos` is the shipped second shape for a stage with nothing to show yet. */
export interface NotifyEvent {
  on: boolean;
  subject: string;
  text: string;
  textNoPhotos?: string;
  tpl?: string;
}

export interface NotifyCfg {
  email: boolean;
  wa: boolean;
  waLang: string;
  ev: Record<string, NotifyEvent>;
}

export interface NotifyLogRow {
  id: number;
  t: string;
  event: string;
  ref: string;
  name: string;
  channel: string;
  dest: string;
  result: string;
}

export interface NotifyData {
  cfg: NotifyCfg;
  events: Record<string, string>;
  ready: { whatsapp: boolean; email: boolean };
  /** Whether this build can carry a message at all, and who sends today. See lib/notify.php. */
  transport: { ready: boolean; sentBy: string; phase: number; wired: string[] };
  log: NotifyLogRow[];
}

/* ------------------------------------------------------------------ quotation templates

   A template is a quotation with no client. The server sends the whole document (it is how v2.1's
   `tpl_list` answered) because the screen edits it in place, and the four figures a list card shows —
   sections, lines, how many lines are priced, the total — are derived there, once, by the same
   arithmetic a quotation uses. */

export interface TplItem {
  desc: string;
  qty: number;
  unit: string;
  rate: number;
  amount?: number;
  kind?: string;
  code?: string;
}

export interface TplSection {
  name: string;
  note?: string;
  area?: number;
  items: TplItem[];
  subtotal?: number;
}

export interface TplRow {
  id?: number;
  name: string;
  kind: string;
  kindLabel: string;
  description: string;
  sections: TplSection[];
  sectionCount: number;
  lineCount: number;
  pricedCount: number;
  subtotal: number;
  total: number;
  totalDisplay: string;
  terms: string;
  termsFirst: string;
  created_at?: string;
  updated_at?: string;
  /** On a starter row: whether a template with this name is already saved. */
  imported?: boolean;
  /** A row in the database whose JSON would not decode — shown, not hidden. */
  broken?: boolean;
}

/** The letterhead a document prints under: the studio's own settings, sent with the list so a preview draws
    the real header rather than a placeholder. */
export interface TplCompany {
  name: string;
  tagline?: string;
  address?: string;
  phones?: string;
  email?: string;
  web?: string;
  ntn?: string;
  signName?: string;
  signTitle?: string;
}

export interface TplsData {
  templates: TplRow[];
  company: TplCompany;
  kinds: Record<string, string>;
  starter: TplRow[];
  units: string[];
  itemKinds: string[];
}

export interface TplSaveResult {
  template: TplRow;
  created: boolean;
}

export interface TplImportResult {
  source: string;
  imported: number;
  names: string[];
  skipped: string[];
  refused: string[];
}

/** The client's own page for a project: the link, and whether it has ever been opened. */
export interface ProjClientLink {
  link: string;
  path: string;
  views: number;
  viewedAt: string;
  shared: number;
  hasContact: boolean;
}
