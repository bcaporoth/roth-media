import fs from "fs";
import BrandMark from "../../components/BrandMark";
import path from "path";
import Link from "next/link";
import Gallery from "../../components/Gallery";
import Reveal from "../../components/Reveal";

export const metadata = {
  title: "Photography",
  description:
    "Candid wedding, senior, engagement, headshot, and brand photography for the Twin Tiers — Waverly, Elmira, Corning, Sayre, and Athens. Weddings from $1,200, seniors from $225.",
};

const PHONE = "845-549-4425";
const PHONE_HREF = "tel:+18455494425";

const CATEGORY_MAP = {
  wedding: "weddings",
  gym: "fitness",
  lifestyle: "lifestyle",
  senior: "seniors",
  engagement: "engagements",
};

function getPhotos() {
  const photosDir = path.join(process.cwd(), "public", "photos");
  try {
    return fs
      .readdirSync(photosDir)
      .filter((f) => /\.(jpe?g|png|webp|avif)$/i.test(f) && !f.startsWith("."))
      .sort()
      .map((f) => {
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

const PACKAGES = [
  {
    n: "01",
    title: "Weddings",
    tagline: "The whole day, told honestly.",
    prices: [
      ["Half day", "$1,200"],
      ["Full day", "$2,000"],
      ["The Works", "$3,000"],
      ["Whole Story (photo + video)", "$5,000"],
    ],
    note: "Photo or video — same price either way; The Works adds the engagement session. Both together: half day $1,800, full day $3,000, The Works $4,000.",
  },
  {
    n: "02",
    title: "Seniors",
    tagline: "Your last year, captured like it mattered.",
    prices: [
      ["Session", "$225"],
      ["Extended", "$350"],
    ],
    note: "Session: 60–90 min, two outfits or locations, 30+ edited images. Extended: about two hours, 3–4 outfits, 50+ images.",
  },
  {
    n: "03",
    title: "Engagements",
    tagline: "The real, easy, in-love moments.",
    prices: [
      ["Session", "$250"],
      ["With film", "$450"],
    ],
    note: "60 min on location, 40+ edited images — $100 credits toward your wedding booking.",
  },
  {
    n: "04",
    title: "Headshots",
    tagline: "A photo that finally looks like you.",
    prices: [
      ["Per person", "$100"],
      ["Team (up to 5)", "$400"],
    ],
    note: "20 min, two retouched images sized for LinkedIn and web. Teams: $75 per person after five.",
  },
  {
    n: "05",
    title: "Brand Content",
    tagline: "Social posts and campaigns that keep clients coming back.",
    prices: [
      ["Photo", "from $350"],
      ["With video", "$700"],
      ["Monthly plans", "from $500/mo"],
    ],
    note: "Half-day shoot at your business, 40+ edited images with web + social license.",
  },
  {
    n: "06",
    title: "Events",
    tagline: "The whole story, start to finish.",
    prices: [
      ["Photo", "from $300"],
      ["With video", "from $600"],
    ],
    note: "2-hour minimum, $125 per additional hour, full edited gallery within two weeks.",
  },
];

export default function PhotoPage() {
  const photos = getPhotos();

  return (
    <>
      <Reveal />
      <nav className="rm-nav" aria-label="Main navigation">
        <Link href="/" className="brand">
          <span className="brand-chip"><BrandMark /></span>
          <span className="brand-text">Roth <em>Media</em></span>
        </Link>
        <ul className="nav-links">
          <li>
            <Link href="/video">Video side</Link>
          </li>
          <li>
            <Link href="/quote">Get a quote</Link>
          </li>
          <li>
            <a href={PHONE_HREF}>{PHONE}</a>
          </li>
        </ul>
      </nav>

      <header className="hero">
        <div className="hero-bg" style={{ backgroundImage: "url(/photos/06-engagement-she-said-yes.jpg)" }} />
        <div className="hero-inner">
          <div className="hero-eyebrow">The Photo Side</div>
          <h1>
            Moments,
            <br />
            <em>made to last.</em>
          </h1>
          <div className="hero-cta">
            <Link href="/quote?service=photography" className="hero-cta-primary">
              Get my instant quote →
            </Link>
            <a href="#work" className="hero-cta-secondary">
              See the work
            </a>
          </div>
          <p className="hero-trust">
            Weddings · seniors · engagements · headshots · brands
          </p>
        </div>
      </header>

      <section id="work" className="work">
        <Gallery photos={photos} />
      </section>

      <section id="pricing" className="pricing section-alt">
        <div className="pricing-inner">
          <div className="pricing-head reveal">
            <div className="kick">Real prices, up front</div>
            <h2>Photography packages</h2>
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
            <Link href="/quote?service=photography" className="svc-cta-btn">
              Find my package →
            </Link>
          </div>
        </div>
      </section>

      <footer className="rm-footer">
        <div className="foot-inner">
          <div className="brand">
            <BrandMark />
            Roth <em>Media</em>
          </div>
          <a href={PHONE_HREF}>{PHONE}</a>
          <Link href="/video">The video side</Link>
          <span>© {new Date().getFullYear()} Roth Media</span>
        </div>
      </footer>
    </>
  );
}
