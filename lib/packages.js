// ── The one source of truth for packages, prices, and add-ons. ──
// Used by the quote flow AND the /weddings and /business landing pages —
// change a number here and it changes everywhere. Plain module on purpose:
// server pages can't import data from client components (Vercel build).
// Discounts live in lib/deals.js.

// Category ids are stored on leads and bookings — "family" now means every
// portrait session (engagement, senior, family), but the id stays.
export const CATEGORIES = [
  { id: "wedding", title: "A wedding", desc: "Your day, told the way it felt — full photo coverage, or custom films with your real vows." },
  { id: "business", title: "My business or an event", desc: "A Content Day at your place — promos, reels, and photos that bring customers through the door. Or your event, covered." },
  { id: "family", title: "Portraits", desc: "Engagements, seniors, families — an hour with your people and photos you'll actually frame." },
];

const LIBRARY = "Your own client account — a year of access to your full library, unlimited downloads";

// get: what the client walks away with — plain words, no jargon.
// intake: extra questions on the quote form for that package (answers land
// on the lead and the booking).
export const PACKAGES = {
  wedding: [
    { id: "photo", name: "Wedding Photography", price: 2500, scope: "Full day · photo coverage", get: ["200–400 fully edited photos — getting ready to last dance", "A sneak peek gallery within 48 hours — 10–20 photos, ready to share", LIBRARY], includes: [] },
    {
      id: "film", name: "Wedding Videography", price: 3500, scope: "Full day · film coverage", popular: true,
      get: ["Two short & sweet films (1–3 minutes each), custom made from your day", "Your full ceremony and the speeches, with clean audio", "A sneak peek within 48 hours", LIBRARY],
      includes: [],
      intake: [
        { id: "ceremony", label: "Ceremony — where and what time?", placeholder: "St. Mary's, Corning · 2:00 PM" },
        { id: "reception", label: "Reception — where, if it's somewhere else?", placeholder: "The Pines · 5:00 PM" },
        { id: "speeches", label: "Who's giving speeches?", placeholder: "Best man, maid of honor, her dad" },
        { id: "moments", label: "Moments or songs that have to be in the film", placeholder: "First look, the sparkler exit, our first dance song" },
      ],
    },
  ],
  business: [
    { id: "day", name: "Full Content Day", price: 1100, scope: "One shoot day at your place", popular: true, get: ["One 45–90 second promo for anything you want to promote — a dish, an offer, a job well done", "8 vertical reels, sized for Instagram, Facebook, and TikTok", "15–30 edited photos", "Your people, your work — not stock footage"], includes: [] },
    { id: "mini", name: "Mini Content Day", price: 600, scope: "A shorter shoot · reels + photos, no promo", get: ["8 vertical reels, sized for Instagram, Facebook, and TikTok", "10–20 edited photos", "Your people, your work — not stock footage"], includes: [] },
    { id: "event", name: "Event Coverage", price: 850, scope: "Up to 3 hours of coverage", get: ["A 45–90 second highlight short", "A gallery of 50+ edited photos", "Sized for your website and socials"], includes: [] },
  ],
  family: [
    {
      id: "portraits", name: "Portrait Session", price: 300, scope: "One hour · one location", get: ["Engagements, seniors, families — whatever you're celebrating", "30+ edited photos", "Sneak peeks within 48 hours, ready to share", LIBRARY], includes: [],
      intake: [
        { id: "type", label: "What kind of session?", options: ["Engagement", "Senior photos", "Family", "Couple", "Something else"] },
        { id: "who", label: "Who's in the photos?", placeholder: "Two of us + our dog · or 4 adults, 3 kids (ages 2–9)" },
        { id: "spot", label: "Location ideas", placeholder: "The lake, a park, our backyard — or suggest one" },
        { id: "vibe", label: "The vibe, and any must-have shots", placeholder: "Golden hour, relaxed, one of just the kids" },
      ],
    },
  ],
};

// Add-ons, hidden when the package already includes them.
// monthly: an ongoing fee after the one-time price (billed separately, not at checkout).
// noDeal: launch specials and codes skip it (real costs, not shoot time).
// hidden: not offered in the quote builder — Brandon adds it to a cart link (&a=…).
export const ADDONS = {
  wedding: [
    { id: "second", name: "Second shooter", price: 750, get: "Two angles all day, both of you getting ready" },
    { id: "guest", name: "Guest photos & video messages", price: 250, get: "A QR card on every table — guests scan and send their phone photos, videos, and 60-second messages straight to your private gallery. No app." },
    // Free with any wedding: book both at once and the engagement session is on the house (was $333).
    { id: "engagement", name: "Engagement session", price: 0, was: 333, get: "Free with your wedding — stack your engagement photos onto the day, for save-the-dates and your wedding website" },
    { id: "overnight", name: "Overnight travel", price: 1000, noDeal: true, hidden: true, get: "For weddings 3+ hours away or that need a hotel — covers the drive and lodging, flat" },
  ],
  business: [
    { id: "raw", name: "All the raw footage", price: 200, get: "Every unedited clip and photo from the shoot, in your own gallery" },
    { id: "ads", name: "Facebook ads + lead generation", price: 500, noDeal: true, get: "Ads built from your videos, aimed at local customers — leads sent straight to you" },
    { id: "website", name: "A website", price: 2000, monthly: 50, noDeal: true, get: "A full site built from your content — the video, the photos, the words. Then $50/month to keep it running, starting 30 days out; cancel anytime." },
  ],
  family: [
    { id: "morephotos", name: "More photos", price: 80, get: "Twenty more edited photos from the same session" },
  ],
};

// Travel — the same for every shoot; the hourly part is quoted on the call.
export const TRAVEL = {
  hourly: 65,
  overnight: 1000,
  line: "Travel's included within an hour of Corning, Waverly, Sayre, or Athens. Farther: $65 per hour of driving, round trip. Overnight trips (3+ hours away): $1,000 flat, travel and lodging covered.",
};

export const DETAIL = {
  wedding: { date: "Your date", where: "Venue (or town if you're still deciding)" },
  business: { date: "When would you like to shoot?", where: "Business name and location" },
  family: { date: "When would you like to shoot?", where: "Your town" },
};

export const money = (n) => `$${n.toLocaleString("en-US")}`;
