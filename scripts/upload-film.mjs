#!/usr/bin/env node
/**
 * Add ONE film to an EXISTING gallery — for finals too big for the browser
 * uploader (multi-GB ceremony edits). Reads the file straight from disk,
 * streams it to R2 in parts (resumable: re-run and it skips what landed),
 * grabs a poster frame, and registers the media row.
 *
 * Usage:
 *   node scripts/upload-film.mjs --gallery <gallery-id> --file "/path/film.mov" [--name "Ceremony and Dance.mov"] [--at 3]
 *
 * --name  what the file is stored/shown as (default: the file's own name, sanitized)
 * --at    seconds into the film for the poster frame (default 3)
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { createClient } from "@supabase/supabase-js";
import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";

const require = createRequire(import.meta.url);

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
const BUCKET = process.env.R2_BUCKET || "roth-media-galleries";

// --- args --------------------------------------------------------------
const args = {};
for (let i = 2; i < process.argv.length; i += 2) args[process.argv[i].replace(/^--/, "")] = process.argv[i + 1];
if (!args.gallery || !args.file) {
  console.error('Usage: node scripts/upload-film.mjs --gallery <id> --file "/path/film.mov" [--name "Name.mov"] [--at 3]');
  process.exit(1);
}
const file = args.file;
if (!fs.existsSync(file)) {
  console.error(`No such file: ${file}`);
  process.exit(1);
}
// Same sanitizer as the Studio API, so names match what the browser path makes.
const name = String(args.name || path.basename(file)).replace(/[^\w.\- ]/g, "_");
if (!/\.(mp4|mov|m4v|webm)$/i.test(name)) {
  console.error("Film name needs a video extension (.mp4/.mov/.m4v/.webm)");
  process.exit(1);
}
const jpgName = name.replace(/\.[^.]+$/, "") + ".jpg";
const size = fs.statSync(file).size;
const contentType = /\.mov$/i.test(name) ? "video/quicktime" : /\.webm$/i.test(name) ? "video/webm" : "video/mp4";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: need("R2_ACCESS_KEY_ID"), secretAccessKey: need("R2_SECRET_ACCESS_KEY") },
  maxAttempts: 6,
});
const key = (sz, f) => `galleries/${args.gallery}/${sz}/${f}`;

async function exists(k, wantSize = null) {
  try {
    const h = await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: k }));
    return wantSize == null || h.ContentLength === wantSize;
  } catch {
    return false;
  }
}

// --- 1. gallery -------------------------------------------------------
const { data: gallery, error: gErr } = await supabase
  .from("galleries")
  .select("id, title, media_count, cover_filename")
  .eq("id", args.gallery)
  .maybeSingle();
if (gErr || !gallery) {
  console.error("Gallery not found:", gErr?.message || args.gallery);
  process.exit(1);
}
console.log(`Gallery: ${gallery.title}`);
console.log(`Film:    ${name}  (${(size / 1e9).toFixed(2)} GB)`);

// --- 2. the film itself, in parts ------------------------------------
const origKey = key("orig", name);
if (await exists(origKey, size)) {
  console.log("Film already on R2 (same size) — skipping upload.");
} else {
  let sent = 0;
  const started = Date.now();
  for (let attempt = 1; ; attempt++) {
    try {
      const up = new Upload({
        client: s3,
        params: { Bucket: BUCKET, Key: origKey, Body: fs.createReadStream(file), ContentType: contentType },
        queueSize: 3,
        partSize: 64 * 1024 * 1024,
        leavePartsOnError: false,
      });
      up.on("httpUploadProgress", (p) => {
        if (p.loaded && p.loaded - sent >= 256 * 1024 * 1024) {
          sent = p.loaded;
          const pct = ((p.loaded / size) * 100).toFixed(0);
          const mbps = (p.loaded / 1e6 / ((Date.now() - started) / 1000)).toFixed(1);
          process.stdout.write(`  ${pct}%  ${(p.loaded / 1e9).toFixed(2)} GB  ${mbps} MB/s\n`);
        }
      });
      await up.done();
      break;
    } catch (err) {
      if (attempt >= 4) throw err;
      console.log(`  upload dropped (${err.code || err.message}) — retrying ${attempt}/3 …`);
      await new Promise((r) => setTimeout(r, attempt * 3000));
    }
  }
  console.log(`Film ✓  (${((Date.now() - started) / 60000).toFixed(1)} min)`);
}

// --- 3. poster frame --------------------------------------------------
let ffmpeg = null;
try {
  ffmpeg = require("ffmpeg-static");
} catch {}
if (!ffmpeg) {
  try {
    execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
    ffmpeg = "ffmpeg";
  } catch {}
}
let hasPoster = false;
if (ffmpeg) {
  const at = String(args.at || 3);
  const tmpWeb = path.join(process.cwd(), ".poster-web.jpg");
  const tmpThumb = path.join(process.cwd(), ".poster-thumb.jpg");
  try {
    execFileSync(ffmpeg, ["-y", "-ss", at, "-i", file, "-frames:v", "1", "-vf", "scale=1920:-2", "-q:v", "3", tmpWeb], { stdio: "ignore" });
    execFileSync(ffmpeg, ["-y", "-ss", at, "-i", file, "-frames:v", "1", "-vf", "scale=900:-2", "-q:v", "4", tmpThumb], { stdio: "ignore" });
    await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key("web", jpgName), Body: fs.readFileSync(tmpWeb), ContentType: "image/jpeg" }));
    await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key("thumb", jpgName), Body: fs.readFileSync(tmpThumb), ContentType: "image/jpeg" }));
    hasPoster = true;
    console.log("Poster ✓");
  } catch (err) {
    console.log("Poster skipped:", err.message);
  } finally {
    for (const t of [tmpWeb, tmpThumb]) if (fs.existsSync(t)) fs.unlinkSync(t);
  }
} else {
  console.log("Poster skipped: no ffmpeg (the gallery cover stands in).");
}

// --- 4. media row -----------------------------------------------------
const { data: existing } = await supabase.from("media").select("id, position").eq("gallery_id", gallery.id).eq("filename", name).maybeSingle();
if (existing) {
  console.log("Media row already there — leaving it.");
} else {
  const { data: last } = await supabase
    .from("media")
    .select("position")
    .eq("gallery_id", gallery.id)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const position = (last?.position ?? -1) + 1;
  const { error: mErr } = await supabase.from("media").insert({ gallery_id: gallery.id, filename: name, kind: "video", position });
  if (mErr) {
    console.error("Failed to add media row:", mErr.message);
    process.exit(1);
  }
  const { count } = await supabase.from("media").select("id", { count: "exact", head: true }).eq("gallery_id", gallery.id);
  await supabase.from("galleries").update({ media_count: count ?? (gallery.media_count || 0) + 1 }).eq("id", gallery.id);
  console.log(`Registered as #${position + 1} in the gallery ✓`);
}
console.log(`Done. ${hasPoster ? "Own poster frame." : "Shows the gallery cover until a poster exists."}`);
