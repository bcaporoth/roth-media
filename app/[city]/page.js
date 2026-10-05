import "../theme/weddings.css";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteNav from "../../components/SiteNav";
import SiteFooter from "../../components/SiteFooter";
import Reveal from "../../components/Reveal";
import FilmCard from "../../components/FilmCard";
import WdPackageCard from "../../components/WdPackageCard";
import { EMAIL, SAME_AS, CALENDLY } from "../../lib/site";
import { PACKAGES, money } from "../../lib/packages";
import DealPill from "../../components/DealPill";
import { CITIES, findCity } from "../../lib/cities";
import { videoUrl } from "../../lib/media";
import { businessLd, breadcrumbLd } from "../../lib/schema";

function Arrow() {
  return (
    <svg className="cx-arrow" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="M4 12h15M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Deal prices (lib/deals.js) are baked in at render — refresh hourly.
export const revalidate = 3600;

export function generateStaticParams() {
  return CITIES.map((c) => ({ city: c.slug }));
}

export async function generateMetadata({ params }) {
  const { city } = await params;
  const c = findCity(city);
  if (!c) return {};
  return {
    title: `Photographer & Videographer in ${c.name}, ${c.state}`,
    description: `Wedding photography, cinematic wedding films, and Content Days for businesses in ${c.name}, ${c.state} — ${c.home ? "based right here" : `${c.drive} from Waverly`}. Real prices: wedding photography from ${money(PACKAGES.wedding[0].price)}, brand video days from ${money(Math.min(...PACKAGES.business.map((p) => p.price)))}. Instant quote.`,
    alternates: { canonical: `/${c.slug}` },
  };
}

export default async function CityPage({ params }) {
  const { city } = await params;
  const c = findCity(city);
  if (!c) notFound();

  const film = PACKAGES.wedding.find((p) => p.popular) || PACKAGES.wedding[0];
  const day = PACKAGES.business.find((p) => p.popular) || PACKAGES.business[0];

  const JSON_LD = businessLd({
    url: `https://rothmediaco.com/${c.slug}`,
    description: `Photographer and videographer for ${c.name}, ${c.state} and ${c.region} — wedding photography and films, brand video for local businesses, events, and portraits. Based in Waverly, NY${c.home ? "" : `, ${c.drive} away`}.`,
    areaServed: [`${c.name} ${c.state}`, ...c.nearby.map((n) => `${n} ${c.state}`)],
  });
  const CRUMBS_LD = breadcrumbLd([{ name: "Roth Media", path: "/" }, { name: `${c.name}, ${c.state}`, path: `/${c.slug}` }]);

  const FAQS = [
    { q: `Do you travel to ${c.name}?`, a: `${c.home ? `Yes — I'm based in ${c.name}, so there's no travel at all` : `Yes — ${c.name} is ${c.drive} from Waverly`} and travel's included anywhere within an hour of Corning, Waverly, Sayre, or Athens. I also film in ${c.nearby.slice(0, 3).join(", ")}.` },
    { q: `How much does a wedding photographer or videographer cost in ${c.name}?`, a: `My prices are public. ${PACKAGES.wedding[0].name} starts at ${money(PACKAGES.wedding[0].price)}; ${film.name} — the full day — starts at ${money(film.price)}. You can build your exact quote online in two minutes.` },
    { q: `What does a Content Day cost for a ${c.name} business?`, a: `The ${day.name} is ${money(day.price)} — a 45–90 second promo, 8 vertical reels, and 15–30 edited photos, delivered within two weeks and cleared for ads. Skip the promo? The Mini Content Day is ${money(Math.min(...PACKAGES.business.map((p) => p.price)))}.` },
    { q: "When do we get everything?", a: "Wedding films are delivered online within six weeks, with a sneak peek within 48 hours. Business content lands within two weeks, edited and sized to post." },
  ];
  const FAQ_LD = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQS.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) };

  return (
    <>
      <DealPill />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_LD) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(CRUMBS_LD) }} />

      <SiteNav overHero />

      <main className="cx-page cx-page--hero wd-page wd-city">
        <Reveal />

        <header className="cx-hero wd-hero">
          <div className="cx-hero-media">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/photos/24-wedding-a-world-of-their-own.jpg" alt="A wedding couple alone in a wide open field, in black and white" fetchPriority="high" style={{ objectPosition: "50% 62%" }} />
          </div>
          <div className="cx-hero-shade" />
          <div className="cx-wrap cx-hero-body">
            <p className="cx-kick">{c.name}, {c.state} · {c.region}</p>
            <h1 className="cx-h1 cx-h1--long">Photographer and videographer for {c.name} weddings and {c.name} businesses.</h1>
            <p className="cx-lede">{c.intro}</p>
            <div className="cx-cta-row">
              <Link href="/quote" className="cx-btn cx-btn--light cx-btn--lg">Build my quote <Arrow /></Link>
              <a href={CALENDLY} className="cx-btn cx-btn--ghost cx-btn--lg" target="_blank" rel="noopener noreferrer">or book a 15-minute call</a>
            </div>
          </div>
        </header>

        <section id="film" className="cx-band cx-band--black wd-film">
          <div className="cx-wrap wd-film-wrap">
            <div className="wd-film-head cx-reveal">
              <p className="cx-kick">The film</p>
              <p className="wd-film-cap">Matt &amp; April — wedding sneak peek, Twin Tiers</p>
            </div>
            <div className="cx-reveal">
              <FilmCard
                feature
                preload="none"
                src={videoUrl("/matt-april-wedding.mp4")}
                poster="/matt-april-wedding-poster.jpg"
                title="Matt & April"
                sub="Wedding sneak peek, Twin Tiers"
              />
            </div>
          </div>
        </section>

        <section id="weddings" className="cx-section">
          <div className="cx-wrap">
            <div className="cx-title cx-reveal">
              <p className="cx-kick">Weddings · the price list</p>
              <h2 className="cx-h2">Weddings in {c.name}</h2>
            </div>
            <div className="cx-grid cx-grid--2 wd-pkgs cx-reveal">
              {PACKAGES.wedding.map((p) => (
                <WdPackageCard key={p.id} p={p} href="/quote?for=wedding" />
              ))}
            </div>
            <p className="cx-fine wd-after cx-reveal">Photo coverage, a second shooter, an engagement session, and more are priced in the quote builder. <Link href="/weddings" className="wd-inline">See everything on the weddings page →</Link></p>
          </div>
        </section>

        <section id="business" className="cx-section cx-section--rule">
          <div className="cx-wrap">
            <div className="cx-title cx-reveal">
              <p className="cx-kick">Business · the price list</p>
              <h2 className="cx-h2">Brand video for {c.name} businesses</h2>
              <p className="cx-lede">{c.business}</p>
            </div>
            <div className="cx-grid cx-grid--3 wd-pkgs cx-reveal">
              {PACKAGES.business.map((p) => (
                <WdPackageCard key={p.id} p={p} href="/quote?for=business" />
              ))}
            </div>
            <p className="cx-fine wd-after cx-reveal"><Link href="/business" className="wd-inline">See the full business page →</Link></p>
          </div>
        </section>

        <section id="faq" className="cx-section cx-section--rule">
          <div className="cx-wrap cx-split wd-split">
            <div className="cx-title cx-reveal">
              <p className="cx-kick">Before you book</p>
              <h2 className="cx-h2">Questions from {c.name}</h2>
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

        <section className="cx-section cx-band wd-also">
          <div className="cx-wrap cx-wrap--mid cx-stack cx-reveal">
            <p className="cx-kick">On location</p>
            <h2 className="cx-h2">Also filming in {c.nearby.join(", ")}.</h2>
            <p className="cx-lede wd-also-lede">Based in Waverly, NY. Serving the Twin Tiers and the southern Finger Lakes — {CITIES.filter((x) => x.slug !== c.slug).map((x, i, arr) => (
              <span key={x.slug}><Link href={`/${x.slug}`} className="wd-inline">{x.name}</Link>{i < arr.length - 1 ? ", " : ""}</span>
            ))}, Sayre, Athens, and Towanda.</p>
            <div className="cx-cta-row">
              <Link href="/quote" className="cx-btn cx-btn--light cx-btn--xl">Get my instant quote <Arrow /></Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
