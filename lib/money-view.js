// What a client owes, for the Studio (Payments tab + the client profile).
// Reads rows from the `bookings` table — the one Stripe checkouts write
// (lib/booking.js) — and turns each into plain text Brandon can act on.
// Pure: no I/O. The due rule and the balance link are the same ones the
// morning email uses (lib/balances.js): balance due 14 days before the date,
// link = the saved cart with pay=balance.

import { cartUrl } from "./cart.js";
import { parseEventDate } from "./balances.js";

const DAY = 86400000;
export const BOOKING_COLS = "id, created_at, category, package_id, package_name, addons, total_cents, paid_cents, mode, name, email, phone, event_date, status";

const day = (d) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
const dayYear = (d) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const days = (n) => `${n} day${n === 1 ? "" : "s"}`;

// state: closed (refunded/cancelled) · paid · overdue · today · upcoming ·
//        past (the date has gone by, balance still open) · unclear (no exact date)
export function bookingView(b, now = Date.now()) {
  const total = Number(b.total_cents || 0);
  const paid = Number(b.paid_cents || 0);
  const closed = b.status === "refunded" || b.status === "cancelled";
  const owed = closed ? 0 : Math.max(0, total - paid);
  const addons = Array.isArray(b.addons) ? b.addons : [];
  const label = [b.package_name || b.package_id || "Booking", ...addons.map((a) => a && a.name).filter(Boolean)].join(" + ");
  const today = new Date(new Date(now).toDateString()).getTime();
  const date = parseEventDate(b.event_date);

  let state = "paid", due = "Paid in full", dueOn = null, daysLeft = null;
  if (closed) { state = "closed"; due = b.status === "refunded" ? "Refunded" : "Cancelled"; }
  else if (owed > 0) {
    if (!date) { state = "unclear"; due = "No exact date on file — the balance is due 14 days before it"; }
    else if (date.getTime() < today) { state = "past"; due = "The date has passed — settle this one by hand"; }
    else {
      dueOn = new Date(date.getTime() - 14 * DAY);
      daysLeft = Math.round((dueOn.getTime() - today) / DAY);
      if (daysLeft < 0) { state = "overdue"; due = `Balance ${days(-daysLeft)} overdue (was due ${day(dueOn)})`; }
      else if (daysLeft === 0) { state = "today"; due = "Balance due today"; }
      else { state = "upcoming"; due = `Balance due ${dayYear(dueOn)} — in ${days(daysLeft)}`; }
    }
  }
  // Same link the morning email sends; the cart page charges whatever is left
  // on their newest open retainer, so it only makes sense for those.
  const canLink = owed > 0 && b.mode === "retainer" && b.status !== "complete" && b.category && b.package_id;
  const link = canLink
    ? cartUrl({ category: b.category, packageId: b.package_id, addons: addons.map((a) => a && a.id).filter(Boolean), name: b.name || "", email: b.email || "", phone: b.phone || "", pay: "balance" })
    : "";
  return {
    id: b.id,
    name: b.name || b.email || "",
    email: String(b.email || "").toLowerCase(),
    phone: b.phone || "",
    label,
    totalCents: total,
    paidCents: paid,
    owedCents: owed,
    event: b.event_date || "",
    bookedOn: b.created_at ? dayYear(new Date(b.created_at)) : "",
    state,
    due,
    daysLeft,
    link,
  };
}

const ORDER = { overdue: 0, today: 1, upcoming: 2, past: 3, unclear: 4 };

// Everything still owed (most urgent first), then what's settled (newest first).
export function splitBookings(rows, now = Date.now()) {
  const views = (rows || []).map((b) => bookingView(b, now));
  const owing = views
    .filter((v) => v.owedCents > 0)
    .sort((a, b) => ORDER[a.state] - ORDER[b.state] || (a.daysLeft ?? 0) - (b.daysLeft ?? 0));
  const settled = views.filter((v) => v.owedCents <= 0);
  return { owing, settled, owedCents: owing.reduce((n, v) => n + v.owedCents, 0) };
}

export const usd = (cents) => {
  const n = cents / 100;
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: Number.isInteger(n) ? 0 : 2 });
};
