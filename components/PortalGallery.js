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
  const touchRef = useRef(null);

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
  const dealt = (entries) => {
    const columns = Array.from({ length: cols }, () => []);
    entries.forEach(([item, i], n) => columns[n % cols].push([item, i]));
    return columns;
  };

  const tile = (item, i) => {
    const tileSrc =
      item.kind === "video" ? videoPoster || item.thumbUrl : item.thumbUrl;
    return (
      <div className="item pgal-item" key={item.filename}>
        <button
          className="pgal-view"
          onClick={() => setLightbox(i)}
          aria-label={`View ${item.kind} ${i + 1} of ${title}`}
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
        </button>
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
      </div>
    );
  };

  return (
    <>
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
