import { NextResponse } from "next/server";
import {
  PutObjectCommand,
  S3Client,
  ListObjectsV2Command,
  DeleteObjectsCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  ListPartsCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createSupabaseServer, portalConfigured } from "../../../../lib/supabase";
import { adminConfigured, supabaseAdmin, ADMIN_EMAIL } from "../../../../lib/supabase-admin";
import { R2_BUCKET, r2Configured, photoKey, signedUrl, getDims, putDims } from "../../../../lib/r2";
import { resendConfigured, sendEmail } from "../../../../lib/resend";
import { revealEmail } from "../../../../lib/premiere-emails";
import { resolveDesign } from "../../../../lib/design";
import { setOwner, sendAccessInvite, cleanEmail, EMAIL_RE } from "../../../../lib/album-access";
import { readyEmail } from "../../../../lib/ready-email";
import { isNoEmail } from "../../../../lib/no-email";
import {
  isUuid,
  galleryPrefix,
  keyInGallery,
  normConfirm,
  planFinalize,
  planRemoval,
} from "../../../../lib/gallery-admin";

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

// Delete R2 objects, but ONLY keys inside this one gallery's own prefix.
// Anything else in the list is refused before a single delete goes out.
async function deleteGalleryKeys(galleryId, keys) {
  const prefix = galleryPrefix(galleryId); // throws on a bad id
  if (!prefix || !prefix.endsWith(`${galleryId}/`)) throw new Error("Bad gallery prefix");
  const list = [...new Set(keys)];
  if (list.some((k) => !keyInGallery(galleryId, k)))
    throw new Error("Refusing to delete a file outside this gallery");
  let deleted = 0;
  for (let i = 0; i < list.length; i += 1000) {
    const batch = list.slice(i, i + 1000);
    const res = await r2().send(
      new DeleteObjectsCommand({
        Bucket: R2_BUCKET,
        Delete: { Objects: batch.map((Key) => ({ Key })), Quiet: true },
      })
    );
    if (res.Errors && res.Errors.length)
      throw new Error(`Storage refused ${res.Errors.length} delete(s) — nothing else was changed`);
    deleted += batch.length;
  }
  return deleted;
}

