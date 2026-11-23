// The homepage — "Cinema". A film-first, dark page: letterboxed opening shot,
// chapters you scrub through. Business-only since 2026-11-23 (Brandon):
// monthly social media management in three tiers (lib/plans.js), ads run
// for the owner, single projects and events by custom quote. Weddings and
// portraits live under /personal. The previous homepage lives at /classic.
import Link from "next/link";
import "./home.css";
import BrandMark from "../components/BrandMark";
import CinemaMotion from "../components/home/CinemaMotion";
import Player from "../components/home/Player";
import HomeLead from "../components/home/HomeLead";
import { EMAIL, SOCIAL, CALENDLY, PHONE, OWNER_NAME } from "../lib/site";
import { REVIEWS, GOOGLE_RATING } from "../lib/reviews";
import { videoUrl } from "../lib/media";
import { businessLd } from "../lib/schema";
import { CITIES } from "../lib/cities";
import { PLANS, PLAN_RULES } from "../lib/plans";

export const metadata = {
  alternates: { canonical: "/" },
};

const JSON_LD = businessLd({
  url: "https://rothmediaco.com",
  description:
    "Social media management for local businesses, based in Waverly, NY: monthly plans from $300 a month. Videos and photos shot at your place and made to sell, posted for you, plus Facebook and Instagram ads run for you, and event coverage, across the Twin Tiers and Finger Lakes: Waverly, Sayre, Athens, Elmira, Corning, Ithaca, Owego, Towanda, and Binghamton. Single projects are a custom quote with three options.",
});

export const revalidate = 3600;

const PHONE_HREF = "tel:+18455494425";
const SMS_HREF = "sms:+18455494425";

// Business + events are quote-first (2026-11-15): no package prices on the
// site. They answer four questions, Brandon sends three options.
const BIZ_QUOTE = "/quote?for=business";
const QUOTE_STEPS = [
  { n: "01", title: "Tell me what you need", say: "Four quick questions: what you're trying to do, where it'll show up, how often, and your budget." },
  { n: "02", title: "Get three options", say: "Built around your goal and your budget, with exactly what you get in each one." },
  { n: "03", title: "Pick one, sign, pay", say: "All on one page. Paid in full, delivered within two weeks." },
];

const PLAN_FROM = Math.min(...PLANS.map((p) => p.price));
const planHref = (id) => `${BIZ_QUOTE}&plan=${id}`;

const DOORS = [
  { n: "01", id: "plans", name: "Monthly plans", sub: "I film, edit and post for you, every month", label: `from $${PLAN_FROM}/mo`, cta: "See the plans", href: "#plans", primary: true, jump: "What's in each" },
  { n: "02", id: "ads", name: "Ads", sub: "Facebook & Instagram, run for you, aimed at people nearby", label: "Tier 2 and 3", cta: "See the plans", href: "#plans", jump: "How ads work" },
  { n: "03", id: "events", name: "Projects", sub: "Events and one-off videos, quoted to fit", label: "Custom quote", cta: "Get a quote", href: BIZ_QUOTE, jump: "Events & projects" },
];

// One review where it sells, not a chapter of them.
const BIZ_REVIEW = REVIEWS.find((r) => /business|promo|content/i.test(r.who)) || REVIEWS[0];

const CHAPTERS = [
  { id: "top", label: "Opening" },
  { id: "plans", label: "Plans" },
  { id: "business", label: "Content" },
  { id: "ads", label: "Ads" },
  { id: "events", label: "Projects" },
  { id: "quote", label: "One project" },
  { id: "about", label: "Brandon" },
];

const IDEAS = [
  { who: "A construction company", what: "One job, start to finish — day-one dirt to the final walkthrough. Proof of work that wins the next bid." },
  { who: "A restaurant", what: "Friday night at full tilt — the kitchen firing, plates hitting the pass. Ends on the dish everyone orders." },
  { who: "A gym", what: "The 6 AM crew — chalk, last reps, a PR bell, your coaches actually coaching." },
];

// How the ads side works. Plain facts, no promised numbers.
const AD_STEPS = [
  { n: "1", title: "Made to sell.", say: "Every video ends with one clear next step: call, book, order or walk in." },
  { n: "2", title: "Shown to people nearby.", say: "I run your ads on Facebook and Instagram, aimed at people around your business, not just your followers." },
  { n: "3", title: "Watch what works.", say: "We look at your reach, engagement and sales, then make more of what's working." },
];

