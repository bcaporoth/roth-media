"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "weddings", label: "Weddings" },
  { id: "events", label: "Events" },
  { id: "fitness", label: "Gyms & Fitness" },
  { id: "lifestyle", label: "Lifestyle" },
  { id: "seniors", label: "Seniors" },
  { id: "engagements", label: "Engagements" },
];

export default function Gallery({ photos }) {
  const [filter, setFilter] = useState("all");
  const [lightbox, setLightbox] = useState(null); // index into `visible`
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const stripRef = useRef(null);

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

  const updateEnds = useCallback(() => {
    const el = stripRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  }, []);

  // Jump back to the start whenever the filter changes.
  useEffect(() => {
    const el = stripRef.current;
    if (el) el.scrollTo({ left: 0 });
    updateEnds();
  }, [filter, updateEnds]);

  useEffect(() => {
    updateEnds();
    window.addEventListener("resize", updateEnds);
    return () => window.removeEventListener("resize", updateEnds);
  }, [updateEnds]);

  const page = (dir) => {
    const el = stripRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  };

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
      <div className="gal-carousel">
        <button
          className="gal-nav prev"
          onClick={() => page(-1)}
          aria-label="Scroll gallery backward"
          disabled={atStart}
        >
          ‹
        </button>
        <div className="gallery gal-strip" ref={stripRef} onScroll={updateEnds}>
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
        <button
          className="gal-nav next"
          onClick={() => page(1)}
          aria-label="Scroll gallery forward"
          disabled={atEnd}
        >
          ›
        </button>
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
