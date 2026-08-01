import Link from "next/link";
import BrandMark from "../components/BrandMark";
import QuoteForm from "../components/QuoteForm";
import Reveal from "../components/Reveal";

const PHONE = "845-549-4425";
const PHONE_HREF = "tel:+18455494425";

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

export default function Home() {
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
            <Link href="/video">Video</Link>
          </li>
          <li>
            <Link href="/photo">Photo</Link>
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
        <header className="split" aria-label="Choose your side">
          <Link href="/video" className="split-panel split-video">
            <span className="split-bg split-bg-video" aria-hidden="true" />
            <span className="split-content">
              <span className="split-kicker">Motion · Sound · Story</span>
              <span className="split-title">
                Video<em>graphy</em>
              </span>
              <span className="split-sub">
                Cinematic films for weddings, brands &amp; the moments that
                move
              </span>
              <span className="split-cta">Enter the video side →</span>
            </span>
          </Link>
          <Link href="/photo" className="split-panel split-photo">
            <span className="split-bg split-bg-photo" aria-hidden="true" />
            <span className="split-content">
              <span className="split-kicker">Light · Stillness · Real</span>
              <span className="split-title">
                Photo<em>graphy</em>
              </span>
              <span className="split-sub">
                Candid photographs for weddings, seniors, brands &amp; the
                people you love
              </span>
              <span className="split-cta">Enter the photo side →</span>
            </span>
          </Link>
          <span className="split-brand" aria-hidden="true">
            Roth <em>Media</em>
          </span>
        </header>

        <section className="statement reveal">
          <p>
            One studio, two crafts. <em>Video</em> when the moment moves,{" "}
            <em>photo</em> when it should stand still — serving the Twin
            Tiers from Waverly to Corning.
          </p>
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
            Answer a few questions and get matched to the package people in
            your shoes actually book — live, as you click. Prefer to talk?
            Call or text <a href={PHONE_HREF}>{PHONE}</a>.
          </p>
          <QuoteForm />
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
