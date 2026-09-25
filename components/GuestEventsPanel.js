"use client";

// Studio Admin → Guest Reel: create an event, hand out the QR sign, watch
// uploads land, open the couple's gallery.

import { useEffect, useState } from "react";
import { slugify } from "../lib/guest";

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
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }) : "");

export default function GuestEventsPanel() {
  const [events, setEvents] = useState(null);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [eventDate, setEventDate] = useState("");
  const [daysOpen, setDaysOpen] = useState(30);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  const refresh = () => api({ action: "list" }).then((r) => setEvents(r.events)).catch((e) => setError(e.message));
  useEffect(() => { refresh(); }, []);
  useEffect(() => { if (!slugTouched) setSlug(slugify(title)); }, [title, slugTouched]);

  async function create(e) {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      await api({ action: "create", title, slug, eventDate: eventDate || null, daysOpen });
      setTitle(""); setSlug(""); setSlugTouched(false); setEventDate("");
      await refresh();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  async function copy(text, id) {
    try { await navigator.clipboard.writeText(text); setCopied(id); setTimeout(() => setCopied(""), 2000); }
    catch { window.prompt("Copy:", text); }
  }

  async function remove(ev) {
    if (!window.confirm(`Delete "${ev.title}" and every guest upload in it? This can't be undone.`)) return;
    try { await api({ action: "delete-event", eventId: ev.id }); await refresh(); } catch (err) { setError(err.message); }
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "https://rothmediaco.com";

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
        <button type="submit" className="abtn" disabled={busy || !title || !slug}>{busy ? "Creating…" : "Create event"}</button>
      </form>
      {error && <p className="cform-error">{error}</p>}

      {events === null ? <p className="portal-empty">Loading…</p> : events.length === 0 ? (
        <p className="portal-empty">No guest events yet.</p>
      ) : (
        <ul className="guest-admin-list">
          {events.map((ev) => {
            const open = new Date(ev.upload_open_until) > new Date();
            const up = `${origin}/guest/${ev.slug}`;
            const gal = `${origin}/guest/${ev.slug}/gallery?k=${ev.view_token}`;
            return (
              <li key={ev.id} className="guest-admin-ev">
                <div className="guest-admin-head">
                  <strong>{ev.title}</strong>
                  <span className="gcard-meta">{ev.event_date ? fmtDate(ev.event_date) : "no date"} · {open ? `open until ${fmtDate(ev.upload_open_until)}` : "closed"}</span>
                  <span className="gcard-meta">{ev.stats.photos} photos · {ev.stats.videos} videos · {ev.stats.messages} messages · {fmtBytes(ev.stats.bytes)}</span>
                </div>
                <div className="gcard-actions">
                  <button type="button" className={"achip" + (copied === ev.id + "u" ? " is-done" : "")} onClick={() => copy(up, ev.id + "u")}>{copied === ev.id + "u" ? "Copied ✓" : "Copy guest link"}</button>
                  <a className="achip" href={`/guest/${ev.slug}/sign`} target="_blank" rel="noreferrer">Print QR sign ↗</a>
                  <a className="achip" href={gal} target="_blank" rel="noreferrer">Open gallery ↗</a>
                  <button type="button" className={"achip" + (copied === ev.id + "g" ? " is-done" : "")} onClick={() => copy(gal, ev.id + "g")}>{copied === ev.id + "g" ? "Copied ✓" : "Copy couple's link"}</button>
                  <button type="button" className="achip achip-danger" onClick={() => remove(ev)}>Delete</button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
