"use client";

import { useMemo, useState } from "react";

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
    price: `$${tier.amount.toLocaleString("en-US")}`,
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
      ? { name: "Engagement Session + Film", price: "$450", includes: "60 min on location, 40+ edited images plus a 60–90 sec film — $100 credits toward your wedding booking." }
      : { name: "Engagement Session", price: "$250", includes: "60 min on location, 40+ edited images — $100 credits toward your wedding booking." };
  }
  if (isPortrait) {
    const rec = tierRecommendation(PORTRAIT_TIERS, ceiling);
    if (hasVideo)
      rec.note = [rec.note, "Video for portrait sessions is custom — mention it in the message and I'll quote it."].filter(Boolean).join(" ");
    return rec;
  }
  if (isHeadshots) {
    return { name: "Headshot Session", price: "$100 / person", includes: "20 min, two retouched images sized for LinkedIn and web.", note: "Booking for a team? On-site team session: $400 covers up to five people, then $75 per person after — mention your headcount in the message." };
  }
  if (isBrand) {
    if (both) return { name: "Content Day · photo & video", price: "$700", includes: "Half-day at your business: 40+ edited images plus a 90-sec promo and 3 vertical reels, licensed for web and social.", note: "Saves $100 vs. booking separately. Want fresh content on repeat? Monthly plans from $500/mo." };
    if (hasVideo) return { name: "Promo Package · video", price: "$450", includes: "90-sec promo film plus 3 vertical reels, licensed music, one revision round.", note: "Monthly content plans from $500/mo." };
    return { name: "Content Shoot · photo", price: "$350", includes: "Half-day shoot, 40+ edited images with a web + social license.", note: "Monthly content plans from $500/mo." };
  }
  if (isEvent) {
    if (both) return { name: "Event Coverage · photo & video", price: "from $600", includes: "2-hour minimum with full gallery and an edited event recap video.", note: "Saves $100 vs. booking separately. Additional hours $125 each." };
    if (hasVideo) return { name: "Event Coverage · video", price: "from $400", includes: "2-hour minimum, edited event recap video delivered within two weeks.", note: "Additional hours $125 each." };
    return { name: "Event Coverage · photo", price: "from $300", includes: "2-hour minimum, full edited gallery delivered within two weeks.", note: "Additional hours $125 each." };
  }
  return null;
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

export default function QuoteForm({ initialService = "" }) {
  const [services, setServices] = useState(initialService);
  const [eventType, setEventType] = useState("");
  const [projectType, setProjectType] = useState("");
  const [budgetRange, setBudgetRange] = useState("");
  const [status, setStatus] = useState("idle");
  const [sentMatch, setSentMatch] = useState(null);

  const hasPhoto = services === "photography" || services === "both";
  const hasVideo = services === "videography" || services === "both";

  const match = useMemo(
    () => (services ? recommendRothPackage({ services, eventType, projectType, budgetRange }) : null),
    [services, eventType, projectType, budgetRange]
  );

  async function handleSubmit(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    if (data._honey) return;
    setStatus("sending");
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          _subject: `Quote request — ${data.firstName} ${data.lastName} (${services})`,
          _template: "table",
          services,
          "session type": hasPhoto ? label(EVENT_OPTIONS, eventType) : undefined,
          "project type": hasVideo ? label(PROJECT_OPTIONS, projectType) : undefined,
          name: `${data.firstName} ${data.lastName}`,
          email: data.email,
          phone: data.phone,
          date: data.date,
          location: data.location,
          budget: label(BUDGET_OPTIONS, budgetRange),
          story: data.story,
          "must-haves": data.mustHaves,
          "matched package": match ? `${match.name} (${match.price})` : "none",
        }),
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
            ? `Based on what you shared, ${sentMatch.name} at ${sentMatch.price} looks like your best fit — I'll confirm the exact quote when I reach out shortly.`
            : "Thank you — I'll be in touch shortly to talk details and check availability."}
        </p>
      </div>
    );
  }

  return (
    <form className="quote-form" onSubmit={handleSubmit}>
      <div className="qsvc" role="radiogroup" aria-label="What do you need?">
        {SERVICES.map(([value, title, desc]) => (
          <button
            type="button"
            key={value}
            className={services === value ? "on" : ""}
            onClick={() => setServices(value)}
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
              <label htmlFor="q-phone">Phone</label>
              <input id="q-phone" name="phone" type="tel" autoComplete="tel" />
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
            {services !== "both" && (
              <div>
                <label htmlFor="q-date">Date (if you have one)</label>
                <input id="q-date" name="date" type="date" />
              </div>
            )}
          </div>
          {services === "both" && (
            <div className="row">
              <div>
                <label htmlFor="q-date2">Date (if you have one)</label>
                <input id="q-date2" name="date" type="date" />
              </div>
              <div>
                <label htmlFor="q-loc2">Location or venue</label>
                <input id="q-loc2" name="location" />
              </div>
            </div>
          )}
          <div className="row">
            {services !== "both" && (
              <div>
                <label htmlFor="q-loc">Location or venue</label>
                <input id="q-loc" name="location" />
              </div>
            )}
            <div>
              <label htmlFor="q-budget">Budget range</label>
              <select id="q-budget" value={budgetRange} onChange={(e) => setBudgetRange(e.target.value)}>
                {BUDGET_OPTIONS.map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
          </div>
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
        </>
      )}
    </form>
  );
}
