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
export const referralLink = (code, category = "") => `https://rothmediaco.com/quote?${category ? `for=${category}&` : ""}ref=${encodeURIComponent(norm(code))}`;

// The pitch, aimed at who they actually know: a bride talks to brides, an
// owner to owners. category = the booking they just made.
export function referralPitch(category = "") {
  if (category === "wedding") return {
    kick: "Know another bride?",
    title: "Send her $100.",
    body: "Someone you know is planning her wedding right now. Send her your link: the $100 off is built in, nothing for her to type. You get $100 back — off your balance if you still have one, otherwise toward your next shoot. Every bride you send, same deal.",
    button: "Text a bride",
    text: (code) => `Brandon at Roth Media did our wedding. Here's $100 off if you book him — just use this link: ${referralLink(code, "wedding")}`,
  };
  if (category === "business") return {
    kick: "Know another owner?",
    title: "Send them $100.",
    body: "A friend with a shop, a gym, a restaurant — send them your link. The $100 off their Content Day is built in, nothing to type. You get $100 back toward your next one. Every owner you send, same deal.",
    button: "Text an owner",
    text: (code) => `Brandon at Roth Media shot our content. Here's $100 off a Content Day if you book him — just use this link: ${referralLink(code, "business")}`,
  };
  return {
    kick: "Know someone getting married?",
    title: "Send them $100.",
    body: "Send your link to anyone planning a wedding or running a business. The $100 off is built in, nothing to type. You get $100 back toward your next shoot. As many friends as you like.",
    button: "Text a friend",
    text: (code) => `Brandon at Roth Media photographed us. Here's $100 off if you book him for a wedding or your business — just use this link: ${referralLink(code)}`,
  };
}
export const referralText = (code, category = "") => referralPitch(category).text(code);
