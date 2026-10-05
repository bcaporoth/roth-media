// Give $100, get $100 — the rules, as pure functions (the quote flow in the
// browser reads these too; the database side is lib/referrals.js).
//
//   FRIEND-<FIRST>-<4>  a booked client's own code to hand out. A friend who
//                       books with it gets $100 off; the client gets $100 —
//                       off their balance if one is open, otherwise as a
//                       THANKS credit for their next shoot.
//   THANKS-<5>          that credit. One use, only by the person it was issued to.
//
// Works on weddings and business packages (anything $600 and up), not on a
// $300 portrait. Codes never apply to your own booking.
export const REFERRAL_AMOUNT = 100;
export const REFERRAL_MIN_PRICE = 600;

const norm = (c) => String(c || "").trim().toUpperCase();
export const isReferralCode = (c) => /^FRIEND-[A-Z0-9]{1,12}-[A-Z0-9]{4}$/.test(norm(c));
export const isCreditCode = (c) => /^THANKS-[A-Z0-9]{5}$/.test(norm(c));
export const isFriendCode = (c) => isReferralCode(c) || isCreditCode(c);
export const referralEligible = (pkg) => Boolean(pkg && pkg.price >= REFERRAL_MIN_PRICE);
export const referralLink = (code) => `https://rothmediaco.com/quote?ref=${encodeURIComponent(norm(code))}`;
export const referralText = (code) =>
  `Brandon at Roth Media filmed/photographed for us — if you're planning a wedding or need content for your business, use my code ${norm(code)} and you get $100 off: ${referralLink(code)}`;
