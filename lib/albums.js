// Gallery → day albums → folders (2026-11-07).
//
// A client's gallery ("Kaci's gallery") holds one album per shoot day
// ("Oct 22 · Pop-up"), and each day can hold folders ("Photos", "Funny reels",
// "Business"). It's all stored in the one text column media.section, so no
// database change was needed:
//
//   null                         → top of the gallery (no day)
//   "Oct 22 · Pop-up"            → that day, no folder
//   "Oct 22 · Pop-up › Reels"    → that day, "Reels" folder
//
// Galleries made before this simply have days with no folders.

export const SEP = " › ";
export const NAME_MAX = 60; // per part
export const SECTION_MAX = 140; // whole stored value

// One clean name part: trimmed, single spaces, no separator character.
export function cleanPart(v) {
  return String(v ?? "")
    .replace(/›/g, "-")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, NAME_MAX)
    .trim();
}

export function splitAlbum(section) {
  const s = String(section ?? "").trim();
  if (!s) return { day: null, folder: null };
  const i = s.indexOf(SEP.trim());
  if (i === -1) return { day: s, folder: null };
  const day = s.slice(0, i).trim() || null;
  const folder = s.slice(i + 1).trim() || null;
  return { day, folder: day ? folder : null };
}

// A folder needs a day; without one, files sit at the top of the gallery.
export function joinAlbum(day, folder) {
  const d = cleanPart(day);
  const f = cleanPart(folder);
  if (!d) return null;
  return f ? `${d}${SEP}${f}` : d;
}

// Links straight to one day, or one folder in a day (2026-11-09).
//   ?album=thanksgiving-day-promo-shoot          → that day
//   ?album=thanksgiving-day-promo-shoot--photos  → that day, "Photos" folder
// A query (not a #hash) so the server sees it too: the link preview in a
// text shows that album's photo. Old #day-… links still open.
// Works on both the share link (/g/…) and the portal (/portal/gallery/…).
// slug() never makes "--", so the two halves can't get mixed up.
export const albumSlug = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "more";
export const albumParam = (day, folder) => `${albumSlug(day)}${folder ? `--${albumSlug(folder)}` : ""}`;
export const albumHash = (day, folder) => `#day-${albumParam(day, folder)}`;
export const albumLink = (shareToken, day, folder) => `https://rothmediaco.com/g/${shareToken}?album=${albumParam(day, folder)}`;
export function readAlbumParam(v) {
  const m = /^([a-z0-9-]*?)(?:--([a-z0-9-]+))?$/.exec(String(v || ""));
  return m && m[1] ? { day: m[1], folder: m[2] || null } : null;
}
export function readAlbumHash(hash) {
  const h = String(hash || "");
  return h.startsWith("#day-") ? readAlbumParam(h.slice(5)) : null;
}
// What the address bar points at right now (?album= first, then #day-…).
export function readAlbumUrl(loc) {
  return readAlbumParam(new URLSearchParams(loc.search).get("album")) || readAlbumHash(loc.hash);
}
// Which day/folder a stored section ("Day › Folder") belongs to, for a link.
export function sectionMatches(section, want) {
  if (!want) return true;
  const { day, folder } = splitAlbum(section);
  if (albumSlug(day) !== want.day) return false;
  return !want.folder || (folder && albumSlug(folder) === want.folder);
}
