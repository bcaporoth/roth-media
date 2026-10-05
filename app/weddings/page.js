import "../theme/weddings.css";
import Link from "next/link";
import { EMAIL, SAME_AS } from "../../lib/site";
import { AREA_SERVED, BUSINESS_ID, breadcrumbLd } from "../../lib/schema";
import { PACKAGES, ADDONS, TRAVEL, money } from "../../lib/packages";
import DealPill from "../../components/DealPill";
import SiteNav from "../../components/SiteNav";
import SiteFooter from "../../components/SiteFooter";
import Reveal from "../../components/Reveal";
import FilmCard from "../../components/FilmCard";
import WdPackageCard from "../../components/WdPackageCard";
import { videoUrl } from "../../lib/media";

export const metadata = {
  title: "Wedding Photographer & Videographer — Twin Tiers NY & PA",
  description:
    `Wedding photography and cinematic wedding films for the Twin Tiers — Sayre PA, Athens PA, Waverly NY, Elmira, Corning, Ithaca, and Binghamton. Real prices from ${money(PACKAGES.wedding[0].price)}. Instant quote, no obligation.`,
  alternates: { canonical: "/weddings" },
};

// Deal prices (lib/deals.js) are baked in at render — refresh hourly.
export const revalidate = 3600;

const [PHOTO, FILM] = PACKAGES.wedding;
const addon = (id) => ADDONS.wedding.find((a) => a.id === id);

