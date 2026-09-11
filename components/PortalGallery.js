"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// Client-side gallery viewer: order-preserving masonry, lightbox with
// keyboard + swipe nav, per-item download. Handles photos and videos;
// all URLs arrive pre-signed from the server.
//
// Layout note: the grid used to be CSS multi-columns, which flow items
// DOWN each column — so the top row showed photo #1 next to photos from
// the middle and end of the day. Items are now dealt round-robin into
// explicit columns (item i → column i % N), which keeps the masonry look
// while reading left-to-right in true album order.
export default function PortalGallery({ items, title, videoPoster = null }) {
  const [lightbox, setLightbox] = useState(null);
  const [cols, setCols] = useState(3);
  const [saving, setSaving] = useState(null);
  const [touchShare, setTouchShare] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const [bulk, setBulk] = useState(null); // { done, total } while fetching/downloading
  const [pendingCount, setPendingCount] = useState(0);
  const touchRef = useRef(null);
  // Files fetched for a bulk save whose share sheet needs one more tap
  // (Safari's user-activation window expired during the fetches).
  const pendingRef = useRef(null);

  // Phones/tablets that can hand a file to the native share sheet get a
  // "save to Photos" flow; everyone else keeps the plain download link.
  useEffect(() => {
    setTouchShare(
      typeof navigator !== "undefined" &&
        typeof navigator.share === "function" &&
        typeof navigator.canShare === "function" &&
        window.matchMedia("(hover: none) and (pointer: coarse)").matches
    );
  }, []);

  // Fetch the original and open the OS share sheet — on iOS/Android that
  // includes "Save Image", which drops it straight into the photo library
  // (a plain download link can only reach the Files app). Any failure
  // (CORS not set up yet, share refused, slow network killed the gesture)
  // falls back to the normal download.
  const saveItem = async (e, item) => {
    if (!touchShare || item.kind === "video" || saving) return;
    e.preventDefault();
    setSaving(item.filename);
    try {
      const res = await fetch(item.downloadUrl);
      if (!res.ok) throw new Error(`fetch ${res.status}`);
      const blob = await res.blob();
      const file = new File([blob], item.filename, {
        type: blob.type || "image/jpeg",
      });
      if (!navigator.canShare({ files: [file] })) throw new Error("no file share");
      await navigator.share({ files: [file] });
    } catch (err) {
      // AbortError = the client closed the share sheet — not a failure.
      if (err?.name !== "AbortError") window.location.href = item.downloadUrl;
    } finally {
      setSaving(null);
    }
  };

  const exitSelect = useCallback(() => {
    setSelectMode(false);
    setSelected(new Set());
    setPendingCount(0);
    pendingRef.current = null;
  }, []);

  const toggleSelect = (filename) => {
    setPendingCount(0);
    pendingRef.current = null;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(filename)) next.delete(filename);
      else next.add(filename);
      return next;
    });
  };

  // Fetch the selected photos' web-size versions a few at a time. Web size
  // (2200px) keeps a 20-photo save around 30 MB — the share sheet chokes on
  // gigabytes of originals, and full res stays a tap away per photo or via
  // the album zip.
  const fetchSelected = async (chosen) => {
    const files = new Array(chosen.length);
    let done = 0;
    let idx = 0;
    const worker = async () => {
      while (idx < chosen.length) {
        const i = idx++;
        const res = await fetch(chosen[i].webUrl);
        if (!res.ok) throw new Error(`fetch ${res.status}`);
        const blob = await res.blob();
        const base = chosen[i].filename.replace(/\.[^.]+$/, "");
        files[i] = new File([blob], `${base}.jpg`, {
          type: blob.type || "image/jpeg",
        });
        done += 1;
        setBulk({ done, total: chosen.length, phase: "fetch" });
      }
    };
    await Promise.all(
      Array.from({ length: Math.min(4, chosen.length) }, worker)
    );
    return files;
  };

  const bulkSave = async () => {
    if (bulk) return;

    // Second tap after the share sheet needed a fresh gesture: the files
    // are already in memory, share immediately.
    if (pendingRef.current) {
      const files = pendingRef.current;
      pendingRef.current = null;
      setPendingCount(0);
      try {
        await navigator.share({ files });
        exitSelect();
      } catch {
        /* client closed the sheet — keep the selection */
      }
      return;
    }

    const chosen = items.filter(
      (it) => it.kind !== "video" && selected.has(it.filename)
    );
    if (!chosen.length) return;

    if (touchShare) {
      let files = null;
      try {
        setBulk({ done: 0, total: chosen.length, phase: "fetch" });
        files = await fetchSelected(chosen);
        setBulk(null);
        if (!navigator.canShare({ files })) throw new Error("no file share");
        await navigator.share({ files });
        exitSelect();
        return;
      } catch (err) {
        setBulk(null);
        if (err?.name === "AbortError") return; // sheet dismissed
        if (err?.name === "NotAllowedError" && files) {
          // Fetches outlived the tap's activation window — hold the files
          // and turn the button into a one-tap share.
          pendingRef.current = files;
          setPendingCount(files.length);
          return;
        }
        // Anything else (share of many files refused, fetch failed) falls
        // through to plain downloads below.
      }
    }

    // Sequential downloads of the originals — the browser may ask once to
    // allow multiple downloads.
    setBulk({ done: 0, total: chosen.length, phase: "download" });
    for (let i = 0; i < chosen.length; i++) {
      const a = document.createElement("a");
      a.href = chosen[i].downloadUrl;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setBulk({ done: i + 1, total: chosen.length, phase: "download" });
      await new Promise((r) => setTimeout(r, 450));
    }
    setBulk(null);
    exitSelect();
  };

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 900px)");
    const apply = () => setCols(mq.matches ? 2 : 3);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const close = useCallback(() => setLightbox(null), []);
  const step = useCallback(
    (dir) =>
      setLightbox((i) =>
        i === null ? null : (i + dir + items.length) % items.length
      ),
    [items.length]
  );

  useEffect(() => {
    if (lightbox === null) return;
    const onKey = (e) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, close, step]);

  useEffect(() => {
    if (!selectMode || lightbox !== null) return;
    const onKey = (e) => {
      if (e.key === "Escape") exitSelect();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectMode, lightbox, exitSelect]);

  // Warm the neighbours so arrow / swipe feels instant.
  useEffect(() => {
    if (lightbox === null) return;
    [1, -1].forEach((dir) => {
      const n = items[(lightbox + dir + items.length) % items.length];
      if (n && n.kind !== "video" && n.webUrl) {
        const img = new Image();
        img.src = n.webUrl;
      }
    });
  }, [lightbox, items]);

  const onTouchStart = (e) => {
    const t = e.touches[0];
    touchRef.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e) => {
    const start = touchRef.current;
    touchRef.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      step(dx < 0 ? 1 : -1);
    }
  };

  const current = lightbox !== null ? items[lightbox] : null;

  // Sections ("parts of the day"): group by item.section in first-appearance
  // order. Untitled items form a heading-less group. The lightbox keeps
  // global indices, so prev/next flows straight through section borders.
  const groups = [];
  items.forEach((item, i) => {
    const key = item.section || "";
    let g = groups.find((x) => x.key === key);
    if (!g) {
      g = { key, title: item.section || null, entries: [] };
      groups.push(g);
    }
    g.entries.push([item, i]);
  });

  // Deal a group's items into columns without disturbing their order.
  // Each item goes to the currently-shortest column, weighted by its
  // aspect ratio — round-robin ignored heights, so 500 photos in, one
  // column could finish a dozen photos shorter than its neighbors.
  // Ratios come from the dims sidecar; fallbacks for items without one.
  const ratioOf = (item) => {
    if (item.kind === "video") return 9 / 16;
    return item.w && item.h ? item.h / item.w : 0.75;
  };
  const dealt = (entries) => {
    const columns = Array.from({ length: cols }, () => []);
    const heights = Array.from({ length: cols }, () => 0);
    entries.forEach(([item, i]) => {
      const c = heights.indexOf(Math.min(...heights));
      columns[c].push([item, i]);
      heights[c] += ratioOf(item);
    });
    return columns;
  };

  const tile = (item, i) => {
    const tileSrc =
      item.kind === "video" ? videoPoster || item.thumbUrl : item.thumbUrl;
    const selectable = selectMode && item.kind !== "video";
    const isSel = selectable && selected.has(item.filename);
    return (
      <div className="item pgal-item" key={item.filename}>
        <button
          className={`pgal-view${isSel ? " is-selected" : ""}${
            selectMode && !selectable ? " pgal-unselectable" : ""
          }`}
          onClick={() =>
            selectMode
              ? selectable && toggleSelect(item.filename)
              : setLightbox(i)
          }
          aria-label={
            selectMode
              ? selectable
                ? `Select photo ${i + 1} of ${title}`
                : `Videos can't be multi-selected`
              : `View ${item.kind} ${i + 1} of ${title}`
          }
          aria-pressed={selectMode ? isSel : undefined}
        >
          {tileSrc ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={tileSrc}
              alt={`${title} — ${item.kind} ${i + 1}`}
              loading={i < 6 ? "eager" : "lazy"}
            />
          ) : (
            <span className="pgal-video-tile" aria-hidden="true" />
          )}
          {item.kind === "video" && (
            <span className="pgal-play" aria-hidden="true">
              ▶
            </span>
          )}
          {selectable && (
            <span className={`pgal-check${isSel ? " on" : ""}`} aria-hidden="true">
              ✓
            </span>
          )}
        </button>
        {!selectMode && (
          <a
            className="pgal-dl"
            href={item.downloadUrl}
            onClick={(e) => saveItem(e, item)}
            aria-label={`Save ${item.kind} ${i + 1}`}
            aria-busy={saving === item.filename}
            title={`Save this ${item.kind}`}
          >
            {saving === item.filename ? "…" : "↓"}
          </a>
        )}
      </div>
    );
  };

  const photoCount = items.filter((it) => it.kind !== "video").length;

  const bulkLabel = () => {
    if (bulk)
      return bulk.phase === "fetch"
        ? `Preparing ${bulk.done}/${bulk.total}…`
        : `Downloading ${bulk.done}/${bulk.total}…`;
    if (pendingCount) return `Tap to save ${pendingCount} photos`;
    if (touchShare) return `Save ${selected.size || ""} to Photos`;
    return `Download ${selected.size || ""}`;
  };

  return (
    <>
      {photoCount > 1 && (
        <div className="pgal-toolbar">
          {!selectMode ? (
            <button
              className="pgal-tool-btn"
              onClick={() => setSelectMode(true)}
            >
              Select photos
            </button>
          ) : (
            <>
              <span className="pgal-tool-count">
                {selected.size} selected
              </span>
              <button
                className="pgal-tool-btn primary"
                disabled={(!selected.size && !pendingCount) || !!bulk}
                aria-busy={!!bulk}
                onClick={bulkSave}
              >
                {bulkLabel()}
              </button>
              <button className="pgal-tool-btn" onClick={exitSelect}>
                Done
              </button>
            </>
          )}
        </div>
      )}
      {groups.map((group) => (
        <section className="pgal-section" key={group.key || "·"}>
          {group.title && (
            <h2 className="pgal-section-title">
              {group.title}
              <span className="pgal-section-count">
                {group.entries.length}
              </span>
            </h2>
          )}
          <div className="gallery pgal-grid">
            {dealt(group.entries).map((col, c) => (
              <div className="pgal-col" key={c}>
                {col.map(([item, i]) => tile(item, i))}
              </div>
            ))}
          </div>
        </section>
      ))}
      {current && (
        <div
          className="lightbox"
          role="dialog"
          aria-label="Media viewer"
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <span className="pgal-lightbox-count" aria-hidden="true">
            {lightbox + 1} / {items.length}
          </span>
          <button className="close" onClick={close} aria-label="Close">
            ×
          </button>
          <button
            className="arrow prev"
            onClick={() => step(-1)}
            aria-label="Previous"
          >
            ‹
          </button>
          {current.kind === "video" ? (
            <video
              className="pgal-lightbox-video"
              src={current.webUrl}
              poster={videoPoster || current.thumbUrl || undefined}
              controls
              autoPlay
              playsInline
            />
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={current.webUrl} alt={`${title} — photo ${lightbox + 1}`} />
          )}
          <a
            className="pgal-lightbox-dl"
            href={current.downloadUrl}
            onClick={(e) => saveItem(e, current)}
            aria-busy={saving === current.filename}
            title={`Save this ${current.kind}`}
          >
            {saving === current.filename
              ? "Saving…"
              : touchShare && current.kind !== "video"
                ? "Save photo ↓"
                : "Download ↓"}
          </a>
          <button
            className="arrow next"
            onClick={() => step(1)}
            aria-label="Next"
          >
            ›
          </button>
        </div>
      )}
    </>
  );
}
