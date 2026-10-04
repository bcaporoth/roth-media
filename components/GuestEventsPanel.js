"use client";

// Studio Admin → Guest Reel: create an event, hand out the QR sign, watch
// uploads land, open the couple's gallery.

import { useEffect, useState } from "react";
import { slugify } from "../lib/guest";
import TypedConfirm from "./TypedConfirm";

async function api(payload) {
  const res = await fetch("/api/admin/guest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
  return json;
}

const fmtBytes = (n) => (n >= 1e9 ? `${(n / 1e9).toFixed(1)} GB` : `${Math.round(n / 1e6)} MB`);
const fmtSize = (n) => (n >= 1e6 ? fmtBytes(n) : `${Math.max(1, Math.round(n / 1e3))} KB`);
const KIND_LABEL = { photo: "Photo", video: "Video", message: "Video message" };

// What guests sent for one event: a thumbnail list with Download, and Remove
// for the junk (tick the ones to go, then type "remove" once).
function GuestUploads({ event, onChanged }) {
  const [uploads, setUploads] = useState(null);
  const [picked, setPicked] = useState(() => new Set());
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function load() {
    try {
      const r = await api({ action: "list-uploads", eventId: event.id });
      setUploads(r.uploads || []);
    } catch (err) {
      setMsg(err.message);
      setUploads([]);
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.id]);

  function toggle(id) {
    setPicked((p) => {
      const next = new Set(p);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setConfirming(false);
    setMsg("");
  }

  async function download(u) {
    setMsg("");
    try {
      const r = await api({ action: "download-url", uploadId: u.id });
      const a = document.createElement("a");
      a.href = r.url;
      a.download = u.filename || "";
      a.rel = "noreferrer";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      setMsg(err.message);
    }
  }

  async function removePicked() {
    setBusy(true);
    setMsg("");
    let removed = 0;
    let failed = 0;
    for (const id of picked) {
      try {
        await api({ action: "delete-upload", uploadId: id });
        removed += 1;
      } catch {
        failed += 1;
      }
    }
    setPicked(new Set());
    setConfirming(false);
    await load();
    setMsg(
      `Removed ${removed} upload${removed === 1 ? "" : "s"} ✓` +
        (failed ? ` · ${failed} couldn't be removed — try again` : "")
    );
    setBusy(false);
    onChanged?.();
  }

  if (uploads === null) return <p className="gcard-meta">Loading uploads…</p>;
  if (uploads.length === 0)
    return <p className="gcard-meta">{msg || "Nothing from guests yet."}</p>;
  const n = picked.size;

  return (
    <div className="gmod">
      <ul className="gmod-list">
        {uploads.map((u) => {
          const on = picked.has(u.id);
          return (
            <li key={u.id} className={"gmod-row" + (on ? " is-on" : "")}>
              <span className="gmod-thumb">
                {u.thumbUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={u.thumbUrl} alt="" loading="lazy" />
                ) : (
                  <span aria-hidden="true">▶</span>
                )}
              </span>
              <span className="gmod-main">
                <strong>{u.guestName || "No name given"}</strong>
                <span className="gcard-meta">
                  {KIND_LABEL[u.kind] || u.kind} · {fmtSize(u.bytes)} · {fmtLocal(u.createdAt)}
                </span>
              </span>
              <span className="gmod-actions">
                <button type="button" className="achip" onClick={() => download(u)} disabled={busy}>
                  Download
                </button>
                <button
                  type="button"
                  className={"achip achip-danger" + (on ? " is-on" : "")}
                  aria-pressed={on}
                  onClick={() => toggle(u.id)}
                  disabled={busy}
                >
                  {on ? "Marked ✓" : "Remove"}
                </button>
              </span>
            </li>
          );
        })}
      </ul>
      {n > 0 &&
        (confirming ? (
          <TypedConfirm
            phrase="remove"
            prompt={`Type “remove” to delete ${n} guest upload${n === 1 ? "" : "s"} from “${event.title}” for good.`}
            cta={`Remove ${n} upload${n === 1 ? "" : "s"}`}
            busy={busy}
            onConfirm={removePicked}
            onCancel={() => setConfirming(false)}
          />
        ) : (
          <div className="gmod-bar">
            <button type="button" className="abtn" onClick={() => setConfirming(true)}>
              Remove {n} marked…
            </button>
            <button type="button" className="achip" onClick={() => setPicked(new Set())}>
              Keep them
            </button>
          </div>
        ))}
      {msg && <p className="gcard-meta gmod-msg" role="status">{msg}</p>}
    </div>
  );
}
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }) : "");
const fmtLocal = (d) => (d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/New_York" }) : "");
const SITE = "https://rothmediaco.com";

export default function GuestEventsPanel({ galleries = [] }) {
  const [events, setEvents] = useState(null);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [eventDate, setEventDate] = useState("");
  const [daysOpen, setDaysOpen] = useState(30);
  const [galleryId, setGalleryId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  const [reviewing, setReviewing] = useState(null); // event id whose uploads are listed

  const refresh = () => api({ action: "list" }).then((r) => setEvents(r.events)).catch((e) => setError(e.message));
  useEffect(() => { refresh(); }, []);
  useEffect(() => { if (!slugTouched) setSlug(slugify(title)); }, [title, slugTouched]);

  async function create(e) {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      await api({ action: "create", title, slug, eventDate: eventDate || null, daysOpen, galleryId: galleryId || null });
      setTitle(""); setSlug(""); setSlugTouched(false); setEventDate(""); setGalleryId("");
      await refresh();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  async function copy(text, id) {
    try { await navigator.clipboard.writeText(text); setCopied(id); setTimeout(() => setCopied(""), 2000); }
    catch { window.prompt("Copy:", text); }
  }

  async function setWindow(ev, until, label) {
    try { await api({ action: "set-window", eventId: ev.id, until: until.toISOString() }); await refresh(); setCopied(ev.id + label); setTimeout(() => setCopied(""), 1500); }
    catch (err) { setError(err.message); }
  }

  async function remove(ev) {
    if (!window.confirm(`Delete "${ev.title}" and every guest upload in it? This can't be undone.`)) return;
    try { await api({ action: "delete-event", eventId: ev.id }); await refresh(); } catch (err) { setError(err.message); }
  }


  return (
    <section className="anew guest-admin">
      <h2>Guest Reel</h2>
      <p className="anew-hint">Guests scan a QR on the table, pick from their camera roll, and it lands here. No app. Create the event, print the sign, done.</p>
      <form className="guest-admin-form" onSubmit={create}>
        <label>Event name<input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Matt & April" required maxLength={80} /></label>
        <label>Link<span className="guest-admin-slug">rothmediaco.com/guest/<input value={slug} onChange={(e) => { setSlugTouched(true); setSlug(slugify(e.target.value)); }} required /></span></label>
        <label>Event date<input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} /></label>
        <label>Uploads stay open<select value={daysOpen} onChange={(e) => setDaysOpen(Number(e.target.value))}>
          {[14, 30, 60, 90].map((d) => <option key={d} value={d}>{d} days after</option>)}
        </select></label>
        <label>Attach to their gallery<select value={galleryId} onChange={(e) => setGalleryId(e.target.value)}>
          <option value="">Not yet — I'll attach it later</option>
          {galleries.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
        </select></label>
        <button type="submit" className="abtn" disabled={busy || !title || !slug}>{busy ? "Creating…" : "Create event"}</button>
      </form>
      {error && <p className="cform-error">{error}</p>}

      {events === null ? <p className="portal-empty">Loading…</p> : events.length === 0 ? (
        <p className="portal-empty">No guest events yet.</p>
      ) : (
        <ul className="guest-admin-list">
          {events.map((ev) => {
            const open = new Date(ev.upload_open_until) > new Date();
            const up = `${SITE}/guest/${ev.slug}`;
            const gal = `${SITE}/guest/${ev.slug}/gallery?k=${ev.view_token}`;
            return (
              <li key={ev.id} className="guest-admin-ev">
                <div className="guest-admin-head">
                  <strong>{ev.title}</strong>
                  <span className="gcard-meta">{ev.event_date ? fmtDate(ev.event_date) : "no date"} · {open ? `open until ${fmtLocal(ev.upload_open_until)}` : "closed"}</span>
                  <span className="gcard-meta">{ev.stats.photos} photos · {ev.stats.videos} videos · {ev.stats.messages} messages · {fmtBytes(ev.stats.bytes)}</span>
                  <label className="guest-admin-attach">In their gallery:
                    <select value={ev.gallery_id || ""} onChange={async (e) => { try { await api({ action: "set-gallery", eventId: ev.id, galleryId: e.target.value || null }); await refresh(); } catch (err) { setError(err.message); } }}>
                      <option value="">— not attached —</option>
                      {galleries.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
                    </select>
                  </label>
                </div>
                <div className="gcard-actions">
                  <button type="button" className={"achip" + (copied === ev.id + "u" ? " is-done" : "")} onClick={() => copy(up, ev.id + "u")}>{copied === ev.id + "u" ? "Copied ✓" : "Copy guest link"}</button>
                  <a className="achip" href={`/guest/${ev.slug}/sign`} target="_blank" rel="noreferrer">Print QR sign ↗</a>
                  <a className="achip" href={`/guest/${ev.slug}/gallery?k=${ev.view_token}`} target="_blank" rel="noreferrer">Open gallery ↗</a>
                  <button type="button" className={"achip" + (copied === ev.id + "g" ? " is-done" : "")} onClick={() => copy(gal, ev.id + "g")}>{copied === ev.id + "g" ? "Copied ✓" : "Copy couple's link"}</button>
                  {open ? (
                    <>
                      <button type="button" className="achip" onClick={() => setWindow(ev, new Date(Math.max(Date.now(), new Date(ev.upload_open_until).getTime()) + 30 * 86400000), "x")}>+30 days</button>
                      <button type="button" className="achip" onClick={() => { if (window.confirm(`Close uploads for "${ev.title}" now? Guests will see "uploads are closed"; you can reopen anytime.`)) setWindow(ev, new Date(), "c"); }}>Close uploads</button>
                    </>
                  ) : (
                    <button type="button" className="achip" onClick={() => setWindow(ev, new Date(Date.now() + 30 * 86400000), "r")}>Reopen 30 days</button>
                  )}
                  <button type="button" className={"achip" + (reviewing === ev.id ? " is-on" : "")} aria-expanded={reviewing === ev.id} onClick={() => setReviewing(reviewing === ev.id ? null : ev.id)}>{reviewing === ev.id ? "Hide uploads" : `Review uploads (${ev.stats.photos + ev.stats.videos + ev.stats.messages})`}</button>
                  <button type="button" className="achip achip-danger" onClick={() => remove(ev)}>Delete</button>
                </div>
                {reviewing === ev.id && <GuestUploads event={ev} onChanged={refresh} />}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
