// The delivery clock. What the site promises (app/terms "Delivery",
// app/welcome, lib/packages):
//   sneak peek ......... within 48 hours
//   wedding film ....... within six weeks of the wedding
//   photo galleries .... within four weeks (wedding + portrait)
//   business content ... within two weeks (Content Days + event coverage)
// Pure functions only — no database, no clock of their own (pass `now`) —
// so the Shoots board, the API and the morning brief all agree.
// All wall-clock maths is done in America/New_York, wherever this runs.

import { timing } from "./sun";

const TZ = "America/New_York";
const HOUR = 3600000;
const DAY = 86400000;

// Per shoot type: what the finished thing is called and how many days the
// site gives it. `sneakHours: 0` means no sneak-peek promise for that type.
export const PROMISES = {
  wedding: { final: "Film", days: 42, sneakHours: 48, also: { label: "Photo gallery", days: 28 } },
  family: { final: "Gallery", days: 28, sneakHours: 48 },
  business: { final: "Content", days: 14, sneakHours: 48 },
  event: { final: "Content", days: 14, sneakHours: 48 },
  other: { final: "Gallery", days: 28, sneakHours: 0 },
};
// How long a shoot runs, for "48 hours after we wrap" (same as the calendar entry).
const RUN_HOURS = { wedding: 10, business: 4 };

export const promiseFor = (kind) => PROMISES[kind] || PROMISES.other;

const pad = (n) => String(n).padStart(2, "0");
const fmtParts = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });

// Eastern wall clock minus UTC, in ms, at a given instant.
function offsetMs(ms) {
  const p = Object.fromEntries(fmtParts.formatToParts(new Date(ms)).map((x) => [x.type, Number(x.value)]));
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(ms / 1000) * 1000;
}

// "2026-10-03" + "16:30" on an Eastern clock → the real instant.
export function easternToDate(dateStr, hhmm = "00:00") {
  const [y, m, d] = String(dateStr).split("-").map(Number);
  const [h, mi] = String(hhmm).split(":").map(Number);
  const wall = Date.UTC(y, m - 1, d, h, mi);
  let t = wall - offsetMs(wall);
  const again = wall - offsetMs(t);
  if (again !== t) t = again; // straddled a clock change
  return new Date(t);
}

