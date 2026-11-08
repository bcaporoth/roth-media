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
// The Full Day's promise (Brandon's words): if he missed something or messed up, he goes back for it.
export const COMEBACK = "Missed a shot or messed something up? I'll come back and get it — free of charge.";

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
  // 2026-11-08 lineup (Brandon): no separate "promo video" — a day is coverage,
  // and the reels are aimed at whatever they're promoting. Ids stay the same
  // (bookings and deals store them): day = Full Day, mini = Half Day,
  // brand = Brand Awareness Day (new), always = Half Day every month, event.
  business: [
    {
      id: "day", name: "Full Day", price: 1100, scope: "A full day on site · reels, the pinned three and photos", popular: true,
      get: ["A full day of coverage at your place", "9 vertical reels, each aimed at what you're promoting — sized for Instagram, Facebook, and TikTok", "The Pinned Three — the first three posts on your Instagram, built to stay pinned: who you are & where to find you · why people trust you · how to book, order, or stop in", "15–30 edited photos", COMEBACK, "Your people, your work — not stock footage"],
      promise: COMEBACK,
      includes: [],
      intake: [
        { id: "promo", label: "What are you promoting right now?", placeholder: "The new lunch menu · a hiring push · the fall sale" },
        { id: "who", label: "Pinned #1 — Who are you, what do you do, where, since when, and why?", placeholder: "Shaina & Matt · cards, games & community nights · 515 S Keystone Ave, Sayre · took over in 2021 because this place raised us" },
        { id: "trust", label: "Pinned #2 — Why do people trust you?", placeholder: "30 years in town · veteran- and woman-owned · 400 five-star reviews · the regulars who've been here since '91" },
        { id: "book", label: "Pinned #3 — How does someone take the next step?", placeholder: "Walk in Tue–Sun 11–8 · DM to reserve a seat at Friday Night Magic · order singles on TCGplayer · call to book the party room" },
        { id: "push", label: "What's worth pushing in the next 30 days?", placeholder: "New products · a special or sale · an event or holiday · hiring · a service nobody knows you do" },
        { id: "calendar", label: "Anything on the calendar we should shoot around?", placeholder: "Black Friday · grand opening Nov 15 · holiday menu · slow season starts in Jan" },
        { id: "faces", label: "Who's on camera?", placeholder: "Me and two of the staff · customers are fine · no faces, just the work" },
        { id: "runs", label: "Where will it run?", options: ["Instagram & Facebook", "Website", "Paid ads", "All of the above", "Not sure yet"] },
      ],
    },
    {
      id: "mini", name: "Half Day", price: 450, scope: "Half a day on site · 5 reels",
      get: ["Half a day of coverage at your place", "5 vertical reels, each aimed at what you're promoting — sized for Instagram, Facebook, and TikTok", "10–20 edited photos", "Your people, your work — not stock footage"],
      includes: [],
      intake: [
        { id: "show", label: "What are you promoting? What should the reels show?", placeholder: "The fall menu, the shop, the team, the product up close" },
        { id: "push", label: "What's worth pushing in the next 30 days?", placeholder: "New products · a special or sale · an event or holiday · hiring · a service nobody knows you do" },
        { id: "calendar", label: "Anything on the calendar we should shoot around?", placeholder: "Black Friday · grand opening Nov 15 · holiday menu · slow season starts in Jan" },
        { id: "faces", label: "Who's on camera?", placeholder: "Me and two of the staff · customers are fine · no faces, just the work" },
        { id: "runs", label: "Where will it run?", options: ["Instagram & Facebook", "Website", "Paid ads", "All of the above", "Not sure yet"] },
      ],
    },
    {
      id: "brand", name: "Brand Awareness Day", price: 450, scope: "Half a day on site · the pinned three",
      get: ["The Pinned Three — the first three posts on your Instagram, built to stay pinned: who you are & where to find you · why people trust you · how to book, order, or stop in", "Half a day of coverage at your place", "10–20 edited photos", "Your people, your work — not stock footage"],
      includes: [],
      intake: [
        { id: "who", label: "Pinned #1 — Who are you, what do you do, where, since when, and why?", placeholder: "Shaina & Matt · cards, games & community nights · 515 S Keystone Ave, Sayre · took over in 2021 because this place raised us" },
        { id: "trust", label: "Pinned #2 — Why do people trust you?", placeholder: "30 years in town · veteran- and woman-owned · 400 five-star reviews · the regulars who've been here since '91" },
        { id: "book", label: "Pinned #3 — How does someone take the next step?", placeholder: "Walk in Tue–Sun 11–8 · DM to reserve a seat at Friday Night Magic · order singles on TCGplayer · call to book the party room" },
        { id: "faces", label: "Who's on camera?", placeholder: "Me and two of the staff · customers are fine · no faces, just the work" },
      ],
    },
    {
      id: "always", name: "Always On", price: 450, scope: "A Half Day, every month · billed per shoot",
      get: ["Half a day at your place every month — we pick the day together", "5 vertical reels and 10–20 edited photos, every month, each aimed at what you're promoting that month", "Priority scheduling · pause or cancel anytime", "Your people, your work — not stock footage"],
      includes: [],
      intake: [
        { id: "show", label: "What are you promoting? What should the reels show?", placeholder: "The fall menu, the shop, the team, the product up close" },
        { id: "push", label: "What's worth pushing in the next 30 days?", placeholder: "New products · a special or sale · an event or holiday · hiring · a service nobody knows you do" },
        { id: "calendar", label: "Anything on the calendar we should shoot around?", placeholder: "Black Friday · grand opening Nov 15 · holiday menu · slow season starts in Jan" },
        { id: "faces", label: "Who's on camera?", placeholder: "Me and two of the staff · customers are fine · no faces, just the work" },
        { id: "runs", label: "Where will it run?", options: ["Instagram & Facebook", "Website", "Paid ads", "All of the above", "Not sure yet"] },
      ],
    },
    {
      id: "event", name: "Event Coverage", price: 600, scope: "Up to 3 hours of coverage",
      get: ["A 45–90 second highlight short", "A gallery of 50+ edited photos", "Sized for your website and socials"],
      includes: [],
      intake: [
        { id: "what", label: "What's the event?", placeholder: "Grand opening · 5K · anniversary party · a fundraiser" },
        { id: "moments", label: "Moments that have to be in the highlight", placeholder: "The ribbon cutting, the speeches, the crowd at the start" },
        { id: "faces", label: "Who's on camera?", placeholder: "Everyone's fine · ask before filming guests · just the organizers" },
      ],
    },
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
// only:   package ids it's offered on (checked server-side too). Omit = every package.
// alt:    a per-package variant of another add-on — left out of landing-page lists.
export const ADDONS = {
  wedding: [
    { id: "second", name: "Second shooter", price: 750, get: "Two angles all day, both of you getting ready" },
    { id: "guest", name: "Guest photos & video messages", price: 250, get: "A QR card on every table — guests scan and send their phone photos, videos, and 60-second messages straight to your private gallery. No app." },
    // Free with any wedding: book both at once and the engagement session is on the house (was $333).
    { id: "engagement", name: "Engagement session", price: 0, was: 333, get: "Free with your wedding — stack your engagement photos onto the day, for save-the-dates and your wedding website" },
    { id: "overnight", name: "Overnight travel", price: 1000, noDeal: true, hidden: true, get: "For weddings 3+ hours away or that need a hotel — covers the drive and lodging, flat" },
  ],
  business: [
    // More from the same day — the camera's already up, so these cost edit time,
    // not a second trip. (The promo-video add-ons were removed 2026-11-08.)
    { id: "reels", name: "8 more reels", price: 300, get: "Eight more vertical reels from the same day, sized for Instagram, Facebook, and TikTok" },
    { id: "photos", name: "20 more photos", price: 150, get: "Twenty more edited photos from the same shoot" },
    { id: "headshots", name: "Team headshots", price: 200, get: "Clean headshots of you and your team on the day — for Google, LinkedIn, and your website" },
    { id: "hour", name: "An extra hour or a second location", price: 200, get: "One more hour of shooting, or a second spot the same day" },
    { id: "raw", name: "All the raw footage", price: 200, get: "Every unedited clip and photo from the shoot, in your own gallery" },
    { id: "rush", name: "Rush delivery", price: 250, noDeal: true, get: "Everything in one week instead of two" },
    { id: "revision", name: "Extra revision round", price: 100, noDeal: true, get: "A second round of changes after the included one" },
    { id: "ads", name: "Facebook ads + lead generation", price: 500, noDeal: true, get: "Ads built from your videos, aimed at local customers — leads sent straight to you" },
    { id: "website", name: "A website", price: 2000, monthly: 50, noDeal: true, get: "A full site built from your content — the video, the photos, the words. Then $50/month to keep it running, starting 30 days out; cancel anytime." },
  ],
  family: [
    { id: "morephotos", name: "More photos", price: 80, get: "Twenty more edited photos from the same session" },
  ],
};

// The add-ons a package can take: not already included, and offered on it (`only`).
// Hidden ones stay in — Brandon adds those by cart link; the quote builder drops them itself.
export const addonsFor = (category, pkg) =>
  (ADDONS[category] || []).filter((a) => pkg && !pkg.includes.includes(a.id) && (!a.only || a.only.includes(pkg.id)));

// What the landing pages list: no hidden ones, no per-package variants.
export const listedAddons = (category) => (ADDONS[category] || []).filter((a) => !a.hidden && !a.alt);

// The menu as a sentence, for intake hints, call sheets and shoot checklists.
// "A website" → "a website"; brand names keep their capital.
export const lowerName = (s) => (/^(Facebook|Instagram|TikTok)\b/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1));
export const addonNames = (category) => (ADDONS[category] || []).filter((a) => !a.alt).map((a) => lowerName(a.name)).join(", ");
export const addonMenu = (category) =>
  (ADDONS[category] || []).filter((a) => !a.alt).map((a) => `${lowerName(a.name)} (${a.price === 0 ? "free" : money(a.price)}${a.monthly ? `, then ${money(a.monthly)}/mo` : ""})`).join(", ");

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
