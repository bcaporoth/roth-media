// Partner deals: a standing discount on a monthly plan, signed and paid
// online at /partner/<slug>. List prices come from lib/packages.js so a
// price change there flows here. Add a partner = add one line to PARTNERS.

import { PACKAGES, ADDONS } from "./packages";

// lead: the page her ads send people to (/go/<slug>). Every line is hers
// to approve (agreement §4) — edit freely.
export const PARTNERS = {
  nicole: {
    first: "Nicole", pct: 50, since: "October 2026",
    lead: {
      brand: "Zumba with Nicole",
      headline: "Dance it out with Nicole.",
      sub: "High-energy Zumba classes, every level welcome. Leave your info and we’ll text you this week’s class times and how to try your first class.",
      video: "/reels/nicole-golden-zumba-promo.mp4",
      poster: "/reels/nicole-golden-zumba-promo-poster.jpg",
      textScript: (fn) => `Hey ${fn}! This is Brandon, I help Nicole with her Zumba classes. Saw you wanted class info. Want me to send this week's times? What days usually work for you?`,
    },
  },
};

// Bump when the agreement text changes; it's saved with each signature.
export const AGREEMENT_VERSION = "partner-2026-10-02b"; // b: party is Roth Ventures NY LLC (no DBA); live report

const pkg = (cat, id) => PACKAGES[cat].find((p) => p.id === id);
const addon = (cat, id) => ADDONS[cat].find((a) => a.id === id);
const day = pkg("business", "day");
const mini = pkg("business", "mini");
const event = pkg("business", "event");
const raw = addon("business", "raw");
const ads = addon("business", "ads");
const web = addon("business", "website");

// monthly / once: list prices; the partner pays them minus pct.
export const CONTENT_PLANS = [
  { id: "full", name: "Full Content Day, monthly", monthly: day.price, get: "One 45–90 second promo video, 8 vertical reels, and 15–30 edited photos every month." },
  { id: "mini", name: "Mini Content Day, monthly", monthly: mini.price, get: "8 vertical reels and 10–20 edited photos every month, no promo video." },
  { id: "full2", name: "Full Content Day, every other month", monthly: day.price / 2, get: "The full package on a lighter schedule: one shoot every two months, billed in equal monthly payments." },
];

export const PARTNER_ADDONS = [
  { id: "ads", name: "Facebook & Instagram ads", monthly: ads.price, get: "Ads built from your content, a lead form, weekly tuning, and a monthly report. Your ad budget goes to Meta directly; $200 a month is the recommended start." },
  { id: "raw", name: "All the raw footage", monthly: raw.price, get: "Every unedited clip and photo from each shoot, in your own gallery." },
  { id: "web", name: "A website", once: web.price, monthly: web.monthly, get: "A full site built from your content, then hosting and upkeep each month." },
];

// Booked when needed, charged from Studio — not part of signup.
export const PARTNER_EXTRAS = [
  { id: "event", name: "Event Coverage", once: event.price, get: "Up to 3 hours, a 45–90 second highlight video, and 50+ edited photos." },
];

export const CLOSING = [
  { id: "percent", name: "Pay per new customer", get: "10% of what each new customer signs up for (a membership counts its first 3 months), at least $25 each. No new customers, no fee." },
  { id: "hourly", name: "Pay by the hour", get: "$30 per hour of follow-up, logged by Roth Ventures." },
  { id: "none", name: "No follow-up", get: "Leads go straight to you and you handle them." },
];

export const partnerPrice = (list, pct) => Math.round(list * (1 - pct / 100));

// Choices → what Stripe charges. Null when the plan is missing or unknown.
export function partnerQuote(slug, { content, addons = [], closing = "none" } = {}) {
  const partner = PARTNERS[slug];
  const plan = CONTENT_PLANS.find((p) => p.id === content);
  if (!partner || !plan || !CLOSING.some((c) => c.id === closing)) return null;
  const picked = PARTNER_ADDONS.filter((a) => addons.includes(a.id));
  const lines = [plan, ...picked].flatMap((i) => [
    ...(i.monthly ? [{ name: i.id === "web" ? "Website hosting & upkeep" : i.name, list: i.monthly, price: partnerPrice(i.monthly, partner.pct), monthly: true }] : []),
    ...(i.once ? [{ name: i.id === "web" ? "Website build" : i.name, list: i.once, price: partnerPrice(i.once, partner.pct), monthly: false }] : []),
  ]);
  const monthly = lines.filter((l) => l.monthly).reduce((s, l) => s + l.price, 0);
  const once = lines.filter((l) => !l.monthly).reduce((s, l) => s + l.price, 0);
  return { partner, slug, plan, picked, closing, lines, monthly, once, today: monthly + once };
}
