import Link from "next/link";
import BrandMark from "../../components/BrandMark";
import SocialLinks from "../../components/SocialLinks";
import CardLink from "../../components/CardLink";
import { EMAIL, PHONE } from "../../lib/site";
import { OPEN_AMOUNT_LINK, RETAINER_RATE, payablePackages } from "../../lib/payments";
import { money } from "../../lib/packages";

const PHONE_HREF = `tel:+1${PHONE.replace(/\D/g, "")}`;

export const metadata = {
  title: "Pay — book your date",
  description:
    "Hold your date with a 30% retainer, or pay a balance or invoice — secure checkout by Stripe.",
  alternates: { canonical: "/pay" },
};

// Public pay page: one retainer button per package (Stripe Payment Links)
// plus an open-amount link for balances. Unset links fall back to a quote.
export default function PayPage() {
  const pkgs = payablePackages();
  const pct = Math.round(RETAINER_RATE * 100);

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
          <li><Link href="/business">For business</Link></li>
          <li><Link href="/portal" className="nav-login">Client login</Link></li>
          <li><a href={PHONE_HREF}>{PHONE}</a></li>
        </ul>
      </nav>

      <main className="quote-wrap svc-wrap pay-wrap">
        <div className="kick">Payments</div>
        <h1>Lock in your date.</h1>
        <p className="lead">
          A {pct}% retainer holds your date — the rest is due later, per the{" "}
          <Link href="/terms">terms</Link>. Checkout is handled by Stripe: card, Apple Pay, or
          Google Pay. You&apos;ll get a receipt by email.
        </p>

        <div className="pay-grid">
          {pkgs.map((p) => (
            <article className="pay-card" key={p.key}>
              <span className="pay-scope">{p.scope}</span>
              <h2>{p.name}</h2>
              <p className="pay-price">
                {money(p.price)} <span>total</span>
              </p>
              <p className="pay-retainer">
                <strong>{money(p.retainer)}</strong> retainer today
              </p>
              {p.link ? (
                <CardLink
                  className="qprimary pay-btn"
                  href={p.link}
                  event="pay_click"
                  external
                >
                  Pay {money(p.retainer)} retainer →
                </CardLink>
              ) : (
                <Link href={`/quote?for=${p.category}`} className="qprimary pay-btn">
                  Get this booked →
                </Link>
              )}
            </article>
          ))}
        </div>

        <section className="svc-section pay-other">
          <h2>Paying a balance or an invoice?</h2>
          {OPEN_AMOUNT_LINK ? (
            <>
              <p className="qhelp">Enter the amount from your invoice or text from Brandon.</p>
              <p className="svc-cta-row">
                <CardLink className="qprimary svc-cta" href={OPEN_AMOUNT_LINK} event="pay_click" external>
                  Pay an amount →
                </CardLink>
              </p>
            </>
          ) : (
            <p className="qhelp">
              Text <a href={`sms:+1${PHONE.replace(/\D/g, "")}`}>{PHONE}</a> or email{" "}
              <a href={`mailto:${EMAIL}`}>{EMAIL}</a> and I&apos;ll send you a secure payment link.
            </p>
          )}
          <p className="qhelp pay-fine">
            Add-ons and custom work are invoiced after we confirm details. Retainers are
            non-refundable once your date is held — see the <Link href="/terms">terms</Link>.
          </p>
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
