import Link from "next/link";
import fs from "fs";
import path from "path";
import BrandMark from "../components/BrandMark";
import Gallery from "../components/Gallery";
import QuoteFlow from "../components/QuoteFlow";
import ReelCard from "../components/ReelCard";
import Reveal from "../components/Reveal";

const PHONE = "845-549-4425";
const PHONE_HREF = "tel:+18455494425";
const HERO_VIDEO = "/nolan-kennedy-wedding-hero.mp4";
const HERO_POSTER = "/nolan-kennedy-cover.png";

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  name: "Roth Media",
  url: "https://rothmediaco.com",
  telephone: "+1-845-549-4425",
  description:
    "Cinematic videography and candid photography for the Twin Tiers — Waverly NY, Athens PA, Sayre PA, Elmira NY, and Corning NY.",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Waverly",
    addressRegion: "NY",
  },
  areaServed: [
    "Waverly NY",
    "Athens PA",
    "Sayre PA",
    "Elmira NY",
    "Corning NY",
  ],
  founder: "Brandon Roth",
  priceRange: "$$",
};

const CATEGORY_MAP = {
  wedding: "weddings",
  event: "events",
  gym: "fitness",
  lifestyle: "lifestyle",
  senior: "seniors",
  engagement: "engagements",
};

const FEATURED = [
  "25-wedding-the-veil-took-flight.jpg",
  "24-wedding-a-world-of-their-own.jpg",
  "40-wedding-just-married-mid-laugh.jpg",
  "16-wedding-final-touches.jpg",
  "17-wedding-two-rings.jpg",
  "18-wedding-suiting-up-together.jpg",
  "22-wedding-the-first-dance.jpg",
  "06-engagement-she-said-yes.jpg",
  "04-senior-portrait-golden-hour.jpg",
  "09-senior-portrait-through-the-lens.jpg",
  "02-lifestyle-at-home-in-the-kitchen.jpg",
  "01-gym-athlete-chalk-and-focus.jpg",
  "42-gym-coach-and-client.jpg",
  "05-gym-quiet-before-the-lift.jpg",
  "33-event-the-finish-line-hug.jpg",
];

function getPhotos() {
  const photosDir = path.join(process.cwd(), "public", "photos");
  try {
    return FEATURED.filter((f) =>
      fs.existsSync(path.join(photosDir, f))
    ).map((f) => {
        const slug = f.replace(/\.[^.]+$/, "").replace(/^\d+-/, "");
        const [first, ...rest] = slug.split("-");
        const category = CATEGORY_MAP[first] || "lifestyle";
        const capSource = (CATEGORY_MAP[first] ? rest : [first, ...rest])
          .join(" ")
          .replace(/^(athlete |portrait )/, "");
        const caption = capSource.charAt(0).toUpperCase() + capSource.slice(1);
        return { src: `/photos/${f}`, category, caption };
      });
  } catch {
    return [];
  }
}

