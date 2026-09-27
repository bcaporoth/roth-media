import Link from "next/link";
import BrandMark from "../../components/BrandMark";
import CardLeadForm from "../../components/CardLeadForm";
import CardLink from "../../components/CardLink";
import { CALENDLY, EMAIL, PHONE, OWNER_NAME, REVIEW_URL, SOCIAL } from "../../lib/site";

export const metadata = {
  title: "Brandon Roth",
  description:
    "Save my contact, get an instant quote, or book a quick call. Video & photo for weddings, families, and local businesses in the Twin Tiers.",
  alternates: { canonical: "/card" },
};

// The digital business card — where the QR code lands. Built for a phone
// held at arm's length: big tap targets, the save-contact button first.
export default function CardPage() {
  const tel = PHONE.replace(/\D/g, "");
  return (
    <main className="bcard">
      <div className="bcard-inner">
        <header className="bcard-head">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="bcard-avatar" src="/card-avatar.jpg" alt={OWNER_NAME} width="112" height="112" />
          <span className="bcard-brand">
            <span className="brand-chip"><BrandMark /></span>
            Roth <em>Media</em>
          </span>
          <h1>{OWNER_NAME}</h1>
          <p>Videography &amp; photography · Twin Tiers NY/PA</p>
        </header>

        <CardLink className="bcard-primary" href="/card/vcard" event="card_save_contact">
          Save my contact
        </CardLink>

        <div className="bcard-row">
          <CardLink className="bcard-btn" href={`tel:+1${tel}`} event="card_call">Call</CardLink>
          <CardLink className="bcard-btn" href={`sms:+1${tel}`} event="card_text">Text</CardLink>
          <CardLink className="bcard-btn" href={`mailto:${EMAIL}`} event="card_email">Email</CardLink>
        </div>

        <div className="bcard-list">
          <CardLink className="bcard-link" href="/quote" event="card_quote">
            <strong>Get an instant quote</strong>
            <span>Real prices in about a minute</span>
          </CardLink>
          <CardLink className="bcard-link" href={CALENDLY} event="book_call_click" external>
            <strong>Book a 15-minute call</strong>
            <span>Pick a time that works for you</span>
          </CardLink>
          <CardLink className="bcard-link" href="/" event="card_see_work">
            <strong>See my work</strong>
            <span>Weddings, brands, families</span>
          </CardLink>
          {REVIEW_URL && (
            <CardLink className="bcard-link" href={REVIEW_URL} event="card_review" external>
              <strong>★ Leave a review</strong>
              <span>Worked with me? It helps a ton</span>
            </CardLink>
          )}
        </div>

        <section className="bcard-form">
          <h2>Or I&apos;ll reach out to you</h2>
          <CardLeadForm />
        </section>

        <nav className="bcard-social" aria-label="Social links">
          {SOCIAL.map((s) => (
            <a key={s.id} href={s.url} target="_blank" rel="noopener noreferrer">
              {s.label}
            </a>
          ))}
        </nav>
        <p className="bcard-foot">
          <Link href="/">rothmediaco.com</Link>
        </p>
      </div>
    </main>
  );
}