function Arrow() {
  return (
    <svg className="cx-arrow" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="M4 12h15M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Real frames from real weddings (public/photos).
const FRAMES = [
  { src: "/photos/38-wedding-walking-her-in.jpg", cap: "Walking her in", alt: "A father walking his veiled daughter down the aisle, in black and white", pos: "55% 30%" },
  { src: "/photos/39-wedding-sealed.jpg", cap: "Sealed", alt: "The first kiss at an outdoor ceremony while the guests applaud", pos: "50% 36%" },
  { src: "/photos/22-wedding-the-first-dance.jpg", cap: "The first dance", alt: "A couple's first dance under string lights in a barn, in black and white", pos: "50% 70%" },
];

const FAQS = [
  {
    q: "How much does a wedding photographer or videographer cost in the Twin Tiers?",
    a: `My prices are public: full-day Wedding Photography is ${money(PHOTO.price)} (200–400 fully edited photos) and full-day Wedding Videography is ${money(FILM.price)} (two short films, your full ceremony, and the speeches). Build your exact quote online in two minutes; I confirm the final number in writing before we shoot.`,
  },
  {
    q: "Do you do engagement photos too?",
    a: "Yes — an engagement session is free with any wedding. Stack it on and you've got photos for save-the-dates and your wedding website.",
  },
  {
    q: "When do we get everything?",
    a: "Sneak peeks land within 48 hours — photos or video, ready to post while everyone's still talking about the day. Your full delivery follows online within six weeks, in your own client account: a year of access, unlimited downloads.",
  },
  {
    q: "Can we post our films anywhere? What about the music?",
    a: "Yes. All music is professionally licensed through Epidemic Sound, and your finished films are fully cleared for your socials, website, and online use. The license covers the songs as they appear in your delivered videos.",
  },
  {
    q: "Can our guests share their photos with us?",
    a: `Yes — Guest photos & video messages is a ${money(addon("guest").price)} add-on. A QR card goes on every table; guests scan it, pick from their camera roll, and it lands in your private gallery. No app to download. They can record a 60-second video message for you too, and uploads stay open for a month after the wedding.`,
  },
  {
    q: "What areas do you serve?",
    a: `I'm local to the Valley — Sayre, Athens, and Waverly — and film weddings across the Twin Tiers, including Elmira, Corning, Towanda, and the surrounding area. ${TRAVEL.line}`,
  },
];

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Service",
  serviceType: "Wedding photography and wedding videography",
  name: "Wedding photography & films — Roth Media",
  url: "https://rothmediaco.com/weddings",
  provider: { "@id": BUSINESS_ID, "@type": "ProfessionalService", name: "Roth Media", telephone: "+1-845-549-4425", email: EMAIL, url: "https://rothmediaco.com", sameAs: SAME_AS },
  areaServed: AREA_SERVED,
  offers: PACKAGES.wedding.map((p) => ({ "@type": "Offer", name: p.name, price: p.price, priceCurrency: "USD", availability: "https://schema.org/InStock" })),
};
const CRUMBS_LD = breadcrumbLd([{ name: "Roth Media", path: "/" }, { name: "Weddings", path: "/weddings" }]);

const FAQ_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export default function WeddingsPage() {
  return (
    <>
      <DealPill href="/quote?for=wedding" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_LD) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(CRUMBS_LD) }} />

      <SiteNav active="weddings" overHero cta={{ href: "/quote?for=wedding", label: "Build my quote" }} />

      <main className="cx-page cx-page--hero wd-page">
        <Reveal />

        <header className="cx-hero cx-hero--full wd-hero">
          <div className="cx-hero-media">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/photos/25-wedding-the-veil-took-flight.jpg" alt="A bride's veil lifting in the wind as the couple hold each other in a field at dusk" fetchPriority="high" style={{ objectPosition: "60% 42%" }} />
          </div>
          <div className="cx-hero-shade" />
          <div className="cx-wrap cx-hero-body">
            <p className="cx-kick">Weddings &amp; engagements · Twin Tiers</p>
            <h1 className="cx-h1">Your day, told the way it felt.</h1>
            <p className="cx-lede">
              Full-day wedding photography, or a cinematic film with your real
              vows and ceremony audio — for couples in Sayre, Athens, Waverly,
              Elmira, Corning, and everywhere in between. Real prices, up front.
            </p>
            <div className="cx-cta-row">
              <Link href="/quote?for=wedding" className="cx-btn cx-btn--light cx-btn--lg">Build my quote <Arrow /></Link>
              <a href="#film" className="cx-btn cx-btn--ghost cx-btn--lg">Watch a wedding film</a>
            </div>
          </div>
        </header>

        <section id="film" className="cx-band cx-band--black wd-film">
          <div className="cx-wrap wd-film-wrap">
            <div className="wd-film-head cx-reveal">
              <p className="cx-kick">The film</p>
              <p className="wd-film-cap">Matt &amp; April — wedding sneak peek</p>
            </div>
            <div className="cx-reveal">
              <FilmCard
                feature
                preload="none"
                src={videoUrl("/matt-april-wedding.mp4")}
                poster="/matt-april-wedding-poster.jpg"
                title="Matt & April"
                sub="Wedding sneak peek"
              />
            </div>
          </div>
        </section>

        <section id="good-time" className="cx-section wd-easy">
          <div className="cx-wrap cx-split">
            <div className="cx-title cx-reveal">
              <p className="cx-kick">How I work</p>
              <h2 className="cx-h2">Relaxed on the day, and on your vendors&rsquo; team.</h2>
            </div>
            <div className="cx-stack cx-reveal">
              <p className="cx-lede">
                I don&rsquo;t like putting anyone outside of what they normally feel
                comfortable with. I work with your DJ, your planner and your
                venue. You relax and have a good time. I&rsquo;ll be having one
                too.
              </p>
              <ul className="cx-list wd-easy-list">
                <li><span><strong>Easy to be around.</strong> No stiff posing, no barking orders.</span></li>
                <li><span><strong>On your vendors&rsquo; team.</strong> I work with your DJ, planner and venue so the day runs smoother, not slower.</span></li>
                <li><span><strong>Nothing to chase.</strong> Real price up front, confirmed in writing, and a sneak peek within 48 hours.</span></li>
              </ul>
            </div>
          </div>
        </section>

        <section id="packages" className="cx-section">
          <div className="cx-wrap">
            <div className="cx-title cx-reveal">
              <p className="cx-kick">Weddings · the price list</p>
              <h2 className="cx-h2">Two packages. Real prices.</h2>
            </div>
            <div className="cx-grid cx-grid--2 wd-pkgs cx-reveal">
              {PACKAGES.wedding.map((p) => (
                <WdPackageCard key={p.id} p={p} href="/quote?for=wedding" />
              ))}
            </div>

            <div className="wd-extras">
              <div className="cx-reveal">
                <p className="cx-kick wd-extras-kick">Add what fits</p>
                <ul className="cx-rows">
                  {ADDONS.wedding.filter((a) => !a.hidden).map((a) => (
                    <li key={a.id} className="cx-row">
                      <span className="cx-row-name">{a.name.replace(/^Add /, "")}</span>
                      <span className="cx-row-price">{a.price === 0 ? <>free{a.was ? <> <s>{money(a.was)}</s></> : null}</> : `+${money(a.price)}`}</span>
                      <span className="cx-row-note">{a.get}</span>
                    </li>
                  ))}
                </ul>
                <p className="cx-fine wd-extras-note">Every add-on is priced in the quote builder — no phone call required.</p>
              </div>
              <div className="cx-reveal">
                <p className="cx-kick wd-extras-kick">Travel</p>
                <p className="cx-fine wd-travel">{TRAVEL.line}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="wd-frames" aria-label="Wedding photographs">
          {FRAMES.map((f) => (
            <figure key={f.src} className="cx-frame wd-frame cx-reveal">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.src} alt={f.alt} loading="lazy" style={{ objectPosition: f.pos }} />
              <figcaption>{f.cap}</figcaption>
            </figure>
          ))}
        </section>

        <section id="how" className="cx-section">
          <div className="cx-wrap cx-split wd-split">
            <div className="cx-title cx-reveal">
              <p className="cx-kick">From quote to delivery</p>
              <h2 className="cx-h2">How it works</h2>
            </div>
            <ol className="cx-steps cx-reveal">
              <li><span><strong>Build your quote online.</strong> Pick your package and add-ons — you see the real starting price in two minutes.</span></li>
              <li><span><strong>I confirm it in writing.</strong> Exact number, locked date, no surprises.</span></li>
              <li><span><strong>Your day, delivered.</strong> Filmed candid and unobtrusive, delivered online within six weeks — ready to share anywhere.</span></li>
            </ol>
          </div>
        </section>

        <section id="faq" className="cx-section cx-section--rule">
          <div className="cx-wrap cx-split wd-split">
            <div className="cx-title cx-reveal">
              <p className="cx-kick">Before you book</p>
              <h2 className="cx-h2">Questions couples ask</h2>
            </div>
            <div className="cx-faq cx-reveal">
              {FAQS.map((f) => (
                <details key={f.q}>
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="wd-close">
          <div className="wd-close-media" aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/photos/24-wedding-a-world-of-their-own.jpg" alt="" loading="lazy" />
          </div>
          <div className="cx-wrap wd-close-body cx-reveal">
            <p className="cx-kick">Your quote</p>
            <h2 className="cx-h1 cx-h1--long">See your number before you talk to anyone.</h2>
            <p className="cx-lede">No pressure, no surprises. You see the real number first. If it feels right, I&apos;ll be in touch within 24 hours.</p>
            <div className="cx-cta-row">
              <Link href="/quote?for=wedding" className="cx-btn cx-btn--light cx-btn--xl">Get my instant quote <Arrow /></Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
