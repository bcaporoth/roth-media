// The client Shop (2026-11-08): their cart + what they can book, priced from
// lib/packages.js. A cart is one submissions row per client (kind "cart",
// utm = { category, packageId, addons }) — no new table. Paying goes through
// the normal /pay/cart link (lib/cart.js), which re-prices everything on the
// server and applies deals, retainers and friend codes.

import { PACKAGES, CATEGORIES, addonsFor, money } from "./packages";
import { TYPE_LABEL } from "./intake";

// Welcome-form services → shop categories (engagement + family = portraits).
const SERVICE_CAT = { wedding: "wedding", engagement: "family", family: "family", business: "business" };
export const SHOP_LABEL = { wedding: "Wedding", family: "Portraits", business: "Business" };

export function shopCategories(services = []) {
  const mine = [...new Set(services.map((s) => SERVICE_CAT[s]).filter(Boolean))];
  return [...mine, ...CATEGORIES.map((c) => c.id).filter((c) => !mine.includes(c))];
}

// Keep only what really exists: a package in that category and add-ons it can take.
export function cleanCart(c = {}) {
  const category = PACKAGES[c.category] ? c.category : "";
  if (!category) return { category: "", packageId: "", addons: [] };
  const pkg = PACKAGES[category].find((p) => p.id === c.packageId) || null;
  const allowed = pkg ? addonsFor(category, pkg) : shopAddons(category, null);
  const addons = [...new Set((c.addons || []).map(String))].filter((id) => allowed.some((a) => a.id === id));
  return { category, packageId: pkg ? pkg.id : "", addons };
}

// Add-ons to show: the package's (when one is picked), else the listed menu.
export function shopAddons(category, pkg) {
  const PK = PACKAGES[category] || [];
  const all = pkg ? addonsFor(category, pkg) : PK.length ? addonsFor(category, { id: "", includes: [] }) : [];
  return all.filter((a) => !a.hidden && (pkg ? true : !a.alt) && (!a.only || !pkg || a.only.includes(pkg.id)));
}

export function cartTotals(cart) {
  const pkg = (PACKAGES[cart.category] || []).find((p) => p.id === cart.packageId) || null;
  const list = shopAddons(cart.category, pkg).filter((a) => cart.addons.includes(a.id));
  const once = (pkg?.price || 0) + list.reduce((n, a) => n + (a.price || 0), 0);
  const monthly = list.reduce((n, a) => n + (a.monthly || 0), 0);
  return { pkg, list, once, monthly };
}

// One readable line per item, for Studio and the alert emails.
export function cartLines(cart) {
  const { pkg, list, once, monthly } = cartTotals(cart);
  const lines = [];
  if (pkg) lines.push([pkg.name, money(pkg.price)]);
  for (const a of list) lines.push([a.name, a.price === 0 ? "free" : `${money(a.price)}${a.monthly ? ` + ${money(a.monthly)}/mo` : ""}`]);
  if (lines.length) lines.push(["Total (before any deals)", `${money(once)}${monthly ? ` + ${money(monthly)}/mo` : ""}`]);
  return lines;
}

// First visit: start the cart from what they picked in their brief.
export function seedCart({ services = [], briefs = {} } = {}) {
  const category = shopCategories(services)[0] || "";
  const typeForCat = Object.entries(SERVICE_CAT).filter(([, c]) => c === category).map(([t]) => t);
  const answer = typeForCat.map((t) => briefs[t]?.answers?.["Add-ons you're interested in"] || "").join(" ");
  const addons = shopAddons(category, null).filter((a) => answer.includes(a.name)).map((a) => a.id);
  return cleanCart({ category, packageId: "", addons });
}

export const serviceLabel = (t) => TYPE_LABEL[t] || t;
