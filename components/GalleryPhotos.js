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
import { splitAlbum, joinAlbum, cleanPart, albumHash } from "../lib/albums";

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
const NEW = "__new";
const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
const keyOf = (day, folder) => joinAlbum(day, folder) || TOP;

export default function GalleryPhotos({ gallery, onChanged, onAddTo }) {
  const [items, setItems] = useState(null);
  const [picked, setPicked] = useState(() => new Set());
  const [renaming, setRenaming] = useState(null); // { kind: "day"|"folder"|"top", day, folder }
  const [renameTo, setRenameTo] = useState("");
  const [destDay, setDestDay] = useState(TOP); // move bar: day <select> value
  const [destFolder, setDestFolder] = useState(TOP); // move bar: folder <select> value
  const [newDay, setNewDay] = useState("");
  const [newFolder, setNewFolder] = useState("");
  const [removing, setRemoving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [broken, setBroken] = useState(() => new Set());
  const [quick, setQuick] = useState(null); // filename awaiting its one-tap Delete / Keep answer

  // "Copy link": the share link that opens straight on this day or folder.
  const [copied, setCopied] = useState(""); // which album's link was just copied
  const linkFor = (day, folder) => `https://rothmediaco.com/g/${gallery.share_token}${albumHash(day, folder)}`;
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
  const namedDays = days.filter((d) => d.day !== TOP);
  const folderCount = namedDays.reduce((n, d) => n + d.folders.filter((f) => f.folder !== TOP).length, 0);
  const n = picked.size;
  const pickedFiles = items.filter((it) => picked.has(it.filename));
  const from = new Set(pickedFiles.map((it) => it.album || TOP));
  const onlyIn = from.size === 1 ? [...from][0] : null;

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
    setDestDay(TOP);
    setDestFolder(TOP);
    setNewDay("");
    setNewFolder("");
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
    run({ action: "album-order", order: flatOrder(list) }, () => "Days reordered ✓");
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
      run({ action: "album-rename", from: TOP, to }, (j) => `${plural(j.renamed, "photo")} now in the day “${to}” ✓`);
    } else if (r.kind === "day") {
      run({ action: "day-rename", from: r.day, to }, () => `Day renamed to “${to}” ✓`);
    } else if (r.folder === TOP) {
      run({ action: "album-rename", from: r.day, to: joinAlbum(r.day, to) }, (j) => `${plural(j.renamed, "photo")} now in “${to}” ✓`);
    } else {
      run({ action: "album-rename", from: keyOf(r.day, r.folder), to: joinAlbum(r.day, to) }, () => `Folder renamed to “${to}” ✓`);
    }
  }
  const isRenaming = (r) =>
    renaming && renaming.kind === r.kind && renaming.day === r.day && renaming.folder === r.folder;

  // ── move ──
  const chosenDay = destDay === NEW ? cleanPart(newDay) : destDay;
  const dayFolders = days.find((d) => d.day === chosenDay)?.folders.filter((f) => f.folder !== TOP) || [];
  const chosenFolder = destFolder === NEW ? cleanPart(newFolder) : destFolder;
  const target = chosenDay ? keyOf(chosenDay, chosenFolder) : TOP;
  const targetLabel = chosenDay ? (chosenFolder ? `${chosenDay} › ${chosenFolder}` : chosenDay) : "the top of the gallery";
  const canMove = n > 0 && !busy && (destDay !== NEW || chosenDay) && (destFolder !== NEW || chosenFolder) && target !== onlyIn;
  function move() {
    if (!canMove) return;
    const files = [...picked];
    const label = targetLabel;
    clear();
    run({ action: "album-assign", filenames: files, album: target || null }, (j) => `${plural(j.moved, "photo")} moved to ${label === "the top of the gallery" ? label : `“${label}”`} ✓`);
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
        This is how the client sees “{gallery.title}”: {plural(items.length, "file")} in{" "}
        {namedDays.length === 0 ? "no day albums yet" : plural(namedDays.length, "day")}
        {folderCount ? `, ${plural(folderCount, "folder")}` : ""}. <strong>Tap photos to select them</strong>, then move them to a day and folder, or remove them.
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
                  renameForm(isTop ? "Day name, e.g. Oct 22 · Pop-up" : "New day name")
                ) : (
                  <>
                    <h4 className="gph-title">
                      {!isTop && <span className="gph-kind">Day</span>}
                      <button type="button" className="gph-title-btn" title={isTop ? "Turn these into a day album" : "Click to rename this day"} disabled={busy} onClick={() => startRename(dayR, isTop ? "" : D.day)}>
                        {isTop ? "Top of gallery" : D.day}
                      </button>{" "}
                      <em>{plural(D.count, "file")}</em>
                      {isTop && <small>no day — shows first</small>}
                    </h4>
                    <span className="gph-actions">
                      <button type="button" className="achip" disabled={busy} onClick={() => selectFiles(dayFiles)}>
                        {dayAllOn ? "Unselect all" : "Select all"}
                      </button>
                      <button type="button" className="achip" disabled={busy} onClick={() => onAddTo?.(isTop ? TOP : D.day)}>
                        + Add photos
                      </button>
                      {!isTop && gallery.share_token && (
                        <button type="button" className={"achip" + (copied === `d:${D.day}` ? " is-on" : "")} onClick={() => copyLink(`d:${D.day}`, D.day, null)} title="Copies a link that opens right on this day">
                          {copied === `d:${D.day}` ? "Copied ✓" : "🔗 Copy link"}
                        </button>
                      )}
                      <button type="button" className="achip" disabled={busy} onClick={() => startRename(dayR, isTop ? "" : D.day)}>
                        {isTop ? "Make this a day…" : "Rename"}
                      </button>
                      {days.length > 1 && (
                        <>
                          <button type="button" className="achip" disabled={busy || di === 0} onClick={() => moveDay(di, -1)} aria-label="Move day up">↑</button>
                          <button type="button" className="achip" disabled={busy || di === days.length - 1} onClick={() => moveDay(di, 1)} aria-label="Move day down">↓</button>
                        </>
                      )}
                    </span>
                  </>
                )}
              </header>

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
                              <button type="button" className="achip" disabled={busy} onClick={() => selectFiles(F.files)}>
                                {fAllOn ? "Unselect" : "Select"}
                              </button>
                              {!loose && (
                                <button type="button" className="achip" disabled={busy} onClick={() => onAddTo?.(keyOf(D.day, F.folder))}>
                                  + Add
                                </button>
                              )}
                              {!loose && !isTop && gallery.share_token && (
                                <button type="button" className={"achip" + (copied === `f:${D.day}›${F.folder}` ? " is-on" : "")} onClick={() => copyLink(`f:${D.day}›${F.folder}`, D.day, F.folder)} title="Copies a link that opens right on this folder">
                                  {copied === `f:${D.day}›${F.folder}` ? "Copied ✓" : "🔗 Link"}
                                </button>
                              )}
                              <button type="button" className="achip" disabled={busy} onClick={() => startRename(fR, loose ? "" : F.folder)}>
                                {loose ? "Make a folder…" : "Rename"}
                              </button>
                              {D.folders.length > 1 && (
                                <>
                                  <button type="button" className="achip" disabled={busy || fi === 0} onClick={() => moveFolder(di, fi, -1)} aria-label="Move folder up">↑</button>
                                  <button type="button" className="achip" disabled={busy || fi === D.folders.length - 1} onClick={() => moveFolder(di, fi, 1)} aria-label="Move folder down">↓</button>
                                </>
                              )}
                            </span>
                          </>
                        )}
                      </header>
                    )}
                    {grid(F.files)}
                  </div>
                );
              })}
            </section>
          );
        })}

        <div className={"gph-bar" + (n > 0 ? " is-on" : "")} role="region" aria-label="Selected photos">
          {n === 0 ? (
            <span className="cover-picker-hint">Nothing selected — tap photos above.</span>
          ) : removing ? (
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
              <form className="gph-moveto gph-moveform" onSubmit={(e) => { e.preventDefault(); move(); }}>
                <span className="gph-label">Move to</span>
                <select
                  aria-label="Day"
                  value={destDay}
                  disabled={busy}
                  onChange={(e) => { setDestDay(e.target.value); setDestFolder(TOP); setNewFolder(""); }}
                >
                  <option value={TOP}>Top of gallery (no day)</option>
                  {namedDays.map((D) => <option key={D.day} value={D.day}>{D.day}</option>)}
                  <option value={NEW}>+ New day…</option>
                </select>
                {destDay === NEW && (
                  <input value={newDay} maxLength={60} placeholder="Day name, e.g. Oct 22 · Pop-up" onChange={(e) => setNewDay(e.target.value)} aria-label="New day name" disabled={busy} />
                )}
                {(destDay !== TOP) && (
                  <select aria-label="Folder" value={destFolder} disabled={busy} onChange={(e) => setDestFolder(e.target.value)}>
                    <option value={TOP}>No folder</option>
                    {dayFolders.map((F) => <option key={F.folder} value={F.folder}>{F.folder}</option>)}
                    <option value={NEW}>+ New folder…</option>
                  </select>
                )}
                {destDay !== TOP && destFolder === NEW && (
                  <input value={newFolder} maxLength={60} placeholder="Folder name, e.g. Funny reels" onChange={(e) => setNewFolder(e.target.value)} aria-label="New folder name" disabled={busy} />
                )}
                <button type="submit" className="achip gph-dest gph-go" disabled={!canMove} title={target === onlyIn ? "They're already there" : `Move to ${targetLabel}`}>
                  Move
                </button>
              </form>
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
        </div>
      </div>
      {msg && <p className="cover-picker-hint gfiles-msg" role="status">{msg}</p>}
    </div>
  );
}
