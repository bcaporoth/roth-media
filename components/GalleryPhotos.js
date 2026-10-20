"use client";

// Studio → Galleries → Manage → "Photos & albums": every file in the gallery,
// shown the way the client sees it — grouped under its album heading, in
// order. Tap photos to select them; a bar at the bottom then offers every
// album as a button ("move these here"), a new album, the top of the
// gallery, or Remove. Each album heading has its own rename, up/down and
// "+ Add photos" (opens the uploader already pointed at that album).
//
// An album is just media.section; the server's album-assign / album-rename /
// album-order / remove-media actions do the work.

import { useEffect, useState } from "react";
import TypedConfirm from "./TypedConfirm";

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

const TOP = ""; // "no album" — shows at the top of the gallery, no heading
const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;

export default function GalleryPhotos({ gallery, onChanged, onAddTo }) {
  const [items, setItems] = useState(null);
  const [picked, setPicked] = useState(() => new Set());
  const [renaming, setRenaming] = useState(null); // album key being renamed
  const [renameTo, setRenameTo] = useState("");
  const [naming, setNaming] = useState(false); // "New album" input open in the move bar
  const [newName, setNewName] = useState("");
  const [removing, setRemoving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [broken, setBroken] = useState(() => new Set());

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

  // Albums in the order the client sees them (first appearance), each with its files.
  const groups = [];
  for (const it of items) {
    const key = it.album || TOP;
    let g = groups.find((x) => x.key === key);
    if (!g) groups.push((g = { key, files: [] }));
    g.files.push(it);
  }
  const named = groups.filter((g) => g.key !== TOP);
  const title = (key) => (key === TOP ? "Top of gallery" : key);
  const n = picked.size;
  // Where the selected photos are now — an album every one of them is already in is not a move target.
  const from = new Set(items.filter((it) => picked.has(it.filename)).map((it) => it.album || TOP));
  const onlyIn = from.size === 1 ? [...from][0] : null;

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
  function selectGroup(g) {
    setPicked((p) => {
      const all = g.files.every((f) => p.has(f.filename));
      const next = new Set(p);
      for (const f of g.files) (all ? next.delete(f.filename) : next.add(f.filename));
      return next;
    });
    setRemoving(false);
  }
  function clear() {
    setPicked(new Set());
    setNaming(false);
    setNewName("");
    setRemoving(false);
  }

  function reorder(key, dir) {
    const order = groups.map((g) => g.key);
    const i = order.indexOf(key);
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    [order[i], order[j]] = [order[j], order[i]];
    run({ action: "album-order", order }, () => "Albums reordered ✓");
  }
  function rename(key) {
    const to = renameTo.trim();
    if (!to) return;
    setRenaming(null);
    run({ action: "album-rename", from: key, to }, (j) =>
      key === TOP ? `${plural(j.renamed, "photo")} now in “${j.album}” ✓` : `Renamed to “${j.album}” ✓`
    );
  }
  function moveTo(album) {
    const files = [...picked];
    clear();
    run({ action: "album-assign", filenames: files, album }, (j) =>
      `${plural(j.moved, "photo")} moved to ${j.album ? `“${j.album}”` : "the top of the gallery"} ✓`
    );
  }
  function moveToNew() {
    const name = newName.trim().replace(/\s+/g, " ").slice(0, 80);
    if (!name) return;
    moveTo(name);
  }
  async function remove() {
    const files = [...picked];
    setBusy(true);
    setMsg("");
    try {
      const j = await api({ action: "remove-media", galleryId: gallery.id, filenames: files, confirm: "remove" });
      clear();
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

  return (
    <div className="gph">
      <p className="cover-picker-hint gph-hint">
        This is how the client sees “{gallery.title}”: {plural(items.length, "photo")} in{" "}
        {named.length === 0 ? "no albums yet" : plural(named.length, "album")}.{" "}
        <strong>Tap photos to select them</strong>, then move them to another album or remove them.
      </p>

      <div className="gph-scroll">
        {groups.map((g, i) => {
          const allOn = g.files.every((f) => picked.has(f.filename));
          return (
            <section key={g.key || "·"} className={"gph-album" + (g.key === TOP ? " is-top" : "")}>
              <header className="gph-head">
                {renaming === g.key ? (
                  <form className="galb-rename" onSubmit={(e) => { e.preventDefault(); rename(g.key); }}>
                    <input
                      autoFocus
                      value={renameTo}
                      onFocus={(e) => e.target.select()}
                      maxLength={80}
                      placeholder={g.key === TOP ? "Album name for these photos" : "New name"}
                      onChange={(e) => setRenameTo(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Escape") setRenaming(null); }}
                    />
                    <button type="submit" className="achip" disabled={busy || !renameTo.trim()}>Save</button>
                    <button type="button" className="achip" onClick={() => setRenaming(null)}>Cancel</button>
                  </form>
                ) : (
                  <>
                    <h4 className="gph-title">
                      {title(g.key)} <em>{plural(g.files.length, "photo")}</em>
                      {g.key === TOP && <small>no heading — shows first</small>}
                    </h4>
                    <span className="gph-actions">
                      <button type="button" className="achip" disabled={busy} onClick={() => selectGroup(g)}>
                        {allOn ? "Unselect all" : "Select all"}
                      </button>
                      <button type="button" className="achip" disabled={busy} onClick={() => onAddTo?.(g.key)}>
                        + Add photos
                      </button>
                      <button type="button" className="achip" disabled={busy} onClick={() => { setRenaming(g.key); setRenameTo(g.key === TOP ? "" : g.key); }}>
                        {g.key === TOP ? "Make this an album…" : "Rename"}
                      </button>
                      {groups.length > 1 && (
                        <>
                          <button type="button" className="achip" disabled={busy || i === 0} onClick={() => reorder(g.key, -1)} aria-label="Move album up">↑</button>
                          <button type="button" className="achip" disabled={busy || i === groups.length - 1} onClick={() => reorder(g.key, 1)} aria-label="Move album down">↓</button>
                        </>
                      )}
                    </span>
                  </>
                )}
              </header>
              <ul className="gfiles-grid gph-grid">
                {g.files.map((it) => {
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
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}

        <div className={"gph-bar" + (n > 0 ? " is-on" : "")} role="region" aria-label="Selected photos">
          {n === 0 ? (
            <span className="cover-picker-hint">Nothing selected — tap photos above.</span>
          ) : removing ? (
            <TypedConfirm
              phrase="remove"
              prompt={`Type “remove” to delete ${plural(n, "photo")} from “${gallery.title}” for good — clients lose them too.`}
              cta={`Remove ${plural(n, "photo")}`}
              busy={busy}
              onConfirm={remove}
              onCancel={() => setRemoving(false)}
            />
          ) : (
            <>
              <strong className="gph-count">{plural(n, "photo")} selected</strong>
              <span className="gph-moveto">
                <span className="gph-label">Move to</span>
                {named.map((g) => (
                  <button
                    key={g.key}
                    type="button"
                    className="achip gph-dest"
                    disabled={busy || onlyIn === g.key}
                    title={onlyIn === g.key ? "Already here" : `Move to “${g.key}”`}
                    onClick={() => moveTo(g.key)}
                  >
                    {g.key}
                  </button>
                ))}
                {naming ? (
                  <form className="gph-new" onSubmit={(e) => { e.preventDefault(); moveToNew(); }}>
                    <input
                      autoFocus
                      value={newName}
                      maxLength={80}
                      placeholder="New album name"
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Escape") setNaming(false); }}
                      disabled={busy}
                      aria-label="New album name"
                    />
                    <button type="submit" className="achip" disabled={busy || !newName.trim()}>Move here</button>
                    <button type="button" className="achip" onClick={() => setNaming(false)}>Cancel</button>
                  </form>
                ) : (
                  <button type="button" className="achip gph-dest" disabled={busy} onClick={() => setNaming(true)}>
                    + New album…
                  </button>
                )}
                <button
                  type="button"
                  className="achip gph-dest"
                  disabled={busy || onlyIn === TOP}
                  title={onlyIn === TOP ? "Already at the top" : "Move out of any album"}
                  onClick={() => moveTo(TOP)}
                >
                  Top of gallery
                </button>
              </span>
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
