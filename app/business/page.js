import Link from "next/link";
import BrandMark from "../../components/BrandMark";
import { PACKAGES, ADDONS, money } from "../../lib/packages";

export const metadata = {
  title: "Brand Video & Content Days for Twin Tiers Businesses",
  description:
    "A Content Day gets your business a brand video, vertical reels, and edited photos in one shoot — Sayre, Athens, Waverly, Elmira & Corning. From $750, delivered in two weeks.",
  alternates: { canonical: "/business" },
};

const PHONE = "845-549-4425";
const PHONE_HREF = "tel:+18455494425";

const FAQS = [
  {
    q: "What is a Content Day?",
    a: "One shoot day at your business that walks away as a month of marketing: a 60–90 second brand video for your website and ads, vertical reels for Instagram, Facebook, and TikTok, and edited photos licensed for web and social. Mini starts at $750, the Full Content Day at $1,500.",
  },
  {
    q: "How fast do I get my content?",
    a: "Everything is delivered within two weeks, edited and sized to post. One round of revisions is included.",
  },
  {
    q: "Can I use the videos in paid ads?",
    a: "Yes. All music is licensed through Epidemic Sound and your finished videos are cleared for your website, socials, and online advertising.",
  },
  {
    q: "What if I want content every month?",
    a: "The Every Other Month plan books a Full Content Day six times a year at $1,250 per visit — billed per shoot, no lump sum, with priority scheduling. Your feed never goes quiet.",
  },
  {
    q: "Do you build websites too?",
    a: "Yes — a full site built from your Content Day footage, photos, and words is available from $2,000. We scope it together on a call.",
  },
];

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Service",
  serviceType: "Brand video and content production",
  provider: { "@type": "ProfessionalService", name: "Roth Media", telephone: "+1-845-549-4425", url: "https://rothmediaco.com" },
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
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_LD) }} />

      <nav className="rm-nav portal-nav" aria-label="Main navigation">
        <Link href="/" className="brand">
          <span className="brand-chip"><BrandMark /></span>
          <span className="brand-text">Roth <em>Media</em></span>
        </Link>
        <ul className="nav-links">
          <li><Link href="/#work">Work</Link></li>
          <li><Link href="/weddings">Weddings</Link></li>
          <li><Link href="/#about">About</Link></li>
          <li><Link href="/portal" className="nav-login">Client login</Link></li>
          <li><a href={PHONE_HREF}>{PHONE}</a></li>
        </ul>
      </nav>

      <main className="quote-wrap svc-wrap">
        <div className="kick">Branded content · Twin Tiers</div>
        <h1>One shoot day. A month of content.</h1>
        <p className="lead">
          A brand video, vertical reels, and edited photos from a single Content
          Day at your business — for shops, gyms, restaurants, and makers in
          Sayre, Athens, Waverly, Elmira, and Corning.
        </p>
        <p className="svc-cta-row">
          <Link href="/quote?for=business" className="qprimary svc-cta">Build my quote →</Link>
        </p>

        <div className="svc-video-grid">
          <figure className="svc-video">
            <video controls playsInline preload="none" poster="/reels/nicole-golden-zumba-promo-poster.jpg" src="/reels/nicole-golden-zumba-promo.mp4" />
            <figcaption>Nicole Golden — Zumba class promo</figcaption>
          </figure>
          <figure className="svc-video">
            <video controls playsInline preload="none" src="/reels/bake-against-the-grain.mp4" />
            <figcaption>Bake Against the Grain — brand film</figcaption>
          </figure>
        </div>

        <section className="svc-section">
          <h2>Pick your day.</h2>
          <div className="qpkgs svc-pkgs">
            {PACKAGES.business.map((p) => (
              <Link key={p.id} href="/quote?for=business" className={`qpkg ${p.popular ? "popular" : ""}`}>
                {p.popular && <span className="qpkg-flag">Most booked</span>}
                <span className="qpkg-name">{p.name}</span>
                <span className="qpkg-price">{money(p.price)}{p.per || ""} <small>starting at</small></span>
                <span className="qpkg-scope">{p.scope}</span>
                <span className="qpkg-you">You get</span>
                <ul>{p.get.map((g) => <li key={g}>{g}</li>)}</ul>
              </Link>
            ))}
          </div>
          <p className="qhelp svc-note">
            Add what fits: {ADDONS.business.map((a) => `${a.name.toLowerCase()} (${a.from ? "from " : ""}+${money(a.price)})`).join(", ")}. Every add-on is priced in the quote builder.
          </p>
        </section>

        <section className="svc-section">
          <h2>How it works</h2>
          <ol className="svc-steps">
            <li><strong>Build your quote online.</strong> Pick a day and add-ons — real starting price in two minutes.</li>
            <li><strong>We plan the shoot.</strong> I confirm the number in writing and we map what your business needs on camera.</li>
            <li><strong>Post everything.</strong> Delivered within two weeks — edited, licensed, and sized for your website, ads, and socials.</li>
          </ol>
        </section>

        <section className="svc-section">
          <h2>Questions owners ask</h2>
          {FAQS.map((f) => (
            <details key={f.q} className="svc-faq">
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </section>

        <section className="svc-section svc-final">
          <h2>Your competitors are posting. Out-post them.</h2>
          <p className="qhelp">Build the quote — no obligation, and I&apos;ll be in touch within 24 hours.</p>
          <p className="svc-cta-row">
            <Link href="/quote?for=business" className="qprimary svc-cta">Get my instant quote →</Link>
          </p>
        </section>
      </main>

      <footer className="rm-footer">
        <div className="foot-inner">
          <div className="brand"><BrandMark />Roth <em>Media</em></div>
          <span>Waverly, NY — serving the Twin Tiers</span>
          <a href={PHONE_HREF}>{PHONE}</a>
          <Link href="/portal">Client login</Link>
          <span>© {new Date().getFullYear()} Roth Media</span>
        </div>
      </footer>
    </>
  );
}
