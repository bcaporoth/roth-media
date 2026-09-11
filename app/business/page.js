import Link from "next/link";
import SocialLinks from "../../components/SocialLinks";
import { EMAIL, SAME_AS, CALENDLY } from "../../lib/site";
import BrandMark from "../../components/BrandMark";
import { PACKAGES, ADDONS, money } from "../../lib/packages";

export const metadata = {
  title: "Brand Video & Content Days for Twin Tiers Businesses",
  description:
    "A Reel Day fills your feed with 8 vertical reels from one shoot; a Full Content Day adds your brand video and photos — Sayre, Athens, Waverly, Elmira & Corning. From $800.",
  alternates: { canonical: "/business" },
};

const PHONE = "845-549-4425";
const PHONE_HREF = "tel:+18455494425";

const FAQS = [
  {
    q: "What does a Content Day cost, and what do I get?",
    a: "A Content Day is $750 — one visit to your business, typically a half day, and you walk away with a 60–90 second promo for anything you want to promote, sized for your website, Instagram, Facebook, and TikTok. Want more from the same shoot? A second promo is a $400 add-on.",
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
    q: "Do you do photos too?",
    a: "Yes — a brand photo session is a $650 add-on: a dedicated 2-hour photo visit on its own day, 30 edited photos licensed for web and social.",
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
        <h1>One Content Day. One promo that sells.</h1>
        <p className="lead">
          A 60–90 second promo shot at your business, for anything you want
          to promote — for shops, gyms, restaurants, builders, and makers in
          Sayre, Athens, Waverly, Elmira, and Corning.
        </p>
        <p className="svc-cta-row">
          <Link href="/quote?for=business" className="qprimary svc-cta">Build my quote →</Link>
          <a href={CALENDLY} className="svc-cta-secondary" target="_blank" rel="noopener noreferrer">or book a 15-minute call</a>
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
          <h2>One package. One real price.</h2>
          <div className={`qpkgs svc-pkgs ${PACKAGES.business.length === 1 ? "one" : PACKAGES.business.length === 2 ? "two" : ""}`}>
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
          <h2>What would your promo be?</h2>
          <p className="svc-note">
            Every business has one story worth 60 seconds. A few we&apos;d pitch:
          </p>
          <div className="svc-ideas">
            <div className="svc-idea">
              <strong>A restaurant</strong>
              <p>Friday night at full tilt — the kitchen firing, plates hitting the pass, regulars mid-laugh. Ends on the dish everyone orders.</p>
            </div>
            <div className="svc-idea">
              <strong>A gym</strong>
              <p>The 6 AM crew — chalk, last reps, a PR bell, your coaches actually coaching. The energy people join for.</p>
            </div>
            <div className="svc-idea">
              <strong>A bookstore</strong>
              <p>Shelves worth getting lost in — staff picks, page turns, the reading chair in the window. An afternoon people can feel.</p>
            </div>
            <div className="svc-idea">
              <strong>A construction company</strong>
              <p>One job, start to finish — day-one dirt to the final walkthrough. Proof of work that wins the next bid.</p>
            </div>
          </div>
          <p className="svc-note">
            Something else? Whatever you do, there&apos;s a promo in it — we find
            it together on the planning call.
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
            <a href={CALENDLY} className="svc-cta-secondary" target="_blank" rel="noopener noreferrer">or book a 15-minute call</a>
          </p>
        </section>
      </main>

      <footer className="rm-footer">
        <div className="foot-inner">
          <div className="brand"><BrandMark />Roth <em>Media</em></div>
          <span>Waverly, NY — serving the Twin Tiers</span>
          <a href={PHONE_HREF}>{PHONE}</a>
          <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
          <SocialLinks />
          <Link href="/portal">Client login</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <span>© {new Date().getFullYear()} Roth Media</span>
        </div>
      </footer>
    </>
  );
}
