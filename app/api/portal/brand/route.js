import { NextResponse } from "next/server";
import { createSupabaseServer, portalConfigured } from "../../../../lib/supabase";
import { adminConfigured, supabaseAdmin } from "../../../../lib/supabase-admin";
import { brandAction } from "../../../../lib/brand-server";

export const dynamic = "force-dynamic";

// The signed-in client edits their own brand palette: autosave, logo and
// mood-board uploads. Their client row is found by the session's email —
// they can only ever reach their own palette, and only once Brandon has
// opened one for them.
export async function POST(request) {
  if (!portalConfigured || !adminConfigured) return NextResponse.json({ error: "Not set up" }, { status: 503 });
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "Sign in first" }, { status: 401 });

  const db = supabaseAdmin();
  const { data: client } = await db.from("clients").select("id").eq("email", user.email.toLowerCase()).maybeSingle();
  if (!client) return NextResponse.json({ error: "No client account for this email" }, { status: 404 });
  const { data: palette, error } = await db.from("brand_palettes").select("client_id").eq("client_id", client.id).maybeSingle();
  if (error || !palette) return NextResponse.json({ error: "Your brand palette isn't open yet" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  try {
    const r = await brandAction(db, client.id, body, "client");
    return NextResponse.json(r, { status: r.status || 200 });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Something went wrong" }, { status: 500 });
  }
}
