"use client";

import { useState, useEffect, useCallback } from "react";

// Client-side gallery viewer: masonry grid, lightbox with keyboard nav,
// per-item download. Handles photos and videos; all URLs arrive
// pre-signed from the server.
export default function PortalGallery({ items, title, videoPoster = null }) {
  const [lightbox, setLightbox] = useState(null);

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

  const current = lightbox !== null ? items[lightbox] : null;

  return (
    <>
      <div className="gallery pgal-grid">
        {items.map((item, i) => {
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
        })}
      </div>
      {current && (
        <div
          className="lightbox"
          role="dialog"
          aria-label="Media viewer"
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
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

