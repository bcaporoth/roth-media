import { NextResponse } from "next/server";
import { createSupabaseServer, portalConfigured } from "../../../../lib/supabase";
import { suggest } from "../../../../lib/geo";

// Address lookup as you type, for signed-in clients (the location questions
// in their brief). Same free lookup as Studio's /api/admin/geo; signed-in
// only so nobody else burns the quota.
export const dynamic = "force-dynamic";

export async function GET(request) {
  if (!portalConfigured) return NextResponse.json({ hits: [] });
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const q = String(new URL(request.url).searchParams.get("q") || "").trim().slice(0, 120);
  if (q.length < 3) return NextResponse.json({ hits: [] });
  try { return NextResponse.json({ hits: await suggest(q) }); }
  catch { return NextResponse.json({ hits: [] }); }
}
