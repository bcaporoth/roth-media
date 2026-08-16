"use client";

import { useMemo, useRef, useState } from "react";

// ── Package data + matcher, ported verbatim from the original
// Roth Photography intelligent questionnaire ─────────────────────────

const WEDDING_PHOTO = [
  { name: "Half Day · photo", amount: 1200, includes: "Ceremony, portraits, and the first hours of the reception — through the first dance, toasts, and cake. Online gallery, print rights, sneak peeks within 72 hrs." },
  { name: "Full Day · photo", amount: 2000, includes: "Full-day coverage from getting ready through the end-of-night exit. Online gallery, print rights, sneak peeks within 72 hrs." },
  { name: "The Works · photo", amount: 3000, includes: "Full-day coverage plus an engagement session — the complete photography experience.", note: "Going all-in? The Whole Story adds rehearsal-dinner coverage, a first-year milestone mini, and video — $5,000 for everything." },
];

const WEDDING_VIDEO = [
  { name: "Half Day · video", amount: 1200, includes: "Ceremony, portraits, and the first hours of the reception — through the first dance, toasts, and cake — cut into a cinematic highlight film with ceremony audio and licensed music." },
  { name: "Full Day · video", amount: 2000, includes: "Full-day coverage from getting ready through the end-of-night exit, delivered as a highlight film plus key full edits." },
  { name: "The Works · video", amount: 3000, includes: "Full-day coverage plus full ceremony and speeches edits, drone, and a next-day teaser — the complete film experience.", note: "Going all-in? The Whole Story adds an engagement session, rehearsal-dinner coverage, a first-year milestone mini, and photo — $5,000 for everything." },
];

const WEDDING_BOTH = [
  { name: "Half Day · photo & video", amount: 1800, includes: "Ceremony, portraits, and the first hours of the reception — through the first dance, toasts, and cake — in both photo and video. One team, one timeline, gallery plus highlight film.", note: "Saves $600 vs. booking separately." },
  { name: "Full Day · photo & video", amount: 3000, includes: "Full-day photo and video from getting ready through the end-of-night exit — gallery plus highlight film.", note: "Saves $1,000 vs. booking separately." },
  { name: "The Works · photo & video", amount: 4000, includes: "Everything on both sides — full-day photo and video, engagement session, full ceremony and speeches edits, drone, and a next-day teaser.", note: "Saves $2,000 vs. booking separately." },
  { name: "The Whole Story · photo & video", amount: 5000, includes: "Your whole season, one team: engagement session with a mini film, rehearsal-dinner coverage, the full wedding day in photo and video, one first-year milestone mini (anniversary, day-after, baby shower — your pick), and a $250 print credit.", note: 'Everything from "yes" to your first anniversary — and it still beats booking the pieces separately.' },
];

const PORTRAIT_TIERS = [
  { name: "Portrait Session", amount: 225, includes: "60–90 min, two outfits or locations, 30+ edited images in an online gallery." },
  { name: "Extended Portrait Session", amount: 350, includes: "About two hours, three to four outfits or looks, 50+ edited images in an online gallery." },
];

function budgetCeiling(range) {
  switch (range) {
    case "under_500": return 500;
    case "500_1000": return 1000;
    case "1000_2000": return 2000;
    case "2000_3000": return 3000;
    case "3000_5000": return 5000;
    case "5000_plus": return Infinity;
    default: return null;
  }
}

function pickTier(tiers, ceiling) {
  if (ceiling === null)
    return { tier: tiers[0], note: "The most-booked starting point — share a budget and I can fine-tune the fit." };
  const affordable = tiers.filter((t) => t.amount <= ceiling);
  if (affordable.length === 0)
    return { tier: tiers[0], note: "Closest fit for your range — share your number in the message and I'll see what I can do." };
  return { tier: affordable[affordable.length - 1] };
}

function tierRecommendation(tiers, ceiling) {
  const { tier, note } = pickTier(tiers, ceiling);
  return {
    name: tier.name,
    price: `starting at $${tier.amount.toLocaleString("en-US")}`,
    includes: tier.includes,
    note: [tier.note, note].filter(Boolean).join(" ") || undefined,
  };
}

