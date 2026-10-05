import "../../theme/quote.css";
import SiteNav from "../../../components/SiteNav";
import SiteFooter from "../../../components/SiteFooter";
import CartPay from "../../../components/CartPay";
import { priceQuote, bookingLabel, openRetainer } from "../../../lib/booking";
import { money } from "../../../lib/packages";
import { stripeConfigured } from "../../../lib/stripe";
import { codeDeal, upcomingCode, isFreebieCode } from "../../../lib/deals";
import { PACKAGES } from "../../../lib/packages";
import { supabaseAdmin, adminConfigured } from "../../../lib/supabase-admin";
import { resolveCode } from "../../../lib/referrals";
import { isFriendCode, referralEligible } from "../../../lib/referral-rules";
import { EMAIL, PHONE } from "../../../lib/site";

export const metadata = { title: "Your quote — review and pay", robots: { index: false } };
export const dynamic = "force-dynamic";

// Title block shared by both states: label, headline, and how to reach Brandon.
function Head({ kick, title }) {
  return (
    <header className="cx-hero cx-hero--plain qt-head">
      <div className="cx-wrap cx-hero-body">
        <p className="cx-kick">{kick}</p>
        <h1 className="cx-h1 cx-h1--long">{title}</h1>
        <p className="cx-lede">Questions? Email <a href={`mailto:${EMAIL}`}>{EMAIL}</a> or text {PHONE}.</p>
      </div>
    </header>
  );
}

