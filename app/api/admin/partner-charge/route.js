import { NextResponse } from "next/server";
import { isAdminRequest } from "../../../../lib/admin-guard";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { stripe, stripeConfigured } from "../../../../lib/stripe";
import { money } from "../../../../lib/packages";
import { clip } from "../../../../lib/visitor";

export const dynamic = "force-dynamic";

// Studio → Payments → Partner charges: put a closing fee or an event on a
// partner's saved card (agreement §3: Brandon tells them first). Stripe
// creates an invoice and charges it right away.
export async function POST(request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  if (!stripeConfigured) return NextResponse.json({ error: "Stripe isn't set up" }, { status: 503 });
  const b = await request.json().catch(() => ({}));
  const amount = Math.round(Number(b.amount) * 100);
  const what = clip(b.description, 200);
  if (!(amount >= 100 && amount <= 1000000)) return NextResponse.json({ error: "Enter an amount between $1 and $10,000" }, { status: 422 });
  if (!what) return NextResponse.json({ error: "Say what the charge is for" }, { status: 422 });

  const db = supabaseAdmin();
  const { data: row } = await db.from("submissions").select("id, fields, utm, name").eq("id", b.id).eq("kind", "partner").maybeSingle();
  const customer = row?.utm?.stripe_customer;
  if (!customer) return NextResponse.json({ error: "That partner hasn't finished signing up" }, { status: 404 });

  try {
    await stripe("POST", "/invoiceitems", { customer, amount, currency: "usd", description: what });
    const inv = await stripe("POST", "/invoices", { customer, collection_method: "charge_automatically", pending_invoice_items_behavior: "include", description: what, metadata: { partner: row.utm.partner || "", kind: "partner_charge" } });
    await stripe("POST", `/invoices/${inv.id}/finalize`, {});
    const paid = await stripe("POST", `/invoices/${inv.id}/pay`, {});
    const ok = paid.status === "paid";
    const note = `${new Date().toLocaleDateString("en-US")}: ${money(amount / 100)} — ${what} — ${ok ? "paid" : paid.status}`;
    await db.from("submissions").update({ fields: [...(row.fields || []), ["charge", note]] }).eq("id", row.id);
    return NextResponse.json({ ok, status: paid.status, note });
  } catch (err) {
    return NextResponse.json({ error: `Card charge failed: ${err.message}` }, { status: 502 });
  }
}
