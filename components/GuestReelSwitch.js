"use client";
// Guest Reel for ONE gallery: an on/off switch on the gallery's own page.
// 2026-11-18, Brandon: the "◎ Guest Reel" button on the Galleries toolbar was
// "very out of place… it should be a toggle… a thing I allow when making the
// gallery or edit afterward". On = guests can scan a QR and add their own
// photos to this gallery. Off = uploads close; nothing they sent is removed.
import { useEffect, useState } from "react";
import { GuestUploads } from "./GuestEventsPanel";

const SITE = "https://rothmediaco.com";
const fmtLocal = (d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/New_York" });

async function api(payload) {
  const res = await fetch("/api/admin/guest", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
  return json;
}

export default function GuestReelSwitch({ galleryId }) {
  const [ev, setEv] = useState(undefined); // undefined = loading, null = never turned on
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  const [reviewing, setReviewing] = useState(false);

  const load = (action = "for-gallery") => api({ action, galleryId }).then((r) => setEv(r.event || null));
  useEffect(() => {
    load().catch((e) => { setError(e.message); setEv(null); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [galleryId]);

  const on = Boolean(ev) && new Date(ev.upload_open_until).getTime() > Date.now();
  const sent = ev ? ev.stats.photos + ev.stats.videos + ev.stats.messages : 0;

  async function flip(next) {
    setBusy(true); setError("");
    try { await load(next ? "enable" : "disable"); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  async function addDays() {
    setBusy(true); setError("");
    try {
      await api({ action: "set-window", eventId: ev.id, until: new Date(new Date(ev.upload_open_until).getTime() + 30 * 86400000).toISOString() });
      await load();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  async function copy(text, id) {
    try { await navigator.clipboard.writeText(text); setCopied(id); setTimeout(() => setCopied(""), 2000); }
    catch { window.prompt("Copy:", text); }
  }

  const up = ev ? `${SITE}/guest/${ev.slug}` : "";
  const gal = ev ? `${SITE}/guest/${ev.slug}/gallery?k=${ev.view_token}` : "";

  return (
    <section className={"grbox" + (on ? " is-on" : "")} aria-label="Guest Reel">
      <label className="grswitch">
        <input type="checkbox" role="switch" checked={on} disabled={busy || ev === undefined} onChange={(e) => flip(e.target.checked)} />
        <span className="grswitch-track" aria-hidden="true" />
        <span className="grswitch-text">
          <strong>Guest Reel {ev === undefined ? "…" : busy ? "saving…" : on ? "on" : "off"}</strong>
          <span>
            {on
              ? `Guests can scan the QR code and add their own photos and videos. Open until ${fmtLocal(ev.upload_open_until)}.`
              : ev
                ? "Guests cannot add photos right now. What they already sent is kept."
                : "Turn this on to let guests scan a QR code and add their own photos and videos to this gallery."}
          </span>
        </span>
      </label>
      {error && <p className="cform-error" role="status">{error}</p>}
      {ev && (
        <>
          <p className="gcard-meta grbox-stats">From guests so far: {ev.stats.photos} photos · {ev.stats.videos} videos · {ev.stats.messages} video messages</p>
          <div className="gcard-actions grbox-actions">
            {on && <a className="achip" href={`/guest/${ev.slug}/sign`} target="_blank" rel="noreferrer">Print QR sign ↗</a>}
            {on && <button type="button" className={"achip" + (copied === "u" ? " is-done" : "")} onClick={() => copy(up, "u")}>{copied === "u" ? "Copied ✓" : "Copy guest link"}</button>}
            <a className="achip" href={`/guest/${ev.slug}/gallery?k=${ev.view_token}`} target="_blank" rel="noreferrer">Open guests' photos ↗</a>
            <button type="button" className={"achip" + (copied === "g" ? " is-done" : "")} onClick={() => copy(gal, "g")}>{copied === "g" ? "Copied ✓" : "Copy client's link"}</button>
            {on && <button type="button" className="achip" disabled={busy} onClick={addDays}>+30 days</button>}
            {sent > 0 && <button type="button" className={"achip" + (reviewing ? " is-on" : "")} aria-expanded={reviewing} onClick={() => setReviewing(!reviewing)}>{reviewing ? "Hide uploads" : `Review uploads (${sent})`}</button>}
          </div>
          {reviewing && <div className="guest-admin"><GuestUploads event={ev} onChanged={() => load().catch(() => {})} /></div>}
        </>
      )}
    </section>
  );
}
