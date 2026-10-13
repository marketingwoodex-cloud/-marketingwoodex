/* ============================================================================
   MOCK DATA — shaped exactly like the proposed /api/v2 response envelopes,
   so swapping to the real API is a one-file change (see plan §6).

   Every figure is plausible for the Woodex studio: Lahore, PKR, interiors and
   fit-out. Nothing here is real customer data.
   ========================================================================== */

export interface Kpi {
  id: string;
  label: string;
  value: number;
  kind: "money" | "count" | "percent";
  delta: number;
  spark: number[];
  icon: string;
  tone?: "accent" | "ok" | "warn";
}

export const kpis: Kpi[] = [
  { id: "pipeline", label: "Open pipeline", value: 48_650_000, kind: "money", delta: 0.124, spark: [22, 26, 24, 31, 29, 36, 41, 38, 44, 49, 47, 54], icon: "Briefcase" },
  { id: "leads", label: "New leads (30d)", value: 184, kind: "count", delta: 0.082, spark: [12, 15, 14, 18, 17, 21, 19, 23, 26, 24, 28, 31], icon: "Inbox" },
  { id: "won", label: "Won this month", value: 11_320_000, kind: "money", delta: 0.231, spark: [3, 4, 3, 6, 5, 7, 9, 8, 10, 12, 11, 14], icon: "TrendingUp", tone: "ok" },
  { id: "conv", label: "Lead → client", value: 0.187, kind: "percent", delta: -0.019, spark: [21, 20, 22, 19, 21, 18, 20, 17, 19, 18, 19, 18], icon: "Gauge", tone: "warn" },
];

/** 12 months of won vs quoted value, in PKR. */
export const revenueSeries = [
  { m: "Nov", quoted: 21.4, won: 6.2 },
  { m: "Dec", quoted: 18.9, won: 5.4 },
  { m: "Jan", quoted: 24.1, won: 7.8 },
  { m: "Feb", quoted: 27.6, won: 9.1 },
  { m: "Mar", quoted: 31.2, won: 10.4 },
  { m: "Apr", quoted: 29.8, won: 11.2 },
  { m: "May", quoted: 34.5, won: 12.6 },
  { m: "Jun", quoted: 38.2, won: 13.9 },
  { m: "Jul", quoted: 36.4, won: 12.1 },
  { m: "Aug", quoted: 42.8, won: 15.4 },
  { m: "Sep", quoted: 46.1, won: 16.2 },
  { m: "Oct", quoted: 48.7, won: 17.8 },
];

export const channelMix = [
  { name: "Website forms", value: 78, tone: "var(--viz-1)" },
  { name: "WhatsApp", value: 46, tone: "var(--viz-2)" },
  { name: "Live chat", value: 31, tone: "var(--viz-3)" },
  { name: "Telegram", value: 18, tone: "var(--viz-4)" },
  { name: "Phone / walk-in", value: 11, tone: "var(--viz-5)" },
];

export const serviceMix = [
  { name: "Interior design", count: 62, value: 18_400_000 },
  { name: "Fit-out & turnkey", count: 41, value: 21_900_000 },
  { name: "Renovation", count: 34, value: 9_600_000 },
  { name: "3D visualisation", count: 27, value: 2_100_000 },
  { name: "Architecture", count: 20, value: 4_650_000 },
];

export interface Lead {
  id: string;
  name: string;
  company?: string;
  phone: string;
  city: string;
  service: string;
  source: string;
  stage: Stage;
  value: number;
  owner: string;
  updated: string;
  badge?: "hot" | "new" | "overdue";
}

export type Stage = "new" | "contacted" | "visit" | "quote" | "won";

export const STAGES: { id: Stage; label: string; tone: string }[] = [
  { id: "new", label: "New", tone: "info" },
  { id: "contacted", label: "Contacted", tone: "accent" },
  { id: "visit", label: "Site visit", tone: "warn" },
  { id: "quote", label: "Quoted", tone: "accent" },
  { id: "won", label: "Won", tone: "ok" },
];

