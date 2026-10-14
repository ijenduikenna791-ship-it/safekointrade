/** Shared admin search filter (reference ID or customer email). */

// Returns { query } rather than the builder itself: a Supabase query builder is
// "thenable", so returning it from an async function would execute it early.
export async function applySearch(supabase, query, q, { referenceColumn = "reference", userColumn = "user_id" } = {}) {
  const term = String(q || "").trim().slice(0, 120);
  if (!term) return { query };
  const safe = term.replace(/[%_,()]/g, "");
  if (term.includes("@")) {
    const { data } = await supabase.from("profiles").select("id").ilike("email", `%${safe}%`).limit(50);
    return { query: query.in(userColumn, (data || []).map((r) => r.id).concat("00000000-0000-0000-0000-000000000000")) };
  }
  return { query: query.ilike(referenceColumn, `%${safe}%`) };
}
