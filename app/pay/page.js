import "../theme/quote.css";
import Link from "next/link";
import SiteNav from "../../components/SiteNav";
import SiteFooter from "../../components/SiteFooter";
import Reveal from "../../components/Reveal";
import CardLink from "../../components/CardLink";
import { EMAIL, PHONE } from "../../lib/site";
import { OPEN_AMOUNT_LINK, RETAINER_RATE, payablePackages } from "../../lib/payments";
import { money } from "../../lib/packages";

export const metadata = {
  title: "Pay — book your date",
  description:
    "Hold your date with a 50% retainer, or pay a balance or invoice — secure checkout by Stripe.",
  alternates: { canonical: "/pay" },
};

const GROUPS = [
  { id: "wedding", label: "Weddings" },
  { id: "business", label: "Business & events" },
  { id: "family", label: "Portraits" },
];

function Arrow() {
  return (
    <svg className="cx-arrow" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="M4 12h15M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Public pay page: one retainer button per package (Stripe Payment Links)
// plus an open-amount link for balances. Unset links fall back to a quote.
export default function PayPage() {
  const pkgs = payablePackages();
  const pct = Math.round(RETAINER_RATE * 100);
  const groups = GROUPS.map((g) => ({ ...g, items: pkgs.filter((p) => p.category === g.id) })).filter((g) => g.items.length);
  const other = pkgs.filter((p) => !GROUPS.some((g) => g.id === p.category));
  if (other.length) groups.push({ id: "other", label: "More", items: other });

  return (
    <>
      <SiteNav overHero />

      <main className="cx-page cx-page--hero qt-page qt-pay">
        <Reveal />
        <header className="cx-hero qt-hero">
          <div className="cx-hero-media">
            <img src="/photos/17-wedding-two-rings.jpg" alt="A groom's hands holding two wedding rings, in black and white" fetchPriority="high" style={{ objectPosition: "50% 55%" }} />
          </div>
          <div className="cx-hero-shade" />
          <div className="cx-wrap cx-hero-body">
            <p className="cx-kick">Payments</p>
            <h1 className="cx-h1 cx-h1--long">Lock in your date.</h1>
            <p className="cx-lede">
              A {pct}% retainer holds your date — the rest is due later, per the{" "}
              <Link href="/terms">terms</Link>. Checkout is handled by Stripe: card, Apple Pay, or
              Google Pay. You&apos;ll get a receipt by email.
            </p>
          </div>
        </header>

        <section className="qt-stage">
          <div className="cx-wrap qt-pay-groups">
            {groups.map((g) => (
              <div className="qt-pay-group cx-reveal" key={g.id}>
                <p className="cx-kick">{g.label}</p>
                <ul className="qt-pay-rows">
                  {g.items.map((p) => (
                    <li className="qt-pay-row" key={p.key}>
                      <div className="qt-pay-id">
                        <h2 className="qt-pay-name">{p.name}</h2>
                        <span className="qt-pay-scope">{p.scope}</span>
                      </div>
                      <p className="qt-pay-price">
                        <span className="cx-num">{money(p.price)}</span> <span>total</span>
                      </p>
                      <p className="qt-pay-retainer">
                        <strong className="cx-num">{money(p.retainer)}</strong> retainer today
                      </p>
                      {p.link ? (
                        <CardLink className="cx-btn cx-btn--light qt-pay-btn" href={p.link} event="pay_click" external>
                          Pay {money(p.retainer)} retainer →
                        </CardLink>
                      ) : (
                        <Link href={`/quote?for=${p.category}`} className="cx-btn cx-btn--ghost qt-pay-btn">
                          Get this booked <Arrow />
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="cx-section cx-section--tight cx-band qt-pay-other">
          <div className="cx-wrap cx-stack cx-reveal">
            <p className="cx-kick">Balances &amp; invoices</p>
            <h2 className="cx-h2">Paying a balance or an invoice?</h2>
            {OPEN_AMOUNT_LINK ? (
              <>
                <p className="cx-lede">Enter the amount from your invoice or text from Brandon.</p>
                <p className="cx-cta-row">
                  <CardLink className="cx-btn cx-btn--light cx-btn--lg" href={OPEN_AMOUNT_LINK} event="pay_click" external>
                    Pay an amount →
                  </CardLink>
                </p>
              </>
            ) : (
              <p className="cx-lede">
                Text <a href={`sms:+1${PHONE.replace(/\D/g, "")}`}>{PHONE}</a> or email{" "}
                <a href={`mailto:${EMAIL}`}>{EMAIL}</a> and I&apos;ll send you a secure payment link.
              </p>
            )}
            <p className="cx-fine qt-pay-fine">
              Add-ons and custom work are invoiced after we confirm details. Retainers are
              non-refundable once your date is held — see the <Link href="/terms">terms</Link>.
            </p>
          </div>
        </section>
      </main>

      <SiteFooter slim />
    </>
  );
}
