import { NextResponse } from "next/server";
import { isAdminRequest } from "../../../../lib/admin-guard";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { isDateKey, isLostReason } from "../../../../lib/lead-intel";

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

// The action-bar columns (first_contacted_at, next_follow_up, lost_reason)
// arrive with supabase/studio-2.sql. Until it's run, saving them fails with a
// "column does not exist" error — that must never break status/notes saves.
const columnMissing = (error) =>
  !!error && (error.code === "42703" || error.code === "PGRST204" || /column .* does not exist|could not find the .* column/i.test(error.message || ""));

// PATCH { id, status?, notes?, read?, touch?, followUp?, lostReason? }
//   touch: true        → Brandon just tapped Text/Email/Call: a New lead becomes
//                        Contacted, and first_contacted_at is stamped (once).
//   followUp: "YYYY-MM-DD" | null   → next_follow_up
//   lostReason: one of LOST_REASONS | null
export async function PATCH(request) {
  if (!(await isAdminRequest())) return deny();
  const body = await request.json().catch(() => ({}));
  if (!body.id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const db = supabaseAdmin();
  const now = new Date().toISOString();

  const patch = { updated_at: now };
  if (body.status !== undefined) {
    if (!STATUSES.has(body.status))
      return NextResponse.json({ error: "Bad status" }, { status: 422 });
    patch.status = body.status;
  }
  if (body.notes !== undefined) patch.notes = String(body.notes).slice(0, 10000);
  if (body.read !== undefined) patch.read_at = body.read ? now : null;

  const extra = {};
  if (body.followUp !== undefined) {
    if (body.followUp !== null && body.followUp !== "" && !isDateKey(body.followUp))
      return NextResponse.json({ error: "Bad follow-up date" }, { status: 422 });
    extra.next_follow_up = body.followUp || null;
  }
  if (body.lostReason !== undefined) {
    if (body.lostReason !== null && body.lostReason !== "" && !isLostReason(body.lostReason))
      return NextResponse.json({ error: "Bad reason" }, { status: 422 });
    extra.lost_reason = body.lostReason || null;
  }

  // A tap on Text/Email/Call only ever moves New → Contacted; it never
  // un-books or re-opens a lead.
  if (body.touch && patch.status === undefined) {
    const { data: cur, error: curErr } = await db.from("submissions").select("status").eq("id", body.id).maybeSingle();
    if (curErr) return NextResponse.json({ error: curErr.message }, { status: 500 });
    if (!cur) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (cur.status === "new") patch.status = "contacted";
  }

  const { data, error } = await db
    .from("submissions")
    .update(patch)
    .eq("id", body.id)
    .select("id, status, notes, read_at")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // New columns go in their own updates so a missing migration can't take the
  // save above down with it.
  const item = { ...data };
  let needsMigration = false;
  if (Object.keys(extra).length) {
    const r = await db.from("submissions").update(extra).eq("id", body.id).select("id, next_follow_up, lost_reason").maybeSingle();
    if (r.error) {
      if (!columnMissing(r.error)) return NextResponse.json({ error: r.error.message }, { status: 500 });
      needsMigration = true;
    } else if (r.data) Object.assign(item, r.data);
  }
  // First touch: stamped once, the first time a lead leaves New (by a tap on
  // Text/Email/Call or by the status buttons). Never overwritten.
  if (body.touch || patch.status === "contacted" || patch.status === "booked") {
    const r = await db.from("submissions").update({ first_contacted_at: now }).eq("id", body.id).is("first_contacted_at", null).select("id, first_contacted_at").maybeSingle();
    if (r.error) {
      if (columnMissing(r.error)) needsMigration = true; // the status change above still saved
    } else if (r.data) item.first_contacted_at = r.data.first_contacted_at;
  }

  return NextResponse.json({ ok: true, item, ...(needsMigration ? { needsMigration: true } : {}) });
}