export default function Home() {
  const photos = getPhotos();
  const hasReel = fs.existsSync(
    path.join(process.cwd(), "public", HERO_VIDEO.replace(/^\//, ""))
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <Reveal />

      <nav className="rm-nav" aria-label="Main navigation">
        <Link href="/" className="brand">
          <span className="brand-chip"><BrandMark /></span>
          <span className="brand-text">Roth <em>Media</em></span>
        </Link>
        <ul className="nav-links">
          <li>
            <a href="#work">Work</a>
          </li>
          <li>
            <a href="#pricing">Pricing</a>
          </li>
          <li>
            <a href="#about">About</a>
          </li>
          <li>
            <a href="#quote">Get a quote</a>
          </li>
          <li>
            <Link href="/portal" className="nav-login">Client login</Link>
          </li>
          <li>
            <a href={PHONE_HREF}>{PHONE}</a>
          </li>
        </ul>
      </nav>

      <main id="top">
        <header className="reel unified-hero">
          {hasReel ? (
            <video src={HERO_VIDEO} autoPlay muted loop playsInline poster={HERO_POSTER} />
          ) : (
            <div className="reel-poster" aria-hidden="true" />
          )}
          <div className="hero-inner">
            <div className="hero-eyebrow">Photo · Video · Story</div>
            <h1>
              One place for the
              <br />
              <em>whole story.</em>
            </h1>
            <p className="unified-hero-copy">
              Candid photography and cinematic films for weddings, seniors,
              brands, events, and the people you love.
            </p>
            <div className="hero-cta">
              <a href="#quote" className="hero-cta-primary">
                Get my instant quote →
              </a>
              <a href="#work" className="hero-cta-secondary">
                See the work
              </a>
            </div>
            <p className="hero-trust">
              Waverly · Elmira · Corning · Sayre · Athens
            </p>
          </div>
        </header>

        <section className="statement reveal">
          <p>
            One studio, two crafts. <em>Video</em> when the moment moves,{" "}
            <em>photo</em> when it should stand still — serving the Twin
            Tiers from Waverly to Corning.
          </p>
        </section>

        <section id="work" className="work unified-photo-work">
          <Gallery photos={photos} />
        </section>

        <section className="pricing page-dark unified-video-work">
          <div className="pricing-inner">
            <div className="pricing-head reveal">
              <div className="kick">Video work</div>
              <h2>Made to be watched</h2>
              <p>Tap to play. Sound on when you&apos;re ready.</p>
            </div>
            <div className="film-card reveal">
              <video
                src={HERO_VIDEO}
                controls
                playsInline
                preload="metadata"
                poster={HERO_POSTER}
              />
              <p className="film-caption">
                <strong>Nolan &amp; Kennedy</strong> — wedding sneak peek
              </p>
            </div>
            <div className="film-card reveal">
              <video
                src="/reels/nicole-golden-zumba-promo.mp4"
                controls
                playsInline
                preload="metadata"
                poster="/reels/nicole-golden-zumba-promo-poster.jpg"
              />
              <p className="film-caption">
                <strong>Nicole Golden</strong> — Zumba class promo
              </p>
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

        <section id="pricing" className="pricing section-alt">
          <div className="pricing-inner">
            <div className="pricing-head reveal">
              <div className="kick">Real prices, up front</div>
              <h2>Build your quote.</h2>
              <p>
                Photo, video, or both — pick what you need and I&apos;ll walk
                you to a tailored starting price, step by step. Every number is
                tied to what you walk away with, not hours on a clock. Prefer
                to talk? Call or text <a href={PHONE_HREF}>{PHONE}</a>.
              </p>
            </div>
            <div id="quote">
              <QuoteFlow />
            </div>
          </div>
        </section>

        <section id="about" className="about">
          <div className="about-visual reveal">
            <div className="frame" />
          </div>
          <div className="about-text reveal">
            <div className="kick">Behind the camera</div>
            <h2>
              Hi, I&apos;m <em>Brandon.</em>
            </h2>
            <p>
              I&apos;m all about candid work that feels real. The good
              moments usually happen in the flow — when you&apos;re
              laughing, moving, working, or forgetting the camera is even
              there.
            </p>
            <p>
              I&apos;ll guide you when you need it, but I don&apos;t do
              stiff, rigid posing. We keep it easy and relaxed, then capture
              what actually feels like your story.
            </p>
            <p>
              My favorite way to start working with a business? I&apos;ll
              buy your product, shoot it, and send you the photos. No pitch,
              no strings. If you love them, we talk.
            </p>
            <p>I&apos;m local to the Valley, and I&apos;d love to work with you.</p>
            <div className="sig">— Brandon Roth</div>
          </div>
        </section>

      </main>

      <footer className="rm-footer">
        <div className="foot-inner">
          <div className="brand">
            <BrandMark />
            Roth <em>Media</em>
          </div>
          <span>Waverly, NY — serving the Twin Tiers</span>
          <a href={PHONE_HREF}>{PHONE}</a>
          <Link href="/portal">Client login</Link>
          <span>© {new Date().getFullYear()} Roth Media</span>
        </div>
      </footer>
    </>
  );
}
