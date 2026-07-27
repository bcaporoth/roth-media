import fs from "fs";
import path from "path";
import Gallery from "../components/Gallery";
import ContactForm from "../components/ContactForm";
import Reveal from "../components/Reveal";

const PHONE = "845-549-4425";
const PHONE_HREF = "tel:+18455494425";

// Filenames follow NN-category-caption-words.ext; category prefixes map to
// gallery filters (gym → fitness, senior → seniors, engagement → engagements).
const CATEGORY_MAP = {
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
      .filter((f) => /\.(jpe?g|png|webp|avif)$/i.test(f))
      .sort()
      .map((f) => {
        const slug = f.replace(/\.[^.]+$/, "").replace(/^\d+-/, "");
        const [first, ...rest] = slug.split("-");
        const category = CATEGORY_MAP[first] || "lifestyle";
        const capSource = (CATEGORY_MAP[first] ? rest : [first, ...rest])
          .join(" ")
          .replace(/^(athlete |portrait )/, "");
        const caption =
          capSource.charAt(0).toUpperCase() + capSource.slice(1);
        return { src: `/photos/${f}`, category, caption };
      });
  } catch {
    return [];
  }
}

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  name: "Roth Media",
  url: "https://rothmediaco.com",
  telephone: "+1-845-549-4425",
  description:
    "Short-form video, brand content, and photography for local businesses in the Twin Tiers — Waverly NY, Athens PA, Sayre PA, Elmira NY, and Corning NY.",
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

export default function Home() {
  const photos = getPhotos();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <Reveal />

      <nav className="rm-nav" aria-label="Main navigation">
        <a href="#top" className="brand">
          Roth <em>Media</em>
        </a>
        <ul className="nav-links">
          <li>
            <a href="#work">Work</a>
          </li>
          <li>
            <a href="#services">Services</a>
          </li>
          <li>
            <a href="#about">About</a>
          </li>
          <li>
            <a href="#contact">Contact</a>
          </li>
          <li>
            <a href={PHONE_HREF}>{PHONE}</a>
          </li>
        </ul>
      </nav>

      <main id="top">
        <header className="hero">
          <div className="hero-bg" />
          <div className="hero-inner">
            <div className="hero-eyebrow">
              Waverly · Athens · Sayre · Elmira · Corning
            </div>
            <h1>
              Content people
              <br />
              <em>stop for.</em>
            </h1>
            <div className="hero-meta">
              <span className="loc">
                Short-form video · Brand photo · Headshots · Events
              </span>
            </div>
            <div className="hero-cta">
              <a href="#contact" className="hero-cta-primary">
                Start a project →
              </a>
              <a href="#services" className="hero-cta-secondary">
                See real prices
              </a>
            </div>
            <p className="hero-trust">
              Video from $450 · photo from $350 · no obligation
            </p>
          </div>
          <div className="hero-scroll">Scroll</div>
        </header>

        <section className="statement reveal">
          <p>
            I don&apos;t just make <em>content</em>. I make the stuff people
            stop scrolling for — the moments that make your business feel
            like somewhere worth going.
          </p>
        </section>

        <section id="work" className="work">
          <Gallery photos={photos} />
        </section>

        <section id="services" className="services">
          <div className="svc-inner">
            <div className="kick">Services</div>
            <h2>
              What I <em>make.</em>
            </h2>
            <p className="svc-lead">
              Real prices, up front. Every project starts with a
              conversation about your business — then I come back with ideas
              for how to shoot it.
            </p>
            <div className="svc-list">
              <div className="svc-item">
                <div className="n">01</div>
                <h3>Brand Video</h3>
                <p>
                  Reels, promos, and vertical video built for how people
                  actually watch.
                </p>
                <ul className="svc-prices">
                  <li>
                    <span className="svc-price-label">Video</span>
                    <span className="svc-price-value">from $450</span>
                  </li>
                  <li>
                    <span className="svc-price-label">Monthly</span>
                    <span className="svc-price-value">from $500/mo</span>
                  </li>
                </ul>
                <p className="svc-includes">
                  Half-day shoot at your business. A 90-second promo plus
                  three vertical reels, cut for social.
                </p>
              </div>
              <div className="svc-item">
                <div className="n">02</div>
                <h3>Brand Photo</h3>
                <p>
                  Your product, your space, and your people — photographed
                  properly.
                </p>
                <ul className="svc-prices">
                  <li>
                    <span className="svc-price-label">Photo</span>
                    <span className="svc-price-value">from $350</span>
                  </li>
                </ul>
                <p className="svc-includes">
                  Half-day shoot, 40+ edited images with web and social
                  license — for listings, menus, ads, and posts.
                </p>
              </div>
              <div className="svc-item">
                <div className="n">03</div>
                <h3>Headshots &amp; Events</h3>
                <p>
                  Team headshots on-site, and full event coverage start to
                  finish.
                </p>
                <ul className="svc-prices">
                  <li>
                    <span className="svc-price-label">Headshots</span>
                    <span className="svc-price-value">from $100</span>
                  </li>
                  <li>
                    <span className="svc-price-label">Events</span>
                    <span className="svc-price-value">from $300</span>
                  </li>
                </ul>
                <p className="svc-includes">
                  Headshots: two retouched images each, team of five for
                  $400. Events: edited gallery within two weeks.
                </p>
              </div>
            </div>
            <p className="svc-footnote">
              Also booking weddings, seniors, engagements, and portraits —{" "}
              <a href="#contact">ask for details</a>.
            </p>
            <div className="svc-cta">
              <a href="#contact" className="svc-cta-btn">
                Start a project →
              </a>
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

        <section id="contact" className="contact">
          <div className="kick">Contact</div>
          <h2>
            Let&apos;s make something
            <br />
            <em>people stop for.</em>
          </h2>
          <p className="lead">
            Tell me what you sell or what you do. Prefer to talk? Call or
            text <a href={PHONE_HREF}>{PHONE}</a>.
          </p>
          <ContactForm />
        </section>
      </main>

      <footer className="rm-footer">
        <div className="foot-inner">
          <div className="brand">
            Roth <em>Media</em>
          </div>
          <span>Waverly, NY — serving the Twin Tiers</span>
          <a href={PHONE_HREF}>{PHONE}</a>
          <a href="/portal">Client login</a>
          <span>© {new Date().getFullYear()} Roth Media</span>
        </div>
      </footer>
    </>
  );
}
