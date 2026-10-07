"use client";

// Studio → Galleries: the one "Manage" drawer on each gallery card. Everything
// that used to be its own expander (Edit gallery, Set cover, Design, Premiere,
// Ask for a review) lives here as a tab, plus the new ones: add files to the
// gallery, take files out, delete the gallery.

import { useEffect, useRef, useState } from "react";
import AdminUploader from "./AdminUploader";
import CoverPicker from "./CoverPicker";
import GalleryEditPanel from "./GalleryEditPanel";
import DesignPanel from "./DesignPanel";
import PremierePanel from "./PremierePanel";
import ReviewButton from "./ReviewButton";
import TypedConfirm from "./TypedConfirm";
import { isNoEmail } from "../lib/no-email";

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

const TABS = [
  { key: "edit", label: "Edit" },
  { key: "cover", label: "Cover" },
  { key: "design", label: "Design" },
  { key: "premiere", label: "Premiere" },
  { key: "add", label: "+ Add files" },
  { key: "albums", label: "Albums" },
  { key: "files", label: "Files" },
  { key: "delete", label: "Delete", danger: true },
];

// Design and Premiere keep their own open/close button. Inside the drawer the
// tab IS that button, so the panel is opened once on mount and its own toggle
// is tucked away — only after the open actually happened.
function AutoOpen({ children }) {
  const ref = useRef(null);
  const clicked = useRef(false);
  const [opened, setOpened] = useState(false);
  useEffect(() => {
    if (clicked.current) return;
    const btn = ref.current?.querySelector(".cover-picker-toggle");
    if (btn) {
      clicked.current = true;
      btn.click();
      setOpened(true);
    }
  }, []);
  return (
    <div ref={ref} className={"gmanage-auto" + (opened ? " is-auto" : "")}>
      {children}
    </div>
  );
}