export const leads: Lead[] = [
  { id: "L-4821", name: "Ahsan Raza", company: "Raza Textiles", phone: "+92 300 4412 889", city: "Lahore", service: "Office fit-out", source: "Website", stage: "quote", value: 4_850_000, owner: "Imtiaz A.", updated: "2026-10-13T14:20:00+05:00", badge: "hot" },
  { id: "L-4820", name: "Mariam Siddiqui", phone: "+92 321 7788 210", city: "Lahore", service: "10-marla house interior", source: "WhatsApp", stage: "visit", value: 6_200_000, owner: "Fatima N.", updated: "2026-10-13T11:05:00+05:00" },
  { id: "L-4819", name: "Bilal Chaudhry", company: "Cafe Corner", phone: "+92 333 2210 774", city: "Lahore", service: "Cafe interior", source: "Instagram", stage: "contacted", value: 2_400_000, owner: "Hamza S.", updated: "2026-10-13T09:40:00+05:00", badge: "new" },
  { id: "L-4818", name: "Dr. Sana Iqbal", company: "Iqbal Clinic", phone: "+92 345 9911 002", city: "Islamabad", service: "Clinic fit-out", source: "Website", stage: "quote", value: 5_100_000, owner: "Imtiaz A.", updated: "2026-10-12T17:55:00+05:00" },
  { id: "L-4817", name: "Usman Tariq", phone: "+92 302 5566 431", city: "Karachi", service: "Kitchen renovation", source: "Google", stage: "new", value: 1_250_000, owner: "—", updated: "2026-10-12T15:10:00+05:00", badge: "new" },
  { id: "L-4816", name: "Hina Malik", company: "Malik Fabrics", phone: "+92 311 4477 908", city: "Faisalabad", service: "Showroom design", source: "Referral", stage: "visit", value: 3_750_000, owner: "Fatima N.", updated: "2026-10-12T12:30:00+05:00" },
  { id: "L-4815", name: "Kamran Sheikh", phone: "+92 300 1234 567", city: "Lahore", service: "Farmhouse design", source: "WhatsApp", stage: "contacted", value: 8_900_000, owner: "Hamza S.", updated: "2026-10-11T18:20:00+05:00", badge: "overdue" },
  { id: "L-4814", name: "Zainab Aslam", phone: "+92 335 8877 221", city: "Lahore", service: "Wardrobe design", source: "Website", stage: "won", value: 780_000, owner: "Fatima N.", updated: "2026-10-11T10:02:00+05:00" },
  { id: "L-4813", name: "Nabeel Ahmed", company: "Ahmed Motors", phone: "+92 321 3344 556", city: "Lahore", service: "Retail fit-out", source: "Google", stage: "won", value: 5_400_000, owner: "Imtiaz A.", updated: "2026-10-10T16:45:00+05:00" },
  { id: "L-4812", name: "Sadia Rehman", phone: "+92 300 9988 776", city: "Multan", service: "5-marla renovation", source: "Facebook", stage: "new", value: 2_100_000, owner: "—", updated: "2026-10-10T11:15:00+05:00" },
  { id: "L-4811", name: "Faisal Nadeem", company: "Nadeem Pharma", phone: "+92 333 1122 334", city: "Lahore", service: "Pharmacy fit-out", source: "Referral", stage: "quote", value: 3_200_000, owner: "Hamza S.", updated: "2026-10-09T14:00:00+05:00" },
  { id: "L-4810", name: "Rabia Javed", phone: "+92 345 6677 889", city: "Rawalpindi", service: "Bathroom renovation", source: "Website", stage: "contacted", value: 640_000, owner: "Fatima N.", updated: "2026-10-09T09:25:00+05:00" },
];

export interface Quotation {
  no: string;
  client: string;
  project: string;
  amount: number;
  status: "draft" | "sent" | "viewed" | "approved" | "rejected" | "expired";
  issued: string;
  validUntil: string;
  items: number;
  template: string;
}

