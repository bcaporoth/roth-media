// Studio → Today. Pure functions that turn rows the Studio already has
// (shoots, inbox submissions, bookings) into the five blocks on the Today
// page. No database and no clock of its own — pass `now` — so it can be
// tested with plain node and always agrees with the Inbox, Shoots, Payments
// and Stats tabs, which use the same helpers underneath.

import { timing, fmt12 } from "./sun";
import { mapsUrl } from "./geo";
import { owedList, todayEastern, addDays } from "./delivery";
import { inboxIntel, inboxSort } from "./lead-intel";
import { countableLeads, bookedPeople, paidEmailSet, liveBookings } from "./stats-math";
import { shootKindLabel } from "./studio-labels";

const DAY = 86400000;
const dayNumber = (key) => { const [y, m, d] = String(key).split("-").map(Number); return Date.UTC(y, m - 1, d) / DAY; };
const longDay = (key) => new Date(`${key}T12:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" });

// "Today" / "Tomorrow" / "in 6 days"
export function daysAwayWords(dateKey, todayKey) {
  const n = dayNumber(dateKey) - dayNumber(todayKey);
  if (n === 0) return "Today";
  if (n === 1) return "Tomorrow";
  return `in ${n} days`;
}

// The next shoot still to happen (today counts all day, Eastern), plus how
// many more are inside the next 7 days. Undated, done and cancelled shoots
// are never "next".
export function nextShoot(shoots, now = new Date()) {
  const today = todayEastern(now);
  const coming = (shoots || [])
    .filter((s) => s && s.date && s.date >= today && s.status !== "cancelled" && s.status !== "done")
    .sort((a, b) => a.date.localeCompare(b.date) || String(timing(a).start || "99").localeCompare(String(timing(b).start || "99")));
  const s = coming[0];
  if (!s) return { shoot: null, alsoThisWeek: 0, undated: (shoots || []).filter((x) => x && !x.date && x.status !== "cancelled" && x.status !== "done").length };
  const t = timing(s);
  const weekEnd = addDays(today, 7);
  return {
    shoot: {
      id: s.id,
      title: s.title || "Shoot",
      kind: shootKindLabel(s.kind),
      client: s.client_name || "",
      phone: s.client_phone || "",
      status: s.status || "planned",
      dateKey: s.date,
      day: longDay(s.date),
      away: daysAwayWords(s.date, today),
      isToday: s.date === today,
      start: t.start ? fmt12(t.start) : "",
      startWorkedOut: Boolean(t.resolved),
      timeNote: !t.start && s.time_note ? s.time_note : "",
      leave: t.leave ? fmt12(t.leave) : "",
      driveMin: s.drive_min || null,
      sunset: t.sunset ? fmt12(t.sunset) : "",
      sunsetAtHome: !(s.lat && s.lng),
      address: s.address || "",
      directions: s.address || (s.lat && s.lng) ? mapsUrl(s.address, s.lat, s.lng) : "",
      prepLeft: (s.checklist || []).filter((c) => !c.done).length,
      prepTotal: (s.checklist || []).length,
    },
    alsoThisWeek: coming.slice(1).filter((x) => x.date <= weekEnd).length,
    undated: 0,
  };
}

// Leads that need Brandon: a follow-up he set that's due, a new lead past the
// 24-hour mark, or a new lead nobody has answered yet. Same read (and the
// same order) as the Inbox's "Needs you first".
export function leadsNeedingYou(subs, did = {}, now = Date.now(), bookingEmails = []) {
  const paid = new Set((bookingEmails || []).filter(Boolean));
  const rows = (subs || []).map((s) => ({ ...s, intel: inboxIntel(s, did[s.id], now, paid) }));
  const need = inboxSort(rows.filter((r) => r.intel.open && (r.intel.followDue || r.intel.status === "new")));
  return need.map((r) => ({
    id: r.id,
    name: r.name || r.email || r.phone || "Someone",
    summary: r.summary || "",
    flag: r.intel.followDue ? (r.intel.followUp === todayKeyOf(now) ? "Follow up today" : "Follow-up overdue") : r.intel.overdue ? "Overdue" : "New",
    late: r.intel.followDue || r.intel.overdue,
    next: r.intel.next ? r.intel.next.text : "",
    tone: r.intel.next ? r.intel.next.tone : "warm",
    phone: r.phone || "",
  }));
}
const todayKeyOf = (now) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date(now));

// Finished shoots with something still to deliver, most urgent first. Before
// supabase/studio-2.sql is run nothing can be ticked off, so (like the Shoots
// tab) only the last 60 days count.
export function owedToday(shoots, ready, now = new Date()) {
  let rows = owedList(shoots, now);
  if (!ready) { const cutoff = addDays(todayEastern(now), -60); rows = rows.filter((x) => x.shoot.date && x.shoot.date >= cutoff); }
  return rows.map(({ shoot, d }) => ({
    id: shoot.id,
    title: shoot.title || "Shoot",
    client: shoot.client_name || "",
    shot: shoot.date ? longDay(shoot.date) : "no date",
    overdue: Boolean(d.overdue),
    parts: [d.sneak, d.final].filter((x) => x && x.open).map((x) => ({ text: x.text, overdue: x.overdue })),
  }));
}

// One line of numbers for the last `days` days, counted the way Stats counts.
export function recentNumbers({ subs = [], bookings = [], paySubs = [] } = {}) {
  const leads = countableLeads(subs);
  const paid = paidEmailSet({ bookings: liveBookings(bookings), paySubs });
  return { leads: leads.length, booked: bookedPeople(leads, paid) };
}
