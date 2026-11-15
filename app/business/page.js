import Link from "next/link";
import "../theme/business.css";
import SiteNav from "../../components/SiteNav";
import GoogleReviews from "../../components/GoogleReviews";
import SiteFooter from "../../components/SiteFooter";
import Reveal from "../../components/Reveal";
import BizFilm from "../../components/BizFilm";
import { EMAIL, SAME_AS, CALENDLY } from "../../lib/site";
import { AREA_SERVED, BUSINESS_ID, breadcrumbLd } from "../../lib/schema";
import { PACKAGES, ADDONS, listedAddons, money } from "../../lib/packages";
import DealPrice from "../../components/DealPrice";
import { autoDealFor, applyDeal } from "../../lib/deals";
import { videoUrl } from "../../lib/media";

export const metadata = {
  title: "Brand Video, Photos & Content Days for Twin Tiers Businesses",
  description:
    "Videographer and photographer for local businesses — reels and photos shot at your place, aimed at whatever you're promoting. Sayre, Athens, Waverly, Elmira, Corning, Ithaca & Binghamton. From $450, real prices up front.",
  alternates: { canonical: "/business" },
};

// Deal prices (lib/deals.js) are baked in at render — refresh hourly.
export const revalidate = 3600;

const pkg = (id) => PACKAGES.business.find((p) => p.id === id);
const addon = (id) => ADDONS.business.find((a) => a.id === id);

const PHONE = "845-549-4425";
const SMS_HREF = "sms:+18455494425";
const QUOTE = "/quote?for=business";

const IDEAS = [
  { who: "A restaurant", what: "Friday night at full tilt — the kitchen firing, plates hitting the pass, regulars mid-laugh. Ends on the dish everyone orders." },
  { who: "A gym", what: "The 6 AM crew — chalk, last reps, a PR bell, your coaches actually coaching. The energy people join for." },
  { who: "A bookstore", what: "Shelves worth getting lost in — staff picks, page turns, the reading chair in the window. An afternoon people can feel." },
  { who: "A construction company", what: "One job, start to finish — day-one dirt to the final walkthrough. Proof of work that wins the next bid." },
];

