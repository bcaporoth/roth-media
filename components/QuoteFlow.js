"use client";

import { useMemo, useRef, useState } from "react";

// ── One entrance, one exit ─────────────────────────────────────────
// Photo / Video / Both → what it's for → package → add-ons → details →
// contact + tailored estimate. Every number here is the Roth Media rate
// card: prices are starting points tied to deliverables, not hours.

const CONTACT_EMAIL = "b.caporoth@gmail.com";
const ENDPOINT = `https://formsubmit.co/ajax/${CONTACT_EMAIL}`;

const CRAFTS = [
  { id: "video", title: "Video", desc: "Wedding films, brand video, event films — my primary craft." },
  { id: "photo", title: "Photo", desc: "Still images for weddings, brands, events, and portraits." },
  { id: "both", title: "Both", desc: "One team covering photo and video on one timeline." },
];

const CATEGORIES = {
  video: [
    { id: "wedding", title: "Wedding film", desc: "The film your kids will watch someday." },
    { id: "brand", title: "Brand video", desc: "Reels and brand films that put you in your customers' feeds." },
    { id: "event", title: "Event video", desc: "Coverage and the recap that sells next year's tickets." },
  ],
  photo: [
    { id: "wedding", title: "Wedding photos", desc: "Candid coverage of the big moments and the in-between ones." },
    { id: "brand", title: "Brand photos", desc: "Edited images licensed for your website and social." },
    { id: "event", title: "Event photos", desc: "Photos your guests actually share." },
    { id: "portrait", title: "Portraits & headshots", desc: "Seniors, engagements, and headshots that look like you." },
  ],
  both: [
    { id: "wedding", title: "Wedding photo + film", desc: "One team, one timeline, nothing missed." },
    { id: "brand", title: "Brand content day", desc: "A month of marketing from one day of shooting." },
    { id: "event", title: "Event coverage", desc: "Photos to share tonight, a film that sells the next one." },
    { id: "engagement", title: "Engagement photos + film", desc: "The real, easy, in-love moments — stills and a short film." },
  ],
};

