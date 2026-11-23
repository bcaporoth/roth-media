import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { isAdminRequest } from "../../../../lib/admin-guard";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { AGREEMENT_KINDS, TEXT_VERSION, agreementText, sendCopy } from "../../../../lib/agreements";
import { planById } from "../../../../lib/plans";
import { clip } from "../../../../lib/visitor";

export const dynamic = "force-dynamic";
const bad = (msg, status = 422) => NextResponse.json({ error: msg }, { status });
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Studio → Payments → Send an agreement. Makes the private /sign link.
// Nothing here messages the client — Brandon sends it himself.
export async function POST(request) {
  if (!(await isAdminRequest())) return bad("Not authorized", 401);
  const b = await request.json().catch(() => ({}));
  if (b.void && b.id) {
    const { error } = await supabaseAdmin().from("agreements").update({ status: "void" }).eq("id", b.id).neq("status", "paid");
    return error ? bad("Couldn't void that", 500) : NextResponse.json({ ok: true });
  }
  const kind = AGREEMENT_KINDS[b.kind] ? b.kind : "upkeep";
  // A monthly plan: the tier, its fee and an optional ads fee (dollars a
  // month). The total is what Stripe charges every month.
  const tier = kind === "plan" ? planById(String(b.plan || "")) : null;
  const price = Math.round(Number(b.amount) || 0), ads = kind === "plan" && b.adsOn ? Math.round(Number(b.ads) || 0) : 0;
  if (kind === "plan") {
    if (!tier) return bad("Pick Tier 1, 2 or 3");
    if (!(price >= 50)) return bad("Type the plan's price a month");
    if (b.adsOn && !(ads >= 1)) return bad("Type the ads fee a month, or untick ads");
  }
  const amount_cents = kind === "plan" ? (price + ads) * 100 : Math.round(Number(b.amount) * 100);
  const client_name = clip(b.name, 120), client_email = clip(b.email, 160).toLowerCase(), client_phone = clip(b.phone, 40);
  if (!client_name) return bad("Add the client's name");
  if (!EMAIL_RE.test(client_email)) return bad("That email doesn't look right");
  if (!(amount_cents >= 100 && amount_cents <= 2000000)) return bad("Enter an amount between $1 and $20,000");
  const row = {
    token: crypto.randomBytes(9).toString("base64url"), kind, client_name, client_email, client_phone,
    business: clip(b.business, 160), site_url: clip(b.site, 200), amount_cents,
    period: clip(b.period, 60),
    note: tier ? `${tier.name} — ${tier.short}${ads ? ` · ads run for you ($${ads}/mo)` : ""}` : clip(b.note, 600),
    sign_required: kind !== "invoice" && !b.invoiceOnly,
    // An edited agreement is frozen at creation; otherwise the template is
    // snapshotted when she signs (api/sign).
    agreement_text: kind !== "invoice" && !b.invoiceOnly ? clip(b.text, 20000) : "",
    text_version: TEXT_VERSION + (tier ? "-plan" : "") + (clip(b.text, 1) ? "-custom" : ""), status: "sent",
  };
  // A plan's text is always frozen now: the tier and the ads fee aren't
  // columns, so it can't be rebuilt from the row later.
  if (tier && !row.agreement_text) row.agreement_text = agreementText("plan", { client_name, business: row.business, plan: tier.id, price, ads, period: row.period });
  const { data, error } = await supabaseAdmin().from("agreements").insert(row).select("*").single();
  if (error) return bad(/relation .*agreements/i.test(error.message) ? "Run supabase/agreements.sql once in Supabase first." : error.message, 500);
  const origin = new URL(request.url).origin;
  const site = /(^|\.)rothmediaco\.com$/.test(new URL(origin).hostname) || /localhost/.test(origin) ? origin : "https://rothmediaco.com";
  const url = `${site}/sign/${data.token}`;
  return NextResponse.json({ ok: true, id: data.id, url, copy: sendCopy(data, url) });
}
