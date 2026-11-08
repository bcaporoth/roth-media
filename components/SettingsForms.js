"use client";

// Settings → "Your details" and "Emails from Roth Media" (2026-11-08).
// Both save through /api/portal/settings.

import { useState } from "react";

async function save(patch) {
  const res = await fetch("/api/portal/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error || "That didn't save");
}

export function DetailsForm({ name: name0 = "", phone: phone0 = "", email = "" }) {
  const [name, setName] = useState(name0);
  const [phone, setPhone] = useState(phone0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const changed = name !== name0 || phone !== phone0;
  async function submit(e) {
    e.preventDefault();
    setBusy(true); setMsg("");
    try { await save({ name, phone }); setMsg("Saved."); } catch (x) { setMsg(x.message); } finally { setBusy(false); }
  }
  return (
    <form className="cx-form st-form" onSubmit={submit}>
      <div className="cx-form-row">
        <div className="cx-field"><label className="cx-label" htmlFor="st-name">Full name</label><input className="cx-input" id="st-name" required value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></div>
        <div className="cx-field"><label className="cx-label" htmlFor="st-phone">Phone</label><input className="cx-input" id="st-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" inputMode="tel" /></div>
      </div>
      <div className="cx-field">
        <span className="cx-label">Email</span>
        <p className="st-static">{email}</p>
        <p className="cx-help">This is how you sign in, and how your galleries and payments find you. To change it, text Brandon at 845-549-4425.</p>
      </div>
      <div className="st-row">
        <button type="submit" className="cx-btn cx-btn--light" disabled={busy || !changed}>{busy ? "Saving…" : "Save"}</button>
        {msg && <span className="st-msg" role="status">{msg}</span>}
      </div>
    </form>
  );
}

export function EmailChoice({ on: on0 = true }) {
  const [on, setOn] = useState(on0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  async function flip() {
    const next = !on;
    setBusy(true); setMsg("");
    try { await save({ emails: next }); setOn(next); setMsg(next ? "You'll get them again." : "Done. No more extra emails."); }
    catch (x) { setMsg(x.message); } finally { setBusy(false); }
  }
  return (
    <div className="st-switchrow">
      <button type="button" role="switch" aria-checked={on} className={"st-switch" + (on ? " is-on" : "")} onClick={flip} disabled={busy}>
        <span className="st-knob" aria-hidden="true" />
      </button>
      <div>
        <p className="st-switch-label">{on ? "On: offers and check-ins from Brandon" : "Off: no offers or check-ins"}</p>
        <p className="cx-help">Receipts, &ldquo;your gallery is ready&rdquo; and notes from Brandon always come, either way.</p>
        {msg && <p className="st-msg" role="status">{msg}</p>}
      </div>
    </div>
  );
}
