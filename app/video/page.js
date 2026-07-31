import fs from "fs";
import BrandMark from "../../components/BrandMark";
import path from "path";
import Link from "next/link";
import QuoteForm from "../../components/QuoteForm";
import Reveal from "../../components/Reveal";
import ReelCard from "../../components/ReelCard";

export const metadata = {
  title: "Videography",
  description:
    "Cinematic wedding films, brand promos, and event video for the Twin Tiers — Waverly, Elmira, Corning, Sayre, and Athens. Wedding films from $1,200, brand video from $450.",
};

const PHONE = "845-549-4425";
const PHONE_HREF = "tel:+18455494425";

const PACKAGES = [
  {
    n: "01",
    title: "Wedding Films",
    tagline: "The whole day, told honestly — with sound.",
    prices: [
      ["Half day", "$1,200"],
      ["Full day", "$2,000"],
      ["The Works", "$3,000"],
      ["Whole Story (photo + video)", "$5,000"],
    ],
    note: "Cinematic highlight film with ceremony audio and licensed music. The Works adds full ceremony and speeches edits, drone, and a next-day teaser. Photo + video together: half day $1,800, full day $3,000, The Works $4,000.",
  },
  {
    n: "02",
    title: "Brand Video",
    tagline: "Promos and reels that keep clients coming back.",
    prices: [
      ["Promo package", "from $450"],
      ["Content Day (with photo)", "$700"],
      ["Monthly plans", "from $500/mo"],
    ],
    note: "90-sec promo film plus 3 vertical reels, licensed music, one revision round.",
  },
  {
    n: "03",
    title: "Event Video",
    tagline: "The whole story, start to finish.",
    prices: [
      ["Event coverage", "from $400"],
      ["With photo", "from $600"],
    ],
    note: "2-hour minimum, edited event recap delivered within two weeks. Additional hours $125 each.",
  },
];

export default function VideoPage() {
  const hasReel = fs.existsSync(path.join(process.cwd(), "public", "reel.mp4"));

  return (
    <div className="page-dark">
      <Reveal />
      <nav className="rm-nav" aria-label="Main navigation">
        <Link href="/" className="brand">
          <span className="brand-chip"><BrandMark /></span>
          <span className="brand-text">Roth <em>Media</em></span>
        </Link>
        <ul className="nav-links">
          <li>
            <Link href="/photo">Photo side</Link>
          </li>
          <li>
            <Link href="/quote">Get a quote</Link>
          </li>
          <li>
            <a href={PHONE_HREF}>{PHONE}</a>
          </li>
        </ul>
      </nav>

      <header className="reel">
        {hasReel ? (
          <video src="/reel.mp4" autoPlay muted loop playsInline poster="/hero.jpg" />
        ) : (
          <div className="reel-poster" aria-hidden="true" />
        )}
        <div className="hero-inner">
          <div className="hero-eyebrow">The Video Side</div>
          <h1>
            Films that <em>feel</em>
            <br />
            like the day did.
          </h1>
          <div className="hero-cta">
            <a href="#quote" className="hero-cta-primary">
              Get my instant quote →
            </a>
            <a href="#pricing" className="hero-cta-secondary">
              See real prices
            </a>
          </div>
          <p className="hero-trust">
            Weddings · brands · events — serving the Twin Tiers
          </p>
        </div>
      </header>

      <section className="statement reveal">
        <p>
          Photos hold the moment still. <em>Film</em> gives it back to you —
          the voices, the vows, the room erupting. That&apos;s what I chase.
        </p>
      </section>

      <section className="pricing" style={{ paddingTop: 0 }}>
        <div className="pricing-inner">
          <div className="pricing-head reveal">
            <div className="kick">Recent work</div>
            <h2>Made to be watched</h2>
            <p>Tap to play — sound on.</p>
          </div>
          <div className="reels-row reveal">
            <ReelCard
              src="/reels/bake-against-the-grain.mp4"
              title="Bake Against the Grain"
              client="Brand film"
            />
          </div>
        </div>
      </section>

      <section id="pricing" className="pricing">
        <div className="pricing-inner">
          <div className="pricing-head reveal">
            <div className="kick">Real prices, up front</div>
            <h2>Video packages</h2>
            <p>
              No mystery pricing. Answer a couple of questions on the quote
              form and it matches you to the right package instantly.
            </p>
          </div>
          <div className="price-grid">
            {PACKAGES.map((p) => (
              <div className="price-card reveal" key={p.n}>
                <span className="n">{p.n}</span>
                <h3>{p.title}</h3>
                <p className="tagline">{p.tagline}</p>
                <ul>
                  {p.prices.map(([l, v]) => (
                    <li key={l}>
                      <span className="plabel">{l}</span>
                      <span className="pvalue">{v}</span>
                    </li>
                  ))}
                </ul>
                <p className="pnote">{p.note}</p>
              </div>
            ))}
          </div>
          <div className="svc-cta">
            <a href="#quote" className="svc-cta-btn">
              Find my package →
            </a>
          </div>
        </div>
      </section>

      <section id="quote" className="quote-embed">
        <div className="quote-embed-inner">
          <div className="kick">Instant quote</div>
          <h2 className="quote-embed-title">
            Find your package in <em>two minutes.</em>
          </h2>
          <p className="quote-embed-sub">
            Answer a few questions and get matched to the package people in
            your shoes actually book — live, as you click. Real prices, no
            obligation.
          </p>
          <QuoteForm initialService="videography" />
        </div>
      </section>

      <footer className="rm-footer">
        <div className="foot-inner">
          <div className="brand">
            <BrandMark />
            Roth <em>Media</em>
          </div>
          <a href={PHONE_HREF}>{PHONE}</a>
          <Link href="/photo">The photo side</Link>
          <Link href="/portal">Client login</Link>
          <span>© {new Date().getFullYear()} Roth Media</span>
        </div>
      </footer>
    </div>
  );
}
