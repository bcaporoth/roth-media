#!/usr/bin/env node
/**
 * Upload an album folder (photos + videos) to R2 and register it in Supabase.
 *
 * Usage:
 *   node scripts/upload-gallery.mjs \
 *     --dir "/path/to/album" \
 *     --client "client@email.com" \
 *     --title "Brooke and Gage Wedding Album" \
 *     [--date 2026-05-30]
 *
 * Reads from .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 * R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET.
 *
 * Per photo:  orig/ (untouched), web/ (max 2200px, q82), thumb/ (max 900px, q78)
 * Per video:  orig/ (untouched), thumb/<name>.jpg poster (needs ffmpeg; skipped if absent)
 * Plus album.zip of all originals, streamed to R2.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { PassThrough } from "node:stream";
import { createClient } from "@supabase/supabase-js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import archiver from "archiver";
import sharp from "sharp";

// --- env ---------------------------------------------------------------
const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
  }
}
const need = (k) => {
  if (!process.env[k]) {
    console.error(`Missing ${k} (set it in .env.local)`);
    process.exit(1);
  }
  return process.env[k];
};

const SUPABASE_URL = need("NEXT_PUBLIC_SUPABASE_URL");
const SERVICE_KEY = need("SUPABASE_SERVICE_ROLE_KEY");
const R2_ACCOUNT_ID = need("R2_ACCOUNT_ID");
const R2_ACCESS_KEY_ID = need("R2_ACCESS_KEY_ID");
const R2_SECRET_ACCESS_KEY = need("R2_SECRET_ACCESS_KEY");
const BUCKET = process.env.R2_BUCKET || "roth-media-galleries";

// --- args --------------------------------------------------------------
const args = {};
for (let i = 2; i < process.argv.length; i += 2) {
  args[process.argv[i].replace(/^--/, "")] = process.argv[i + 1];
}
if (!args.dir || !args.client || !args.title) {
  console.error(
    'Usage: node scripts/upload-gallery.mjs --dir "/path/to/album" --client email --title "Title" [--date YYYY-MM-DD]'
  );
  process.exit(1);
}

const PHOTO_EXT = /\.(jpe?g|png|webp|heic|tiff?)$/i;
const VIDEO_EXT = /\.(mp4|mov|m4v|webm)$/i;

const files = fs
  .readdirSync(args.dir)
  .filter((f) => PHOTO_EXT.test(f) || VIDEO_EXT.test(f))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

if (files.length === 0) {
  console.error(`No photos or videos found in ${args.dir}`);
  process.exit(1);
}

const hasFfmpeg = (() => {
  try {
    return spawnSync("ffmpeg", ["-version"], { stdio: "ignore" }).status === 0;
  } catch {
    return false;
  }
})();

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});
const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

async function put(key, body, contentType) {
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
}

async function putStream(key, stream, contentType) {
  const upload = new Upload({
    client: s3,
    params: { Bucket: BUCKET, Key: key, Body: stream, ContentType: contentType },
    queueSize: 4,
    partSize: 50 * 1024 * 1024,
  });
  await upload.done();
}

// --- main --------------------------------------------------------------
console.log(`Album: ${args.title}`);
console.log(`Files: ${files.length} (${files.filter((f) => VIDEO_EXT.test(f)).length} videos)`);
if (!hasFfmpeg && files.some((f) => VIDEO_EXT.test(f))) {
  console.log("Note: ffmpeg not found — video posters will be skipped.");
}

// 1. client row (find or create)
const email = args.client.toLowerCase();
let { data: client } = await supabase
  .from("clients")
  .select("id, name")
  .eq("email", email)
  .maybeSingle();
if (!client) {
  const name = email.split("@")[0].replace(/[._]/g, " ");
  ({ data: client } = await supabase
    .from("clients")
    .insert({ email, name })
    .select("id, name")
    .single());
  console.log(`Created client: ${email}`);
}

// 2. gallery row
const { data: gallery, error: gErr } = await supabase
  .from("galleries")
  .insert({
    client_id: client.id,
    title: args.title,
    event_date: args.date || null,
  })
  .select("id")
  .single();
if (gErr) {
  console.error("Failed to create gallery:", gErr.message);
  process.exit(1);
}
const gid = gallery.id;
console.log(`Gallery: ${gid}`);

// 3. upload media
let coverFilename = null;
const rows = [];
for (let i = 0; i < files.length; i++) {
  const filename = files[i];
  const full = path.join(args.dir, filename);
  const isVideo = VIDEO_EXT.test(filename);
  const label = `[${i + 1}/${files.length}] ${filename}`;

  if (isVideo) {
    const type = filename.match(/\.(mov)$/i) ? "video/quicktime" : "video/mp4";
    await putStream(`galleries/${gid}/orig/${filename}`, fs.createReadStream(full), type);
    if (hasFfmpeg) {
      const posterName = filename.replace(/\.[^.]+$/, "") + ".jpg";
      const tmp = path.join("/tmp", `poster-${Date.now()}.jpg`);
      try {
        execFileSync("ffmpeg", ["-y", "-i", full, "-ss", "1", "-frames:v", "1", "-vf", "scale=900:-2", tmp], { stdio: "ignore" });
        await put(`galleries/${gid}/thumb/${posterName}`, fs.readFileSync(tmp), "image/jpeg");
        fs.unlinkSync(tmp);
      } catch {
        console.log(`  (poster failed for ${filename})`);
      }
    }
    rows.push({ gallery_id: gid, filename, kind: "video", position: i });
    console.log(`${label} ✓ video`);
  } else {
    const buf = fs.readFileSync(full);
    const img = sharp(buf, { failOn: "none" }).rotate();
    const [web, thumb] = await Promise.all([
      img.clone().resize(2200, 2200, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer(),
      img.clone().resize(900, 900, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 78 }).toBuffer(),
    ]);
    const jpgName = filename.replace(/\.[^.]+$/, "") + ".jpg";
    await Promise.all([
      put(`galleries/${gid}/orig/${filename}`, buf, "image/jpeg"),
      put(`galleries/${gid}/web/${jpgName}`, web, "image/jpeg"),
      put(`galleries/${gid}/thumb/${jpgName}`, thumb, "image/jpeg"),
    ]);
    if (!coverFilename) coverFilename = jpgName;
    rows.push({ gallery_id: gid, filename, kind: "photo", position: i });
    console.log(`${label} ✓`);
  }
}

// NOTE: for photos the web/thumb keys use a .jpg name; the gallery page
// derives them the same way. Originals keep their exact filename.

// 4. album zip (originals, streamed — never held in memory)
console.log("Building album.zip …");
const zipKey = `galleries/${gid}/album.zip`;
const archive = archiver("zip", { zlib: { level: 0 } });
const pass = new PassThrough();
archive.pipe(pass);
const zipUpload = putStream(zipKey, pass, "application/zip");
for (const filename of files) {
  archive.file(path.join(args.dir, filename), { name: filename });
}
await archive.finalize();
await zipUpload;
console.log("album.zip ✓");

// 5. register media + finalize gallery
const { error: mErr } = await supabase.from("media").insert(rows);
if (mErr) {
  console.error("Failed to insert media rows:", mErr.message);
  process.exit(1);
}
await supabase
  .from("galleries")
  .update({
    cover_filename: coverFilename,
    zip_key: zipKey,
    media_count: rows.length,
  })
  .eq("id", gid);

console.log(`\nDone. ${rows.length} items live at:`);
console.log(`  https://rothmediaco.com/portal/gallery/${gid}`);
console.log(`Client signs in as ${email} at rothmediaco.com/portal`);