// Today's date on an Eastern calendar, "YYYY-MM-DD".
export function todayEastern(now = new Date()) {
  const p = Object.fromEntries(fmtParts.formatToParts(now).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}

export function addDays(dateStr, n) {
  const [y, m, d] = String(dateStr).split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

// The Eastern calendar date of an instant.
export const easternDateOf = (when) => todayEastern(new Date(when));

// When the shoot wraps: start + how long that kind runs; with no start time,
// the end of that day. Null without a date.
export function wrapTime(shoot) {
  if (!shoot?.date) return null;
  const start = timing(shoot).start;
  if (!start) return easternToDate(shoot.date, "23:59");
  return new Date(easternToDate(shoot.date, start).getTime() + (RUN_HOURS[shoot.kind] || 1.5) * HOUR);
}

// The two due dates for a shoot, as ISO strings (or null).
//   sneak_due = wrap + 48h
//   final_due = end of the day, N days after the shoot date
// A shoot marked done with no date counts from `doneAt`.
export function computeDues(shoot, { doneAt = new Date() } = {}) {
  const p = promiseFor(shoot?.kind);
  const wrap = wrapTime(shoot) || new Date(doneAt);
  const baseDate = shoot?.date || easternDateOf(doneAt);
  return {
    sneak_due: p.sneakHours ? new Date(wrap.getTime() + p.sneakHours * HOUR).toISOString() : null,
    final_due: easternToDate(addDays(baseDate, p.days), "23:59").toISOString(),
  };
}

// Has the shoot happened? Done, or its date is behind us. Cancelled never counts.
export function hasHappened(shoot, now = new Date()) {
  if (!shoot || shoot.status === "cancelled") return false;
  return shoot.status === "done" || Boolean(shoot.date && shoot.date < todayEastern(now));
}

// "in 19h" / "in 23 days" / "OVERDUE 2 days"
export function dueWords(due, now = new Date()) {
  const ms = new Date(due).getTime() - new Date(now).getTime();
  const abs = Math.abs(ms);
  const span = abs < HOUR ? "under an hour" : abs < 48 * HOUR ? `${Math.floor(abs / HOUR)}h` : `${Math.floor(abs / DAY)} days`;
  if (ms < 0) return { overdue: true, text: `OVERDUE ${span}` };
  return { overdue: false, text: `due in ${span}` };
}

const shortDay = (when) => new Date(when).toLocaleDateString("en-US", { timeZone: TZ, month: "short", day: "numeric" });

// Everything the UI and the brief need for one shoot.
//   applies — the shoot has happened, so the clock is running
//   owed    — something promised hasn't been ticked off yet
//   sneak / final — { label, due (Date), deliveredAt, open, overdue, text } (sneak is null when not promised)
//   urgent  — ms timestamp of the earliest thing still owed (for sorting)
// Stored due dates win; otherwise they're worked out from the shoot date, so
// this also works before supabase/studio-2.sql has been run.
export function deliveryState(shoot, now = new Date()) {
  const p = promiseFor(shoot?.kind);
  const applies = hasHappened(shoot, now);
  if (!applies) return { applies: false, owed: false, sneak: null, final: null, urgent: null, label: p.final };
  // An undated shoot only has a clock once its due dates are stored.
  const calc = shoot.date ? computeDues(shoot) : { sneak_due: null, final_due: null };
  const finalDue = shoot.final_due || calc.final_due;
  const sneakDue = shoot.sneak_due || calc.sneak_due;
  const finalAt = shoot.final_delivered_at || null;
  const sneakAt = shoot.sneak_delivered_at || null;

  const part = (label, due, deliveredAt, open) => {
    const w = due && open ? dueWords(due, now) : { overdue: false, text: "" };
    return {
      label,
      due: due ? new Date(due) : null,
      deliveredAt,
      open,
      overdue: w.overdue,
      text: deliveredAt ? `${label} ${label === "Sneak peek" ? "sent" : "delivered"} ${shortDay(deliveredAt)}` : open ? (due ? `${label} ${w.text}` : `${label} still to deliver`) : "",
    };
  };
  const final = part(p.final, finalDue, finalAt, !finalAt);
  // Once the finished work is out, a sneak peek isn't owed any more.
  const sneak = sneakDue || sneakAt ? part("Sneak peek", sneakDue, sneakAt, !sneakAt && !finalAt) : null;
  const open = [sneak, final].filter((x) => x && x.open);
  const dues = open.map((x) => (x.due ? x.due.getTime() : Infinity));
  return {
    applies: true,
    owed: open.length > 0,
    overdue: open.some((x) => x.overdue),
    sneak,
    final,
    label: p.final,
    urgent: dues.length ? Math.min(...dues) : null,
  };
}

// Shoots with something still owed, most urgent first.
export function owedList(shoots, now = new Date()) {
  return (shoots || [])
    .map((shoot) => ({ shoot, d: deliveryState(shoot, now) }))
    .filter((x) => x.d.owed)
    .sort((a, b) => (a.d.urgent ?? Infinity) - (b.d.urgent ?? Infinity));
}

// One plain-text line per owed shoot for the morning brief.
export function owedLine({ shoot, d }) {
  const bits = [d.sneak, d.final].filter((x) => x && x.open).map((x) => x.text);
  const when = shoot.date ? new Date(`${shoot.date}T12:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric" }) : "no date";
  return `${shoot.title}${shoot.client_name ? ` (${shoot.client_name})` : ""} · shot ${when}\n→ ${bits.join(" · ")}`;
}

// A date typed into "move the due date" → end of that day, Eastern.
export const dueFromDate = (dateStr) => (/^\d{4}-\d{2}-\d{2}$/.test(String(dateStr || "")) ? easternToDate(dateStr, "23:59").toISOString() : null);