// price: starting point in dollars. per: optional unit label.
// has: features already inside the package (used to hide matching add-ons).
const PACKAGES = {
  "video:wedding": [
    { id: "essential", name: "Essential", price: 2500, scope: "8 hours of coverage", items: ["Cinematic highlight film with real ceremony audio", "Full ceremony coverage", "Speeches"], has: [] },
    { id: "signature", name: "Signature", price: 3500, scope: "10 hours of coverage", items: ["Everything in Essential", "Longer feature film", "Drone coverage", "Next-day teaser", "Full ceremony + toasts, delivered in full"], has: ["drone", "teaser"], popular: true },
    { id: "luxury", name: "Luxury", price: 4500, scope: "All day · two shooters", items: ["Everything in Signature", "Second shooter all day", "Documentary edit", "Social cuts", "All in — nothing held back"], has: ["drone", "teaser", "second", "reel"] },
  ],
  "photo:wedding": [
    { id: "half", name: "Half Day", price: 1200, scope: "Ceremony through the first hours of the reception", items: ["Ceremony, portraits, first dance, toasts, and cake", "Online gallery with print rights", "Sneak peeks within 72 hours"], has: [] },
    { id: "full", name: "Full Day", price: 2000, scope: "Getting ready through the exit", items: ["Full-day coverage", "Online gallery with print rights", "Sneak peeks within 72 hours"], has: [], popular: true },
    { id: "works", name: "The Works", price: 3000, scope: "Full day + engagement session", items: ["Everything in Full Day", "Engagement session included", "The complete photography experience"], has: ["engagement"] },
  ],
  "both:wedding": [
    { id: "essential", name: "Essential", price: 3500, scope: "8 hours · photo + film", items: ["Full edited gallery with print rights", "Cinematic highlight film with real ceremony audio", "Ceremony and speeches on both sides"], has: [] },
    { id: "signature", name: "Signature", price: 4500, scope: "10 hours · photo + film", items: ["Everything in Essential", "Longer feature film + drone", "Next-day teaser", "Full ceremony + toasts in full"], has: ["drone", "teaser"], popular: true },
    { id: "luxury", name: "Luxury", price: 5500, scope: "All day · two shooters", items: ["Everything in Signature", "Second shooter", "Documentary edit + social cuts", "The complete photo experience"], has: ["drone", "teaser", "second", "reel"] },
    { id: "story", name: "The Whole Story", price: 6500, scope: "Your whole season", items: ["Luxury wedding day in photo + film", "Engagement session with a mini film", "Rehearsal-dinner coverage", "One first-year milestone mini", "$250 print credit"], has: ["drone", "teaser", "second", "reel", "engagement"] },
  ],
  "video:brand": [
    { id: "half", name: "Half Day", price: 500, scope: "Up to 4 hrs · one location · one setup", items: ["One polished video up to 90 seconds — or three short reels", "Editing included, one revision round"], has: [] },
    { id: "day", name: "Content Creation Day", price: 1500, scope: "Up to 8 hrs on site", items: ["One flagship brand video", "Up to 5 reels for social", "Drone coverage where feasible", "Up to 8 hours of editing included"], has: ["drone"], popular: true },
    { id: "monthly", name: "Monthly Plan", price: 750, per: "/mo", scope: "A fresh shoot every month", items: ["New shoot and new reels every month", "Posting-ready captions", "Your feed never goes quiet"], has: [] },
  ],
  "photo:brand": [
    { id: "shoot", name: "Content Shoot", price: 350, scope: "Half day at your business", items: ["40+ edited images", "Licensed for web + social"], has: [], popular: true },
    { id: "monthly", name: "Monthly Plan", price: 750, per: "/mo", scope: "A fresh shoot every month", items: ["New images every month", "Posting-ready captions"], has: [] },
  ],
  "both:brand": [
    { id: "day", name: "Content Creation Day", price: 1500, scope: "Up to 8 hrs on site · photo + video", items: ["One flagship brand video", "Up to 5 reels for social", "40+ edited photos, licensed for web + social", "Drone coverage where feasible"], has: ["drone"], popular: true },
    { id: "monthly", name: "Monthly Plan", price: 750, per: "/mo", scope: "A fresh shoot every month", items: ["New shoot, new reels, new photos every month", "Posting-ready captions"], has: [] },
  ],
  "video:event": [
    { id: "half", name: "Half-Day Coverage", price: 600, scope: "On-site filming", items: ["Half-day coverage of the event as it happens", "Edited recap delivered within two weeks"], has: [] },
    { id: "full", name: "Full-Day Coverage", price: 900, scope: "On-site filming", items: ["Full-day coverage of the event as it happens", "Edited recap delivered within two weeks"], has: [] },
    { id: "recap", name: "Recap Film", price: 1200, scope: "Coverage + the film", items: ["A polished recap film cut for socials and sponsor decks", "Edit included ($1,200–1,800 by length)"], has: [], popular: true },
  ],
  "photo:event": [
    { id: "photos", name: "Event Photos", price: 300, scope: "2-hour minimum", items: ["Full edited gallery your guests can share", "Delivered within two weeks"], has: [], popular: true },
  ],
  "both:event": [
    { id: "coverage", name: "Coverage + Photos", price: 900, scope: "Half or full day", items: ["Photo + video coverage as it happens", "Full edited gallery", "Edited recap"], has: [] },
    { id: "recap", name: "Recap Film + Photos", price: 1500, scope: "Coverage + the film", items: ["Polished recap film for socials and sponsor decks", "Full edited gallery"], has: [], popular: true },
  ],
  "photo:portrait": [
    { id: "senior", name: "Senior Session", price: 225, scope: "60–90 minutes", items: ["Two outfits or locations", "30+ edited images"], has: [], popular: true },
    { id: "extended", name: "Extended Session", price: 350, scope: "About two hours", items: ["Three to four looks", "50+ edited images"], has: [] },
    { id: "engagement", name: "Engagement Session", price: 250, scope: "One hour on location", items: ["40+ edited images", "$100 credits toward a wedding booking"], has: [] },
    { id: "headshots", name: "Headshots", price: 100, per: "/person", scope: "20 minutes each", items: ["Two retouched images sized for LinkedIn and web", "Teams from $400 for up to five"], has: [] },
  ],
  "both:engagement": [
    { id: "engfilm", name: "Engagement Session + Film", price: 450, scope: "One hour on location", items: ["40+ edited images", "A 60–90 second film", "$100 credits toward a wedding booking"], has: [], popular: true },
  ],
};

