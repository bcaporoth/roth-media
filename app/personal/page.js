import Link from "next/link";
import SiteNav from "../../components/SiteNav";
import SiteFooter from "../../components/SiteFooter";
import { PACKAGES, money } from "../../lib/packages";

// "Personal" (2026-11-23): the site leads with business work now. Weddings
// and portraits still have their own pages; this is the door to both.
export const metadata = {
  title: "Weddings & Portraits",
  description:
    "Wedding films and photography, engagements, families and seniors across the Twin Tiers: Waverly, Sayre, Athens, Elmira, Corning and Ithaca. Real prices, up front.",
  alternates: { canonical: "/personal" },
};

const wedFrom = Math.min(...PACKAGES.wedding.map((p) => p.price));
const PORTRAIT = PACKAGES.family[0];

const DOORS = [
  {
    kick: "Weddings",
    from: wedFrom,
    say: "A wedding film or full-day photography. The engagement session is free with your wedding.",
    href: "/weddings",
    cta: "See weddings",
  },
  {
    kick: "Portraits",
    from: PORTRAIT.price,
    say: "Families, seniors, couples and engagements. One hour, 30+ edited photos.",
    href: "/quote?for=portraits",
    cta: "Get a portrait quote",
  },
];

function Arrow() {
  return (
    <svg className="cx-arrow" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="M4 12h15M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function PersonalPage() {
  return (
    <>
      <SiteNav active="personal" overHero cta={{ href: "/quote?for=wedding", label: "Build my quote" }} />
      <main className="cx-page cx-page--hero">
        <header className="cx-hero cx-hero--full">
          <div className="cx-hero-media">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/photos/24-wedding-a-world-of-their-own.jpg" alt="A couple close together in golden light" fetchPriority="high" style={{ objectPosition: "50% 62%" }} />
          </div>
          <div className="cx-hero-shade" />
          <div className="cx-wrap cx-hero-body">
            <p className="cx-kick">Personal · Twin Tiers</p>
            <h1 className="cx-h1">Weddings &amp; portraits.</h1>
            <p className="cx-lede">
              Wedding films and photography, engagements, families and seniors,
              across the Twin Tiers. Real prices, up front.
            </p>
          </div>
        </header>

        <section className="cx-section">
          <div className="cx-wrap">
            <div className="cx-grid cx-grid--2">
              {DOORS.map((d) => (
                <Link key={d.kick} href={d.href} className="cx-card">
                  <p className="cx-kick">{d.kick}</p>
                  <p className="cx-h2">from {money(d.from)}</p>
                  <p className="cx-lede">{d.say}</p>
                  <span className="cx-btn cx-btn--light">{d.cta} <Arrow /></span>
                </Link>
              ))}
            </div>
            <p className="cx-fine" style={{ marginTop: "1.4rem" }}>
              Here for your business? <Link href="/">Head back to business</Link>.
            </p>
          </div>
        </section>
      </main>
      <SiteFooter slim />
    </>
  );
}
