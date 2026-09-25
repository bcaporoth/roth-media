// Guest Reel helpers shared by the public + admin APIs and pages.

export const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])?$/;
export const MAX_FILE_BYTES = 750 * 1024 * 1024; // matches phone-video reality
export const MAX_FILES_PER_SIGN = 20;
export const MESSAGE_SECONDS = 60;

export function slugify(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function safeName(filename) {
  return String(filename || "upload").replace(/[^\w.\- ]/g, "_").slice(0, 120);
}

export function guestKey(eventId, uploadId, size, filename) {
  return `guest/${eventId}/${size}/${uploadId}-${filename}`;
}

export function kindFor(contentType, isMessage) {
  if (isMessage) return "message";
  if (String(contentType).startsWith("video/")) return "video";
  return "photo";
}

export function isOpen(event) {
  return new Date(event.upload_open_until).getTime() > Date.now();
}
