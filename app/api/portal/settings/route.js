import { NextResponse } from "next/server";
import { createSupabaseServer, portalConfigured } from "../../../../lib/supabase";
import { adminConfigured, supabaseAdmin } from "../../../../lib/supabase-admin";
import { clip } from "../../../../lib/visitor";

export const dynamic = "force-dynamic";
const bad = (error, status = 422) => NextResponse.json({ error }, { status });

// The signed-in client's Settings (2026-11-08): their name and phone, and
// whether they get the extra emails (offers, check-ins). Receipts, "your
// gallery is ready" and notes from Brandon always come. Email itself isn't
// changed here — it's their login and how everything is matched to them.
export async function POST(request) {
  if (!portalConfigured || !adminConfigured) return bad("Not set up", 503);
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return bad("Sign in first", 401);
  const email = user.email.toLowerCase();
  const body = await request.json().catch(() => ({}));
  const db = supabaseAdmin();
  const { data: c } = await db.from("clients").select("id").eq("email", email).maybeSingle();
  if (!c) return bad("Your account isn't linked to a client profile yet. Text Brandon at 845-549-4425.", 404);

  const patch = {};
  if (body.name !== undefined) {
    const name = clip(body.name, 120).trim();
    if (!name) return bad("Add your name");
    patch.name = name;
  }
  if (body.phone !== undefined) patch.phone = clip(body.phone, 40).trim();
  if (body.emails !== undefined) patch.email_opt_out = !body.emails;
  if (!Object.keys(patch).length) return bad("Nothing to save");
  const { error } = await db.from("clients").update(patch).eq("id", c.id);
  if (error) return bad(error.message, 500);
  return NextResponse.json({ ok: true });
}
