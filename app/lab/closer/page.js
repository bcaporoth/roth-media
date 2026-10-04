// Lab · CLOSER — the best-selling homepage. Every screen answers a buyer
// question in order: what is it, is it good, who says so, what does it cost,
// how do I book. One audience switch (Wedding / Business / Family) re-skins
// the whole page. Served at /lab/closer; not indexed.
import Link from "next/link";
import "./closer.css";
import BrandMark from "../../../components/BrandMark";
import CloserMotion from "../../../components/lab/closer/CloserMotion";
import CloserFilm from "../../../components/lab/closer/CloserFilm";
import CloserPrice from "../../../components/lab/closer/CloserPrice";
import { EMAIL, SOCIAL, CALENDLY, PHONE, OWNER_NAME } from "../../../lib/site";
import { PACKAGES, ADDONS, TRAVEL, money } from "../../../lib/packages";
import { CAMPAIGN } from "../../../lib/campaign";
import { autoDeal } from "../../../lib/deals";
import { videoUrl } from "../../../lib/media";

export const metadata = {
  title: "Homepage lab — Closer",
  robots: { index: false, follow: false },
};

// The launch offer has an end date — re-render hourly so it drops off on time.
export const revalidate = 3600;

const TEL = "tel:+18455494425";
const SMS = "sms:+18455494425";
const smsWith = (body) => `${SMS}?&body=${encodeURIComponent(body)}`;

const [PHOTO, FILM] = PACKAGES.wedding;
const biz = (id) => PACKAGES.business.find((p) => p.id === id);
const PORTRAIT = PACKAGES.family[0];
const wAddon = (id) => ADDONS.wedding.find((a) => a.id === id);
const bAddon = (id) => ADDONS.business.find((a) => a.id === id);
const fromPrice = (list) => Math.min(...list.map((p) => p.price));

const AUD = {
  wedding: {
    door: "Weddings",
    doorSub: `Photo ${money(PHOTO.price)} · Film ${money(FILM.price)}`,
    from: fromPrice(PACKAGES.wedding),
    quote: "/quote?for=wedding",
    act: "Check my date",
    actWide: "Check my date",
  },
  business: {
    door: "Business",
    doorSub: `Content Days from ${money(fromPrice(PACKAGES.business))}`,
    from: fromPrice(PACKAGES.business),
    quote: "/quote?for=business",
    act: "Book a call",
    actWide: "Book a 15-minute call",
  },
  family: {
    door: "Family & portraits",
    doorSub: `1 hour · 30+ photos · ${money(PORTRAIT.price)}`,
    from: fromPrice(PACKAGES.family),
    quote: "/quote?for=portraits",
    act: "Text Brandon",
    actWide: "Text Brandon",
  },
};
const ORDER = ["wedding", "business", "family"];

const HERO = {
  wedding: {
    img: "/photos/25-wedding-the-veil-took-flight.jpg",
    alt: "A bride and groom in a field at sunset, her veil lifting in the wind",
    cap: "The veil took flight",
    kick: "Wedding films + photography",
    h1: ["Your wedding,", "told the way", "it felt."],
    sub: `A film with your real vows and ceremony audio, ${money(FILM.price)}. Full-day photography, ${money(PHOTO.price)}. See your number before you talk to anyone.`,
  },
  business: {
    img: "/photos/03-gym-demand-greatness.jpg",
    imgTall: "/photos/01-gym-athlete-chalk-and-focus.jpg",
    capTall: "Chalk and focus",
    alt: "A coach and a young lifter smiling at a meet",
    cap: "Demand greatness",
    kick: "Video + photo for local business",
    h1: ["Your people.", "Your work.", "On camera."],
    sub: `One Content Day at your place: a promo, 8 reels and photos that bring customers through the door. From ${money(fromPrice(PACKAGES.business))}, delivered within two weeks.`,
  },
  family: {
    img: "/photos/07-senior-portrait-last-light.jpg",
    alt: "A senior portrait in low evening sun",
    cap: "Last light",
    kick: "Family, senior + engagement portraits",
    h1: ["An hour with", "your people."],
    sub: `Photos you’ll actually frame. Families, seniors, engagements: 30+ edited photos, sneak peeks within 48 hours. ${money(PORTRAIT.price)}.`,
  },
};

// What each audience can hold Brandon to. Every line is from lib/packages.js
// or the /weddings and /business FAQs.
const HOLD = {
  wedding: [
    ["A sneak peek within 48 hours", "Photos or video, ready to post while everyone’s still talking about the day."],
    ["Your real vows, in the film", "The full ceremony and the speeches, with clean audio."],
    ["The price, confirmed in writing", "The number you build is the number I confirm. No surprises."],
    ["Everything within six weeks", "In your own client account: a year of access, unlimited downloads."],
    ["Music you can post", "Licensed through Epidemic Sound; your films are cleared for socials and your website."],
    ["Plain travel rules", "Included within an hour of Corning, Waverly, Sayre or Athens."],
  ],
  business: [
    ["Delivered within two weeks", "Edited and sized for your website, Instagram, Facebook and TikTok."],
    ["One round of revisions", "Included in the price."],
    ["The price, confirmed in writing", "The number you build is the number I confirm. No surprises."],
    ["Your people, your work", "Shot at your place. Not stock footage."],
    ["Cleared for paid ads", "All music licensed through Epidemic Sound."],
    ["Leads sent straight to you", `If you add Facebook ads + lead generation (+${money(bAddon("ads").price)}).`],
  ],
  family: [
    ["Sneak peeks within 48 hours", "Ready to share."],
    ["30+ edited photos", "From one hour, at one location."],
    ["The price, confirmed in writing", `${money(PORTRAIT.price)} for the session. No surprises.`],
    ["No stiff, rigid posing", "I’ll guide you when you need it."],
    ["A year of access", "Your own client account, unlimited downloads."],
    ["Plain travel rules", "Included within an hour of Corning, Waverly, Sayre or Athens."],
  ],
};

