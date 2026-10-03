import Link from "next/link";
import SocialLinks from "../../../components/SocialLinks";
import BrandMark from "../../../components/BrandMark";
import FilmCard from "../../../components/FilmCard";
import { EMAIL } from "../../../lib/site";
import { videoUrl } from "../../../lib/media";
import { PACKAGES, money } from "../../../lib/packages";
import { CAMPAIGN } from "../../../lib/campaign";
import { autoDeal, applyDeal } from "../../../lib/deals";

export const metadata = {
  title: "Still need a wedding videographer this year? Open dates + 2027 early pricing",
  description:
    "Last-minute wedding videography in the Twin Tiers — the 2026 dates still open, 25% off, booked online tonight. Or lock a 2027 date at this year's prices. Waverly, Elmira, Corning, Ithaca, Sayre.",
  alternates: { canonical: "/weddings/open-dates" },
};

// The launch special (lib/deals.js) can beat these codes — refresh hourly.
export const revalidate = 3600;

const PHONE = "845-549-4425";
const PHONE_HREF = "tel:+18455494425";

export default function OpenDatesPage() {
  const film = PACKAGES.wedding.find((p) => p.id === "film");
  const c = CAMPAIGN;
  const priceAfter = (pct) => money(applyDeal(film.price, { pct }));
  const todayAfter = (pct) => money(Math.round(applyDeal(film.price, { pct }) * 0.3));
  // While a bigger site-wide deal runs, show that instead of the code.
  const launch = autoDeal();
  // One number per card: whichever deal is actually live is the one the card talks about.
  const offer = (o) => (launch && launch.pct > o.percent
    ? { pct: launch.pct, live: true, note: `After ${launch.endsLabel} it's ${o.percent}% off with code ${o.code}.`, cta: `${launch.pct}% off through ${launch.endsLabel}`, href: "/quote?for=wedding&pkg=film" }
    : { pct: o.percent, live: false, note: "", cta: `code ${o.code}`, href: `/quote?for=wedding&pkg=film&code=${o.code}` });
  const now = offer(c.thisYear);
  const next = offer(c.nextYear);

  return (
    <>
      <nav className="rm-nav portal-nav" aria-label="Main navigation">
        <Link href="/" className="brand">
          <span className="brand-chip"><BrandMark /></span>
          <span className="brand-text">Roth <em>Media</em></span>
        </Link>
        <ul className="nav-links">
          <li><Link href="/#work">Work</Link></li>
          <li><Link href="/weddings">Weddings</Link></li>
          <li><Link href="/portal" className="nav-login">Client login</Link></li>
          <li><a href={PHONE_HREF}>{PHONE}</a></li>
        </ul>
      </nav>

      <main className="quote-wrap promo-wrap camp-wrap">
        <div className="kick">Wedding films · Twin Tiers</div>
        <h1>Still need a videographer <em>this year?</em></h1>
        <p className="lead">
          Your photographer&apos;s booked. Your vows aren&apos;t going to film themselves. I have a handful of {new Date().getFullYear()} dates left — and if you&apos;re planning for next year, you can lock 2027 at this year&apos;s prices before {c.endsLabel}.
        </p>

        <div className="camp-film">
          <FilmCard
            feature
            src={videoUrl("/matt-april-wedding.mp4")}
            poster="/matt-april-wedding-poster.jpg"
            title="Matt & April"
            sub="Wedding sneak peek · September 2026"
          />
        </div>

        <div className="camp-offers">
          <section className="promo-box camp-offer">
            <div className="qmatch-kick">This year · {now.pct}% off</div>
            <h2>Open {new Date().getFullYear()} dates</h2>
            <ul className="camp-dates">
              {c.openDates2026.map((d) => <li key={d}><Link href={`${now.href}&date=${encodeURIComponent(`${d}, ${new Date().getFullYear()}`)}`}>{d}</Link></li>)}
            </ul>
            <p>{now.live ? `Any open ${new Date().getFullYear()} date, ${now.pct}% off Wedding Videography through ${launch.endsLabel} — no code needed. Tap your date to hold it.` : c.thisYear.blurb}</p>
            {now.note && <p className="camp-note">{now.note}</p>}
            <p className="camp-price"><strong>{priceAfter(now.pct)}</strong> <s>{money(film.price)}</s> · {todayAfter(now.pct)} holds it today</p>
            <Link className="qprimary camp-cta" href={now.href}>Grab a date — {now.cta}</Link>
          </section>

          <section className="promo-box camp-offer">
            <div className="qmatch-kick">Next year · {next.pct}% off</div>
            <h2>Reserve 2027 now</h2>
            <p>{next.live ? `Reserve any 2027 date at this year's prices, ${next.pct}% off through ${launch.endsLabel} — no code needed. The 30% retainer holds it; balance isn't due until two weeks before.` : c.nextYear.blurb}</p>
            {next.note && <p className="camp-note">{next.note}</p>}
            <p className="camp-price"><strong>{priceAfter(next.pct)}</strong> <s>{money(film.price)}</s> · {todayAfter(next.pct)} holds it today</p>
            <p className="camp-note">2027 early pricing ends {c.endsLabel}. Prices go up in January.</p>
            <Link className="qprimary camp-cta" href={next.href}>Lock my 2027 date — {next.cta}</Link>
          </section>
        </div>

        <section className="promo-steps">
          <h2>What you get</h2>
          <ul className="qflow-get promo-get">
            {film.get.map((g) => <li key={g}>{g}</li>)}
            <li>Add photo coverage, a second shooter, or guest photo uploads on the next screen</li>
          </ul>
        </section>

        <section className="promo-steps">
          <h2>How it works</h2>
          <ol>
            <li><strong>Pick a date above</strong> and build your package — two minutes, real prices.</li>
            <li><strong>Book it online.</strong> The 30% retainer holds the date; the code fills in from the button above. Balance is due two weeks before, not today.</li>
            <li><strong>I call you within 24 hours</strong> to plan the day. Sneak peek video lands within 48 hours of the wedding.</li>
          </ol>
        </section>

        <section className="promo-rules">
          <h2>The fine print, short version</h2>
          <p>{c.areaLine}</p>
          <p>Codes apply to Wedding Videography booked online through {c.endsLabel}, {new Date().getFullYear()}; one code per booking. Retainers are non-refundable; one free reschedule with 30 days&apos; notice. Open dates are first-come — the list above updates as they book. Full <Link href="/terms">terms</Link>.</p>
          <p>Rather talk first? Text or call {PHONE}.</p>
        </section>
      </main>

      <footer className="rm-footer">
        <div className="foot-inner">
          <div className="brand"><BrandMark />Roth <em>Media</em></div>
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
