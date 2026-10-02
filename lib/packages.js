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
    { id: "photo", name: "Wedding Photography", price: 1900, scope: "Full day · photo coverage", get: ["200–400 fully edited photos — getting ready to last dance", "A sneak peek gallery within 48 hours — 10–20 photos, ready to share", LIBRARY], includes: [] },
    {
      id: "film", name: "Wedding Videography", price: 2900, scope: "Full day · film coverage", popular: true,
      get: ["Two short & sweet films, custom made from your day", "Your full ceremony and the speeches, with clean audio", "A sneak peek within 48 hours", LIBRARY],
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
    { id: "day", name: "Full Content Day", price: 750, scope: "One shoot day at your place", popular: true, get: ["One 45–90 second promo for anything you want to promote — a dish, an offer, a job well done", "5 vertical reels, sized for Instagram, Facebook, and TikTok", "15–30 edited photos", "Your people, your work — not stock footage"], includes: [] },
    { id: "mini", name: "Mini Content Day", price: 450, scope: "A shorter shoot · reels first", get: ["8 vertical reels, sized for Instagram, Facebook, and TikTok", "10–20 edited photos", "Your people, your work — not stock footage"], includes: [] },
    { id: "event", name: "Event Coverage", price: 500, scope: "Your event, covered", get: ["A 45–90 second highlight short", "A gallery of 50+ edited photos", "Sized for your website and socials"], includes: [] },
  ],
  family: [
    {
      id: "portraits", name: "Portrait Session", price: 333, scope: "One hour · one location", get: ["Engagements, seniors, families — whatever you're celebrating", "30+ edited photos", "Sneak peeks within 48 hours, ready to share", LIBRARY], includes: [],
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
export const ADDONS = {
  wedding: [
    { id: "second", name: "Second shooter", price: 900, get: "Two angles all day, both of you getting ready" },
    { id: "guest", name: "Guest photos & video messages", price: 250, get: "A QR card on every table — guests scan and send their phone photos, videos, and 60-second messages straight to your private gallery. No app." },
    { id: "engagement", name: "Engagement session", price: 333, get: "Stack your engagement photos onto the wedding — for save-the-dates and your wedding website" },
    { id: "overnight", name: "Overnight travel", price: 1000, get: "For weddings 3+ hours away or that need a hotel — covers the drive and lodging, flat" },
  ],
  business: [
    { id: "raw", name: "All the raw footage", price: 200, get: "Every unedited clip and photo from the shoot, in your own gallery" },
    { id: "ads", name: "Facebook ads + lead generation", price: 500, get: "Ads built from your videos, aimed at local customers — leads sent straight to you" },
    { id: "website", name: "A website", price: 2000, monthly: 50, get: "A full site built from your content — the video, the photos, the words. Then $50/month to keep it running." },
  ],
  family: [
    { id: "extended", name: "Extended session", price: 100, get: "Ninety minutes instead of sixty — a second spot or an outfit change, and more room for little kids to warm up" },
    { id: "morephotos", name: "More photos", price: 100, get: "Twenty more edited photos from the same session" },
    { id: "reel", name: "A short film of the day", price: 150, get: "A 30–60 second vertical reel of the session — the giggles and the chaos, sized for Instagram and Facebook" },
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
