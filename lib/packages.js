// ── The one source of truth for packages, prices, and add-ons. ──
// Used by the quote flow AND the /weddings and /business landing pages —
// change a number here and it changes everywhere. Plain module on purpose:
// server pages can't import data from client components (Vercel build).

export const CATEGORIES = [
  { id: "wedding", title: "A wedding or engagement", desc: "A cinematic film of your day — from the proposal to the last dance, with photos if you want them." },
  { id: "business", title: "My business", desc: "Branded content — a brand video and reels that bring customers through the door." },
];

// get: what the client walks away with — plain words, no jargon.
export const PACKAGES = {
  wedding: [
    { id: "ceremony", name: "Ceremony Only", price: 1500, scope: "4 hours", get: ["Your full ceremony, filmed and delivered — every word, every vow", "A short highlight cut of the day's best moments", "Speeches and toasts, if they fall within your hours", "Delivered online, ready to share, within 6 weeks"], includes: [] },
    { id: "film", name: "The Wedding Film", price: 3500, scope: "10 hours · everything included", popular: true, get: ["A cinematic highlight film with your real vows and ceremony audio — exactly as long as it should be, never padded", "Your full ceremony, filmed and delivered", "Speeches and toasts, filmed and delivered", "Short vertical reels of your favorite moments, sized for Instagram and TikTok", "A next-day sneak peek to post while everyone's still talking about it", "Delivered online, ready to share, within 6 weeks"], includes: ["reels"] },
  ],
  business: [
    { id: "mini", name: "Mini Content Day", price: 750, scope: "One shoot day · the essentials", get: ["Your promo — a 60–90 second brand video for your website and ads", "3 vertical reels for Instagram, Facebook, and TikTok", "10 edited photos, licensed for web and social", "One round of revisions", "Delivered within two weeks, ready to post"], includes: [] },
    { id: "day", name: "Full Content Day", price: 1500, scope: "One shoot day · the full haul", popular: true, get: ["Your promo — a 60–90 second brand video for your website and ads", "10 vertical reels for Instagram, Facebook, and TikTok", "20–40 edited photos, licensed for web and social", "One round of revisions", "Delivered within two weeks, ready to post"], includes: [] },
    { id: "retainer", name: "Every Other Month", price: 1250, per: "/day", scope: "Six Content Days a year", get: ["A Full Content Day every other month — promo, 10 reels, 20–40 photos each visit", "Your feed never goes quiet", "Billed per shoot, no lump sum", "Priority scheduling"], includes: [] },
  ],
};

// Add-ons, hidden when the package already includes them.
export const ADDONS = {
  wedding: [
    { id: "photo", name: "Add photo coverage", price: 1000, get: "Full edited gallery with print rights, sneak peeks in 72 hours" },
    { id: "second", name: "Second shooter", price: 500, get: "Two angles all day, both of you getting ready" },
    { id: "engagement", name: "Engagement session", price: 350, get: "An hour of photos before the big day — perfect for save-the-dates and your wedding website" },
    { id: "rehearsal", name: "Rehearsal dinner coverage", price: 400, get: "The night before, filmed — the toasts, the nerves, everyone arriving" },
    { id: "reels", name: "Social reels", price: 250, get: "Short vertical cuts of your favorite moments, sized for Instagram and TikTok" },
    { id: "raw", name: "Every raw moment", price: 300, get: "All the unedited footage from your day, delivered in full — nothing left behind" },
  ],
  business: [
    { id: "promo2", name: "Another promo video", price: 400, get: "A second 60–90 second cut from the same shoot — a different offer, season, or audience" },
    { id: "reels", name: "5 more reels", price: 250, get: "Five extra vertical reels on top of what your day includes" },
    { id: "photos", name: "20 more edited photos", price: 250, get: "Double the gallery, licensed for web and social" },
    { id: "website", name: "Need a website?", price: 2000, from: true, get: "A full site built from your Content Day — the video, the photos, the words. We scope it together on a call." },
  ],
};

export const DETAIL = {
  wedding: { date: "Your date", where: "Venue (or town if you're still deciding)" },
  business: { date: "When would you like to shoot?", where: "Business name and location" },
};

export const money = (n) => `$${n.toLocaleString("en-US")}`;
