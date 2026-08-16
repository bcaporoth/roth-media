"use client";

import { useState } from "react";

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
      tagline: "The whole day, told honestly.",
      prices: [
        ["Weddings", "from $1,200"],
        ["Full days", "from $2,000"],
        ["Fuller stories", "from $3,000"],
      ],
      note: "Candid coverage from the big moments to the in-between ones. The Works adds the engagement session.",
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
      tagline: "Social posts and campaigns that keep clients coming back.",
      prices: [
        ["Photo shoots", "from $350"],
        ["Monthly plans", "from $500/mo"],
      ],
      note: "A half-day at your business with edited images licensed for web and social.",
    },
    {
      n: "06",
      title: "Events",
      tagline: "The whole story, start to finish.",
      prices: [
        ["Event photos", "from $300"],
        ["Extra hours", "$125/hr"],
      ],
      note: "Coverage for launches, races, corporate events, parties, and community moments.",
    },
  ],
  videography: [
    {
      n: "01",
      title: "Wedding Films",
      tagline: "The whole day, told honestly - with sound.",
      prices: [
        ["Wedding films", "from $1,200"],
        ["Full days", "from $2,000"],
        ["Complete films", "from $3,000"],
      ],
      note: "A cinematic highlight film with ceremony audio and licensed music. The Works adds ceremony, speeches, drone, and a next-day teaser.",
    },
    {
      n: "02",
      title: "Brand Video",
      tagline: "Promos and reels that keep clients coming back.",
      prices: [
        ["Promos", "from $450"],
        ["Content days", "from $700"],
        ["Monthly plans", "from $500/mo"],
      ],
      note: "A polished promo film plus vertical reels, licensed music, and one revision round.",
    },
    {
      n: "03",
      title: "Event Video",
      tagline: "The motion, sound, and energy of the room.",
      prices: [
        ["Event films", "from $400"],
        ["Extra hours", "$125/hr"],
      ],
      note: "A clean recap film for conferences, races, launches, fundraisers, and private events.",
    },
  ],
  both: [
    {
      n: "01",
      title: "Wedding Story",
      tagline: "Photo + video without juggling two vendors.",
      prices: [
        ["Wedding stories", "from $1,800"],
        ["Full days", "from $3,000"],
        ["Complete coverage", "from $4,000"],
      ],
      note: "One timeline, one creative direction, one team capturing the day in stills and motion.",
    },
    {
      n: "02",
      title: "Brand Content Day",
      tagline: "A full bank of photos, film, and reels.",
      prices: [
        ["Content days", "from $700"],
        ["Monthly plans", "from $500/mo"],
      ],
      note: "Best for businesses that need a website refresh, social posts, reels, and campaign assets all at once.",
    },
    {
      n: "03",
      title: "Event Coverage",
      tagline: "Photos for the gallery, video for the feeling.",
      prices: [
        ["Photo + video", "from $600"],
        ["Extra hours", "$125/hr"],
      ],
      note: "Perfect for events where people need photos to share and a recap film to remember it.",
    },
  ],
};

export default function PricingToggle() {
  const [service, setService] = useState("both");
  const packages = PACKAGES[service];

  return (
    <div className="pricing-inner">
      <div className="pricing-head reveal">
        <div className="kick">Real prices, up front</div>
        <h2>Pick the path that fits.</h2>
        <p>
          Photo, video, or both. The quote form below uses this same choice and
          adapts the rest of the questions around it.
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

      <div className="price-grid pricing-toggle-grid">
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
            <p className="pnote">{p.note}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
