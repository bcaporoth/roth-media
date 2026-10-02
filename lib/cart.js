// A saved cart is just a link: the package + add-ons ride in the URL and
// every price is looked up fresh from lib/packages.js on the server, so a
// link can't be edited into a discount (a code only counts if it's live in
// lib/deals.js). pay = "" (retainer for weddings, full for everything else)
// or "balance" (what's left on their retainer booking).

export function cartUrl({ category, packageId, addons = [], name = "", email = "", phone = "", pay = "", code = "" }) {
  const q = new URLSearchParams({ c: category, p: packageId });
  if (addons.length) q.set("a", addons.join(","));
  if (name) q.set("n", name);
  if (email) q.set("e", email);
  if (phone) q.set("t", phone);
  if (pay) q.set("pay", pay);
  if (code) q.set("code", code);
  return `https://rothmediaco.com/pay/cart?${q.toString()}`;
}