// Tap files to tick them, then one typed "remove" takes them out for good.
function GalleryFiles({ gallery, onChanged }) {
  const [items, setItems] = useState(null);
  const [picked, setPicked] = useState(() => new Set());
  const [confirming, setConfirming] = useState(false);
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

  function toggle(filename) {
    setPicked((p) => {
      const next = new Set(p);
      if (next.has(filename)) next.delete(filename);
      else next.add(filename);
      return next;
    });
    setConfirming(false);
    setMsg("");
  }

  async function remove() {
    setBusy(true);
    setMsg("");
    try {
      const j = await api({
        action: "remove-media",
        galleryId: gallery.id,
        filenames: [...picked],
        confirm: "remove",
      });
      setPicked(new Set());
      setConfirming(false);
      await load();
      setMsg(
        `Removed ${j.removed} file${j.removed === 1 ? "" : "s"} ✓ — ${j.remaining} left in the gallery.` +
          (j.zipCleared
            ? " The “download everything” zip still had them in it, so it was removed too; rebuild it with: node scripts/backfill-zips.mjs --gallery " +
              gallery.id
            : "")
      );
      onChanged?.();
    } catch (e) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (items === null) return <p className="cover-picker-hint">Loading files…</p>;
  const n = picked.size;

  return (
    <div className="gfiles">
      {items.length === 0 ? (
        <p className="cover-picker-hint">{msg || "No files in this gallery yet."}</p>
      ) : (
        <>
          <p className="cover-picker-hint gfiles-hint">
            {items.length} file{items.length === 1 ? "" : "s"}. Tap the ones you want out of the
            gallery, then remove them. Removing deletes the file for good — clients lose it too.
          </p>
          <ul className="gfiles-grid">
            {items.map((it) => {
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
                        <img
                          src={it.thumbUrl}
                          alt=""
                          loading="lazy"
                          onError={() => setBroken((b) => new Set(b).add(it.filename))}
                        />
                      ) : (
                        <span className="gfiles-blank" aria-hidden="true">
                          {it.kind === "video" ? "▶" : "—"}
                        </span>
                      )}
                      {it.kind === "video" && showImg && (
                        <span className="gfiles-badge" aria-hidden="true">▶</span>
                      )}
                      {on && <span className="gfiles-tick" aria-hidden="true">✓</span>}
                    </span>
                    <span className="gfiles-name">{it.filename}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="gfiles-bar">
            {n === 0 ? (
              <span className="cover-picker-hint">Nothing selected.</span>
            ) : confirming ? (
              <TypedConfirm
                phrase="remove"
                prompt={`Type “remove” to delete ${n} file${n === 1 ? "" : "s"} from “${gallery.title}” for good.`}
                cta={`Remove ${n} file${n === 1 ? "" : "s"}`}
                busy={busy}
                onConfirm={remove}
                onCancel={() => setConfirming(false)}
              />
            ) : (
              <>
                <button type="button" className="achip achip-danger" onClick={() => setConfirming(true)}>
                  Remove {n} selected…
                </button>
                <button type="button" className="achip" onClick={() => setPicked(new Set())}>
                  Clear
                </button>
              </>
            )}
          </div>
        </>
      )}
      {msg && items.length > 0 && (
        <p className="cover-picker-hint gfiles-msg" role="status">{msg}</p>
      )}
    </div>
  );
}

// Albums: the named groups a client sees inside one gallery ("Ceremony",
// "Reception"…). Each file carries its album name; order follows the files.
// Here: name files that have none, rename an album, reorder, move files.
const NO_ALBUM = "";
function GalleryAlbums({ gallery, onChanged }) {
  const [items, setItems] = useState(null);
  const [picked, setPicked] = useState(() => new Set());
  const [filter, setFilter] = useState(null); // album key, or null for all
  const [renaming, setRenaming] = useState(null); // album key being renamed
  const [renameTo, setRenameTo] = useState("");
  const [dest, setDest] = useState("__new"); // move-to choice
  const [newName, setNewName] = useState("");
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

  if (items === null) return <p className="cover-picker-hint">Loading files…</p>;
  if (items.length === 0) return <p className="cover-picker-hint">{msg || "No files in this gallery yet."}</p>;

  // Albums in the order the client sees them (first appearance).
  const albums = [];
  for (const it of items) {
    const key = it.album || NO_ALBUM;
    let a = albums.find((x) => x.key === key);
    if (!a) albums.push((a = { key, count: 0 }));
    a.count += 1;
  }
  const named = albums.filter((a) => a.key !== NO_ALBUM);
  const label = (key) => (key === NO_ALBUM ? "No album" : key);
  const shown = filter === null ? items : items.filter((it) => (it.album || NO_ALBUM) === filter);
  const n = picked.size;

  function toggle(filename) {
    setPicked((p) => {
      const next = new Set(p);
      if (next.has(filename)) next.delete(filename);
      else next.add(filename);
      return next;
    });
    setMsg("");
  }
  function pickAll() {
    setPicked(new Set(shown.map((it) => it.filename)));
  }

  function move(key, dir) {
    const order = albums.map((a) => a.key);
    const i = order.indexOf(key);
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    [order[i], order[j]] = [order[j], order[i]];
    run({ action: "album-order", order }, () => `Albums reordered ✓`);
  }
  function rename(key) {
    const to = renameTo.trim();
    if (!to) return;
    setRenaming(null);
    run({ action: "album-rename", from: key, to }, (j) =>
      key === NO_ALBUM ? `${j.renamed} file${j.renamed === 1 ? "" : "s"} now in “${j.album}” ✓` : `Renamed to “${j.album}” ✓`
    );
  }
  function assign() {
    const album = dest === "__new" ? newName.trim() : dest === "__none" ? "" : dest;
    if (dest === "__new" && !album) return;
    const files = [...picked];
    setPicked(new Set());
    run({ action: "album-assign", filenames: files, album }, (j) =>
      `${j.moved} file${j.moved === 1 ? "" : "s"} moved to ${j.album ? `“${j.album}”` : "no album"} ✓`
    );
    if (dest === "__new") { setDest(album); setNewName(""); }
  }

  return (
    <div className="galb">
      <p className="cover-picker-hint galb-hint">
        Albums are the named groups a client sees inside this gallery, in this order. Files with no
        album show first, without a heading. Rename, reorder, or tap files below and move them.
      </p>
      <ul className="galb-list">
        {albums.map((a, i) => (
          <li key={a.key || "·"} className={"galb-row" + (filter === a.key ? " is-on" : "")}>
            {renaming === a.key ? (
              <form
                className="galb-rename"
                onSubmit={(e) => { e.preventDefault(); rename(a.key); }}
              >
                <input
                  autoFocus
                  value={renameTo}
                  onFocus={(e) => e.target.select()}
                  maxLength={80}
                  placeholder={a.key === NO_ALBUM ? "Album name for these files" : "New name"}
                  onChange={(e) => setRenameTo(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Escape") setRenaming(null); }}
                />
                <button type="submit" className="achip" disabled={busy || !renameTo.trim()}>Save</button>
                <button type="button" className="achip" onClick={() => setRenaming(null)}>Cancel</button>
              </form>
            ) : (
              <>
                <button
                  type="button"
                  className="galb-name"
                  onClick={() => setFilter(filter === a.key ? null : a.key)}
                  aria-pressed={filter === a.key}
                  title={filter === a.key ? "Show all files" : "Show only these files"}
                >
                  <strong>{label(a.key)}</strong>
                  <em>{a.count} file{a.count === 1 ? "" : "s"}</em>
                </button>
                <span className="galb-actions">
                  <button type="button" className="achip" disabled={busy} onClick={() => { setRenaming(a.key); setRenameTo(a.key === NO_ALBUM ? "" : a.key); }}>
                    {a.key === NO_ALBUM ? "Name these…" : "Rename"}
                  </button>
                  <button type="button" className="achip" disabled={busy || i === 0} onClick={() => move(a.key, -1)} aria-label="Move up">↑</button>
                  <button type="button" className="achip" disabled={busy || i === albums.length - 1} onClick={() => move(a.key, 1)} aria-label="Move down">↓</button>
                </span>
              </>
            )}
          </li>
        ))}
      </ul>

      <p className="cover-picker-hint galb-sub">
        {filter === null ? `All ${items.length} files` : `${shown.length} in ${label(filter)}`} — tap to select, then move.
        {" "}
        <button type="button" className="rm-linkbtn" onClick={pickAll} disabled={busy}>Select all shown</button>
        {filter !== null && (
          <> · <button type="button" className="rm-linkbtn" onClick={() => setFilter(null)}>Show all</button></>
        )}
      </p>
      <ul className="gfiles-grid">
        {shown.map((it) => {
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
                  {on && <span className="gfiles-tick" aria-hidden="true">✓</span>}
                </span>
                <span className="gfiles-name galb-tag">{it.album || "no album"}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="gfiles-bar galb-bar">
        {n === 0 ? (
          <span className="cover-picker-hint">Nothing selected.</span>
        ) : (
          <>
            <span className="galb-moving">Move {n} to</span>
            <select value={dest} onChange={(e) => setDest(e.target.value)} disabled={busy} aria-label="Album">
              {named.map((a) => <option key={a.key} value={a.key}>{a.key}</option>)}
              <option value="__new">New album…</option>
              <option value="__none">No album</option>
            </select>
            {dest === "__new" && (
              <input
                value={newName}
                maxLength={80}
                placeholder="Album name"
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); assign(); } }}
                disabled={busy}
                aria-label="New album name"
              />
            )}
            <button type="button" className="achip" onClick={assign} disabled={busy || (dest === "__new" && !newName.trim())}>
              Move
            </button>
            <button type="button" className="achip" onClick={() => setPicked(new Set())} disabled={busy}>
              Clear
            </button>
          </>
        )}
      </div>
      {msg && <p className="cover-picker-hint gfiles-msg" role="status">{msg}</p>}
    </div>
  );
}

function GalleryDelete({ gallery, onDeleted }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [gone, setGone] = useState(false);

  async function destroy(typed) {
    setBusy(true);
    setMsg("");
    try {
      await api({ action: "delete-gallery", galleryId: gallery.id, confirmTitle: typed });
      setGone(true);
      onDeleted?.();
    } catch (e) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (gone)
    return (
      <p className="cover-picker-hint" role="status">
        “{gallery.title}” is deleted. This card will disappear when the page refreshes.
      </p>
    );

  const count = gallery.media_count || 0;
  return (
    <div className="gdelete">
      <p className="gdelete-warn">
        <strong>This deletes the whole gallery for good.</strong> “{gallery.title}” —{" "}
        {count} {count === 1 ? "item" : "items"}, every file stored for it, and its share link
        {gallery.clientName || gallery.clientEmail
          ? ` — disappears for ${gallery.clientName || gallery.clientEmail} too`
          : ""}
        . There is no undo, so keep your own copy of the files first.
      </p>
      <TypedConfirm
        phrase={gallery.title}
        prompt="Type the gallery title to confirm:"
        cta="Delete gallery forever"
        busy={busy}
        onConfirm={destroy}
      />
      {msg && <p className="cform-error" role="alert">{msg}</p>}
    </div>
  );
}

export default function GalleryManage({ gallery, open, onChanged }) {
  const [tab, setTab] = useState("edit");
  // Tabs stay mounted once visited (just hidden), so switching tabs or
  // closing the drawer never interrupts an upload in progress.
  const [visited, setVisited] = useState(() => new Set(["edit"]));
  const [ver, setVer] = useState(0); // bumps when files were added → Files tab reloads
  const everOpen = useRef(false);
  if (open) everOpen.current = true;
  if (!everOpen.current) return null;

  const g = gallery;
  const show = (key) => {
    setTab(key);
    setVisited((v) => (v.has(key) ? v : new Set(v).add(key)));
  };
  const pane = (key, node) =>
    visited.has(key) ? (
      <div className="gmanage-pane" hidden={tab !== key} key={key}>
        {node}
      </div>
    ) : null;

  return (
    <div className="gmanage" hidden={!open} id={`gmanage-${g.id}`}>
      <div className="gmanage-tabs" role="tablist" aria-label={`Manage ${g.title}`}>
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            className={
              "achip gmanage-tab" + (tab === t.key ? " is-on" : "") + (t.danger ? " achip-danger" : "")
            }
            onClick={() => show(t.key)}
          >
            {t.label}
          </button>
        ))}
        <ReviewButton galleryId={g.id} clientEmail={isNoEmail(g.clientEmail) ? "" : g.clientEmail} requestedAt={g.reviewRequestedAt} />
      </div>
      <div className="gmanage-body">
        {pane(
          "edit",
          <GalleryEditPanel galleryId={g.id} embedded onSaved={() => window.location.reload()} />
        )}
        {pane("cover", <CoverPicker galleryId={g.id} cover={g.cover_filename} embedded />)}
        {pane(
          "design",
          <AutoOpen>
            <DesignPanel galleryId={g.id} design={g.design} shareToken={g.share_token} title={g.title} />
          </AutoOpen>
        )}
        {pane(
          "premiere",
          <AutoOpen>
            <PremierePanel galleryId={g.id} />
          </AutoOpen>
        )}
        {pane(
          "add",
          <div className="gmanage-add">
            <p className="cover-picker-hint">
              Add to “{g.title}” — sneak peek now, the full film later: one gallery, one link.
            </p>
            <AdminUploader
              gallery={{ id: g.id, title: g.title, shareToken: g.share_token }}
              onDone={() => {
                setVer((v) => v + 1);
                onChanged?.();
              }}
            />
          </div>
        )}
        {pane("albums", <GalleryAlbums key={ver} gallery={g} onChanged={onChanged} />)}
        {pane("files", <GalleryFiles key={ver} gallery={g} onChanged={onChanged} />)}
        {pane("delete", <GalleryDelete gallery={g} onDeleted={onChanged} />)}
      </div>
    </div>
  );
}