// Add-ons per path. qty: quantity picker. quoted: shown, not summed.
const ADDONS = {
  "video:wedding": [
    { id: "photo", name: "Add full photo coverage", price: 1000, note: "The complete gallery from the same team, same timeline." },
    { id: "drone", name: "Drone coverage", price: 200 },
    { id: "second", name: "Second shooter", price: 500 },
    { id: "reel", name: "Extra social reel", price: 125, qty: true },
    { id: "hours", name: "Extra filming hour", price: 175, qty: true, from: true },
    { id: "rush", name: "Rush delivery (48–72 hr)", quoted: true },
  ],
  "both:wedding": [
    { id: "drone", name: "Drone coverage", price: 200 },
    { id: "second", name: "Second shooter", price: 500 },
    { id: "reel", name: "Extra social reel", price: 125, qty: true },
    { id: "hours", name: "Extra hour on site", price: 175, qty: true, from: true },
    { id: "rush", name: "Rush delivery (48–72 hr)", quoted: true },
  ],
  "photo:wedding": [
    { id: "second", name: "Second photographer", price: 500 },
    { id: "engagement", name: "Engagement session", price: 250 },
    { id: "hours", name: "Extra hour on site", price: 175, qty: true, from: true },
    { id: "rush", name: "Rush delivery (48–72 hr)", quoted: true },
  ],
  "video:brand": [
    { id: "reel", name: "Additional reel", price: 125, qty: true },
    { id: "drone", name: "Drone coverage", price: 200 },
    { id: "profile", name: "Profile / headshot session", price: 300, from: true },
    { id: "second", name: "Second shooter", price: 500 },
    { id: "revision", name: "Extra revision round", price: 100, qty: true },
    { id: "hours", name: "Extra filming hour", price: 175, qty: true, from: true },
    { id: "rush", name: "Rush delivery (48–72 hr)", quoted: true },
  ],
  "both:brand": [
    { id: "reel", name: "Additional reel", price: 125, qty: true },
    { id: "profile", name: "Profile / headshot session", price: 300, from: true },
    { id: "second", name: "Second shooter", price: 500 },
    { id: "revision", name: "Extra revision round", price: 100, qty: true },
    { id: "hours", name: "Extra filming hour", price: 175, qty: true, from: true },
    { id: "rush", name: "Rush delivery (48–72 hr)", quoted: true },
  ],
  "photo:brand": [
    { id: "revision", name: "Extra revision round", price: 100, qty: true },
    { id: "hours", name: "Extra hour on site", price: 175, qty: true, from: true },
    { id: "rush", name: "Rush delivery (48–72 hr)", quoted: true },
  ],
  "video:event": [
    { id: "photo", name: "Add photos", price: 300 },
    { id: "drone", name: "Drone coverage", price: 200 },
    { id: "hours", name: "Extra hour", price: 125, qty: true },
    { id: "rush", name: "Rush delivery (48–72 hr)", quoted: true },
  ],
  "both:event": [
    { id: "drone", name: "Drone coverage", price: 200 },
    { id: "hours", name: "Extra hour", price: 125, qty: true },
    { id: "rush", name: "Rush delivery (48–72 hr)", quoted: true },
  ],
  "photo:event": [
    { id: "hours", name: "Extra hour", price: 125, qty: true },
    { id: "rush", name: "Rush delivery (48–72 hr)", quoted: true },
  ],
  "photo:portrait": [
    { id: "hours", name: "Extra hour", price: 175, qty: true, from: true },
    { id: "rush", name: "Rush delivery (48–72 hr)", quoted: true },
  ],
  "both:engagement": [
    { id: "hours", name: "Extra hour", price: 175, qty: true, from: true },
    { id: "rush", name: "Rush delivery (48–72 hr)", quoted: true },
  ],
};

