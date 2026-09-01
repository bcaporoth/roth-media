// City landing pages — one entry per town, rendered by app/[city]/page.js.
// Keep facts here honest: drive times from Waverly, real landmarks, no invented venues.
export const CITIES = [
  {
    slug: "elmira-ny-videographer",
    name: "Elmira",
    state: "NY",
    region: "Chemung County",
    drive: "25 minutes",
    intro: "Elmira is the biggest wedding and business market in the Twin Tiers, and it's a 25-minute drive from my door. Mark Twain country, the Chemung River, Harris Hill, barns and halls up and down Route 17 — I've filmed here and I'll be on time.",
    business: "Elmira storefronts, gyms, restaurants, and contractors are competing for the same customers on the same feeds. A Content Day gives you a month of real footage of your actual place and people — not stock.",
    nearby: ["Horseheads", "Big Flats", "Elmira Heights", "Southport", "Pine City"],
    geo: { lat: 42.0898, lng: -76.8077 },
  },
  {
    slug: "corning-ny-videographer",
    name: "Corning",
    state: "NY",
    region: "Steuben County",
    drive: "45 minutes",
    intro: "Corning weddings tend to be beautiful ones — the Gaffer District, the hills above the Chemung, the Finger Lakes wineries a short drive north. I'm 45 minutes away and film in Corning and Painted Post regularly.",
    business: "Corning's shops, restaurants, and wineries live on visitors' phones. A brand video and a set of reels shot on-site is the difference between being scrolled past and being saved.",
    nearby: ["Painted Post", "Bath", "Hammondsport", "Watkins Glen"],
    geo: { lat: 42.1428, lng: -77.0547 },
  },
  {
    slug: "ithaca-ny-videographer",
    name: "Ithaca",
    state: "NY",
    region: "Tompkins County",
    drive: "an hour",
    intro: "Ithaca weddings mean gorges, lake views, and vineyards on both sides of Cayuga. It's about an hour from Waverly, and I treat Ithaca dates the same as a hometown one — no travel fee inside the Twin Tiers and the southern Finger Lakes.",
    business: "Ithaca businesses have a story-driven audience — students, faculty, tourists, locals who read the about page. A Content Day gives you the footage to tell that story on Instagram, TikTok, and your site.",
    nearby: ["Trumansburg", "Lansing", "Dryden", "Newfield", "Watkins Glen"],
    geo: { lat: 42.4440, lng: -76.5019 },
  },
];

export const findCity = (slug) => CITIES.find((c) => c.slug === slug);
