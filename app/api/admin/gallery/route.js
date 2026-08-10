import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { S3Client } from "@aws-sdk/client-s3";
import { createSupabaseServer, portalConfigured } from "../../../../lib/supabase";
import { adminConfigured, supabaseAdmin, ADMIN_EMAIL } from "../../../../lib/supabase-admin";
import { R2_BUCKET, r2Configured, photoKey, signedUrl } from "../../../../lib/r2";

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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.email?.toLowerCase() !== ADMIN_EMAIL) return null;
  return user;
}

// Admin gallery API: create / sign-uploads / finalize, gated to the owner.
export async function POST(request) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const db = supabaseAdmin();

  if (body.action === "create") {
    const email = String(body.clientEmail || "").trim().toLowerCase();
    const title = String(body.title || "").trim();
    if (!email || !title)
      return NextResponse.json({ error: "Client email and title are required" }, { status: 422 });

    let { data: client } = await db
      .from("clients").select("id").eq("email", email).maybeSingle();
    if (!client) {
      const name = String(body.clientName || "").trim() ||
        email.split("@")[0].replace(/[._]/g, " ");
      ({ data: client } = await db
        .from("clients").insert({ email, name }).select("id").single());
    }
    const { data: gallery, error } = await db
      .from("galleries")
      .insert({
        client_id: client.id,
        title,
        event_date: body.eventDate || null,
      })
      .select("id, share_token")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ galleryId: gallery.id, shareToken: gallery.share_token });
  }

  if (body.action === "sign") {
    const { galleryId, files } = body;
    if (!galleryId || !Array.isArray(files) || files.length === 0 || files.length > 60)
      return NextResponse.json({ error: "Bad sign request" }, { status: 422 });
    const urls = await Promise.all(
      files.map(async ({ size, filename, contentType }) => {
        const safe = String(filename).replace(/[^\w.\- ]/g, "_");
        const key = photoKey(galleryId, size, safe);
        const url = await getSignedUrl(
          r2(),
          new PutObjectCommand({ Bucket: R2_BUCKET, Key: key, ContentType: contentType }),
          { expiresIn: 3600 }
        );
        return { filename: safe, size, url };
      })
    );
    return NextResponse.json({ urls });
  }

  if (body.action === "finalize") {
    const { galleryId, media, coverFilename } = body;
    if (!galleryId || !Array.isArray(media))
      return NextResponse.json({ error: "Bad finalize request" }, { status: 422 });
    const rows = media.map((m, i) => ({
      gallery_id: galleryId,
      filename: String(m.filename),
      kind: m.kind === "video" ? "video" : "photo",
      position: i,
    }));
    const { error } = await db.from("media").insert(rows);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await db
      .from("galleries")
      .update({ media_count: rows.length, cover_filename: coverFilename || null })
      .eq("id", galleryId);
    return NextResponse.json({ ok: true });
  }


  if (body.action === "list-media") {
    const { galleryId } = body;
    if (!galleryId) return NextResponse.json({ error: "Bad request" }, { status: 422 });
    const jpgName = (f) => f.replace(/\.[^.]+$/, "") + ".jpg";
    const [{ data: gallery }, { data: media }] = await Promise.all([
      db.from("galleries").select("id, cover_filename").eq("id", galleryId).maybeSingle(),
      db.from("media").select("filename, kind, position").eq("gallery_id", galleryId)
        .order("position", { ascending: true }),
    ]);
    if (!gallery) return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
    const items = await Promise.all(
      (media || []).map(async (m) => ({
        filename: m.filename,
        kind: m.kind,
        coverName: jpgName(m.filename),
        thumbUrl: await signedUrl(photoKey(galleryId, "thumb", jpgName(m.filename))).catch(() => null),
      }))
    );
    return NextResponse.json({ cover: gallery.cover_filename, items });
  }

  if (body.action === "set-cover") {
    const { galleryId, coverFilename } = body;
    if (!galleryId) return NextResponse.json({ error: "Bad request" }, { status: 422 });
    const safe = coverFilename ? String(coverFilename).replace(/[^\w.\- ]/g, "_") : null;
    const { error } = await db
      .from("galleries")
      .update({ cover_filename: safe })
      .eq("id", galleryId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, cover: safe });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