// Real reviews go here: { quote, name, detail } — a couple’s names + venue, an
// owner + business, a family + town. The block renders only when this has
// entries, so nothing empty or invented is ever shown.
const REVIEWS = [];

// The full-bleed frame between the work and the promises.
const BLEED = {
  wedding: { img: "/photos/24-wedding-a-world-of-their-own.jpg", alt: "A couple alone on a wide hillside, in black and white", cap: "A world of their own", line: ["Candid.", "Unobtrusive.", "Yours."] },
  business: { img: "/photos/05-gym-quiet-before-the-lift.jpg", alt: "A lifter sitting in low light, hands together, before a lift", cap: "Quiet before the lift", line: ["Not stock", "footage."] },
  family: { img: "/photos/33-event-the-finish-line-hug.jpg", alt: "Two people in a tight hug at a finish line while a child claps behind them", cap: "The finish-line hug", line: ["Laughing.", "Moving.", "Themselves."] },
};

// The promises, as numbers. Every figure comes from lib/packages.js or the
// /weddings and /business FAQs. `proof` points at where to check it.
const PROMISES = {
  wedding: [
    { n: 48, unit: "hours", label: "to your sneak peek — photos or video, ready to post" },
    { pre: "200–", n: 400, unit: "photos", label: "fully edited, getting ready to last dance" },
    { n: 2, unit: "films", label: "plus your full ceremony and the speeches, clean audio" },
    { n: 6, unit: "weeks", label: "to full delivery, in your own client account" },
  ],
  business: [
    { n: 1, unit: "shoot day", label: "at your place — your people, your work, not stock footage" },
    { n: 8, unit: "reels", label: "vertical, sized for Instagram, Facebook and TikTok" },
    { pre: "15–", n: 30, unit: "photos", label: "edited, with a 45–90 second promo" },
    { n: 2, unit: "weeks", label: "to delivery — one round of revisions included" },
  ],
  family: [
    { n: 1, unit: "hour", label: "one location, whoever you’re celebrating" },
    { n: 30, post: "+", unit: "photos", label: "edited and yours to download" },
    { n: 48, unit: "hours", label: "to your sneak peeks, ready to share" },
    { n: 1, unit: "year", label: "of access to your full library, unlimited downloads" },
  ],
};

// One wedding day in order. Frames come from several real weddings.
const DAY = [
  { src: "/photos/16-wedding-final-touches.jpg", cap: "Final touches", part: "Getting ready", r: 1.5 },
  { src: "/photos/18-wedding-suiting-up-together.jpg", cap: "Suiting up together", part: "Getting ready", r: 1.5 },
  { src: "/photos/36-wedding-right-before-i-do.jpg", cap: "Right before I do", part: "Getting ready", r: 0.667 },
  { src: "/photos/38-wedding-walking-her-in.jpg", cap: "Walking her in", part: "Ceremony", r: 0.667 },
  { src: "/photos/39-wedding-sealed.jpg", cap: "Sealed", part: "Ceremony", r: 1.293 },
  { src: "/photos/40-wedding-just-married-mid-laugh.jpg", cap: "Just married, mid-laugh", part: "Just married", r: 1.5 },
  { src: "/photos/25-wedding-the-veil-took-flight.jpg", cap: "The veil took flight", part: "Portraits", r: 1.5 },
  { src: "/photos/22-wedding-the-first-dance.jpg", cap: "The first dance", part: "Reception", r: 0.667 },
  { src: "/photos/24-wedding-a-world-of-their-own.jpg", cap: "A world of their own", part: "Last light", r: 1.5 },
];

const BIZ_PHOTOS = [
  { src: "/photos/42-gym-coach-and-client.jpg", cap: "Coach and client" },
  { src: "/photos/01-gym-athlete-chalk-and-focus.jpg", cap: "Chalk and focus", tall: true },
  { src: "/photos/41-gym-mid-set-laughter.jpg", cap: "Mid-set laughter" },
  { src: "/photos/44-gym-the-master-trainer.jpg", cap: "The master trainer" },
];

const FAMILY_PHOTOS = [
  { src: "/photos/06-engagement-she-said-yes.jpg", cap: "She said yes", cat: "Engagement" },
  { src: "/photos/04-senior-portrait-golden-hour.jpg", cap: "Golden hour", cat: "Senior" },
  { src: "/photos/09-senior-portrait-through-the-lens.jpg", cap: "Through the lens", cat: "Senior" },
  { src: "/photos/07-senior-portrait-last-light.jpg", cap: "Last light", cat: "Senior" },
];

