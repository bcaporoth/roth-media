import Link from "next/link";
import { notFound } from "next/navigation";
import BrandMark from "../../components/BrandMark";
import SocialLinks from "../../components/SocialLinks";
import { EMAIL, SAME_AS, CALENDLY } from "../../lib/site";
import { PACKAGES, money } from "../../lib/packages";
import { CITIES, findCity } from "../../lib/cities";

const PHONE = "845-549-4425";
const PHONE_HREF = "tel:+18455494425";

export function generateStaticParams() {
  return CITIES.map((c) => ({ city: c.slug }));
}

export async function generateMetadata({ params }) {
  const { city } = await params;
  const c = findCity(city);
  if (!c) return {};
  return {
    title: `Wedding Videographer & Brand Video in ${c.name}, ${c.state}`,
    description: `Cinematic wedding films and Content Days for businesses in ${c.name}, ${c.state} — ${c.drive} from Waverly. Real prices: wedding films from ${money(PACKAGES.wedding[0].price)}, brand video days from ${money(PACKAGES.business[0].price)}. Instant quote.`,
    alternates: { canonical: `/${c.slug}` },
  };
}

export default async function CityPage({ params }) {
  const { city } = await params;
  const c = findCity(city);
  if (!c) notFound();

  const film = PACKAGES.wedding.find((p) => p.popular) || PACKAGES.wedding[0];
  const day = PACKAGES.business.find((p) => p.popular) || PACKAGES.business[0];

  const JSON_LD = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: "Roth Media",
    url: `https://rothmediaco.com/${c.slug}`,
    telephone: "+1-845-549-4425",
    email: EMAIL,
    sameAs: SAME_AS,
    description: `Wedding videography and brand video for ${c.name}, ${c.state} and ${c.region}.`,
    address: { "@type": "PostalAddress", addressLocality: "Waverly", addressRegion: "NY" },
    areaServed: [`${c.name} ${c.state}`, ...c.nearby.map((n) => `${n} ${c.state}`)],
    makesOffer: [
      { "@type": "Offer", name: `${film.name} — ${c.name} wedding videography`, price: film.price, priceCurrency: "USD" },
      { "@type": "Offer", name: `${day.name} — ${c.name} brand video`, price: day.price, priceCurrency: "USD" },
    ],
  };

  const FAQS = [
    { q: `Do you travel to ${c.name}?`, a: `Yes — ${c.name} is ${c.drive} from Waverly and there's no travel fee anywhere in the Twin Tiers or the southern Finger Lakes. I also film in ${c.nearby.slice(0, 3).join(", ")}.` },
    { q: `How much does a wedding videographer cost in ${c.name}?`, a: `My prices are public. ${PACKAGES.wedding[0].name} starts at ${money(PACKAGES.wedding[0].price)}; ${film.name} — the full day — starts at ${money(film.price)}. You can build your exact quote online in two minutes.` },
    { q: `What does a Content Day cost for a ${c.name} business?`, a: `${PACKAGES.business[0].name} starts at ${money(PACKAGES.business[0].price)} and the ${day.name} at ${money(day.price)} — a 60–90 second brand video, vertical reels, and edited photos, delivered within two weeks and cleared for ads.` },
    { q: "When do we get everything?", a: "Wedding films are delivered online within six weeks, with a next-day sneak peek on The Wedding Film. Business content lands within two weeks, edited and sized to post." },
  ];
  const FAQ_LD = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQS.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) };

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
          <li><Link href="/business">For business</Link></li>
          <li><Link href="/portal" className="nav-login">Client login</Link></li>
          <li><a href={PHONE_HREF}>{PHONE}</a></li>
        </ul>
      </nav>

      <main className="quote-wrap svc-wrap">
        <div className="kick">{c.name}, {c.state} · {c.region}</div>
        <h1>Videographer for {c.name} weddings and {c.name} businesses.</h1>
        <p className="lead">{c.intro}</p>
        <p className="svc-cta-row">
          <Link href="/quote" className="qprimary svc-cta">Build my quote →</Link>
          <a href={CALENDLY} className="svc-cta-secondary" target="_blank" rel="noopener noreferrer">or book a 15-minute call</a>
        </p>

        <figure className="svc-video">
          <video controls playsInline preload="none" poster="/nolan-kennedy-cover.png" src="/nolan-kennedy-wedding-hero.mp4" />
          <figcaption>Nolan &amp; Kennedy — wedding sneak peek, Twin Tiers</figcaption>
        </figure>

        <section className="svc-section">
          <h2>Weddings in {c.name}</h2>
          <div className="qpkgs two svc-pkgs">
            {PACKAGES.wedding.map((p) => (
              <Link key={p.id} href="/quote?for=wedding" className={`qpkg ${p.popular ? "popular" : ""}`}>
                {p.popular && <span className="qpkg-flag">Most booked</span>}
                <span className="qpkg-name">{p.name}</span>
                <span className="qpkg-price">{money(p.price)} <small>starting at</small></span>
                <span className="qpkg-scope">{p.scope}</span>
                <span className="qpkg-you">You get</span>
                <ul>{p.get.map((g) => <li key={g}>{g}</li>)}</ul>
              </Link>
            ))}
          </div>
          <p className="qhelp svc-note">Photo coverage, a second shooter, an engagement session, and more are priced in the quote builder. <Link href="/weddings">See everything on the weddings page →</Link></p>
        </section>

        <section className="svc-section">
          <h2>Brand video for {c.name} businesses</h2>
          <p className="qhelp">{c.business}</p>
          <div className="qpkgs three svc-pkgs">
            {PACKAGES.business.map((p) => (
              <Link key={p.id} href="/quote?for=business" className={`qpkg ${p.popular ? "popular" : ""}`}>
                {p.popular && <span className="qpkg-flag">Most booked</span>}
                <span className="qpkg-name">{p.name}</span>
                <span className="qpkg-price">{money(p.price)}{p.per ? <small>{p.per}</small> : <small>starting at</small>}</span>
                <span className="qpkg-scope">{p.scope}</span>
                <span className="qpkg-you">You get</span>
                <ul>{p.get.map((g) => <li key={g}>{g}</li>)}</ul>
              </Link>
            ))}
          </div>
          <p className="qhelp svc-note"><Link href="/business">See the full business page →</Link></p>
        </section>

        <section className="svc-section">
          <h2>Questions from {c.name}</h2>
          {FAQS.map((f) => (
            <details key={f.q} className="svc-faq">
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </section>

        <section className="svc-section svc-final">
          <h2>Also filming in {c.nearby.join(", ")}.</h2>
          <p className="qhelp">Based in Waverly, NY. Serving the Twin Tiers and the southern Finger Lakes — {CITIES.filter((x) => x.slug !== c.slug).map((x, i, arr) => (
            <span key={x.slug}><Link href={`/${x.slug}`}>{x.name}</Link>{i < arr.length - 1 ? ", " : ""}</span>
          ))}, Sayre, Athens, and Towanda.</p>
          <p className="svc-cta-row">
            <Link href="/quote" className="qprimary svc-cta">Get my instant quote →</Link>
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
