// Studio → Stats: the counting rules, as pure functions (no I/O, no JSX) so
// they can be checked with plain node. The page (app/portal/admin/stats)
// fetches rows; everything that decides "what counts" lives here.
//
// The rules, in one place:
//   lead      = a form a stranger sent from the site (quote / card / contact /
//               promo), not archived. Intake questionnaires, call sheets,
//               partner rows, old inquiries pasted in by hand and the inbox's
//               paid-booking rows are NOT leads.
//   booked    = people, counted once each — however many inbox rows their
//               booking and balance payment made.
//   funnel    = one unit (a visit: one person on one day) all the way down;
//               every step is a subset of the step above it.
//   money     = attributed to the day it was paid when the payment rows
//               allow it; otherwise labelled as what it really is.

import { isLead, REPLY_SLA_HOURS, DEFAULT_CLOSE_RATE } from "./lead-intel.js";

export { isLead, DEFAULT_CLOSE_RATE };

const HOUR = 3600 * 1000;
export const MIN_SAMPLE = 10; // leads per window before up/down means anything
export const MIN_DECIDED = 5; // booked + lost before a close rate is "yours"
const PRICING_RE = /^\/(quote|weddings|business|pay)/;

const lower = (s) => String(s || "").trim().toLowerCase();
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const dollars = (n) => `$${Math.round(n).toLocaleString("en-US")}`;

// Leads that count on Stats. Archived ones are junk / duplicates Brandon
// cleared out of the inbox.
export function countableLeads(subs) {
  return (subs || []).filter((s) => isLead(s) && s.status !== "archived");
}

// lib/booking.js writes a kind="booking" inbox row for the first payment AND
// another for the balance payment (that one is tagged with the Stripe session).
export function isBalanceRow(sub) {
  if (!sub || sub.kind !== "booking") return false;
  if (sub.utm && sub.utm.stripe_session) return true;
  return /\bbalance\b.*\bpaid\b/i.test(String(sub.summary || ""));
}

// Emails that paid through the site (either source will do).
export function paidEmailSet({ bookings = [], paySubs = [] } = {}) {
  const set = new Set();
  for (const b of bookings) if (lower(b.email)) set.add(lower(b.email));
  for (const s of paySubs) if (s.kind === "booking" && lower(s.email)) set.add(lower(s.email));
  return set;
}

// How many of the leads booked — each PERSON once (same email on a quote and a
// message is one person; a lead with no email counts as itself).
export function bookedPeople(leads, paidEmails = new Set()) {
  const people = new Set();
  for (const l of leads || []) {
    const email = lower(l.email);
    if (l.status === "lost" || l.status === "archived") continue;
    if (l.status === "booked" || (email && paidEmails.has(email))) people.add(email || `#${l.id}`);
  }
  return people.size;
}

// Bookings that are real (refunded / cancelled ones don't count as booked).
export function liveBookings(bookings) {
  return (bookings || []).filter((b) => b.status !== "refunded" && b.status !== "cancelled");
}

