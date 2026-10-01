// Lead intelligence — pure functions, no I/O. Turns raw submissions +
// site_events into "who did what, how hot are they, what do I do next".
// Used by Studio → Stats and the morning lead brief (/api/cron/leads).

const HOUR = 3600 * 1000;
export const REPLY_SLA_HOURS = 24; // a lead with no reply past this is overdue
export const DEFAULT_CLOSE_RATE = 0.2; // used only until there's real history

const KIND_BASE = { quote: 40, card: 30, contact: 25, promo: 15 };

// "$3,500" out of a quote summary → 3500. Zero when there's no number.
export function leadValue(sub) {
  const m = /\$([\d,]+)/.exec(String(sub.summary || ""));
  return m ? Number(m[1].replace(/,/g, "")) : 0;
}

// What one visitor did on the site (events are the same-day rows that share
// the submission's visitor hash).
export function actionsFor(events) {
  const names = new Set(events.filter((e) => e.type === "event").map((e) => e.name));
  const views = events.filter((e) => e.type === "pageview");
  return {
    pages: views.length,
    sawPricing: views.some((e) => /^\/(quote|weddings|business|pay)/.test(e.path)),
    clickedCall: names.has("book_call_click") || names.has("call_picker_shown"),
    bookedCall: names.has("call_booked"),
    openedCheckout: names.has("book_now_click"),
    savedContact: names.has("card_save_contact"),
    fromQr: events.some((e) => e.utm_source === "qr"),
  };
}

// 0–100. Intent signals add; silence and age subtract.
export function heat(sub, a, ageHours) {
  let s = KIND_BASE[sub.kind] ?? 20;
  if (a.bookedCall) s += 25;
  if (a.openedCheckout) s += 20;
  else if (a.clickedCall) s += 10;
  if (a.pages >= 4) s += 5;
  if (sub.phone) s += 10;
  if (leadValue(sub) >= 2000) s += 5;
  if (ageHours > 24 * 14) s -= 30;
  else if (ageHours > 24 * 7) s -= 20;
  else if (ageHours > 24 * 3) s -= 10;
  return Math.max(0, Math.min(100, Math.round(s)));
}

export function nextMove(sub, a, ageHours) {
  if (sub.status === "booked") return { tone: "good", text: "Booked — send the Welcome Packet" };
  if (sub.status === "lost" || sub.status === "archived") return { tone: "mute", text: "Closed out" };
  if (a.bookedCall) return { tone: "good", text: "Call is on the calendar — prep their Mission Plan" };
  if (a.openedCheckout) return { tone: "hot", text: "Opened checkout, didn't pay — text them now" };
  if (sub.status === "new") {
    if (ageHours >= REPLY_SLA_HOURS) return { tone: "late", text: `Overdue ${Math.floor(ageHours / 24)}d ${Math.round(ageHours % 24)}h — reply now` };
    if (ageHours >= 1) return { tone: "hot", text: `No reply yet (${Math.round(ageHours)}h) — text + call today` };
    return { tone: "hot", text: "Fresh — text them inside 15 minutes" };
  }
  // contacted, no call booked
  const days = Math.floor(ageHours / 24);
  if (days >= 10) return { tone: "mute", text: "Day 10+ — send the close-out email" };
  if (days >= 7) return { tone: "hot", text: "Day 7 — call + text, hold or release the date" };
  if (days >= 4) return { tone: "warm", text: "Day 4 — email a sample that matches their project" };
  if (days >= 2) return { tone: "warm", text: "Day 2 — text to offer a call time" };
  return { tone: "warm", text: "Contacted — get the call booked" };
}

