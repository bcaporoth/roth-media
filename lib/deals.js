// Discounts — applied on the site, not in Stripe, so the quote, the cart,
// and checkout always show the same number. One deal per booking: the
// biggest one that applies wins (no stacking). auto deals need no code.
// Deals cover shoots and shoot add-ons, never noDeal add-ons (travel, web,
// ads), and land on a round $10.
// Plain module: the quote flow (client) and checkout (server) both read it.

import { CAMPAIGN } from "./campaign";

export const DEALS = [
  { id: "launch", label: "Launch special", pct: 33, auto: true, ends: "2026-10-31T23:59:59-04:00", endsLabel: "October 31" },
  // Nicole's business (FWF): 50% off business packages anywhere on the site.
  // Her monthly partner plan uses the same code at /partner/nicole.
  { id: "goldendeal50", code: "GOLDENDEAL50", label: "Golden deal", pct: 50, only: { business: ["day", "mini", "event"] } },
  // /weddings/open-dates campaign — Wedding Videography only.
  ...[CAMPAIGN.thisYear, CAMPAIGN.nextYear].map((c) => ({
    id: c.code.toLowerCase(), code: c.code, label: c.code, pct: c.percent, only: { wedding: ["film"] },
    starts: CAMPAIGN.startsAt, startsLabel: CAMPAIGN.startsLabel, ends: CAMPAIGN.endsAt, endsLabel: CAMPAIGN.endsLabel, off: !CAMPAIGN.active,
  })),
];

// Free add-on codes: one named add-on at $0. These STACK with whatever deal is
// running (a couple typing GUEST during the launch keeps the 33% too) — they
// aren't a percentage, so "one deal per booking" doesn't apply to them.
export const FREEBIES = [
  { id: "guest", code: "GUEST", label: "Guest library on us", addon: "guest", only: { wedding: ["photo", "film"] } },
];

// The freebie a code unlocks for this package, or null.
export const freebie = (code, { category, packageId } = {}) => {
  const c = String(code || "").trim().toUpperCase();
  return (c && FREEBIES.find((f) => f.code === c && fits(f, category, packageId))) || null;
};
export const isFreebieCode = (code) => FREEBIES.some((f) => f.code === String(code || "").trim().toUpperCase());

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

export const applyDeal = (n, deal) => (deal ? Math.round((n * (1 - deal.pct / 100)) / 10) * 10 : n);

// A real code that just isn't open yet (for "starts November 1" messages).
export const upcomingCode = (code, now = Date.now()) => {
  const c = String(code || "").trim().toUpperCase();
  return (c && DEALS.find((d) => d.code === c && !d.off && d.starts && now < Date.parse(d.starts))) || null;
};

// items: the package + chosen add-ons. The deal only touches the ones it covers;
// a freebie (lib FREEBIES) zeroes its add-on first.
export function dealTotal(items, deal, free = null) {
  const priced = items.map((i) => (free && i.id === free.addon ? { ...i, price: 0 } : i));
  const on = priced.filter((i) => !i.noDeal).reduce((s, i) => s + i.price, 0);
  const off = priced.filter((i) => i.noDeal).reduce((s, i) => s + i.price, 0);
  return applyDeal(on, deal) + off;
}
