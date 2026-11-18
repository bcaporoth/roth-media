import { NextResponse } from "next/server";
import { DeleteObjectCommand, DeleteObjectsCommand, S3Client } from "@aws-sdk/client-s3";
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
    const days = Math.min(90, Math.max(1, Number.isFinite(Number(body.daysOpen)) ? Number(body.daysOpen) : 30));
    const eventDate = /^\d{4}-\d{2}-\d{2}$/.test(String(body.eventDate || "")) ? body.eventDate : null;
    const base = eventDate ? new Date(eventDate + "T23:59:59Z") : new Date();
    const until = new Date(base.getTime() + days * 86400000).toISOString();
    const galleryId = /^[0-9a-f-]{36}$/.test(String(body.galleryId || "")) ? body.galleryId : null;
    let { data, error } = await db
      .from("guest_events")
      .insert({ slug, title, event_date: eventDate, upload_open_until: until, ...(galleryId ? { gallery_id: galleryId } : {}) })
      .select("id, slug, title, event_date, upload_open_until, view_token, created_at")
      .single();
    // gallery_id arrives with supabase/guest-link.sql — create unlinked until then.
    if (error && galleryId && /gallery_id/i.test(error.message)) {
      ({ data, error } = await db
        .from("guest_events")
        .insert({ slug, title, event_date: eventDate, upload_open_until: until })
        .select("id, slug, title, event_date, upload_open_until, view_token, created_at")
        .single());
    }
    if (error) return bad(/duplicate|unique/i.test(error.message) ? "That link name is taken" : error.message, 500);
    return NextResponse.json({ event: data });
  }

  if (body.action === "list") {
    let { data: events, error } = await db
      .from("guest_events")
      .select("id, slug, title, event_date, upload_open_until, view_token, created_at, gallery_id, galleries(title)")
      .order("created_at", { ascending: false });
    if (error) {
      ({ data: events, error } = await db
        .from("guest_events")
        .select("id, slug, title, event_date, upload_open_until, view_token, created_at")
        .order("created_at", { ascending: false }));
    }
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
      events: (events || []).map((e) => ({ ...e, galleryTitle: e.galleries?.title || null, galleries: undefined, stats: byEvent[e.id] || { photos: 0, videos: 0, messages: 0, bytes: 0 } })),
    });
  }

  // ── One gallery's own Guest Reel (the switch on the gallery page and in
  // "+ New gallery"). On = an event attached to that gallery with uploads
  // open; Off = uploads closed, nothing guests sent is removed.
  if (body.action === "for-gallery" || body.action === "enable" || body.action === "disable") {
    const galleryId = /^[0-9a-f-]{36}$/.test(String(body.galleryId || "")) ? body.galleryId : null;
    if (!galleryId) return bad("Bad request");
    const cols = "id, slug, title, event_date, upload_open_until, view_token, created_at, gallery_id";
    const find = async () => {
      const { data } = await db.from("guest_events").select(cols).eq("gallery_id", galleryId).order("created_at", { ascending: false }).limit(1);
      return data?.[0] || null;
    };
    let ev = await find();

    if (body.action === "enable") {
      const in30 = () => new Date(Date.now() + 30 * 86400000).toISOString();
      if (ev) {
        if (new Date(ev.upload_open_until).getTime() <= Date.now()) {
          // Back to 30 days after the event if that is still ahead, else 30 days from now.
          const after = ev.event_date ? new Date(ev.event_date + "T23:59:59Z").getTime() + 30 * 86400000 : 0;
          const { error } = await db.from("guest_events").update({ upload_open_until: after > Date.now() + 86400000 ? new Date(after).toISOString() : in30() }).eq("id", ev.id);
          if (error) return bad(error.message, 500);
        }
      } else {
        const { data: g } = await db.from("galleries").select("id, title, event_date").eq("id", galleryId).maybeSingle();
        if (!g) return bad("Gallery not found", 404);
        // "Matt & April's gallery" reads better on the QR sign as "Matt & April".
        const title = (String(g.title || "").replace(/[’']s gallery$/i, "").trim() || "Guest photos").slice(0, 80);
        const eventDate = /^\d{4}-\d{2}-\d{2}$/.test(String(g.event_date || "")) ? g.event_date : null;
        // 30 days after the event, or 30 days from now if that has already passed.
        const afterEvent = eventDate ? new Date(eventDate + "T23:59:59Z").getTime() + 30 * 86400000 : 0;
        const until = afterEvent > Date.now() + 86400000 ? new Date(afterEvent).toISOString() : in30();
        const base = slugify(title).slice(0, 34).replace(/-+$/, "") || "guests";
        let made = null, lastErr = null;
        for (let n = 1; n <= 12 && !made; n++) {
          const slug = n === 1 ? base : `${base}-${n}`;
          if (!SLUG_RE.test(slug)) { lastErr = { message: "That gallery's name can't be turned into a link. Rename it first." }; break; }
          const { data, error } = await db.from("guest_events").insert({ slug, title, event_date: eventDate, upload_open_until: until, gallery_id: galleryId }).select("id").single();
          if (!error) made = data;
          else if (/duplicate|unique/i.test(error.message)) lastErr = error;
          else { lastErr = error; break; }
        }
        if (!made) return bad(lastErr?.message || "Couldn't turn it on", 500);
      }
      ev = await find();
    }

    if (body.action === "disable" && ev && new Date(ev.upload_open_until).getTime() > Date.now()) {
      const { error } = await db.from("guest_events").update({ upload_open_until: new Date().toISOString() }).eq("id", ev.id);
      if (error) return bad(error.message, 500);
      ev = await find();
    }

    if (!ev) return NextResponse.json({ event: null });
    const { data: rows } = await db.from("guest_uploads").select("kind").eq("event_id", ev.id);
    const stats = { photos: 0, videos: 0, messages: 0 };
    for (const r of rows || []) stats[r.kind === "photo" ? "photos" : r.kind === "video" ? "videos" : "messages"] += 1;
    return NextResponse.json({ event: { ...ev, stats } });
  }

  if (body.action === "set-gallery") {
    const { eventId, galleryId } = body;
    if (!eventId) return bad("Bad request");
    const gid = /^[0-9a-f-]{36}$/.test(String(galleryId || "")) ? galleryId : null;
    const { error } = await db.from("guest_events").update({ gallery_id: gid }).eq("id", eventId);
    if (error) return bad(error.message, 500);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "set-window") {
    const { eventId, until } = body;
    const d = new Date(until);
    if (!eventId || Number.isNaN(d.getTime())) return bad("Bad request");
    const { error } = await db.from("guest_events").update({ upload_open_until: d.toISOString() }).eq("id", eventId);
    if (error) return bad(error.message, 500);
    return NextResponse.json({ ok: true });
  }

  // What guests have sent for one event, newest first, with small previews —
  // feeds the "Review uploads" list (download / remove).
  if (body.action === "list-uploads") {
    const { eventId } = body;
    if (!/^[0-9a-f-]{36}$/i.test(String(eventId || ""))) return bad("Bad request");
    const { data: rows, error } = await db
      .from("guest_uploads")
      .select("id, guest_name, kind, filename, key, web_key, bytes, created_at")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false });
    if (error) return bad(error.message, 500);
    const uploads = await Promise.all(
      (rows || []).map(async (r) => ({
        id: r.id,
        guestName: r.guest_name || "",
        kind: r.kind,
        filename: r.filename,
        bytes: Number(r.bytes || 0),
        createdAt: r.created_at,
        // Photos preview from their web-size copy; videos and messages show a
        // play tile (their file is the video itself — too heavy for a list).
        thumbUrl:
          r.kind === "photo"
            ? await signedUrl(r.web_key || r.key, { expiresIn: 3600 }).catch(() => null)
            : null,
      }))
    );
    return NextResponse.json({ uploads });
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
    const keys = (rows || []).flatMap((r) => [r.key, r.web_key].filter(Boolean)).map((Key) => ({ Key }));
    for (let i = 0; i < keys.length; i += 1000) {
      try { await r2().send(new DeleteObjectsCommand({ Bucket: R2_BUCKET, Delete: { Objects: keys.slice(i, i + 1000), Quiet: true } })); } catch {}
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
