import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { S3Client } from "@aws-sdk/client-s3";
import { createSupabaseServer, portalConfigured } from "../../../../lib/supabase";
import { adminConfigured, supabaseAdmin, ADMIN_EMAIL } from "../../../../lib/supabase-admin";
import { R2_BUCKET, r2Configured, photoKey, signedUrl } from "../../../../lib/r2";
import { resendConfigured, sendEmail } from "../../../../lib/resend";
import { revealEmail } from "../../../../lib/premiere-emails";
import { resolveDesign } from "../../../../lib/design";

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

  if (body.action === "set-design") {
    const { galleryId, design } = body;
    if (!galleryId) return NextResponse.json({ error: "Bad request" }, { status: 422 });
    const clean = resolveDesign(design); // whitelists font/mode/accent
    const { error } = await db
      .from("galleries")
      .update({ design: clean })
      .eq("id", galleryId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, design: clean });
  }

  if (body.action === "set-premiere") {
    const { galleryId, enabled, revealAt } = body;
    if (!galleryId) return NextResponse.json({ error: "Bad request" }, { status: 422 });
    let reveal = null;
    if (revealAt) {
      const d = new Date(revealAt);
      if (Number.isNaN(d.getTime()))
        return NextResponse.json({ error: "Bad reveal time" }, { status: 422 });
      reveal = d.toISOString();
    }
    const { error } = await db
      .from("galleries")
      .update({ premiere_enabled: Boolean(enabled), reveal_at: reveal })
      .eq("id", galleryId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, enabled: Boolean(enabled), revealAt: reveal });
  }

  if (body.action === "premiere-status") {
    const { galleryId } = body;
    if (!galleryId) return NextResponse.json({ error: "Bad request" }, { status: 422 });
    const [{ data: gallery }, { data: leads }] = await Promise.all([
      db.from("galleries")
        .select("premiere_enabled, reveal_at, share_token, title")
        .eq("id", galleryId).maybeSingle(),
      db.from("premiere_leads")
        .select("name, email, created_at, reveal_sent_at")
        .eq("gallery_id", galleryId)
        .order("created_at", { ascending: true }),
    ]);
    if (!gallery) return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
    return NextResponse.json({
      enabled: gallery.premiere_enabled,
      revealAt: gallery.reveal_at,
      shareToken: gallery.share_token,
      title: gallery.title,
      emailReady: resendConfigured,
      leads: leads || [],
      unsent: (leads || []).filter((l) => !l.reveal_sent_at).length,
    });
  }

  if (body.action === "send-reveal") {
    // Backup for leads whose reveal email couldn't be scheduled.
    const { galleryId } = body;
    if (!galleryId) return NextResponse.json({ error: "Bad request" }, { status: 422 });
    if (!resendConfigured)
      return NextResponse.json({ error: "Email isn't set up (RESEND_API_KEY missing)" }, { status: 503 });
    const { data: gallery } = await db
      .from("galleries")
      .select("id, title, share_token")
      .eq("id", galleryId).maybeSingle();
    if (!gallery) return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
    const { data: leads } = await db
      .from("premiere_leads")
      .select("id, name, email")
      .eq("gallery_id", galleryId)
      .is("reveal_sent_at", null)
      .limit(500);
    const watchUrl = `https://rothmediaco.com/g/${gallery.share_token}`;
    let sent = 0;
    for (const lead of leads || []) {
      try {
        await sendEmail({
          to: lead.email,
          ...revealEmail({
            firstName: (lead.name || "").split(/\s+/)[0] || "",
            galleryTitle: gallery.title,
            watchUrl,
          }),
        });
        await db.from("premiere_leads")
          .update({ reveal_sent_at: new Date().toISOString() })
          .eq("id", lead.id);
        sent += 1;
      } catch {
        // keep going; unsent leads stay eligible for a retry
      }
    }
    return NextResponse.json({ ok: true, sent, remaining: (leads || []).length - sent });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
