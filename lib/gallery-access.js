// Galleries stay online 12 months after delivery (Terms → Client galleries,
// Content Day agreement). "Delivery" = the day the "It's ready" email went out;
// galleries never sent that way count from the day they were made.
// Nothing closes a gallery automatically — this only tells the client the date.

export const ACCESS_MONTHS = 12;

export function onlineUntil(gallery) {
  const from = gallery?.ready_sent_at || gallery?.created_at;
  if (!from) return null;
  const d = new Date(from);
  if (Number.isNaN(d.getTime())) return null;
  d.setMonth(d.getMonth() + ACCESS_MONTHS);
  return d;
}

const fmt = (d) =>
  d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/New_York" });

// One short line for the gallery hero, or null when there's no date.
export function onlineUntilText(gallery, now = Date.now()) {
  const d = onlineUntil(gallery);
  if (!d) return null;
  return d.getTime() > now
    ? `Online until ${fmt(d)} · download to keep forever`
    : "Past its year online · download what you want to keep";
}
