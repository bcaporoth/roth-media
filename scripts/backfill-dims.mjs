#!/usr/bin/env node
/**
 * Backfill the dims.json sidecar (filename → [width, height]) for every
 * hosted gallery, by reading each thumbnail's dimensions from R2.
 * The masonry layout deals photos into the shortest column using these
 * ratios; galleries without a sidecar fall back to average ratios.
 *
 * Thumbnails are shrunk copies, so their aspect ratio matches the
 * original — the ratio is all the layout needs.
 *
 * Usage: node scripts/backfill-dims.mjs [--gallery <id>] [--force]
 * Reads from .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 * R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET.
 */
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";

const env = Object.fromEntries(
  fs
    .readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()])
);

const BUCKET = env.R2_BUCKET || "roth-media-galleries";
const args = process.argv.slice(2);
const onlyGallery = args.includes("--gallery") ? args[args.indexOf("--gallery") + 1] : null;
const force = args.includes("--force");

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
});

const jpgName = (f) => f.replace(/\.[^.]+$/, "") + ".jpg";

async function getJson(key) {
  try {
    const res = await r2.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
    return JSON.parse(await res.Body.transformToString());
  } catch {
    return null;
  }
}

async function thumbSize(galleryId, filename) {
  const key = `galleries/${galleryId}/thumb/${jpgName(filename)}`;
  const res = await r2.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  const buf = Buffer.from(await res.Body.transformToByteArray());
  const meta = await sharp(buf, { failOn: "none" }).metadata();
  if (!meta.width || !meta.height) throw new Error("no dimensions");
  return [meta.width, meta.height];
}

let query = sb.from("galleries").select("id, title");
if (onlyGallery) query = query.eq("id", onlyGallery);
const { data: galleries, error } = await query;
if (error) throw error;

for (const g of galleries) {
  const dimsKey = `galleries/${g.id}/dims.json`;
  const existing = (await getJson(dimsKey)) || {};
  const { data: media } = await sb
    .from("media")
    .select("filename, kind")
    .eq("gallery_id", g.id);
  const photos = (media || []).filter((m) => m.kind === "photo");
  const todo = force ? photos : photos.filter((m) => !existing[m.filename]);
  process.stdout.write(`${g.title}: ${photos.length} photos, ${todo.length} to fill… `);
  if (!todo.length) {
    console.log("up to date");
    continue;
  }
  let ok = 0;
  let failed = 0;
  const CONCURRENCY = 12;
  let cursor = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (cursor < todo.length) {
        const m = todo[cursor++];
        try {
          existing[m.filename] = await thumbSize(g.id, m.filename);
          ok++;
        } catch {
          failed++;
        }
      }
    })
  );
  await r2.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: dimsKey,
      Body: JSON.stringify(existing),
      ContentType: "application/json",
    })
  );
  console.log(`wrote ${ok}${failed ? `, ${failed} failed` : ""}`);
}
console.log("Done.");
