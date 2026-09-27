// Shared Supabase REST helper for Woodex CMS functions.
// Uses the service_role key server-side only; it never reaches the browser.
const URL = process.env.SUPABASE_URL || "";
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export const sbConfigured = () => Boolean(URL && KEY);

export async function sbRest(path, { method = "GET", body = null, query = "", prefer = "" } = {}) {
  const res = await fetch(`${URL}/rest/v1/${path}${query}`, {
    method,
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
      Prefer: prefer || (method === "POST" ? "return=representation" : "return=minimal"),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  return { status: res.status, data };
}
