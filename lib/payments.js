// Stripe Payment Links — made in the Stripe dashboard (Payment Links →
// New), pasted here. A blank link hides its Pay button and falls back to
// "Get a quote", so the page is always safe to ship.
import { PACKAGES, CATEGORIES } from "./packages";

export const RETAINER_RATE = 0.5; // matches /terms: 50% holds the date

// Keyed by `${category}.${packageId}` from lib/packages.js.
export const RETAINER_LINKS = {
  "wedding.photo": "",
  "wedding.film": "",
  "business.day": "",
  "family.portraits": "",
};

// "Customer chooses what to pay" link — balances, invoices, add-ons.
export const OPEN_AMOUNT_LINK = "";

export function payablePackages() {
  return CATEGORIES.flatMap((c) =>
    (PACKAGES[c.id] || []).map((p) => ({
      key: `${c.id}.${p.id}`,
      category: c.id,
      name: p.name,
      scope: p.scope,
      price: p.price,
      retainer: Math.round(p.price * RETAINER_RATE),
      link: RETAINER_LINKS[`${c.id}.${p.id}`] || "",
    }))
  );
}
