// Naming rules for browser uploads (Studio → Galleries). Pure functions —
// used by components/AdminUploader.js and testable with plain node.
//
// A media row's `filename` is also its R2 key (galleries/<id>/orig/<filename>,
// and <stem>.jpg under web/ and thumb/), so two files that share a STEM in one
// album overwrite each other: two cameras' C0001.MP4 in different subfolders,
// or IMG_1.JPG next to IMG_1.MOV (the video's poster lands on the photo's
// thumb). allocateName() keeps the first file's name exactly as it was and
// gives later ones a short suffix, so nothing already uploaded is ever renamed
// and existing albums read exactly as before.

export const safeName = (name) => String(name).replace(/[^\w.\- ]/g, "_");

export const baseName = (relPath) => String(relPath).split("/").pop();

export const stemOf = (filename) => String(filename).replace(/\.[^.]+$/, "");

export const extOf = (filename) => {
  const m = String(filename).match(/\.[^.]+$/);
  return m ? m[0] : "";
};

export const jpgName = (filename) => stemOf(filename) + ".jpg";

// What two files must not share inside one album.
export const stemKey = (filename) => stemOf(filename).toLowerCase();

// "Album/02 Cam A/C0001.MP4" → "Cam-A" (only real subfolders count; the
// picked folder itself is the album, not a tag).
export function folderTag(relPath) {
  const parts = String(relPath).split("/");
  if (parts.length < 3) return "";
  return parts[parts.length - 2]
    .trim()
    .replace(/^\d+[\s._-]*/, "")
    .replace(/[^\w-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
}

// Pick the stored filename for one file. `taken` is a Set of stemKeys already
// used in this album (existing media + earlier files of this run); the chosen
// name's stem is added to it.
export function allocateName(relPath, taken) {
  const safe = safeName(baseName(relPath)) || "file";
  const stem = stemOf(safe);
  const ext = extOf(safe);
  const tag = folderTag(relPath);
  const tries = [safe];
  if (tag) tries.push(`${stem}-${tag}${ext}`);
  for (const name of tries) {
    if (!taken.has(stemKey(name))) {
      taken.add(stemKey(name));
      return name;
    }
  }
  const root = tag ? `${stem}-${tag}` : stem;
  for (let n = 2; ; n++) {
    const name = `${root}-${n}${ext}`;
    if (!taken.has(stemKey(name))) {
      taken.add(stemKey(name));
      return name;
    }
  }
}
