import "../theme/business.css";
import SiteNav from "../../components/SiteNav";
import SiteFooter from "../../components/SiteFooter";
import Reveal from "../../components/Reveal";
import PromoEntry, { PromoCountdown, PromoEnterLink } from "../../components/PromoEntry";
import { PROMO } from "../../lib/promo";

export const metadata = {
  title: "Win a Free Reel Day",
  description:
    "One Twin Tiers business wins a free Reel Day: 8 vertical reels shot at your place, ready to post. Other winners get it half off. Enter in 30 seconds.",
};

const PHONE = "845-549-4425";

export default function PromoPage() {
  return (
    <>
      <SiteNav active="business" cta={{ href: "/quote?for=business", label: "Get a quote" }} />

      <main className="cx-page cx-page--hero bz-page bz-promo">
        <Reveal />

        <header className="cx-hero cx-hero--plain">
          <div className="cx-wrap bz-promo-hero">
            <div className="cx-hero-body">
              <p className="cx-kick">Free Reel Day giveaway</p>
              <h1 className="cx-h1 cx-h1--long">One local business wins a <em>free Reel Day.</em></h1>
              <p className="cx-lede">
                A shoot day at your business, and you walk away with everything below —
                on me. Other winners drawn get the same Reel Day at half price.
                Entries close {PROMO.closesLabel}.
              </p>
              <PromoCountdown />
              <PromoEnterLink />
            </div>
            <section className="cx-card cx-card--accent bz-promo-prize">
              <div className="cx-kick">What the winner gets · ${PROMO.value.toLocaleString("en-US")} value</div>
              <ul className="cx-list">
                <li>A Reel Day: 8 vertical reels for Instagram, Facebook, and TikTok</li>
                <li>Shot at your business — your people, your place, not stock</li>
                <li>One round of revisions, delivered within two weeks — ready to post</li>
                <li>Runner-up winners get the same Reel Day at half price — ${PROMO.runnerUp}</li>
              </ul>
            </section>
          </div>
        </header>

        <section className="cx-section">
          <div className="cx-wrap bz-promo-enter">
            <div className="bz-promo-steps cx-reveal">
              <div className="cx-title">
                <p className="cx-kick">Three steps</p>
                <h2 className="cx-h2">How to enter</h2>
              </div>
              <ol className="cx-steps">
                <li>
                  <span>
                    <strong>Comment your business name</strong> on the giveaway video on{" "}
                    <a href={PROMO.tiktok} target="_blank" rel="noopener noreferrer">TikTok</a>.
                  </span>
                </li>
                <li>
                  <span><strong>Lock it in below</strong> — 30 seconds, so I can actually reach you if you win.</span>
                </li>
                <li>
                  <span><strong>That&apos;s it.</strong> Winner drawn at random {PROMO.drawLabel} and announced on TikTok.</span>
                </li>
              </ol>
            </div>

            <PromoEntry />
          </div>
        </section>

        <section className="cx-section cx-section--rule bz-promo-rules">
          <div className="cx-wrap cx-wrap--narrow cx-prose cx-reveal">
            <h2>The rules, in plain English</h2>
            <p>
              Open to businesses located within about 60 miles of Waverly, NY (the Twin Tiers — Elmira, Corning,
              Ithaca, Sayre, Athens, Towanda, Binghamton and everywhere between). One entry per business. You must be
              18 or older and authorized to speak for the business. Entries close {PROMO.closesLabel}, 2026 at 11:59 PM ET.
            </p>
            <p>
              One grand-prize winner is drawn at random from all valid entries on {PROMO.drawLabel}, announced on
              TikTok, and contacted by phone or email. If the winner doesn&apos;t respond within 72 hours, a new winner
              is drawn. The grand prize is one Reel Day as described above (${PROMO.value} value), to be scheduled
              within 90 days of the draw at a mutually agreed date, at the winner&apos;s location. Additional runner-up
              winners may be drawn and offered the same Reel Day at half price (${PROMO.runnerUp}) — that&apos;s an
              offer, not a charge; runner-ups aren&apos;t obligated to book. No cash value, not transferable, no
              purchase necessary. Entering doesn&apos;t obligate you to anything.
            </p>
            <p>
              This giveaway is run by Roth Media and is in no way sponsored, endorsed, administered by, or
              associated with TikTok, Instagram, or Meta. Questions? Text {PHONE}.
            </p>
          </div>
        </section>
      </main>

      <SiteFooter slim />
    </>
  );
}