// subs: submissions rows · events: site_events rows · now: ms
export function buildLeadBoard(subs, events, now = Date.now()) {
  const byVisitor = new Map();
  for (const e of events) {
    if (!e.visitor) continue;
    if (!byVisitor.has(e.visitor)) byVisitor.set(e.visitor, []);
    byVisitor.get(e.visitor).push(e);
  }
  // Someone who paid shows up as a separate "booking" row — fold it into their lead.
  const paidEmails = new Set(subs.filter((s) => s.kind === "booking" && s.email).map((s) => s.email));

  return subs
    .filter((s) => s.kind !== "booking" && s.status !== "archived")
    .map((s) => {
      const status = s.email && paidEmails.has(s.email) ? "booked" : s.status;
      const a = actionsFor(s.visitor ? byVisitor.get(s.visitor) || [] : []);
      const ageHours = (now - new Date(s.created_at).getTime()) / HOUR;
      const sub = { ...s, status };
      const open = status === "new" || status === "contacted";
      // updated_at moves when the inbox status changes — a fair stand-in for "first touch".
      const touched = s.status !== "new" && s.updated_at && new Date(s.updated_at) - new Date(s.created_at) > 30000;
      const replyHours = touched ? Math.max(0, (new Date(s.updated_at) - new Date(s.created_at)) / HOUR) : null;
      return {
        id: s.id,
        at: s.created_at,
        name: s.name || s.email || s.phone || "—",
        kind: s.kind,
        status,
        summary: s.summary || "",
        value: leadValue(s),
        ageHours,
        replyHours,
        open,
        overdue: status === "new" && ageHours >= REPLY_SLA_HOURS,
        did: a,
        heat: open ? heat(sub, a, ageHours) : 0,
        next: nextMove(sub, a, ageHours),
      };
    })
    .sort((x, y) => Number(y.open) - Number(x.open) || y.heat - x.heat || new Date(y.at) - new Date(x.at));
}

// People showing buying intent in the last `hours` who never sent a form.
export function hotVisitors(subs, events, now = Date.now(), hours = 48) {
  const known = new Set(subs.map((s) => s.visitor).filter(Boolean));
  const cut = now - hours * HOUR;
  const m = new Map();
  for (const e of events) {
    if (!e.visitor || known.has(e.visitor) || new Date(e.created_at).getTime() < cut) continue;
    const v = m.get(e.visitor) || { visitor: e.visitor, last: e.created_at, rows: [] };
    v.rows.push(e);
    if (new Date(e.created_at) > new Date(v.last)) v.last = e.created_at;
    m.set(e.visitor, v);
  }
  const out = [];
  for (const v of m.values()) {
    const a = actionsFor(v.rows);
    const started = v.rows.some((e) => e.type === "event" && e.name === "quote_started");
    const pricingViews = v.rows.filter((e) => e.type === "pageview" && /^\/(quote|weddings|business|pay)/.test(e.path)).length;
    if (!(a.openedCheckout || started || a.clickedCall || pricingViews >= 3)) continue;
    const first = v.rows[v.rows.length - 1] || {};
    out.push({
      last: v.last,
      where: first.city ? `${first.city}${first.region ? `, ${first.region}` : ""}` : first.country || "",
      device: first.device || "",
      fromQr: a.fromQr,
      did: [
        a.openedCheckout && "opened checkout",
        started && "started a quote",
        a.clickedCall && "tapped book-a-call",
        pricingViews >= 3 && `${pricingViews} pricing views`,
        a.savedContact && "saved your contact",
      ].filter(Boolean),
      score: (a.openedCheckout ? 3 : 0) + (started ? 2 : 0) + (a.clickedCall ? 2 : 0) + (pricingViews >= 3 ? 1 : 0),
    });
  }
  return out.sort((x, y) => y.score - x.score || new Date(y.last) - new Date(x.last)).slice(0, 12);
}

const median = (xs) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

