/**
 * demo.ts — the sample data behind `?demo=1`, and the rules for turning it on.
 *
 * Why this exists at all: the console reads a real API, and on a laptop, in a sandbox or on a hosted preview
 * there is no PHP and no MySQL, so *every* screen would say "api/v2 is not answering" and a design review would
 * be a review of error messages. Demo mode is the honest escape hatch: it is asked for by name (`?demo=1` or
 * `VITE_WX_DEMO=1`), the shell says **demo data** in words, and every screen that is showing samples says so
 * above its own content. What it is not is a fallback: nothing here turns itself on because an API is missing,
 * and nothing here is ever labelled live.
 *
 * The fixtures are keyed by the API path the screen would have read, so the sample data has to be invented in
 * the same shape the server sends — which is the point. If a screen's shape and its fixture drift, the fixture
 * stops type-checking, and the sample cannot quietly become a nicer version of the product than the product.
 */
import type {
  BizData, BizRecord, CompanyData, CompanyRecord,
  EstData, FormsData, HeroHomeData, HeroPageData, HeroScanData,
  NotifyData, ProjDetail, ProjList, ProjRow, TplsData,
} from "./live";

const KEY = "wx-demo";

/** Is demo mode on? The URL asks for it, a previous page in this tab asked for it, or the build is a preview. */
export function demoOn(): boolean {
  if (import.meta.env.VITE_WX_DEMO === "1") return true;
  if (typeof window === "undefined") return false;
  const asked = new URLSearchParams(window.location.search).get("demo");
  if (asked === "1" || asked === "true") {
    /* Remembered for the whole tab: a query string does not survive a click on the navigation, and
       "it worked until I clicked something" is not a preview. */
    try {
      window.sessionStorage.setItem(KEY, "1");
    } catch {
      /* Private mode with storage refused is not a reason to refuse the preview. */
    }
    return true;
  }
  try {
    return window.sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

/** Turn it on or off, in the URL and in the tab, so a refresh and a copied link both agree. */
export function setDemo(on: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (on) window.sessionStorage.setItem(KEY, "1");
    else window.sessionStorage.removeItem(KEY);
  } catch {
    /* as above */
  }
  const url = new URL(window.location.href);
  if (on) url.searchParams.set("demo", "1");
  else url.searchParams.delete("demo");
  window.location.href = url.toString();
}

/* --------------------------------------------------------------------- the fixtures */

const TODAY = "2026-10-14";

function row(over: Partial<ProjRow>): ProjRow {
  const base: ProjRow = {
    id: 7, no: "WI-10120", name: "Office fit-out — Zainab Tower", client_id: 3,
    client_name: "Platinum Ventures", site: "Model Town Link Road", line: "project",
    ptype: "Office fit-out", area: 4200, stage: "installation",
    start: "2026-08-01", target: "2026-11-30", late: false,
    stageProgress: 60, billedPct: 80,
    value: 1000000, valueDisplay: "1,000,000",
    invoiced: 800000, invoicedDisplay: "800,000",
    received: 600000, receivedDisplay: "600,000",
    balance: 200000, balanceDisplay: "200,000",
    unbilled: 200000, unbilledDisplay: "200,000",
    milestones: [
      { label: "Advance", pct: 50, amount: 500000, amountDisplay: "500,000", inv_id: 41, inv_no: "WI-10120-1", paid: 500000, status: "paid" },
      { label: "On completion of wood work", pct: 30, amount: 300000, amountDisplay: "300,000", inv_id: 42, inv_no: "WI-10120-2", paid: 100000, status: "partial" },
      { label: "On handover", pct: 20, amount: 200000, amountDisplay: "200,000", inv_id: null, inv_no: "", paid: 0, status: "unbilled" },
    ],
    milestonesDone: 1, milestoneCount: 3,
    manager: 2, manager_name: "Imtiaz", team: [2, 5], team_names: ["Imtiaz", "Sana"],
    quote_id: 88, invoice_id: null, photos: 4,
    last: { t: `${TODAY} 11:20`, text: "Progress update sent to the client with 2 photos (whatsapp: no transport yet)" },
  };
  return { ...base, ...over };
}

const PROJECTS: ProjRow[] = [
  row({}),
  row({
    id: 9, no: "WI-10131", name: "Kitchen and wardrobes — Gulberg", client_id: 4, client_name: "The Rahmans",
    site: "Gulberg III", line: "furniture", ptype: "Kitchen", area: 900, stage: "design",
    start: "2026-09-20", target: "2026-12-15", stageProgress: 20, billedPct: 50,
    value: 480000, valueDisplay: "480,000",
    invoiced: 240000, invoicedDisplay: "240,000", received: 240000, receivedDisplay: "240,000",
    balance: 0, balanceDisplay: "0", unbilled: 240000, unbilledDisplay: "240,000",
    milestones: [
      { label: "Advance", pct: 50, amount: 240000, amountDisplay: "240,000", inv_id: 44, inv_no: "WI-10131-1", paid: 240000, status: "paid" },
      { label: "On installation", pct: 50, amount: 240000, amountDisplay: "240,000", inv_id: null, inv_no: "", paid: 0, status: "unbilled" },
    ],
    milestonesDone: 1, milestoneCount: 2, manager: 5, manager_name: "Sana", team: [5], team_names: ["Sana"],
    invoice_id: null, photos: 0, last: { t: "2026-10-08 16:40", text: "Stage: planning → design" },
  }),
  row({
    id: 11, no: "WI-10144", name: "Farmhouse interior — Bedian", client_id: 6, client_name: "Mr. A. Sheikh",
    site: "Bedian Road", line: "interior", ptype: "Full interior", area: 6100, stage: "handover",
    start: "2026-05-04", target: "2026-09-30", late: true, stageProgress: 80, billedPct: 100,
    value: 3200000, valueDisplay: "3,200,000",
    invoiced: 3200000, invoicedDisplay: "3,200,000", received: 2700000, receivedDisplay: "2,700,000",
    balance: 500000, balanceDisplay: "500,000", unbilled: 0, unbilledDisplay: "0",
    milestones: [
      { label: "Advance", pct: 40, amount: 1280000, amountDisplay: "1,280,000", inv_id: 51, inv_no: "WI-10144-1", paid: 1280000, status: "paid" },
      { label: "On completion of wood work", pct: 30, amount: 960000, amountDisplay: "960,000", inv_id: 52, inv_no: "WI-10144-2", paid: 960000, status: "paid" },
      { label: "On handover", pct: 30, amount: 960000, amountDisplay: "960,000", inv_id: 53, inv_no: "WI-10144-3", paid: 460000, status: "partial" },
    ],
    milestonesDone: 2, milestoneCount: 3, manager: 2, manager_name: "Imtiaz", team: [2, 5], team_names: ["Imtiaz", "Sana"],
    invoice_id: null, photos: 9, last: { t: "2026-10-02 09:05", text: "Handover walk-through booked for Sunday" },
  }),
];

const PROJ_LIST: ProjList = {
  projects: PROJECTS, total: 3, limit: 100, offset: 0,
  stages: ["planning", "design", "production", "installation", "handover", "closed"],
  stageLabels: { planning: "Planning", design: "Design", production: "Production", installation: "Installation", handover: "Handover", closed: "Closed" },
  lines: { furniture: "Furniture", interior: "Interior", project: "Project" },
  kpi: {
    active: 3, value: 4680000, late: 1,
    invoiced: 4240000, received: 3540000, balance: 700000, receivedPct: 83,
    valueDisplay: "4,680,000", invoicedDisplay: "4,240,000", receivedDisplay: "3,540,000", balanceDisplay: "700,000",
  },
  view: "active", stage: "", line: "", team: [{ id: 2, name: "Imtiaz" }, { id: 5, name: "Sana" }, { id: 7, name: "Bilal" }],
};

const PROJ_DETAIL: ProjDetail = {
  project: PROJECTS[0],
  invoices: [
    { id: 41, no: "WI-10120-1", total: 500000, totalDisplay: "500,000", paid: 500000, paidDisplay: "500,000", balance: 0, balanceDisplay: "0", status: "paid", issued: "2026-08-05", due: "2026-08-20" },
    { id: 42, no: "WI-10120-2", total: 300000, totalDisplay: "300,000", paid: 100000, paidDisplay: "100,000", balance: 200000, balanceDisplay: "200,000", status: "partial", issued: "2026-09-28", due: "2026-10-12" },
  ],
  updates: [
    { t: `${TODAY} 11:20`, user: "Imtiaz", text: "Progress update sent to the client with 2 photos (whatsapp: no transport yet)", photo: "", sys: true },
    { t: `${TODAY} 11:20`, user: "Woodex Interior", text: "Progress update on Office fit-out — Zainab Tower: we are now at the installation stage.", photo: "/assets/uploads/projects/ceiling-01.jpg", sys: true, toClient: true, stage: "installation" },
    { t: "2026-10-03 11:00", user: "Imtiaz", text: "Frames are up on the east side.", photo: "/assets/uploads/projects/frame-01.jpg", sys: false, toClient: true, stage: "production" },
    { t: "2026-10-05 15:00", user: "Imtiaz", text: "Client asked to move the pantry wall.", photo: "", sys: false },
  ],
  photos: [
    { url: "/assets/uploads/projects/frame-01.jpg", caption: "Frames, east side" },
    { url: "/assets/uploads/projects/ceiling-01.jpg", caption: "Ceiling grid" },
  ],
  document: {
    name: "Office fit-out — Zainab Tower", no: "WI-10120", site: "Model Town Link Road",
    start: "2026-08-01", target: "2026-11-30", value: 1000000, line: "project",
    ptype: "Office fit-out", area: 4200, manager: 2, team: [2, 5],
    plan: [{ label: "Advance", pct: 50 }, { label: "On completion of wood work", pct: 30 }, { label: "On handover", pct: 20 }],
  },
  stages: ["planning", "design", "production", "installation", "handover", "closed"],
  stageLabels: { planning: "Planning", design: "Design", production: "Production", installation: "Installation", handover: "Handover", closed: "Closed" },
  lines: { furniture: "Furniture", interior: "Interior", project: "Project" },
  team: [{ id: 2, name: "Imtiaz" }, { id: 5, name: "Sana" }, { id: 7, name: "Bilal" }],
  full_invoice: false,
  client: { link: "https://woodex.com.pk/api/v2/client/project/7?t=9f4c1e7a5b2d8c0f3a6e9b1d4c7f0a2e", path: "/api/v2/client/project/7?t=9f4c1e7a5b2d8c0f3a6e9b1d4c7f0a2e", views: 3, viewedAt: "2026-10-12 19:40", shared: 2, hasContact: true },
};

const NOTIFY: NotifyData = {
  cfg: {
    email: true,
    wa: true,
    waLang: "en",
    ev: {
      lead: { on: true, subject: "We received your enquiry: {company}", text: "Dear {name},\nThank you for contacting {company}. We have received your enquiry and our team will call you shortly.\n\nمحترم {name}، {company} سے رابطہ کرنے کا شکریہ۔ ہماری ٹیم جلد آپ سے رابطہ کرے گی۔\n\n{company} · {phone}" },
      quote: { on: true, subject: "Your quotation {ref} from {company}", text: "Dear {name},\nYour quotation {ref} for {project} is ready. View it here: {link}\n\nمحترم {name}، {project} کے لیے آپ کی کوٹیشن {ref} تیار ہے۔ یہاں دیکھیں: {link}\n\n{company} · {phone}" },
      started: { on: true, subject: "Work has started on {project}", text: "Dear {name},\nGood news! Work has started on {project}.\n\nمحترم {name}، خوشخبری! {project} پر کام شروع ہو گیا ہے۔\n\n{company} · {phone}" },
      handover: { on: true, subject: "Your project {project} is ready", text: "Dear {name},\n{project} is complete and ready for handover.\n\nمحترم {name}، {project} مکمل ہو گیا ہے اور حوالگی کے لیے تیار ہے۔\n\n{company} · {phone}" },
      booking: { on: true, subject: "Confirmed: {ref}", text: "Dear {name},\nYour {ref} is confirmed. Place: {project}.\n\n{company} · {phone}" },
      remind: { on: true, subject: "Reminder: {ref}", text: "Dear {name},\nA friendly reminder of your {ref} tomorrow.\n\n{company} · {phone}" },
      stage: {
        on: true,
        subject: "Progress update: {project}",
        text: "Dear {name},\nProgress update on {project}: we are now at the {stage} stage.\nSite photos: {link}\n\nمحترم {name}، {project} کی تازہ صورتحال: اب کام {stage} کے مرحلے میں ہے۔\n\n{company} · {phone}",
        textNoPhotos: "Dear {name},\nProgress update on {project}: we are now at the {stage} stage.\nFollow the work: {link}\n\n{company} · {phone}",
      },
    },
  },
  events: {
    lead: "Enquiry received", quote: "Quotation sent", started: "Work started", handover: "Handover",
    booking: "Booking confirmed", remind: "Booking reminder (day before)", stage: "Project progress (other stages, with photos)",
  },
  ready: { whatsapp: true, email: false },
  transport: { ready: false, sentBy: "v2.1", phase: 4, wired: ["started", "handover", "stage"] },
  log: [
    { id: 418, t: `${TODAY} 11:20`, event: "stage", ref: "WI-10120", name: "Platinum Ventures", channel: "wa", dest: "+923224000768", result: "no transport yet" },
    { id: 417, t: `${TODAY} 11:20`, event: "stage", ref: "WI-10120", name: "Platinum Ventures", channel: "email", dest: "ops@platinum.example", result: "not configured" },
    { id: 416, t: "2026-10-08 16:40", event: "stage", ref: "WI-10131", name: "The Rahmans", channel: "wa", dest: "+923004567890", result: "no transport yet" },
    { id: 415, t: "2026-10-02 09:05", event: "handover", ref: "WI-10144", name: "Mr. A. Sheikh", channel: "wa", dest: "+923219876543", result: "no transport yet" },
  ],
};

const FORMS: FormsData = {
  forms: [
    { id: "contact", label: "Contact form", pages: ["contact/index.html"], pageCount: 1, total: 12, month: 3, last: `${TODAY} 09:12`, fields: ["name", "phone", "message"], cfg: { alertTo: "info@woodex.com.pk", waTo: "923224000768", waAlert: true, reply: true, replyText: "" }, note: "This form posts to a Netlify function" },
    { id: "estimator", label: "Estimator request", pages: ["estimator/index.html"], pageCount: 1, total: 8, month: 2, last: "2026-10-11 18:02", fields: ["name", "phone", "estimate"], cfg: { alertTo: "info@woodex.com.pk", waTo: "", waAlert: false, reply: true, replyText: "Thanks — your estimate is attached." }, note: "Prices from the rate book" },
    { id: "office-fitout", label: "Office fit-out quote", pages: ["office-fitout/index.html"], pageCount: 1, total: 3, month: 1, last: "2026-10-06 12:40", fields: ["name", "phone", "area"], cfg: { alertTo: "info@woodex.com.pk", waTo: "", waAlert: false, reply: false, replyText: "" }, note: "" },
    { id: "brief", label: "Design brief", pages: ["services/index.html"], pageCount: 1, total: 1, month: 0, last: null, fields: ["name", "message"], cfg: { alertTo: "", waTo: "", waAlert: false, reply: false, replyText: "" }, note: "Opens the visitor's own mail app" },
    { id: "fitout-hub", label: "Fit-out hub enquiry", pages: ["fitout/index.html"], pageCount: 1, total: 2, month: 0, last: "2026-09-30 15:20", fields: ["name", "phone"], cfg: { alertTo: "", waTo: "", waAlert: false, reply: false, replyText: "" }, note: "Opens the visitor's own mail app" },
    { id: "whatsapp", label: "WhatsApp widget", pages: [], pageCount: 0, total: 0, month: 0, last: null, fields: [], cfg: { alertTo: "", waTo: "", waAlert: false, reply: false, replyText: "" }, note: "Opens WhatsApp; posts nothing to this server" },
  ],
  web: {
    contact: "Contact form", estimator: "Estimator request", "office-fitout": "Office fit-out quote",
    brief: "Design brief", "fitout-hub": "Fit-out hub enquiry", whatsapp: "WhatsApp widget",
  },
  scan: {
    pages: [
      { rel: "contact/index.html", url: "https://woodex.com.pk/contact/", forms: ["contact"], formLabels: ["Contact form"], endpoints: ["/.netlify/functions/enquiry-submit"], lands: false, landsLabel: "Netlify function", managed: false },
      { rel: "estimator/index.html", url: "https://woodex.com.pk/estimator/", forms: ["estimator"], formLabels: ["Estimator request"], endpoints: ["/.netlify/functions/estimator-submit"], lands: false, landsLabel: "Netlify function", managed: false },
      { rel: "office-fitout/index.html", url: "https://woodex.com.pk/office-fitout/", forms: ["office-fitout"], formLabels: ["Office fit-out quote"], endpoints: ["/api/v2/forms/office-fitout"], lands: true, landsLabel: "This console", managed: true },
      { rel: "fitout/index.html", url: "https://woodex.com.pk/fitout/", forms: ["fitout-hub"], formLabels: ["Fit-out hub enquiry"], endpoints: ["mailto:info@woodex.com.pk"], lands: false, landsLabel: "The visitor's mail app", managed: false },
    ],
  },
};

const ESTIMATOR: EstData = {
  rel: "assets/js/estimator-rates.js", url: "/assets/js/estimator-rates.js",
  exists: true, bytes: 21480, mtime: "2026-10-12 20:14",
  pages: ["index.html", "estimator/index.html", "services/index.html", "fitout/index.html"],
  units: { sqft: "square feet", views: "views" },
  finishes: { essential: "Essential", standard: "Standard", premium: "Premium" },
  rates: {
    services: [
      { key: "kitchen", label: "Modular kitchen", hint: "Carcass, shutters, counter", unit: "sqft", unitLabel: "square feet", rates: { essential: 2600, standard: 3400, premium: 4600 } },
      { key: "wardrobe", label: "Wardrobes", hint: "Per square foot of front", unit: "sqft", unitLabel: "square feet", rates: { essential: 2100, standard: 2800, premium: 3900 } },
      { key: "ceiling", label: "Ceiling", hint: "Grid and false ceiling", unit: "sqft", unitLabel: "square feet", rates: { essential: 900, standard: 1250, premium: 1800 } },
      { key: "flooring", label: "Flooring", hint: "Supply and laying", unit: "sqft", unitLabel: "square feet", rates: { essential: 750, standard: 1100, premium: 1650 } },
      { key: "design", label: "Design fee", hint: "3D views and working drawings", unit: "views", unitLabel: "views", rates: { essential: 3500, standard: 5000, premium: 7500 } },
    ],
    finishes: [
      { key: "essential", label: "Essential", hint: "Local boards, laminate finish" },
      { key: "standard", label: "Standard", hint: "Branded hardware, matte laminate" },
      { key: "premium", label: "Premium", hint: "Imported veneer, soft-close throughout" },
    ],
    catalog: [
      { cat: "Kitchen", desc: "Tall unit", unit: "running foot", rate: 8500 },
      { cat: "Kitchen", desc: "Island counter", unit: "square foot", rate: 4200 },
      { cat: "Ceiling", desc: "Cove lighting", unit: "running foot", rate: 950 },
      { cat: "Misc", desc: "Site cleaning before handover", unit: "job", rate: 25000 },
    ],
    terms: ["Rates are inclusive of material and labour.", "Electrical and civil work is quoted separately.", "50% advance with the work order."],
  },
  templates: [
    { name: "Studio standard (Oct 2026)", at: "2026-10-12 20:14", by: "Imtiaz", rates: { services: [], finishes: [], catalog: [], terms: [] } },
    { name: "Pre-ramadan discount", at: "2026-03-01 10:00", by: "Owner", rates: { services: [], finishes: [], catalog: [], terms: [] } },
  ],
};

const HEROES: HeroScanData = {
  home: "index.html",
  total: 150, without: 7,
  counts: { image: 96, split: 18, words: 12, stage: 9, plain: 8, slider: 1 },
  families: { image: "Image hero", split: "Split hero", words: "Words hero", stage: "Stage hero", plain: "Plain hero", slider: "Home slider" },
  pages: [
    { rel: "index.html", url: "https://woodex.com.pk/", title: "Interior design and fit-out in Lahore", family: "slider", familyLabel: "Home slider", familyNote: "Three slides, eight seconds each", heroTitle: "Interiors that hold their shape", home: true },
    { rel: "services/index.html", url: "https://woodex.com.pk/services/", title: "Services", family: "split", familyLabel: "Split hero", familyNote: "Words beside a photo", heroTitle: "Every trade under one contract", home: false },
    { rel: "projects/index.html", url: "https://woodex.com.pk/projects/", title: "Projects", family: "image", familyLabel: "Image hero", familyNote: "A photograph, a title, a lead", heroTitle: "Work we handed over", home: false },
    { rel: "about/index.html", url: "https://woodex.com.pk/about/", title: "About us", family: "plain", familyLabel: "Plain hero", familyNote: "No photograph on purpose", heroTitle: "Twenty-two years in Lahore", home: false },
  ],
  templates: [
    { id: "image", label: "Image hero", desc: "A photograph behind the words" },
    { id: "split", label: "Split hero", desc: "Words on one side, photo on the other" },
    { id: "words", label: "Words hero", desc: "Type only, generous space" },
    { id: "stage", label: "Stage hero", desc: "Full-width image with a panel" },
    { id: "plain", label: "Plain hero", desc: "A title, a lead, nothing else" },
    { id: "slider", label: "Home slider", desc: "The home page's rotating slides" },
  ],
};

const HERO_HOME: HeroHomeData = {
  rel: "index.html", url: "https://woodex.com.pk/", title: "Interior design and fit-out in Lahore",
  present: true, interval: 8, hidden: 1,
  family: ["slider", "Home slider", "Three slides, eight seconds each"],
  templates: HEROES.templates,
  slides: [
    { kicker: "Lahore · since 2003", title: "Interiors that hold their shape", lead: "Design, joinery and site work under one contract.", img: "/assets/img/slide-01.jpg", alt: "Living room, DHA Phase 5", b1t: "Book a visit", b1h: "/contact/", b2t: "See projects", b2h: "/projects/", word: "", m1: "", m2: "", off: false, crumbs: true },
    { kicker: "", title: "Joinery made in our own workshop", lead: "No subcontract, no surprises on site.", img: "/assets/img/slide-02.jpg", alt: "Workshop, Kot Lakhpat", b1t: "Our workshop", b1h: "/workshop/", b2t: "", b2h: "", word: "", m1: "", m2: "", off: false },
    { kicker: "", title: "Fit-out for offices that keep working", lead: "Phased site work around your team.", img: "/assets/img/slide-03.jpg", alt: "Office, Gulberg", b1t: "Get a quote", b1h: "/office-fitout/", b2t: "", b2h: "", word: "", m1: "", m2: "", off: true },
  ],
};

const HERO_PAGE: HeroPageData = {
  rel: "services/index.html", url: "https://woodex.com.pk/services/", title: "Services", bytes: 41300,
  family: ["split", "Split hero", "Words beside a photo"], tpl: "split", hasHero: true,
  templates: HEROES.templates,
  fields: {
    kicker: "What we do", title: "Every trade under one contract",
    lead: "Design, joinery, ceilings, flooring and finishing — one team, one timeline.",
    img: "/assets/img/services-hero.jpg", alt: "Site team at Gulberg",
    b1t: "Book a visit", b1h: "/contact/", b2t: "Rate estimator", b2h: "/estimator/", crumbs: true,
  },
};

/**
 * The fixtures, keyed by the path a screen reads.
 *
 * Three kinds of key, and no more: an exact path, a path with a numeric tail treated as `{id}`, and a path
 * that answers with a sample for anything after it (`/heroes/page?rel=…`). A screen that reads a path with no
 * fixture here shows its honest "not answering" state in demo mode too — which is how the next slice announces
 * itself rather than being forgotten.
 */
/* Quotation templates. Two of the nine the studio ships are saved, and the starter rows carry the same
   `imported` flags the server computes — so the button says "six of nine" here for the same reason it does
   on the host, rather than because the sample chose a number. */
const TEMPLATES: TplsData = {
  company: {
    name: "Woodex Interior",
    tagline: "Design · Build · Furniture",
    address: "M-71, Zainab Tower, Model Town Link Road, Lahore",
    phones: "+92 322 4000768",
    email: "info@woodex.com.pk",
    web: "woodex.com.pk",
    signName: "Imtiaz Ahmad",
    signTitle: "Director",
  },
  kinds: { design: "Interior design", fitout: "Fit-out", renovation: "Renovation", other: "Other" },
  units: ["sft", "rft", "sqmt", "nos", "each", "set", "point", "job", "lumpsum"],
  itemKinds: ["head", "spec"],
  templates: [
    {
      id: 3, name: "Renovation", kind: "renovation", kindLabel: "Renovation",
      description: "Full home or office renovation in our standard BOQ format. Ten work sections with a summary rollup.",
      sectionCount: 2, lineCount: 5, pricedCount: 4, subtotal: 1_284_000, total: 1_284_000, totalDisplay: "1,284,000",
      termsFirst: "50% advance payment with work order.",
      terms: "50% advance payment with work order.\nPayment will be charged on the actual dimension / size of area.\nRates are valid for 15 days as per market rates.",
      updated_at: "2026-10-06 11:20",
      sections: [
        {
          name: "Civil Work", note: "Demolition and debris removal included.", subtotal: 384_000,
          items: [
            { desc: "Removal of existing windows, marble and brick walls wherever required", qty: 1, unit: "lumpsum", rate: 50_000, amount: 50_000, kind: "", code: "" },
            { desc: "A class brick work, beam/girder and slab pouring 1:4:8, PCC and plaster as per drawing", qty: 256, unit: "sft", rate: 1_250, amount: 320_000, kind: "", code: "" },
            { desc: "Debris removal and disposal off site", qty: 1, unit: "job", rate: 14_000, amount: 14_000, kind: "", code: "" },
          ],
        },
        {
          name: "Flooring", note: "", subtotal: 900_000,
          items: [
            { desc: "Flooring and wall tiling", qty: 0, unit: "job", rate: 0, amount: 0, kind: "head", code: "" },
            { desc: "Vitrified tiles 600x1200, supply and laying with skirting", qty: 1_500, unit: "sft", rate: 600, amount: 900_000, kind: "", code: "" },
          ],
        },
      ],
    },
    {
      id: 7, name: "Design Consultancy", kind: "design", kindLabel: "Interior design",
      description: "Complete interior design consultancy from layouts to detail drawings.",
      sectionCount: 1, lineCount: 1, pricedCount: 1, subtotal: 250_000, total: 250_000, totalDisplay: "250,000",
      termsFirst: "75% advance payment with work order.",
      terms: "75% advance payment with work order.\n25% on approval of project.\nAbove quote is exclusive of all applicable taxes.",
      updated_at: "2026-09-28 15:02",
      sections: [
        {
          name: "Consultancy", note: "", subtotal: 250_000,
          items: [
            { desc: "Complete interior design consultancy: 2D layouts, 3D design, mood boards and detail drawings", qty: 2_500, unit: "sft", rate: 100, amount: 250_000, kind: "", code: "" },
          ],
        },
      ],
    },
  ],
  starter: [
    { name: "Renovation", kind: "renovation", kindLabel: "Renovation", imported: true, description: "", termsFirst: "", terms: "", sections: [], sectionCount: 10, lineCount: 42, pricedCount: 42, subtotal: 0, total: 0, totalDisplay: "0" },
    { name: "Civil Work", kind: "renovation", kindLabel: "Renovation", imported: false, description: "", termsFirst: "", terms: "", sections: [], sectionCount: 3, lineCount: 9, pricedCount: 9, subtotal: 0, total: 0, totalDisplay: "0" },
    { name: "Interior Designing", kind: "design", kindLabel: "Interior design", imported: false, description: "", termsFirst: "", terms: "", sections: [], sectionCount: 3, lineCount: 7, pricedCount: 7, subtotal: 0, total: 0, totalDisplay: "0" },
    { name: "Interior", kind: "other", kindLabel: "Other", imported: false, description: "", termsFirst: "", terms: "", sections: [], sectionCount: 3, lineCount: 6, pricedCount: 6, subtotal: 0, total: 0, totalDisplay: "0" },
    { name: "Fit-out", kind: "fitout", kindLabel: "Fit-out", imported: false, description: "", termsFirst: "", terms: "", sections: [], sectionCount: 3, lineCount: 8, pricedCount: 8, subtotal: 0, total: 0, totalDisplay: "0" },
    { name: "Architecture", kind: "design", kindLabel: "Interior design", imported: false, description: "", termsFirst: "", terms: "", sections: [], sectionCount: 2, lineCount: 4, pricedCount: 4, subtotal: 0, total: 0, totalDisplay: "0" },
    { name: "3D Visualization", kind: "design", kindLabel: "Interior design", imported: false, description: "", termsFirst: "", terms: "", sections: [], sectionCount: 1, lineCount: 2, pricedCount: 2, subtotal: 0, total: 0, totalDisplay: "0" },
    { name: "Furniture", kind: "other", kindLabel: "Other", imported: false, description: "", termsFirst: "", terms: "", sections: [], sectionCount: 1, lineCount: 5, pricedCount: 5, subtotal: 0, total: 0, totalDisplay: "0" },
    { name: "Design Consultancy", kind: "design", kindLabel: "Interior design", imported: true, description: "", termsFirst: "", terms: "", sections: [], sectionCount: 1, lineCount: 1, pricedCount: 1, subtotal: 0, total: 0, totalDisplay: "0" },
  ],
};

/* Business info. The sample says what the live site says — read off the footer, not off v2.1's defaults —
   because the interesting part of this screen is the difference between the two: the footer opens at 9:30
   and the default record was 10:00. The provenance line says the same thing here as on a host nobody has
   applied a change on. */
const BIZ: BizRecord = {
  email: "info@woodex.com.pk",
  phone1: "+92 322 4000768",
  phone2: "+92 321 4686884",
  wa: "+92 322 4000768",
  addr1: "M-71, Zainab Tower",
  addr2: "Model Town Link Road",
  city: "Lahore",
  country: "Pakistan",
  days: "Mon–Sat",
  open: "09:30",
  close: "18:30",
  facebook: "",
  instagram: "",
  linkedin: "",
  youtube: "",
  tiktok: "",
  pinterest: "",
  x: "",
};

const BIZ_DATA: BizData = {
  biz: BIZ,
  applied: { ...BIZ, source: "index.html", found: ["phone1", "phone2", "wa", "email", "addr1", "addr2", "city", "country", "days", "open", "close"] },
  draft: null,
  source: "index.html",
  found: ["phone1", "phone2", "wa", "email", "addr1", "addr2", "city", "country", "days", "open", "close"],
  same: false,
  contact: ["email", "phone1", "phone2", "wa", "addr1", "addr2", "city", "country"],
  hours: ["days", "open", "close"],
  days: ["Mon–Sat", "Mon–Fri", "Mon–Sun"],
  socials: { facebook: "Facebook", instagram: "Instagram", linkedin: "LinkedIn", youtube: "YouTube", tiktok: "TikTok", pinterest: "Pinterest", x: "X (Twitter)" },
  assets: ["assets/site.js", "assets/js/whatsapp-widget.js"],
  sample: "index.html",
  site: { pages: 187, socialRow: 0 },
};

const COMPANY: CompanyRecord = {
  name: "Woodex Interior",
  tagline: "Design · Build · Furniture",
  address: "M-71, Zainab Tower, Model Town Link Road, Lahore",
  phones: "+92 322 4000768 · +92 321 4686884",
  email: "info@woodex.com.pk",
  web: "woodex.com.pk",
  ntn: "7230491-6",
  bankName: "",
  bankTitle: "",
  bankAccount: "",
  bankIban: "",
  signName: "Imtiaz Ahmad",
  signTitle: "Director",
  prefix: "WI-",
  wfPrefix: "WF-",
  nextNo: 10144,
  wfNext: 10050,
  validDays: 15,
  consultant: "Woodex Interior",
  banks: [
    { bank: "Bank Alfalah", title: "WOODEX INTERIOR", account: "02931007869105", iban: "PK06ALFH0293001007869105", branch: "Link Rd Model Town Br: Lahore", code: "0293", use: "interior" },
    { bank: "Meezan Bank", title: "WOODEX FURNITURE", account: "02810111519091", iban: "PK43MEZN0002810111519091", branch: "Model Town Link Road, Lahore", code: "", use: "furniture" },
  ],
  wallets: [
    { name: "JazzCash", number: "+92 321 3656096" },
    { name: "Easypaisa", number: "+92 321 3656096" },
  ],
  signers: [
    { name: "Imtiaz Ahmad", title: "Director" },
    { name: "Nabeel Afzal", title: "Marketing Manager" },
  ],
};

const COMPANY_DATA: CompanyData = {
  company: COMPANY,
  fields: ["name", "tagline", "address", "phones", "email", "web", "ntn", "bankName", "bankTitle", "bankAccount", "bankIban", "signName", "signTitle", "prefix", "validDays", "consultant"],
  lists: { banks: ["bank", "title", "account", "iban", "branch", "code", "use"], wallets: ["name", "number"], signers: ["name", "title"] },
  bankUse: ["all", "interior", "furniture"],
  used: 10143,
};

const FIXTURES: Record<string, unknown> = {
  "/business": BIZ_DATA,
  "/business/company": COMPANY_DATA,
  "/projects": PROJ_LIST,
  "/projects/{id}": PROJ_DETAIL,
  "/notifications": NOTIFY,
  "/forms": FORMS,
  "/estimator": ESTIMATOR,
  "/heroes": HEROES,
  "/heroes/home": HERO_HOME,
  "/heroes/page*": HERO_PAGE,
  "/quotations/templates": TEMPLATES,
};

/** The sample for a path, or null when this screen has none yet. */
export function demoFixture(path: string): unknown | null {
  if (path in FIXTURES) return FIXTURES[path];
  /* `/projects?view=all&limit=500` is the same read with different filters — one sample answers it. */
  const q = path.indexOf("?");
  if (q > 0 && path.slice(0, q) in FIXTURES) return FIXTURES[path.slice(0, q)];
  const tail = path.match(/^(.*\/)(\d+)$/);
  if (tail && `${tail[1]}{id}` in FIXTURES) return FIXTURES[`${tail[1]}{id}`];
  for (const key of Object.keys(FIXTURES)) {
    if (key.endsWith("*") && path.startsWith(key.slice(0, -1))) return FIXTURES[key];
  }
  return null;
}

/** The paths the newest screens read — the ones a design review must be able to open. Used by the checks. */
export const DEMO_COVERED = [
  "/projects", "/projects/{id}", "/notifications", "/forms", "/estimator", "/heroes", "/heroes/home", "/heroes/page*",
  "/quotations/templates", "/business", "/business/company",
];
