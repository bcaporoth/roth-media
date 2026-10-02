"use client";

// Studio Admin → each gallery card: "Edit album" — rename, set the date, change
// who owns it, and add the extra people (spouse, parents) who should see it in
// their own portal login.

import { useState } from "react";

async function api(path, payload) {
  const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
  return json;
}

export default function GalleryEditPanel({ galleryId, onSaved }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberName, setMemberName] = useState("");

  // What the access invite did: "Invite sent to x ✓", or why it didn't go.
  const inviteMsg = (invite, fallback) => {
    if (!invite) return fallback;
    if (invite.sent) return `${fallback} · Invite sent to ${invite.to} ✓`;
    if (invite.skipped === "admin") return `${fallback} · No invite (that's your own address)`;
    return `${fallback} · ${invite.error || "Invite not sent"}`;
  };

  async function load() {
    try { const r = await api("/api/admin/gallery", { action: "detail", galleryId }); setData(r); setMsg(""); }
    catch (err) { setMsg(err.message); }
  }
  async function toggle() { if (!open && !data) await load(); setOpen((o) => !o); }

  async function save(e) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget).entries());
    setBusy(true); setMsg("");
    try {
      const r = await api("/api/admin/gallery", { action: "update", galleryId, title: f.title, eventDate: f.eventDate, ownerEmail: f.ownerEmail, ownerName: f.ownerName });
      setMsg(inviteMsg(r.invite, "Saved ✓")); await load(); onSaved?.();
    } catch (err) { setMsg(err.message); } finally { setBusy(false); }
  }
  async function addMember(e) {
    e.preventDefault();
    if (!memberEmail) return;
    setBusy(true); setMsg("");
    try {
      const r = await api("/api/admin/clients", { action: "add-member", galleryId, email: memberEmail, name: memberName });
      setMemberEmail(""); setMemberName(""); setMsg(r.isNew ? inviteMsg(r.invite, "Added ✓") : "Already on this album — nothing sent"); await load();
    } catch (err) { setMsg(err.message); } finally { setBusy(false); }
  }
  async function removeMember(m) {
    if (!window.confirm(`Remove ${m.name || m.email} from this album?`)) return;
    try { await api("/api/admin/clients", { action: "remove-member", galleryId, clientId: m.id }); await load(); }
    catch (err) { setMsg(err.message); }
  }

  return (
    <div className="cover-picker gedit">
      <button type="button" className="cover-picker-toggle" onClick={toggle}>{open ? "Close" : "Edit album"}</button>
      {open && (
        <div className="cover-picker-panel gedit-panel">
          {!data ? <p className="portal-empty">{msg || "Loading…"}</p> : (
            <>
              <form className="gedit-form" onSubmit={save} key={`${data.gallery.title}-${data.gallery.event_date}-${data.gallery.ownerEmail}`}>
                <label>Album title<input name="title" defaultValue={data.gallery.title} required maxLength={120} /></label>
                <label>Event date<input name="eventDate" type="date" defaultValue={data.gallery.event_date || ""} /></label>
                <label>Owner email<input name="ownerEmail" type="email" defaultValue={data.gallery.ownerEmail} required /></label>
                <label>Owner name<input name="ownerName" defaultValue={data.gallery.ownerName} maxLength={80} /></label>
                <p className="gcard-meta gedit-hint">The owner sees this album when they log in. Changing the email moves it to that person (added to your roster if new) and emails them an invite with the share link and login setup.</p>
                <button type="submit" className="abtn" disabled={busy}>{busy ? "Saving…" : "Save changes"}</button>
              </form>

              <div className="kick-sm">Who else can see it</div>
              {data.members.length === 0 ? <p className="gcard-meta">Just the owner so far.</p> : (
                <ul className="client-members">
                  {data.members.map((m) => (
                    <li key={m.id}><span>{m.name || m.email}{m.name ? <em> · {m.email}</em> : null}</span><button type="button" className="achip achip-danger" onClick={() => removeMember(m)}>Remove</button></li>
                  ))}
                </ul>
              )}
              <form className="gedit-add" onSubmit={addMember}>
                <input type="email" placeholder="their@email.com" value={memberEmail} onChange={(e) => setMemberEmail(e.target.value)} required />
                <input placeholder="Name (optional)" value={memberName} onChange={(e) => setMemberName(e.target.value)} />
                <button type="submit" className="achip" disabled={busy}>+ Add someone</button>
              </form>
              <p className="gcard-meta gedit-hint">New people get an email right away: the share link (no login) plus steps to set up their own portal login. The share link works for anyone without a login.</p>
              {msg && <p className="gcard-meta gedit-msg">{msg}</p>}
            </>
          )}
        </div>
      )}
    </div>
  );
}
