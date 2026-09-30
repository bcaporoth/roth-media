import { NextResponse } from "next/server";
import { stripe, verifyWebhook } from "../../../../lib/stripe";
import { recordBooking } from "../../../../lib/booking";

export const dynamic = "force-dynamic";

// Stripe → us. Records the booking even if the customer closed the tab
// before /booked loaded. Needs STRIPE_WEBHOOK_SECRET (Stripe → Developers →
// Webhooks → endpoint https://rothmediaco.com/api/stripe/webhook,
// event checkout.session.completed).
export async function POST(request) {
  const raw = await request.text();
  if (!verifyWebhook(raw, request.headers.get("stripe-signature"), process.env.STRIPE_WEBHOOK_SECRET || "")) {
    return NextResponse.json({ error: "Bad signature" }, { status: 400 });
  }
  const event = JSON.parse(raw);
  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    // Re-fetch so we never trust the payload's amounts.
    const session = await stripe("GET", `/checkout/sessions/${event.data.object.id}`);
    const r = await recordBooking(session);
    return NextResponse.json(r);
  }
  return NextResponse.json({ ok: true, ignored: event.type });
}