// Same lists as the event "what to expect" page (app/welcome/page.js).
const COVER = [
  { who: "The place", what: "Outside, the entrance, the signs, the room before people arrive." },
  { who: "The stage", what: "Speakers, awards and anything said into a microphone." },
  { who: "The crowd", what: "Faces, reactions, applause." },
  { who: "The in-between", what: "People talking, laughing, meeting each other." },
  { who: "The details", what: "Your branding, the decor, the food, the products." },
];
// Add the drone once Brandon has his FAA Part 107 license (not before).
const GEAR = [
  { who: "Cinema cameras", what: "Clean, sharp footage in dim ballrooms, bright outdoor spaces and everything in between." },
  { who: "Wireless mics", what: "A clip-on mic for each speaker, plus a shotgun mic for the room and audience questions." },
  { who: "A gimbal", what: "Smooth, steady moving shots that follow people without getting in the way." },
  { who: "LED lights", what: "For dark rooms. Added to your quote when the space needs it." },
];

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

function ArrowDown() {
  return (
    <svg className="cin-arrow-down" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
      <path d="M12 4v15M6 13l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// The quiet line that closes a chapter: where to go if this one isn't yours.
function Skip({ label, links }) {
  return (
    <nav className="cin-skip" aria-label={label}>
      <span>{label}</span>
      {links.map((l) => <a key={l.href} href={l.href}>{l.text} <ArrowDown /></a>)}
    </nav>
  );
}


export default function CinemaHome() {
  return (
    <div className="rm-cinema">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <CinemaMotion />

      {/* ── One nav, always on a dark plate, quote button always there ── */}
      <header className="cin-nav">
        <Link href="/" className="cin-brand" aria-label="Roth Media — home">
          <BrandMark />
          <span>Roth Media</span>
        </Link>
        {/* Timecode lives on the nav plate so it can never sit on top of content */}
        <p className="cin-hud" aria-hidden="true">
          <span className="cin-rec" /> <span className="cin-tc">00:00:00:00</span> <span className="cin-ch-name">Opening</span>
        </p>
        <nav className="cin-nav-links" aria-label="Main navigation">
          <Link href="/business">Business</Link>
          <Link href="/personal">Personal</Link>
          <a href={PHONE_HREF} className="cin-nav-phone">{PHONE}</a>
          <Link href="/portal" className="cin-nav-login">Client login</Link>
        </nav>
        <a href="#plans" className="cin-btn cin-btn--light cin-nav-quote">See plans</a>
        <details className="cin-menu">
          <summary aria-label="Menu"><span aria-hidden="true" /><span aria-hidden="true" /></summary>
          <nav className="cin-menu-panel" aria-label="Menu">
            <a href="#plans">Monthly plans <em>from ${PLAN_FROM}/mo</em></a>
            <Link href="/business">Business <em>more about the work</em></Link>
            <Link href={BIZ_QUOTE}>One project <em>custom quote</em></Link>
            <a href="#ads">Ads <em>run for you</em></a>
            <Link href="/personal">Personal <em>weddings &amp; portraits</em></Link>
            <a href={SMS_HREF}>Text Brandon <em>{PHONE}</em></a>
            <a href={PHONE_HREF}>Call <em>{PHONE}</em></a>
            <Link href="/portal" className="cin-menu-login">Client login</Link>
          </nav>
        </details>
        <span className="cin-scrub" aria-hidden="true"><span className="cin-scrub-fill" /></span>
      </header>

      {/* Chapter rail (desktop, decorative navigation) */}
      <nav className="cin-rail" aria-label="Chapters">
        {CHAPTERS.map((c, i) => (
          <a key={c.id} href={`#${c.id}`} className={i === 0 ? "is-on" : ""}>
            <span>{c.label}</span><i aria-hidden="true" />
          </a>
        ))}
      </nav>

      <main>
        {/* ── Opening shot ── */}
        <section className="cin-hero" id="top" data-ch="Opening">
          <div className="cin-hero-media">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/photos/41-gym-mid-set-laughter.jpg" alt="A lifter laughing mid-set at the squat rack, black and white" fetchPriority="high" className="cin-hero-img--biz" />
          </div>
          <div className="cin-hero-shade" aria-hidden="true" />

          <div className="cin-hero-grid">
          <div className="cin-hero-title">
            <p className="cin-kick">Social media management for local businesses · Twin Tiers</p>
            <h1>
              <span className="cin-mask"><span>Content that converts.</span></span>
              <span className="cin-mask"><span>Not just views.</span></span>
            </h1>
            <p className="cin-hero-pitch">
              <strong>More reach, more engagement, and most of all, more sales.</strong>{" "}
              Every month I come to your place and film you doing what you already
              do. I make the videos and photos, post them for you, and run your ads
              so people nearby actually see them. You never touch a camera.
            </p>
            <div className="cin-hero-cta">
              <a href="#plans" className="cin-btn cin-btn--light cin-btn--lg">See the plans <Arrow /></a>
              <a href={CALENDLY} target="_blank" rel="noopener noreferrer" className="cin-btn cin-btn--ghost cin-btn--lg">Book a 15-min call</a>
            </div>
            <p className="cin-hero-where">
              {OWNER_NAME}, Waverly NY — shops, gyms, restaurants, builders and makers across the{" "}
              <strong>Twin Tiers &amp; Finger Lakes</strong>.
            </p>
          </div>
          {/* The three monthly plans, right in the opening — each one opens the form with that plan picked */}
          <div className="cin-hero-offer">
            {/* The ad — the same 30 seconds people see on Facebook, so the page picks up where the ad left off. */}
            <div className="cin-hero-ad cin-rise">
              <video src="/reels/roth-ad.mp4" poster="/reels/roth-ad-poster.jpg" autoPlay muted loop playsInline controls preload="metadata" aria-label="Brandon, 30 seconds: one shoot, a month of posts" />
              <span className="cin-hero-ad-tag">30 sec · tap for sound</span>
            </div>
            <p className="cin-lead-kick">Monthly plans · intro prices</p>
            <ul className="cin-hero-planlist">
              {PLANS.map((p) => (
                <li key={p.id}>
                  <Link href={planHref(p.id)} className={p.popular ? "cin-plan is-popular" : "cin-plan"}>
                    <span className="cin-plan-what">
                      <strong>{p.name}</strong>
                      <span>{p.short}</span>
                    </span>
                    <span className="cin-plan-price">${p.price}<small>/mo</small></span>
                  </Link>
                </li>
              ))}
            </ul>
            <a href="#plans" className="cin-link cin-hero-seework">See what&apos;s in each <ArrowDown /></a>
          </div>
          </div>

          <ul className="cin-doors" aria-label="What do you need?">
            {DOORS.map((d) => (
              <li key={d.id} className={d.primary ? "cin-door is-primary" : "cin-door"}>
                <a href={`#${d.id}`} className="cin-door-main" >
                  <span className="cin-door-n" aria-hidden="true">{d.n}</span>
                  <span className="cin-door-what">
                    <strong>{d.name}</strong>
                    <span>{d.sub}</span>
                  </span>
                  <span className="cin-door-price"><small>{d.label}</small></span>
                  <span className="cin-door-jump">{d.jump} <ArrowDown /></span>
                </a>
                {d.href.startsWith("#") ? <a href={d.href} className="cin-door-cta">{d.cta} <Arrow /></a> : <Link href={d.href} className="cin-door-cta">{d.cta} <Arrow /></Link>}
              </li>
            ))}
          </ul>
        </section>

        {/* ── Plans · monthly social media management ── */}
        <section className="cin-chapter cin-prices" id="plans" data-ch="Plans">
          <div className="cin-prices-head">
            <p className="cin-kick cin-rise">Social media management · monthly</p>
            <h2 className="cin-h2 cin-card-title">
              <span className="cin-mask"><span>Three plans.</span></span>
              <span className="cin-mask"><span>Each one does more.</span></span>
            </h2>
            <p className="cin-say cin-rise">Every plan: I come to your place each month, film, edit, and post for you.</p>
          </div>
          <div className="cin-tickets cin-tickets--3">
            {PLANS.map((p) => (
              <article key={p.id} className={`cin-ticket cin-rise${p.popular ? " is-popular" : ""}`}>
                <header>
                  <div>
                    {p.popular && <span className="cin-flag">Recommended</span>}
                    <h3>{p.name}</h3>
                    <p>{p.shoot}</p>
                  </div>
                  <p className="cin-price">${p.price}<small>/mo</small></p>
                </header>
                <ul>{p.get.map((g) => <li key={g} className={g.endsWith("plus:") ? "cin-plus" : undefined}>{g}</li>)}</ul>
                <Link href={planHref(p.id)} className="cin-btn cin-btn--light cin-plan-start">Start {p.name} <Arrow /></Link>
              </article>
            ))}
          </div>
          <div className="cin-extras cin-rise">
            <div>
              <h3>Good to know</h3>
              <ul className="cin-ideas cin-rules">
                {PLAN_RULES.map((r) => <li key={r}><span>{r}</span></li>)}
              </ul>
            </div>
            <div className="cin-extras-side">
              <h3>Just need one project?</h3>
              <p className="cin-fine">An event, a launch, or a single promo video: those get a custom quote with three options to pick from.</p>
              <Link href={BIZ_QUOTE} className="cin-link">Get a quote for one project <Arrow /></Link>
            </div>
          </div>
          <Skip label="Those are the plans." links={[{ href: "#business", text: "See the work" }, { href: "#ads", text: "How ads work" }]} />
        </section>

        {/* ── Chapter 01 · Content ── */}
        <section className="cin-chapter cin-biz" id="business" data-ch="Content">
          <div className="cin-card">
            <Slate n="01" name="Content" note="Content Days" />
            <h2 className="cin-card-title">
              <span className="cin-mask"><span>Hate being on camera?</span></span>
              <span className="cin-mask"><span>Most owners do.</span></span>
            </h2>
            <div className="cin-card-row cin-rise">
              <div>
                <p className="cin-lede">
                  We start by talking, not filming. Nobody has to perform — you
                  do what you’d normally do at work and I film it. You get
                  content that sounds like you.
                </p>
                <p className="cin-say">
                  One Content Day, a month of posts: reels and photos aimed at
                  what you're promoting, made to bring customers through the door — shot at your place,
                  for shops, gyms, restaurants, builders and makers. Delivered
                  within two weeks, sized to post.
                </p>
              </div>
              <div className="cin-card-act">
                {BIZ_REVIEW && <blockquote className="cin-quote-inline cin-rise">“{BIZ_REVIEW.quote}”<cite>{BIZ_REVIEW.name} · {BIZ_REVIEW.who} · {GOOGLE_RATING} on Google</cite></blockquote>}
                <p className="cin-fromline"><span>Plans from <b>${PLAN_FROM} a month</b></span></p>
                <a href="#plans" className="cin-btn cin-btn--light cin-btn--lg">See the plans <Arrow /></a>
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
                “If I just give you two or three things to do, it keeps you in
                the moment.”
                <cite>— Brandon</cite>
              </blockquote>
              <a href={SMS_HREF} className="cin-link">Text Brandon <Arrow /></a>
            </div>
          </div>

          <div className="cin-bizgrid">
            <div className="cin-rise">
              <h3 className="cin-h3">Just one project? How a quote works</h3>
              <ul className="cin-list">
                {QUOTE_STEPS.map((st) => (
                  <li key={st.n}>
                    <div>
                      <strong>{st.title}</strong>
                      <span>{st.say}</span>
                    </div>
                    <b>{st.n}</b>
                  </li>
                ))}
              </ul>
              <p className="cin-fine">
                Videos, photos, interviews, team headshots, extra lighting and mics, rush delivery, ads, even a website:
                anything can go into a quote. The price is in writing before we shoot.
              </p>
              <Link href={BIZ_QUOTE} className="cin-btn cin-btn--ghost cin-btn--lg cin-bizquote">Get a quote <Arrow /></Link>
            </div>
            <div className="cin-rise">
              <h3 className="cin-h3">What would you promote?</h3>
              <ul className="cin-ideas">
                {IDEAS.map((i) => <li key={i.who}><strong>{i.who}</strong><span>{i.what}</span></li>)}
              </ul>
            </div>
          </div>
          <Skip label="That’s the content chapter." links={[{ href: "#ads", text: "Next: ads" }, { href: "#plans", text: "Back to the plans" }]} />
        </section>

        {/* ── Chapter 02 · Ads ── */}
        <section className="cin-chapter cin-biz cin-ads" id="ads" data-ch="Ads">
          <div className="cin-card">
            <Slate n="02" name="Ads" note="Facebook · Instagram" />
            <h2 className="cin-card-title">
              <span className="cin-mask"><span>Then I put it in front</span></span>
              <span className="cin-mask"><span>of people nearby.</span></span>
            </h2>
            <div className="cin-card-row cin-rise">
              <div>
                <p className="cin-lede">
                  Your content is built to get people to act. Your ads get it
                  seen by people around your business, not just the ones who
                  already follow you.
                </p>
                <ol className="cin-steps">
                  {AD_STEPS.map((st) => (
                    <li key={st.n}><span>{st.n}</span><strong>{st.title}</strong>{st.say}</li>
                  ))}
                </ol>
              </div>
              <div className="cin-card-act">
                <p className="cin-fromline"><span>Ads come with <b>Tier 2 and 3</b></span></p>
                <p className="cin-fine">You pay Facebook for the ad budget directly, on your own card. My fee covers making and running the ads.</p>
                <a href="#plans" className="cin-btn cin-btn--light cin-btn--lg">See the plans <Arrow /></a>
                <a href={SMS_HREF} className="cin-link">or text {PHONE} <Arrow /></a>
              </div>
            </div>
          </div>
          <Skip label="That’s the ads chapter." links={[{ href: "#plans", text: "See the plans" }, { href: "#events", text: "Next: events" }]} />
        </section>

        {/* ── Chapter 03 · Events ── */}
        <section className="cin-chapter cin-biz cin-events" id="events" data-ch="Projects">
          <div className="cin-card">
            <Slate n="03" name="Events & projects" note="Custom quote" />
            <h2 className="cin-card-title">
              <span className="cin-mask"><span>Small event or big one,</span></span>
              <span className="cin-mask"><span>it’s quoted to fit.</span></span>
            </h2>
            <div className="cin-card-row cin-rise">
              <p className="cin-lede">
                Some events need one camera. Some need three, plus extra lights
                and mics, or a second shooter for a second room. We figure out
                what yours needs, and your quote shows exactly what&apos;s in
                each option.
              </p>
              <div className="cin-card-act">
                <Link href={BIZ_QUOTE} className="cin-btn cin-btn--light cin-btn--lg">Quote my event <Arrow /></Link>
                <a href={SMS_HREF} className="cin-link">or text {PHONE} <Arrow /></a>
              </div>
            </div>
          </div>
          <div className="cin-bizgrid">
            <div className="cin-rise">
              <h3 className="cin-h3">What I film</h3>
              <ul className="cin-ideas">
                {COVER.map((i) => <li key={i.who}><strong>{i.who}</strong><span>{i.what}</span></li>)}
              </ul>
            </div>
            <div className="cin-rise">
              <h3 className="cin-h3">What I bring</h3>
              <ul className="cin-ideas">
                {GEAR.map((i) => <li key={i.who}><strong>{i.who}</strong><span>{i.what}</span></li>)}
              </ul>
            </div>
          </div>
          <Skip label="That’s the events chapter." links={[{ href: "#quote", text: "Quote one project" }, { href: "#plans", text: "Back to the plans" }]} />
        </section>

        {/* ── Chapter 04 · Your quote ── (legacy /#pricing and /#quote both land here) */}
        <section className="cin-chapter cin-quote" id="quote" data-ch="One project">
          <span id="pricing" className="cin-anchor" aria-hidden="true" />
          <div className="cin-quote-inner">
            <Slate n="04" name="One project" note="Four questions · no obligation" />
            <h2 className="cin-card-title">
              <span className="cin-mask"><span>Just one project?</span></span>
              <span className="cin-mask"><span>Get three options.</span></span>
            </h2>
            <ol className="cin-steps">
              {QUOTE_STEPS.map((st, i) => (
                <li key={st.n} className="cin-rise"><span>{i + 1}</span><strong>{st.title}.</strong> {st.say}</li>
              ))}
            </ol>
            <div className="cin-cta-row cin-rise">
              <Link href={BIZ_QUOTE} className="cin-btn cin-btn--light cin-btn--xl">Get a quote <Arrow /></Link>
              <a href={SMS_HREF} className="cin-btn cin-btn--ghost cin-btn--xl">Text {PHONE}</a>
            </div>
            <div className="cin-quote-lead">
              <HomeLead />
            </div>
          </div>
          <div className="cin-quote-bg" aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/photos/43-gym-between-the-reps.jpg" alt="" loading="lazy" data-drift />
          </div>
        </section>

        {/* ── Chapter 05 · Brandon ── */}
        <section className="cin-chapter cin-about" id="about" data-ch="Brandon">
          <div className="cin-about-photo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/about-brandon.png" alt="Brandon Roth" loading="lazy" />
          </div>
          <div className="cin-about-text">
            <Slate n="05" name="Behind the camera" />
            <h2 className="cin-h2 cin-card-title"><span className="cin-mask"><span>Hi, I’m Brandon.</span></span></h2>
            <p className="cin-about-lead cin-rise">
              I’m all about candid work that feels real. The good moments
              usually happen in the flow — when you’re laughing, moving,
              working, or forgetting the camera is even there.
            </p>
            <p className="cin-rise">
              I’ll guide you when you need it, but I don’t do stiff, rigid
              posing. We keep it easy and relaxed.
            </p>
            <p className="cin-rise">Most of my work comes by word of mouth. I’m local to the Valley, and I’d love to work with you.</p>
            <p className="cin-sig cin-rise">— {OWNER_NAME}</p>
          </div>
        </section>
      </main>

      {/* ── End credits ── */}
      <footer className="cin-footer">
        <div className="cin-credits">
          <p className="cin-kick">Next: yours</p>
          <p className="cin-credits-big">Let’s tell yours.</p>
          {BIZ_REVIEW && <p className="cin-credits-say">“{BIZ_REVIEW.quote}” — {BIZ_REVIEW.name}, Google review</p>}
          <ul className="cin-enddoors">
            <li><a href="#plans"><span>Monthly plans <small>from ${PLAN_FROM}/mo</small></span><b>See the plans <Arrow /></b></a></li>
            <li><a href={CALENDLY} target="_blank" rel="noopener noreferrer"><span>Not sure yet? <small>15 minutes</small></span><b>Book a call <Arrow /></b></a></li>
            <li><Link href="/personal"><span>Personal <small>weddings &amp; portraits</small></span><b>See personal <Arrow /></b></Link></li>
          </ul>
          <dl className="cin-roll">
            <div><dt>Filmed &amp; photographed by</dt><dd>{OWNER_NAME}</dd></div>
            <div><dt>On location</dt><dd className="cin-roll-towns">{CITIES.map((c, i) => (<span key={c.slug}><Link href={`/${c.slug}`}>{c.name}</Link>{i < CITIES.length - 1 ? " · " : ""}</span>))}</dd></div>
            <div><dt>Call or text</dt><dd><a href={PHONE_HREF}>{PHONE}</a></dd></div>
            <div><dt>Write</dt><dd><a href={`mailto:${EMAIL}`}>{EMAIL}</a></dd></div>
          </dl>
        </div>
        <div className="cin-footer-row">
          <Link href="/" className="cin-brand"><BrandMark /><span>Roth Media</span></Link>
          <Link href="/business">Business</Link>
          <Link href="/personal">Personal</Link>
          <Link href={BIZ_QUOTE}>Get a quote</Link>
          {SOCIAL.map((s) => <a key={s.id} href={s.url} target="_blank" rel="noopener noreferrer">{s.label}</a>)}
          <Link href="/portal">Client login</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <span>© {new Date().getFullYear()} Roth Media · Waverly, NY</span>
        </div>
      </footer>

      {/* Phone dock: business quote / text / call, always reachable, sits below the content */}
      <div className="cin-dock">
        <a href="#plans" className="cin-dock-main">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M3 8h4l2-3h6l2 3h4v11H3zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>
          See plans
        </a>
        <a href={SMS_HREF} aria-label="Text Brandon">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>
          Text
        </a>
        <a href={PHONE_HREF}>
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6 3h4l1.5 5-2.5 1.5a12 12 0 0 0 5.5 5.5L16 12.5l5 1.5v4a2 2 0 0 1-2 2A16 16 0 0 1 4 5a2 2 0 0 1 2-2z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>
          Call
        </a>
      </div>
    </div>
  );
}
