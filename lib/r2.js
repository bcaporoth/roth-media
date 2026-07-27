import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const ACCOUNT_ID = process.env.R2_ACCOUNT_ID || "";
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || "";
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || "";
export const R2_BUCKET = process.env.R2_BUCKET || "roth-media-galleries";

// Gallery hosting stays dormant (portal falls back to external links only)
// until the R2 env vars are set in Vercel / .env.local.
export const r2Configured = Boolean(
  ACCOUNT_ID && ACCESS_KEY_ID && SECRET_ACCESS_KEY
);

let client;
function r2() {
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: ACCESS_KEY_ID,
        secretAccessKey: SECRET_ACCESS_KEY,
      },
    });
  }
  return client;
}

export function photoKey(galleryId, size, filename) {
  return `galleries/${galleryId}/${size}/${filename}`;
}

export async function signedUrl(key, { download = null, expiresIn = 3600 } = {}) {
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    ...(download
      ? {
          ResponseContentDisposition: `attachment; filename="${download.replace(/"/g, "")}"`,
        }
      : {}),
  });
  return getSignedUrl(r2(), command, { expiresIn });
}