// "$1,234" / "$1,234.50 — 14 days before" → cents. null when there's no amount.
export function parseMoney(text) {
  const m = /\$\s*([\d,]+(?:\.\d{1,2})?)/.exec(String(text || ""));
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

// One inbox payment row → { at, cents, balance }. cents is null when the row
// doesn't say how much (then we can't date the money and say so).
export function paymentEvent(sub) {
  const balance = isBalanceRow(sub);
  const want = balance ? "balance paid" : "paid today";
  const rows = Array.isArray(sub.fields) ? sub.fields : [];
  const hit = rows.find((r) => Array.isArray(r) && lower(r[0]) === want);
  let cents = hit ? parseMoney(hit[1]) : null;
  if (cents === null) {
    const m = /\$\s*[\d,]+(?:\.\d{1,2})?(?=\s*paid)/i.exec(String(sub.summary || ""));
    if (m) cents = parseMoney(m[0]);
  }
  return { at: sub.created_at, cents, balance, email: lower(sub.email) };
}

// Money collected in the window.
//   basis "paid"     — summed from the dated payment rows: money that actually
//                      came in during the window (first payments + balances).
//   basis "bookings" — the payment rows are missing or unreadable, so this is
//                      what's been paid so far on bookings MADE in the window
//                      (a balance paid later is in here too).
//   basis "none"     — no bookings table and no payment rows.
export function collected({ bookings = [], bookingsOk = true, paySubs = [] } = {}) {
  const events = paySubs.filter((s) => s.kind === "booking").map(paymentEvent);
  const first = events.filter((e) => !e.balance);
  const readable = events.every((e) => e.cents !== null);
  const live = liveBookings(bookings);
  const bookedValueCents = live.reduce((n, b) => n + Number(b.total_cents || 0), 0);
  // The inbox row is written right after the booking row, so the two counts
  // match when nothing was lost; if they don't, don't pretend.
  const lined = !bookingsOk || first.length === bookings.length;
  if (events.length && readable && lined) {
    return {
      basis: "paid",
      cents: events.reduce((n, e) => n + e.cents, 0),
      payments: events.length,
      balancePayments: events.length - first.length,
      bookedValueCents,
    };
  }
  if (bookingsOk) {
    return {
      basis: "bookings",
      cents: live.reduce((n, b) => n + Number(b.paid_cents || 0), 0),
      payments: live.length,
      balancePayments: 0,
      bookedValueCents,
    };
  }
  return { basis: "none", cents: 0, payments: 0, balancePayments: 0, bookedValueCents: 0 };
}

const median = (xs) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

export function fmtHours(h) {
  if (h === null || h === undefined) return "—";
  if (h < 1) return `${Math.max(1, Math.round(h * 60))}m`;
  if (h < 48) return `${h < 10 ? h.toFixed(1) : Math.round(h)}h`;
  return `${Math.round(h / 24)}d`;
}

// Time to first touch, from submissions.first_contacted_at (stamped once by the
// inbox). ready=false → the column isn't there yet: no number at all, never a
// stand-in from updated_at (that moves on every status change).
export function firstTouch(leads, ready = true) {
  if (!ready) return { ready: false, n: 0, medianHours: null };
  const hours = [];
  for (const l of leads || []) {
    if (!l.first_contacted_at) continue;
    const h = (new Date(l.first_contacted_at) - new Date(l.created_at)) / HOUR;
    if (Number.isFinite(h) && h >= 0) hours.push(h);
  }
  return { ready: true, n: hours.length, medianHours: median(hours) };
}

// Up / down vs the window before. No verdict until both windows have enough.
export function trend(now, prev, min = MIN_SAMPLE) {
  if (prev === null || prev === undefined) return { state: "unknown", now, prev: null };
  if (now < min || prev < min) return { state: "early", now, prev };
  const change = (now - prev) / prev;
  if (Math.abs(change) < 0.15) return { state: "flat", now, prev, change };
  return { state: change > 0 ? "up" : "down", now, prev, change };
}

// The funnel, in visits. rows: site_events (type, name, path, visitor,
// created_at) · quoteSubs: kind="quote" submissions (their `visitor` is the same
// daily hash) · dayKey: date → "YYYY-MM-DD" in Brandon's timezone.
// Each step = the visits from the step above that ALSO did this, so no step
// can be bigger than the one before it.
export function visitFunnel(rows, quoteSubs, dayKey) {
  const key = (r) => `${dayKey(r.created_at)}|${r.visitor}`;
  const where = (pred) => new Set((rows || []).filter(pred).map(key));
  const visited = where((r) => r.type === "pageview");
  const pricing = where((r) => r.type === "pageview" && PRICING_RE.test(r.path || ""));
  const started = where((r) => r.type === "event" && r.name === "quote_started");
  const checkout = where((r) => r.type === "event" && r.name === "book_now_click");
  const finished = where((r) => r.type === "event" && (r.name === "quote_sent" || r.name === "book_now_click"));
  for (const s of quoteSubs || []) if (s.visitor) finished.add(key(s));
  const landedPaid = where((r) => r.type === "pageview" && /^\/booked(\/|$)/.test(r.path || ""));

  const steps = [
    ["Visited the site", visited],
    ["Looked at pricing", pricing],
    ["Started a quote", started],
    ["Sent it or hit Book it", finished],
    ["Opened checkout", checkout],
    ["Paid", landedPaid],
  ];
  const out = [];
  let prev = null;
  for (const [label, set] of steps) {
    const cur = prev === null ? set : new Set([...set].filter((k) => prev.has(k)));
    out.push({ label, n: cur.size, of: prev === null ? null : prev.size });
    prev = cur;
  }
  return out;
}

// "3 of 14 · 21%" — the count always rides with the percentage.
export function share(n, of) {
  if (!of) return "";
  const p = (n / of) * 100;
  return `${n.toLocaleString("en-US")} of ${of.toLocaleString("en-US")} · ${p > 0 && p < 10 ? p.toFixed(1) : Math.round(p)}%`;
}

// Close rate: Brandon's own once enough PEOPLE are decided, otherwise unknown.
// emailById (lead id → email) lets a person who sent two forms count once:
// they're won if any of their leads booked, lost if none did and one was lost.
export function closeRead(board, emailById = {}, min = MIN_DECIDED) {
  const people = new Map();
  for (const l of board || []) {
    const who = lower(emailById[l.id]) || `#${l.id}`;
    const cur = people.get(who) || { booked: false, lost: false, open: false };
    if (l.status === "booked") cur.booked = true;
    else if (l.status === "lost") cur.lost = true;
    else cur.open = true;
    people.set(who, cur);
  }
  let won = 0, lost = 0;
  for (const p of people.values()) {
    if (p.booked) won++;
    else if (p.lost && !p.open) lost++;
  }
  const decided = won + lost;
  return { won, decided, need: min, known: decided >= min, rate: decided >= min ? won / decided : null };
}

// Open pipeline × close rate, each open lead weighted by its heat against an
// average (50) lead — the same weighting lib/lead-intel.js uses.
export function expectedToBook(board, rate) {
  return (board || []).filter((l) => l.open).reduce((n, l) => n + l.value * Math.min(0.9, rate * (l.heat / 50)), 0);
}

const hourName = (h) => (h === 0 ? "12am" : h < 12 ? `${h}am` : h === 12 ? "12pm" : `${h - 12}pm`);

// The "What's going on" list. Facts that need action come first; anything
// statistical is held back until there's enough to go on.
//   board/hot: from lib/lead-intel · f: forecast() numbers · close: closeRead()
//   touch: firstTouch() · leadTrend: trend() · visits/visitsPrev: page views
export function buildSignals({ board = [], hot = [], f = {}, close, touch, leadTrend, visits = 0, visitsPrev = null, range = 30, peakHour = null }) {
  const out = [];
  const add = (tone, text) => out.push({ tone, text });
  const open = board.filter((l) => l.open);
  const overdue = board.filter((l) => l.overdue);
  const abandoned = open.filter((l) => l.did && l.did.openedCheckout);
  const names = (list) => `${list.slice(0, 3).map((l) => l.name).join(", ")}${list.length > 3 ? "…" : ""}`;

  if (overdue.length) add("late", `${plural(overdue.length, "lead")} ${overdue.length > 1 ? "have" : "has"} waited over ${REPLY_SLA_HOURS} hours with no reply: ${names(overdue)}. Reply to these first.`);
  if (abandoned.length) add("hot", `${plural(abandoned.length, "lead")} opened checkout and stopped: ${names(abandoned)}. Worth a text today.`);
  if (hot.length) add("warm", `${plural(hot.length, "anonymous visitor")} looked ready to buy in the last 48 hours but didn't send a form. You can't contact them — it's a read on demand.`);

  if (range > 1 && leadTrend && leadTrend.state !== "unknown") {
    const { state, now, prev } = leadTrend;
    const vs = `${now} in this window, ${prev} in the one before`;
    if (state === "early") add("mute", `Leads: ${vs}. Too early to tell if that's up or down — it takes about ${MIN_SAMPLE} in each window before the difference means anything.`);
    else if (state === "flat") add("warm", `Leads are about level: ${vs}.`);
    else if (state === "up") add("good", `Leads are up: ${vs}.`);
    else add("late", `Leads are down: ${vs}.${visitsPrev === null ? "" : visits >= visitsPrev ? " Page views held, so fewer visitors are sending a form — check the quote flow." : " Page views dropped too, so this looks like fewer people reaching the site."}`);
  }

  if (f.pickerShown >= 3) {
    const enough = f.pickerShown >= MIN_SAMPLE;
    add(enough && f.callsBooked / f.pickerShown >= 0.3 ? "good" : enough ? "warm" : "mute", `${f.callsBooked} of ${f.pickerShown} people who saw the call picker booked a call${enough ? ` (${Math.round((f.callsBooked / f.pickerShown) * 100)}%)` : ""}.`);
  }

  if (touch && touch.ready && touch.n > 0) {
    const m = touch.medianHours;
    add(m <= 1 ? "good" : m <= REPLY_SLA_HOURS ? "warm" : "late", `Your typical time to first reply is ${m < 1 ? `${Math.max(1, Math.round(m * 60))} minutes` : m < 48 ? `${m.toFixed(1)} hours` : `${Math.round(m / 24)} days`} (middle of ${plural(touch.n, "reply", "replies")}). Target: 15 minutes.`);
  }

  if (open.length && !f.pipeline) add("warm", `${plural(open.length, "open lead")} with no quoted price yet — a call puts a number on ${open.length > 1 ? "them" : "it"}.`);
  else if (open.length) {
    const tail = close && close.known
      ? ` ${close.won} of the ${close.decided} people you've marked Booked or Lost in this window booked (${Math.round(close.rate * 100)}%); weighted by how warm each open one is, about ${dollars(expectedToBook(board, close.rate))} of it is likely to book.`
      : ` Too early to say how much will book — that needs ${close ? close.need : MIN_DECIDED} people marked Booked or Lost (${close ? close.decided : 0} so far).`;
    add("warm", `${plural(open.length, "open lead")} worth ${dollars(f.pipeline)} at their quoted prices.${tail}`);
  }

  if (range >= 7 && board.length >= MIN_SAMPLE) {
    const per30 = Math.round((board.length / range) * 30);
    const books = close && close.known ? ` and about ${plural(Math.max(0, Math.round(per30 * close.rate)), "booking")}` : "";
    add("warm", `At this pace: about ${per30} leads${books} per 30 days.`);
  }

  if (peakHour !== null && visits >= 20) add("mute", `Most visitors show up around ${hourName(peakHour)} — the easiest time to catch a lead while they're still on the site.`);
  if (!out.length) add("mute", "Quiet window — nothing needs you right now.");
  return out;
}

// Where leads come from, and what each source turned into.
//   leads     — countableLeads() rows
//   firstView — lead id → the first page view of that visitor on the day they
//               sent the form (null when the visit wasn't tracked)
//   sourceOf  — the page's own source(view) label ("Google", "Facebook", …)
//   paidEmails / payEvents — paidEmailSet() and paymentEvent() rows
// A lead is credited to the link it arrived on (utm_source), else to where
// that visit came from, else "Direct / typed in". Booked counts people once.
// Money is credited to the source of a person's FIRST lead, so a balance paid
// months later still lands on the ad that found them.
export const DIRECT_SOURCE = "Direct / typed in";
export function sourceTable({ leads = [], firstView = {}, sourceOf = () => "", paidEmails = new Set(), payEvents = [] } = {}) {
  const srcOfLead = (l) => {
    const u = l.utm && (l.utm.source || l.utm.utm_source);
    if (u) return u === "qr" ? "QR code (business card)" : String(u);
    const v = firstView[l.id];
    return (v && sourceOf(v)) || DIRECT_SOURCE;
  };
  const rows = new Map();
  const personSource = new Map();
  const sorted = [...leads].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  for (const l of sorted) {
    const s = srcOfLead(l);
    const r = rows.get(s) || { source: s, leads: 0, booked: new Set(), cents: 0 };
    r.leads += 1;
    const email = lower(l.email);
    const who = email || `#${l.id}`;
    const closed = l.status === "lost" || l.status === "archived";
    if (!closed && (l.status === "booked" || (email && paidEmails.has(email)))) r.booked.add(who);
    if (email && !personSource.has(email)) personSource.set(email, s);
    rows.set(s, r);
  }
  for (const e of payEvents || []) {
    const s = e && e.email ? personSource.get(lower(e.email)) : null;
    if (s && e.cents) rows.get(s).cents += e.cents;
  }
  return [...rows.values()]
    .map((r) => ({ source: r.source, leads: r.leads, booked: r.booked.size, cents: r.cents }))
    .sort((a, b) => b.leads - a.leads || b.cents - a.cents || a.source.localeCompare(b.source));
}
