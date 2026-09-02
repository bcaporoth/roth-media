#!/usr/bin/env node
/**
 * One-time R2 bucket CORS setup so the gallery page can fetch() media
 * bytes (needed for the iOS/Android "Save to Photos" share sheet).
 * Safe to re-run; it overwrites the bucket's CORS rules with this set.
 *
 *   node scripts/setup-r2-cors.mjs
 */
import fs from "node:fs";
import path from "node:path";
import {
  S3Client,
  PutBucketCorsCommand,
  GetBucketCorsCommand,
} from "@aws-sdk/client-s3";

const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
  }
}

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});
const Bucket = process.env.R2_BUCKET || "roth-media-galleries";

await s3.send(
  new PutBucketCorsCommand({
    Bucket,
    CORSConfiguration: {
      CORSRules: [
        {
          AllowedOrigins: [
            "https://rothmediaco.com",
            "https://www.rothmediaco.com",
            "http://localhost:3000",
          ],
          AllowedMethods: ["GET", "HEAD"],
          AllowedHeaders: ["*"],
          MaxAgeSeconds: 86400,
        },
      ],
    },
  })
);
const { CORSRules } = await s3.send(new GetBucketCorsCommand({ Bucket }));
console.log(`CORS set on ${Bucket}:`);
console.log(JSON.stringify(CORSRules, null, 2));
