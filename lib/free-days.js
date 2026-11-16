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
  return { id: row?.id || null, days, times: cleanTimes(row?.utm?.times, days), busy: cleanBusy(row?.utm?.busy), extras: (data || []).slice(1).map((r) => r.id) };
}

// Busy times (2026-11-16, Brandon: "areas that I'm not free — I have PT clients
// I meet with regularly"): weekly blocks, utm.busy = [{ id, days: [0-6, Sun=0],
// from, to, label }]. The label is private; clients only ever get the hours.
export function cleanBusy(list) {
  return (Array.isArray(list) ? list : []).slice(0, 40).map((b, i) => {
    const days = [...new Set((Array.isArray(b?.days) ? b.days : []).map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n <= 6))].sort();
    const from = isHm(b?.from) ? b.from : "", to = isHm(b?.to) ? b.to : "";
    if (!days.length || !from || !to || to <= from) return null;
    return { id: String(b?.id || `b${i}-${from}-${to}`).slice(0, 40), days, from, to, label: String(b?.label || "").replace(/\s+/g, " ").trim().slice(0, 60) };
  }).filter(Boolean);
}
// The busy hours that fall on one date (no labels), earliest first.
export function busyOn(busy, date) {
  const dow = new Date(`${date}T12:00:00`).getDay();
  return busy.filter((b) => b.days.includes(dow)).map((b) => ({ from: b.from, to: b.to })).sort((a, b) => a.from.localeCompare(b.from));
}

// Times (2026-11-16, Brandon: "I wasn't able to put the times that I'm free"):
// an optional window per free day, utm.times = { "YYYY-MM-DD": { from: "11:30", to: "15:00" } }.
// No entry = free all day.
export const isHm = (s) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(s || ""));
export function cleanWindow(w) {
  const from = isHm(w?.from) ? w.from : "", to = isHm(w?.to) ? w.to : "";
  if (!from && !to) return null;
  if (from && to && to <= from) return null;
  return { from, to };
}
function cleanTimes(t, days) {
  const out = {};
  for (const d of days) { const w = cleanWindow(t && typeof t === "object" ? t[d] : null); if (w) out[d] = w; }
  return out;
}

export async function saveFree(db, cur, days, times = cur.times || {}, busy = cur.busy || []) {
  const clean = [...new Set(days.filter(isYmd))].filter((d) => d >= todayET()).sort().slice(0, 400);
  const row = { kind: "free_days", email: KEY, utm: { days: clean, times: cleanTimes(times, clean), busy: cleanBusy(busy) }, subject: "Studio: free days", summary: `${clean.length} free day${clean.length === 1 ? "" : "s"} marked`, updated_at: new Date().toISOString() };
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
  const [{ days, times, busy }, taken] = await Promise.all([loadFree(db), takenDates(db)]);
  const from = todayET();
  const marked = days.filter((d) => d >= from);
  const open = marked.filter((d) => !taken[d]);
  const openBusy = Object.fromEntries(open.map((d) => [d, busyOn(busy, d)]).filter(([, v]) => v.length));
  return { marked, taken, open, times, busy, openTimes: Object.fromEntries(open.filter((d) => times[d]).map((d) => [d, times[d]])), openBusy };
}