const STEPS = {
  wedding: [
    ["Build your quote online.", "Pick your package and add-ons — you see the real starting price in two minutes."],
    ["I confirm it in writing.", "Exact number, locked date, no surprises. The 30% retainer holds your date; the balance is due 14 days before."],
    ["Your day, delivered.", "Filmed candid and unobtrusive. Sneak peek within 48 hours, everything online within six weeks."],
  ],
  business: [
    ["Build your quote online.", "Pick a day and add-ons — real starting price in two minutes. Or book a 15-minute call first."],
    ["We plan the shoot.", "I confirm the number in writing and we map what your business needs on camera."],
    ["Post everything.", "Delivered within two weeks — edited, licensed, and sized for your website, ads and socials."],
  ],
  family: [
    ["Text me, or hold a date online.", "Tell me who’s in the photos, where you’re thinking, and the vibe."],
    ["I confirm it in writing.", `${money(PORTRAIT.price)} for the hour, one location — the exact number before we shoot.`],
    ["One easy hour.", "I’ll guide you when you need it. Sneak peeks within 48 hours, 30+ edited photos in your own client account."],
  ],
};

const FAQS = {
  wedding: [
    ["How much does a wedding photographer or videographer cost in the Twin Tiers?", `My prices are public: full-day Wedding Photography is ${money(PHOTO.price)} (200–400 fully edited photos) and full-day Wedding Videography is ${money(FILM.price)} (two short films, your full ceremony, and the speeches). Build your exact quote online in two minutes; I confirm the final number in writing before we shoot.`],
    ["When do we get everything?", "Sneak peeks land within 48 hours — photos or video, ready to post while everyone’s still talking about the day. Your full delivery follows online within six weeks, in your own client account: a year of access, unlimited downloads."],
    ["Can our guests share their photos with us?", `Yes — Guest photos & video messages is a ${money(wAddon("guest").price)} add-on. A QR card goes on every table; guests scan it, pick from their camera roll, and it lands in your private gallery. No app to download. They can record a 60-second video message for you too, and uploads stay open for a month after the wedding.`],
    ["Can we post our films anywhere? What about the music?", "Yes. All music is professionally licensed through Epidemic Sound, and your finished films are fully cleared for your socials, website, and online use."],
    ["Do you do engagement photos too?", `Yes — stack an engagement session onto your wedding for ${money(wAddon("engagement").price)}, perfect for save-the-dates and your wedding website.`],
    ["What areas do you serve?", `I’m local to the Valley — Sayre, Athens, and Waverly — and film weddings across the Twin Tiers, including Elmira, Corning, Towanda, and the surrounding area. ${TRAVEL.line}`],
  ],
  business: [
    ["What does a Content Day cost, and what do I get?", `A Full Content Day is ${money(biz("day").price)}: one shoot at your business, and you walk away with a 45–90 second promo, 8 vertical reels, and 15–30 edited photos, sized for your website, Instagram, Facebook, and TikTok. The Mini Content Day is ${money(biz("mini").price)}: 8 reels and 10–20 photos.`],
    ["How fast do I get my content?", "Everything is delivered within two weeks, edited and sized to post. One round of revisions is included."],
    ["Do you cover events?", `Yes — Event Coverage is ${money(biz("event").price)}: up to 3 hours of coverage, a 45–90 second highlight short, and a gallery of 50+ edited photos.`],
    ["Can you run ads with the videos?", `Yes — Facebook ads + lead generation is a ${money(bAddon("ads").price)} add-on: ads built from your videos, aimed at local customers, with leads sent straight to you.`],
    ["Can I use the videos in paid ads?", "Yes. All music is licensed through Epidemic Sound and your finished videos are cleared for your website, socials, and online advertising."],
    ["Do you build websites too?", `Yes — a full site built from your Content Day footage, photos, and words is ${money(bAddon("website").price)}, then ${money(bAddon("website").monthly)}/month to keep it running.`],
  ],
  family: [
    ["What does a portrait session cost?", `${money(PORTRAIT.price)}. One hour, one location, 30+ edited photos, and your own client account with a year of access and unlimited downloads.`],
    ["What kinds of sessions do you shoot?", "Engagements, seniors, families, couples — whatever you’re celebrating. Tell me who’s in the photos and I’ll suggest a spot and a time of day."],
    ["How soon do we see photos?", "Sneak peeks within 48 hours, ready to share."],
    ["Can we get more photos?", `Yes — twenty more edited photos from the same session is a ${money(ADDONS.family[0].price)} add-on.`],
    ["Where do you shoot?", TRAVEL.line],
  ],
};

const IDEAS = [
  ["A restaurant", "Friday night at full tilt — the kitchen firing, plates hitting the pass, regulars mid-laugh. Ends on the dish everyone orders."],
  ["A gym", "The 6 AM crew — chalk, last reps, a PR bell, your coaches actually coaching. The energy people join for."],
  ["A construction company", "One job, start to finish — day-one dirt to the final walkthrough. Proof of work that wins the next bid."],
];

// Open 2026 Saturdays (lib/campaign.js), minus any that have passed.
function openDates() {
  const now = Date.now();
  return CAMPAIGN.openDates2026.filter((d) => {
    const t = Date.parse(`${d.replace(/^\w+\s/, "")}, 2026 23:59:59`);
    return Number.isNaN(t) || t >= now;
  });
}

const Arrow = () => (
  <svg className="clo-arrow" viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><path d="M3 10h13M11 5l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
const IconText = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /></svg>
);
const IconCall = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M6 3h3l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v3a3 3 0 0 1-3 3A15 15 0 0 1 3 6a3 3 0 0 1 3-3z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /></svg>
);

function Q({ n, children }) {
  return (
    <p className="clo-q"><span>{n}</span>{children}</p>
  );
}

function Tabs({ label }) {
  return (
    <div className="clo-tabs" role="group" aria-label={label || "Show this page for"}>
      {ORDER.map((a) => (
        <button key={a} type="button" className="clo-tab" data-aud-set={a} aria-pressed={a === "wedding"}>
          {a === "family" ? "Family" : AUD[a].door}
        </button>
      ))}
    </div>
  );
}