// Detail questions per category. Fields are [name, label, type, placeholder]
const DETAILS = {
  wedding: {
    intro: "The stuff that makes the day run smooth — and makes the film better.",
    fields: [
      ["date", "Wedding date", "date"],
      ["backupDates", "Backup dates or flexibility", "text", "Or leave blank if the date is set"],
      ["venueName", "Ceremony / reception venue", "text"],
      ["venueAddress", "Venue address", "text"],
      ["startTime", "Coverage start", "time"],
      ["endTime", "Coverage end", "time"],
      ["guestCount", "Estimated guest count", "text"],
      ["participants", "Couple, wedding party, family & VIPs to prioritize", "textarea"],
    ],
    toggles: [
      ["gettingReady", "Getting-ready coverage?", "Both of you, one of you, or skip it."],
      ["secondLocation", "Second location the same day?", "Ceremony and reception in different places."],
      ["vowsSpeeches", "Want the vows, toasts & speeches recorded clean?", "I mic the officiant and speakers so you hear every word."],
    ],
    extra: [
      ["vibe", "Vibe & mood", "text", "Warm and cinematic, documentary, bright and playful…"],
      ["musicPreference", "Music you love (or hate)", "text"],
      ["mustHaves", "Must-have moments", "textarea", "The things you'd be crushed to miss."],
      ["story", "How did you two meet?", "textarea", "Anything that helps me tell your story."],
    ],
  },
  brand: {
    intro: "What you're selling, who needs to see it, and where it'll live.",
    fields: [
      ["date", "Preferred shoot date(s)", "text"],
      ["venueName", "Business / brand name", "text"],
      ["venueAddress", "Shoot location or business address", "text"],
      ["guestCount", "Number of people on camera", "text"],
      ["participants", "Team members, products, services, or spaces to feature", "textarea"],
    ],
    toggles: [
      ["secondLocation", "More than one location?", "Half days cover one location and one setup."],
      ["scriptingSupport", "Want help scripting or planning shots?", ""],
    ],
    extra: [
      ["contentGoals", "What should this content do for the business?", "textarea", "More walk-ins, more sign-ups, launch a product, recruit…"],
      ["contentPlatforms", "Where will it live?", "text", "Instagram, Facebook, website, TikTok, ads…"],
      ["usageRights", "Running paid ads with it?", "text", "Yes / no / not sure"],
      ["mustHaves", "Must-haves", "textarea", "Anything that absolutely has to be in it."],
    ],
  },
  event: {
    intro: "Who's speaking, what matters, and how fast you need it.",
    fields: [
      ["date", "Event date", "date"],
      ["venueName", "Event venue", "text"],
      ["venueAddress", "Venue address", "text"],
      ["startTime", "Coverage start", "time"],
      ["endTime", "Coverage end", "time"],
      ["guestCount", "Estimated attendance", "text"],
      ["participants", "Speakers, performers, sponsors, or VIPs to prioritize", "textarea"],
    ],
    toggles: [
      ["secondLocation", "More than one location?", ""],
      ["vowsSpeeches", "Speeches or presentations to capture with clean audio?", ""],
    ],
    extra: [
      ["contentGoals", "What's the recap for?", "text", "Sponsors, next year's tickets, social, internal…"],
      ["turnaround", "When do you need it?", "text"],
      ["mustHaves", "Must-haves", "textarea"],
    ],
  },
  portrait: {
    intro: "A little context so the session feels like you.",
    fields: [
      ["date", "Preferred session date(s)", "text"],
      ["venueName", "School, team, company, or brand (if relevant)", "text"],
      ["venueAddress", "Location ideas or address", "text"],
      ["guestCount", "Number of people in photos", "text"],
      ["participants", "Who's in front of the camera, and anything I should know", "textarea"],
    ],
    toggles: [],
    extra: [
      ["vibe", "Vibe & mood", "text", "Golden hour, editorial, clean studio…"],
      ["wardrobe", "Outfits or looks you're planning", "text"],
      ["mustHaves", "Must-haves", "textarea"],
    ],
  },
  engagement: {
    intro: "Where, when, and the story behind you two.",
    fields: [
      ["date", "Preferred session date(s)", "text"],
      ["venueName", "Meaningful location or backdrop", "text"],
      ["venueAddress", "Location address or area", "text"],
      ["participants", "Your names and how you met", "textarea"],
    ],
    toggles: [],
    extra: [
      ["vibe", "Vibe & mood", "text"],
      ["mustHaves", "Must-haves", "textarea"],
    ],
  },
};

