"use client";

import { useMemo, useState } from "react";
import GuestEventsPanel from "./GuestEventsPanel";
import Link from "next/link";
import AdminUploader from "./AdminUploader";
import GalleryManage from "./GalleryManage";
import { useRouter } from "next/navigation";

// Studio → Galleries: compact counts, search/sort, cover-photo cards, the
// uploader and Guest Reel. The frame around it (tabs, Look, footer) is the
// shared StudioShell — the page wraps this in it.

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
  const [uploaderOpen, setUploaderOpen] = useState(false);
  const [guestOpen, setGuestOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("newest");
  const [copiedId, setCopiedId] = useState(null);
  // Which cards have their Manage drawer open (several can be).
  const [managing, setManaging] = useState(() => new Set());
  const router = useRouter();
  const toggleManage = (id) =>
    setManaging((m) => {
      const next = new Set(m);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

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

  const plural = (n, one, many = `${one}s`) => `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;

  return (
    <>
        <p className="gcounts" aria-label="What you're hosting">
          <span title="Every gallery you've published, sneak peeks included."><b>{plural(galleries.length, "gallery", "galleries")}</b></span>
          <span title="Photos and videos across all galleries."><b>{plural(totalItems, "file")}</b></span>
          <span title="People who own a gallery — manage them under Clients."><b>{plural(clientCount, "client")}</b></span>
          {latest && <span title="The most recently published gallery.">Latest: <b>{latest.title}</b> · {fmtDate(latest.created_at)}</span>}
        </p>

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
            onClick={() => setGuestOpen(!guestOpen)}
          >
            {guestOpen ? "Close guest reel" : "◎ Guest Reel"}
          </button>
          <button
            type="button"
            className="abtn"
            onClick={() => setUploaderOpen(!uploaderOpen)}
          >
            {uploaderOpen ? "Close" : "+ New gallery"}
          </button>
        </div>

        {guestOpen && <GuestEventsPanel galleries={galleries} />}

        {uploaderOpen && (
          <section className="anew">
            <h2>Add a gallery</h2>
            <p className="anew-hint">
              Upload straight from this page — photos get web sizes made
              automatically, videos get a preview frame, and you get a share
              link anyone can open.
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
              <article
                className={"gcard" + (managing.has(g.id) ? " is-managing" : "")}
                key={g.id}
              >
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
                  <span className="gcard-meta gcard-activity">
                    {g.activity
                      ? `Opened ${g.activity.views}× · ${g.activity.saves} saved · last ${fmtDate(g.activity.last)}`
                      : "Not opened yet"}
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
                    <button
                      type="button"
                      className={"achip gcard-manage" + (managing.has(g.id) ? " is-on" : "")}
                      aria-expanded={managing.has(g.id)}
                      aria-controls={`gmanage-${g.id}`}
                      onClick={() => toggleManage(g.id)}
                    >
                      {managing.has(g.id) ? "Close" : "Manage ▾"}
                    </button>
                  </div>
                  <GalleryManage
                    gallery={g}
                    open={managing.has(g.id)}
                    onChanged={() => router.refresh()}
                  />
                </div>
              </article>
            ))}
          </div>
        </section>
    </>
  );
}
