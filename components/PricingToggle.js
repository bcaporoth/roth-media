"use client";

import { useEffect, useRef, useState } from "react";

const SERVICES = [
  ["photography", "Photo", "Still images for people, brands, and moments"],
  ["videography", "Video", "Films, reels, promos, and event coverage"],
  ["both", "Both", "One team for photo + video together"],
];

const PACKAGES = {
  photography: [
    {
      n: "01",
      title: "Weddings",
      tagline: "The only part of the day you keep forever.",
      prices: [
        ["Weddings", "from $1,200"],
        ["Full days", "from $2,000"],
        ["Fuller stories", "from $3,000"],
        ["Add video", "+$1,000"],
      ],
      note: "The flowers fade and the cake gets eaten — the photos are what's left. Candid coverage of the big moments and the in-between ones, with sneak peeks within 72 hours.",
    },
    {
      n: "02",
      title: "Seniors",
      tagline: "Your last year, captured like it mattered.",
      prices: [
        ["Sessions", "from $225"],
        ["Extended sessions", "from $350"],
      ],
      note: "60-90 minutes, two outfits or locations, and 30+ edited images. Extended adds more time, outfits, and variety.",
    },
    {
      n: "03",
      title: "Engagements",
      tagline: "The real, easy, in-love moments.",
      prices: [
        ["Photo session", "from $250"],
        ["Photo + film", "from $450"],
      ],
      note: "One hour on location with 40+ edited images. The session credits toward a wedding booking.",
    },
    {
      n: "04",
      title: "Headshots",
      tagline: "A photo that finally looks like you.",
      prices: [
        ["Individuals", "from $100"],
        ["Small teams", "from $400"],
      ],
      note: "Fast, polished portraits for LinkedIn, websites, teams, and brand pages.",
    },
    {
      n: "05",
      title: "Brand Content",
      tagline: "Content that brings customers through the door.",
      prices: [
        ["Photo shoots", "from $350"],
        ["Monthly plans", "from $750/mo"],
      ],
      note: "A half-day at your business with edited images licensed for web and social. Monthly plans keep you in your customers' feeds every week — a couple of new customers a month and it pays for itself.",
    },
    {
      n: "06",
      title: "Events",
      tagline: "The event lasts one night. The photos don't.",
      prices: [
        ["Event photos", "from $300"],
        ["Add video", "+$300"],
        ["Extra hours", "$125/hr"],
      ],
      note: "Photos your guests actually share — free advertising with your event's name on it. Launches, races, corporate events, parties, and community moments.",
    },
  ],
  videography: [
    {
      n: "01",
      title: "Wedding Films",
      tagline: "The film your kids will watch someday.",
      prices: [
        ["Essential · 8 hrs", "from $2,500"],
        ["Signature · 10 hrs", "from $3,500"],
        ["Luxury · all in", "from $4,500"],
        ["Add photo", "+$1,000"],
      ],
      note: "Essential is the cinematic highlight film with real ceremony audio, full ceremony coverage, and speeches. Signature adds drone, a next-day teaser, a longer film, and toasts delivered in full. Luxury is all in — two shooters, a documentary edit, and social cuts.",
    },
    {
      n: "02",
      title: "Brand Video",
      tagline: "Reels that put you in your customers' feeds every week.",
      prices: [
        ["Half days", "from $500"],
        ["Content days", "from $1,500"],
        ["Monthly plans", "from $750/mo"],
      ],
      note: "Priced on what you walk away with, not hours. The half day is a quick hit — up to 4 hours, one location, one polished 90-second video or three reels, editing included. A Content Creation Day delivers a flagship brand video, up to 5 reels, and drone where it fits.",
    },
    {
      n: "03",
      title: "Event Video",
      tagline: "The recap that sells next year's tickets.",
      prices: [
        ["Coverage", "$600–900"],
        ["Recap films", "from $1,200"],
        ["Add photos", "+$300"],
      ],
      note: "Half-day or full-day coverage. The recap film ($1,200–1,800, edit included) fills seats and wins sponsors for the next one. Conferences, races, launches, fundraisers, and private events.",
    },
  ],
  both: [
    {
      n: "01",
      title: "Wedding Story",
      tagline: "One team. One timeline. Nothing missed.",
      prices: [
        ["Essential", "from $3,500"],
        ["Signature", "from $4,500"],
        ["Luxury", "from $5,500"],
      ],
      items: [
        "Photo + video all day from one team",
        "Full edited gallery with print rights",
        "Cinematic highlight film with real ceremony audio",
        "Sneak peeks within 72 hours",
        "Signature adds drone, a longer film, and a next-day teaser; Luxury goes all in with two shooters and a documentary edit",
      ],
      note: "Simple math: take any film tier and add full photo coverage for a flat $1,000 — one team instead of two vendors juggling the same timeline.",
    },
    {
      n: "02",
      title: "Brand Content Day",
      tagline: "A month of marketing from one day of shooting.",
      prices: [
        ["Content days", "from $1,500"],
        ["Half days", "from $500"],
        ["Monthly plans", "from $750/mo"],
      ],
      items: [
        "Full day of shooting at your business (up to 8 hours)",
        "One flagship brand video",
        "Up to 5 vertical reels cut for Instagram + Facebook",
        "40+ edited photos, licensed for web + social",
        "Drone coverage where it fits",
        "Editing included, with one revision round",
      ],
      note: "The half day is the quick-hit entry: up to 4 hours, one location, one 90-second video or three reels. Extra reels $125 · extra filming $175–250/hr · extra revision rounds $100.",
    },
    {
      n: "03",
      title: "Event Coverage",
      tagline: "Photos to share tonight, a film that sells the next one.",
      prices: [
        ["Photo + video", "from $900"],
        ["Recap film", "from $1,200"],
        ["Extra hours", "$125/hr"],
      ],
      items: [
        "Half-day or full-day photo + video coverage",
        "Full edited gallery your guests can share",
        "Recap film cut for socials and sponsor decks ($1,200–1,800, edit included)",
        "Everything delivered within two weeks",
      ],
      note: "One crew covering both sides — no vendor juggling, one timeline, everything matched.",
    },
  ],
};

