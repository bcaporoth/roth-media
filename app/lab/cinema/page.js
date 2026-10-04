// Lab entry — CINEMA. A film-first, dark homepage: letterboxed opening shot,
// chapters you scrub through, prices on the title cards. Not indexed.
import Link from "next/link";
import "./cinema.css";
import BrandMark from "../../../components/BrandMark";
import CinemaMotion from "../../../components/lab/cinema/CinemaMotion";
import Player from "../../../components/lab/cinema/Player";
import { EMAIL, SOCIAL, CALENDLY, PHONE, OWNER_NAME } from "../../../lib/site";
import { PACKAGES, ADDONS, TRAVEL, money } from "../../../lib/packages";
import { CAMPAIGN } from "../../../lib/campaign";
import { autoDeal, applyDeal } from "../../../lib/deals";
import { videoUrl } from "../../../lib/media";

export const metadata = {
  title: "Homepage lab — Cinema",
  robots: { index: false, follow: false },
};

// The offer line reads the clock at render — refresh hourly.
export const revalidate = 3600;

const PHONE_HREF = "tel:+18455494425";
const SMS_HREF = "sms:+18455494425";

const [W_PHOTO, W_FILM] = PACKAGES.wedding;
const BIZ = PACKAGES.business;
const PORTRAIT = PACKAGES.family[0];
const bizFrom = Math.min(...BIZ.map((p) => p.price));
const wedFrom = Math.min(...PACKAGES.wedding.map((p) => p.price));

const DOORS = [
  {
    n: "01", id: "weddings", name: "Weddings", sub: `Film ${money(W_FILM.price)} · Photography ${money(W_PHOTO.price)}`,
    from: wedFrom, cta: "Check my date", href: "#date", primary: true,
  },
  {
    n: "02", id: "business", name: "Business", sub: "Promo, reels & photos, shot at your place",
    from: bizFrom, cta: "Book a 15-min call", href: CALENDLY, external: true,
  },
  {
    n: "03", id: "families", name: "Families", sub: "Seniors & couples too · 1 hour, 30+ photos",
    from: PORTRAIT.price, cta: "Text Brandon", href: SMS_HREF,
  },
];

const CHAPTERS = [
  { id: "top", label: "Opening" },
  { id: "weddings", label: "Weddings" },
  { id: "promises", label: "Promises" },
  { id: "wedding-prices", label: "Wedding prices" },
  { id: "business", label: "Business" },
  { id: "families", label: "Portraits" },
  { id: "quote", label: "Your number" },
  { id: "brandon", label: "Brandon" },
];

// The wedding reel. Wide stills on desktop, tall stills on phones — each
// frame is a deliberate pair so nobody's face gets cropped.
const REEL = [
  {
    wide: { src: "/photos/25-wedding-the-veil-took-flight.jpg", cap: "The veil took flight", pos: "60% 42%" },
    tall: { src: "/photos/36-wedding-right-before-i-do.jpg", cap: "Right before “I do”", pos: "50% 30%" },
  },
  {
    wide: { src: "/photos/39-wedding-sealed.jpg", cap: "Sealed", pos: "50% 36%" },
    tall: { src: "/photos/38-wedding-walking-her-in.jpg", cap: "Walking her in", pos: "55% 30%" },
  },
  {
    wide: { src: "/photos/24-wedding-a-world-of-their-own.jpg", cap: "A world of their own", pos: "50% 62%" },
    tall: { src: "/photos/22-wedding-the-first-dance.jpg", cap: "The first dance", pos: "50% 70%" },
  },
];

const PROMISES = [
  { k: "48 hours", v: "A sneak peek within 48 hours — ready to share while everyone’s still talking about the day." },
  { k: "Real audio", v: "Your real vows, your full ceremony and the speeches, with clean audio." },
  { k: "In writing", v: "I confirm the exact number in writing before we shoot. Locked date, no surprises." },
  { k: "30% holds it", v: "A 30% retainer holds your date; the balance is due 14 days before. One free reschedule with 30 days’ notice." },
  { k: "Your guests", v: "A QR card on every table — guests send their photos and 60-second video messages to your private gallery. No app." },
  { k: "Licensed", v: "All music licensed through Epidemic Sound; your films are cleared for socials, your website and ads." },
];

// Real reviews and venue names go here when Brandon has them. Until then
// these stay empty and the page shows nothing in their place — never a
// placeholder, never an invented quote.
// { quote: "", who: "", what: "" }
const REVIEWS = [];
const VENUES = [];

