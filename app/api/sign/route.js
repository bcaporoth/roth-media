import { NextResponse } from "next/server";
import { stripe, stripeConfigured } from "../../../lib/stripe";
import { adminConfigured, supabaseAdmin } from "../../../lib/supabase-admin";
import { AGREEMENT_KINDS, agreementText, money } from "../../../lib/agreements";
import { clip } from "../../../lib/visitor";

export const dynamic = "force-dynamic";
const bad = (msg, status = 422) => NextResponse.json({ error: msg }, { status });

// /sign/<token>: save the typed signature on the row (with the exact text
// they read), then open Stripe Checkout for this month's amount.
export async function POST(request) {
  if (!adminConfigured) return bad("Signing isn't switched on yet — text Brandon at 845-549-4425.", 503);
  const b = await request.json().catch(() => ({}));
  if (b.website) return bad("Bad request");
  const token = clip(b.token, 40);
  if (!/^[A-Za-z0-9_-]{8,40}$/.test(token)) return bad("That link isn't right");
  const db = supabaseAdmin();
  const { data: row } = await db.from("agreements").select("*").eq("token", token).maybeSingle();
  if (!row || row.status === "void") return bad("That link has expired — text Brandon for a new one.", 404);
  if (row.status === "paid") return bad("This one's already paid — thank you!", 409);

  let patch = {};
  if (row.sign_required && row.status !== "signed") {
    const signature = clip(b.signature, 120);
    if (!b.agree || signature.length < 2) return bad("Type your name to sign, and check the box");
    patch = {
      status: "signed", signed_name: signature, signed_at: new Date().toISOString(),
      signed_ip: (request.headers.get("x-forwarded-for") || "").split(",")[0].trim(),
      signed_ua: clip(request.headers.get("user-agent"), 200),
      agreement_text: agreementText(row.kind, row),
    };
    const { error } = await db.from("agreements").update(patch).eq("id", row.id);
    if (error) return bad("Couldn't save your signature — try again or text Brandon.", 500);
  }
  if (!stripeConfigured) return NextResponse.json({ signed: true, url: "" });

  const origin = new URL(request.url).origin;
  const site = /(^|\.)rothmediaco\.com$/.test(new URL(origin).hostname) || /localhost/.test(origin) ? origin : "https://rothmediaco.com";
  const k = AGREEMENT_KINDS[row.kind] || AGREEMENT_KINDS.upkeep;
  const name = row.kind === "invoice" ? `Invoice${row.period ? ` — ${row.period}` : ""}` : `Website upkeep${row.period ? ` — ${row.period}` : ""}`;
  const description = clip(row.note || (row.kind === "invoice" ? "" : `Two update sessions this month for ${row.business || row.client_name}.`), 300) || undefined;
  const metadata = { kind: "agreement", agreement: String(row.id), token, agreement_kind: row.kind, name: row.client_name, business: row.business, phone: row.client_phone };
  try {
    const session = await stripe("POST", "/checkout/sessions", {
      mode: "payment",
      line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: row.amount_cents, product_data: { name, ...(description ? { description } : {}) } } }],
      customer_email: row.client_email,
      metadata,
      payment_intent_data: { description: `${k.title} — ${row.business || row.client_name}`, metadata },
      success_url: `${site}/sign/${token}?s={CHECKOUT_SESSION_ID}`,
      cancel_url: `${site}/sign/${token}`,
      custom_text: { submit: { message: row.kind === "invoice" ? "Thank you! A receipt lands in your email." : `That's ${money(row.amount_cents)} for this month's website upkeep. Receipt by email; next month I'll send a fresh link.` } },
    });
    return NextResponse.json({ signed: true, url: session.url });
  } catch (err) {
    return bad(err.message, 502);
  }
}
