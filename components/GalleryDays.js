"use client";

// The client's gallery, one level up from PortalGallery: a tile per shoot day
// ("Oct 22 · Pop-up"); tap one and that day opens with its folders as tabs
// (PortalGallery does the grid, viewer and saving). Back — the browser's or
// "← All days" — returns to the tiles. A gallery with a single day (or no
// days at all) skips the tiles and opens straight into its photos.
//
// Days and folders come from media.section ("Day" / "Day › Folder"),
// see lib/albums.js.

import "../app/theme/portal.css";
import { useEffect, useMemo, useState } from "react";
import PortalGallery from "./PortalGallery";
import { splitAlbum } from "../lib/albums";

const slug = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "more";
const hashOf = (key) => `#day-${slug(key)}`;
const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;

export default function GalleryDays({ items, title, videoPoster = null }) {
  // Days in first-appearance order. Each day's items keep their global order
  // and carry the FOLDER as their section, so PortalGallery groups by folder.
  const days = useMemo(() => {
    const list = [];
    for (const it of items) {
      const { day, folder } = splitAlbum(it.section);
      const key = day || "";
      let d = list.find((x) => x.key === key);
      if (!d) list.push((d = { key, title: day, items: [], folders: new Set() }));
      d.items.push({ ...it, section: folder });
      if (folder) d.folders.add(folder);
    }
    return list;
  }, [items]);

  const named = days.filter((d) => d.title);
  const picker = named.length >= 2 || (named.length === 1 && days.length > 1);

  const [open, setOpen] = useState(null); // day key, or null for the tiles
  // The address bar carries the open day (#day-oct-22-pop-up), so Back works
  // and a link can land straight on a day.
  useEffect(() => {
    if (!picker) return;
    const sync = () => {
      const h = window.location.hash;
      const d = days.find((x) => hashOf(x.key) === h);
      setOpen(d ? d.key : null);
    };
    sync();
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    return () => {
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("popstate", sync);
    };
  }, [picker, days]);

  const topOfGrid = () => {
    const el = document.getElementById("grid");
    if (!el) return;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "start" });
  };
  const openDay = (e, key) => {
    e.preventDefault();
    window.history.pushState(null, "", hashOf(key));
    setOpen(key);
    topOfGrid();
  };
  const allDays = () => {
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    setOpen(null);
    topOfGrid();
  };

  // One day (or none): straight into the photos, with the day's name on top.
  if (!picker) {
    const only = days[0];
    if (!only) return null;
    return (
      <>
        {only.title && (
          <header className="pgal-dayhead">
            <h2 className="pgal-day-title">{only.title}</h2>
          </header>
        )}
        <PortalGallery items={only.items} title={title} videoPoster={videoPoster} groupWord="folder" />
      </>
    );
  }

  const day = open !== null ? days.find((d) => d.key === open) : null;
  if (day) {
    const photos = day.items.filter((it) => it.kind !== "video").length;
    const films = day.items.length - photos;
    return (
      <>
        <header className="pgal-dayhead">
          <button type="button" className="pgal-back" onClick={allDays}>
            <span aria-hidden="true">←</span> All days
          </button>
          <h2 className="pgal-day-title">{day.title || "More"}</h2>
          <p className="pgal-day-meta">
            {[photos ? plural(photos, "photo") : "", films ? plural(films, "film") : "", day.folders.size ? plural(day.folders.size, "folder") : ""].filter(Boolean).join(" · ")}
          </p>
        </header>
        <PortalGallery items={day.items} title={`${title} — ${day.title || "More"}`} videoPoster={videoPoster} groupWord="folder" />
      </>
    );
  }

  return (
    <div className="pt-gal pgal-daypick">
      <nav className="pgal-albums pgal-days" aria-label="Shoot days in this gallery">
        <p className="pgal-albums-kick">
          <span>{plural(days.length, "day")}</span>
          <em>Tap one to open it</em>
        </p>
        <div className="pgal-albums-row">
          {days.map((d) => {
            const photos = d.items.filter((it) => it.kind !== "video").length;
            const films = d.items.length - photos;
            const coverItem =
              d.items.find((it) => it.kind !== "video" && it.thumbUrl) || d.items.find((it) => it.thumbUrl) || null;
            const cover = coverItem ? (coverItem.kind === "video" ? coverItem.thumbUrl || videoPoster : coverItem.thumbUrl) : videoPoster;
            const meta = [photos ? plural(photos, "photo") : "", films ? plural(films, "film") : ""].filter(Boolean).join(" · ");
            return (
              <a key={d.key || "·"} href={hashOf(d.key)} className="pgal-album" onClick={(e) => openDay(e, d.key)}>
                <span className="pgal-album-shot">
                  {cover ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={cover} alt="" loading="eager" decoding="async" />
                  ) : (
                    <span className="pgal-album-blank" aria-hidden="true" />
                  )}
                </span>
                <span className="pgal-album-body">
                  <span className="pgal-album-title">{d.title || "More"}</span>
                  <span className="pgal-album-meta">{meta}</span>
                  {d.folders.size > 0 && <span className="pgal-album-folders">{[...d.folders].join(" · ")}</span>}
                </span>
              </a>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
