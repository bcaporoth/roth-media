import { defaultPlaybook } from "./shoot-guides";

// Server-side: read the playbook library. Seeds the starter set the first
// time it's read; if the table isn't there yet, hands back the starter set
// (read-only, flagged `missing`) so Shoots keeps working either way.
export async function loadPlaybook(db) {
  const { data, error } = await db.from("playbook").select("*").order("sort", { ascending: true }).order("created_at", { ascending: true });
  if (error) {
    const fallback = defaultPlaybook().map((r, i) => ({ ...r, id: `default-${i}` }));
    return { lists: fallback, missing: true, error: error.message };
  }
  if (data.length) {
    // Sections added after the table was first seeded (camera: settings &
    // reminders, Oct 2026) get their starter lists the first time they're
    // read. Needs supabase/camera-section.sql first; until then, silent.
    const have = new Set(data.map((r) => r.section));
    const fresh = defaultPlaybook().filter((r) => !have.has(r.section));
    if (fresh.length) {
      let sort = Math.max(0, ...data.map((r) => r.sort || 0));
      const { data: added } = await db.from("playbook").insert(fresh.map((r) => ({ ...r, sort: ++sort }))).select("*");
      if (added?.length) return { lists: [...data, ...added], missing: false };
    }
    return { lists: data, missing: false };
  }
  const { data: seeded, error: seedErr } = await db.from("playbook").insert(defaultPlaybook()).select("*");
  if (seedErr) return { lists: defaultPlaybook().map((r, i) => ({ ...r, id: `default-${i}` })), missing: true, error: seedErr.message };
  return { lists: (seeded || []).sort((a, b) => a.sort - b.sort), missing: false, seeded: true };
}
