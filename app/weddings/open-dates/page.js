import "../../theme/weddings.css";
import Link from "next/link";
import SiteNav from "../../../components/SiteNav";
import SiteFooter from "../../../components/SiteFooter";
import Reveal from "../../../components/Reveal";
import FilmCard from "../../../components/FilmCard";
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
  // No campaign codes: the cards show the site-wide deal while one runs
  // (lib/deals.js), otherwise the plain price. Same number the quote shows.
  const launch = autoDeal();
  const price = money(applyDeal(film.price, launch));
  const today = money(Math.round(applyDeal(film.price, launch) * 0.3));
  const href = "/quote?for=wedding&pkg=film";

  const year = new Date().getFullYear();

  return (
    <>
      <SiteNav active="weddings" overHero cta={{ href, label: "Grab a date" }} />

      <main className="cx-page cx-page--hero wd-page wd-open">
        <Reveal />

        <header className="cx-hero wd-hero">
          <div className="cx-hero-media">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/photos/10-wedding-before-the-guests.jpg" alt="A barn reception set with tables under string lights, before the guests arrive, in black and white" fetchPriority="high" style={{ objectPosition: "50% 45%" }} />
          </div>
          <div className="cx-hero-shade" />
          <div className="cx-wrap cx-hero-body">
            <p className="cx-kick">Wedding films · Twin Tiers</p>
            <h1 className="cx-h1">Still need a videographer <em>this year?</em></h1>
            <p className="cx-lede">
              Your photographer&apos;s booked. Your vows aren&apos;t going to film themselves. I have a handful of {year} dates left — and if you&apos;re planning for next year, you can lock 2027 at this year&apos;s prices before {c.endsLabel}.
            </p>
            <div className="cx-cta-row">
              <a href="#dates" className="cx-btn cx-btn--light cx-btn--lg">See the open dates</a>
              <a href="#film" className="cx-btn cx-btn--ghost cx-btn--lg">Watch a wedding film</a>
            </div>
          </div>
        </header>

        <section id="dates" className="cx-section cx-section--tight">
          <div className="cx-wrap">
            <div className="cx-grid cx-grid--2 wd-offers">
              <section className="cx-card cx-card--accent wd-offer cx-reveal">
                <p className="cx-kick">This year{launch ? ` · ${launch.pct}% off` : ""}</p>
                <h2 className="cx-h2">Open {year} dates</h2>
                <ul className="cx-pills wd-dates">
                  {c.openDates2026.map((d) => <li key={d}><Link className="cx-pill" href={`${href}&date=${encodeURIComponent(`${d}, ${year}`)}`}>{d}</Link></li>)}
                </ul>
                <p className="cx-fine">{launch ? `Any open ${year} date, ${launch.pct}% off Wedding Videography through ${launch.endsLabel} — no code needed. Tap your date to hold it.` : `Any open ${year} date. Book it online and the date's yours tonight — tap your date to hold it.`}</p>
                <p className="wd-offer-price"><strong className="cx-num">{price}</strong> {launch ? <s>{money(film.price)}</s> : null} <span>· {today} holds it today</span></p>
                <Link className="cx-btn cx-btn--light cx-btn--lg cx-btn--block wd-offer-cta" href={href}>Grab a date{launch ? ` — ${launch.pct}% off through ${launch.endsLabel}` : ""}</Link>
              </section>

              <section className="cx-card wd-offer cx-reveal">
                <p className="cx-kick">Next year{launch ? ` · ${launch.pct}% off` : " · this year's prices"}</p>
                <h2 className="cx-h2">Reserve 2027 now</h2>
                <p className="cx-fine">{launch ? `Reserve any 2027 date at this year's prices, ${launch.pct}% off through ${launch.endsLabel} — no code needed. The 30% retainer holds it; balance isn't due until two weeks before.` : "Reserve any 2027 date before December 31 at this year's prices. The 30% retainer holds it; balance isn't due until two weeks before."}</p>
                <p className="wd-offer-price"><strong className="cx-num">{price}</strong> {launch ? <s>{money(film.price)}</s> : null} <span>· {today} holds it today</span></p>
                <p className="cx-offer">2027 at this year's prices ends {c.endsLabel}. Prices go up in January.</p>
                <Link className="cx-btn cx-btn--ghost cx-btn--lg cx-btn--block wd-offer-cta" href={href}>Lock my 2027 date</Link>
              </section>
            </div>
          </div>
        </section>

        <section id="film" className="cx-band cx-band--black wd-film">
          <div className="cx-wrap wd-film-wrap">
            <div className="wd-film-head cx-reveal">
              <p className="cx-kick">The film</p>
              <p className="wd-film-cap">Matt &amp; April — wedding sneak peek · September 2026</p>
            </div>
            <div className="cx-reveal">
              <FilmCard
                feature
                src={videoUrl("/matt-april-wedding.mp4")}
                poster="/matt-april-wedding-poster.jpg"
                title="Matt & April"
                sub="Wedding sneak peek · September 2026"
              />
            </div>
          </div>
        </section>

        <section className="cx-section">
          <div className="cx-wrap cx-split wd-split">
            <div className="cx-title cx-reveal">
              <p className="cx-kick">{film.name}</p>
              <h2 className="cx-h2">What you get</h2>
            </div>
            <ul className="cx-list wd-get cx-reveal">
              {film.get.map((g) => <li key={g}>{g}</li>)}
              <li>Add photo coverage, a second shooter, or guest photo uploads on the next screen</li>
            </ul>
          </div>
        </section>

        <section className="cx-section cx-section--rule">
          <div className="cx-wrap cx-split wd-split">
            <div className="cx-title cx-reveal">
              <p className="cx-kick">From date to delivery</p>
              <h2 className="cx-h2">How it works</h2>
            </div>
            <ol className="cx-steps cx-reveal">
              <li><span><strong>Pick a date above</strong> and build your package — two minutes, real prices.</span></li>
              <li><span><strong>Book it online.</strong> The 30% retainer holds the date. Balance is due two weeks before, not today.</span></li>
              <li><span><strong>I call you within 24 hours</strong> to plan the day. Sneak peek video lands within 48 hours of the wedding.</span></li>
            </ol>
          </div>
        </section>

        <section className="cx-section cx-section--rule">
          <div className="cx-wrap cx-split wd-split">
            <div className="cx-title cx-reveal">
              <p className="cx-kick">Terms</p>
              <h2 className="cx-h2">The fine print, short version</h2>
            </div>
            <div className="cx-prose cx-reveal">
              <p>{c.areaLine}</p>
              <p>Prices shown are for Wedding Videography booked online through {c.endsLabel}, {year}. Retainers are non-refundable; one free reschedule with 30 days&apos; notice. Open dates are first-come — the list above updates as they book. Full <Link href="/terms">terms</Link>.</p>
              <p>Rather talk first? Text or call <a href={PHONE_HREF}>{PHONE}</a>.</p>
              <div className="cx-cta-row wd-prose-cta">
                <a href="#dates" className="cx-btn cx-btn--ghost">Back to the open dates</a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter slim />
    </>
  );
}
