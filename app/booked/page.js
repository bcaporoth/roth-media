import LegalPage from "../../components/LegalPage";
import { stripe, stripeConfigured } from "../../lib/stripe";
import { recordBooking, priceQuote, bookingLabel } from "../../lib/booking";
import { money } from "../../lib/packages";
import { CALENDLY } from "../../lib/site";

export const metadata = { title: "You're booked", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function BookedPage({ searchParams }) {
  const { s } = await searchParams;
  let session = null;
  if (stripeConfigured && /^cs_(live|test)_[A-Za-z0-9]+$/.test(String(s || ""))) {
    try { session = await stripe("GET", `/checkout/sessions/${s}`); } catch {}
  }
  const paid = session?.payment_status === "paid";
  if (paid) await recordBooking(session);

  const m = session?.metadata || {};
  const q = paid ? priceQuote({ category: m.category, packageId: m.package, addons: (m.addons || "").split(",").filter(Boolean) }) : null;
  const paidAmt = paid ? money((session.amount_total || 0) / 100) : "";
  const first = String(m.name || session?.customer_details?.name || "").split(/\s+/)[0];

  if (!paid) {
    return (
      <LegalPage kick="Booking" title="We couldn't find that payment." updated="">
        <p>If your card was charged, you&apos;re booked — Stripe&apos;s receipt is on its way and I&apos;ll be in touch within 24 hours. If it wasn&apos;t, head back to the <a href="/quote">quote</a> and try again, or text 845-549-4425 and I&apos;ll sort it by hand.</p>
      </LegalPage>
    );
  }

  return (
    <LegalPage kick="Booked" title={first ? `You're booked, ${first}.` : "You're booked."} updated="">
      <p><strong>{q ? bookingLabel(q) : m.package}</strong>{m.date ? ` · ${m.date}` : ""}{m.where ? ` · ${m.where}` : ""}</p>
      {q?.mode === "retainer" ? (
        <p>Your <strong>{paidAmt}</strong> retainer holds the date. The balance — {money(Math.max(0, q.total - (session.amount_total || 0) / 100))} — is due 14 days before, and I&apos;ll send a link for it. Retainers are non-refundable; one free reschedule with 30 days&apos; notice.</p>
      ) : (
        <p>Paid in full — <strong>{paidAmt}</strong>. Nothing else to do on your end.</p>
      )}
      <h2>What happens next</h2>
      <p>1. Stripe emailed you a receipt, and a confirmation from me is on its way.<br />2. I reach out within 24 hours — usually much faster — to lock in the plan: timeline, must-have moments, where to park.<br />3. Sneak peeks land within 48 hours of the shoot; the full delivery follows on the schedule in the <a href="/terms">terms</a>.</p>
      <p>Want to talk it through sooner? <a href={CALENDLY} target="_blank" rel="noopener noreferrer">Book a 15-minute call</a> or text 845-549-4425.</p>
    </LegalPage>
  );
}