function DateForm({ id, fine = true }) {
  return (
    <form className="clo-date" action="/quote" method="get">
      <input type="hidden" name="for" value="wedding" />
      <label htmlFor={id}>Your wedding date</label>
      <div className="clo-date-row">
        <input id={id} name="date" type="date" min={new Date().toISOString().slice(0, 10)} />
        <button type="submit" className="clo-btn clo-btn--acc">Check my date <Arrow /></button>
      </div>
      {fine && (
        <p className="clo-fine">
          Your date carries into the quote — nothing to retype. In a hurry? <a href={smsWith("Hi Brandon — is my wedding date open? It’s ")}>Text {PHONE}</a>; it comes straight to me.
        </p>
      )}
    </form>
  );
}

// The one primary action for each audience, repeated down the page.
function Action({ a, idPrefix, fine }) {
  if (a === "wedding") {
    return (
      <div className="clo-action" data-for="wedding">
        <DateForm id={`${idPrefix}-date`} fine={fine} />
        <Link href={AUD.wedding.quote} className="clo-link">No date yet? Build the quote first <Arrow /></Link>
      </div>
    );
  }
  if (a === "business") {
    return (
      <div className="clo-action" data-for="business">
        <div className="clo-btnrow">
          <a href={CALENDLY} target="_blank" rel="noopener noreferrer" className="clo-btn clo-btn--acc">Book a 15-minute call <Arrow /></a>
          <a href={smsWith("Hi Brandon — I’d like to talk about a Content Day for my business.")} className="clo-btn clo-btn--line">Text {PHONE}</a>
        </div>
        <Link href={AUD.business.quote} className="clo-link">Or build your quote online — two minutes <Arrow /></Link>
      </div>
    );
  }
  return (
    <div className="clo-action" data-for="family">
      <div className="clo-btnrow">
        <a href={smsWith("Hi Brandon — I’d like to book a portrait session.")} className="clo-btn clo-btn--acc">Text Brandon <Arrow /></a>
        <Link href={AUD.family.quote} className="clo-btn clo-btn--line">Hold a date online</Link>
      </div>
      <p className="clo-fine">{PHONE} — texts come straight to me.</p>
    </div>
  );
}

const DOOR_HREF = {
  wedding: "#start",
  business: CALENDLY,
  family: smsWith("Hi Brandon — I’d like to book a portrait session."),
};

