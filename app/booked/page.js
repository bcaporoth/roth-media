import "../theme/quote.css";
import BookedView from "../../components/BookedView";
import { stripe, stripeConfigured } from "../../lib/stripe";
import { recordBooking, priceQuote } from "../../lib/booking";
import { money } from "../../lib/packages";

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

  // The markup lives in components/BookedView.js (same copy, Cinema layout).
  return <BookedView paid={paid} m={m} q={q} paidAmt={paidAmt} amountTotal={paid ? session.amount_total || 0 : 0} first={first} />;
}
