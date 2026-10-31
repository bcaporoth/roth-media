import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { isAdminRequest } from "../../../../lib/admin-guard";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { AGREEMENT_KINDS, TEXT_VERSION, sendCopy } from "../../../../lib/agreements";
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
  const amount_cents = Math.round(Number(b.amount) * 100);
  const client_name = clip(b.name, 120), client_email = clip(b.email, 160).toLowerCase(), client_phone = clip(b.phone, 40);
  if (!client_name) return bad("Add the client's name");
  if (!EMAIL_RE.test(client_email)) return bad("That email doesn't look right");
  if (!(amount_cents >= 100 && amount_cents <= 2000000)) return bad("Enter an amount between $1 and $20,000");
  const row = {
    token: crypto.randomBytes(9).toString("base64url"), kind, client_name, client_email, client_phone,
    business: clip(b.business, 160), site_url: clip(b.site, 200), amount_cents,
    period: clip(b.period, 60), note: clip(b.note, 600),
    sign_required: kind === "upkeep" && !b.invoiceOnly,
    text_version: TEXT_VERSION, status: "sent",
  };
  const { data, error } = await supabaseAdmin().from("agreements").insert(row).select("*").single();
  if (error) return bad(/relation .*agreements/i.test(error.message) ? "Run supabase/agreements.sql once in Supabase first." : error.message, 500);
  const origin = new URL(request.url).origin;
  const site = /(^|\.)rothmediaco\.com$/.test(new URL(origin).hostname) || /localhost/.test(origin) ? origin : "https://rothmediaco.com";
  const url = `${site}/sign/${data.token}`;
  return NextResponse.json({ ok: true, id: data.id, url, copy: sendCopy(data, url) });
}