export default function CloserHome() {
  const deal = autoDeal();
  const dealProp = deal ? { pct: deal.pct, endsLabel: deal.endsLabel } : null;
  const dates = openDates();

  return (
    <div className="lab-closer" data-aud="wedding">
      <CloserMotion />

      {/* ── One nav, same on every background ── */}
      <header className="clo-head">
        <Link href="/" className="clo-brand" aria-label="Roth Media — home">
          <span className="clo-brand-chip"><BrandMark /></span>
          <span className="clo-brand-text">Roth Media</span>
        </Link>
        <nav className="clo-nav" aria-label="Main navigation">
          <Link href="/weddings">Weddings</Link>
          <Link href="/business">Business</Link>
          <Link href="/quote?for=portraits">Portraits</Link>
          <a href={TEL} className="clo-nav-phone">{PHONE}</a>
          <Link href="/portal" className="clo-nav-dim">Client login</Link>
          <Link href="/quote" className="clo-btn clo-btn--ink clo-nav-quote">Get a quote</Link>
        </nav>
        <label className="clo-head-aud">
          <span className="clo-sr">Show this page for</span>
          <select data-aud-select defaultValue="wedding">
            <option value="wedding">Weddings</option>
            <option value="business">Business</option>
            <option value="family">Family</option>
          </select>
          <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true"><path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </label>
        <button type="button" className="clo-menu-btn" aria-expanded="false" aria-controls="clo-menu" aria-label="Menu">
          <span /><span />
        </button>
        <div className="clo-menu" id="clo-menu">
          <Link href="/quote" className="clo-btn clo-btn--ink">Get a quote <Arrow /></Link>
          <Link href="/weddings">Weddings</Link>
          <Link href="/business">Business</Link>
          <Link href="/quote?for=portraits">Family &amp; portraits</Link>
          <a href={SMS}>Text {PHONE}</a>
          <a href={TEL}>Call {PHONE}</a>
          <Link href="/portal" className="clo-nav-dim">Client login</Link>
        </div>
      </header>

      <main>
        {/* ── 01 · What is it? ── */}
        <section className="clo-hero" id="top">
          <div className="clo-hero-stage">
            <div className="clo-hero-media">
              {ORDER.map((a) => (
                <figure key={a} className="clo-hero-layer" data-layer={a}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <picture>
                    {HERO[a].imgTall && <source media="(max-width: 899px)" srcSet={HERO[a].imgTall} />}
                    <img src={HERO[a].img} alt={HERO[a].alt} fetchPriority={a === "wedding" ? "high" : "low"} />
                  </picture>
                  <figcaption>
                    {HERO[a].capTall ? <><span className="clo-cap-s">{HERO[a].capTall}</span><span className="clo-cap-w">{HERO[a].cap}</span></> : HERO[a].cap}
                  </figcaption>
                </figure>
              ))}
              <span className="clo-hero-shade" aria-hidden="true" />
            </div>

            <div className="clo-hero-copy">
              {ORDER.map((a) => (
                <p key={a} className="clo-hero-kick" data-for={a}>
                  <strong>{HERO[a].kick}</strong>
                  <span>Twin Tiers &amp; Finger Lakes · by {OWNER_NAME}</span>
                </p>
              ))}

              <h1 className="clo-h1">
                {ORDER.map((a) => (
                  <span key={a} className="clo-h1-set" data-for={a}>
                    {HERO[a].h1.map((line) => (
                      <span key={line} className="clo-mask"><span>{line}</span></span>
                    ))}
                  </span>
                ))}
              </h1>

              {ORDER.map((a) => (
                <p key={a} className="clo-hero-sub" data-for={a}>{HERO[a].sub}</p>
              ))}

              <div className="clo-hero-action">
                <div className="clo-action" data-for="wedding">
                  <DateForm id="hero-date" fine={false} />
                </div>
                <div className="clo-action" data-for="business">
                  <div className="clo-btnrow">
                    <a href={CALENDLY} target="_blank" rel="noopener noreferrer" className="clo-btn clo-btn--acc">Book a 15-minute call <Arrow /></a>
                    <a href={smsWith("Hi Brandon — I’d like to talk about a Content Day for my business.")} className="clo-btn clo-btn--line">Text {PHONE}</a>
                  </div>
                </div>
                <div className="clo-action" data-for="family">
                  <div className="clo-btnrow">
                    <a href={smsWith("Hi Brandon — I’d like to book a portrait session.")} className="clo-btn clo-btn--acc">Text Brandon <Arrow /></a>
                    <Link href={AUD.family.quote} className="clo-btn clo-btn--line">Hold a date online</Link>
                  </div>
                </div>
                <a href="#film" className="clo-hero-play" data-for="wedding">
                  <span aria-hidden="true"><svg viewBox="0 0 24 24" width="14" height="14"><path d="M8 5v14l11-7z" fill="currentColor" /></svg></span>
                  Watch Matt &amp; April’s film
                </a>
              </div>
            </div>
          </div>

          {/* Three doors: each has its price and its own next step. */}
          <div className="clo-doors" role="group" aria-label="What are you here for?">
            {ORDER.map((a) => (
              <div key={a} className="clo-door" data-door={a}>
                <button type="button" className="clo-door-pick" data-aud-set={a} aria-pressed={a === "wedding"}>
                  <strong>{AUD[a].door}</strong>
                  <span className="clo-door-sub">{AUD[a].doorSub}</span>
                </button>
                <a
                  href={DOOR_HREF[a]}
                  className="clo-door-act"
                  data-aud-set={a}
                  {...(a === "business" ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                >
                  <span className="clo-door-act-s">{AUD[a].act}</span>
                  <span className="clo-door-act-w">{AUD[a].actWide}</span>
                  <Arrow />
                </a>
              </div>
            ))}
          </div>
        </section>

        {/* ── Start here: the one action, straight under the first screen ── */}
        <section className="clo-start" id="start" aria-label="Start here">
          <div className="clo-start-in" data-for="wedding">
            <div className="clo-start-main">
              <p className="clo-start-k">Start here</p>
              <h2 className="clo-h3">Is your date open?</h2>
              <DateForm id="start-date" />
            </div>
            <div className="clo-start-side">
              {dates.length > 0 && (
                <>
                  <p className="clo-start-k">2026 Saturdays still open</p>
                  <ul className="clo-chips">
                    {dates.map((d) => (
                      <li key={d}><Link href={`/quote?for=wedding&date=${encodeURIComponent(`${d}, 2026`)}`}>{d.replace(/^Sat\s/, "")}</Link></li>
                    ))}
                  </ul>
                </>
              )}
              <p className="clo-start-note">
                <strong>2027, or a Friday or Sunday?</strong> Enter any date. A 30% retainer holds it; the balance isn’t due until 14 days before.
              </p>
            </div>
          </div>

          <div className="clo-start-in" data-for="business">
            <div className="clo-start-main">
              <p className="clo-start-k">Start here</p>
              <h2 className="clo-h3">Fifteen minutes, no pitch deck.</h2>
              <p className="clo-start-p">The prices are on this page: a Mini Content Day is {money(biz("mini").price)}, a Full Content Day {money(biz("day").price)}, an event {money(biz("event").price)}. Call or text and I’ll tell you what I’d shoot at your place.</p>
              <div className="clo-btnrow">
                <a href={CALENDLY} target="_blank" rel="noopener noreferrer" className="clo-btn clo-btn--acc">Book a 15-minute call <Arrow /></a>
                <a href={smsWith("Hi Brandon — I’d like to talk about a Content Day for my business.")} className="clo-btn clo-btn--line">Text {PHONE}</a>
              </div>
            </div>
            <div className="clo-start-side">
              <p className="clo-start-k">Or we’ve already met</p>
              <p className="clo-start-quote">“Odds are I’ve already walked into your place on my day off, asking if I could shoot something for you.”</p>
              <a href={smsWith("Hi Brandon — come by the shop. Here’s where we are:")} className="clo-link">Tell me where to stop in <Arrow /></a>
            </div>
          </div>

          <div className="clo-start-in" data-for="family">
            <div className="clo-start-main">
              <p className="clo-start-k">Start here</p>
              <h2 className="clo-h3">Text me who’s in the photos.</h2>
              <p className="clo-start-p">Tell me who, roughly where, and the vibe. I’ll suggest a spot and a time of day, and confirm the {money(PORTRAIT.price)} in writing before we shoot.</p>
              <div className="clo-btnrow">
                <a href={smsWith("Hi Brandon — I’d like to book a portrait session.")} className="clo-btn clo-btn--acc">Text Brandon <Arrow /></a>
                <Link href={AUD.family.quote} className="clo-btn clo-btn--line">Hold a date online</Link>
              </div>
            </div>
            <div className="clo-start-side">
              <p className="clo-start-k">What {money(PORTRAIT.price)} buys</p>
              <ul className="clo-start-list">
                <li>One hour, one location</li>
                <li>30+ edited photos</li>
                <li>Sneak peeks within 48 hours, ready to share</li>
                <li>A year of access to your full library, unlimited downloads</li>
              </ul>
            </div>
          </div>

          {deal && (
            <p className="clo-start-offer">
              <strong>Launch offer</strong> {deal.pct}% off wedding and portrait shoots booked by {deal.endsLabel}. It’s applied in your quote automatically.
            </p>
          )}
        </section>

        {/* ── The promises, in numbers ── */}
        <section className="clo-promises" aria-label="What you get, in numbers">
          {ORDER.map((a) => (
            <ul key={a} className="clo-promise-list" data-for={a}>
              {PROMISES[a].map((p) => (
                <li key={p.unit + p.label} className="clo-rise">
                  <p className="clo-num">
                    {p.pre && <span className="clo-num-pre">{p.pre}</span>}
                    <span data-count={p.n}>{p.n}</span>
                    {p.post && <span>{p.post}</span>}
                    <em>{p.unit}</em>
                  </p>
                  <p className="clo-num-label">{p.label}</p>
                </li>
              ))}
            </ul>
          ))}
          <p className="clo-promises-foot">
            Every number here is in the price. <a href="#price">See the price <Arrow /></a>
          </p>
        </section>

        {/* ── 02 · Is it any good? ── */}
        <section className="clo-work" id="work">
          <div className="clo-sec-head">
            <div>
              <Q n="02">Is it any good?</Q>
              <h2 className="clo-h2 clo-rise">
                <span data-for="wedding">Watch one. Then walk the day.</span>
                <span data-for="business">Made for the feed. Watch three.</span>
                <span data-for="family">People, looking like themselves.</span>
              </h2>
            </div>
            <Tabs label="Show work for" />
          </div>

          {/* Weddings */}
          <div data-for="wedding">
            <div className="clo-feature clo-rise" id="film">
              <CloserFilm
                src={videoUrl("/matt-april-wedding.mp4")}
                poster="/matt-april-cover.jpg"
                title="Matt & April"
                sub="Wedding sneak peek · September 2026"
                alt="Matt and April laughing with family on the lawn after their ceremony"
                feature
              />
              <div className="clo-claim">
                <p className="clo-claim-k">The claim</p>
                <p className="clo-claim-t">Your real vows and ceremony audio, clean, in the film.</p>
                <p className="clo-claim-k">The proof</p>
                <p className="clo-claim-p">Matt &amp; April’s sneak peek — press play, sound on. A sneak peek like this lands within 48 hours.</p>
              </div>
            </div>

            <div className="clo-day">
              <div className="clo-day-head clo-rise">
                <h3 className="clo-h3">A wedding day, start to finish.</h3>
                <p>Swipe the photos or drag the bar. Frames from real weddings, in the order a day runs.</p>
              </div>
              <div className="clo-strip" data-strip tabIndex={0} aria-label="Wedding photographs, in day order">
                {DAY.map((d, i) => (
                  <figure key={d.src} className="clo-frame" style={{ "--r": d.r }} data-part={d.part} data-cap={d.cap}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={d.src} alt={d.cap} loading="lazy" draggable="false" />
                    <figcaption><small>{String(i + 1).padStart(2, "0")} · {d.part}</small><strong>{d.cap}</strong></figcaption>
                  </figure>
                ))}
                <a href="#price" className="clo-frame clo-frame--end">
                  <span>Yours next?</span>
                  <strong>See what it costs <Arrow /></strong>
                </a>
              </div>
              <div className="clo-scrub">
                <button type="button" className="clo-scrub-btn" data-strip-prev aria-label="Previous photo">
                  <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><path d="M12 4l-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
                <div className="clo-scrub-track">
                  <input type="range" min="0" max="1000" defaultValue="0" step="1" data-strip-range aria-label="Scrub through the day" />
                  <div className="clo-scrub-parts" aria-hidden="true">
                    <span>Getting ready</span><span>Ceremony</span><span>Portraits</span><span>Reception</span>
                  </div>
                </div>
                <button type="button" className="clo-scrub-btn" data-strip-next aria-label="Next photo">
                  <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><path d="M8 4l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
              </div>
            </div>
          </div>

          {/* Business */}
          <div data-for="business">
            <div className="clo-reels clo-rise">
              <CloserFilm
                src={videoUrl("/reels/nicole-golden-zumba-promo.mp4")}
                poster="/reels/nicole-golden-zumba-promo-poster.jpg"
                title="Nicole Golden"
                sub="Zumba class promo"
              />
              <CloserFilm
                src={videoUrl("/reels/womens-powerlifting-club.mp4")}
                poster="/reels/womens-powerlifting-club-poster.jpg"
                title="Women’s Powerlifting Club"
                sub="Gym promo"
              />
              <CloserFilm
                vertical
                src={videoUrl("/reels/bake-against-the-grain.mp4")}
                poster="/reels/bake-against-the-grain-poster.jpg"
                title="Bake Against the Grain"
                sub="Brand film · vertical for Instagram & TikTok"
              />
              <div className="clo-ideas clo-biz-row2">
                <p className="clo-ideas-k">What would yours be?</p>
                <ul>
                  {IDEAS.map(([t, d]) => (
                    <li key={t}><strong>{t}</strong><span>{d}</span></li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="clo-bizgrid">
              {BIZ_PHOTOS.map((p) => (
                <figure key={p.src} className={`clo-shot clo-rise${p.tall ? " clo-shot--tall" : ""}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.src} alt={p.cap} loading="lazy" />
                  <figcaption>{p.cap}</figcaption>
                </figure>
              ))}
            </div>
          </div>

          {/* Family & portraits */}
          <div data-for="family">
            <div className="clo-famgrid">
              {FAMILY_PHOTOS.map((p) => (
                <figure key={p.src} className="clo-shot clo-rise">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.src} alt={`${p.cat} portrait — ${p.cap}`} loading="lazy" />
                  <figcaption><small>{p.cat}</small>{p.cap}</figcaption>
                </figure>
              ))}
            </div>
            <p className="clo-note clo-rise">
              Seniors and engagements shown. Family sessions are the same hour, the same {money(PORTRAIT.price)}, and the same rule: I’ll guide you when you need it, but I don’t do stiff, rigid posing.
            </p>
          </div>
        </section>

        {/* ── 03 · Who says so? One full-bleed frame, then what's in writing ── */}
        <section className="clo-proof" id="proof">
          <div className="clo-bleed" data-bleed-wrap>
            {ORDER.map((a) => (
              <figure key={a} className="clo-bleed-frame" data-for={a}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <span className="clo-bleed-img"><img src={BLEED[a].img} alt={BLEED[a].alt} loading="lazy" /></span>
                <p className="clo-bleed-line" aria-hidden="true">
                  {BLEED[a].line.map((l) => <span key={l}>{l}</span>)}
                </p>
                <figcaption>{BLEED[a].cap}</figcaption>
              </figure>
            ))}
          </div>

          <div className="clo-proof-in">
            <div className="clo-sec-head">
              <div>
                <Q n="03">Who says so?</Q>
                <h2 className="clo-h2 clo-rise">What you can hold me to.</h2>
              </div>
              <p className="clo-sec-side clo-rise">I’m not going to quote reviews I can’t show you. Here’s the work, and here’s what goes in writing.</p>
            </div>

            {REVIEWS.length > 0 && (
              <ul className="clo-reviews">
                {REVIEWS.map((r) => (
                  <li key={r.name} className="clo-rise">
                    <blockquote>“{r.quote}”</blockquote>
                    <p><strong>{r.name}</strong>{r.detail}</p>
                  </li>
                ))}
              </ul>
            )}

            {ORDER.map((a) => (
              <ol key={a} className="clo-hold" data-for={a}>
                {HOLD[a].map(([t, d], i) => (
                  <li key={t} className="clo-rise">
                    <span>{String(i + 1).padStart(2, "0")}</span>
                    <strong>{t}</strong>
                    <p>{d}</p>
                  </li>
                ))}
              </ol>
            ))}

            <div className="clo-ledger clo-rise">
              <p className="clo-ledger-k">Recent work you can watch on this page</p>
              <ul>
                <li><a href="#work" data-aud-set="wedding"><strong>Matt &amp; April</strong><span>Wedding sneak peek · September 2026</span><em>Watch</em></a></li>
                <li><a href="#work" data-aud-set="business"><strong>Nicole Golden</strong><span>Zumba class promo</span><em>Watch</em></a></li>
                <li><a href="#work" data-aud-set="business"><strong>Women’s Powerlifting Club</strong><span>Gym promo</span><em>Watch</em></a></li>
                <li><a href="#work" data-aud-set="business"><strong>Bake Against the Grain</strong><span>Brand film</span><em>Watch</em></a></li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── 04 · What does it cost? ── */}
        <section className="clo-price" id="price">
          <div className="clo-sec-head">
            <div>
              <Q n="04">What does it cost?</Q>
              <h2 className="clo-h2 clo-rise">Real prices. Add it up yourself.</h2>
            </div>
            <Tabs label="Show prices for" />
          </div>

          <div data-for="wedding">
            <CloserPrice aud="wedding" quoteFor="wedding" packages={[FILM, PHOTO]} addons={ADDONS.wedding.filter((a) => !a.hidden)} deal={dealProp} cta="Continue with this quote" fine="A 30% retainer holds your date; the balance is due 14 days before." />
          </div>
          <div data-for="business">
            <CloserPrice aud="business" quoteFor="business" packages={PACKAGES.business} addons={ADDONS.business} deal={dealProp} cta="Continue with this quote" fine="Paid once. Delivered within two weeks, one round of revisions included." />
          </div>
          <div data-for="family">
            <CloserPrice aud="family" quoteFor="portraits" packages={PACKAGES.family} addons={ADDONS.family} deal={dealProp} cta="Hold a date with this quote" fine="One hour, one location. Sneak peeks within 48 hours." />
          </div>

          <p className="clo-travel clo-rise"><strong>Travel.</strong> {TRAVEL.line}</p>
        </section>

        {/* ── 05 · How do I book? ── */}
        <section className="clo-book" id="book">
          <div className="clo-sec-head">
            <div>
              <Q n="05">How do I book?</Q>
              <h2 className="clo-h2 clo-rise">Three steps. The number first.</h2>
            </div>
          </div>
          <div className="clo-book-grid">
            <div className="clo-steps-wrap">
              <span className="clo-steps-line" aria-hidden="true"><span /></span>
              {ORDER.map((a) => (
                <ol key={a} className="clo-steps" data-for={a}>
                  {STEPS[a].map(([t, d], i) => (
                    <li key={t} className="clo-rise">
                      <span className="clo-step-n">{i + 1}</span>
                      <div><strong>{t}</strong><p>{d}</p></div>
                    </li>
                  ))}
                </ol>
              ))}
            </div>
            <div className="clo-book-card clo-rise">
              <p className="clo-book-k">Start here</p>
              {ORDER.map((a) => <Action key={a} a={a} idPrefix="book" />)}
            </div>
          </div>
        </section>

        {/* ── 06 · Who shows up? ── */}
        <section className="clo-about" id="about">
          <div className="clo-about-photo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/about-brandon.png" alt="Brandon Roth" loading="lazy" />
          </div>
          <div className="clo-about-text">
            <Q n="06">Who shows up?</Q>
            <h2 className="clo-h2 clo-rise">Hi, I’m Brandon.</h2>
            <blockquote className="clo-pull clo-rise">“I’ll guide you when you need it, but I don’t do stiff, rigid posing.”</blockquote>
            <p className="clo-rise">
              I’m all about candid work that feels real. The good moments usually happen in the flow — when you’re laughing, moving, working, or forgetting the camera is even there.
            </p>
            <div className="clo-offer clo-rise">
              <p className="clo-offer-k">If you run a business around here</p>
              <p className="clo-offer-t">“I probably walked into your store in my free time to see if I could shoot something for you, lol. I just love the random acts of getting to know people and connecting with them — and helping everybody prosper.”</p>
              <a href={smsWith("Hi Brandon — come by the shop. Here’s where we are:")} className="clo-link">Haven’t made it to yours yet? Tell me where <Arrow /></a>
            </div>
            <p className="clo-sig clo-rise">— {OWNER_NAME}, local to the Valley</p>
          </div>
        </section>

        {/* ── Questions ── */}
        <section className="clo-faq" id="faq">
          <div className="clo-sec-head">
            <div>
              <Q n="07">Anything else?</Q>
              <h2 className="clo-h2 clo-rise">
                <span data-for="wedding">Questions couples ask.</span>
                <span data-for="business">Questions owners ask.</span>
                <span data-for="family">Questions families ask.</span>
              </h2>
            </div>
            <Tabs label="Show questions for" />
          </div>
          {ORDER.map((a) => (
            <div key={a} className="clo-faq-list" data-for={a}>
              {FAQS[a].map(([q, ans]) => (
                <details key={q}>
                  <summary><span>{q}</span><i aria-hidden="true" /></summary>
                  <p>{ans}</p>
                </details>
              ))}
            </div>
          ))}
        </section>

        {/* ── The close ── */}
        <section className="clo-close">
          <div className="clo-close-bg" aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/photos/40-wedding-just-married-mid-laugh.jpg" alt="" loading="lazy" />
          </div>
          <div className="clo-close-in">
            <p className="clo-close-big" data-clo-slide>
              <span data-for="wedding">See your number before you talk to anyone.</span>
              <span data-for="business">Real prices. Your place. Two weeks.</span>
              <span data-for="family">An hour. Your people. Done right.</span>
            </p>
            <div className="clo-close-action">
              {ORDER.map((a) => <Action key={a} a={a} idPrefix="close" />)}
            </div>
          </div>
        </section>
      </main>

      <footer className="clo-foot">
        <div className="clo-foot-top">
          <Link href="/" className="clo-brand">
            <span className="clo-brand-chip"><BrandMark /></span>
            <span className="clo-brand-text">Roth Media</span>
          </Link>
          <p>Waverly, NY — serving the Twin Tiers and Finger Lakes</p>
        </div>
        <div className="clo-foot-cols">
          <div>
            <p className="clo-foot-k">Talk</p>
            <a href={SMS}>Text {PHONE}</a>
            <a href={TEL}>Call {PHONE}</a>
            <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
          </div>
          <div>
            <p className="clo-foot-k">Book</p>
            <Link href="/weddings">Weddings</Link>
            <Link href="/business">Business</Link>
            <Link href="/quote?for=portraits">Family &amp; portraits</Link>
            <Link href="/quote">Get a quote</Link>
          </div>
          <div>
            <p className="clo-foot-k">Follow</p>
            {SOCIAL.map((s) => (
              <a key={s.id} href={s.url} target="_blank" rel="noopener noreferrer">{s.label}</a>
            ))}
          </div>
          <div>
            <p className="clo-foot-k">Clients</p>
            <Link href="/portal">Client login</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
          </div>
        </div>
        <p className="clo-foot-base">© {new Date().getFullYear()} Roth Media</p>
      </footer>

      {/* ── Phone action bar: the one primary action, then text and call ── */}
      <div className="clo-bar" role="region" aria-label="Quick actions">
        <a href="#start" className="clo-btn clo-bar-main" data-for="wedding">Check my date <Arrow /></a>
        <a href={CALENDLY} target="_blank" rel="noopener noreferrer" className="clo-btn clo-bar-main" data-for="business">Book a 15-min call <Arrow /></a>
        <a href={smsWith("Hi Brandon — I’d like to book a portrait session.")} className="clo-btn clo-bar-main" data-for="family">Text Brandon · {money(PORTRAIT.price)} <Arrow /></a>
        <a href={SMS} className="clo-bar-side" aria-label={`Text Brandon at ${PHONE}`}><IconText /><span>Text</span></a>
        <a href={TEL} className="clo-bar-side" aria-label={`Call Brandon at ${PHONE}`}><IconCall /><span>Call</span></a>
      </div>
    </div>
  );
}
