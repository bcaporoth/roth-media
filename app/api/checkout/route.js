import { NextResponse } from "next/server";
import { stripe, stripeConfigured } from "../../../lib/stripe";
import { priceQuote, bookingLabel } from "../../../lib/booking";
import { money } from "../../../lib/packages";
import { clip } from "../../../lib/visitor";

export const dynamic = "force-dynamic";

const bad = (msg, status = 422) => NextResponse.json({ error: msg }, { status });
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Quote → Stripe Checkout. Weddings pay the 30% retainer today; family and
// business pay in full. Promo codes are entered on Stripe's page.
export async function POST(request) {
  if (!stripeConfigured) return bad("Online booking isn't switched on yet — send the quote instead.", 503);
  const body = await request.json().catch(() => ({}));
  if (body.website) return bad("Bad request");
  const q = priceQuote({ category: body.category, packageId: body.packageId, addons: body.addons });
  if (!q) return bad("Pick a package first");
  const email = clip(body.email, 160).toLowerCase();
  const name = clip(body.name, 120);
  if (!EMAIL_RE.test(email)) return bad("That email doesn't look right");
  if (!name) return bad("Add your name");

  const origin = new URL(request.url).origin;
  const site = /(^|\.)rothmediaco\.com$/.test(new URL(origin).hostname) || /localhost/.test(origin) ? origin : "https://rothmediaco.com";
  const label = bookingLabel(q);
  const cents = (n) => Math.round(n * 100);

  const line_items = q.mode === "retainer"
    ? [{
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: cents(q.dueToday),
          product_data: {
            name: `Date retainer — ${label}`,
            description: `30% of ${money(q.total)}. Holds your date. Balance of ${money(q.total - q.dueToday)} due 14 days before.`,
          },
        },
      }]
    : [
        { quantity: 1, price_data: { currency: "usd", unit_amount: cents(q.pkg.price), product_data: { name: q.pkg.name, description: q.pkg.scope } } },
        ...q.chosen.map((a) => ({ quantity: 1, price_data: { currency: "usd", unit_amount: cents(a.price), product_data: { name: a.name, description: clip(a.get, 200) } } })),
      ];

  const metadata = {
    category: q.cat.id,
    package: q.pkg.id,
    addons: q.chosen.map((a) => a.id).join(","),
    mode: q.mode,
    total: String(q.total),
    name,
    phone: clip(body.phone, 40),
    date: clip(body.date, 120),
    where: clip(body.where, 160),
    notes: clip(body.notes, 480),
    contact: clip(body.contactPref, 20),
  };

  try {
    const session = await stripe("POST", "/checkout/sessions", {
      mode: "payment",
      line_items,
      customer_email: email,
      allow_promotion_codes: true,
      phone_number_collection: { enabled: false },
      metadata,
      payment_intent_data: { description: `${label} — ${name}`, metadata },
      success_url: `${site}/booked?s={CHECKOUT_SESSION_ID}`,
      cancel_url: `${site}/quote?for=${q.cat.id}&back=1`,
      custom_text: { submit: { message: q.mode === "retainer" ? "Your retainer holds the date. Balance due 14 days before — I'll send a link." : "Paid in full — I'll reach out within 24 hours to plan the shoot." } },
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    return bad(err.message, 502);
  }
}
