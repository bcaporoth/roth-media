import LegalPage from "../../../components/LegalPage";
import CartPay from "../../../components/CartPay";
import { priceQuote, bookingLabel } from "../../../lib/booking";
import { money } from "../../../lib/packages";
import { stripeConfigured } from "../../../lib/stripe";

export const metadata = { title: "Your quote — review and pay", robots: { index: false } };
export const dynamic = "force-dynamic";

// The saved cart, itemized like an invoice, with one Pay button. Brandon
// sends this link himself; prices always come from lib/packages.js.
export default async function CartPage({ searchParams }) {
  const sp = await searchParams;
  const addons = String(sp?.a || "").split(",").filter(Boolean);
  const q = priceQuote({ category: sp?.c, packageId: sp?.p, addons });
  if (!q) {
    return (
      <LegalPage kick="Quote" title="That quote link didn't load." updated="">
        <p>Build it again on the <a href="/quote">quote page</a>, or text me and I&apos;ll resend it.</p>
      </LegalPage>
    );
  }
  const balance = sp?.pay === "balance" && q.mode === "retainer";
  const due = balance ? q.total - q.dueToday : q.dueToday;
  const first = String(sp?.n || "").trim().split(/\s+/)[0];

  return (
    <LegalPage kick={balance ? "Balance" : "Your quote"} title={first ? `${first}, here's your ${balance ? "balance" : "quote"}.` : `Here's your ${balance ? "balance" : "quote"}.`} updated="">
      <table className="cart">
        <tbody>
          <tr><th>{q.pkg.name}<small>{q.pkg.scope}</small></th><td>{money(q.pkg.price)}</td></tr>
          {q.chosen.map((a) => (
            <tr key={a.id}><th>{a.name}<small>{a.get}</small></th><td>{money(a.price)}</td></tr>
          ))}
          <tr className="cart-total"><th>Total</th><td>{money(q.total)}</td></tr>
          {q.mode === "retainer" && (
            <tr><th>{balance ? "Retainer (already paid)" : "Balance, due 14 days before your date"}</th><td>{balance ? `− ${money(q.dueToday)}` : money(q.total - q.dueToday)}</td></tr>
          )}
          <tr className="cart-due"><th>Due now{q.mode === "retainer" && !balance ? " — 30% retainer holds your date" : ""}</th><td>{money(due)}</td></tr>
        </tbody>
      </table>
      {stripeConfigured ? (
        <CartPay
          cart={{ category: q.cat.id, packageId: q.pkg.id, addons: q.chosen.map((a) => a.id), pay: balance ? "balance" : "" }}
          who={{ name: String(sp?.n || ""), email: String(sp?.e || ""), phone: String(sp?.t || "") }}
          label={`Pay ${money(due)}`}
        />
      ) : (
        <p>Online payment isn&apos;t switched on yet — text me at 845-549-4425 and I&apos;ll sort it out.</p>
      )}
      <p>
        Secure checkout by Stripe. {balance ? "This settles your booking in full." : q.mode === "retainer" ? "The retainer is non-refundable; one free reschedule with 30 days' notice." : "Paid in full, nothing more to do."} Paying means you agree to the <a href="/terms">terms</a>.
        Want to change something in {bookingLabel(q)}? Text me first.
      </p>
    </LegalPage>
  );
}
