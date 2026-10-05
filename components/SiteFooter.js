import Link from "next/link";
import BrandMark from "./BrandMark";
import { EMAIL, SOCIAL, CALENDLY, PHONE, OWNER_NAME, REVIEW_URL } from "../lib/site";
import { PACKAGES, money } from "../lib/packages";
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
const wedFrom = Math.min(...PACKAGES.wedding.map((p) => p.price));
const bizFrom = Math.min(...PACKAGES.business.map((p) => p.price));
const portraitFrom = PACKAGES.family[0].price;

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
          <p className="cx-credits-say">“He made us so comfortable.” — Kaitlyn, Google review</p>
          <ul className="cx-enddoors">
            <li><Link href="/#date"><span>Weddings <small>from {money(wedFrom)}</small></span><b>Check my date <Arrow /></b></Link></li>
            <li><a href={CALENDLY} target="_blank" rel="noopener noreferrer"><span>Business <small>from {money(bizFrom)}</small></span><b>Book a 15-min call <Arrow /></b></a></li>
            <li><a href={SMS_HREF}><span>Family &amp; portraits <small>from {money(portraitFrom)}</small></span><b>Text Brandon <Arrow /></b></a></li>
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
        <Link href="/weddings">Weddings</Link>
        <Link href="/business">Business</Link>
        <Link href="/quote">Get a quote</Link>
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