const FILM_FACTS = [
  { k: "Two films", v: "Short & sweet, 1–3 minutes each, custom made from your day" },
  { k: "Full ceremony", v: "The whole ceremony and the speeches, with clean audio" },
  { k: "48 hours", v: "A sneak peek lands within 48 hours" },
];

const IDEAS = [
  { who: "A construction company", what: "One job, start to finish — day-one dirt to the final walkthrough. Proof of work that wins the next bid." },
  { who: "A restaurant", what: "Friday night at full tilt — the kitchen firing, plates hitting the pass. Ends on the dish everyone orders." },
  { who: "A gym", what: "The 6 AM crew — chalk, last reps, a PR bell, your coaches actually coaching." },
];

const SESSIONS = PORTRAIT.intake[0].options.slice(0, 4);

const STRIP = [
  { src: "/photos/07-senior-portrait-last-light.jpg", cap: "Last light", cat: "Senior" },
  { src: "/photos/29-event-the-youngest-finisher.jpg", cap: "The youngest finisher", cat: "Community" },
  { src: "/photos/06-engagement-she-said-yes.jpg", cap: "She said yes", cat: "Engagement" },
  { src: "/photos/33-event-the-finish-line-hug.jpg", cap: "The finish line hug", cat: "Community" },
  { src: "/photos/02-lifestyle-at-home-in-the-kitchen.jpg", cap: "At home in the kitchen", cat: "At home", wide: true },
  { src: "/photos/04-senior-portrait-golden-hour.jpg", cap: "Golden hour", cat: "Senior" },
  { src: "/photos/09-senior-portrait-through-the-lens.jpg", cap: "Through the lens", cat: "Senior" },
];

const dateHref = (d) => `/quote?for=wedding&date=${encodeURIComponent(d)}`;

function Slate({ n, name, note }) {
  return (
    <p className="cin-slate cin-rise">
      <span className="cin-slate-n">Chapter {n}</span>
      <span className="cin-slate-rule" aria-hidden="true" />
      <span>{name}</span>
      {note && <span className="cin-slate-note">{note}</span>}
    </p>
  );
}

