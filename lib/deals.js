// Discounts — applied on the site, not in Stripe, so the quote, the cart,
// and checkout always show the same number. One deal per booking: the
// biggest one that applies wins (no stacking). auto deals need no code.
// Plain module: the quote flow (client) and checkout (server) both read it.

import { CAMPAIGN } from "./campaign";

export const DEALS = [
  { id: "launch", label: "Launch special", pct: 33, auto: true, ends: "2026-10-31T23:59:59-04:00", endsLabel: "October 31" },
  { id: "spooky", code: "SPOOKY", label: "Spooky October", pct: 10, starts: "2026-10-01T00:00:00-04:00", ends: "2026-10-31T23:59:59-04:00", endsLabel: "October 31" },
  // /weddings/open-dates campaign — Wedding Videography only.
  ...[CAMPAIGN.thisYear, CAMPAIGN.nextYear].map((c) => ({
    id: c.code.toLowerCase(), code: c.code, label: c.code, pct: c.percent, only: { wedding: ["film"] },
    ends: CAMPAIGN.endsAt, endsLabel: CAMPAIGN.endsLabel, off: !CAMPAIGN.active,
  })),
];

const live = (d, now) =>
  !d.off && (!d.starts || now >= Date.parse(d.starts)) && (!d.ends || now <= Date.parse(d.ends));

const fits = (d, category, packageId) =>
  !d.only || (d.only[category] || []).includes(packageId);

export const codeDeal = (code, now = Date.now()) => {
  const c = String(code || "").trim().toUpperCase();
  return (c && DEALS.find((d) => d.code === c && live(d, now))) || null;
};

// The site-wide deal running right now (for banners and strike-through prices).
export const autoDeal = (now = Date.now()) => DEALS.find((d) => d.auto && live(d, now)) || null;

export function bestDeal({ category, packageId, code = "", now = Date.now() }) {
  const c = String(code || "").trim().toUpperCase();
  return DEALS
    .filter((d) => live(d, now) && fits(d, category, packageId) && (d.auto || (c && d.code === c)))
    .sort((a, b) => b.pct - a.pct)[0] || null;
}

export const applyDeal = (n, deal) => (deal ? Math.round(n * (1 - deal.pct / 100)) : n);
