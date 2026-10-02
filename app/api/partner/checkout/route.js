import { NextResponse } from "next/server";
import { stripe, stripeConfigured } from "../../../../lib/stripe";
import { adminConfigured, supabaseAdmin } from "../../../../lib/supabase-admin";
import { partnerQuote, CLOSING, AGREEMENT_VERSION } from "../../../../lib/partners";
import { money } from "../../../../lib/packages";
import { clip } from "../../../../lib/visitor";

export const dynamic = "force-dynamic";

const bad = (msg, status = 422) => NextResponse.json({ error: msg }, { status });
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Partner signup: save the signed agreement, then open Stripe Checkout as a
// monthly subscription (plus any one-time items). The card it saves also
// pays closing fees and events later (agreement §3).
export async function POST(request) {
  if (!stripeConfigured || !adminConfigured) return bad("Online signup isn't switched on yet — text Brandon at 845-549-4425.", 503);
  const b = await request.json().catch(() => ({}));
  const q = partnerQuote(String(b.slug || ""), { content: b.content, addons: Array.isArray(b.addons) ? b.addons.map(String) : [], closing: b.closing });
  if (!q) return bad("Pick a content plan first");
  const business = clip(b.business, 160), address = clip(b.address, 240), signer = clip(b.signer, 120), signature = clip(b.signature, 120);
  const email = clip(b.email, 160).toLowerCase(), phone = clip(b.phone, 40);
  if (!business || !address || !signer) return bad("Fill in the business name, address, and your name");
  if (!EMAIL_RE.test(email)) return bad("That email doesn't look right");
  if (!b.agree || signature.toLowerCase() !== signer.toLowerCase()) return bad("Type your name to sign, and check the box");

  const signedAt = new Date().toISOString();
  const ip = (request.headers.get("x-forwarded-for") || "").split(",")[0].trim();
  const closingName = CLOSING.find((c) => c.id === q.closing).name;
  const plan = [q.plan.name, ...q.picked.map((a) => a.name)].join(" + ");
  const fields = [
    ["business (legal name)", business], ["address", address], ["signed by", signer], ["email", email], ["phone", phone],
    ["plan", plan], ["lead follow-up", closingName],
    ["each month", money(q.monthly)], ...(q.once ? [["one-time today", money(q.once)]] : []),
    ["partner rate", `${q.partner.pct}% off list`],
    ["signature", `Typed "${signature}" and checked "I agree" — ${signedAt}${ip ? ` from ${ip}` : ""}`],
    ["agreement version", AGREEMENT_VERSION],
    ["status", "signed — waiting on payment"],
  ];
  const { data: sub, error } = await supabaseAdmin().from("submissions").insert({
    kind: "partner", name: signer, email, phone,
    subject: `Partner signed — ${business} · ${plan} · ${money(q.monthly)}/mo`,
    summary: `${business} · ${plan} · ${money(q.monthly)}/mo`,
    fields, status: "new", source_path: `/partner/${q.slug}`,
    utm: { partner: q.slug, agreement: AGREEMENT_VERSION, signed_at: signedAt, ip, ua: clip(request.headers.get("user-agent"), 200) },
  }).select("id").single();
  if (error) return bad("Couldn't save your signature — try again or text Brandon.", 500);

  const origin = new URL(request.url).origin;
  const site = /(^|\.)rothmediaco\.com$/.test(new URL(origin).hostname) || /localhost/.test(origin) ? origin : "https://rothmediaco.com";
  const metadata = { kind: "partner", partner: q.slug, submission: String(sub.id), business, signer, phone, closing: q.closing, monthly: String(q.monthly) };
  const line = (l) => ({
    quantity: 1,
    price_data: {
      currency: "usd",
      unit_amount: l.price * 100,
      ...(l.monthly ? { recurring: { interval: "month" } } : {}),
      product_data: { name: `${l.name} (partner rate)` },
    },
  });

  try {
    const session = await stripe("POST", "/checkout/sessions", {
      mode: "subscription",
      line_items: q.lines.map(line),
      customer_email: email,
      metadata,
      subscription_data: { description: `Roth Media partner plan — ${business}`, metadata },
      success_url: `${site}/partner/${q.slug}/welcome?s={CHECKOUT_SESSION_ID}`,
      cancel_url: `${site}/partner/${q.slug}`,
      custom_text: { submit: { message: `Your card is saved for the ${money(q.monthly)}/month plan and for closing fees or events you'll be told about first (agreement §3). Cancel anytime at rothmediaco.com/billing.` } },
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    return bad(err.message, 502);
  }
}
