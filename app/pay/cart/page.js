import LegalPage from "../../../components/LegalPage";
import CartPay from "../../../components/CartPay";
import { priceQuote, bookingLabel, openRetainer } from "../../../lib/booking";
import { money } from "../../../lib/packages";
import { stripeConfigured } from "../../../lib/stripe";
import { codeDeal } from "../../../lib/deals";

export const metadata = { title: "Your quote — review and pay", robots: { index: false } };
export const dynamic = "force-dynamic";

// The saved cart, itemized like an invoice, with one Pay button. Brandon
// sends this link himself; prices always come from lib/packages.js and
// discounts from lib/deals.js.
export default async function CartPage({ searchParams }) {
  const sp = await searchParams;
  const addons = String(sp?.a || "").split(",").filter(Boolean);
  const code = String(sp?.code || "").trim().toUpperCase().slice(0, 30);
  const q = priceQuote({ category: sp?.c, packageId: sp?.p, addons, code });
  if (!q) {
    return (
      <LegalPage kick="Quote" title="That quote link didn't load." updated="">
        <p>Build it again on the <a href="/quote">quote page</a>, or text me and I&apos;ll resend it.</p>
      </LegalPage>
    );
  }
  const balance = sp?.pay === "balance" && q.mode === "retainer";
  // Balance: what's actually left on their retainer booking, if we can find it.
  const owed = balance ? await openRetainer(sp?.e) : null;
  const total = owed ? owed.total_cents / 100 : q.total;
  const paidAlready = owed ? owed.paid_cents / 100 : q.dueToday;
  const due = balance ? total - paidAlready : q.dueToday;
  const first = String(sp?.n || "").trim().split(/\s+/)[0];
  const codeTried = code && (!q.deal || q.deal.code !== code);
  const monthly = q.chosen.filter((a) => a.monthly);
  const keep = { c: sp?.c, p: sp?.p, a: sp?.a, n: sp?.n, e: sp?.e, t: sp?.t };

  return (
    <LegalPage kick={balance ? "Balance" : "Your quote"} title={first ? `${first}, here's your ${balance ? "balance" : "quote"}.` : `Here's your ${balance ? "balance" : "quote"}.`} updated="">
      <table className="cart">
        <tbody>
          <tr><th>{q.pkg.name}<small>{q.pkg.scope}</small></th><td>{money(q.pkg.price)}</td></tr>
          {q.chosen.map((a) => (
            <tr key={a.id}><th>{a.name}<small>{a.get}</small></th><td>{money(a.price)}</td></tr>
          ))}
          {!owed && q.deal && (
            <tr className="cart-deal"><th>{q.deal.label} — {q.deal.pct}% off<small>Ends {q.deal.endsLabel}</small></th><td>− {money(q.discount)}</td></tr>
          )}
          <tr className="cart-total"><th>Total{owed?.promo_code ? <small>{owed.promo_code}</small> : null}</th><td>{money(total)}</td></tr>
          {q.mode === "retainer" && (
            <tr><th>{balance ? "Already paid" : "Balance, due 14 days before your date"}</th><td>{balance ? `− ${money(paidAlready)}` : money(q.total - q.dueToday)}</td></tr>
          )}
          <tr className="cart-due"><th>Due now{q.mode === "retainer" && !balance ? " — 30% retainer holds your date" : ""}</th><td>{money(due)}</td></tr>
        </tbody>
      </table>
      {monthly.map((a) => (
        <p key={a.id} className="cart-note">{a.name}: then {money(a.monthly)}/month after launch — billed separately, cancel anytime.</p>
      ))}
      {!balance && (
        <form className="cart-code" method="get">
          {Object.entries(keep).filter(([, v]) => v).map(([k, v]) => <input key={k} type="hidden" name={k} value={String(v)} />)}
          <label><span>Promo code</span><input name="code" defaultValue={code} autoCapitalize="characters" /></label>
          <button type="submit" className="qsecondary">Apply</button>
          {codeTried && <small>{!codeDeal(code) ? "That code isn't active." : q.deal ? `The ${q.deal.label.toLowerCase()} is the bigger discount — that's the one you get.` : `That code doesn't cover ${q.pkg.name}.`}</small>}
        </form>
      )}
      {stripeConfigured ? (
        <CartPay
          cart={{ category: q.cat.id, packageId: q.pkg.id, addons: q.chosen.map((a) => a.id), pay: balance ? "balance" : "", code: q.deal?.code || "" }}
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
