import { NextResponse } from "next/server";
import { createSupabaseServer, portalConfigured } from "../../../../lib/supabase";
import { adminConfigured, supabaseAdmin } from "../../../../lib/supabase-admin";
import { cleanCart, cartLines, cartTotals } from "../../../../lib/shop";
import { money } from "../../../../lib/packages";
import { clip } from "../../../../lib/visitor";
import { resendConfigured, sendEmail } from "../../../../lib/resend";
import { LEAD_ALERT_TO, leadAlertEmail } from "../../../../lib/studio-emails";

export const dynamic = "force-dynamic";

// The signed-in client's Shop cart.
//   save — keep their cart (one "cart" row per client; Studio shows it)
//   ask  — a question about it, or "add these to my booking": lands in the
//          Studio Inbox (kind "shop") and emails Brandon the lead alert.
export async function POST(request) {
  if (!portalConfigured || !adminConfigured) return NextResponse.json({ error: "Not set up" }, { status: 503 });
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const email = user.email.toLowerCase();
  const body = await request.json().catch(() => ({}));
  const cart = cleanCart(body.cart || {});
  const db = supabaseAdmin();
  const { data: c } = await db.from("clients").select("name, phone").eq("email", email).maybeSingle();
  const name = c?.name || "";
  const { once, monthly, pkg, list } = cartTotals(cart);
  const total = `${money(once)}${monthly ? ` + ${money(monthly)}/mo` : ""}`;

  if (body.action === "save") {
    const { data: cur } = await db.from("submissions").select("id").eq("kind", "cart").eq("email", email).limit(1).maybeSingle();
    const row = {
      kind: "cart", email, name, utm: cart, fields: cartLines(cart),
      subject: `Cart — ${name || email}`,
      summary: pkg || list.length ? `In their cart: ${[pkg?.name, ...list.map((a) => a.name)].filter(Boolean).join(", ")} · ${total}` : "Cart is empty",
      updated_at: new Date().toISOString(),
    };
    const q = cur ? db.from("submissions").update(row).eq("id", cur.id) : db.from("submissions").insert({ ...row, status: "new", source_path: "/portal/shop" });
    const { error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "ask") {
    const note = clip(body.note, 2000).trim();
    const what = body.kind === "addons" ? "Add these to my booking" : "Question about the shop";
    if (!note && !pkg && !list.length) return NextResponse.json({ error: "Write a question, or add something to your cart first" }, { status: 422 });
    const fields = [...(note ? [["Their note", note]] : []), ...cartLines(cart)];
    const row = { kind: "shop", email, name, phone: c?.phone || "", fields, utm: cart, status: "new", source_path: "/portal/shop", subject: `${what} — ${name || email}`, summary: `${what}${pkg || list.length ? ` · ${total}` : ""}` };
    const { error } = await db.from("submissions").insert(row);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (resendConfigured) { try { await sendEmail({ to: LEAD_ALERT_TO, ...leadAlertEmail(row) }); } catch {} }
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
