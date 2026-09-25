import { NextResponse } from "next/server";
import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createSupabaseServer, portalConfigured } from "../../../../lib/supabase";
import { adminConfigured, supabaseAdmin, ADMIN_EMAIL } from "../../../../lib/supabase-admin";
import { R2_BUCKET, r2Configured, signedUrl } from "../../../../lib/r2";
import { SLUG_RE, slugify } from "../../../../lib/guest";

export const dynamic = "force-dynamic";

let s3;
function r2() {
  if (!s3) {
    s3 = new S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    });
  }
  return s3;
}

async function requireAdmin() {
  if (!portalConfigured || !adminConfigured || !r2Configured) return null;
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email?.toLowerCase() !== ADMIN_EMAIL) return null;
  return user;
}

const bad = (msg, status = 422) => NextResponse.json({ error: msg }, { status });

// Admin side of Guest Reel: create events, see what came in, prune junk.
export async function POST(request) {
  const user = await requireAdmin();
  if (!user) return bad("Not authorized", 403);
  const body = await request.json().catch(() => ({}));
  const db = supabaseAdmin();

  if (body.action === "create") {
    const title = String(body.title || "").trim().slice(0, 80);
    if (!title) return bad("Give the event a name");
    let slug = slugify(body.slug || title);
    if (!SLUG_RE.test(slug)) return bad("That link name won't work — letters, numbers, dashes");
    const days = Math.min(90, Math.max(1, Number(body.daysOpen || 30)));
    const eventDate = body.eventDate || null;
    const base = eventDate ? new Date(eventDate + "T23:59:59Z") : new Date();
    const until = new Date(base.getTime() + days * 86400000).toISOString();
    const { data, error } = await db
      .from("guest_events")
      .insert({ slug, title, event_date: eventDate, upload_open_until: until })
      .select("id, slug, title, event_date, upload_open_until, view_token, created_at")
      .single();
    if (error) return bad(/duplicate|unique/i.test(error.message) ? "That link name is taken" : error.message, 500);
    return NextResponse.json({ event: data });
  }

  if (body.action === "list") {
    const { data: events, error } = await db
      .from("guest_events")
      .select("id, slug, title, event_date, upload_open_until, view_token, created_at")
      .order("created_at", { ascending: false });
    if (error) return bad(error.message, 500);
    const { data: counts } = await db
      .from("guest_uploads")
      .select("event_id, kind, bytes");
    const byEvent = {};
    for (const c of counts || []) {
      const e = (byEvent[c.event_id] ||= { photos: 0, videos: 0, messages: 0, bytes: 0, guests: 0 });
      if (c.kind === "photo") e.photos += 1;
      else if (c.kind === "video") e.videos += 1;
      else e.messages += 1;
      e.bytes += Number(c.bytes || 0);
    }
    return NextResponse.json({
      events: (events || []).map((e) => ({ ...e, stats: byEvent[e.id] || { photos: 0, videos: 0, messages: 0, bytes: 0 } })),
    });
  }

  if (body.action === "set-window") {
    const { eventId, until } = body;
    const d = new Date(until);
    if (!eventId || Number.isNaN(d.getTime())) return bad("Bad request");
    const { error } = await db.from("guest_events").update({ upload_open_until: d.toISOString() }).eq("id", eventId);
    if (error) return bad(error.message, 500);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "delete-upload") {
    const { uploadId } = body;
    if (!uploadId) return bad("Bad request");
    const { data: row } = await db.from("guest_uploads").select("id, key, web_key").eq("id", uploadId).maybeSingle();
    if (!row) return bad("Not found", 404);
    for (const key of [row.key, row.web_key].filter(Boolean)) {
      try { await r2().send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key })); } catch {}
    }
    const { error } = await db.from("guest_uploads").delete().eq("id", uploadId);
    if (error) return bad(error.message, 500);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "delete-event") {
    const { eventId } = body;
    if (!eventId) return bad("Bad request");
    const { data: rows } = await db.from("guest_uploads").select("key, web_key").eq("event_id", eventId);
    for (const r of rows || []) {
      for (const key of [r.key, r.web_key].filter(Boolean)) {
        try { await r2().send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key })); } catch {}
      }
    }
    const { error } = await db.from("guest_events").delete().eq("id", eventId);
    if (error) return bad(error.message, 500);
    return NextResponse.json({ ok: true, removed: (rows || []).length });
  }

  if (body.action === "download-url") {
    const { uploadId } = body;
    const { data: row } = await db.from("guest_uploads").select("key, filename").eq("id", uploadId).maybeSingle();
    if (!row) return bad("Not found", 404);
    return NextResponse.json({ url: await signedUrl(row.key, { download: row.filename }) });
  }

  return bad("Unknown action", 400);
}
