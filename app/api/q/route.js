import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { stripe, stripeConfigured } from "../../../lib/stripe";
import { adminConfigured, supabaseAdmin } from "../../../lib/supabase-admin";
import { TEXT_VERSION, agreementText } from "../../../lib/agreements";
import { getQuoteByToken, patchQuote } from "../../../lib/quotes-server";
import { lineLabel, money, optionTotals, quoteExpired, QUOTE_DAYS } from "../../../lib/quotes";
import { clip } from "../../../lib/visitor";

export const dynamic = "force-dynamic";
const bad = (msg, status = 422) => NextResponse.json({ error: msg }, { status });

// /q/<token>: the client picked an option and typed their name. The price
// comes from the stored quote, never the browser. Their pick becomes a
// signed Content Day agreement (the same table /sign uses), then Stripe
// Checkout for the full amount. lib/booking.js marks it paid.
export async function POST(request) {
  if (!adminConfigured) return bad("Quotes aren't switched on yet — text Brandon at 845-549-4425.", 503);
  const b = await request.json().catch(() => ({}));
  if (b.website) return bad("Bad request");
  const db = supabaseAdmin();
  const q = await getQuoteByToken(db, clip(b.token, 40));
  if (!q || q.status === "void" || q.status === "deleted") return bad("That link has expired — text Brandon for a new one.", 404);
  if (q.status === "paid") return bad("This one's already paid — thank you!", 409);
  if (quoteExpired(q)) return bad(`This quote was good for ${QUOTE_DAYS} days and has expired — text Brandon at 845-549-4425 for a fresh one.`, 410);
  const idx = Number(b.option);
  const option = Number.isInteger(idx) ? (q.options || [])[idx] : null;
  if (!option) return bad("Pick one of the options first");
  const signature = clip(b.signature, 120);
  if (!b.agree || signature.length < 2) return bad("Type your name to sign, and check the box");

  const total = optionTotals(option, q.rate).total;
  const lines = option.lines.map(lineLabel);
  const now = new Date().toISOString();
  const base = {
    kind: "shoot", client_name: q.name, client_email: q.email, client_phone: q.phone || "",
    business: q.business || "", site_url: "", amount_cents: total * 100, period: q.when || "",
    note: clip(`${option.label}: ${lines.join(" · ")}`, 600),
  };
  const row = {
    ...base,
    token: crypto.randomBytes(9).toString("base64url"),
    sign_required: true, status: "signed",
    signed_name: signature, signed_at: now,
    signed_ip: (request.headers.get("x-forwarded-for") || "").split(",")[0].trim(),
    signed_ua: clip(request.headers.get("user-agent"), 200),
    agreement_text: agreementText("shoot", { ...base, lines }),
    text_version: `${TEXT_VERSION}-quote`,
  };
  const { data: ag, error } = await db.from("agreements").insert(row).select("id, token").single();
  if (error) return bad("Couldn't save your signature — try again or text Brandon.", 500);
  // A different pick than last time: the old unpaid agreement is voided.
  if (q.agreementId && q.agreementId !== ag.id) {
    try { await db.from("agreements").update({ status: "void" }).eq("id", q.agreementId).neq("status", "paid"); } catch {}
  }
  await patchQuote(db, q.id, { status: "signed", picked: idx, total, agreementId: ag.id, agreementToken: ag.token, signedName: signature, signedAt: now });
  if (!stripeConfigured) return NextResponse.json({ signed: true, url: "" });

  const origin = new URL(request.url).origin;
  const site = /(^|\.)rothmediaco\.com$/.test(new URL(origin).hostname) || /localhost/.test(origin) ? origin : "https://rothmediaco.com";
  const who = q.business || q.name;
  const metadata = { kind: "agreement", agreement: String(ag.id), token: ag.token, agreement_kind: "shoot", quote: String(q.id), option: option.label, name: q.name, business: q.business || "", phone: q.phone || "" };
  try {
    const session = await stripe("POST", "/checkout/sessions", {
      mode: "payment",
      line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: total * 100, product_data: { name: `${option.label} — ${who}${q.when ? ` · ${q.when}` : ""}`, description: clip(lines.join(" · "), 300) } } }],
      customer_email: q.email,
      metadata,
      payment_intent_data: { description: `Quote: ${option.label} — ${who}`, metadata },
      success_url: `${site}/q/${q.token}?s={CHECKOUT_SESSION_ID}`,
      cancel_url: `${site}/q/${q.token}`,
      custom_text: { submit: { message: `That's ${money(total)}, paid in full. Receipt by email; Brandon will be in touch to plan the shoot.` } },
    });
    return NextResponse.json({ signed: true, url: session.url });
  } catch (err) {
    return bad(err.message, 502);
  }
}