// The saved cart, itemized like an invoice, with one Pay button. Brandon
// sends this link himself; prices always come from lib/packages.js and
// discounts from lib/deals.js.
export default async function CartPage({ searchParams }) {
  const sp = await searchParams;
  const addons = String(sp?.a || "").split(",").filter(Boolean);
  const code = String(sp?.code || sp?.ref || "").trim().toUpperCase().slice(0, 30);
  // pay=full: a wedding paid in full today instead of the 50% retainer (earns the paid-in-full bonus).
  const payFull = sp?.pay === "full";
  // A friend code (give $100, get $100) is looked up here, with the email on the link.
  const pkgHere = (PACKAGES[sp?.c] || []).find((p) => p.id === sp?.p) || null;
  const credit = isFriendCode(code) && adminConfigured ? await resolveCode(supabaseAdmin(), code, { email: String(sp?.e || ""), pkg: pkgHere }) : null;
  const q = priceQuote({ category: sp?.c, packageId: sp?.p, addons, code, payFull, credit });
  if (!q) {
    return (
      <>
        <SiteNav />
        <main className="cx-page cx-page--hero qt-page qt-cartpage">
          <Head kick="Quote" title="That quote link didn't load." />
          <section className="cx-section cx-section--tight">
            <div className="cx-wrap cx-stack">
              <p className="cx-lede">Build it again on the <a href="/quote">quote page</a>, or text me and I&apos;ll resend it.</p>
              <p className="cx-cta-row">
                <a href="/quote" className="cx-btn cx-btn--light cx-btn--lg">Build my quote</a>
                <a href={`sms:+1${PHONE.replace(/\D/g, "")}`} className="cx-btn cx-btn--ghost cx-btn--lg">Text {PHONE}</a>
              </p>
            </div>
          </section>
        </main>
        <SiteFooter slim />
      </>
    );
  }
  const balance = sp?.pay === "balance" && q.mode === "retainer";
  // Balance: what's actually left on their retainer booking, if we can find it.
  const owed = balance ? await openRetainer(sp?.e) : null;
  const total = owed ? owed.total_cents / 100 : q.total;
  const paidAlready = owed ? owed.paid_cents / 100 : q.dueToday;
  const due = balance ? total - paidAlready : q.dueToday;
  const first = String(sp?.n || "").trim().split(/\s+/)[0];
  const codeTried = code && !(q.free && q.free.code === code) && !(q.credit && q.credit.code === code) && (!q.deal || q.deal.code !== code);
  const freeAddon = q.free ? q.chosen.find((a) => a.id === q.free.addon) : null;
  // Both ways to pay a wedding, so the choice is one tap.
  const keepQ = Object.entries({ c: sp?.c, p: sp?.p, a: sp?.a, n: sp?.n, e: sp?.e, t: sp?.t, code: sp?.code }).filter(([, v]) => v).map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join("&");
  const holdQ = priceQuote({ category: sp?.c, packageId: sp?.p, addons, code, payFull: false, credit });
  const fullQ = priceQuote({ category: sp?.c, packageId: sp?.p, addons, code, payFull: true, credit });
  const monthly = q.chosen.filter((a) => a.monthly);
  const keep = { c: sp?.c, p: sp?.p, a: sp?.a, n: sp?.n, e: sp?.e, t: sp?.t };

  return (
    <>
      <SiteNav />
      <main className="cx-page cx-page--hero qt-page qt-cartpage">
        <Head kick={balance ? "Balance" : "Your quote"} title={first ? `${first}, here's your ${balance ? "balance" : "quote"}.` : `Here's your ${balance ? "balance" : "quote"}.`} />

        <section className="cx-section cx-section--tight">
          <div className="cx-wrap qt-cart-cols">
            <div className="qt-cart-main">
              <table className="qt-cart">
                <tbody>
                  <tr><th scope="row">{q.pkg.name}<small>{q.pkg.scope}</small></th><td>{money(q.pkg.price)}</td></tr>
                  {q.chosen.map((a) => (
                    <tr key={a.id}><th scope="row">{a.name}<small>{a.get}</small></th><td>{a.price === 0 ? <>Free{a.was ? <small> was {money(a.was)}</small> : null}</> : money(a.price)}</td></tr>
                  ))}
                  {!owed && q.free && (
                    <tr className="qt-cart-deal"><th scope="row">{q.free.label}<small>{q.free.code ? `Code ${q.free.code}` : `${freeAddon?.name || "Add-on"} included`}</small></th><td>− {money(q.freeValue)}</td></tr>
                  )}
                  {!owed && q.deal && (
                    <tr className="qt-cart-deal"><th scope="row">{q.deal.label} — {q.deal.pct}% off{q.deal.endsLabel ? <small>Ends {q.deal.endsLabel}</small> : null}</th><td>− {money(q.dealDiscount)}</td></tr>
                  )}
                  {!owed && q.credit && (
                    <tr className="qt-cart-deal"><th scope="row">{q.credit.label}<small>Code {q.credit.code} · give $100, get $100</small></th><td>− {money(q.credit.amount)}</td></tr>
                  )}
                  <tr className="qt-cart-total"><th scope="row">Total{owed?.promo_code ? <small>{owed.promo_code}</small> : null}</th><td>{money(total)}</td></tr>
                  {q.mode === "retainer" && (
                    <tr><th scope="row">{balance ? "Already paid" : "Balance, due 14 days before your date"}</th><td>{balance ? `− ${money(paidAlready)}` : money(q.total - q.dueToday)}</td></tr>
                  )}
                  <tr className="qt-cart-due"><th scope="row">Due now{q.mode === "retainer" && !balance ? " — 50% retainer holds your date" : q.payFull ? " — paid in full, date locked" : ""}</th><td>{money(due)}</td></tr>
                </tbody>
              </table>
              {monthly.map((a) => (
                <p key={a.id} className="cx-fine qt-cart-note">{a.name}: then {money(a.monthly)}/month, starting 30 days after you pay. Checkout saves your card for it; manage or cancel anytime at <a href="/billing">rothmediaco.com/billing</a>.</p>
              ))}
              {!balance && (
                <form className="qt-cart-code" method="get">
                  {Object.entries(keep).filter(([, v]) => v).map(([k, v]) => <input key={k} type="hidden" name={k} value={String(v)} />)}
                  <label className="cx-field"><span className="cx-label">Promo code</span><input className="cx-input" name="code" defaultValue={code} autoCapitalize="characters" /></label>
                  <button type="submit" className="cx-btn cx-btn--ghost">Apply</button>
                  {codeTried && <small className="cx-help">{isFriendCode(code) ? (referralEligible(q.pkg) ? "That friend code isn't active — or it's your own, and those don't work on your own booking." : "Friend codes work on weddings and business packages ($600 and up).") : isFreebieCode(code) && q.free ? `${freeAddon?.name || "That add-on"} is already included (${q.free.label.toLowerCase()}) — no code needed.` : isFreebieCode(code) ? `${code} doesn't cover ${q.pkg.name}.` : upcomingCode(code) ? `${code} opens ${upcomingCode(code).startsLabel}.` : !codeDeal(code) ? "That code isn't active." : q.deal ? `The ${q.deal.label.toLowerCase()} is the bigger discount — that's the one you get.` : `That code doesn't cover ${q.pkg.name}.`}</small>}
                </form>
              )}
            </div>

            <aside className="qt-cart-pay" aria-label="Pay">
              <p className="cx-kick">Due now</p>
              <p className="qt-cart-amount cx-num">{money(due)}</p>
              {!balance && holdQ && fullQ && holdQ.mode === "retainer" && (
                <div className="qt-payways" role="group" aria-label="How to pay">
                  <a className={"qt-payway" + (!payFull ? " is-on" : "")} href={`/pay/cart?${keepQ}`}><strong>Hold the date</strong><span>{money(holdQ.dueToday)} today · {money(holdQ.total - holdQ.dueToday)} two weeks before</span></a>
                  <a className={"qt-payway" + (payFull ? " is-on" : "")} href={`/pay/cart?${keepQ}&pay=full`}><strong>Pay in full</strong><span>{money(fullQ.total)} today · guest library included</span></a>
                </div>
              )}
              {stripeConfigured ? (
                <CartPay
                  cart={{ category: q.cat.id, packageId: q.pkg.id, addons: q.chosen.map((a) => a.id), pay: balance ? "balance" : payFull ? "full" : "", code: q.credit?.code || q.deal?.code || q.free?.code || "" }}
                  who={{ name: String(sp?.n || ""), email: String(sp?.e || ""), phone: String(sp?.t || "") }}
                  label={`Pay ${money(due)}`}
                />
              ) : (
                <p className="cx-note">Online payment isn&apos;t switched on yet — text me at 845-549-4425 and I&apos;ll sort it out.</p>
              )}
              <p className="cx-fine">
                Secure checkout by Stripe. {balance ? "This settles your booking in full." : q.mode === "retainer" ? "The retainer is non-refundable; one free reschedule with 30 days' notice." : q.payFull ? "Your date is locked and nothing more is due. One free reschedule with 30 days' notice." : "Paid in full, nothing more to do."} Paying means you agree to the <a href="/terms">terms</a>.
                Want to change something in {bookingLabel(q)}? Text me first.
              </p>
            </aside>
          </div>
        </section>
      </main>
      <SiteFooter slim />
    </>
  );
}
