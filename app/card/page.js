import Link from "next/link";
import "../theme/misc.css";
import Reveal from "../../components/Reveal";
import BrandMark from "../../components/BrandMark";
import CardLeadForm from "../../components/CardLeadForm";
import CardLink from "../../components/CardLink";
import { CALENDLY, EMAIL, PHONE, OWNER_NAME, REVIEW_URL, SOCIAL } from "../../lib/site";
import { CATEGORIES, PACKAGES } from "../../lib/packages";
import { stripeConfigured } from "../../lib/stripe";
import { autoDeal } from "../../lib/deals";
import DealPrice from "../../components/DealPrice";

const MENU_LABEL = { wedding: "Weddings", business: "Businesses & events", family: "Portraits" };
const STEPS = [
  ["Say hi", "Send the form, text, or book a call. You hear back the same day."],
  ["15-minute call", "I ask about your day or your business and what a win looks like."],
  ["Your plan + price", "A written plan and a firm number, the same day as the call."],
  ["Lock the date", "Book and pay online. Weddings hold the date with 50% down."],
  ["Shoot + delivery", "Sneak peek in 48 hours. Everything in your own private gallery."],
];

function Arrow() {
  return (
    <svg className="mx-arrow" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="M4 12h15M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export const metadata = {
  title: "Brandon Roth",
  description:
    "Save my contact, get an instant quote, or book a quick call. Video & photo for weddings, portraits, and local businesses in the Twin Tiers.",
  alternates: { canonical: "/card" },
};

// Deal prices (lib/deals.js) are baked in at render — refresh hourly.
export const revalidate = 3600;

// The digital business card — where the QR code lands. Built for a phone
// held at arm's length: big tap targets, the save-contact button first.
export default function CardPage() {
  const tel = PHONE.replace(/\D/g, "");
  const deal = autoDeal();
  return (
    <main className="cx-page cx-page--hero mx-page mx-card">
      <Reveal />
      <div className="mx-card-grid">
        <header className="mx-card-id">
          <figure className="mx-card-photo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/about-brandon.png" alt={OWNER_NAME} width="1024" height="682" />
          </figure>
          <div className="mx-card-shade" />
          <span className="mx-card-brand"><BrandMark />Roth Media</span>
          <h1 className="cx-display">{OWNER_NAME}</h1>
          <p className="cx-kick">Videography &amp; photography · Twin Tiers NY/PA</p>

          <div className="mx-card-actions">
            <CardLink className="cx-btn cx-btn--light cx-btn--xl cx-btn--block" href="/card/vcard" event="card_save_contact">
              Save my contact
            </CardLink>
            <div className="mx-card-trio">
              <CardLink className="cx-btn cx-btn--ghost" href={`tel:+1${tel}`} event="card_call">Call</CardLink>
              <CardLink className="cx-btn cx-btn--ghost" href={`sms:+1${tel}`} event="card_text">Text</CardLink>
              <CardLink className="cx-btn cx-btn--ghost" href={`mailto:${EMAIL}`} event="card_email">Email</CardLink>
            </div>
          </div>
        </header>

        <div className="mx-card-main">
          <ul className="mx-doors">
            <li>
              <CardLink href="/quote" event="card_quote">
                <strong>Get an instant quote</strong>
                <span>Real prices in about a minute</span>
                <Arrow />
              </CardLink>
            </li>
            <li>
              <CardLink href={CALENDLY} event="book_call_click" external>
                <strong>Book a 15-minute call</strong>
                <span>Pick a time that works for you</span>
                <Arrow />
              </CardLink>
            </li>
            {stripeConfigured && (
              <li>
                <CardLink href="/quote" event="card_book_online">
                  <strong>Book &amp; pay online</strong>
                  <span>Pick a package, lock your date — secure checkout</span>
                  <Arrow />
                </CardLink>
              </li>
            )}
            <li>
              <CardLink href="/" event="card_see_work">
                <strong>See my work</strong>
                <span>Weddings, brands, families</span>
                <Arrow />
              </CardLink>
            </li>
            {REVIEW_URL && (
              <li>
                <CardLink href={REVIEW_URL} event="card_review" external>
                  <strong>★ Leave a review</strong>
                  <span>Worked with me? It helps a ton</span>
                  <Arrow />
                </CardLink>
              </li>
            )}
          </ul>

          <section className="mx-card-sec cx-reveal">
            <h2 className="cx-h2">The menu</h2>
            {deal && <p className="cx-offer"><strong>{deal.label}:</strong> {deal.pct}% off weddings and portraits through {deal.endsLabel}.</p>}
            {CATEGORIES.map((c) => (
              <div key={c.id} className="mx-menu">
                <h3 className="cx-kick">{MENU_LABEL[c.id] || c.title}</h3>
                <div className="mx-menu-list">
                  {PACKAGES[c.id].map((pkg) => (
                    <CardLink key={pkg.id} className="mx-pkg" href={`/quote?for=${c.id}`} event={`card_menu_${c.id}`}>
                      <span className="mx-pkg-top"><strong>{pkg.name}</strong><b><DealPrice price={pkg.price} category={c.id} packageId={pkg.id} /></b></span>
                      <span className="mx-pkg-scope">{pkg.scope}</span>
                      <ul className="cx-list">{pkg.get.slice(0, 3).map((g) => <li key={g}>{g}</li>)}</ul>
                      <em className="mx-pkg-go">{stripeConfigured ? "See everything + book online" : "See everything + get a quote"} <Arrow /></em>
                    </CardLink>
                  ))}
                </div>
              </div>
            ))}
          </section>

          <section className="mx-card-sec cx-reveal">
            <h2 className="cx-h2">What to expect</h2>
            <ol className="cx-steps">
              {STEPS.map(([t, d]) => (
                <li key={t}><div><strong>{t}</strong><br /><span>{d}</span></div></li>
              ))}
            </ol>
          </section>

          <section className="mx-card-sec cx-reveal">
            <h2 className="cx-h2">Or I&apos;ll reach out to you</h2>
            <CardLeadForm />
          </section>

          <nav className="mx-card-social" aria-label="Social links">
            {SOCIAL.map((s) => (
              <a key={s.id} href={s.url} target="_blank" rel="noopener noreferrer">
                {s.label}
              </a>
            ))}
            <Link className="mx-card-home" href="/">rothmediaco.com</Link>
          </nav>
        </div>
      </div>
    </main>
  );
}
