import { NextResponse } from "next/server";
import { isAdminRequest } from "../../../../lib/admin-guard";
import { supabaseAdmin } from "../../../../lib/supabase-admin";

export const dynamic = "force-dynamic";

const STATUSES = new Set(["new", "contacted", "booked", "lost", "archived"]);
const deny = () => NextResponse.json({ error: "Not authorized" }, { status: 403 });

// GET ?journey=<submission id> → the pages that visitor saw that day,
// up to the moment they hit send.
export async function GET(request) {
  if (!(await isAdminRequest())) return deny();
  const id = new URL(request.url).searchParams.get("journey");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const db = supabaseAdmin();
  const { data: sub } = await db
    .from("submissions")
    .select("visitor, created_at")
    .eq("id", id)
    .maybeSingle();
  if (!sub?.visitor) return NextResponse.json({ steps: [] });

  const end = new Date(sub.created_at);
  const start = new Date(end.getTime() - 24 * 3600 * 1000);
  const { data: steps } = await db
    .from("site_events")
    .select("created_at, type, name, path, referrer, utm_source, device, browser, city, region")
    .eq("visitor", sub.visitor)
    .gte("created_at", start.toISOString())
    .lte("created_at", new Date(end.getTime() + 60 * 1000).toISOString())
    .order("created_at", { ascending: true })
    .limit(200);
  return NextResponse.json({ steps: steps || [] });
}

// PATCH { id, status?, notes?, read? }
export async function PATCH(request) {
  if (!(await isAdminRequest())) return deny();
  const body = await request.json().catch(() => ({}));
  if (!body.id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const patch = { updated_at: new Date().toISOString() };
  if (body.status !== undefined) {
    if (!STATUSES.has(body.status))
      return NextResponse.json({ error: "Bad status" }, { status: 422 });
    patch.status = body.status;
  }
  if (body.notes !== undefined) patch.notes = String(body.notes).slice(0, 10000);
  if (body.read !== undefined) patch.read_at = body.read ? new Date().toISOString() : null;

  const { data, error } = await supabaseAdmin()
    .from("submissions")
    .update(patch)
    .eq("id", body.id)
    .select("id, status, notes, read_at")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, item: data });
}
