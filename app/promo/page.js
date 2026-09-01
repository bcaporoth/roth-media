import Link from "next/link";
import SocialLinks from "../../components/SocialLinks";
import { EMAIL, SAME_AS } from "../../lib/site";
import BrandMark from "../../components/BrandMark";
import PromoEntry, { PromoCountdown } from "../../components/PromoEntry";
import { PROMO } from "../../lib/promo";

export const metadata = {
  title: "Win a Free Content Day — Roth Media",
  description:
    "One Twin Tiers business wins a free Content Day: a brand video, ten reels, and 20–40 edited photos. Enter in 30 seconds.",
};

const PHONE = "845-549-4425";
const PHONE_HREF = "tel:+18455494425";

export default function PromoPage() {
  return (
    <>
      <nav className="rm-nav portal-nav" aria-label="Main navigation">
        <Link href="/" className="brand">
          <span className="brand-chip"><BrandMark /></span>
          <span className="brand-text">Roth <em>Media</em></span>
        </Link>
        <ul className="nav-links">
          <li><Link href="/#work">Work</Link></li>
          <li><Link href="/#pricing">Pricing</Link></li>
          <li><Link href="/portal" className="nav-login">Client login</Link></li>
          <li><a href={PHONE_HREF}>{PHONE}</a></li>
        </ul>
      </nav>

      <main className="quote-wrap promo-wrap">
        <div className="kick">Free Content Day giveaway</div>
        <h1>One local business wins a <em>free Content Day.</em></h1>
        <p className="lead">
          A full day of filming at your business, and you walk away with everything below —
          on me. Entries close {PROMO.closesLabel}.
        </p>

        <PromoCountdown />

        <section className="promo-box">
          <div className="qmatch-kick">What the winner gets · ${PROMO.value.toLocaleString("en-US")} value</div>
          <ul className="qflow-get promo-get">
            <li>A 60–90 second brand video for your website and ads</li>
            <li>10 vertical reels for Instagram, Facebook, and TikTok</li>
            <li>20–40 edited photos, licensed for web and social</li>
            <li>One round of revisions, delivered within two weeks — ready to post</li>
          </ul>
        </section>

        <section className="promo-steps">
          <h2>How to enter</h2>
          <ol>
            <li>
              <strong>Comment your business name</strong> on the giveaway video on{" "}
              <a href={PROMO.tiktok} target="_blank" rel="noopener noreferrer">TikTok</a>.
            </li>
            <li>
              <strong>Lock it in below</strong> — 30 seconds, so I can actually reach you if you win.
            </li>
            <li>
              <strong>That&apos;s it.</strong> Winner drawn at random {PROMO.drawLabel} and announced on TikTok.
            </li>
          </ol>
        </section>

        <PromoEntry />

        <section className="promo-rules">
          <h2>The rules, in plain English</h2>
          <p>
            Open to businesses located within about 60 miles of Waverly, NY (the Twin Tiers — Elmira, Corning,
            Ithaca, Sayre, Athens, Towanda, Binghamton and everywhere between). One entry per business. You must be
            18 or older and authorized to speak for the business. Entries close {PROMO.closesLabel}, 2026 at 11:59 PM ET.
          </p>
          <p>
            One winner is drawn at random from all valid entries on {PROMO.drawLabel}, announced on TikTok, and
            contacted by phone or email. If the winner doesn&apos;t respond within 72 hours, a new winner is drawn.
            The prize is one Content Day as described above, to be scheduled within 90 days of the draw at a
            mutually agreed date, at the winner&apos;s location. No cash value, not transferable, no purchase
            necessary. Entering doesn&apos;t obligate you to anything.
          </p>
          <p>
            This giveaway is run by Roth Media and is in no way sponsored, endorsed, administered by, or
            associated with TikTok, Instagram, or Meta. Questions? Text {PHONE}.
          </p>
        </section>
      </main>

      <footer className="rm-footer">
        <div className="foot-inner">
          <div className="brand">
            <BrandMark />
            Roth <em>Media</em>
          </div>
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
