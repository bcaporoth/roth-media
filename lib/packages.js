// ── The one source of truth for packages, prices, and add-ons. ──
// Used by the quote flow AND the /weddings and /business landing pages —
// change a number here and it changes everywhere. Plain module on purpose:
// server pages can't import data from client components (Vercel build).

export const CATEGORIES = [
  { id: "wedding", title: "A wedding or engagement", desc: "Your day, told the way it felt — full photo coverage, or a cinematic film with your real vows." },
  { id: "business", title: "My business", desc: "A Content Day at your place — a promo that brings customers through the door." },
];

// get: what the client walks away with — plain words, no jargon.
export const PACKAGES = {
  wedding: [
    { id: "photo", name: "Wedding Photography", price: 2500, scope: "Full day · photo coverage", get: ["300–500 edited photos — getting ready to last dance", "Sneak peeks within 48 hours, ready to share", "Full gallery with print rights", "Delivered in your own private online gallery — save straight to your phone"], includes: [] },
    { id: "film", name: "Wedding Videography", price: 3500, scope: "Full day · film coverage", popular: true, get: ["Two 60–120 second reels of your day, sized for Instagram and TikTok", "Your full ceremony, filmed and delivered — every word, every vow", "Speeches and toasts, filmed and delivered", "A sneak peek video within 48 hours — post it while everyone's still talking about it"], includes: [] },
  ],
  business: [
    { id: "day", name: "Content Day", price: 750, scope: "One shoot day · typically a half day", get: ["A 60–90 second promo for anything you want to promote — a dish, an offer, a job well done", "Shot at your place — your people, your work, not stock footage", "Sized for your website, Instagram, Facebook, and TikTok", "One round of revisions", "Delivered within two weeks, ready to post"], includes: [] },
  ],
};

// Add-ons, hidden when the package already includes them.
export const ADDONS = {
  wedding: [
    { id: "second", name: "Second shooter", price: 500, get: "Two angles all day, both of you getting ready" },
    { id: "engagement", name: "Engagement film", price: 450, get: "A short cinematic session of the two of you — for save-the-dates and your wedding website" },
    { id: "rehearsal", name: "Rehearsal dinner coverage", price: 400, get: "The night before, filmed — the toasts, the nerves, everyone arriving" },
    { id: "reels", name: "More reels", price: 300, get: "Three extra vertical cuts of your favorite moments" },
    { id: "raw", name: "Every raw moment", price: 300, get: "All the unedited footage from your day, delivered in full — nothing left behind" },
  ],
  business: [
    { id: "promo2", name: "Second promo", price: 400, get: "Another 60–90 second promo cut from the same shoot — a different offer, dish, or audience" },
    { id: "reels", name: "More reels", price: 300, get: "Three vertical reels cut from the same shoot — sized for Instagram, TikTok, and Facebook" },
    { id: "photos", name: "Brand photo session", price: 650, get: "A dedicated 2-hour photo visit on its own day — 30 edited photos, licensed for web and social" },
    { id: "website", name: "Need a website?", price: 2000, from: true, get: "A full site built from your Content Day — the video, the photos, the words. We scope it together on a call." },
  ],
};

export const DETAIL = {
  wedding: { date: "Your date", where: "Venue (or town if you're still deciding)" },
  business: { date: "When would you like to shoot?", where: "Business name and location" },
};

export const money = (n) => `$${n.toLocaleString("en-US")}`;
