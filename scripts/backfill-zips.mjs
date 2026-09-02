#!/usr/bin/env node
/**
 * Build album.zip for galleries that don't have one (browser-uploader
 * albums skip it). Streams each original from R2 through an archiver
 * straight back up — nothing is held on disk or in memory.
 *
 *   node scripts/backfill-zips.mjs            # all galleries missing a zip
 *   node scripts/backfill-zips.mjs --gallery <uuid>   # just one
 */
import fs from "node:fs";
import path from "node:path";
import { PassThrough } from "node:stream";
import { createClient } from "@supabase/supabase-js";
import {
  S3Client,
  GetObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const archiver = require("archiver");

const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
  }
}

const BUCKET = process.env.R2_BUCKET || "roth-media-galleries";
const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);
const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
  maxAttempts: 5,
});

const args = {};
for (let i = 2; i < process.argv.length; i += 2)
  args[process.argv[i].replace(/^--/, "")] = process.argv[i + 1];

let q = db.from("galleries").select("id, title, zip_key, media_count");
if (args.gallery) q = q.eq("id", args.gallery);
const { data: galleries, error } = await q.order("created_at");
if (error) {
  console.error(error.message);
  process.exit(1);
}

const todo = galleries.filter((g) => !g.zip_key);
console.log(`${todo.length} galleries need a zip.`);

for (const g of todo) {
  console.log(`\n${g.title} (${g.media_count} items)`);

  // Media rows are the source of truth for what belongs in the album —
  // stray orphan objects in orig/ stay out of the zip.
  const { data: media, error: mErr } = await db
    .from("media")
    .select("filename")
    .eq("gallery_id", g.id)
    .order("position")
    .limit(10000);
  if (mErr || !media?.length) {
    console.log(`  skipped: ${mErr ? mErr.message : "no media rows"}`);
    continue;
  }

  const zipKey = `galleries/${g.id}/album.zip`;
  const archive = archiver("zip", { zlib: { level: 0 } });
  const pass = new PassThrough();
  archive.pipe(pass);
  const upload = new Upload({
    client: s3,
    params: { Bucket: BUCKET, Key: zipKey, Body: pass, ContentType: "application/zip" },
    queueSize: 4,
    partSize: 50 * 1024 * 1024,
  });
  const uploadDone = upload.done();
  uploadDone.catch(() => {});

  let added = 0;
  for (const m of media) {
    const key = `galleries/${g.id}/orig/${m.filename}`;
    const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
    // archiver consumes one stream at a time; wait for this entry to be
    // fully appended before requesting the next object.
    await new Promise((resolve, reject) => {
      obj.Body.on("end", resolve).on("error", reject);
      archive.append(obj.Body, { name: m.filename });
    });
    added++;
    if (added % 25 === 0) console.log(`  ${added}/${media.length}`);
  }
  await archive.finalize();
  await uploadDone;

  const { error: uErr } = await db
    .from("galleries")
    .update({ zip_key: zipKey })
    .eq("id", g.id);
  if (uErr) {
    console.log(`  zip uploaded but zip_key update FAILED: ${uErr.message}`);
    continue;
  }
  console.log(`  ✓ album.zip built (${added} files) and registered`);
}
console.log("\nBackfill complete.");
