import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
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

// Photo dimensions live in a small JSON sidecar per gallery
// (filename → [width, height]) so the masonry can deal photos into the
// shortest column. Sidecar instead of DB columns: no schema migration,
// and the media table stays as Phase 2 shipped it.
export function dimsKey(galleryId) {
  return `galleries/${galleryId}/dims.json`;
}

export async function getDims(galleryId) {
  try {
    const res = await r2().send(
      new GetObjectCommand({ Bucket: R2_BUCKET, Key: dimsKey(galleryId) })
    );
    return JSON.parse(await res.Body.transformToString());
  } catch {
    return {}; // no sidecar yet — layout falls back to average ratios
  }
}

export async function putDims(galleryId, dims) {
  await r2().send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: dimsKey(galleryId),
      Body: JSON.stringify(dims),
      ContentType: "application/json",
    })
  );
}

// Viewing links live 7 days (the presigned-URL maximum). Clients leave a
// gallery tab open for hours; with a short expiry, photos below the fold
// (lazy-loaded on scroll) would request their images after the link died
// and render as broken icons until a refresh.
export async function signedUrl(
  key,
  { download = null, expiresIn = 7 * 24 * 3600 } = {}
) {
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

// ── Playbook reference photos ─────────────────────────────────────────
// A small picture pinned to one pose / shot / flow step. Stored once at
// playbook/<uuid>.webp; the list item keeps only the key (`img`) and the
// API signs a viewing URL (`img_url`) whenever it sends items down. Keys are
// never deleted: duplicated lists and shoots share the same picture.
export const PLAYBOOK_IMG_RE = /^playbook\/[0-9a-f-]{36}\.webp$/;

export async function putPlaybookPhoto(buffer) {
  const key = `playbook/${crypto.randomUUID()}.webp`;
  await r2().send(new PutObjectCommand({ Bucket: R2_BUCKET, Key: key, Body: buffer, ContentType: "image/webp", CacheControl: "private, max-age=31536000" }));
  return key;
}

// Attach a signed `img_url` to every item that carries an `img` key.
export async function signItemPhotos(items) {
  return Promise.all((items || []).map(async (it) => (it?.img && PLAYBOOK_IMG_RE.test(it.img) ? { ...it, img_url: await signedUrl(it.img).catch(() => "") } : it)));
}

// ── Brand palette files ───────────────────────────────────────────────
// Logos, mood board, reference pictures and brand guides live under
// brands/<client_id>/<asset id>-<filename>. The browser PUTs straight to
// R2 with a presigned URL (same bucket CORS as gallery uploads).
export const brandPrefix = (clientId) => `brands/${clientId}/`;

export async function presignPut(key, contentType, expiresIn = 15 * 60) {
  return getSignedUrl(r2(), new PutObjectCommand({ Bucket: R2_BUCKET, Key: key, ContentType: contentType }), { expiresIn });
}

// Deletes one brand file — refuses anything outside that client's folder.
export async function deleteBrandKey(clientId, key) {
  if (!/^[0-9a-f-]{36}$/.test(String(clientId)) || !String(key).startsWith(brandPrefix(clientId)) || key.includes("..")) throw new Error("Refusing to delete a file outside this brand");
  await r2().send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }));
}
