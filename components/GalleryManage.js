"use client";

// Studio → Galleries: the one "Manage" drawer on each gallery card. Everything
// that used to be its own expander (Edit gallery, Set cover, Design, Premiere,
// Ask for a review) lives here as a tab, plus: add photos (into a chosen
// album), Photos & albums (see the gallery as the client does, select photos,
// move them between albums or remove them), It's ready (send now), Send it
// later (same email at a time Brandon picks), delete the gallery.

import { useEffect, useRef, useState } from "react";
import AdminUploader from "./AdminUploader";
import CoverPicker from "./CoverPicker";
import GalleryEditPanel from "./GalleryEditPanel";
import GalleryPhotos from "./GalleryPhotos";
import DesignPanel from "./DesignPanel";
import PremierePanel from "./PremierePanel";
import ReviewButton from "./ReviewButton";
import TypedConfirm from "./TypedConfirm";
import { isNoEmail } from "../lib/no-email";
import { readyEmail } from "../lib/ready-email";

async function api(payload) {
  const res = await fetch("/api/admin/gallery", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
  return json;
}

const TABS = [
  { key: "edit", label: "Edit" },
  { key: "cover", label: "Cover" },
  { key: "design", label: "Design" },
  { key: "premiere", label: "Premiere" },
  { key: "add", label: "+ Add photos" },
  { key: "photos", label: "Photos & albums" },
  { key: "ready", label: "It's ready ✉" },
  { key: "later", label: "Send it later 🕓" },
  { key: "delete", label: "Delete", danger: true },
];

// Design and Premiere keep their own open/close button. Inside the drawer the
// tab IS that button, so the panel is opened once on mount and its own toggle
// is tucked away — only after the open actually happened.
function AutoOpen({ children }) {
  const ref = useRef(null);
  const clicked = useRef(false);
  const [opened, setOpened] = useState(false);
  useEffect(() => {
    if (clicked.current) return;
    const btn = ref.current?.querySelector(".cover-picker-toggle");
    if (btn) {
      clicked.current = true;
      btn.click();
      setOpened(true);
    }
  }, []);
  return (
    <div ref={ref} className={"gmanage-auto" + (opened ? " is-auto" : "")}>
      {children}
    </div>
  );
}

// "It's ready": one button that emails the owner (and everyone added to the
// gallery) a link that lands on the album — through sign-in for people with
// a login, through one-time-code setup for people without one.
const when = (iso) => (iso ? new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "");
function GalleryReady({ gallery, onChanged }) {
  const [data, setData] = useState(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [msg, setMsg] = useState("");
  const [sentAt, setSentAt] = useState(gallery.readySentAt || null);

  useEffect(() => {
    api({ action: "detail", galleryId: gallery.id })
      .then(setData)
      .catch((e) => setMsg(e.message));
  }, [gallery.id]);

  if (!data) return <p className="cover-picker-hint">{msg || "Loading…"}</p>;

  const seen = new Set();
  const people = [{ name: data.gallery.ownerName, email: data.gallery.ownerEmail }, ...data.members]
    .map((p) => ({ name: p.name || "", email: String(p.email || "").trim().toLowerCase() }))
    .filter((p) => p.email && !isNoEmail(p.email) && !seen.has(p.email) && seen.add(p.email));
  const first = people[0];
  const preview = first
    ? readyEmail({ name: first.name, email: first.email, gallery: { id: gallery.id, title: gallery.title, share_token: gallery.share_token }, hasLogin: true, note })
    : null;

  async function send() {
    setBusy(true);
    setMsg("");
    setResult(null);
    try {
      const r = await api({ action: "send-ready", galleryId: gallery.id, note });
      setResult(r);
      if (r.results.some((x) => x.sent)) setSentAt(r.sentAt);
      if (!r.recorded) setMsg("Sent — but the sent time isn't being saved yet: run supabase/ready.sql once in the Supabase SQL editor.");
      onChanged?.();
    } catch (e) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="gready">
      {people.length === 0 ? (
        <p className="cover-picker-hint">Nobody on this gallery has an email yet — add one under Edit first.</p>
      ) : (
        <>
          <p className="cover-picker-hint">
            Emails {people.length === 1 ? "the owner" : `${people.length} people`} a button that opens this album. Someone with a login signs in and lands on it; someone brand new sets up their login first (one code, one password), then lands on it. The share link rides along too.
          </p>
          <ul className="gready-to">
            {people.map((p) => (
              <li key={p.email}><strong>{p.name || p.email}</strong>{p.name ? <em> · {p.email}</em> : null}</li>
            ))}
          </ul>
          <label className="gready-note">
            <span>Add a line, in your words (optional)</span>
            <textarea rows={2} maxLength={600} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Goes right under “Your album is ready.”" />
          </label>
          {preview && (
            <details className="gready-preview">
              <summary>Preview the email</summary>
              <p className="gready-subject"><strong>Subject:</strong> {preview.subject}</p>
              <pre>{preview.text}</pre>
            </details>
          )}
          <div className="gfiles-bar gready-bar">
            <button type="button" className="abtn" disabled={busy} onClick={send}>
              {busy ? "Sending…" : sentAt ? `Send again to ${people.length}` : `Send to ${people.length} ${people.length === 1 ? "person" : "people"}`}
            </button>
            {sentAt && <span className="cover-picker-hint">Last sent {when(sentAt)}</span>}
          </div>
          {result && (
            <ul className="gready-results" role="status">
              {result.results.map((r) => (
                <li key={r.to} className={r.sent ? "" : "is-failed"}>
                  {r.sent ? "✓" : "✕"} {r.name || r.to}{r.name ? ` (${r.to})` : ""} — {r.sent ? (r.hasLogin ? "has a login, lands on the album" : "no login yet, sets one up first") : r.error}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      {msg && <p className="cover-picker-hint gfiles-msg" role="status">{msg}</p>}
    </div>
  );
}

// "Send it later": the same email as It's ready, written now, sent at the
// moment Brandon picks. Stored on the gallery; /api/cron/ready sends it
// (checks every 5 minutes, so it lands within a few minutes of the time).
const whenFull = (iso) => (iso ? new Date(iso).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "");
// <input type="datetime-local"> wants local wall time, "YYYY-MM-DDTHH:MM".
function toLocalInput(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
function defaultLater() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0); // tomorrow, 9:00 AM
  return toLocalInput(d);
}
function GalleryLater({ gallery, onChanged }) {
  const [data, setData] = useState(null);
  const [at, setAt] = useState(defaultLater);
  const [note, setNote] = useState(gallery.readyScheduledNote || "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [scheduled, setScheduled] = useState(gallery.readyScheduledAt || null);
  const [scheduledNote, setScheduledNote] = useState(gallery.readyScheduledNote || "");

  useEffect(() => {
    api({ action: "detail", galleryId: gallery.id })
      .then(setData)
      .catch((e) => setMsg(e.message));
  }, [gallery.id]);

  if (!data) return <p className="cover-picker-hint">{msg || "Loading…"}</p>;

  const seen = new Set();
  const people = [{ name: data.gallery.ownerName, email: data.gallery.ownerEmail }, ...data.members]
    .map((p) => ({ name: p.name || "", email: String(p.email || "").trim().toLowerCase() }))
    .filter((p) => p.email && !isNoEmail(p.email) && !seen.has(p.email) && seen.add(p.email));
  const first = people[0];
  const preview = first
    ? readyEmail({ name: first.name, email: first.email, gallery: { id: gallery.id, title: gallery.title, share_token: gallery.share_token }, hasLogin: true, note })
    : null;
  const picked = at ? new Date(at) : null;
  const tooSoon = !picked || Number.isNaN(picked.getTime()) || picked.getTime() < Date.now() + 60_000;

  async function schedule() {
    setBusy(true);
    setMsg("");
    try {
      const r = await api({ action: "schedule-ready", galleryId: gallery.id, at: picked.toISOString(), note });
      setScheduled(r.scheduledAt);
      setScheduledNote(r.note || "");
      onChanged?.();
    } catch (e) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function cancel() {
    setBusy(true);
    setMsg("");
    try {
      await api({ action: "cancel-ready", galleryId: gallery.id });
      setScheduled(null);
      setScheduledNote("");
      onChanged?.();
    } catch (e) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (people.length === 0)
    return <p className="cover-picker-hint">Nobody on this gallery has an email yet — add one under Edit first.</p>;

  return (
    <div className="gready glater">
      {scheduled ? (
        <div className="glater-set" role="status">
          <p className="glater-when">
            <span className="glater-dot" aria-hidden="true" />
            Going out <strong>{whenFull(scheduled)}</strong> to {people.length === 1 ? (people[0].name || people[0].email) : `${people.length} people`}.
          </p>
          {scheduledNote ? <p className="glater-note">“{scheduledNote}”</p> : <p className="cover-picker-hint">No extra line — just “Your album is ready.”</p>}
          <p className="cover-picker-hint">Sends within about 5 minutes of that time. Set a new time below to replace it, or cancel.</p>
          <div className="gfiles-bar gready-bar">
            <button type="button" className="achip" disabled={busy} onClick={cancel}>{busy ? "…" : "Cancel the send"}</button>
          </div>
        </div>
      ) : (
        <p className="cover-picker-hint">
          Same email as It&apos;s ready — write it now, pick the moment, and it goes out then. Good for landing in their inbox at 9 AM instead of 1 AM.
        </p>
      )}
      <ul className="gready-to">
        {people.map((p) => (
          <li key={p.email}><strong>{p.name || p.email}</strong>{p.name ? <em> · {p.email}</em> : null}</li>
        ))}
      </ul>
      <label className="gready-note glater-at">
        <span>Send on</span>
        <input type="datetime-local" value={at} min={toLocalInput(new Date())} onChange={(e) => setAt(e.target.value)} />
        {picked && !Number.isNaN(picked.getTime()) && <small>{whenFull(picked.toISOString())} — your time</small>}
      </label>
      <label className="gready-note">
        <span>Add a line, in your words (optional)</span>
        <textarea rows={2} maxLength={600} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Goes right under “Your album is ready.”" />
      </label>
      {preview && (
        <details className="gready-preview">
          <summary>Preview the email</summary>
          <p className="gready-subject"><strong>Subject:</strong> {preview.subject}</p>
          <pre>{preview.text}</pre>
        </details>
      )}
      <div className="gfiles-bar gready-bar">
        <button type="button" className="abtn" disabled={busy || tooSoon} title={tooSoon ? "Pick a time at least a minute from now" : ""} onClick={schedule}>
          {busy ? "Saving…" : scheduled ? "Replace with this time" : `Schedule for ${people.length} ${people.length === 1 ? "person" : "people"}`}
        </button>
      </div>
      {msg && <p className="cover-picker-hint gfiles-msg" role="status">{msg}</p>}
    </div>
  );
}

function GalleryDelete({ gallery, onDeleted }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [gone, setGone] = useState(false);

  async function destroy(typed) {
    setBusy(true);
    setMsg("");
    try {
      await api({ action: "delete-gallery", galleryId: gallery.id, confirmTitle: typed });
      setGone(true);
      onDeleted?.();
    } catch (e) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (gone)
    return (
      <p className="cover-picker-hint" role="status">
        “{gallery.title}” is deleted. This card will disappear when the page refreshes.
      </p>
    );

  const count = gallery.media_count || 0;
  return (
    <div className="gdelete">
      <p className="gdelete-warn">
        <strong>This deletes the whole gallery for good.</strong> “{gallery.title}” —{" "}
        {count} {count === 1 ? "item" : "items"}, every file stored for it, and its share link
        {gallery.clientName || gallery.clientEmail
          ? ` — disappears for ${gallery.clientName || gallery.clientEmail} too`
          : ""}
        . There is no undo, so keep your own copy of the files first.
      </p>
      <TypedConfirm
        phrase={gallery.title}
        prompt="Type the gallery title to confirm:"
        cta="Delete gallery forever"
        busy={busy}
        onConfirm={destroy}
      />
      {msg && <p className="cform-error" role="alert">{msg}</p>}
    </div>
  );
}

export default function GalleryManage({ gallery, open, onChanged, askDelete }) {
  const [tab, setTab] = useState("edit");
  // Tabs stay mounted once visited (just hidden), so switching tabs or
  // closing the drawer never interrupts an upload in progress.
  const [visited, setVisited] = useState(() => new Set(["edit"]));
  const [ver, setVer] = useState(0); // bumps when files were added → Photos tab reloads
  // Album the uploader is pointed at ("" = top of gallery); set by the
  // "+ Add photos" button on an album heading in Photos & albums.
  const [addAlbum, setAddAlbum] = useState(null);
  const everOpen = useRef(false);
  // The card's Delete chip opens the drawer straight on the Delete tab.
  useEffect(() => {
    if (!askDelete) return;
    setTab("delete");
    setVisited((v) => (v.has("delete") ? v : new Set(v).add("delete")));
  }, [askDelete]);
  if (open) everOpen.current = true;
  if (!everOpen.current) return null;

  const g = gallery;
  const show = (key) => {
    setTab(key);
    setVisited((v) => (v.has(key) ? v : new Set(v).add(key)));
  };
  const pane = (key, node) =>
    visited.has(key) ? (
      <div className="gmanage-pane" hidden={tab !== key} key={key}>
        {node}
      </div>
    ) : null;

  return (
    <div className="gmanage" hidden={!open} id={`gmanage-${g.id}`}>
      <div className="gmanage-tabs" role="tablist" aria-label={`Manage ${g.title}`}>
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            className={
              "achip gmanage-tab" + (tab === t.key ? " is-on" : "") + (t.danger ? " achip-danger" : "")
            }
            onClick={() => show(t.key)}
          >
            {t.label}
          </button>
        ))}
        <ReviewButton galleryId={g.id} clientEmail={isNoEmail(g.clientEmail) ? "" : g.clientEmail} requestedAt={g.reviewRequestedAt} />
      </div>
      <div className="gmanage-body">
        {pane(
          "edit",
          <GalleryEditPanel galleryId={g.id} embedded onSaved={() => window.location.reload()} />
        )}
        {pane("cover", <CoverPicker galleryId={g.id} cover={g.cover_filename} embedded />)}
        {pane(
          "design",
          <AutoOpen>
            <DesignPanel galleryId={g.id} design={g.design} shareToken={g.share_token} title={g.title} />
          </AutoOpen>
        )}
        {pane(
          "premiere",
          <AutoOpen>
            <PremierePanel galleryId={g.id} />
          </AutoOpen>
        )}
        {pane(
          "add",
          <div className="gmanage-add">
            <p className="cover-picker-hint">
              Add to “{g.title}” — same gallery, same link. Pick which album they go in below;
              you can always move them later under Photos &amp; albums.
            </p>
            <AdminUploader
              gallery={{ id: g.id, title: g.title, shareToken: g.share_token }}
              album={addAlbum}
              onDone={() => {
                setVer((v) => v + 1);
                onChanged?.();
              }}
            />
          </div>
        )}
        {pane(
          "photos",
          <GalleryPhotos
            key={ver}
            gallery={g}
            onChanged={onChanged}
            onAddTo={(album) => {
              setAddAlbum(album);
              show("add");
            }}
          />
        )}
        {pane("ready", <GalleryReady gallery={g} onChanged={onChanged} />)}
        {pane("later", <GalleryLater gallery={g} onChanged={onChanged} />)}
        {pane("delete", <GalleryDelete gallery={g} onDeleted={onChanged} />)}
      </div>
    </div>
  );
}