// Every object under one gallery's prefix (paged).
async function listGalleryKeys(galleryId) {
  const prefix = galleryPrefix(galleryId);
  if (!prefix || !prefix.endsWith(`${galleryId}/`)) throw new Error("Bad gallery prefix");
  const keys = [];
  let token;
  do {
    const res = await r2().send(
      new ListObjectsV2Command({ Bucket: R2_BUCKET, Prefix: prefix, ContinuationToken: token })
    );
    for (const o of res.Contents || []) keys.push(o.Key);
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
  return keys;
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

  // Everything the "Edit album" panel needs: owner + extra people.
  if (body.action === "detail") {
    const { galleryId } = body;
    if (!galleryId) return NextResponse.json({ error: "Bad request" }, { status: 422 });
    const { data: g } = await db.from("galleries").select("id, title, event_date, client_id, clients!client_id(name, email)").eq("id", galleryId).maybeSingle();
    if (!g) return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
    let members = [];
    try {
      const { data } = await db.from("gallery_members").select("client_id, clients(id, name, email)").eq("gallery_id", galleryId);
      members = (data || []).map((m) => ({ id: m.client_id, name: m.clients?.name || "", email: m.clients?.email || "" }));
    } catch {}
    return NextResponse.json({ gallery: { id: g.id, title: g.title, event_date: g.event_date, ownerName: g.clients?.name || "", ownerEmail: g.clients?.email || "" }, members });
  }

  // "It's ready": email the owner and everyone with access. Each person's
  // button lands on the gallery — through sign-in if they have a login,
  // through one-time-code setup if they don't. Records ready_sent_at
  // (supabase/ready.sql); without that column the send still goes out.
  if (body.action === "send-ready") {
    const { galleryId } = body;
    const note = String(body.note || "").trim().slice(0, 600);
    if (!isUuid(galleryId)) return NextResponse.json({ error: "Bad request" }, { status: 422 });
    if (!resendConfigured) return NextResponse.json({ error: "Email isn't set up on this server (RESEND_API_KEY)." }, { status: 500 });
    const { data: g } = await db.from("galleries").select("id, title, share_token, client_id, clients!client_id(name, email)").eq("id", galleryId).maybeSingle();
    if (!g) return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
    const people = [{ name: g.clients?.name || "", email: cleanEmail(g.clients?.email) }];
    try {
      const { data } = await db.from("gallery_members").select("client_id, clients(name, email)").eq("gallery_id", galleryId);
      for (const m of data || []) people.push({ name: m.clients?.name || "", email: cleanEmail(m.clients?.email) });
    } catch {}
    const seen = new Set();
    const recipients = people.filter((p) => EMAIL_RE.test(p.email) && !isNoEmail(p.email) && p.email !== ADMIN_EMAIL && !seen.has(p.email) && seen.add(p.email));
    if (!recipients.length) return NextResponse.json({ error: "Nobody on this gallery has an email yet — add one under Edit first." }, { status: 422 });
    // Who already has a portal login (Supabase auth pages; a roster this size fits in a page or two).
    const logins = new Set();
    for (let page = 1; page <= 20; page++) {
      const { data } = await db.auth.admin.listUsers({ page, perPage: 200 });
      for (const u of data?.users || []) logins.add((u.email || "").toLowerCase());
      if ((data?.users || []).length < 200) break;
    }
    const results = [];
    for (const p of recipients) {
      const hasLogin = logins.has(p.email);
      const mail = readyEmail({ name: p.name, email: p.email, gallery: g, hasLogin, note });
      try {
        await sendEmail({ to: p.email, subject: mail.subject, text: mail.text, html: mail.html });
        results.push({ to: p.email, name: p.name, hasLogin, sent: true });
      } catch (err) {
        results.push({ to: p.email, name: p.name, hasLogin, sent: false, error: err.message });
      }
    }
    const sentAt = new Date().toISOString();
    let recorded = false;
    if (results.some((r) => r.sent)) {
      const { error } = await db.from("galleries").update({ ready_sent_at: sentAt }).eq("id", galleryId);
      recorded = !error;
    }
    return NextResponse.json({ ok: true, sentAt, recorded, results });
  }

  // Edit title / date / owner. A new owner email is added to the roster.
  if (body.action === "update") {
    const { galleryId } = body;
    if (!galleryId) return NextResponse.json({ error: "Bad request" }, { status: 422 });
    const patch = {};
    if (body.title !== undefined) {
      const title = String(body.title || "").trim().slice(0, 120);
      if (!title) return NextResponse.json({ error: "Give the gallery a title" }, { status: 422 });
      patch.title = title;
    }
    if (body.eventDate !== undefined) {
      const d = String(body.eventDate || "");
      if (d && !/^\d{4}-\d{2}-\d{2}$/.test(d)) return NextResponse.json({ error: "Bad date" }, { status: 422 });
      patch.event_date = d || null;
    }
    // Changing the owner moves the album to that person and emails them an
    // access invite (the one automated client email Brandon approved).
    let owner = null;
    if (body.ownerEmail !== undefined) {
      try {
        owner = await setOwner(db, { galleryId, email: body.ownerEmail, name: body.ownerName });
      } catch (err) {
        return NextResponse.json({ error: err.message }, { status: /doesn't look right|not found/i.test(err.message) ? 422 : 500 });
      }
      if (owner.changed) patch.client_id = owner.clientId;
    }
    if (Object.keys(patch).length) {
      const { error } = await db.from("galleries").update(patch).eq("id", galleryId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
    const invite = owner?.changed
      ? await sendAccessInvite({ email: owner.client.email || body.ownerEmail, name: owner.client.name, gallery: { ...owner.gallery, title: patch.title || owner.gallery.title } })
      : null;
    return NextResponse.json({ ok: true, invite });
  }

  // Roster for the uploader's client picker — every client ever added.
  if (body.action === "clients") {
    const { data, error } = await db
      .from("clients")
      .select("id, email, name")
      .order("name", { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ clients: data || [] });
  }

  if (body.action === "sign") {
    const { galleryId, files } = body;
    if (!galleryId || !Array.isArray(files) || files.length === 0 || files.length > 60)
      return NextResponse.json({ error: "Bad sign request" }, { status: 422 });
    if (
      !isUuid(galleryId) ||
      files.some(
        (f) => !["orig", "web", "thumb"].includes(f?.size) || !String(f?.filename || "").trim()
      )
    )
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

  // Filenames already in an album — the uploader uses these so files added
  // later never reuse (and overwrite) a name that's already there.
  if (body.action === "media-names") {
    const { galleryId } = body;
    if (!isUuid(galleryId)) return NextResponse.json({ error: "Bad request" }, { status: 422 });
    const { data, error } = await db.from("media").select("filename").eq("gallery_id", galleryId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ filenames: (data || []).map((m) => m.filename) });
  }

  // Finalize is safe to call twice and safe on an album that already has
  // media: rows already there (same filename) are skipped and new ones land
  // after the current last position. That covers a retried finalize, a
  // resumed upload, and "Add files" on an existing album.
  if (body.action === "finalize") {
    const { galleryId, media, coverFilename } = body;
    if (!isUuid(galleryId) || !Array.isArray(media))
      return NextResponse.json({ error: "Bad finalize request" }, { status: 422 });
    const { data: gallery } = await db.from("galleries").select("*").eq("id", galleryId).maybeSingle();
    if (!gallery) return NextResponse.json({ error: "Gallery not found" }, { status: 404 });

    const readExisting = () =>
      db.from("media").select("filename, position").eq("gallery_id", galleryId);
    const insertPlan = async (existing) => {
      const plan = planFinalize(galleryId, existing, media);
      if (plan.rows.length === 0) return { plan, error: null };
      let { error } = await db.from("media").insert(plan.rows);
      // media.section doesn't exist until supabase/sections.sql has run —
      // land the album flat rather than failing the whole upload.
      if (error && plan.hasSections && /section/i.test(error.message)) {
        ({ error } = await db
          .from("media")
          .insert(plan.rows.map(({ section, ...row }) => row)));
      }
      return { plan, error };
    };

    const first = await readExisting();
    if (first.error) return NextResponse.json({ error: first.error.message }, { status: 500 });
    const hadMedia = (first.data || []).length > 0;
    let { plan, error } = await insertPlan(first.data);
    // Two finalizes racing (a retry while the first was still landing): once
    // supabase/studio-2.sql has added the unique index the second insert is
    // rejected — re-read and insert only what's genuinely missing.
    if (error && (error.code === "23505" || /duplicate key/i.test(error.message))) {
      const again = await readExisting();
      ({ plan, error } = await insertPlan(again.data));
    }
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const { count } = await db
      .from("media")
      .select("id", { count: "exact", head: true })
      .eq("gallery_id", galleryId);
    const patch = {
      media_count: typeof count === "number" ? count : (first.data || []).length + plan.rows.length,
    };
    // Never replace a cover that's already set (a retry, or files added later).
    if (!gallery.cover_filename && coverFilename)
      patch.cover_filename = String(coverFilename).replace(/[^\w.\- ]/g, "_");
    await db.from("galleries").update(patch).eq("id", galleryId);

    // Photo dimensions → R2 sidecar, merged so resumed uploads accumulate.
    // Best-effort: a dims failure must never fail the finalize.
    try {
      const withDims = media.filter((m) => m.width > 0 && m.height > 0);
      if (withDims.length) {
        const dims = await getDims(galleryId);
        for (const m of withDims)
          dims[String(m.filename)] = [
            Math.round(m.width),
            Math.round(m.height),
          ];
        await putDims(galleryId, dims);
      }
    } catch {}
    return NextResponse.json({
      ok: true,
      added: plan.rows.length,
      count: patch.media_count,
      // An older "download everything" zip doesn't know about files added later.
      zipStale: Boolean(gallery.zip_key && hadMedia && plan.rows.length > 0),
    });
  }

  // Take one or more files out of an album: their rows, and their own
  // orig/web/thumb objects — nothing outside this gallery's prefix.
  if (body.action === "remove-media") {
    const { galleryId } = body;
    const filenames = Array.isArray(body.filenames) ? body.filenames.map(String) : [];
    if (!isUuid(galleryId) || filenames.length === 0 || filenames.length > 500)
      return NextResponse.json({ error: "Bad request" }, { status: 422 });
    if (normConfirm(body.confirm) !== "remove")
      return NextResponse.json({ error: "Type “remove” to confirm" }, { status: 422 });
    const { data: gallery } = await db.from("galleries").select("*").eq("id", galleryId).maybeSingle();
    if (!gallery) return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
    const { data: rows, error: rowsError } = await db
      .from("media")
      .select("id, filename, kind, position")
      .eq("gallery_id", galleryId)
      .order("position", { ascending: true });
    if (rowsError) return NextResponse.json({ error: rowsError.message }, { status: 500 });

    let plan;
    try {
      plan = planRemoval(galleryId, rows, filenames, gallery.cover_filename);
    } catch {
      return NextResponse.json({ error: "Bad request" }, { status: 422 });
    }
    if (plan.removed.length === 0)
      return NextResponse.json({ error: "Those files aren't in this gallery" }, { status: 404 });

    const keys = [...plan.keys];
    // The "download everything" zip still holds the removed files — it goes too.
    const zipCleared = Boolean(gallery.zip_key && keyInGallery(galleryId, gallery.zip_key));
    if (zipCleared) keys.push(gallery.zip_key);
    try {
      await deleteGalleryKeys(galleryId, keys);
    } catch (err) {
      return NextResponse.json({ error: err.message || "Storage delete failed" }, { status: 502 });
    }

    // Rows go by id, scoped to this gallery, in small batches (ids ride in the URL).
    const ids = plan.removed.map((r) => r.id);
    for (let i = 0; i < ids.length; i += 100) {
      const { error: delError } = await db
        .from("media")
        .delete()
        .eq("gallery_id", galleryId)
        .in("id", ids.slice(i, i + 100));
      if (delError) return NextResponse.json({ error: delError.message }, { status: 500 });
    }
    // Count what's really left rather than trusting arithmetic.
    const { count: left } = await db
      .from("media")
      .select("id", { count: "exact", head: true })
      .eq("gallery_id", galleryId);
    if (typeof left === "number") plan.remaining = left;

    const patch = { media_count: plan.remaining };
    if (plan.coverGone) patch.cover_filename = plan.nextCover;
    if (zipCleared) patch.zip_key = null;
    await db.from("galleries").update(patch).eq("id", galleryId);

    try {
      const dims = await getDims(galleryId);
      let touched = false;
      for (const f of plan.removedFilenames)
        if (f in dims) {
          delete dims[f];
          touched = true;
        }
      if (touched) await putDims(galleryId, dims);
    } catch {}

    return NextResponse.json({
      ok: true,
      removed: plan.removed.length,
      remaining: plan.remaining,
      cover: patch.cover_filename !== undefined ? patch.cover_filename : gallery.cover_filename,
      zipCleared,
    });
  }

  // Delete a whole album: every object under galleries/<this id>/ in R2, then
  // its rows. The typed title is checked here too, not just in the browser.
  if (body.action === "delete-gallery") {
    const { galleryId } = body;
    if (!isUuid(galleryId)) return NextResponse.json({ error: "Bad request" }, { status: 422 });
    const { data: gallery } = await db
      .from("galleries")
      .select("id, title")
      .eq("id", galleryId)
      .maybeSingle();
    if (!gallery) return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
    if (!normConfirm(gallery.title) || normConfirm(body.confirmTitle) !== normConfirm(gallery.title))
      return NextResponse.json(
        { error: "Type the gallery's title exactly to delete it" },
        { status: 422 }
      );

    let files = 0;
    try {
      const keys = await listGalleryKeys(gallery.id);
      files = await deleteGalleryKeys(gallery.id, keys);
    } catch (err) {
      // Storage first, rows second: if storage fails the album is still
      // listed, so the delete can simply be tried again.
      return NextResponse.json(
        { error: `${err.message || "Storage delete failed"} — the gallery is still here, try again.` },
        { status: 502 }
      );
    }

    // Guest Reel events keep their uploads; they just stop pointing at a dead album.
    try { await db.from("guest_events").update({ gallery_id: null }).eq("gallery_id", gallery.id); } catch {}
    try { await db.from("gallery_members").delete().eq("gallery_id", gallery.id); } catch {}
    const { error: mediaError } = await db.from("media").delete().eq("gallery_id", gallery.id);
    if (mediaError) return NextResponse.json({ error: mediaError.message }, { status: 500 });
    const { error } = await db.from("galleries").delete().eq("id", gallery.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, files });
  }


  // Remove a gallery that never received any media (an upload that failed
  // outright), so a dead run doesn't leave a ghost card in the dashboard.
  if (body.action === "discard") {
    const { galleryId } = body;
    if (!galleryId) return NextResponse.json({ error: "Bad request" }, { status: 422 });
    const { count } = await db
      .from("media")
      .select("id", { count: "exact", head: true })
      .eq("gallery_id", galleryId);
    if (count && count > 0)
      return NextResponse.json({ ok: false, reason: "gallery has media" });
    // Guest Reel events keep their uploads; they just stop pointing at a dead album.
    try { await db.from("guest_events").update({ gallery_id: null }).eq("gallery_id", galleryId); } catch {}
    try { await db.from("gallery_members").delete().eq("gallery_id", galleryId); } catch {}
    const { error } = await db.from("galleries").delete().eq("id", galleryId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "list-media") {
    const { galleryId } = body;
    if (!galleryId) return NextResponse.json({ error: "Bad request" }, { status: 422 });
    const jpgName = (f) => f.replace(/\.[^.]+$/, "") + ".jpg";
    const [{ data: gallery }, { data: media }] = await Promise.all([
      db.from("galleries").select("id, cover_filename").eq("id", galleryId).maybeSingle(),
      db.from("media").select("filename, kind, position, section").eq("gallery_id", galleryId)
        .order("position", { ascending: true }),
    ]);
    if (!gallery) return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
    const items = await Promise.all(
      (media || []).map(async (m) => ({
        filename: m.filename,
        kind: m.kind,
        album: m.section || null,
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

  // ── Albums ("sections" on media): name, rename, reorder ──
  // An album is just media.section; order is media.position (the client
  // gallery groups by first appearance). "" / null = no album.
  const albumName = (v) => {
    const s = String(v ?? "").trim().replace(/\s+/g, " ").slice(0, 80);
    return s || null;
  };

  // Put these files in an album (or in none).
  if (body.action === "album-assign") {
    const { galleryId } = body;
    const filenames = Array.isArray(body.filenames) ? body.filenames.map(String).slice(0, 1000) : [];
    if (!isUuid(galleryId) || filenames.length === 0)
      return NextResponse.json({ error: "Bad request" }, { status: 422 });
    const album = albumName(body.album);
    const { error, count } = await db
      .from("media")
      .update({ section: album }, { count: "exact" })
      .eq("gallery_id", galleryId)
      .in("filename", filenames);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, album, moved: count ?? filenames.length });
  }

  // Rename an album (from "" = name the files that have none).
  if (body.action === "album-rename") {
    const { galleryId } = body;
    if (!isUuid(galleryId)) return NextResponse.json({ error: "Bad request" }, { status: 422 });
    const from = albumName(body.from);
    const to = albumName(body.to);
    if (from === to) return NextResponse.json({ ok: true, album: to, renamed: 0 });
    let q = db.from("media").update({ section: to }, { count: "exact" }).eq("gallery_id", galleryId);
    q = from === null ? q.is("section", null) : q.eq("section", from);
    const { error, count } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, album: to, renamed: count ?? 0 });
  }

  // Reorder albums: order = album names first to last ("" for no album).
  // Files keep their order inside each album; positions are renumbered.
  if (body.action === "album-order") {
    const { galleryId } = body;
    const order = Array.isArray(body.order) ? body.order.map((v) => albumName(v) || "") : [];
    if (!isUuid(galleryId) || order.length === 0 || order.length > 200)
      return NextResponse.json({ error: "Bad request" }, { status: 422 });
    const { data: rows, error: readError } = await db
      .from("media")
      .select("id, position, section")
      .eq("gallery_id", galleryId)
      .order("position", { ascending: true });
    if (readError) return NextResponse.json({ error: readError.message }, { status: 500 });
    const rank = (r) => {
      const i = order.indexOf(r.section || "");
      return i === -1 ? order.length : i; // albums not named in the order go last, in place
    };
    const sorted = (rows || []).map((r, i) => ({ ...r, i })).sort((a, b) => rank(a) - rank(b) || a.i - b.i);
    const changes = sorted.map((r, position) => ({ id: r.id, position })).filter((u, i) => sorted[i].position !== u.position);
    for (let i = 0; i < changes.length; i += 50) {
      const results = await Promise.all(
        changes.slice(i, i + 50).map((u) => db.from("media").update({ position: u.position }).eq("id", u.id))
      );
      const failed = results.find((r) => r.error);
      if (failed) return NextResponse.json({ error: failed.error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, moved: changes.length });
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

  // ── Big films, in parts ─────────────────────────────────────────────
  // The browser calls mp-start, then mp-sign for per-part PUT URLs (100 at a
  // time), uploads the parts straight to R2, then mp-complete; mp-abort if it
  // gives up. Every key is checked against this gallery's own prefix, like
  // everything else here, so a bad id can never write outside the album.
  const mpBad = (msg = "Bad request", status = 422) => NextResponse.json({ error: msg }, { status });

  if (body.action === "mp-start") {
    const { galleryId } = body;
    const filename = String(body.filename || "").trim();
    if (!isUuid(galleryId) || !filename || filename.includes("/")) return mpBad();
    const safe = filename.replace(/[^\w.\- ]/g, "_");
    const key = photoKey(galleryId, "orig", safe);
    if (!keyInGallery(galleryId, key)) return mpBad();
    try {
      const out = await r2().send(
        new CreateMultipartUploadCommand({ Bucket: R2_BUCKET, Key: key, ContentType: String(body.contentType || "video/mp4") })
      );
      return NextResponse.json({ uploadId: out.UploadId, key, filename: safe });
    } catch (err) {
      return mpBad(err.message || "Storage refused the upload", 502);
    }
  }

  if (body.action === "mp-sign") {
    const { galleryId, key, uploadId } = body;
    const parts = (Array.isArray(body.parts) ? body.parts : [])
      .map(Number)
      .filter((n) => Number.isInteger(n) && n >= 1 && n <= 10000);
    if (!isUuid(galleryId) || !keyInGallery(galleryId, key) || !uploadId || !parts.length || parts.length > 100) return mpBad();
    const urls = await Promise.all(
      parts.map(async (part) => ({
        part,
        url: await getSignedUrl(
          r2(),
          new UploadPartCommand({ Bucket: R2_BUCKET, Key: key, UploadId: String(uploadId), PartNumber: part }),
          { expiresIn: 3600 }
        ),
      }))
    );
    return NextResponse.json({ urls });
  }

  if (body.action === "mp-complete") {
    const { galleryId, key, uploadId } = body;
    if (!isUuid(galleryId) || !keyInGallery(galleryId, key) || !uploadId) return mpBad();
    let parts = (Array.isArray(body.parts) ? body.parts : [])
      .map((p) => ({ PartNumber: Number(p?.PartNumber), ETag: String(p?.ETag || "").replace(/"/g, "") }))
      .filter((p) => Number.isInteger(p.PartNumber) && p.PartNumber >= 1);
    try {
      // If the browser couldn't read the ETags back (CORS), ask R2 what landed.
      if (!parts.length || parts.some((p) => !p.ETag)) {
        parts = [];
        let marker;
        do {
          const res = await r2().send(
            new ListPartsCommand({ Bucket: R2_BUCKET, Key: key, UploadId: String(uploadId), PartNumberMarker: marker })
          );
          for (const p of res.Parts || []) parts.push({ PartNumber: p.PartNumber, ETag: String(p.ETag || "").replace(/"/g, "") });
          marker = res.IsTruncated ? res.NextPartNumberMarker : undefined;
        } while (marker);
      }
      parts.sort((a, b) => a.PartNumber - b.PartNumber);
      if (!parts.length) return mpBad("No parts arrived — try the upload again");
      await r2().send(
        new CompleteMultipartUploadCommand({
          Bucket: R2_BUCKET,
          Key: key,
          UploadId: String(uploadId),
          MultipartUpload: { Parts: parts.map((p) => ({ PartNumber: p.PartNumber, ETag: `"${p.ETag}"` })) },
        })
      );
      return NextResponse.json({ ok: true, filename: key.split("/").pop(), parts: parts.length });
    } catch (err) {
      return mpBad(err.message || "Storage couldn't finish the upload", 502);
    }
  }

  if (body.action === "mp-abort") {
    const { galleryId, key, uploadId } = body;
    if (!isUuid(galleryId) || !keyInGallery(galleryId, key) || !uploadId) return mpBad();
    try {
      await r2().send(new AbortMultipartUploadCommand({ Bucket: R2_BUCKET, Key: key, UploadId: String(uploadId) }));
    } catch {}
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
