// After delivery — the chain that turns one finished album into the next
// booking: It's ready → ask for a review → send the friend code → a year
// on, "book next year". Nothing here emails a client. It works out what is
// due, and gives Brandon the words (his approved pitch copy) and a stamp.

const DAY = 86400000;
export const REVIEW_AFTER_DAYS = 3;     // ask once they've had a few days with the album
export const REFERRAL_AFTER_DAYS = 10;  // friend code after the review ask has had time
export const REBOOK_AFTER_DAYS = 300;   // "book next year" ~10 months on

export const STEPS = [
  { key: "ready", label: "Sent", at: "ready_sent_at" },
  { key: "review", label: "Review asked", at: "review_requested_at" },
  { key: "referral", label: "Friend code sent", at: "referral_sent_at" },
  { key: "rebook", label: "Rebook nudge", at: "rebook_nudged_at" },
];

// What's due on one gallery, given today. `g` needs ready_sent_at,
// review_requested_at, referral_sent_at, rebook_nudged_at, event_date.
export function dueFor(g, now = Date.now()) {
  if (!g?.ready_sent_at) return null;
  const since = (iso) => (iso ? (now - new Date(iso).getTime()) / DAY : null);
  const ready = since(g.ready_sent_at);
  if (!g.review_requested_at && ready >= REVIEW_AFTER_DAYS) return { step: "review", days: Math.floor(ready) };
  const reviewAgo = since(g.review_requested_at);
  if (!g.referral_sent_at && ready >= REFERRAL_AFTER_DAYS && (reviewAgo === null || reviewAgo >= 5)) return { step: "referral", days: Math.floor(ready) };
  if (!g.rebook_nudged_at && ready >= REBOOK_AFTER_DAYS) return { step: "rebook", days: Math.floor(ready) };
  return null;
}

export const rebookText = (name, category, eventDate) => {
  const first = String(name || "").split(/\s+/)[0] || "there";
  const when = eventDate ? new Date(eventDate + "T12:00:00").toLocaleDateString("en-US", { month: "long" }) : "last year";
  return category === "business"
    ? `Hi ${first} — it's been about a year since we shot at your place. Dates for ${when} are opening up; want to grab a Content Day before they go? — Brandon`
    : `Hi ${first} — your album from ${when} still gets looked at over here. If there's an anniversary, a family session, or a friend's wedding coming up, I'd love to shoot it. — Brandon`;
};

// Every gallery with something due, for the morning brief and the profile.
export async function afterDeliveryList(db, now = Date.now()) {
  const { data, error } = await db
    .from("galleries")
    .select("id, title, event_date, ready_sent_at, review_requested_at, referral_sent_at, rebook_nudged_at, client_id, clients!client_id(id, name, email, phone, referral_code)")
    .not("ready_sent_at", "is", null)
    .order("ready_sent_at", { ascending: false })
    .limit(300);
  if (error) return []; // columns not there until after-delivery.sql has run
  const out = [];
  for (const g of data || []) {
    const due = dueFor(g, now);
    if (due) out.push({ ...g, client: g.clients, due });
  }
  return out;
}

export function afterDeliveryLine(g) {
  const who = g.client?.name || g.client?.email || "—";
  const base = `https://rothmediaco.com/portal/admin/clients/${g.client_id}#galleries`;
  if (g.due.step === "review") return `${who} — "${g.title}" went out ${g.due.days} days ago, no review ask yet.\nAsk: ${base}`;
  if (g.due.step === "referral") return `${who} — send the $100 friend code (album out ${g.due.days} days).\nSend: ${base}`;
  return `${who} — "${g.title}" was ${g.due.days} days ago. Time for "book next year".\nNudge: ${base}`;
}
