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
    body: "Someone you know is planning her wedding right now. Send her your code: she gets $100 off her film or photos, and you get $100 back — off your balance if you still have one, otherwise toward your next shoot. Every bride you send, same deal.",
    button: "Text a bride",
    text: (code) => `Our wedding videographer/photographer was Brandon at Roth Media and he was unreal. If you book him, use my code ${norm(code)} — you get $100 off: ${referralLink(code, "wedding")}`,
  };
  if (category === "business") return {
    kick: "Know another owner?",
    title: "Send them $100.",
    body: "A friend with a shop, a gym, a restaurant — send them your code. They get $100 off their Content Day, and you get $100 back toward your next one. Every owner you send, same deal.",
    button: "Text an owner",
    text: (code) => `Brandon at Roth Media shot our content and it's been great for business. If you book a Content Day, use my code ${norm(code)} — you get $100 off: ${referralLink(code, "business")}`,
  };
  return {
    kick: "Know someone getting married?",
    title: "Send them $100.",
    body: "Send your code to anyone planning a wedding or running a business. They get $100 off, and you get $100 back toward your next shoot. As many friends as you like.",
    button: "Text a friend",
    text: (code) => `Brandon at Roth Media photographed us and he was unreal. If you book him for a wedding or your business, use my code ${norm(code)} — you get $100 off: ${referralLink(code)}`,
  };
}
export const referralText = (code, category = "") => referralPitch(category).text(code);
