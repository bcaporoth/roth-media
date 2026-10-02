import Link from "next/link";
import SocialLinks from "../../components/SocialLinks";
import { EMAIL, SAME_AS } from "../../lib/site";
import BrandMark from "../../components/BrandMark";
import { PACKAGES, ADDONS, TRAVEL, money } from "../../lib/packages";
import DealPill from "../../components/DealPill";
import DealPrice from "../../components/DealPrice";
import { videoUrl } from "../../lib/media";

export const metadata = {
  title: "Wedding & Engagement Films — Sayre, Athens, Waverly & the Twin Tiers",
  description:
    `Wedding photography and cinematic wedding films — serving Sayre PA, Athens PA, Waverly NY, Elmira, and Corning. Real prices from ${money(PACKAGES.wedding[0].price)}. Instant quote, no obligation.`,
  alternates: { canonical: "/weddings" },
};

// Deal prices (lib/deals.js) are baked in at render — refresh hourly.
export const revalidate = 3600;

const [PHOTO, FILM] = PACKAGES.wedding;
const addon = (id) => ADDONS.wedding.find((a) => a.id === id);

const PHONE = "845-549-4425";
const PHONE_HREF = "tel:+18455494425";

const FAQS = [
  {
    q: "How much does a wedding photographer or videographer cost in the Twin Tiers?",
    a: `My prices are public: full-day Wedding Photography is ${money(PHOTO.price)} (200–400 fully edited photos) and full-day Wedding Videography is ${money(FILM.price)} (two short films, your full ceremony, and the speeches). Build your exact quote online in two minutes; I confirm the final number in writing before we shoot.`,
  },
  {
    q: "Do you do engagement photos too?",
    a: `Yes — stack an engagement session onto your wedding for ${money(addon("engagement").price)}, perfect for save-the-dates and your wedding website.`,
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
  serviceType: "Wedding videography",
  provider: { "@type": "ProfessionalService", name: "Roth Media", telephone: "+1-845-549-4425", email: EMAIL, url: "https://rothmediaco.com", sameAs: SAME_AS },
  areaServed: ["Sayre PA", "Athens PA", "Waverly NY", "Elmira NY", "Corning NY"],
  offers: PACKAGES.wedding.map((p) => ({ "@type": "Offer", name: p.name, price: p.price, priceCurrency: "USD" })),
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

export default function WeddingsPage() {
  return (
    <>
      <DealPill href="/quote?for=wedding" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_LD) }} />

      <nav className="rm-nav portal-nav" aria-label="Main navigation">
        <Link href="/" className="brand">
          <span className="brand-chip"><BrandMark /></span>
          <span className="brand-text">Roth <em>Media</em></span>
        </Link>
        <ul className="nav-links">
          <li><Link href="/#work">Work</Link></li>
          <li><Link href="/business">For business</Link></li>
          <li><Link href="/#about">About</Link></li>
          <li><Link href="/portal" className="nav-login">Client login</Link></li>
          <li><a href={PHONE_HREF}>{PHONE}</a></li>
        </ul>
      </nav>

      <main className="quote-wrap svc-wrap">
        <div className="kick">Weddings &amp; engagements · Twin Tiers</div>
        <h1>Your day, told the way it felt.</h1>
        <p className="lead">
          Full-day wedding photography, or a cinematic film with your real
          vows and ceremony audio — for couples in Sayre, Athens, Waverly,
          Elmira, Corning, and everywhere in between. Real prices, up front.
        </p>
        <p className="svc-cta-row">
          <Link href="/quote?for=wedding" className="qprimary svc-cta">Build my quote →</Link>
        </p>

        <figure className="svc-video">
          <video controls playsInline preload="none" poster="/nolan-kennedy-cover.png" src={videoUrl("/nolan-kennedy-wedding-hero.mp4")} />
          <figcaption>Nolan &amp; Kennedy — wedding sneak peek</figcaption>
        </figure>

        <section className="svc-section">
          <h2>Two packages. Real prices.</h2>
          <div className="qpkgs two svc-pkgs">
            {PACKAGES.wedding.map((p) => (
              <Link key={p.id} href="/quote?for=wedding" className={`qpkg ${p.popular ? "popular" : ""}`}>
                {p.popular && <span className="qpkg-flag">Most booked</span>}
                <span className="qpkg-name">{p.name}</span>
                <span className="qpkg-price"><DealPrice price={p.price} /> <small>starting at</small></span>
                <span className="qpkg-scope">{p.scope}</span>
                <span className="qpkg-you">You get</span>
                <ul>{p.get.map((g) => <li key={g}>{g}</li>)}</ul>
              </Link>
            ))}
          </div>
          <p className="qhelp svc-note">
            Add what fits: {ADDONS.wedding.filter((a) => !a.hidden).map((a) => `${a.name.replace(/^Add /, "").toLowerCase()} (+${money(a.price)})`).join(", ")}. Every add-on is priced in the quote builder — no phone call required.
          </p>
          <p className="qhelp svc-note">{TRAVEL.line}</p>
        </section>

        <section className="svc-section">
          <h2>How it works</h2>
          <ol className="svc-steps">
            <li><strong>Build your quote online.</strong> Pick your package and add-ons — you see the real starting price in two minutes.</li>
            <li><strong>I confirm it in writing.</strong> Exact number, locked date, no surprises.</li>
            <li><strong>Your day, delivered.</strong> Filmed candid and unobtrusive, delivered online within six weeks — ready to share anywhere.</li>
          </ol>
        </section>

        <section className="svc-section">
          <h2>Questions couples ask</h2>
          {FAQS.map((f) => (
            <details key={f.q} className="svc-faq">
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </section>

        <section className="svc-section svc-final">
          <h2>See your number before you talk to anyone.</h2>
          <p className="qhelp">No obligation — build the quote, and if it feels right, I&apos;ll be in touch within 24 hours.</p>
          <p className="svc-cta-row">
            <Link href="/quote?for=wedding" className="qprimary svc-cta">Get my instant quote →</Link>
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
