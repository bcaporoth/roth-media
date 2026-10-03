import Link from "next/link";
import SocialLinks from "../../components/SocialLinks";
import { EMAIL, SAME_AS } from "../../lib/site";
import BrandMark from "../../components/BrandMark";
import { stripeConfigured } from "../../lib/stripe";
import QuoteFlow from "../../components/QuoteFlow";

export const metadata = {
  title: "Get an Instant Quote",
  description:
    "Answer a few questions and get matched to the right photography or videography package instantly — real prices, no obligation.",
};

const PHONE = "845-549-4425";
const PHONE_HREF = "tel:+18455494425";

export default async function QuotePage({ searchParams }) {
  const params = await searchParams;
  // ?for=portraits (and the old ?for=family) → the portrait session.
  const want = params?.for === "portraits" ? "family" : params?.for;
  const category = ["wedding", "business", "family"].includes(want) ? want : "";
  const code = String(params?.code || "").trim().toUpperCase().slice(0, 30);
  const pkg = String(params?.pkg || "").replace(/[^a-z0-9-]/gi, "").slice(0, 30);
  const date = String(params?.date || "").replace(/[^\w ,.\/-]/g, "").trim().slice(0, 40);

  return (
    <>
      <nav className="rm-nav portal-nav" aria-label="Main navigation">
        <Link href="/" className="brand">
          <span className="brand-chip"><BrandMark /></span>
          <span className="brand-text">Roth <em>Media</em></span>
        </Link>
        <ul className="nav-links">
          <li>
            <Link href="/#work">Work</Link>
          </li>
          <li>
            <Link href="/weddings">Weddings</Link>
          </li>
          <li>
            <Link href="/business">For business</Link>
          </li>
          <li>
            <Link href="/portal" className="nav-login">Client login</Link>
          </li>
          <li>
            <a href={PHONE_HREF}>{PHONE}</a>
          </li>
        </ul>
      </nav>

      <main className="quote-wrap">
        <div className="kick">Instant quote</div>
        <h1>Build your quote in two minutes.</h1>
        <p className="lead">
          Pick what you need and I&apos;ll walk you to a tailored starting
          price, step by step. Real prices, no obligation.
        </p>
        <QuoteFlow initialCategory={category} checkout={stripeConfigured} code={code} initialPkg={pkg} initialDate={date} />
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