// The predictive bit: pipeline, expected revenue, pace, and plain-English signals.
export function forecast({ board, hot, range, visits, visitsPrev, leadsPrev, events, peakHour }) {
  const closedWon = board.filter((l) => l.status === "booked").length;
  const decided = board.filter((l) => l.status === "booked" || l.status === "lost").length;
  const hasHistory = decided >= 5;
  const closeRate = hasHistory ? closedWon / decided : DEFAULT_CLOSE_RATE;
  const open = board.filter((l) => l.open);
  const pipeline = open.reduce((n, l) => n + l.value, 0);
  // Weight each open lead by how hot it is relative to an average (50) lead.
  const expected = open.reduce((n, l) => n + l.value * Math.min(0.9, closeRate * (l.heat / 50)), 0);
  const overdue = board.filter((l) => l.overdue);
  const abandoned = open.filter((l) => l.did.openedCheckout);
  const leads = board.length;
  const leadsPer30 = range ? (leads / range) * 30 : 0;
  const replyMed = median(board.map((l) => l.replyHours).filter((h) => h !== null));
  const count = (name) => events.filter((e) => e.type === "event" && e.name === name).length;
  const pickerShown = count("call_picker_shown");
  const callsBooked = count("call_booked");
  const checkoutOpens = count("book_now_click");

  const signals = [];
  const add = (tone, text) => signals.push({ tone, text });
  if (overdue.length) add("late", `${overdue.length} lead${overdue.length > 1 ? "s have" : " has"} waited over ${REPLY_SLA_HOURS} hours with no reply: ${overdue.slice(0, 3).map((l) => l.name).join(", ")}${overdue.length > 3 ? "…" : ""}. Reply to these first.`);
  if (abandoned.length) add("hot", `${abandoned.length} lead${abandoned.length > 1 ? "s" : ""} opened checkout and stopped: ${abandoned.slice(0, 3).map((l) => l.name).join(", ")}. A text today is the highest-odds close on this page.`);
  if (hot.length) add("warm", `${hot.length} anonymous visitor${hot.length > 1 ? "s" : ""} showed buying intent in the last 48 hours without sending a form. You can't contact them, but it's real demand — a post or a promo this week gives them a reason to come back.`);
  if (range > 1 && leadsPrev !== null) {
    if (leads > leadsPrev) add("good", `Leads are up: ${leads} in this window vs ${leadsPrev} in the one before.`);
    else if (leads < leadsPrev) add("late", `Leads are down: ${leads} in this window vs ${leadsPrev} in the one before.${visitsPrev !== null && visits >= visitsPrev ? " Traffic held, so the site is converting worse — check the quote flow." : " Traffic dropped too — this is a reach problem, not a site problem."}`);
  }
  if (pickerShown >= 3) add(callsBooked / pickerShown >= 0.3 ? "good" : "warm", `${callsBooked} of ${pickerShown} people who saw the call picker booked a call (${Math.round((callsBooked / pickerShown) * 100)}%).`);
  if (replyMed !== null) add(replyMed <= 1 ? "good" : replyMed <= REPLY_SLA_HOURS ? "warm" : "late", `Your typical time to first touch is about ${replyMed < 1 ? `${Math.round(replyMed * 60)} minutes` : `${replyMed.toFixed(1)} hours`}. Target: 15 minutes.`);
  if (open.length && pipeline === 0) add("warm", `${open.length} open lead${open.length > 1 ? "s" : ""} with no quoted price yet — get ${open.length > 1 ? "them" : "them"} on a call to put a number on it.`);
  else if (open.length) add("warm", `${open.length} open lead${open.length > 1 ? "s" : ""} worth $${Math.round(pipeline).toLocaleString("en-US")}. At ${hasHistory ? "your" : "an assumed"} ${Math.round(closeRate * 100)}% close rate, weighted by how hot each one is, expect about $${Math.round(expected).toLocaleString("en-US")} of it to book.`);
  if (range >= 7 && leads >= 5) add("warm", `At this pace you'll see about ${Math.round(leadsPer30)} leads and ${Math.max(0, Math.round(leadsPer30 * closeRate))} booking${Math.round(leadsPer30 * closeRate) === 1 ? "" : "s"} per 30 days.`);
  if (peakHour !== null && visits >= 20) add("warm", `Most visitors show up around ${peakHour === 0 ? "12am" : peakHour < 12 ? `${peakHour}am` : peakHour === 12 ? "12pm" : `${peakHour - 12}pm`}. Keep your phone on you then — that's when a 15-minute reply is easiest to hit.`);
  if (!signals.length) add("mute", "Quiet window — nothing needs you right now.");

  return {
    closeRate, hasHistory, pipeline, expected, leadsPer30,
    overdue: overdue.length, open: open.length, abandoned: abandoned.length,
    replyMed, pickerShown, callsBooked, checkoutOpens, signals,
  };
}
