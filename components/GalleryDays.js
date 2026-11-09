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
import { splitAlbum, albumSlug, albumParam, readAlbumUrl } from "../lib/albums";

// The open day/folder lives in the address bar as ?album=… (see lib/albums.js).
// Every change is announced so the Share box above can follow along.
function setAlbumUrl(param, title, push) {
  const u = new URL(window.location.href);
  if (param) u.searchParams.set("album", param);
  else u.searchParams.delete("album");
  u.hash = "";
  window.history[push ? "pushState" : "replaceState"](null, "", u);
  window.dispatchEvent(new CustomEvent("albumchange", { detail: { param, title } }));
}
const hrefOf = (key) => `?album=${albumParam(key)}`;
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
  const [folder, setFolder] = useState(null); // folder slug from the link, or null
  // The address bar carries the open day (#day-oct-22-pop-up) and folder
  // (…--photos), so Back works and a link can land straight on either.
  useEffect(() => {
    const sync = () => {
      const h = readAlbumUrl(window.location);
      setFolder(h?.folder || null);
      const d = h ? days.find((x) => albumSlug(x.key) === h.day) : picker ? null : days[0];
      if (picker) setOpen(d ? d.key : null);
      const f = d && h?.folder ? [...d.folders].find((x) => albumSlug(x) === h.folder) : null;
      window.dispatchEvent(new CustomEvent("albumchange", { detail: { param: h && d ? albumParam(d.key, f) : null, title: h && d ? [d.title, f].filter(Boolean).join(" › ") : null } }));
    };
    sync();
    // Arriving from a link to a day or folder: scroll down to it.
    if (readAlbumUrl(window.location)) {
      // (80px of room so the fixed top bar doesn't cover the album's name)
      // The browser's own "put it back where it was" can win the race, so it's
      // turned off here and the scroll is tried twice.
      try { window.history.scrollRestoration = "manual"; } catch {}
      const toGrid = () => {
        const el = document.getElementById("grid");
        if (!el) return;
        // Only while they're still at the very top: never yank someone mid-scroll.
        if (window.scrollY < 50) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: "instant" });
      };
      const go = () => { setTimeout(toGrid, 300); setTimeout(toGrid, 1200); };
      if (document.readyState === "complete") go();
      else window.addEventListener("load", go, { once: true });
    }
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
    const d = days.find((x) => x.key === key);
    setAlbumUrl(albumParam(key), d?.title || "More", true);
    setFolder(null);
    setOpen(key);
    topOfGrid();
  };
  // Picking a folder tab updates the address bar, so the link can be copied.
  const folderTab = (dayKey) => (key) => {
    const d = days.find((x) => x.key === dayKey);
    setAlbumUrl(picker || key ? albumParam(dayKey, key || null) : null, picker || key ? [d?.title, key].filter(Boolean).join(" › ") || "More" : null, false);
  };
  const allDays = () => {
    setAlbumUrl(null, null, false);
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
        <PortalGallery items={only.items} title={title} videoPoster={videoPoster} groupWord="folder" startFolder={folder} onTab={folderTab(only.key)} />
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
        <PortalGallery items={day.items} title={`${title} — ${day.title || "More"}`} videoPoster={videoPoster} groupWord="folder" startFolder={folder} onTab={folderTab(day.key)} />
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
              <a key={d.key || "·"} href={hrefOf(d.key)} className="pgal-album" onClick={(e) => openDay(e, d.key)}>
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
