// Server-side rules for the admin gallery actions (finalize / remove / delete).
// Pure functions, no I/O — app/api/admin/gallery/route.js does the talking to
// Supabase and R2; these decide WHAT may be inserted or deleted.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (v) => typeof v === "string" && UUID_RE.test(v);

const jpgName = (f) => String(f).replace(/\.[^.]+$/, "") + ".jpg";

// The one R2 prefix a gallery owns. Throws unless the id is a real uuid, so a
// blank or odd id can never turn into "galleries/" (the whole bucket).
export function galleryPrefix(galleryId) {
  if (!isUuid(galleryId)) throw new Error("Bad gallery id");
  const prefix = `galleries/${galleryId}/`;
  if (!prefix || !prefix.endsWith(`${galleryId}/`)) throw new Error("Bad gallery prefix");
  return prefix;
}

// True only for a key strictly inside that gallery's own prefix.
export function keyInGallery(galleryId, key) {
  const prefix = galleryPrefix(galleryId);
  return (
    typeof key === "string" &&
    key.length > prefix.length &&
    key.startsWith(prefix) &&
    !key.includes("..")
  );
}

// Typed confirmations are compared loosely on purpose: phones swap in curly
// quotes and capital letters, and that shouldn't block a deliberate delete.
export function normConfirm(s) {
  return String(s || "")
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

// Which media rows a finalize should insert. Idempotent: anything already in
// the album (same filename) is skipped, so a retried finalize adds nothing,
// and new rows always land after the current last position.
export function planFinalize(galleryId, existing, media) {
  const have = new Set((existing || []).map((r) => r.filename));
  const start = (existing || []).reduce((n, r) => Math.max(n, (r.position ?? -1) + 1), 0);
  const fresh = [];
  for (const m of media || []) {
    const filename = String(m?.filename || "");
    if (!filename || filename.includes("/") || have.has(filename)) continue;
    have.add(filename);
    fresh.push({ ...m, filename });
  }
  const rows = fresh.map((m, i) => ({
    gallery_id: galleryId,
    filename: m.filename,
    kind: m.kind === "video" ? "video" : "photo",
    position: start + i,
    ...(m.section ? { section: String(m.section).slice(0, 80) } : {}),
  }));
  return {
    rows,
    hasSections: rows.some((r) => r.section),
    skipped: (media || []).length - rows.length,
  };
}

// What removing some files from an album deletes. `rows` is every media row of
// the gallery; `filenames` the ones to remove. The web/thumb .jpg is only
// deleted when no remaining item shares it (old albums could hold IMG_1.jpg
// and IMG_1.png pointing at the same web copy).
export function planRemoval(galleryId, rows, filenames, coverFilename) {
  const want = new Set((filenames || []).map(String));
  const prefix = galleryPrefix(galleryId);
  const isBad = (f) => !f || f.includes("/") || f.includes("..");
  const targets = (rows || []).filter((r) => want.has(r.filename));
  const removed = targets.filter((r) => !isBad(r.filename));
  const blocked = targets.filter((r) => isBad(r.filename)).map((r) => r.filename);
  const gone = new Set(removed.map((r) => r.filename));
  const keep = (rows || []).filter((r) => !gone.has(r.filename));
  const keptJpgs = new Set(keep.map((r) => jpgName(r.filename)));
  const keys = new Set();
  const goneJpgs = new Set();
  for (const t of removed) {
    keys.add(`${prefix}orig/${t.filename}`);
    const jpg = jpgName(t.filename);
    if (!keptJpgs.has(jpg)) {
      keys.add(`${prefix}web/${jpg}`);
      keys.add(`${prefix}thumb/${jpg}`);
      goneJpgs.add(jpg);
    }
  }
  const coverGone = Boolean(coverFilename && goneJpgs.has(coverFilename));
  const nextPhoto = keep.find((r) => r.kind === "photo");
  return {
    removed,
    blocked,
    keys: [...keys].filter((k) => keyInGallery(galleryId, k)),
    remaining: keep.length,
    removedFilenames: [...gone],
    coverGone,
    nextCover: coverGone ? (nextPhoto ? jpgName(nextPhoto.filename) : null) : coverFilename || null,
  };
}