function Arrow() {
  return (
    <svg className="cin-arrow" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="M4 12h15M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function CinemaHome() {
  const deal = autoDeal();
  const weddingAddons = ADDONS.wedding.filter((a) => !a.hidden);
  const weddings = [...PACKAGES.wedding].sort((a, b) => Number(!!b.popular) - Number(!!a.popular));
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="lab-cinema">
      <CinemaMotion />

      {/* ── One nav, always on a dark plate, quote button always there ── */}
      <header className="cin-nav">
        <Link href="/" className="cin-brand" aria-label="Roth Media — home">
          <BrandMark />
          <span>Roth Media</span>
        </Link>
        <nav className="cin-nav-links" aria-label="Main navigation">
          <Link href="/weddings">Weddings</Link>
          <Link href="/business">Business</Link>
          <a href="#families">Portraits</a>
          <a href={PHONE_HREF} className="cin-nav-phone">{PHONE}</a>
          <Link href="/portal" className="cin-nav-login">Client login</Link>
        </nav>
        <Link href="/quote" className="cin-btn cin-btn--light cin-nav-quote">Get a quote</Link>
        <details className="cin-menu">
          <summary aria-label="Menu"><span aria-hidden="true" /><span aria-hidden="true" /></summary>
          <nav className="cin-menu-panel" aria-label="Menu">
            <Link href="/weddings">Weddings <em>from {money(wedFrom)}</em></Link>
            <Link href="/business">Business <em>from {money(bizFrom)}</em></Link>
            <a href="#families">Family &amp; portraits <em>from {money(PORTRAIT.price)}</em></a>
            <a href="#date">Check a wedding date <em>open Saturdays</em></a>
            <Link href="/quote">Get a quote <em>2 minutes</em></Link>
            <a href={SMS_HREF}>Text Brandon <em>{PHONE}</em></a>
            <a href={PHONE_HREF}>Call <em>{PHONE}</em></a>
            <Link href="/portal" className="cin-menu-login">Client login</Link>
          </nav>
        </details>
        <span className="cin-scrub" aria-hidden="true"><span className="cin-scrub-fill" /></span>
      </header>

      {/* Chapter rail + timecode (desktop, decorative navigation) */}
      <nav className="cin-rail" aria-label="Chapters">
        {CHAPTERS.map((c, i) => (
          <a key={c.id} href={`#${c.id}`} className={i === 0 ? "is-on" : ""}>
            <span>{c.label}</span><i aria-hidden="true" />
          </a>
        ))}
      </nav>
      <p className="cin-hud" aria-hidden="true">
        <span className="cin-rec" /> <span className="cin-tc">00:00:00:00</span> <span className="cin-ch-name">Opening</span>
      </p>

      <main>
        {/* ── Opening shot ── */}
        <section className="cin-hero" id="top" data-ch="Opening">
          <div className="cin-hero-media">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/photos/40-wedding-just-married-mid-laugh.jpg" alt="Just married, mid laugh — a couple hand in hand on a country road" fetchPriority="high" />
          </div>
          <div className="cin-hero-shade" aria-hidden="true" />

          <div className="cin-hero-title">
            <p className="cin-kick">Wedding films · Photography · Business content</p>
            <h1>
              <span className="cin-mask"><span>Films &amp; photographs</span></span>
              <span className="cin-mask"><span>of the real thing.</span></span>
            </h1>
            <p className="cin-hero-where">
              {OWNER_NAME}, Waverly NY — filming across the <strong>Twin Tiers &amp; Finger Lakes</strong>:
              Sayre, Elmira, Corning, Ithaca.
            </p>
          </div>

          <ul className="cin-doors" aria-label="What are you here for?">
            {DOORS.map((d) => (
              <li key={d.id} className={d.primary ? "cin-door is-primary" : "cin-door"}>
                <a href={`#${d.id}`} className="cin-door-main" >
                  <span className="cin-door-n" aria-hidden="true">{d.n}</span>
                  <span className="cin-door-what">
                    <strong>{d.name}</strong>
                    <span>{d.sub}</span>
                  </span>
                  <span className="cin-door-price"><small>from</small> {money(d.from)}</span>
                </a>
                <a
                  href={d.href}
                  className="cin-door-cta"
                  {...(d.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                >
                  {d.cta} <Arrow />
                </a>
              </li>
            ))}
          </ul>
        </section>

        {/* ── Chapter 01 · Weddings ── */}
        <section className="cin-chapter cin-wed" id="weddings" data-ch="Weddings">
          <div className="cin-card cin-card--split">
            <div className="cin-card-lead">
              <Slate n="01" name="Weddings" note="Film · Photography" />
              <h2 className="cin-card-title">
                <span className="cin-mask"><span>Your day, told</span></span>
                <span className="cin-mask"><span>the way it felt.</span></span>
              </h2>
              <p className="cin-lede cin-rise">
                A cinematic wedding film with your real vows and ceremony
                audio, or full-day photography. Candid and unobtrusive — I
                don’t do stiff, rigid posing.
              </p>
              <p className="cin-fromline cin-rise">
                <span>Film <b>{money(W_FILM.price)}</b></span>
                <span>Photography <b>{money(W_PHOTO.price)}</b></span>
              </p>
            </div>

            {/* Date check — the first thing a couple asks */}
            <div className="cin-date cin-rise" id="date">
              <h3>Is your date open?</h3>
              <p className="cin-date-label">2026 Saturdays still open — tap one</p>
              <p className="cin-dates">
                {CAMPAIGN.openDates2026.map((d) => (
                  <Link key={d} href={dateHref(`${d}, 2026`)}>{d.replace(/^Sat /, "")}</Link>
                ))}
              </p>
              <form className="cin-datecheck" action="/quote" method="get">
                <input type="hidden" name="for" value="wedding" />
                <label htmlFor="cin-date-input">Any other date, 2026 or 2027</label>
                <div>
                  <input id="cin-date-input" type="date" name="date" min={today} required />
                  <button type="submit" className="cin-btn cin-btn--light">Check my date <Arrow /></button>
                </div>
              </form>
              <ul className="cin-date-terms">
                <li>Your date carries straight into your quote — no retyping, no call needed.</li>
                <li>A 30% retainer holds it; the balance is due 14 days before.</li>
                <li>Wedding coming up fast? <a href={SMS_HREF}>Text me the date</a> — that’s the quickest answer.</li>
              </ul>
            </div>
          </div>

          {/* The film comes first */}
          <div className="cin-films" id="films">
            <div className="cin-films-head">
              <h2 className="cin-h2 cin-card-title">
                <span className="cin-mask"><span>Made to be watched.</span></span>
              </h2>
              <p className="cin-rise">Tap to play, sound on. This is Matt &amp; April’s sneak peek — the film they had within 48 hours.</p>
            </div>
            <div className="cin-screen">
              <Player
                feature
                src={videoUrl("/matt-april-wedding.mp4")}
                poster="/matt-april-cover.jpg"
                alt="April laughing with her wedding party on the lawn"
                title="Matt & April"
                sub="Wedding film · sneak peek · September 2026"
                runtime="Play the film"
              />
            </div>
            <ul className="cin-facts">
              {FILM_FACTS.map((f) => <li key={f.k} className="cin-rise"><strong>{f.k}</strong><span>{f.v}</span></li>)}
              <li className="cin-rise cin-facts-price">
                <strong>{money(W_FILM.price)}</strong>
                <span>{W_FILM.name} · full day</span>
                <Link href="/quote?for=wedding&pkg=film" className="cin-link">Build a film quote <Arrow /></Link>
              </li>
            </ul>
          </div>

          <div className="cin-reel" aria-label="Wedding photographs">
            {REEL.map((f, i) => (
              <figure className="cin-frame" key={f.wide.src}>
                <div className="cin-frame-media">
                  <picture>
                    <source media="(min-width: 800px)" srcSet={f.wide.src} />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={f.tall.src}
                      alt={f.tall.cap}
                      loading={i === 0 ? "eager" : "lazy"}
                      style={{ "--pos-tall": f.tall.pos, "--pos-wide": f.wide.pos }}
                    />
                  </picture>
                </div>
                <figcaption className="cin-frame-cap">
                  <span className="cin-frame-n">Photography · {String(i + 1).padStart(2, "0")} / {String(REEL.length).padStart(2, "0")}</span>
                  <span className="cin-sub">
                    <span className="cin-only-tall">{f.tall.cap}</span>
                    <span className="cin-only-wide">{f.wide.cap}</span>
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        {/* ── Promises — the proof that can be checked, above the price list ── */}
        <section className="cin-chapter cin-proof" id="promises" data-ch="Promises">
          <div className="cin-loop" aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/nolan-kennedy-wedding-poster.jpg" alt="" loading="lazy" data-drift />
            <video muted loop playsInline preload="none" poster="/nolan-kennedy-wedding-poster.jpg" data-loop-src={videoUrl("/nolan-kennedy-wedding-hero.mp4")} />
          </div>
          <div className="cin-proof-inner">
            <Slate n="02" name="Before the price list" note="What you can hold me to" />
            <h2 className="cin-card-title">
              <span className="cin-mask"><span>Promises you</span></span>
              <span className="cin-mask"><span>can hold me to.</span></span>
            </h2>

            <ul className="cin-promises">
              {PROMISES.map((p) => (
                <li key={p.k} className="cin-rise"><strong>{p.k}</strong><span>{p.v}</span></li>
              ))}
            </ul>

            {REVIEWS.length > 0 && (
              <div className="cin-voices">
                {REVIEWS.map((q) => (
                  <blockquote key={q.who} className="cin-rise">
                    <p>“{q.quote}”</p>
                    <footer><strong>{q.who}</strong><span>{q.what}</span></footer>
                  </blockquote>
                ))}
              </div>
            )}
            {VENUES.length > 0 && (
              <p className="cin-venues cin-rise"><span>Filmed at</span> {VENUES.join(" · ")}</p>
            )}
          </div>
        </section>

        {/* ── Wedding price list ── */}
        <section className="cin-chapter cin-prices" id="wedding-prices" data-ch="Wedding prices">
          <div className="cin-prices-head">
            <p className="cin-kick cin-rise">Weddings · the price list</p>
            <h2 className="cin-h2 cin-card-title">
              <span className="cin-mask"><span>Two packages.</span></span>
              <span className="cin-mask"><span>Real prices.</span></span>
            </h2>
          </div>
          <div className="cin-tickets">
            {weddings.map((p) => (
              <article key={p.id} className={`cin-ticket cin-rise${p.popular ? " is-popular" : ""}`}>
                <header>
                  <div>
                    {p.popular && <span className="cin-flag">Most booked</span>}
                    <h3>{p.name}</h3>
                    <p>{p.scope}</p>
                  </div>
                  <p className="cin-price">{money(p.price)}</p>
                </header>
                <ul>{p.get.map((g) => <li key={g}>{g}</li>)}</ul>
                <Link href={`/quote?for=wedding&pkg=${p.id}`} className="cin-link">Start with {p.id === "film" ? "the film" : "photography"} <Arrow /></Link>
              </article>
            ))}
          </div>
          <div className="cin-extras cin-rise">
            <div>
              <h3>Add what fits</h3>
              <ul className="cin-addons">
                {weddingAddons.map((a) => (
                  <li key={a.id}><span><strong>{a.name}</strong>{a.id === "guest" ? "QR card on every table, no app" : a.get}</span><b>+{money(a.price)}</b></li>
                ))}
              </ul>
            </div>
            <div className="cin-extras-side">
              <h3>Travel</h3>
              <p className="cin-fine">{TRAVEL.line}</p>
              <h3>Booking</h3>
              <p className="cin-fine">A 30% retainer holds your date. The balance is due 14 days before the wedding, and the price is confirmed in writing.</p>
              {deal && (
                <p className="cin-offer">
                  <strong>Booked by {deal.endsLabel}:</strong> the {deal.label.toLowerCase()} takes {deal.pct}% off —
                  film {money(applyDeal(W_FILM.price, deal))}, photography {money(applyDeal(W_PHOTO.price, deal))}. Applied to your quote automatically.
                </p>
              )}
            </div>
          </div>
          <div className="cin-cta-row cin-rise">
            <a href="#date" className="cin-btn cin-btn--light cin-btn--lg">Check my date <Arrow /></a>
            <Link href="/quote?for=wedding" className="cin-btn cin-btn--ghost cin-btn--lg">Build my wedding quote</Link>
            <a href={SMS_HREF} className="cin-link">or text Brandon <Arrow /></a>
          </div>
        </section>

        {/* ── Chapter 03 · Business ── */}
        <section className="cin-chapter cin-biz" id="business" data-ch="Business">
          <div className="cin-card">
            <Slate n="03" name="Business" note="Content Days · Events" />
            <h2 className="cin-card-title">
              <span className="cin-mask"><span>One Content Day.</span></span>
              <span className="cin-mask"><span>A month of posts.</span></span>
            </h2>
            <div className="cin-card-row cin-rise">
              <p className="cin-lede">
                A promo, reels and photos that bring customers through the
                door — shot at your place, for shops, gyms, restaurants,
                builders and makers. Your people, your work, not stock
                footage. Delivered within two weeks, sized to post.
              </p>
              <div className="cin-card-act">
                <p className="cin-fromline"><span>Content Days from <b>{money(bizFrom)}</b></span></p>
                <a href={CALENDLY} target="_blank" rel="noopener noreferrer" className="cin-btn cin-btn--light cin-btn--lg">Book a 15-minute call <Arrow /></a>
                <a href={SMS_HREF} className="cin-link">or text {PHONE} <Arrow /></a>
              </div>
            </div>
          </div>

          <div className="cin-bento">
            <div className="cin-bento-wide cin-rise">
              <Player
                src={videoUrl("/reels/nicole-golden-zumba-promo.mp4")}
                poster="/reels/nicole-golden-zumba-promo-poster.jpg"
                title="Nicole Golden"
                sub="Zumba class promo"
              />
              <Player
                src={videoUrl("/reels/womens-powerlifting-club.mp4")}
                poster="/reels/womens-powerlifting-club-poster.jpg"
                title="Women’s Powerlifting Club"
                sub="Gym promo"
              />
            </div>
            <div className="cin-bento-tall cin-rise">
              <Player
                vertical
                src={videoUrl("/reels/bake-against-the-grain.mp4")}
                poster="/reels/bake-against-the-grain-poster.jpg"
                title="Bake Against the Grain"
                sub="Brand film · vertical"
              />
            </div>
            <div className="cin-bento-say cin-rise">
              <blockquote>
                “I’ll buy your product, shoot it, and send you the photos. No
                pitch, no strings. If you love them, we talk.”
                <cite>— Brandon</cite>
              </blockquote>
              <a href={SMS_HREF} className="cin-link">Text Brandon <Arrow /></a>
            </div>
          </div>

          <div className="cin-bizgrid">
            <div className="cin-rise">
              <h3 className="cin-h3">The price list</h3>
              <ul className="cin-list">
                {BIZ.map((p) => (
                  <li key={p.id}>
                    <div>
                      <strong>{p.name}{p.popular && <span className="cin-flag">Most booked</span>}</strong>
                      <span>{p.scope}. {p.get.slice(0, p.id === "day" ? 3 : 2).join(" · ")}</span>
                    </div>
                    <b>{money(p.price)}</b>
                  </li>
                ))}
              </ul>
              <p className="cin-fine">
                Add what fits: {ADDONS.business.map((a) => `${a.name.toLowerCase()} +${money(a.price)}${a.monthly ? `, then ${money(a.monthly)}/mo` : ""}`).join(" · ")}.
                The price is confirmed in writing before we shoot.
              </p>
            </div>
            <div className="cin-rise">
              <h3 className="cin-h3">What would your promo be?</h3>
              <ul className="cin-ideas">
                {IDEAS.map((i) => <li key={i.who}><strong>{i.who}</strong><span>{i.what}</span></li>)}
              </ul>
            </div>
          </div>
          <div className="cin-cta-row cin-rise">
            <a href={CALENDLY} target="_blank" rel="noopener noreferrer" className="cin-btn cin-btn--light cin-btn--lg">Book a 15-minute call <Arrow /></a>
            <a href={SMS_HREF} className="cin-btn cin-btn--ghost cin-btn--lg">Text Brandon</a>
            <Link href="/quote?for=business" className="cin-link">or build a business quote <Arrow /></Link>
          </div>
        </section>

        {/* ── Chapter 04 · Family & portraits ── */}
        <section className="cin-chapter cin-fam" id="families" data-ch="Portraits">
          <div className="cin-card cin-card--split">
            <div className="cin-card-lead">
              <Slate n="04" name="Family & portraits" note={SESSIONS.join(" · ")} />
              <h2 className="cin-card-title cin-card-title--long">
                <span className="cin-mask"><span>An hour with your people.</span></span>
                <span className="cin-mask"><span>Photos you’ll actually frame.</span></span>
              </h2>
              <p className="cin-lede cin-rise">
                Families, seniors, engagements, couples — whatever you’re
                celebrating. We keep it easy and relaxed; I’ll guide you when
                you need it.
              </p>
            </div>
            <div className="cin-spec cin-rise">
              <p className="cin-spec-head"><span>{PORTRAIT.name}</span><b>{money(PORTRAIT.price)}</b></p>
              <ul>
                <li><span>Time</span>{PORTRAIT.scope}</li>
                <li><span>Photos</span>30+ edited photos</li>
                <li><span>First look</span>Sneak peeks within 48 hours, ready to share</li>
                <li><span>Yours to keep</span>Your own client account — a year of access, unlimited downloads</li>
                <li><span>Want more?</span>Twenty more edited photos, +{money(ADDONS.family[0].price)}</li>
              </ul>
              {deal && (
                <p className="cin-offer">
                  <strong>Booked by {deal.endsLabel}:</strong> {money(applyDeal(PORTRAIT.price, deal))} with the {deal.label.toLowerCase()}, applied automatically.
                </p>
              )}
              <div className="cin-cta-row">
                <a href={SMS_HREF} className="cin-btn cin-btn--light cin-btn--lg">Text Brandon <Arrow /></a>
                <Link href="/quote?for=portraits" className="cin-link">or hold a date online <Arrow /></Link>
              </div>
            </div>
          </div>

          <div className="cin-strip" tabIndex={0} aria-label="Portrait photographs — swipe sideways">
            <div className="cin-strip-track">
              {STRIP.map((s, i) => (
                <figure key={s.src} className={s.wide ? "cin-cell cin-cell--wide" : "cin-cell"}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.src} alt={s.cap} loading="lazy" />
                  <figcaption><span>{String(i + 1).padStart(2, "0")}A</span><strong>{s.cap}</strong><em>{s.cat}</em></figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        {/* ── Chapter 05 · Your number ── */}
        <section className="cin-chapter cin-quote" id="quote" data-ch="Your number">
          <div className="cin-quote-inner">
            <Slate n="05" name="Your number" note="Two minutes · no obligation" />
            <h2 className="cin-card-title">
              <span className="cin-mask"><span>See your number</span></span>
              <span className="cin-mask"><span>before you talk</span></span>
              <span className="cin-mask"><span>to anyone.</span></span>
            </h2>
            <ol className="cin-steps">
              <li className="cin-rise"><span>1</span><strong>Pick what you’re here for.</strong> A wedding, your business, or portraits.</li>
              <li className="cin-rise"><span>2</span><strong>Add what fits.</strong> Every add-on is priced; the total runs as you go.</li>
              <li className="cin-rise"><span>3</span><strong>I confirm it in writing.</strong> I’ll be in touch within 24 hours — text me if you need an answer sooner.</li>
            </ol>
            <div className="cin-cta-row cin-rise">
              <Link href="/quote" className="cin-btn cin-btn--light cin-btn--xl">Build my quote <Arrow /></Link>
              <a href={SMS_HREF} className="cin-btn cin-btn--ghost cin-btn--xl">Text {PHONE}</a>
            </div>
          </div>
          <div className="cin-quote-bg" aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/photos/16-wedding-final-touches.jpg" alt="" loading="lazy" data-drift />
          </div>
        </section>

        {/* ── Chapter 06 · Brandon ── */}
        <section className="cin-chapter cin-about" id="brandon" data-ch="Brandon">
          <div className="cin-about-photo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/about-brandon.png" alt="Brandon Roth" loading="lazy" />
          </div>
          <div className="cin-about-text">
            <Slate n="06" name="Behind the camera" />
            <h2 className="cin-h2 cin-card-title"><span className="cin-mask"><span>Hi, I’m Brandon.</span></span></h2>
            <p className="cin-about-lead cin-rise">
              I’m all about candid work that feels real. The good moments
              usually happen in the flow — when you’re laughing, moving,
              working, or forgetting the camera is even there.
            </p>
            <p className="cin-rise">
              I’ll guide you when you need it, but I don’t do stiff, rigid
              posing. We keep it easy and relaxed, then capture what actually
              feels like your story.
            </p>
            <p className="cin-rise">I’m local to the Valley, and I’d love to work with you.</p>
            <p className="cin-sig cin-rise">— {OWNER_NAME}</p>
          </div>
        </section>
      </main>

      {/* ── End credits ── */}
      <footer className="cin-footer">
        <div className="cin-credits">
          <p className="cin-kick">Next: yours</p>
          <p className="cin-credits-big">Let’s tell yours.</p>
          <ul className="cin-enddoors">
            <li><a href="#date"><span>Weddings <small>from {money(wedFrom)}</small></span><b>Check my date <Arrow /></b></a></li>
            <li><a href={CALENDLY} target="_blank" rel="noopener noreferrer"><span>Business <small>from {money(bizFrom)}</small></span><b>Book a 15-min call <Arrow /></b></a></li>
            <li><a href={SMS_HREF}><span>Family &amp; portraits <small>from {money(PORTRAIT.price)}</small></span><b>Text Brandon <Arrow /></b></a></li>
          </ul>
          <dl className="cin-roll">
            <div><dt>Filmed &amp; photographed by</dt><dd>{OWNER_NAME}</dd></div>
            <div><dt>On location</dt><dd>Waverly · Sayre · Athens · Elmira · Corning · Ithaca · Binghamton · Towanda</dd></div>
            <div><dt>Call or text</dt><dd><a href={PHONE_HREF}>{PHONE}</a></dd></div>
            <div><dt>Write</dt><dd><a href={`mailto:${EMAIL}`}>{EMAIL}</a></dd></div>
          </dl>
        </div>
        <div className="cin-footer-row">
          <Link href="/" className="cin-brand"><BrandMark /><span>Roth Media</span></Link>
          <Link href="/weddings">Weddings</Link>
          <Link href="/business">Business</Link>
          <Link href="/quote">Get a quote</Link>
          {SOCIAL.map((s) => <a key={s.id} href={s.url} target="_blank" rel="noopener noreferrer">{s.label}</a>)}
          <Link href="/portal">Client login</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <span>© {new Date().getFullYear()} Roth Media · Waverly, NY</span>
        </div>
      </footer>

      {/* Phone dock: text / call, always reachable, sits below the content */}
      <div className="cin-dock">
        <a href={SMS_HREF}>
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>
          Text Brandon
        </a>
        <a href={PHONE_HREF}>
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6 3h4l1.5 5-2.5 1.5a12 12 0 0 0 5.5 5.5L16 12.5l5 1.5v4a2 2 0 0 1-2 2A16 16 0 0 1 4 5a2 2 0 0 1 2-2z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>
          Call
        </a>
      </div>
    </div>
  );
}