function Arrow() {
  return (
    <svg className="cx-arrow" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="M4 12h15M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Business + events are quote-first (2026-11-15): no prices on this page.
const QUOTE_STEPS = [
  { n: "01", title: "Tell me what you need", say: "Four quick questions: what you're trying to do, where it'll show up, how often, and your budget." },
  { n: "02", title: "Get three options", say: "Built around your goal and your budget, with exactly what you get in each one." },
  { n: "03", title: "Pick one, sign, pay", say: "All on one page. Paid in full, delivered within two weeks." },
];

const FAQS = [
  {
    q: "What does it cost, and what do I get?",
    a: "Every quote is built around what you need. Tell me what you're trying to do, where it'll show up, how often, and your budget, and I'll send three options with exactly what you get in each. You pick one, sign, and pay on one page.",
  },
  {
    q: "How fast do I get my content?",
    a: "Everything is delivered within two weeks, edited and sized to post. One round of revisions is included. Need it sooner? Rush delivery (one week) can go into your quote.",
  },
  {
    q: "Can I get more content from the same shoot?",
    a: "Yes — the camera's already up, so it's edit time, not a second trip. More reels, more photos, team headshots, interviews, an extra hour or a second location can all go into your quote.",
  },
  {
    q: "Do you cover events?",
    a: "Yes, events are quoted too. Tell me how big it is and what you need (coverage, interviews, a highlight video, photos), and the quote covers the hours, the gear, and a second shooter if it needs one.",
  },
  {
    q: "Can you run ads with the videos?",
    a: "Yes — Facebook ads + lead generation can go into any quote: ads built from your videos, aimed at local customers, with leads sent straight to you.",
  },
  {
    q: "Can I use the videos in paid ads?",
    a: "Yes. All music is licensed through Epidemic Sound and your finished videos are cleared for your website, socials, and online advertising.",
  },
  {
    q: "Do you build websites too?",
    a: "Yes — a full site built from your footage, photos, and words can be part of your quote, with a monthly fee to keep it running.",
  },
];

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Service",
  serviceType: "Brand video, business photography, and event coverage",
  name: "Content Days for local businesses — Roth Media",
  url: "https://rothmediaco.com/business",
  provider: { "@id": BUSINESS_ID, "@type": "ProfessionalService", name: "Roth Media", telephone: "+1-845-549-4425", email: EMAIL, url: "https://rothmediaco.com", sameAs: SAME_AS },
  areaServed: AREA_SERVED,
  audience: { "@type": "BusinessAudience", name: "Local businesses — shops, gyms, restaurants, builders, and makers" },
};
const CRUMBS_LD = breadcrumbLd([{ name: "Roth Media", path: "/" }, { name: "Business", path: "/business" }]);

const FAQ_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export default function BusinessPage() {
  const deal = autoDealFor("business", "day"); // null while the special skips business
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_LD) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(CRUMBS_LD) }} />

      <SiteNav active="business" overHero cta={{ href: QUOTE, label: "Get a quote" }} />

      <main className="cx-page cx-page--hero bz-page">
        <Reveal />

        {/* ── Hero ── */}
        <header className="cx-hero bz-hero">
          <div className="cx-hero-media">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/photos/43-gym-between-the-reps.jpg" alt="A trainer laughing between sets at her gym, black and white" fetchPriority="high" />
          </div>
          <div className="cx-hero-shade" aria-hidden="true" />
          <div className="cx-wrap cx-hero-body">
            <p className="cx-kick">Branded content · Twin Tiers</p>
            <h1 className="cx-h1">One Content Day. <br />A month of posts.</h1>
            <p className="cx-lede">
              Reels and photos shot at your business, aimed at whatever you
              want to promote — for shops, gyms, restaurants, builders, and makers
              in Sayre, Athens, Waverly, Elmira, and Corning.
            </p>
            <p className="bz-from"><span className="cx-kick cx-kick--dim">Pricing</span> <b className="cx-num">Custom quote</b></p>
            <div className="cx-cta-row">
              <Link href={QUOTE} className="cx-btn cx-btn--light cx-btn--lg">Build my quote <Arrow /></Link>
              <a href={CALENDLY} className="cx-btn cx-btn--ghost cx-btn--lg" target="_blank" rel="noopener noreferrer">Book a 15-minute call</a>
            </div>
          </div>
        </header>

        {/* ── The work ── */}
        <section className="cx-section bz-work" id="work">
          <div className="cx-wrap">
            <div className="cx-title cx-reveal">
              <p className="cx-kick">The work · tap to play, sound on</p>
              <h2 className="cx-h2">Your people, your work — not stock footage.</h2>
            </div>
            <div className="bz-bento">
              <div className="bz-bento-wide cx-reveal">
                <BizFilm
                  src={videoUrl("/reels/nicole-golden-zumba-promo.mp4")}
                  poster="/reels/nicole-golden-zumba-promo-poster.jpg"
                  title="Nicole Golden"
                  sub="Zumba class promo"
                />
                <BizFilm
                  src={videoUrl("/reels/womens-powerlifting-club.mp4")}
                  poster="/reels/womens-powerlifting-club-poster.jpg"
                  title="Women’s Powerlifting Club"
                  sub="Gym promo"
                />
              </div>
              <div className="bz-bento-tall cx-reveal">
                <BizFilm
                  vertical
                  src={videoUrl("/reels/bake-against-the-grain.mp4")}
                  poster="/reels/bake-against-the-grain-poster.jpg"
                  title="Bake Against the Grain"
                  sub="Brand film"
                />
              </div>
              <div className="bz-say cx-reveal">
                <p className="cx-kick">Shoot day is the fun part</p>
                <h2 className="cx-h2 bz-say-h">Hate being on camera? Most owners do.</h2>
                <p className="bz-say-body">
                  We start by talking, not filming. Nobody has to perform &mdash; you
                  do what you&rsquo;d normally do at work and I film it. You get
                  content that sounds like you.
                </p>
                <blockquote>
                  “If I just give you two or three things to do, it keeps you in the moment.”
                  <cite>— Brandon</cite>
                </blockquote>
                <a href={SMS_HREF} className="cx-link">Text Brandon <Arrow /></a>
              </div>
            </div>
          </div>
        </section>

        {/* ── Prices ── */}
        <section className="cx-section cx-band bz-prices" id="pricing">
          <div className="cx-wrap">
            <div className="cx-title cx-reveal">
              <p className="cx-kick">Pricing</p>
              <h2 className="cx-h2">Built around what you need.</h2>
            </div>
            <div className="bz-pkgs">
              {QUOTE_STEPS.map((st, i) => (
                <Link key={st.n} href={QUOTE} className={`cx-card bz-pkg cx-reveal ${i === 0 ? "cx-card--accent popular" : ""}`} style={{ transitionDelay: `${i * 90}ms` }}>
                  <span className="bz-pkg-top"><span className="bz-pkg-name">{st.title}</span></span>
                  <span className="bz-pkg-price">{st.n}</span>
                  <span className="bz-pkg-scope">{st.say}</span>
                  {i === 0 && <span className="cx-link cx-link--caps bz-pkg-go">Start <Arrow /></span>}
                </Link>
              ))}
            </div>
            <div className="bz-price-notes cx-reveal">
              <p className="cx-fine">
                Videos, photos, interviews, team headshots, extra lighting and mics, rush delivery, ads, even a website: anything can go into a quote. The price is in writing before we shoot.
              </p>
              <p className="cx-cta-row"><Link href={QUOTE} className="cx-btn cx-btn--light cx-btn--lg">Get my quote <Arrow /></Link></p>
            </div>
          </div>
        </section>

        <GoogleReviews kind="business" />

        {/* ── Ideas ── */}
        <section className="cx-section bz-ideas-sec">
          <div className="cx-wrap cx-split">
            <figure className="cx-frame cx-frame--wide bz-ideas-photo cx-reveal">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/photos/41-gym-mid-set-laughter.jpg" alt="A lifter laughing mid-set at the squat rack, black and white" loading="lazy" />
            </figure>
            <div className="cx-reveal">
              <div className="cx-title">
                <p className="cx-kick">Your story</p>
                <h2 className="cx-h2">What would you promote?</h2>
                <p className="cx-lede">
                  Every business has one story worth 60 seconds. A few we&apos;d pitch:
                </p>
              </div>
              <ul className="bz-ideas">
                {IDEAS.map((i) => (
                  <li key={i.who}><strong>{i.who}</strong><p>{i.what}</p></li>
                ))}
              </ul>
              <p className="cx-fine bz-ideas-else">
                Something else? Whatever you do, there&apos;s something worth promoting — we find
                it together on the planning call.
              </p>
            </div>
          </div>
        </section>

        {/* ── How it works + FAQ ── */}
        <section className="cx-section cx-section--rule bz-how">
          <div className="cx-wrap bz-two">
            <div className="cx-reveal">
              <div className="cx-title">
                <p className="cx-kick">Three steps</p>
                <h2 className="cx-h2">How it works</h2>
              </div>
              <ol className="cx-steps">
                <li><span><strong>Build your quote online.</strong> Pick a day and add-ons — real starting price in two minutes.</span></li>
                <li><span><strong>We plan the shoot.</strong> I confirm the number in writing and we map what your business needs on camera.</span></li>
                <li><span><strong>Post everything.</strong> Delivered within two weeks — edited, licensed, and sized for your website, ads, and socials.</span></li>
              </ol>
            </div>
            <div className="cx-reveal">
              <div className="cx-title">
                <p className="cx-kick">Before you ask</p>
                <h2 className="cx-h2">Questions owners ask</h2>
              </div>
              <div className="cx-faq">
                {FAQS.map((f) => (
                  <details key={f.q}>
                    <summary>{f.q}</summary>
                    <p>{f.a}</p>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Close ── */}
        <section className="cx-section cx-band cx-band--black bz-final">
          <div className="cx-wrap cx-reveal">
            <p className="cx-kick">Your move</p>
            <h2 className="cx-h1 cx-h1--long">Your competitors are posting. Out-post them.</h2>
            <p className="cx-lede">No pressure, no surprises. You see the real number first. I&apos;ll be in touch within 24 hours.</p>
            <div className="cx-cta-row">
              <Link href={QUOTE} className="cx-btn cx-btn--light cx-btn--lg">Get my quote <Arrow /></Link>
              <a href={CALENDLY} className="cx-btn cx-btn--ghost cx-btn--lg" target="_blank" rel="noopener noreferrer">Book a 15-minute call</a>
              <a href={SMS_HREF} className="cx-link">or text {PHONE} <Arrow /></a>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
