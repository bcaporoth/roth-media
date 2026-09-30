import { NextResponse } from "next/server";
import { S3Client, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { adminConfigured, supabaseAdmin } from "../../../../lib/supabase-admin";
import { R2_BUCKET, r2Configured } from "../../../../lib/r2";
import { RETENTION_DAYS } from "../../../../lib/guest";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Weekly (vercel.json): purge guest uploads once the event is RETENTION_DAYS past
// its upload window — the 12-month promise in the terms, enforced. Client
// galleries are never touched here; that's a human call.
export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }
  if (!adminConfigured || !r2Configured) return NextResponse.json({ ok: false, reason: "not configured" });
  const dry = new URL(request.url).searchParams.get("dry") === "1";
  const db = supabaseAdmin();
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 86400000).toISOString();

  const { data: events, error } = await db
    .from("guest_events")
    .select("id, slug, title, upload_open_until")
    .lt("upload_open_until", cutoff);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!events?.length) return NextResponse.json({ ok: true, purged: [] });

  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
  });

  const purged = [];
  for (const ev of events) {
    const { data: rows } = await db.from("guest_uploads").select("key, web_key").eq("event_id", ev.id);
    const keys = (rows || []).flatMap((r) => [r.key, r.web_key]).filter(Boolean);
    if (!dry) {
      for (let i = 0; i < keys.length; i += 1000) {
        const chunk = keys.slice(i, i + 1000).map((Key) => ({ Key }));
        try { await s3.send(new DeleteObjectsCommand({ Bucket: R2_BUCKET, Delete: { Objects: chunk, Quiet: true } })); } catch {}
      }
      // Rows go (cascade); the event stays so the QR link says "closed" instead of 404.
      await db.from("guest_uploads").delete().eq("event_id", ev.id);
    }
    purged.push({ slug: ev.slug, title: ev.title, files: keys.length, closed: ev.upload_open_until });
  }
  return NextResponse.json({ ok: true, dry, cutoff, purged });
}