export const quotations: Quotation[] = [
  { no: "WX-Q-2026-148", client: "Raza Textiles", project: "Office fit-out — Gulberg", amount: 4_850_000, status: "approved", issued: "2026-10-06", validUntil: "2026-11-05", items: 34, template: "Fit-out" },
  { no: "WX-Q-2026-147", client: "Iqbal Clinic", project: "Clinic fit-out — F-8", amount: 5_100_000, status: "viewed", issued: "2026-10-05", validUntil: "2026-11-04", items: 41, template: "Healthcare" },
  { no: "WX-Q-2026-146", client: "Mariam Siddiqui", project: "10-marla interior — DHA Ph 6", amount: 6_200_000, status: "sent", issued: "2026-10-04", validUntil: "2026-11-03", items: 58, template: "Interior designing" },
  { no: "WX-Q-2026-145", client: "Nadeem Pharma", project: "Pharmacy fit-out — Model Town", amount: 3_200_000, status: "sent", issued: "2026-10-02", validUntil: "2026-11-01", items: 27, template: "Fit-out" },
  { no: "WX-Q-2026-144", client: "Ahmed Motors", project: "Retail fit-out — Jail Road", amount: 5_400_000, status: "approved", issued: "2026-09-29", validUntil: "2026-10-29", items: 36, template: "Retail" },
  { no: "WX-Q-2026-143", client: "Cafe Corner", project: "Cafe interior — Johar Town", amount: 2_400_000, status: "draft", issued: "2026-09-27", validUntil: "2026-10-27", items: 22, template: "Restaurant" },
  { no: "WX-Q-2026-142", client: "Malik Fabrics", project: "Showroom — Faisalabad", amount: 3_750_000, status: "expired", issued: "2026-09-12", validUntil: "2026-10-12", items: 31, template: "Retail" },
  { no: "WX-Q-2026-141", client: "Kamran Sheikh", project: "Farmhouse — Bedian Road", amount: 8_900_000, status: "rejected", issued: "2026-09-08", validUntil: "2026-10-08", items: 64, template: "Architecture" },
];

export const activity = [
  { who: "Imtiaz A.", what: "approved quotation WX-Q-2026-148", when: "2026-10-13T15:42:00+05:00", icon: "FileText" },
  { who: "Fatima N.", what: "moved Mariam Siddiqui to Site visit", when: "2026-10-13T14:10:00+05:00", icon: "Kanban" },
  { who: "System", what: "WhatsApp campaign “Eid offer” finished — 412 sent, 96% delivered", when: "2026-10-13T12:00:00+05:00", icon: "Send" },
  { who: "Hamza S.", what: "scheduled a site visit for Cafe Corner", when: "2026-10-13T10:35:00+05:00", icon: "Clock" },
  { who: "System", what: "Site health scan — 145 pages, 0 critical", when: "2026-10-13T06:00:00+05:00", icon: "HeartPulse" },
  { who: "Imtiaz A.", what: "published “Interior design trends Pakistan 2027”", when: "2026-10-12T18:20:00+05:00", icon: "BookOpen" },
];

export const approvals = [
  { who: "Fatima N.", what: "Delete quotation WX-Q-2026-139", asked: "2026-10-13T13:05:00+05:00" },
  { who: "Hamza S.", what: "Change invoice WX-INV-2026-088 total to PKR 4,850,000", asked: "2026-10-13T11:48:00+05:00" },
  { who: "Fatima N.", what: "Import 42 clients from CSV", asked: "2026-10-12T16:30:00+05:00" },
];

/** The 4-stage bilingual client-update workflow (P29 feature). */
export const updateStages = [
  { stage: "Brief confirmed", en: "We have your brief and the site measurements.", ur: "آپ کا بریف اور سائٹ کی پیمائش موصول ہو گئی ہے۔", sent: 46 },
  { stage: "Design presented", en: "Your 3D design set is ready to review.", ur: "آپ کا تھری ڈی ڈیزائن دیکھنے کے لیے تیار ہے۔", sent: 39 },
  { stage: "Work started", en: "Site work has started. Photos attached.", ur: "سائٹ پر کام شروع ہو گیا ہے۔ تصاویر منسلک ہیں۔", sent: 31 },
  { stage: "Handover", en: "The space is complete. Final walkthrough invited.", ur: "کام مکمل ہو گیا ہے۔ حتمی معائنے کی دعوت ہے۔", sent: 27 },
];

export const systemHealth = {
  php: "8.2.30",
  mysql: "10.6.18-MariaDB",
  diskUsedPct: 0.41,
  tables: 20,
  columns: 161,
  jsonStores: 28,
  apiActions: 364,
  backupAge: "6h ago",
  lastScan: "2026-10-13T06:00:00+05:00",
  healthScore: 69,
  findings: { seo: 8, altText: 143, brokenLinks: 0, oversized: 14, critical: 0 },
};
