"use client";

import { useState, useEffect, useCallback } from "react";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "weddings", label: "Weddings" },
  { id: "fitness", label: "Gyms & Fitness" },
  { id: "lifestyle", label: "Lifestyle" },
  { id: "seniors", label: "Seniors" },
  { id: "engagements", label: "Engagements" },
];

export default function Gallery({ photos }) {
  const [filter, setFilter] = useState("all");
  const [lightbox, setLightbox] = useState(null); // index into `visible`

  const visible =
    filter === "all" ? photos : photos.filter((p) => p.category === filter);

  const close = useCallback(() => setLightbox(null), []);
  const step = useCallback(
    (dir) =>
      setLightbox((i) =>
        i === null ? null : (i + dir + visible.length) % visible.length
      ),
    [visible.length]
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

  const availableFilters = FILTERS.filter(
    (f) => f.id === "all" || photos.some((p) => p.category === f.id)
  );

  return (
    <>
      <div className="work-head">
        <h2>
          Selected <em>work.</em>
        </h2>
        <div className="filters" role="group" aria-label="Filter gallery">
          {availableFilters.map((f) => (
            <button
              key={f.id}
              className={filter === f.id ? "active" : ""}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <div className="gallery">
        {visible.map((photo, i) => (
          <button
            className="item"
            key={photo.src}
            onClick={() => setLightbox(i)}
            aria-label={`View ${photo.caption} larger`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.src}
              alt={photo.caption}
              loading={i < 3 ? "eager" : "lazy"}
            />
            <span className="cap">{photo.caption}</span>
          </button>
        ))}
      </div>
      {lightbox !== null && visible[lightbox] && (
        <div
          className="lightbox"
          role="dialog"
          aria-label="Image viewer"
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <button className="close" onClick={close} aria-label="Close">
            ×
          </button>
          <button
            className="arrow prev"
            onClick={() => step(-1)}
            aria-label="Previous image"
          >
            ‹
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={visible[lightbox].src} alt={visible[lightbox].caption} />
          <button
            className="arrow next"
            onClick={() => step(1)}
            aria-label="Next image"
          >
            ›
          </button>
        </div>
      )}
    </>
  );
}
