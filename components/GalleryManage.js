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
        {pane("files", <GalleryFiles key={ver} gallery={g} onChanged={onChanged} />)}
        {pane("delete", <GalleryDelete gallery={g} onDeleted={onChanged} />)}
      </div>
    </div>
  );
}
