// Brandon's free days (2026-11-16): "I place my availability [in Studio →
// Calendar]. It populates into my clients' calendars, where they can see it.
// The client can opt for that day."
//
// Stored as one submissions row (kind "free_days", utm = { days: ["YYYY-MM-DD"] })
// — no table change. A marked day is OPEN until something lands on it: any
// shoot on the Shoots calendar (not cancelled) or any client's shoot day. So
// when one client asks for a day, it stops showing as free for everyone else,
// and it opens again by itself if that day is moved or deleted.
// Clients only ever get the list of open dates — never who has the others.

const KEY = "studio:free-days";
export const isYmd = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ""));
// Today in Eastern, as YYYY-MM-DD.
export const todayET = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });

// One row is the truth: the oldest. (Two first-ever saves landing together
// could each insert a row; any extras are removed on the next save.)
export async function loadFree(db) {
  const { data } = await db.from("submissions").select("id, utm").eq("kind", "free_days").eq("email", KEY).order("created_at", { ascending: true }).limit(5);
  const row = (data || [])[0];
  const days = [...new Set((Array.isArray(row?.utm?.days) ? row.utm.days : []).filter(isYmd))].sort();
  return { id: row?.id || null, days, extras: (data || []).slice(1).map((r) => r.id) };
}

export async function saveFree(db, cur, days) {
  const clean = [...new Set(days.filter(isYmd))].filter((d) => d >= todayET()).sort().slice(0, 400);
  const row = { kind: "free_days", email: KEY, utm: { days: clean }, subject: "Studio: free days", summary: `${clean.length} free day${clean.length === 1 ? "" : "s"} marked`, updated_at: new Date().toISOString() };
  const q = cur.id ? db.from("submissions").update(row).eq("id", cur.id) : db.from("submissions").insert({ ...row, status: "archived", fields: [], source_path: "/portal/admin/calendar" });
  const { error } = await q;
  if (error) throw new Error(error.message);
  if (cur.extras?.length) await db.from("submissions").delete().in("id", cur.extras).eq("kind", "free_days");
  return clean;
}

// Dates from today on that already have something on them: { date: [labels] }.
export async function takenDates(db) {
  const from = todayET();
  const taken = {};
  const [{ data: shoots }, { data: days }] = await Promise.all([
    db.from("shoots").select("date, title, status").gte("date", from).then((r) => r, () => ({ data: [] })),
    db.from("shoot_days").select("date, title, client_id").gte("date", from).then((r) => r, () => ({ data: [] })),
  ]);
  for (const s of shoots || []) if (s.date && s.status !== "cancelled") (taken[s.date] ||= []).push(s.title || "Shoot");
  for (const d of days || []) if (d.date) (taken[d.date] ||= []).push(d.title || "Shoot day");
  return taken;
}

// What everyone sees: marked, today or later, nothing on it yet.
export async function freeView(db) {
  const [{ days }, taken] = await Promise.all([loadFree(db), takenDates(db)]);
  const from = todayET();
  const marked = days.filter((d) => d >= from);
  return { marked, taken, open: marked.filter((d) => !taken[d]) };
}
