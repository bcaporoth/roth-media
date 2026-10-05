// Discounts — applied on the site, not in Stripe, so the quote, the cart,
// and checkout always show the same number. One deal per booking: the
// biggest one that applies wins (no stacking). auto deals need no code.
// Deals cover shoots and shoot add-ons, never noDeal add-ons (travel, web,
// ads), and land on a round $10.
// Plain module: the quote flow (client) and checkout (server) both read it.

export const DEALS = [
  // Nicole's business (FWF): 50% off business packages anywhere on the site.
  // Her monthly partner plan uses the same code at /partner/nicole.
  { id: "goldendeal50", code: "GOLDENDEAL50", label: "Golden deal", pct: 50, only: { business: ["day", "mini", "event"] } },
];

// Freebies: one named add-on included at $0. Not percentages — the list price
// never moves — so they stack with any code deal. Three ways to earn one:
//   auto    — live until `ends` (the launch bonus: book by October 31)
//   payFull — a wedding paid in full at booking instead of the 50% retainer
//   code    — typed in the promo box (GUEST), for when Brandon wants to give
//             one couple something
// All three currently include the same add-on (the guest library).
export const FREEBIES = [
  { id: "launch", label: "Booked by October 31", addon: "guest", auto: true, ends: "2026-10-31T23:59:59-04:00", endsLabel: "October 31", only: { wedding: ["photo", "film"] } },
  { id: "paidfull", label: "Paid in full", addon: "guest", payFull: true, only: { wedding: ["photo", "film"] } },
  { id: "guest", code: "GUEST", label: "Guest library on us", addon: "guest", only: { wedding: ["photo", "film"] } },
];

// The freebie that applies, or null. A typed code wins (so the cart can say
// the code took), then paid-in-full, then the live auto bonus.
export function freebie({ code = "", category, packageId, payFull = false, now = Date.now() } = {}) {
  const c = String(code || "").trim().toUpperCase();
  const ok = (f) => fits(f, category, packageId) && (!f.ends || now <= Date.parse(f.ends));
  return (
    (c && FREEBIES.find((f) => f.code === c && ok(f))) ||
    (payFull && FREEBIES.find((f) => f.payFull && ok(f))) ||
    FREEBIES.find((f) => f.auto && ok(f)) ||
    null
  );
}
export const isFreebieCode = (code) => FREEBIES.some((f) => f.code === String(code || "").trim().toUpperCase());
// The live deadline bonus, for banners ("Book by October 31: …").
export const autoBonus = (now = Date.now()) => FREEBIES.find((f) => f.auto && (!f.ends || now <= Date.parse(f.ends))) || null;

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
// The same, but only if it covers this package (a business page asks for "business", "day").
export const autoDealFor = (category, packageId, now = Date.now()) =>
  DEALS.find((d) => d.auto && live(d, now) && fits(d, category, packageId)) || null;

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