const STEPS = ["What you need", "What it's for", "Package", "Add-ons", "Details", "Your info"];

const money = (n) => `$${n.toLocaleString("en-US")}`;

function Toggle({ legend, help, value, onChange, options = ["Yes", "No"] }) {
  return (
    <div className="qgroup">
      <span className="qgroup-label">{legend}</span>
      {help && <span className="qhelp">{help}</span>}
      <div className="qtoggle" role="radiogroup" aria-label={legend}>
        {options.map((opt) => (
          <button type="button" key={opt} className={value === opt ? "on" : ""} aria-pressed={value === opt} onClick={() => onChange(value === opt ? "" : opt)}>
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function Field({ name, label, type = "text", placeholder }) {
  const id = `qf-${name}`;
  if (type === "textarea")
    return (
      <div className="qf-field wide">
        <label htmlFor={id}>{label}</label>
        <textarea id={id} name={name} rows={3} placeholder={placeholder} />
      </div>
    );
  return (
    <div className="qf-field">
      <label htmlFor={id}>{label}</label>
      <input id={id} name={name} type={type} placeholder={placeholder} />
    </div>
  );
}

export default function QuoteFlow({ initialCraft = "" }) {
  const formRef = useRef(null);
  const topRef = useRef(null);
  const [step, setStep] = useState(initialCraft ? 1 : 0);
  const [craft, setCraft] = useState(initialCraft);
  const [category, setCategory] = useState("");
  const [pkgId, setPkgId] = useState("");
  const [addons, setAddons] = useState({}); // id -> qty
  const [toggles, setToggles] = useState({});
  const [contactPref, setContactPref] = useState("");
  const [status, setStatus] = useState("idle");
  const [sent, setSent] = useState(null);

  const key = craft && category ? `${craft}:${category}` : "";
  const packages = key ? PACKAGES[key] || [] : [];
  const pkg = packages.find((p) => p.id === pkgId) || null;
  const addonList = useMemo(
    () => (key && pkg ? (ADDONS[key] || []).filter((a) => !pkg.has.includes(a.id)) : []),
    [key, pkg]
  );
  const details = DETAILS[category] || DETAILS.wedding;

  const chosenAddons = addonList.filter((a) => addons[a.id]);
  const addonTotal = chosenAddons.reduce((sum, a) => sum + (a.quoted ? 0 : (a.price || 0) * (a.qty ? addons[a.id] : 1)), 0);
  const estimate = pkg ? pkg.price + addonTotal : 0;
  const hasQuoted = chosenAddons.some((a) => a.quoted);

  function jump(n) {
    setStep(n);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function pickCraft(id) { setCraft(id); setCategory(""); setPkgId(""); setAddons({}); jump(1); }
  function pickCategory(id) { setCategory(id); setPkgId(""); setAddons({}); jump(2); }
  function pickPackage(id) { setPkgId(id); setAddons({}); jump(3); }
  function setAddon(id, qty) { setAddons((s) => ({ ...s, [id]: qty })); }
  function setTog(k, v) { setToggles((s) => ({ ...s, [k]: v })); }

  function next() {
    if (step === 4 && !formRef.current?.reportValidity()) return;
    jump(step + 1);
  }

  const crumbs = [
    craft && CRAFTS.find((c) => c.id === craft)?.title,
    category && CATEGORIES[craft]?.find((c) => c.id === category)?.title,
    pkg && pkg.name,
  ].filter(Boolean);

  async function handleSubmit(e) {
    e.preventDefault();
    if (step !== 5) { next(); return; } // Enter key mid-flow just advances
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    if (data._honey) return;
    setStatus("sending");
    const addonText = chosenAddons
      .map((a) => (a.quoted ? `${a.name} (quoted)` : a.qty ? `${a.name} × ${addons[a.id]} (${money(a.price * addons[a.id])})` : `${a.name} (${money(a.price)})`))
      .join("; ");
    const rows = {
      _subject: `Quote request — ${data.firstName} ${data.lastName} (${crumbs.join(" › ")})`,
      _template: "table",
      path: crumbs.join(" › "),
      package: pkg ? `${pkg.name} — starting at ${money(pkg.price)}${pkg.per || ""}` : "",
      "add-ons": addonText || "none",
      "estimated total": `starting at ${money(estimate)}${pkg?.per || ""}${hasQuoted ? " + quoted items" : ""}`,
      name: `${data.firstName} ${data.lastName}`,
      email: data.email,
      phone: data.phone,
      "best way to reach": data.contactPref,
      "heard about us via": data.referral,
    };
    [...details.fields, ...details.extra].forEach(([name, label]) => { rows[label.toLowerCase()] = data[name]; });
    details.toggles.forEach(([k, label]) => { rows[label.toLowerCase()] = toggles[k]; });
    rows["anything else"] = data.notes;
    const payload = Object.fromEntries(Object.entries(rows).filter(([, v]) => v !== undefined && v !== ""));
    try {
      const res = await fetch(ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(payload) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || String(json.success) !== "true") throw new Error("failed");
      setSent({ name: pkg.name, estimate: money(estimate) + (pkg.per || ""), hasQuoted });
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  if (status === "sent" && sent) {
    return (
      <div className="cform-success qflow-exit" role="status" ref={topRef}>
        <p className="cform-success-title">Got it — your quote is on its way.</p>
        <p className="cform-success-body">
          {crumbs.join(" › ")}, starting at {sent.estimate}{sent.hasQuoted ? " plus the items I'll quote" : ""}. I&apos;ll confirm the exact number and next steps within 24 hours — usually much faster.
        </p>
      </div>
    );
  }

  return (
    <div className="qflow" ref={topRef}>
      <ol className="qsteps qflow-steps" aria-label="Quote progress">
        {STEPS.map((s, i) => (
          <li key={s} className={i === step ? "active" : i < step ? "done" : ""}>
            {i < step ? (
              <button type="button" onClick={() => jump(i)}>{i + 1}. {s}</button>
            ) : (
              <span>{i + 1}. {s}</span>
            )}
          </li>
        ))}
      </ol>

      {crumbs.length > 0 && step > 0 && (
        <p className="qflow-crumbs">{crumbs.join(" › ")}</p>
      )}

      <form ref={formRef} className="quote-form qflow-form" onSubmit={handleSubmit}>
        <input type="text" name="_honey" className="cform-honey" tabIndex={-1} autoComplete="off" aria-hidden="true" />

        {/* 1 — craft */}
        {step === 0 && (
          <div className="qflow-step">
            <h3 className="qflow-q">What do you need?</h3>
            <div className="qsvc">
              {CRAFTS.map((c) => (
                <button type="button" key={c.id} className={craft === c.id ? "on" : ""} onClick={() => pickCraft(c.id)}>
                  <span className="qsvc-title">{c.title}</span>
                  <span className="qsvc-desc">{c.desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 2 — category */}
        {step === 1 && (
          <div className="qflow-step">
            <h3 className="qflow-q">What&apos;s it for?</h3>
            <div className={`qsvc ${CATEGORIES[craft].length === 4 ? "four" : ""}`}>
              {CATEGORIES[craft].map((c) => (
                <button type="button" key={c.id} className={category === c.id ? "on" : ""} onClick={() => pickCategory(c.id)}>
                  <span className="qsvc-title">{c.title}</span>
                  <span className="qsvc-desc">{c.desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 3 — package */}
        {step === 2 && (
          <div className="qflow-step">
            <h3 className="qflow-q">Pick your package.</h3>
            <p className="qhelp">Every price is a starting point tied to what you walk away with — outcomes, not hours.</p>
            <div className={`qpkgs ${packages.length >= 4 ? "four" : ""}`}>
              {packages.map((p) => (
                <button type="button" key={p.id} className={`qpkg ${pkgId === p.id ? "on" : ""} ${p.popular ? "popular" : ""}`} onClick={() => pickPackage(p.id)}>
                  {p.popular && <span className="qpkg-flag">Most booked</span>}
                  <span className="qpkg-name">{p.name}</span>
                  <span className="qpkg-price">{money(p.price)}{p.per || ""} <small>starting at</small></span>
                  <span className="qpkg-scope">{p.scope}</span>
                  <ul>{p.items.map((it) => <li key={it}>{it}</li>)}</ul>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 4 — add-ons */}
        {step === 3 && pkg && (
          <div className="qflow-step">
            <h3 className="qflow-q">Anything to add?</h3>
            <p className="qhelp">Optional. Everything already inside {pkg.name} is left off this list.</p>
            <div className="qaddons">
              {addonList.map((a) => {
                const qty = addons[a.id] || 0;
                return (
                  <div key={a.id} className={`qaddon ${qty ? "on" : ""}`}>
                    <label className="qaddon-main">
                      <input type="checkbox" checked={!!qty} onChange={(e) => setAddon(a.id, e.target.checked ? 1 : 0)} />
                      <span className="qaddon-name">{a.name}{a.note && <small>{a.note}</small>}</span>
                      <span className="qaddon-price">{a.quoted ? "quoted" : `${a.from ? "from " : ""}${money(a.price)}${a.qty ? " each" : ""}`}</span>
                    </label>
                    {a.qty && qty > 0 && (
                      <div className="qaddon-qty" aria-label={`${a.name} quantity`}>
                        <button type="button" onClick={() => setAddon(a.id, Math.max(1, qty - 1))} aria-label="Fewer">−</button>
                        <span>{qty}</span>
                        <button type="button" onClick={() => setAddon(a.id, Math.min(20, qty + 1))} aria-label="More">+</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="qnav-row">
              <button type="button" className="qsecondary" onClick={() => jump(2)}>Back</button>
              <button type="button" className="qprimary" onClick={next}>{chosenAddons.length ? "Continue" : "No add-ons — continue"}</button>
            </div>
          </div>
        )}

        {/* 5 — details (fields stay mounted but hidden so values survive) */}
        <div className="qflow-step" hidden={step !== 4}>
          <h3 className="qflow-q">The details.</h3>
          <p className="qhelp">{details.intro}</p>
          <div className="qf-grid">
            {details.fields.map(([name, label, type, ph]) => <Field key={name} name={name} label={label} type={type} placeholder={ph} />)}
          </div>
          {details.toggles.map(([k, label, help]) => (
            <Toggle key={k} legend={label} help={help} value={toggles[k] || ""} onChange={(v) => setTog(k, v)} />
          ))}
          <div className="qf-grid">
            {details.extra.map(([name, label, type, ph]) => <Field key={name} name={name} label={label} type={type} placeholder={ph} />)}
          </div>
          <div className="qnav-row">
            <button type="button" className="qsecondary" onClick={() => jump(3)}>Back</button>
            <button type="button" className="qprimary" onClick={next}>Continue</button>
          </div>
        </div>

        {/* 6 — contact + estimate */}
        <div className="qflow-step" hidden={step !== 5}>
          <h3 className="qflow-q">Where should I send your quote?</h3>
          {pkg && (
            <div className="qmatch qflow-summary">
              <div className="qmatch-kick">Your quote</div>
              <div className="qmatch-name"><span>{crumbs.join(" › ")}</span><span className="qmatch-price">starting at {money(estimate)}{pkg.per || ""}</span></div>
              <ul className="qflow-lines">
                <li><span>{pkg.name}</span><span>{money(pkg.price)}{pkg.per || ""}</span></li>
                {chosenAddons.map((a) => (
                  <li key={a.id}><span>{a.name}{a.qty ? ` × ${addons[a.id]}` : ""}</span><span>{a.quoted ? "quoted" : money((a.price || 0) * (a.qty ? addons[a.id] : 1))}</span></li>
                ))}
              </ul>
              <p className="qmatch-fineprint">Starting point — I confirm the exact number in writing before we shoot. {hasQuoted ? "Rush delivery is quoted based on your timeline." : ""}</p>
            </div>
          )}
          <div className="qf-grid">
            <div className="qf-field"><label htmlFor="qf-first">First name *</label><input id="qf-first" name="firstName" required={step === 5} autoComplete="given-name" /></div>
            <div className="qf-field"><label htmlFor="qf-last">Last name *</label><input id="qf-last" name="lastName" required={step === 5} autoComplete="family-name" /></div>
            <div className="qf-field"><label htmlFor="qf-email">Email *</label><input id="qf-email" name="email" type="email" required={step === 5} autoComplete="email" /></div>
            <div className="qf-field"><label htmlFor="qf-phone">Phone{contactPref === "Text me" || contactPref === "Call me" ? " *" : ""}</label><input id="qf-phone" name="phone" type="tel" autoComplete="tel" required={step === 5 && (contactPref === "Text me" || contactPref === "Call me")} /></div>
          </div>
          <Toggle legend="Best way to reach you" value={contactPref} onChange={setContactPref} options={["Email me", "Text me", "Call me"]} />
          <input type="hidden" name="contactPref" value={contactPref} />
          <div className="qf-grid">
            <div className="qf-field wide"><label htmlFor="qf-ref">How did you hear about me?</label><input id="qf-ref" name="referral" placeholder="Instagram, a friend, Google, a venue…" /></div>
            <div className="qf-field wide"><label htmlFor="qf-notes">Anything else?</label><textarea id="qf-notes" name="notes" rows={3} /></div>
          </div>
          {status === "error" && <p className="cform-error">That didn&apos;t send. Try again, or text me at 845-549-4425.</p>}
          <div className="qnav-row">
            <button type="button" className="qsecondary" onClick={() => jump(4)}>Back</button>
            <button type="submit" className="qprimary" disabled={status === "sending"}>{status === "sending" ? "Sending…" : "Send my quote request"}</button>
          </div>
        </div>
      </form>

      {pkg && step >= 3 && step < 5 && (
        <aside className="qrail" aria-live="polite">
          <span className="qrail-label">Running estimate</span>
          <span className="qrail-total">starting at {money(estimate)}{pkg.per || ""}</span>
          <span className="qrail-sub">{pkg.name}{chosenAddons.length ? ` + ${chosenAddons.length} add-on${chosenAddons.length > 1 ? "s" : ""}` : ""}</span>
        </aside>
      )}
    </div>
  );
}
