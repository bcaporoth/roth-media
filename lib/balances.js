// Wedding balances: who still owes, and when to send them the balance link.
// The balance is due 14 days before the date (terms). Nothing here messages
// a client — it builds Brandon's list for the morning email.

import { cartUrl } from "./cart";
import { money } from "./packages";

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const DAY = 86400000;

// event_date is whatever the couple typed: "June 14, 2027", "6/14/27",
// "2027-06-14", "Sat June 14 2027 — or a month…". Null when there's no
// full date in it (just "June 2027" counts as unclear).
export function parseEventDate(text) {
  const t = String(text || "").toLowerCase();
  let m = /(\d{4})-(\d{1,2})-(\d{1,2})/.exec(t);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  m = /\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})\b/.exec(t);
  if (m) return new Date(m[3].length === 2 ? 2000 + +m[3] : +m[3], +m[1] - 1, +m[2]);
  m = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b/.exec(t);
  if (m) return new Date(+m[3], MONTHS.indexOf(m[1]), +m[2]);
  return null;
}

// Open retainers → { due: [...], unclear: [...] }. due = balance due within
// the next `ahead` days (or already past due), soonest first.
export async function balancesToSend(db, { now = Date.now(), ahead = 14 } = {}) {
  const { data, error } = await db
    .from("bookings")
    .select("id, category, package_id, addons, name, email, phone, event_date, total_cents, paid_cents, status, mode")
    .eq("mode", "retainer")
    .neq("status", "complete");
  if (error) throw new Error(error.message);
  const today = new Date(new Date(now).toDateString()).getTime();
  const due = [], unclear = [];
  for (const b of data || []) {
    const owed = (b.total_cents - b.paid_cents) / 100;
    if (owed <= 0) continue;
    const link = cartUrl({ category: b.category, packageId: b.package_id, addons: (b.addons || []).map((a) => a.id), name: b.name, email: b.email, phone: b.phone, pay: "balance" });
    const row = { id: b.id, name: b.name || b.email, phone: b.phone, email: b.email, owed, event: b.event_date, link };
    const date = parseEventDate(b.event_date);
    if (!date) { unclear.push(row); continue; }
    if (date.getTime() < today) continue; // the day has passed — Brandon settles it by hand
    const dueOn = date.getTime() - 14 * DAY;
    const days = Math.round((dueOn - today) / DAY);
    if (days <= ahead) due.push({ ...row, dueOn: new Date(dueOn), days });
  }
  due.sort((a, b) => a.days - b.days);
  return { due, unclear };
}

export function balanceLine(r) {
  const when = r.days < 0 ? `${-r.days} day${r.days === -1 ? "" : "s"} OVERDUE` : r.days === 0 ? "due TODAY" : `due in ${r.days} day${r.days === 1 ? "" : "s"}`;
  const on = r.dueOn ? r.dueOn.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "";
  return `${r.name} — ${money(r.owed)} ${when}${on ? ` (${on})` : ""} · wedding ${r.event}\nSend this link: ${r.link}`;
}