export function recommendRothPackage({ services, eventType, projectType, budgetRange }) {
  const hasPhoto = services === "photography" || services === "both";
  const hasVideo = services === "videography" || services === "both";
  const both = hasPhoto && hasVideo;
  const ceiling = budgetCeiling(budgetRange);

  const isWedding =
    (hasPhoto && eventType === "wedding") ||
    (hasVideo && projectType === "wedding_film");
  const isEngagement = hasPhoto && eventType === "engagement";
  const isPortrait =
    hasPhoto && ["senior", "family", "newborn"].includes(eventType);
  const isHeadshots = hasPhoto && eventType === "headshots";
  const isBrand =
    (hasPhoto && eventType === "brand") ||
    (hasVideo &&
      ["brand", "brand_promo", "social_reels", "testimonial", "real_estate"].includes(projectType));
  const isEvent =
    (hasPhoto && eventType === "corporate") ||
    (hasVideo && projectType === "event");

  if (isWedding) {
    const tiers = both ? WEDDING_BOTH : hasVideo ? WEDDING_VIDEO : WEDDING_PHOTO;
    return tierRecommendation(tiers, ceiling);
  }
  if (isEngagement) {
    return both
      ? { name: "Engagement Session + Film", price: "starting at $450", includes: "60 min on location, 40+ edited images plus a 60–90 sec film — $100 credits toward your wedding booking." }
      : { name: "Engagement Session", price: "starting at $250", includes: "60 min on location, 40+ edited images — $100 credits toward your wedding booking." };
  }
  if (isPortrait) {
    const rec = tierRecommendation(PORTRAIT_TIERS, ceiling);
    if (hasVideo)
      rec.note = [rec.note, "Video for portrait sessions is custom — mention it in the message and I'll quote it."].filter(Boolean).join(" ");
    return rec;
  }
  if (isHeadshots) {
    return { name: "Headshot Session", price: "from $100 / person", includes: "20 min, two retouched images sized for LinkedIn and web.", note: "Booking for a team? On-site team session starts at $400 for up to five people, then $75 per person after — mention your headcount in the message." };
  }
  if (isBrand) {
    if (both) return { name: "Content Day · photo & video", price: "starting at $700", includes: "Half-day at your business: 40+ edited images plus a 90-sec promo and 3 vertical reels, licensed for web and social.", note: "Want fresh content on repeat? Monthly plans from $500/mo." };
    if (hasVideo) return { name: "Promo Package · video", price: "starting at $450", includes: "90-sec promo film plus 3 vertical reels, licensed music, one revision round.", note: "Monthly content plans from $500/mo." };
    return { name: "Content Shoot · photo", price: "starting at $350", includes: "Half-day shoot, 40+ edited images with a web + social license.", note: "Monthly content plans from $500/mo." };
  }
  if (isEvent) {
    if (both) return { name: "Event Coverage · photo & video", price: "from $600", includes: "2-hour minimum with full gallery and an edited event recap video.", note: "Saves $100 vs. booking separately. Additional hours $125 each." };
    if (hasVideo) return { name: "Event Coverage · video", price: "from $400", includes: "2-hour minimum, edited event recap video delivered within two weeks.", note: "Additional hours $125 each." };
    return { name: "Event Coverage · photo", price: "from $300", includes: "2-hour minimum, full edited gallery delivered within two weeks.", note: "Additional hours $125 each." };
  }
  return null;
}

// ── Per-session-type labels & branch logic, ported from the original
// deep intake questionnaires ─────────────────────────────────────────

function sessionLabels(hasPhoto, eventType, hasVideo, projectType) {
  if (hasPhoto && eventType) {
    if (["wedding", "corporate"].includes(eventType))
      return { date: "Event date", venue: "Ceremony or main venue", address: "Venue address", guests: "Estimated guest count", people: "Key people & VIPs to prioritize" };
    if (eventType === "senior")
      return { date: "Preferred session date(s)", venue: "School or team name (if relevant)", address: "Location ideas or address", guests: "Number of people in photos", people: "Senior name, school, year, sports/clubs, who else is joining" };
    if (eventType === "headshots")
      return { date: "Preferred session date(s)", venue: "Company, team, or brand name", address: "Studio, office, or outdoor location", guests: "Number of people needing photos", people: "Roles, titles, and how photos will be used (LinkedIn, website, etc.)" };
    if (eventType === "brand")
      return { date: "Preferred shoot date(s)", venue: "Business / brand name", address: "Studio, office, storefront, or outdoor location", guests: "Number of people needing photos", people: "Team members, products, services, spaces, or customers to feature" };
    if (eventType === "engagement")
      return { date: "Preferred session date(s)", venue: "Meaningful location or backdrop", address: "Location address or area", guests: "Anyone else joining (pets, family)?", people: "Your names and how you met — anything that helps tell your story" };
    if (["family", "newborn"].includes(eventType))
      return { date: "Preferred session date(s)", venue: "Home, studio, or outdoor spot", address: "Location address or area", guests: "Number of people (include ages of kids)", people: "Who will be in the photos and any special needs (naps, mobility, etc.)" };
  }
  if (hasVideo && projectType) {
    if (projectType === "wedding_film")
      return { date: "Wedding date", venue: "Ceremony / reception venue", address: "Venue address", guests: "Estimated guest count", people: "Couple, wedding party, family, and VIPs to prioritize" };
    if (["brand", "brand_promo", "social_reels"].includes(projectType))
      return { date: "Preferred shoot date(s)", venue: "Business / brand name", address: "Shoot location or business address", guests: "Number of people on camera", people: "Team members, customers, products, or services featured" };
    if (projectType === "testimonial")
      return { date: "Preferred shoot date(s)", venue: "Business / interview location", address: "Interview address or area", guests: "Number of interviews", people: "Who is speaking and what story should they tell?" };
    if (projectType === "real_estate")
      return { date: "Preferred shoot date(s)", venue: "Property name or listing", address: "Property address", guests: "People on camera, if any", people: "Property highlights, agent intro, or rooms to emphasize" };
    if (projectType === "event")
      return { date: "Event date", venue: "Event venue", address: "Venue address", guests: "Estimated attendance", people: "Speakers, performers, sponsors, or VIPs to prioritize" };
  }
  return { date: "Preferred date(s)", venue: "Location or venue name", address: "Address or area ideas", guests: "Number of people involved", people: "Who or what should be featured?" };
}

