"use client";

// Studio → Galleries → a gallery → Photos: every file, shown the way the
// client sees it. A gallery is the client's ("Kaci's gallery"); inside it,
// one DAY album per shoot day ("Oct 22 · Pop-up"); inside a day, FOLDERS
// ("Photos", "Funny reels", "Business"). Files with no day sit at the top.
//
// Tap photos to select them; the bar at the bottom moves them to any day +
// folder (or a new one), or removes them. Days and folders each have their
// own rename, ↑/↓ and "+ Add photos" (opens the uploader pointed there).
//
// Storage: media.section = "Day" or "Day › Folder" (lib/albums.js); the
// server's album-assign / album-rename / day-rename / album-order /
// remove-media actions do the work.

import { useEffect, useState } from "react";
import TypedConfirm from "./TypedConfirm";
import { splitAlbum, joinAlbum, cleanPart, albumLink } from "../lib/albums";

async function api(payload) {
  const res = await fetch("/api/admin/gallery", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
  return json;
}

const TOP = ""; // no day — shows at the top of the gallery, no heading
const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
const keyOf = (day, folder) => joinAlbum(day, folder) || TOP;

export default function GalleryPhotos({ gallery, onChanged, onAddTo }) {
  const [items, setItems] = useState(null);
  const [dayCovers, setDayCovers] = useState({}); // { "Day name": filename } picked covers
  const [picked, setPicked] = useState(() => new Set());
  const [renaming, setRenaming] = useState(null); // { kind: "day"|"folder"|"top", day, folder }
  const [renameTo, setRenameTo] = useState("");
  // "Where do they go?" (2026-11-24, Brandon: "so simple a caveman could do it"):
  // big buttons, no dropdowns. Tap an album → tap a folder (or "Straight in").
  const [whereDay, setWhereDay] = useState(null); // album picked in step 1, or null
  const [naming, setNaming] = useState(""); // "" | "album" | "folder": the name box is open
  const [newName, setNewName] = useState("");
  const [removing, setRemoving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [broken, setBroken] = useState(() => new Set());
  const [quick, setQuick] = useState(null); // filename awaiting its one-tap Delete / Keep answer
  // Which album/folder has its extra tools open ("⋯": link, rename, move up/down).
  // Only Select and + Add photos show by default (2026-11-24, simpler page).
  const [tools, setTools] = useState("");
  // Empty folders made with "+ New folder" (saved in galleries.design.folders).
  const [savedFolders, setSavedFolders] = useState({});
  const [addingFolder, setAddingFolder] = useState(null); // album name whose "+ New folder" box is open
  const [folderName, setFolderName] = useState("");
  const toolsBtn = (k, what) => (
    <button type="button" className={"achip gph-more" + (tools === k ? " is-on" : "")} aria-expanded={tools === k} aria-label={`More for ${what}`} title="Copy link, rename, move up or down" onClick={() => setTools((t) => (t === k ? "" : k))}>
      {tools === k ? "Done" : "⋯"}
    </button>
  );

  // "Copy link": the share link that opens straight on this day or folder.
  const [copied, setCopied] = useState(""); // which album's link was just copied
  const linkFor = (day, folder) => albumLink(gallery.share_token, day, folder);
  async function copyLink(key, day, folder) {
    const url = linkFor(day, folder);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(key);
      setMsg(`Link copied. Paste it in a text or email: ${url}`);
      setTimeout(() => setCopied((c) => (c === key ? "" : c)), 2500);
    } catch {
      setMsg(`Copy this link: ${url}`);
    }
  }

  async function load() {
    try {
      const j = await api({ action: "list-media", galleryId: gallery.id });
      setItems(j.items || []);
      setDayCovers(j.dayCovers || {});
      setSavedFolders(j.folders || {});
    } catch (e) {
      setMsg(e.message);
      setItems([]);
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gallery.id]);

  async function run(payload, done) {
    setBusy(true);
    setMsg("");
    try {
      const j = await api({ ...payload, galleryId: gallery.id });
      await load();
      setMsg(done(j));
      onChanged?.();
    } catch (e) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (items === null) return <p className="cover-picker-hint">Loading photos…</p>;
  if (items.length === 0)
    return (
      <div className="gph">
        <p className="cover-picker-hint">{msg || "No photos in this gallery yet."}</p>
        <div className="gfiles-bar">
          <button type="button" className="achip" onClick={() => onAddTo?.(TOP)}>+ Add photos</button>
        </div>
      </div>
    );

  // Days in the order the client sees them (first appearance), each with its folders.
  const days = [];
  for (const it of items) {
    const { day, folder } = splitAlbum(it.album);
    const d = day || TOP;
    let D = days.find((x) => x.day === d);
    if (!D) days.push((D = { day: d, folders: [], count: 0 }));
    const f = folder || TOP;
    let F = D.folders.find((x) => x.folder === f);
    if (!F) D.folders.push((F = { folder: f, files: [] }));
    F.files.push(it);
    D.count += 1;
  }
  // Folders made with "+ New folder" that have no photos yet: shown (empty)
  // after the album's other folders, so they can be filled.
  for (const D of days) {
    if (D.day === TOP) continue;
    for (const f of savedFolders[D.day] || []) {
      if (!D.folders.some((F) => F.folder === f)) D.folders.push({ folder: f, files: [], empty: true });
    }
  }
  const namedDays = days.filter((d) => d.day !== TOP);
  const folderCount = namedDays.reduce((n, d) => n + d.folders.filter((f) => f.folder !== TOP).length, 0);
  const n = picked.size;
  const pickedFiles = items.filter((it) => picked.has(it.filename));
  const from = new Set(pickedFiles.map((it) => it.album || TOP));
  const onlyIn = from.size === 1 ? [...from][0] : null;
  // Each day's cover: the pick if it's still there, else the first photo (lib/albums.js dayCoverItem).
  const coverOf = (D) => {
    const files = D.folders.flatMap((f) => f.files);
    return (dayCovers[D.day] && files.find((f) => f.filename === dayCovers[D.day])) || files.find((f) => f.kind !== "video") || files[0] || null;
  };
  const coverSet = new Set(namedDays.map((D) => coverOf(D)?.filename).filter(Boolean));
  const one = n === 1 ? pickedFiles[0] : null;
  const oneDay = one ? splitAlbum(one.album).day : null;
  const oneIsCover = Boolean(one && coverSet.has(one.filename));
  const onePicked = Boolean(one && oneDay && dayCovers[oneDay] === one.filename);
  async function setCover(day, filename) {
    setBusy(true); setMsg("");
    try {
      const j = await api({ action: "set-day-cover", galleryId: gallery.id, day, filename });
      setDayCovers(j.dayCovers || {});
      setPicked(new Set());
      setMsg(filename ? `That's now the cover of “${day}”. Clients see it on the album tile and in text previews.` : `“${day}” uses its first photo as the cover again.`);
      onChanged?.();
    } catch (e) { setMsg(e.message); } finally { setBusy(false); }
  }

  // ── selection ──
  function toggle(filename) {
    setPicked((p) => {
      const next = new Set(p);
      if (next.has(filename)) next.delete(filename);
      else next.add(filename);
      return next;
    });
    setRemoving(false);
    setMsg("");
  }
  function selectFiles(files) {
    setPicked((p) => {
      const all = files.every((f) => p.has(f.filename));
      const next = new Set(p);
      for (const f of files) (all ? next.delete(f.filename) : next.add(f.filename));
      return next;
    });
    setRemoving(false);
  }
  function clear() {
    setPicked(new Set());
    setWhereDay(null);
    setNaming("");
    setNewName("");
    setRemoving(false);
  }

  // ── order: days first to last, folders inside each ──
  function flatOrder(list) {
    return list.flatMap((D) => D.folders.map((F) => keyOf(D.day, F.folder)));
  }
  function moveDay(i, dir) {
    const j = i + dir;
    if (j < 0 || j >= days.length) return;
    const list = [...days];
    [list[i], list[j]] = [list[j], list[i]];
    run({ action: "album-order", order: flatOrder(list) }, () => "Albums reordered ✓");
  }
  function moveFolder(di, fi, dir) {
    const fj = fi + dir;
    const D = days[di];
    if (fj < 0 || fj >= D.folders.length) return;
    const folders = [...D.folders];
    [folders[fi], folders[fj]] = [folders[fj], folders[fi]];
    const list = days.map((x, k) => (k === di ? { ...x, folders } : x));
    run({ action: "album-order", order: flatOrder(list) }, () => "Folders reordered ✓");
  }

  // ── rename ──
  function startRename(r, current) {
    setRenaming(r);
    setRenameTo(current);
  }
  function saveRename() {
    const to = cleanPart(renameTo);
    const r = renaming;
    if (!to || !r) return;
    setRenaming(null);
    if (r.kind === "top") {
      run({ action: "album-rename", from: TOP, to }, (j) => `${plural(j.renamed, "photo")} now in the album “${to}” ✓`);
    } else if (r.kind === "day") {
      run({ action: "day-rename", from: r.day, to }, () => `Album renamed to “${to}” ✓`);
    } else if (r.folder === TOP) {
      run({ action: "album-rename", from: r.day, to: joinAlbum(r.day, to) }, (j) => `${plural(j.renamed, "photo")} now in “${to}” ✓`);
    } else {
      const saved = (savedFolders[r.day] || []).includes(r.folder);
      const hasFiles = items.some((it) => it.album === keyOf(r.day, r.folder));
      if (saved) api({ action: "folder-rename-saved", galleryId: gallery.id, day: r.day, folder: r.folder, to }).then((j) => setSavedFolders(j.folders || {})).catch((e) => setMsg(e.message));
      if (hasFiles) run({ action: "album-rename", from: keyOf(r.day, r.folder), to: joinAlbum(r.day, to) }, () => `Folder renamed to “${to}” ✓`);
      else setMsg(`Folder renamed to “${to}” ✓`);
    }
  }
  const isRenaming = (r) =>
    renaming && renaming.kind === r.kind && renaming.day === r.day && renaming.folder === r.folder;

  // ── move: tap where they go ──
  const whereFolders = whereDay ? days.find((d) => d.day === whereDay)?.folders.filter((f) => f.folder !== TOP) || [] : [];
  function moveTo(day, folder) {
    const d = cleanPart(day);
    const f = cleanPart(folder);
    const target = d ? keyOf(d, f) : TOP;
    if (n === 0 || busy) return;
    if (target === onlyIn) { setMsg("They're already there."); return; }
    const label = d ? (f ? `${d} › ${f}` : d) : "";
    const files = [...picked];
    clear();
    run({ action: "album-assign", filenames: files, album: target || null }, (j) => (label ? `${plural(j.moved, "photo")} put in “${label}” ✓` : `${plural(j.moved, "photo")} taken out of the album ✓`));
  }
  async function makeFolder(day) {
    const name = cleanPart(folderName);
    if (!name || busy) return;
    setBusy(true); setMsg("");
    try {
      const j = await api({ action: "folder-add", galleryId: gallery.id, day, folder: name });
      setSavedFolders(j.folders || {});
      setAddingFolder(null);
      setFolderName("");
      setMsg(`Folder “${name}” is ready. Tap + Add photos on it, or tap photos and tap 🗂 ${name}.`);
    } catch (e) { setMsg(e.message); } finally { setBusy(false); }
  }
  async function dropFolder(day, folder) {
    setBusy(true); setMsg("");
    try {
      const j = await api({ action: "folder-remove", galleryId: gallery.id, day, folder });
      setSavedFolders(j.folders || {});
      setTools("");
      setMsg(`Empty folder “${folder}” deleted.`);
    } catch (e) { setMsg(e.message); } finally { setBusy(false); }
  }
  function saveName() {
    const name = cleanPart(newName);
    if (!name) return;
    if (naming === "album") moveTo(name, TOP);
    else moveTo(whereDay, name);
  }

  // Removes the given files (a tile's 🗑), or the selected ones (the bar's typed confirm).
  async function remove(list) {
    const files = Array.isArray(list) ? list : [...picked];
    if (files.length === 0) return;
    setBusy(true);
    setMsg("");
    try {
      const j = await api({ action: "remove-media", galleryId: gallery.id, filenames: files, confirm: "remove" });
      if (Array.isArray(list)) {
        setPicked((p) => {
          const next = new Set(p);
          for (const f of files) next.delete(f);
          return next;
        });
      } else {
        clear();
      }
      setQuick(null);
      await load();
      setMsg(
        `Removed ${plural(j.removed, "photo")} ✓ — ${j.remaining} left in the gallery.` +
          (j.zipCleared
            ? " The “download everything” zip still had them in it, so it was removed too; rebuild it with: node scripts/backfill-zips.mjs --gallery " + gallery.id
            : "")
      );
      onChanged?.();
    } catch (e) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  }

  const renameForm = (placeholder) => (
    <form className="galb-rename" onSubmit={(e) => { e.preventDefault(); saveRename(); }}>
      <input
        autoFocus
        value={renameTo}
        onFocus={(e) => e.target.select()}
        maxLength={60}
        placeholder={placeholder}
        onChange={(e) => setRenameTo(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Escape") setRenaming(null); }}
      />
      <button type="submit" className="achip" disabled={busy || !cleanPart(renameTo)}>Save</button>
      <button type="button" className="achip" onClick={() => setRenaming(null)}>Cancel</button>
    </form>
  );

  const grid = (files) => (
    <ul className="gfiles-grid gph-grid">
      {files.map((it) => {
        const on = picked.has(it.filename);
        const showImg = it.thumbUrl && !broken.has(it.filename);
        return (
          <li key={it.filename}>
            <button
              type="button"
              className={"gfiles-tile" + (on ? " is-on" : "")}
              aria-pressed={on}
              disabled={busy}
              onClick={() => toggle(it.filename)}
              title={it.filename}
            >
              <span className="gfiles-thumb">
                {showImg ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={it.thumbUrl} alt="" loading="lazy" onError={() => setBroken((b) => new Set(b).add(it.filename))} />
                ) : (
                  <span className="gfiles-blank" aria-hidden="true">{it.kind === "video" ? "▶" : "—"}</span>
                )}
                {it.kind === "video" && showImg && <span className="gfiles-badge" aria-hidden="true">▶</span>}
                {on && <span className="gfiles-tick" aria-hidden="true">✓</span>}
                {coverSet.has(it.filename) && <span className="gfiles-cover">★ Cover</span>}
              </span>
              <span className="gfiles-name">{it.filename}</span>
            </button>
            {quick === it.filename ? (
              <span className="gfiles-quick" role="group" aria-label={`Delete ${it.filename}?`}>
                <button type="button" className="achip achip-danger" disabled={busy} onClick={() => remove([it.filename])}>
                  {busy ? "…" : "Delete"}
                </button>
                <button type="button" className="achip" disabled={busy} onClick={() => setQuick(null)}>
                  Keep
                </button>
              </span>
            ) : (
              <button
                type="button"
                className="gfiles-trash"
                aria-label={`Delete ${it.filename}`}
                title="Delete this photo"
                disabled={busy}
                onClick={() => {
                  setQuick(it.filename);
                  setMsg("");
                }}
              >
                🗑
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );

  const allFilesOf = (D) => D.folders.flatMap((F) => F.files);

  return (
    <div className="gph">
      <p className="cover-picker-hint gph-hint">
        <strong>Tap photos, then tap where they go.</strong> To change the cover, tap one, then <strong>★ Make it the cover</strong>.
      </p>

      <div className="gph-scroll">
        {days.map((D, di) => {
          const dayFiles = allFilesOf(D);
          const dayAllOn = dayFiles.every((f) => picked.has(f.filename));
          const isTop = D.day === TOP;
          const dayR = isTop ? { kind: "top", day: TOP, folder: TOP } : { kind: "day", day: D.day, folder: TOP };
          return (
            <section key={D.day || "·"} className={"gph-album gph-day" + (isTop ? " is-top" : "")}>
              <header className="gph-head gph-dayhead">
                {isRenaming(dayR) ? (
                  renameForm(isTop ? "Album name, e.g. Ribbon Cutting" : "New album name")
                ) : (
                  <>
                    <h4 className="gph-title">
                      {!isTop && <span className="gph-kind">Album</span>}
                      <button type="button" className="gph-title-btn" title={isTop ? "Put these in an album" : "Click to rename this album"} disabled={busy} onClick={() => startRename(dayR, isTop ? "" : D.day)}>
                        {isTop ? "Not in an album" : D.day}
                      </button>{" "}
                      <em>{plural(D.count, "file")}</em>
                      {isTop && <small>clients see these as “More”</small>}
                    </h4>
                    <span className="gph-actions">
                      <button type="button" className="achip" disabled={busy} onClick={() => selectFiles(dayFiles)}>
                        {dayAllOn ? "Unselect all" : "Select all"}
                      </button>
                      <button type="button" className="achip" disabled={busy} onClick={() => onAddTo?.(isTop ? TOP : D.day)}>
                        + Add photos
                      </button>
                      {!isTop && (
                        <button type="button" className={"achip" + (addingFolder === D.day ? " is-on" : "")} disabled={busy} onClick={() => { setAddingFolder((a) => (a === D.day ? null : D.day)); setFolderName(""); }}>
                          + New folder
                        </button>
                      )}
                      {tools === `d:${D.day}` && (<>
                      {!isTop && gallery.share_token && (
                        <button type="button" className={"achip" + (copied === `d:${D.day}` ? " is-on" : "")} onClick={() => copyLink(`d:${D.day}`, D.day, null)} title="Copies a link that opens right on this album">
                          {copied === `d:${D.day}` ? "Copied ✓" : "🔗 Copy link"}
                        </button>
                      )}
                      <button type="button" className="achip" disabled={busy} onClick={() => startRename(dayR, isTop ? "" : D.day)}>
                        {isTop ? "Put in an album…" : "Rename"}
                      </button>
                      {days.length > 1 && (
                        <>
                          <button type="button" className="achip" disabled={busy || di === 0} onClick={() => moveDay(di, -1)} aria-label="Move album up">↑</button>
                          <button type="button" className="achip" disabled={busy || di === days.length - 1} onClick={() => moveDay(di, 1)} aria-label="Move album down">↓</button>
                        </>
                      )}
                      </>)}
                      {toolsBtn(`d:${D.day}`, isTop ? "photos not in an album" : D.day)}
                    </span>
                  </>
                )}
              </header>

              {addingFolder === D.day && (
                <form className="gph-newfolder" onSubmit={(e) => { e.preventDefault(); makeFolder(D.day); }}>
                  <input
                    autoFocus
                    value={folderName}
                    maxLength={60}
                    placeholder="Folder name, e.g. Reels"
                    onChange={(e) => setFolderName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Escape") setAddingFolder(null); }}
                    aria-label={`New folder in ${D.day}`}
                    disabled={busy}
                  />
                  <button type="submit" className="achip gph-choice is-go" disabled={busy || !cleanPart(folderName)}>Make folder</button>
                  <button type="button" className="achip" onClick={() => setAddingFolder(null)}>Cancel</button>
                </form>
              )}

              {D.folders.map((F, fi) => {
                const loose = F.folder === TOP;
                const showHead = !isTop && (!loose || D.folders.length > 1);
                const fR = { kind: "folder", day: D.day, folder: F.folder };
                const fAllOn = F.files.every((f) => picked.has(f.filename));
                return (
                  <div key={F.folder || "·"} className={"gph-folder" + (loose ? " is-loose" : "")}>
                    {showHead && (
                      <header className="gph-fhead">
                        {isRenaming(fR) ? (
                          renameForm(loose ? "Folder name for these" : "New folder name")
                        ) : (
                          <>
                            <h5 className="gph-ftitle">
                              <button type="button" className="gph-title-btn" disabled={busy} title={loose ? "Put these in a folder" : "Click to rename this folder"} onClick={() => startRename(fR, loose ? "" : F.folder)}>
                                {loose ? "Not in a folder" : F.folder}
                              </button>{" "}
                              <em>{plural(F.files.length, "file")}</em>
                            </h5>
                            <span className="gph-actions gph-factions">
                              {n > 0 && !loose && !pickedFiles.every((f) => f.album === keyOf(D.day, F.folder)) && (
                                <button type="button" className="achip gph-here" disabled={busy} onClick={() => moveTo(D.day, F.folder)}>
                                  Move {n} here
                                </button>
                              )}
                              {F.files.length > 0 && (
                                <button type="button" className="achip" disabled={busy} onClick={() => selectFiles(F.files)}>
                                  {fAllOn ? "Unselect" : "Select"}
                                </button>
                              )}
                              {!loose && (
                                <button type="button" className="achip" disabled={busy} onClick={() => onAddTo?.(keyOf(D.day, F.folder))}>
                                  + Add photos
                                </button>
                              )}
                              {tools === `f:${D.day}›${F.folder}` && (<>
                              {!loose && !isTop && gallery.share_token && (
                                <button type="button" className={"achip" + (copied === `f:${D.day}›${F.folder}` ? " is-on" : "")} onClick={() => copyLink(`f:${D.day}›${F.folder}`, D.day, F.folder)} title="Copies a link that opens right on this folder">
                                  {copied === `f:${D.day}›${F.folder}` ? "Copied ✓" : "🔗 Link"}
                                </button>
                              )}
                              <button type="button" className="achip" disabled={busy} onClick={() => startRename(fR, loose ? "" : F.folder)}>
                                {loose ? "Make a folder…" : "Rename"}
                              </button>
                              {F.empty && (
                                <button type="button" className="achip achip-danger" disabled={busy} onClick={() => dropFolder(D.day, F.folder)}>Delete empty folder</button>
                              )}
                              {D.folders.length > 1 && !F.empty && (
                                <>
                                  <button type="button" className="achip" disabled={busy || fi === 0} onClick={() => moveFolder(di, fi, -1)} aria-label="Move folder up">↑</button>
                                  <button type="button" className="achip" disabled={busy || fi === D.folders.length - 1} onClick={() => moveFolder(di, fi, 1)} aria-label="Move folder down">↓</button>
                                </>
                              )}
                              </>)}
                              {toolsBtn(`f:${D.day}›${F.folder}`, loose ? "photos not in a folder" : F.folder)}
                            </span>
                          </>
                        )}
                      </header>
                    )}
                    {F.files.length > 0 ? grid(F.files) : (
                      <p className="cover-picker-hint gph-emptyhint">
                        Empty. Tap <strong>+ Add photos</strong> to upload into it, or tap photos above and tap <strong>🗂 {F.folder}</strong>.
                      </p>
                    )}
                  </div>
                );
              })}
            </section>
          );
        })}

        {/* The bar only shows once something is picked (2026-11-24, simpler page). */}
        {n > 0 && <div className="gph-bar is-on" role="region" aria-label="Selected photos">
          {removing ? (
            <TypedConfirm
              phrase="remove"
              prompt={`Type “remove” to delete ${plural(n, "file")} from “${gallery.title}” for good — clients lose them too.`}
              cta={`Remove ${plural(n, "file")}`}
              busy={busy}
              onConfirm={remove}
              onCancel={() => setRemoving(false)}
            />
          ) : (
            <>
              <strong className="gph-count">{plural(n, "file")} selected</strong>
              {one && oneDay && one.kind !== "video" && (
                oneIsCover && !onePicked ? (
                  <span className="cover-picker-hint">This is already the cover of “{oneDay}” (its first photo).</span>
                ) : onePicked ? (
                  <button type="button" className="achip" disabled={busy} onClick={() => setCover(oneDay, null)}>Use the first photo as the cover again</button>
                ) : (
                  <button type="button" className="abtn gph-coverbtn" disabled={busy} onClick={() => setCover(oneDay, one.filename)}>★ Make it the cover of “{oneDay}”</button>
                )
              )}
              <div className="gph-where">
                {naming ? (
                  <form className="gph-name" onSubmit={(e) => { e.preventDefault(); saveName(); }}>
                    <p className="gph-q">{naming === "album" ? "Name the new album" : `Name the new folder in “${whereDay}”`}</p>
                    <input
                      autoFocus
                      value={newName}
                      maxLength={60}
                      placeholder={naming === "album" ? "e.g. Ribbon Cutting" : "e.g. Reels"}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Escape") { setNaming(""); setNewName(""); } }}
                      aria-label={naming === "album" ? "New album name" : "New folder name"}
                      disabled={busy}
                    />
                    <button type="submit" className="achip gph-choice is-go" disabled={busy || !cleanPart(newName)}>Put them in</button>
                    <button type="button" className="achip" onClick={() => { setNaming(""); setNewName(""); }}>Back</button>
                  </form>
                ) : whereDay ? (
                  <>
                    <p className="gph-q">Which folder in “{whereDay}”?</p>
                    <div className="gph-choices">
                      <button type="button" className="achip gph-choice is-go" disabled={busy} onClick={() => moveTo(whereDay, TOP)}>Straight into “{whereDay}”</button>
                      {whereFolders.map((F) => (
                        <button key={F.folder} type="button" className="achip gph-choice" disabled={busy} onClick={() => moveTo(whereDay, F.folder)}>🗂 {F.folder}</button>
                      ))}
                      <button type="button" className="achip gph-choice is-new" disabled={busy} onClick={() => { setNaming("folder"); setNewName(""); }}>+ New folder</button>
                      <button type="button" className="achip" onClick={() => setWhereDay(null)}>← Back</button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="gph-q">Where do they go?</p>
                    <div className="gph-choices">
                      {namedDays.map((D) => (
                        <button key={D.day} type="button" className="achip gph-choice" disabled={busy} onClick={() => setWhereDay(D.day)}>📁 {D.day}</button>
                      ))}
                      <button type="button" className="achip gph-choice is-new" disabled={busy} onClick={() => { setNaming("album"); setNewName(""); }}>+ New album</button>
                      {onlyIn !== TOP && (
                        <button type="button" className="achip" disabled={busy} onClick={() => moveTo(TOP, TOP)}>Take out of the album</button>
                      )}
                    </div>
                  </>
                )}
              </div>
              <span className="gph-else">
                <button type="button" className="achip achip-danger" disabled={busy} onClick={() => setRemoving(true)}>
                  Remove…
                </button>
                <button type="button" className="achip" disabled={busy} onClick={clear}>
                  Clear
                </button>
              </span>
            </>
          )}
        </div>}
      </div>
      {msg && <p className="cover-picker-hint gfiles-msg" role="status">{msg}</p>}
    </div>
  );
}
