#!/usr/bin/env node
/**
 * Copy the site's marketing videos (public/*.mp4) into a PUBLIC Cloudflare
 * R2 bucket, so Vercel stops paying to hand them out. Vercel bills every
 * byte of egress; R2 egress is free.
 *
 * IMPORTANT: this must be a SEPARATE bucket from the galleries bucket.
 * The galleries bucket holds private client photos and must stay private.
 *
 * Setup (one time, in the Cloudflare dashboard):
 *   1. R2 → Create bucket, e.g. "roth-media-site"
 *   2. That bucket → Settings → Public access → allow (r2.dev) or attach
 *      a custom domain such as media.rothmediaco.com
 *   3. Put the resulting base URL in .env.local AND in Vercel:
 *        NEXT_PUBLIC_MEDIA_BASE=https://<your-public-r2-url>
 *      and the bucket name here:
 *        R2_PUBLIC_BUCKET=roth-media-site
 *
 * Then:  node scripts/upload-site-videos.mjs
 *
 * Needs an R2 API token with write access to that bucket. Re-running is
 * safe — it overwrites the same keys.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { VIDEOS } from "../lib/media.js";

const root = path.dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
const env = Object.fromEntries(
  fs
    .readFileSync(path.join(root, ".env.local"), "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()])
);

const BUCKET = env.R2_PUBLIC_BUCKET;
if (!BUCKET) {
  console.error(
    "R2_PUBLIC_BUCKET is not set in .env.local.\n" +
      "Create a PUBLIC bucket in Cloudflare R2 first (never reuse the galleries\n" +
      "bucket — it holds private client photos), then set:\n" +
      "  R2_PUBLIC_BUCKET=roth-media-site\n" +
      "  NEXT_PUBLIC_MEDIA_BASE=https://<public-r2-url>"
  );
  process.exit(1);
}
if (BUCKET === env.R2_BUCKET) {
  console.error(
    `Refusing to run: R2_PUBLIC_BUCKET is the same as R2_BUCKET ("${BUCKET}").\n` +
      "That bucket holds private client galleries and must never be public."
  );
  process.exit(1);
}

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
});

let sent = 0;
for (const rel of VIDEOS) {
  const file = path.join(root, "public", rel.replace(/^\//, ""));
  if (!fs.existsSync(file)) {
    console.log(`skip   ${rel} (not in public/)`);
    continue;
  }
  const body = fs.readFileSync(file);
  const key = rel.replace(/^\//, "");
  await r2.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: "video/mp4",
      // Marketing videos rarely change; let browsers and the CDN hold them.
      CacheControl: "public, max-age=31536000, immutable",
    })
  );
  sent += body.length;
  console.log(`upload ${rel}  ${(body.length / 1048576).toFixed(1)} MB`);
}

console.log(`\nDone — ${(sent / 1048576).toFixed(1)} MB now served from R2.`);
console.log(
  "Set NEXT_PUBLIC_MEDIA_BASE in Vercel (Settings → Environment Variables)\n" +
    "and redeploy. Verify a video loads, then the copies in public/ can go."
);