// ── Form ─────────────────────────────────────────────────────────────

const CONTACT_EMAIL = "b.caporoth@gmail.com";
const ENDPOINT = `https://formsubmit.co/ajax/${CONTACT_EMAIL}`;

const EVENT_OPTIONS = [
  ["", "Choose…"], ["wedding", "Wedding"], ["engagement", "Engagement"],
  ["family", "Family"], ["newborn", "Newborn"], ["senior", "Senior portraits"],
  ["headshots", "Headshots / branding"], ["brand", "Business / brand content"],
  ["corporate", "Event / corporate"], ["other", "Other"],
];

const PROJECT_OPTIONS = [
  ["", "Choose…"], ["wedding_film", "Wedding film"], ["brand", "Business / brand content"],
  ["brand_promo", "Brand promo"], ["event", "Event coverage"], ["social_reels", "Social reels"],
  ["testimonial", "Customer testimonial"], ["real_estate", "Real estate / property"], ["other", "Other"],
];

const BUDGET_OPTIONS = [
  ["", "Choose…"], ["under_500", "Under $500"], ["500_1000", "$500–$1k"],
  ["1000_2000", "$1k–$2k"], ["2000_3000", "$2k–$3k"], ["3000_5000", "$3k–$5k"],
  ["5000_plus", "$5k+"], ["prefer_not_say", "Prefer not to say"],
];

const SERVICES = [
  ["photography", "Photography", "Photo coverage only"],
  ["videography", "Videography", "Video coverage only"],
  ["both", "Both", "Photo + video together"],
];

const label = (options, value) =>
  (options.find(([v]) => v === value) || [])[1] || value;

