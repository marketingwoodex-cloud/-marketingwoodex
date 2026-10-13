/* Formatting helpers — one place, so a number never renders two ways. */

export const money = (n: number, opts: { compact?: boolean; currency?: string } = {}) => {
  const { compact = false, currency = "PKR" } = opts;
  if (compact) {
    const abs = Math.abs(n);
    const unit = abs >= 1e7 ? "Cr" : abs >= 1e5 ? "L" : abs >= 1e3 ? "k" : "";
    const div = unit === "Cr" ? 1e7 : unit === "L" ? 1e5 : unit === "k" ? 1e3 : 1;
    return `${currency} ${(n / div).toFixed(unit ? 1 : 0)}${unit}`;
  }
  return `${currency} ${n.toLocaleString("en-PK")}`;
};

export const num = (n: number) => n.toLocaleString("en-PK");

export const pct = (n: number, digits = 0) => `${(n * 100).toFixed(digits)}%`;

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

/** "3m ago" · "2h ago" · "12 Oct" ·
 *  The clock defaults to *now*. The prototype pinned it to the day the mock data was written, which
 *  made every relative time correct against the mock and wrong against a live row. */
export function timeAgo(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const mins = Math.round((now.getTime() - d.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export const dateShort = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" });
