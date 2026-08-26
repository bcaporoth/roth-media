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
  const touchRef = useRef(null);

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

  // Deal items into columns without disturbing their order.
  const columns = Array.from({ length: cols }, () => []);
  items.forEach((item, i) => columns[i % cols].push([item, i]));

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
          aria-label={`Download ${item.kind} ${i + 1}`}
          title={`Download this ${item.kind}`}
        >
          ↓
        </a>
      </div>
    );
  };

  return (
    <>
      <div className="gallery pgal-grid">
        {columns.map((col, c) => (
          <div className="pgal-col" key={c}>
            {col.map(([item, i]) => tile(item, i))}
          </div>
        ))}
      </div>
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
            title={`Download this ${current.kind}`}
          >
            Download ↓
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
