import Link from "next/link";
import BrandMark from "./BrandMark";
import { EMAIL, SOCIAL, CALENDLY, PHONE, OWNER_NAME, REVIEW_URL } from "../lib/site";
import { REVIEWS } from "../lib/reviews";
import { CITIES } from "../lib/cities";

// The Cinema site footer — the homepage's end credits, for every other page.
//
//   <SiteFooter />                 full credits: "Let's tell yours." + three doors + contact roll + link row
//   <SiteFooter slim />            link row only (forms, portal, pay, legal — anywhere the big close would shout)
//   <SiteFooter headline="…" kicker="…" />   change the big line (keep it short)
//
// Server component; no JS needed.

const PHONE_HREF = "tel:+18455494425";
const SMS_HREF = "sms:+18455494425";
// Business-first since 2026-11-23: the business review leads; weddings and
// portraits sit under "Personal".
const BIZ_REVIEW = REVIEWS.find((r) => /business|promo|content/i.test(r.who)) || REVIEWS[0];

function Arrow() {
  return (
    <svg className="cx-arrow" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="M4 12h15M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function SiteFooter({ slim = false, kicker = "Next: yours", headline = "Let’s tell yours." }) {
  return (
    <footer className={"cx-footer" + (slim ? " cx-footer--slim" : "")}>
      {!slim && (
        <div className="cx-credits">
          <p className="cx-kick">{kicker}</p>
          <p className="cx-credits-big">{headline}</p>
          {BIZ_REVIEW && <p className="cx-credits-say">“{BIZ_REVIEW.quote}” — {BIZ_REVIEW.name}, Google review</p>}
          <ul className="cx-enddoors">
            <li><Link href="/quote?for=business"><span>Your business <small>custom quote</small></span><b>Get my quote <Arrow /></b></Link></li>
            <li><a href={CALENDLY} target="_blank" rel="noopener noreferrer"><span>Not sure yet? <small>15 minutes</small></span><b>Book a call <Arrow /></b></a></li>
            <li><Link href="/personal"><span>Personal <small>weddings &amp; portraits</small></span><b>See personal <Arrow /></b></Link></li>
          </ul>
          <dl className="cx-roll">
            <div><dt>Filmed &amp; photographed by</dt><dd>{OWNER_NAME}</dd></div>
            <div><dt>On location</dt><dd className="cx-roll-towns">{CITIES.map((c, i) => (<span key={c.slug}><Link href={`/${c.slug}`}>{c.name}</Link>{i < CITIES.length - 1 ? " · " : ""}</span>))}</dd></div>
            <div><dt>Call or text</dt><dd><a href={PHONE_HREF}>{PHONE}</a></dd></div>
            <div><dt>Write</dt><dd><a href={`mailto:${EMAIL}`}>{EMAIL}</a></dd></div>
          </dl>
        </div>
      )}
      <div className="cx-footer-row">
        <Link href="/" className="cx-brand"><BrandMark /><span>Roth Media</span></Link>
        <Link href="/business">Business</Link>
        <Link href="/personal">Personal</Link>
        <Link href="/quote?for=business">Get a quote</Link>
        {slim && <a href={PHONE_HREF}>{PHONE}</a>}
        {slim && <a href={`mailto:${EMAIL}`}>{EMAIL}</a>}
        {SOCIAL.map((s) => <a key={s.id} href={s.url} target="_blank" rel="noopener noreferrer">{s.label}</a>)}
        {REVIEW_URL && <a href={REVIEW_URL} target="_blank" rel="noopener noreferrer">★ Review us</a>}
        <Link href="/portal">Client login</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
        <span>© {new Date().getFullYear()} Roth Media · Waverly, NY</span>
      </div>
    </footer>
  );
}