function Toggle({ legend, help, value, onChange, options = ["Yes", "No"] }) {
  return (
    <div className="qgroup">
      <span className="qgroup-label">{legend}</span>
      {help && <span className="qhelp">{help}</span>}
      <div className="qtoggle" role="radiogroup" aria-label={legend}>
        {options.map((opt) => (
          <button
            type="button"
            key={opt}
            className={value === opt ? "on" : ""}
            aria-pressed={value === opt}
            onClick={() => onChange(value === opt ? "" : opt)}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function Section({ title, hint, children }) {
  return (
    <div className="qdeep-section">
      <h3 className="qdeep-title">{title}</h3>
      {hint && <p className="qhelp">{hint}</p>}
      {children}
    </div>
  );
}

export default function QuoteForm({ initialService = "" }) {
  const formRef = useRef(null);
  const [services, setServices] = useState(initialService);
  const [step, setStep] = useState(initialService ? "basics" : "service");
  const [eventType, setEventType] = useState("");
  const [projectType, setProjectType] = useState("");
  const [budgetRange, setBudgetRange] = useState("");
  const [contactPref, setContactPref] = useState("");
  const [status, setStatus] = useState("idle");
  const [sentMatch, setSentMatch] = useState(null);

  // Toggles that reveal follow-up fields
  const [secondLocation, setSecondLocation] = useState("");
  const [gettingReady, setGettingReady] = useState("");
  const [shotList, setShotList] = useState("");
  const [drone, setDrone] = useState("");
  const [vowsSpeeches, setVowsSpeeches] = useState("");

  const hasPhoto = services === "photography" || services === "both";
  const hasVideo = services === "videography" || services === "both";

  const match = useMemo(
    () => (services ? recommendRothPackage({ services, eventType, projectType, budgetRange }) : null),
    [services, eventType, projectType, budgetRange]
  );

  // ── Branch logic (which deep sections open up) ──
  const typeChosen = (hasPhoto && eventType) || (hasVideo && projectType);
  const pWed = hasPhoto && ["wedding", "corporate", "other"].includes(eventType);
  const pPortrait = hasPhoto && ["senior", "headshots", "brand", "engagement", "family", "newborn", "other"].includes(eventType);
  const pBrand = hasPhoto && ["brand", "other"].includes(eventType);
  const pEngagementQ = hasPhoto && ["wedding", "corporate", "engagement"].includes(eventType);
  const vWed = hasVideo && ["wedding_film", "event", "other"].includes(projectType);
  const vWeddingFilm = hasVideo && projectType === "wedding_film";
  const vBrand = hasVideo && ["brand", "brand_promo", "social_reels", "testimonial", "real_estate", "other"].includes(projectType);
  const vAudio = hasVideo && projectType && projectType !== "real_estate";
  const vDrone = hasVideo && projectType && projectType !== "testimonial";
  const weddingLike = pWed || vWed;
  const brandLike = pBrand || vBrand;

  const L = sessionLabels(hasPhoto, eventType, hasVideo, projectType);

  function chooseService(value) {
    setServices(value);
    setEventType("");
    setProjectType("");
    setStep("basics");
  }

  function goToDetails() {
    if (!formRef.current?.reportValidity()) return;
    setStep("details");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    if (data._honey) return;
    setStatus("sending");

    // Only send fields the client actually filled in, in call-prep order.
    const rows = {
      _subject: `Quote request — ${data.firstName} ${data.lastName} (${services})`,
      _template: "table",
      services,
      "session type": hasPhoto ? label(EVENT_OPTIONS, eventType) : undefined,
      "project type": hasVideo ? label(PROJECT_OPTIONS, projectType) : undefined,
      name: `${data.firstName} ${data.lastName}`,
      email: data.email,
      phone: data.phone,
      "best way to reach": data.contactPref,
      "city / town / venue": data.location,
      "heard about us via": data.referral,
      budget: label(BUDGET_OPTIONS, budgetRange),
      "matched package": match ? `${match.name} (${match.price})` : "none",
      // When & where
      [L.date.toLowerCase()]: data.date,
      "backup dates / flexibility": data.backupDates,
      "start time": data.startTime,
      "end time": data.endTime,
      [L.venue.toLowerCase()]: data.venueName,
      [L.address.toLowerCase()]: data.venueAddress,
      [L.guests.toLowerCase()]: data.guestCount,
      "key people": data.participants,
      "second location": secondLocation,
      "second location address": secondLocation === "Yes" ? data.secondLocationAddress : undefined,
      "getting-ready coverage": gettingReady,
      "getting-ready address": gettingReady === "Yes" ? data.gettingReadyAddress : undefined,
      "location preference": data.locationPreference,
      "wardrobe / outfits": data.wardrobe,
      // Style & vision
      "vibe / mood": data.vibe,
      "inspiration links": data.inspirationLinks,
      "color palette / theme": data.colorPalette,
      "candid vs posed": data.styleMix,
      "video style": data.videoStyle,
      "music preference": data.musicPreference,
      // Brand content
      "content cadence": data.contentCadence,
      platforms: data.contentPlatforms,
      "format / orientation": data.contentOrientation,
      "business goal": data.contentGoals,
      "featuring": data.featureList,
      "on-camera people": data.onCameraTalent,
      "usage rights / ads": data.usageRights,
      "brand guidelines": data.brandGuidelines,
      "scripting support": data.scriptingSupport,
      "captions needed": data.captionsNeeded,
      // Day-of logistics
      "shot list / timeline prepared": shotList,
      "other vendors": data.otherVendors,
      "vip guests": data.vipGuests,
      "vows & speeches audio": vowsSpeeches,
      "audio needs": data.audioNeeds,
      "drone coverage": drone,
      "drone notes": drone === "Yes" ? data.droneNotes : undefined,
      // Deliverables
      "coverage hours": data.coverageHours,
      "second photographer": data.secondPhotographer,
      "engagement session": data.engagementSession,
      "film length": data.filmLength,
      "full ceremony edit": data.fullCeremonyEdit,
      "social cuts wanted": data.socialCuts,
      "raw footage": data.rawFootage,
      "same-day edit": data.sameDayEdit,
      turnaround: data.turnaround,
      "printed products": data.printedProducts,
      // Story
      story: data.story,
      "must-haves": data.mustHaves,
      "anything else": data.notes,
    };
    const payload = Object.fromEntries(
      Object.entries(rows).filter(([, v]) => v !== undefined && v !== "")
    );

    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || String(json.success) !== "true") throw new Error("failed");
      setSentMatch(match);
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div className="cform-success" role="status">
        <p className="cform-success-title">
          {services === "both"
            ? "Photo + video inquiry received"
            : services === "videography"
              ? "Video inquiry received"
              : "Photography inquiry received"}
        </p>
        <p className="cform-success-body">
          {sentMatch
            ? `Based on what you shared, ${sentMatch.name} at ${sentMatch.price} looks like your best fit — I'll confirm the exact quote when I reach out. You'll hear from me within 24 hours, usually much faster.`
            : "Thank you — you'll hear from me within 24 hours, usually much faster."}
        </p>
      </div>
    );
  }

  return (
    <form ref={formRef} className="quote-form quote-wizard" onSubmit={handleSubmit}>
      <div className="qsteps" aria-label="Quote form progress">
        <span className={step === "service" ? "active" : ""}>1. Pick service</span>
        <span className={step === "basics" ? "active" : ""}>2. Quick fit</span>
        <span className={step === "details" ? "active" : ""}>3. Tell the story</span>
      </div>

      <div className="qsvc" role="radiogroup" aria-label="What do you need?">
        {SERVICES.map(([value, title, desc]) => (
          <button
            type="button"
            key={value}
            className={services === value ? "on" : ""}
            onClick={() => chooseService(value)}
            aria-pressed={services === value}
          >
            <span className="qsvc-title">{title}</span>
            <span className="qsvc-desc">{desc}</span>
          </button>
        ))}
      </div>

      {!services && (
        <p className="quote-hint">
          Check one above — a few quick questions and you&apos;re done. Takes
          about two minutes.
        </p>
      )}

      {services && (
        <>
          <input type="text" name="_honey" className="cform-honey" tabIndex={-1} autoComplete="off" aria-hidden="true" />
          <div hidden={step !== "basics"}>
          <div className="row">
            <div>
              <label htmlFor="q-first">First name *</label>
              <input id="q-first" name="firstName" required autoComplete="given-name" />
            </div>
            <div>
              <label htmlFor="q-last">Last name *</label>
              <input id="q-last" name="lastName" required autoComplete="family-name" />
            </div>
          </div>
          <div className="row">
            <div>
              <label htmlFor="q-email">Email *</label>
              <input id="q-email" name="email" type="email" required autoComplete="email" />
            </div>
            <div>
              <label htmlFor="q-phone">
                {contactPref === "Text me" || contactPref === "Call me"
                  ? "Phone *"
                  : "Phone"}
              </label>
              <input
                id="q-phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                required={contactPref === "Text me" || contactPref === "Call me"}
              />
            </div>
          </div>
          <div className="row">
            {hasPhoto && (
              <div>
                <label htmlFor="q-event">
                  {services === "both" ? "Photography session type *" : "Session type *"}
                </label>
                <select id="q-event" value={eventType} onChange={(e) => setEventType(e.target.value)} required>
                  {EVENT_OPTIONS.map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
            )}
            {hasVideo && (
              <div>
                <label htmlFor="q-project">
                  {services === "both" ? "Video project type *" : "Project type *"}
                </label>
                <select id="q-project" value={projectType} onChange={(e) => setProjectType(e.target.value)} required>
                  {PROJECT_OPTIONS.map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div className="row">
            <div>
              <label htmlFor="q-when">Date (if you have one)</label>
              <input id="q-when" name="date" type="date" />
            </div>
            <div>
              <label htmlFor="q-where">City, town, or venue</label>
              <input id="q-where" name="location" placeholder="Waverly, Elmira, the venue name…" />
            </div>
          </div>
          <div className="row">
            <div>
              <label htmlFor="q-reach">Best way to reach you</label>
              <select
                id="q-reach"
                name="contactPref"
                value={contactPref}
                onChange={(e) => setContactPref(e.target.value)}
              >
                <option value="">Choose…</option>
                <option>Text me</option>
                <option>Call me</option>
                <option>Email me</option>
              </select>
            </div>
            <div>
              <label htmlFor="q-budget">Budget range</label>
              <select id="q-budget" value={budgetRange} onChange={(e) => setBudgetRange(e.target.value)}>
                {BUDGET_OPTIONS.map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
          </div>

          {match && (
            <div className="qmatch" aria-live="polite">
              <div className="qmatch-kick">Your match</div>
              <div className="qmatch-name">
                <span>{match.name}</span>
                <span className="qmatch-price">{match.price}</span>
              </div>
              <p className="qmatch-includes">{match.includes}</p>
              {match.note && <p className="qmatch-note">{match.note}</p>}
              <p className="qmatch-fineprint">
                No obligation — this is the package most people in your shoes
                book. I&apos;ll confirm the exact quote before anything is
                locked in.
              </p>
            </div>
          )}
          <div className="qnav-row">
            <button type="button" className="qsecondary" onClick={() => setStep("service")}>
              ← Change service
            </button>
            <button type="button" onClick={goToDetails}>
              Next: tell me the story →
            </button>
          </div>
          </div>

          <div hidden={step !== "details"}>
          {typeChosen && (
            <>
              <div className="qdeep-intro">
                <p className="qdeep-intro-title">Want a sharper quote? Go deeper.</p>
                <p>
                  Everything below is optional — skip anything you&apos;re still
                  deciding. But every answer here means less back-and-forth and
                  a photographer who shows up to your call already knowing your
                  day.
                </p>
              </div>

              <Section title="When &amp; where">
                <div className="row">
                  <div>
                    <label htmlFor="q-backup">Backup dates or flexibility</label>
                    <input id="q-backup" name="backupDates" placeholder="Weekends only, rain dates, etc." />
                  </div>
                  <div>
                    <label htmlFor="q-guests">{L.guests}</label>
                    <input id="q-guests" name="guestCount" inputMode="numeric" />
                  </div>
                </div>
                <div className="row">
                  <div>
                    <label htmlFor="q-start">Preferred start time</label>
                    <input id="q-start" name="startTime" type="time" />
                  </div>
                  <div>
                    <label htmlFor="q-end">Preferred end time</label>
                    <input id="q-end" name="endTime" type="time" />
                  </div>
                </div>
                <div>
                  <label htmlFor="q-venue">{L.venue}</label>
                  <input id="q-venue" name="venueName" />
                </div>
                <div>
                  <label htmlFor="q-address">{L.address}</label>
                  <input id="q-address" name="venueAddress" />
                </div>
                <div>
                  <label htmlFor="q-people">{L.people}</label>
                  <textarea id="q-people" name="participants" rows={2} />
                </div>
                {pPortrait && (
                  <div className="row">
                    <div>
                      <label htmlFor="q-locpref">Location preference</label>
                      <select id="q-locpref" name="locationPreference" defaultValue="">
                        <option value="">Choose…</option>
                        <option>Indoor</option>
                        <option>Outdoor</option>
                        <option>Studio</option>
                        <option>Mix of locations</option>
                        <option>Not sure yet</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="q-wardrobe">Wardrobe / outfit plans</label>
                      <input id="q-wardrobe" name="wardrobe" placeholder="Outfit changes, uniforms, colors to avoid…" />
                    </div>
                  </div>
                )}
                {weddingLike && (
                  <>
                    <Toggle
                      legend="Second location? (e.g. ceremony vs reception)"
                      help="Some weddings split between two places — like a church ceremony and a reception hall."
                      value={secondLocation}
                      onChange={setSecondLocation}
                    />
                    {secondLocation === "Yes" && (
                      <div>
                        <label htmlFor="q-secondaddr">Second location address</label>
                        <input id="q-secondaddr" name="secondLocationAddress" />
                      </div>
                    )}
                  </>
                )}
                {pWed && (
                  <>
                    <Toggle
                      legend="Getting-ready coverage?"
                      help="Where hair, makeup, and getting dressed happen before the ceremony — often a hotel room or home."
                      value={gettingReady}
                      onChange={setGettingReady}
                    />
                    {gettingReady === "Yes" && (
                      <div>
                        <label htmlFor="q-readyaddr">Getting-ready address</label>
                        <input id="q-readyaddr" name="gettingReadyAddress" />
                      </div>
                    )}
                  </>
                )}
              </Section>

              <Section
                title="Style &amp; vision"
                hint="This is how I learn your taste before we ever talk — Pinterest boards are gold."
              >
                <div>
                  <label htmlFor="q-vibe">The vibe / mood you want</label>
                  <textarea id="q-vibe" name="vibe" rows={2} placeholder="Warm and candid, moody and cinematic, bright and clean…" />
                </div>
                <div>
                  <label htmlFor="q-inspo">Pinterest boards or inspiration links</label>
                  <textarea
                    id="q-inspo"
                    name="inspirationLinks"
                    rows={2}
                    placeholder="Paste links — Pinterest, Instagram saves, films you love. One per line."
                  />
                </div>
                <div className="row">
                  {hasPhoto && (
                    <div>
                      <label htmlFor="q-palette">Color palette or theme</label>
                      <input id="q-palette" name="colorPalette" />
                    </div>
                  )}
                  {hasPhoto && (
                    <div>
                      <label htmlFor="q-stylemix">Candid vs posed</label>
                      <select id="q-stylemix" name="styleMix" defaultValue="">
                        <option value="">Choose…</option>
                        <option>Mostly candid</option>
                        <option>Mostly posed</option>
                        <option>Mix of both</option>
                      </select>
                    </div>
                  )}
                  {hasVideo && (
                    <div>
                      <label htmlFor="q-vstyle">Video style</label>
                      <select id="q-vstyle" name="videoStyle" defaultValue="">
                        <option value="">Choose…</option>
                        <option>Cinematic</option>
                        <option>Documentary</option>
                        <option>Energetic</option>
                        <option>Romantic</option>
                        <option>Clean / polished brand</option>
                        <option>Mix</option>
                      </select>
                    </div>
                  )}
                </div>
                {hasVideo && (
                  <div>
                    <label htmlFor="q-music">Music preference</label>
                    <input id="q-music" name="musicPreference" placeholder="The mood you want, or songs you have rights to use" />
                  </div>
                )}
              </Section>

              {brandLike && (
                <Section
                  title="Business &amp; content goals"
                  hint="So the content actually works for your business — not just looks good."
                >
                  <div className="row">
                    <div>
                      <label htmlFor="q-cadence">Content cadence</label>
                      <select id="q-cadence" name="contentCadence" defaultValue="">
                        <option value="">Choose…</option>
                        <option>One-time shoot</option>
                        <option>Monthly content retainer</option>
                        <option>Quarterly content batch</option>
                        <option>Campaign / launch package</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="q-orientation">Format / orientation needed</label>
                      <input id="q-orientation" name="contentOrientation" placeholder="Vertical for Reels, wide for website, square posts…" />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="q-platforms">Platforms this content is for</label>
                    <input id="q-platforms" name="contentPlatforms" placeholder="Instagram, TikTok, LinkedIn, website, ads, Google Business…" />
                  </div>
                  <div>
                    <label htmlFor="q-goals">Business goal for this content</label>
                    <textarea id="q-goals" name="contentGoals" rows={2} placeholder="More bookings, launch a service, refresh team photos, monthly social content…" />
                  </div>
                  <div>
                    <label htmlFor="q-feature">Products, services, spaces, or offers to feature</label>
                    <textarea id="q-feature" name="featureList" rows={2} />
                  </div>
                  <div className="row">
                    <div>
                      <label htmlFor="q-talent">Who should be on camera</label>
                      <input id="q-talent" name="onCameraTalent" placeholder="Owner, staff, customers, no people…" />
                    </div>
                    <div>
                      <label htmlFor="q-usage">Usage rights / paid ads</label>
                      <input id="q-usage" name="usageRights" placeholder="Organic social, website, boosted posts, paid ads…" />
                    </div>
                  </div>
                  {hasVideo && (
                    <>
                      <div>
                        <label htmlFor="q-brandguide">Brand guidelines</label>
                        <input id="q-brandguide" name="brandGuidelines" placeholder="Colors, fonts, tone of voice — or a link to your brand kit" />
                      </div>
                      <div className="row">
                        <div>
                          <label htmlFor="q-script">Need help with scripting?</label>
                          <select id="q-script" name="scriptingSupport" defaultValue="">
                            <option value="">Choose…</option>
                            <option>Yes</option>
                            <option>No</option>
                            <option>Not sure</option>
                          </select>
                        </div>
                        <div>
                          <label htmlFor="q-captions">Captions needed?</label>
                          <select id="q-captions" name="captionsNeeded" defaultValue="">
                            <option value="">Choose…</option>
                            <option>Yes</option>
                            <option>No</option>
                            <option>Not sure</option>
                          </select>
                        </div>
                      </div>
                    </>
                  )}
                </Section>
              )}

              {(weddingLike || vAudio || vDrone) && (
                <Section title={weddingLike ? "Day-of logistics" : "On the day"}>
                  {weddingLike && (
                    <>
                      <Toggle
                        legend="Shot list or day-of timeline prepared?"
                        help="A plan of key moments and when they happen, so nothing important is missed."
                        value={shotList}
                        onChange={setShotList}
                        options={["Yes", "Not yet"]}
                      />
                      <div>
                        <label htmlFor="q-vendors">Other vendors (planner, DJ, florist, etc.)</label>
                        <textarea id="q-vendors" name="otherVendors" rows={2} />
                      </div>
                      <div>
                        <label htmlFor="q-vips">Guests who need special attention in photos</label>
                        <textarea id="q-vips" name="vipGuests" rows={2} placeholder="Grandparents, wedding party, speakers…" />
                      </div>
                    </>
                  )}
                  {vWed && vAudio && (
                    <Toggle
                      legend="Need clean audio of vows, toasts, or speeches?"
                      value={vowsSpeeches}
                      onChange={setVowsSpeeches}
                      options={["Yes", "No", "Not sure"]}
                    />
                  )}
                  {vAudio && (
                    <div>
                      <label htmlFor="q-audio">Other audio needs</label>
                      <input id="q-audio" name="audioNeeds" placeholder="Interviews, room ambience, DJ music, on-camera talking…" />
                    </div>
                  )}
                  {vDrone && (
                    <>
                      <Toggle
                        legend="Drone coverage?"
                        help="Aerial shots — great for venues, property, and wide establishing views."
                        value={drone}
                        onChange={setDrone}
                        options={["Yes", "No", "Not sure"]}
                      />
                      {drone === "Yes" && (
                        <div>
                          <label htmlFor="q-dronenotes">Anything specific from the air?</label>
                          <input id="q-dronenotes" name="droneNotes" />
                        </div>
                      )}
                    </>
                  )}
                </Section>
              )}

              <Section title="Deliverables &amp; timing">
                <div className="row">
                  <div>
                    <label htmlFor="q-hours">Hours of coverage (approx.)</label>
                    <select id="q-hours" name="coverageHours" defaultValue="">
                      <option value="">Choose…</option>
                      <option>1–2 hours</option>
                      <option>3–4 hours</option>
                      <option>5–6 hours</option>
                      <option>7–8 hours</option>
                      <option>8+ hours</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="q-turnaround">Preferred turnaround</label>
                    <select id="q-turnaround" name="turnaround" defaultValue="">
                      <option value="">Choose…</option>
                      <option>1–2 weeks</option>
                      <option>3–4 weeks</option>
                      <option>No rush</option>
                    </select>
                  </div>
                </div>
                <div className="row">
                  {pWed && (
                    <div>
                      <label htmlFor="q-second">Second photographer?</label>
                      <select id="q-second" name="secondPhotographer" defaultValue="">
                        <option value="">Choose…</option>
                        <option>Yes</option>
                        <option>No</option>
                        <option>Not sure</option>
                      </select>
                    </div>
                  )}
                  {pEngagementQ && eventType !== "engagement" && (
                    <div>
                      <label htmlFor="q-engagement">Engagement session?</label>
                      <select id="q-engagement" name="engagementSession" defaultValue="">
                        <option value="">Choose…</option>
                        <option>Yes</option>
                        <option>No</option>
                        <option>Already booked</option>
                      </select>
                    </div>
                  )}
                  {hasPhoto && (
                    <div>
                      <label htmlFor="q-prints">Printed products (albums, prints)</label>
                      <select id="q-prints" name="printedProducts" defaultValue="">
                        <option value="">Choose…</option>
                        <option>Yes</option>
                        <option>No</option>
                        <option>Maybe later</option>
                      </select>
                    </div>
                  )}
                </div>
                {hasVideo && (
                  <div className="row">
                    <div>
                      <label htmlFor="q-length">Final film length</label>
                      <select id="q-length" name="filmLength" defaultValue="">
                        <option value="">Choose…</option>
                        <option>Teaser only</option>
                        <option>1–3 minutes</option>
                        <option>4–7 minutes</option>
                        <option>8–15 minutes</option>
                        <option>Feature length / documentary cut</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="q-cuts">Vertical social cuts wanted</label>
                      <input id="q-cuts" name="socialCuts" placeholder="How many Reels/TikToks from the shoot?" />
                    </div>
                  </div>
                )}
                {hasVideo && (
                  <div className="row">
                    {vWeddingFilm && (
                      <div>
                        <label htmlFor="q-ceremony">Full ceremony &amp; speeches edit?</label>
                        <select id="q-ceremony" name="fullCeremonyEdit" defaultValue="">
                          <option value="">Choose…</option>
                          <option>Yes</option>
                          <option>No</option>
                          <option>Not sure</option>
                        </select>
                      </div>
                    )}
                    <div>
                      <label htmlFor="q-raw">Raw footage?</label>
                      <select id="q-raw" name="rawFootage" defaultValue="">
                        <option value="">Choose…</option>
                        <option>Yes</option>
                        <option>No</option>
                        <option>Not sure</option>
                      </select>
                    </div>
                    {vWed && (
                      <div>
                        <label htmlFor="q-sameday">Same-day edit?</label>
                        <select id="q-sameday" name="sameDayEdit" defaultValue="">
                          <option value="">Choose…</option>
                          <option>Yes</option>
                          <option>No</option>
                          <option>Not sure</option>
                        </select>
                      </div>
                    )}
                  </div>
                )}
              </Section>
            </>
          )}

          <div>
            <label htmlFor="q-story">Now the good part — tell me your story</label>
            <textarea
              id="q-story"
              name="story"
              rows={4}
              placeholder="Your wedding, your shop, your senior — whatever it is, tell me about it. This is what I read first."
            />
          </div>
          <div>
            <label htmlFor="q-must">
              {services === "both"
                ? "Must-have shots, moments, or sound bites"
                : hasVideo
                  ? "Must-capture moments, shots, or sound bites"
                  : "Must-have shots or moments"}
            </label>
            <textarea id="q-must" name="mustHaves" rows={2} />
          </div>
          {typeChosen && (
            <div>
              <label htmlFor="q-notes">
                Anything else I should know (accessibility, pets, surprises, restrictions)
              </label>
              <textarea id="q-notes" name="notes" rows={2} />
            </div>
          )}
          <div className="row">
            <div>
              <label htmlFor="q-referral">How did you hear about me?</label>
              <select id="q-referral" name="referral" defaultValue="">
                <option value="">Choose…</option>
                <option>Instagram</option>
                <option>Facebook</option>
                <option>Google</option>
                <option>Referral / word of mouth</option>
                <option>Other</option>
              </select>
            </div>
          </div>

          <button type="submit" disabled={status === "sending"}>
            {status === "sending"
              ? "Sending…"
              : services === "both"
                ? "Send photo + video inquiry →"
                : services === "videography"
                  ? "Send video inquiry →"
                  : "Send photography inquiry →"}
          </button>
          {status === "error" && (
            <p className="cform-error" role="alert">
              Something went wrong — email me at {CONTACT_EMAIL} or text
              845-549-4425 and I&apos;ll get right back to you.
            </p>
          )}
          <div className="qnav-row qnav-row-bottom">
            <button type="button" className="qsecondary" onClick={() => setStep("basics")}>
              ← Back to basics
            </button>
          </div>
          </div>
        </>
      )}
    </form>
  );
}
