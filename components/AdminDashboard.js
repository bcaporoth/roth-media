"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdminUploader from "./AdminUploader";
import CoverPicker from "./CoverPicker";
import DesignPanel from "./DesignPanel";
import PremierePanel from "./PremierePanel";
import { DESIGN_ACCENTS } from "../lib/design";

// Studio Admin dashboard — stats, search/sort, cover-photo cards, and a
// personal "Look" (light/dark + accent) saved per-device in localStorage.

const LOOK_KEY = "rm-admin-look";

function fmtDate(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function initials(title) {
  return (title || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

export default function AdminDashboard({ galleries }) {
  const [look, setLook] = useState({ mode: "light", accent: "clay" });
  const [lookOpen, setLookOpen] = useState(false);
  const [uploaderOpen, setUploaderOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("newest");
  const [copiedId, setCopiedId] = useState(null);

  // Restore the saved look after mount (avoids SSR hydration mismatch).
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(LOOK_KEY) || "null");
      if (saved && (saved.mode || saved.accent)) {
        setLook({
          mode: saved.mode === "dark" ? "dark" : "light",
          accent: DESIGN_ACCENTS[saved.accent] ? saved.accent : "clay",
        });
      }
    } catch {
      /* first visit */
    }
  }, []);

  function setLookPart(part) {
    setLook((l) => {
      const next = { ...l, ...part };
      try {
        localStorage.setItem(LOOK_KEY, JSON.stringify(next));
      } catch {
        /* private mode */
      }
      return next;
    });
  }

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = galleries;
    if (q) {
      list = list.filter((g) =>
        [g.title, g.clientName, g.clientEmail]
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }
    const by = {
      newest: (a, b) => new Date(b.created_at) - new Date(a.created_at),
      oldest: (a, b) => new Date(a.created_at) - new Date(b.created_at),
      title: (a, b) => a.title.localeCompare(b.title),
      items: (a, b) => (b.media_count || 0) - (a.media_count || 0),
    };
    return [...list].sort(by[sort] || by.newest);
  }, [galleries, query, sort]);

  const totalItems = galleries.reduce((n, g) => n + (g.media_count || 0), 0);
  const clientCount = new Set(
    galleries.map((g) => g.clientEmail).filter(Boolean)
  ).size;
  const latest = galleries.reduce(
    (best, g) =>
      !best || new Date(g.created_at) > new Date(best.created_at) ? g : best,
    null
  );

  async function copyLink(g) {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/g/${g.share_token}`
      );
      setCopiedId(g.id);
      setTimeout(() => setCopiedId((id) => (id === g.id ? null : id)), 2000);
    } catch {
      window.prompt("Copy the share link:", `${window.location.origin}/g/${g.share_token}`);
    }
  }

  const accent = DESIGN_ACCENTS[look.accent] || DESIGN_ACCENTS.clay;
  const shellStyle =
    look.accent !== "clay"
      ? { "--clay": accent.main, "--clay-soft": accent.soft }
      : undefined;

  return (
    <div
      className={"admin-shell" + (look.mode === "dark" ? " is-dark" : "")}
      style={shellStyle}
    >
      <main className="admin-wrap">
        <div className="kick">Studio admin</div>
        <h1>Your studio.</h1>

        <div className="astats">
          <div className="astat">
            <strong>{galleries.length}</strong>
            <span>Galleries</span>
          </div>
          <div className="astat">
            <strong>{totalItems.toLocaleString("en-US")}</strong>
            <span>Photos &amp; videos</span>
          </div>
          <div className="astat">
            <strong>{clientCount}</strong>
            <span>Clients</span>
          </div>
          <div className="astat">
            <strong className="astat-small">
              {latest ? latest.title : "—"}
            </strong>
            <span>
              Latest{latest ? ` · ${fmtDate(latest.created_at)}` : ""}
            </span>
          </div>
        </div>

        <div className="atoolbar">
          <input
            type="search"
            placeholder="Search galleries or clients…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search galleries"
          />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            aria-label="Sort galleries"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="title">Title A–Z</option>
            <option value="items">Most items</option>
          </select>
          <button
            type="button"
            className="abtn abtn-ghost"
            onClick={() => setLookOpen(!lookOpen)}
          >
            ✦ Look
          </button>
          <button
            type="button"
            className="abtn"
            onClick={() => setUploaderOpen(!uploaderOpen)}
          >
            {uploaderOpen ? "Close" : "+ New gallery"}
          </button>
        </div>

        {lookOpen && (
          <div className="alook-panel">
            <div className="design-group">
              <strong>Mood</strong>
              <div className="design-modes">
                {["light", "dark"].map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={"design-mode" + (look.mode === m ? " is-on" : "")}
                    onClick={() => setLookPart({ mode: m })}
                  >
                    <span
                      className="design-mode-chip"
                      style={{
                        background: m === "dark" ? "#191612" : "#f4efe6",
                        borderColor: m === "dark" ? "#b4a894" : "#6b6358",
                      }}
                    />
                    {m === "dark" ? "Dark" : "Light"}
                  </button>
                ))}
              </div>
            </div>
            <div className="design-group">
              <strong>Accent</strong>
              <div className="design-accents">
                {Object.entries(DESIGN_ACCENTS).map(([key, a]) => (
                  <button
                    key={key}
                    type="button"
                    title={a.label}
                    aria-label={`Accent: ${a.label}`}
                    className={
                      "design-accent" + (look.accent === key ? " is-on" : "")
                    }
                    style={{ background: a.main }}
                    onClick={() => setLookPart({ accent: key })}
                  />
                ))}
              </div>
            </div>
            <p className="alook-hint">
              Just for you — saved on this device, clients never see it.
            </p>
          </div>
        )}

        {uploaderOpen && (
          <section className="anew">
            <h2>Add a gallery</h2>
            <p className="anew-hint">
              Upload straight from this page — photos get web sizes made
              automatically, and you get a share link anyone can open.
            </p>
            <AdminUploader />
          </section>
        )}

        <section className="agrid-wrap">
          {shown.length === 0 && (
            <p className="portal-empty">
              {galleries.length === 0
                ? "No galleries yet — hit “+ New gallery” to add your first."
                : "Nothing matches that search."}
            </p>
          )}
          <div className="agrid">
            {shown.map((g) => (
              <article className="gcard" key={g.id}>
                <Link
                  href={`/portal/gallery/${g.id}`}
                  className="gcard-cover"
                  title="Open gallery"
                >
                  {g.coverUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={g.coverUrl} alt="" loading="lazy" />
                  ) : (
                    <span className="gcard-blank" aria-hidden="true">
                      {initials(g.title)}
                    </span>
                  )}
                  <span className="gcard-count">
                    {g.media_count || 0} items
                  </span>
                </Link>
                <div className="gcard-body">
                  <strong className="gcard-title">{g.title}</strong>
                  <span className="gcard-meta">
                    {g.clientName || g.clientEmail}
                    {g.clientName && g.clientEmail
                      ? ` · ${g.clientEmail}`
                      : ""}
                  </span>
                  <span className="gcard-meta">
                    {g.event_date
                      ? `Event ${fmtDate(g.event_date)}`
                      : `Added ${fmtDate(g.created_at)}`}
                  </span>
                  <div className="gcard-actions">
                    <Link className="achip" href={`/portal/gallery/${g.id}`}>
                      View
                    </Link>
                    <button
                      type="button"
                      className={
                        "achip" + (copiedId === g.id ? " is-done" : "")
                      }
                      onClick={() => copyLink(g)}
                    >
                      {copiedId === g.id ? "Copied ✓" : "Copy link"}
                    </button>
                    <a
                      className="achip"
                      href={`/g/${g.share_token}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open ↗
                    </a>
                  </div>
                  <div className="gcard-tools">
                    <CoverPicker galleryId={g.id} cover={g.cover_filename} />
                    <DesignPanel
                      galleryId={g.id}
                      design={g.design}
                      shareToken={g.share_token}
                      title={g.title}
                    />
                    <PremierePanel galleryId={g.id} />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
