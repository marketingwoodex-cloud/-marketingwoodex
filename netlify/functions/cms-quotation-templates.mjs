// Session-authenticated CRUD for quotation templates (per work type).
// GET    -> { templates: [...] }  (ordered by name)
// POST   -> { ok, id }            (create; name unique)
// PATCH  -> { ok }                (update by id)
// DELETE -> { ok }                (delete by id)
import { supa, json, preflight, readSession } from "./_supabase.mjs";

const UNITS = ["job", "nos", "sft", "rft"];

function cleanItems(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((it) => ({
      desc: String(it.desc || "").slice(0, 500).trim(),
      qty: Math.max(0, Number(it.qty) || 0),
      unit: UNITS.includes(it.unit) ? it.unit : "job",
      rate: Math.max(0, Number(it.rate) || 0),
    }))
    .filter((it) => it.desc);
}

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return preflight();
  const me = await readSession(event);
  if (!me) return json(401, { error: "not signed in" });
  const db = supa();
  if (!db) return json(502, { error: "database unavailable" });

  try {
    if (event.httpMethod === "GET") {
      const { data, error } = await db
        .from("quotation_templates")
        .select("id,name,items,terms,created_at")
        .order("name", { ascending: true });
      if (error) throw error;
      return json(200, { templates: data || [] });
    }

    const body = JSON.parse(event.body || "{}");

    if (event.httpMethod === "POST") {
      const name = String(body.name || "").trim().slice(0, 120);
      if (name.length < 2) return json(400, { error: "template name required" });
      const { data, error } = await db
        .from("quotation_templates")
        .insert({
          name,
          items: cleanItems(body.items),
          terms: String(body.terms || "").slice(0, 5000),
        })
        .select("id")
        .single();
      if (error) throw error;
      return json(200, { ok: true, id: data.id });
    }

    if (event.httpMethod === "PATCH") {
      if (!body.id) return json(400, { error: "id required" });
      const patch = { updated_at: new Date().toISOString() };
      if (body.name !== undefined) {
        const name = String(body.name).trim().slice(0, 120);
        if (name.length < 2) return json(400, { error: "template name required" });
        patch.name = name;
      }
      if (body.items !== undefined) patch.items = cleanItems(body.items);
      if (body.terms !== undefined) patch.terms = String(body.terms).slice(0, 5000);
      const { error } = await db.from("quotation_templates").update(patch).eq("id", body.id);
      if (error) throw error;
      return json(200, { ok: true });
    }

    if (event.httpMethod === "DELETE") {
      if (!body.id) return json(400, { error: "id required" });
      const { error } = await db.from("quotation_templates").delete().eq("id", body.id);
      if (error) throw error;
      return json(200, { ok: true });
    }

    return json(405, { error: "method not allowed" });
  } catch (err) {
    console.error("cms-quotation-templates error:", err.message);
    return json(502, { error: "database error" });
  }
}
