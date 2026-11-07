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
