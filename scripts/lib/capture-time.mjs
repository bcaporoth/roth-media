// Best-effort "when was this taken" for album sorting.
// Photos: EXIF DateTimeOriginal (falls back to CreateDate / ModifyDate).
// Anything without EXIF (videos, screenshots): file modified time.
import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
let sharp, exifReader;
try {
  sharp = require("sharp");
  exifReader = require("exif-reader");
} catch {
  /* photo EXIF unavailable — mtime fallback still works */
}

const PHOTO_EXT = /\.(jpe?g|png|webp|heic|tiff?)$/i;

export async function captureTime(fullPath) {
  const mtime = fs.statSync(fullPath).mtimeMs;
  if (!sharp || !exifReader || !PHOTO_EXT.test(fullPath)) return mtime;
  try {
    const meta = await sharp(fullPath, { failOn: "none" }).metadata();
    if (!meta.exif) return mtime;
    const exif = exifReader(meta.exif);
    const d =
      exif?.Photo?.DateTimeOriginal ||
      exif?.Photo?.DateTimeDigitized ||
      exif?.Image?.DateTime;
    if (d instanceof Date && !Number.isNaN(d.getTime())) return d.getTime();
    return mtime;
  } catch {
    return mtime;
  }
}
