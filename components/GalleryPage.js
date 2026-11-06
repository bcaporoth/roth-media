"use client";

// Studio → /portal/admin/gallery/[id]: the gallery's own page. Header = cover,
// click-to-rename title, date, who it belongs to, View / Copy link / Open.
// Below it the full manage toolset, opened on Photos & albums by default.

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import GalleryManage from "./GalleryManage";
import { isNoEmail } from "../lib/no-email";

function fmtDate(iso) {
  if (!iso) return "";
  return new Date(iso.length === 10 ? iso + "T12:00:00" : iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function GalleryPage({ gallery, tab = "photos" }) {
  const g = gallery;
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(g.title);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [copied, setCopied] = useState(false);

  async function saveTitle(e) {
    e?.preventDefault?.();
    const to = title.trim();
    if (!to || to === g.title) { setEditing(false); setTitle(g.title); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/gallery", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "update", galleryId: g.id, title: to }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || `Request failed (${res.status})`);
      setMsg("Renamed ✓");
      setEditing(false);
      router.refresh();
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`https://rothmediaco.com/g/${g.share_token}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { setMsg("Couldn't copy — long-press the Open link instead."); }
  }

  const who = g.clientName || (isNoEmail(g.clientEmail) ? "no email yet" : g.clientEmail);

  return (
    <>
      <p className="gpage-back"><Link href="/portal/admin">← All galleries</Link></p>
      <header className="gpage-head">
        <Link href={`/portal/gallery/${g.id}`} className="gpage-cover" title="View as the client sees it">
          {g.coverUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={g.coverUrl} alt="" />
          ) : (
            <span className="gcard-blank" aria-hidden="true">{(g.title || "?").slice(0, 1)}</span>
          )}
        </Link>
        <div className="gpage-info">
          {editing ? (
            <form className="gpage-rename" onSubmit={saveTitle}>
              <input
                autoFocus
                className="cform-input"
                value={title}
                maxLength={120}
                disabled={busy}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Escape") { setEditing(false); setTitle(g.title); } }}
                aria-label="Gallery title"
              />
              <button type="submit" className="achip" disabled={busy || !title.trim()}>Save</button>
              <button type="button" className="achip" disabled={busy} onClick={() => { setEditing(false); setTitle(g.title); }}>Cancel</button>
            </form>
          ) : (
            <h1 className="gpage-title">
              <button type="button" className="gpage-title-btn" title="Click to rename" onClick={() => setEditing(true)}>
                {g.title} <span aria-hidden="true">✎</span>
              </button>
            </h1>
          )}
          <p className="gpage-meta">
            {g.clientId ? <Link href={`/portal/admin/clients/${g.clientId}`}>{who}</Link> : who}
            {" · "}
            {g.event_date ? `Event ${fmtDate(g.event_date)}` : `Added ${fmtDate(g.created_at)}`}
            {" · "}
            {g.media_count} items
            {g.activity ? ` · opened ${g.activity.views}× · ${g.activity.saves} saved` : " · not opened yet"}
          </p>
          <div className="gcard-actions">
            <Link className="achip" href={`/portal/gallery/${g.id}`}>View</Link>
            <button type="button" className={"achip" + (copied ? " is-done" : "")} onClick={copyLink}>{copied ? "Copied ✓" : "Copy link"}</button>
            <a className="achip" href={`/g/${g.share_token}`} target="_blank" rel="noreferrer">Open ↗</a>
          </div>
          {msg && <p className="cform-error" role="status">{msg}</p>}
        </div>
      </header>

      <section className="gpage-manage">
        <GalleryManage gallery={g} open defaultTab={tab} onChanged={() => router.refresh()} />
      </section>
    </>
  );
}
