import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand, HeadObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { adminConfigured, supabaseAdmin } from "../../../lib/supabase-admin";
import { R2_BUCKET, r2Configured } from "../../../lib/r2";
import {
  SLUG_RE, MAX_FILE_BYTES, MAX_FILES_PER_SIGN, guestKey, safeName, kindFor, isOpen,
} from "../../../lib/guest";

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

const bad = (msg, status = 422) => NextResponse.json({ error: msg }, { status });

async function loadEvent(db, slug) {
  if (!SLUG_RE.test(String(slug || ""))) return null;
  const { data } = await db
    .from("guest_events")
    .select("id, slug, title, event_date, upload_open_until")
    .eq("slug", slug)
    .maybeSingle();
  return data || null;
}

// Public Guest Reel API — no login. Guests scan a QR, pick photos/videos,
// get presigned PUT URLs straight to R2, then record what landed.
export async function POST(request) {
  if (!adminConfigured || !r2Configured) return bad("Guest uploads aren't set up", 503);
  const body = await request.json().catch(() => ({}));
  const db = supabaseAdmin();

  if (body.action === "sign") {
    const event = await loadEvent(db, body.slug);
    if (!event) return bad("Event not found", 404);
    if (!isOpen(event)) return bad("Uploads for this event have closed", 410);
    if (body.consent !== true) return bad("Please accept the sharing terms first");
    const guestName = String(body.guestName || "").trim().slice(0, 60);
    const files = Array.isArray(body.files) ? body.files : [];
    if (!files.length || files.length > MAX_FILES_PER_SIGN)
      return bad(`Send 1–${MAX_FILES_PER_SIGN} files at a time`);

    const urls = [];
    for (const f of files) {
      const contentType = String(f.contentType || "");
      const bytes = Number(f.bytes || 0);
      if (!/^(image|video)\//.test(contentType)) return bad(`${f.filename || "A file"} isn't a photo or video`);
      if (!(bytes > 0)) return bad(`${f.filename || "A file"} is empty`);
      if (bytes > MAX_FILE_BYTES) return bad(`${f.filename || "A file"} is over 750 MB`);
      const id = crypto.randomUUID();
      const filename = safeName(f.filename);
      const kind = kindFor(contentType, f.message === true);
      const key = guestKey(event.id, id, "orig", filename);
      const url = await getSignedUrl(
        r2(),
        new PutObjectCommand({ Bucket: R2_BUCKET, Key: key, ContentType: contentType }),
        { expiresIn: 3600 }
      );
      let web = null;
      if (kind === "photo") {
        const webKey = guestKey(event.id, id, "web", filename.replace(/\.[^.]+$/, "") + ".jpg");
        web = {
          key: webKey,
          url: await getSignedUrl(
            r2(),
            new PutObjectCommand({ Bucket: R2_BUCKET, Key: webKey, ContentType: "image/jpeg" }),
            { expiresIn: 3600 }
          ),
        };
      }
      urls.push({ id, filename, kind, contentType, bytes, key, url, web });
    }
    return NextResponse.json({ eventId: event.id, guestName, urls });
  }

  if (body.action === "record") {
    const event = await loadEvent(db, body.slug);
    if (!event) return bad("Event not found", 404);
    const guestName = String(body.guestName || "").trim().slice(0, 60);
    const items = Array.isArray(body.items) ? body.items.slice(0, MAX_FILES_PER_SIGN) : [];
    if (!items.length) return bad("Nothing to record");
    const rows = [];
    for (const it of items) {
      const id = String(it.id || "");
      const filename = safeName(it.filename);
      const key = guestKey(event.id, id, "orig", filename);
      if (!/^[0-9a-f-]{36}$/.test(id) || it.key !== key) continue; // only keys we signed
      // Confirm the bytes actually landed before writing a row — and that the
      // size cap wasn't dodged by lying at sign time.
      let bytes = 0;
      try {
        const head = await r2().send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key }));
        bytes = Number(head.ContentLength || 0);
      } catch {
        continue;
      }
      if (bytes > MAX_FILE_BYTES) {
        try { await r2().send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key })); } catch {}
        continue;
      }
      const kind = ["photo", "video", "message"].includes(it.kind) ? it.kind : "photo";
      // web_key is rebuilt here, never taken from the caller — it names an R2 object we later delete.
      const webKey = kind === "photo" && it.webKey ? guestKey(event.id, id, "web", filename.replace(/\.[^.]+$/, "") + ".jpg") : null;
      rows.push({
        id,
        event_id: event.id,
        guest_name: guestName,
        kind,
        filename,
        key,
        web_key: webKey,
        content_type: String(it.contentType || "").slice(0, 80),
        bytes,
        width: it.width > 0 ? Math.round(it.width) : null,
        height: it.height > 0 ? Math.round(it.height) : null,
      });
    }
    if (!rows.length) return bad("Uploads didn't finish — try again");
    // A retried record (dropped response) must not 500 on the primary key.
    const { error } = await db.from("guest_uploads").upsert(rows, { onConflict: "id", ignoreDuplicates: true });
    if (error) return bad(error.message, 500);
    return NextResponse.json({ ok: true, recorded: rows.length });
  }

  return bad("Unknown action", 400);
}
