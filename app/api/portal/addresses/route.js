import { NextResponse } from "next/server";
import { createSupabaseServer, portalConfigured } from "../../../../lib/supabase";
import { adminConfigured, supabaseAdmin } from "../../../../lib/supabase-admin";
import { cleanAddressBook } from "../../../../lib/client-addresses";

export const dynamic = "force-dynamic";
const bad = (error, status = 422) => NextResponse.json({ error }, { status });

// Settings → Your addresses: the signed-in client saves their own list
// ({ book: [{ label, address }], hidden: [keys of places they removed] }).
// One submissions row per client (kind "addresses"), kept out of the Inbox.
export async function POST(request) {
  if (!portalConfigured || !adminConfigured) return bad("Not set up", 503);
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return bad("Sign in first", 401);
  const email = user.email.toLowerCase();
  const body = await request.json().catch(() => ({}));
  const utm = cleanAddressBook(body);
  const db = supabaseAdmin();
  const { data: cur } = await db.from("submissions").select("id").eq("kind", "addresses").eq("email", email).limit(1).maybeSingle();
  const row = { kind: "addresses", email, utm, fields: utm.book.map((b) => [b.label || "Address", b.address]), subject: `Addresses — ${email}`, summary: `${utm.book.length} saved address${utm.book.length === 1 ? "" : "es"}`, updated_at: new Date().toISOString() };
  const q = cur ? db.from("submissions").update(row).eq("id", cur.id) : db.from("submissions").insert({ ...row, status: "archived", source_path: "/portal/account" });
  const { error } = await q;
  if (error) return bad(error.message, 500);
  return NextResponse.json({ ok: true, ...utm });
}
