import Link from "next/link";
import "../theme/business.css";
import SiteNav from "../../components/SiteNav";
import SiteFooter from "../../components/SiteFooter";
import Reveal from "../../components/Reveal";
import BizFilm from "../../components/BizFilm";
import { EMAIL, SAME_AS, CALENDLY } from "../../lib/site";
import { PACKAGES, ADDONS, money } from "../../lib/packages";
import DealPill from "../../components/DealPill";
import DealPrice from "../../components/DealPrice";
import { autoDeal, applyDeal } from "../../lib/deals";
import { videoUrl } from "../../lib/media";

export const metadata = {
  title: "Brand Video & Content Days for Twin Tiers Businesses",
  description:
    "Content Days for local businesses — a promo, reels, and photos shot at your place. Sayre, Athens, Waverly, Elmira & Corning. From $600, real prices up front.",
  alternates: { canonical: "/business" },
};

// Deal prices (lib/deals.js) are baked in at render — refresh hourly.
export const revalidate = 3600;

const pkg = (id) => PACKAGES.business.find((p) => p.id === id);
const addon = (id) => ADDONS.business.find((a) => a.id === id);

const PHONE = "845-549-4425";
const SMS_HREF = "sms:+18455494425";
const QUOTE = "/quote?for=business";
const bizFrom = Math.min(...PACKAGES.business.map((p) => p.price));

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

const FAQS = [
  {
    q: "What does a Content Day cost, and what do I get?",
    a: `A Full Content Day is ${money(pkg("day").price)}: one shoot at your business, and you walk away with a 45–90 second promo, 8 vertical reels, and 15–30 edited photos, sized for your website, Instagram, Facebook, and TikTok. The Mini Content Day is ${money(pkg("mini").price)}: 8 reels and 10–20 photos.`,
  },
  {
    q: "How fast do I get my content?",
    a: "Everything is delivered within two weeks, edited and sized to post. One round of revisions is included.",
  },
  {
    q: "Do you cover events?",
    a: `Yes — Event Coverage is ${money(pkg("event").price)}: up to 3 hours of coverage, a 45–90 second highlight short, and a gallery of 50+ edited photos.`,
  },
  {
    q: "Can you run ads with the videos?",
    a: `Yes — Facebook ads + lead generation is a ${money(addon("ads").price)} add-on: ads built from your videos, aimed at local customers, with leads sent straight to you.`,
  },
  {
    q: "Can I use the videos in paid ads?",
    a: "Yes. All music is licensed through Epidemic Sound and your finished videos are cleared for your website, socials, and online advertising.",
  },
  {
    q: "Do you build websites too?",
    a: `Yes — a full site built from your Content Day footage, photos, and words is ${money(addon("website").price)}, then ${money(addon("website").monthly)}/month to keep it running.`,
  },
];

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Service",
  serviceType: "Brand video and content production",
  provider: { "@type": "ProfessionalService", name: "Roth Media", telephone: "+1-845-549-4425", email: EMAIL, url: "https://rothmediaco.com", sameAs: SAME_AS },
  areaServed: ["Sayre PA", "Athens PA", "Waverly NY", "Elmira NY", "Corning NY"],
  offers: PACKAGES.business.map((p) => ({ "@type": "Offer", name: p.name, price: p.price, priceCurrency: "USD" })),
};

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
  const deal = autoDeal();
  return (
    <>
      <DealPill href={QUOTE} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_LD) }} />

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
              A promo, reels, and photos shot at your business, for anything you
              want to promote — for shops, gyms, restaurants, builders, and makers
              in Sayre, Athens, Waverly, Elmira, and Corning.
            </p>
            <p className="bz-from"><span className="cx-kick cx-kick--dim">Content Days from</span> <b className="cx-num">{money(bizFrom)}</b></p>
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
                <h2 className="cx-h2 bz-say-h">Hate being on camera? Give me ten minutes.</h2>
                <p className="bz-say-body">
                  Most owners dread this part. Then we start talking, somebody
                  cracks a joke, and you forget the camera is there. You get
                  content that sounds like you, and we have a good time making
                  it. Always.
                </p>
                <blockquote>
                  “I probably walked into your store in my free time to see if I could shoot something for you, lol. I just love getting to know people — and helping everybody prosper.”
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
              <p className="cx-kick">The price list</p>
              <h2 className="cx-h2">Real prices, up front.</h2>
            </div>
            <div className={`bz-pkgs ${PACKAGES.business.length === 1 ? "one" : PACKAGES.business.length === 2 ? "two" : ""}`}>
              {PACKAGES.business.map((p, i) => (
                <Link key={p.id} href={QUOTE} className={`cx-card bz-pkg cx-reveal ${p.popular ? "cx-card--accent popular" : ""}`} style={{ transitionDelay: `${i * 90}ms` }}>
                  <span className="bz-pkg-top">
                    <span className="bz-pkg-name">{p.name}</span>
                    {p.popular && <span className="cx-flag">Most booked</span>}
                  </span>
                  <span className="bz-pkg-price"><DealPrice price={p.price} />{p.per || ""} <small>starting at</small></span>
                  <span className="bz-pkg-scope">{p.scope}</span>
                  <span className="cx-kick bz-pkg-you">You get</span>
                  <ul className="cx-list">{p.get.map((g) => <li key={g}>{g}</li>)}</ul>
                  <span className="cx-link cx-link--caps bz-pkg-go">Build this quote <Arrow /></span>
                </Link>
              ))}
            </div>
            <div className="bz-price-notes cx-reveal">
              <p className="cx-fine">
                Add what fits: {ADDONS.business.map((a) => `${a.name.toLowerCase()} (${a.from ? "from " : ""}+${money(a.price)}${a.monthly ? `, then ${money(a.monthly)}/mo` : ""})`).join(", ")}. Every add-on is priced in the quote builder.
              </p>
              {deal && (
                <p className="cx-offer">
                  <strong>Booked by {deal.endsLabel}:</strong> the {deal.label.toLowerCase()} takes {deal.pct}% off —{" "}
                  {PACKAGES.business.map((p) => `${p.name} ${money(applyDeal(p.price, deal))}`).join(", ")}. Applied to your quote automatically.
                </p>
              )}
            </div>
          </div>
        </section>

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
                <h2 className="cx-h2">What would your promo be?</h2>
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
                Something else? Whatever you do, there&apos;s a promo in it — we find
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
            <p className="cx-lede">No pressure, no surprises. You see the real number first, and we&rsquo;ll have a good time from there. I&apos;ll be in touch within 24 hours.</p>
            <div className="cx-cta-row">
              <Link href={QUOTE} className="cx-btn cx-btn--light cx-btn--lg">Get my instant quote <Arrow /></Link>
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