export default function PricingToggle() {
  const [service, setService] = useState("both");
  const packages = PACKAGES[service];
  const gridRef = useRef(null);
  const firstRender = useRef(true);

  // The global Reveal observer only sees elements present at page load.
  // Cards created after a toggle click would stay hidden, so reveal them here.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    gridRef.current
      ?.querySelectorAll(".reveal")
      .forEach((el) => el.classList.add("in"));
  }, [service]);

  return (
    <div className="pricing-inner">
      <div className="pricing-head reveal">
        <div className="kick">Real prices, up front</div>
        <h2>Pick the path that fits.</h2>
        <p>
          Photo, video, or both. Every price is a starting point tied to what
          you walk away with — outcomes, not hours. The quote form below uses
          this same choice and adapts the rest of the questions around it.
        </p>
      </div>

      <div className="pricing-toggle" role="radiogroup" aria-label="Choose package type">
        {SERVICES.map(([value, title, desc]) => (
          <button
            type="button"
            key={value}
            className={service === value ? "on" : ""}
            aria-pressed={service === value}
            onClick={() => setService(value)}
          >
            <span>{title}</span>
            <small>{desc}</small>
          </button>
        ))}
      </div>

      <div className="price-grid pricing-toggle-grid" ref={gridRef}>
        {packages.map((p) => (
          <div className="price-card reveal" key={p.title}>
            <span className="n">{p.n}</span>
            <h3>{p.title}</h3>
            <p className="tagline">{p.tagline}</p>
            <ul>
              {p.prices.map(([label, value]) => (
                <li key={label}>
                  <span className="plabel">{label}</span>
                  <span className="pvalue">{value}</span>
                </li>
              ))}
            </ul>
            {p.items && (
              <ul className="pincludes">
                {p.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
            <p className="pnote">{p.note}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
