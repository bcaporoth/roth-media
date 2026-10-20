"use client";

// Studio → a client's login. Type the password you want them to have (or
// tap "Suggest one"), save it, then copy or text them their sign-in details.
// The server creates the login if they don't have one and marks it
// confirmed, so email + password works on their very first visit — no
// emailed code. They can change it later from their account page.

import { useState } from "react";
import { isNoEmail } from "../lib/no-email";

const PORTAL = "https://rothmediaco.com/portal";

async function api(payload) {
  const res = await fetch("/api/admin/clients", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
  return json;
}
const fmt = (d) => (d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "");

// Readable, same shape the server makes up: roth-7f3k-m2qa
function suggest() {
  const a = "abcdefghjkmnpqrstuvwxyz23456789";
  const r = (n) => Array.from(crypto.getRandomValues(new Uint32Array(n)), (x) => a[x % a.length]).join("");
  return `roth-${r(4)}-${r(4)}`;
}

export default function ClientLogin({ client, account, onSaved }) {
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(null); // the password just set, shown until dismissed
  const [copied, setCopied] = useState(false);
  const noEmail = isNoEmail(client.email);
  const first = (client.name || "").split(" ")[0];
  const details = (p) =>
    `Hi${first ? ` ${first}` : ""} — your Roth Media login is ready.\n\nGo to ${PORTAL}\nEmail: ${client.email}\nPassword: ${p}\n\nYou can change the password anytime from your account page.`;

  async function save(e) {
    e.preventDefault();
    const p = pw.trim();
    if (p.length < 8) { setError("Make it at least 8 characters."); return; }
    if (account && !window.confirm(`Set a new password for ${client.email}? Their old one stops working.`)) return;
    setBusy(true);
    setError("");
    try {
      const r = await api({ action: "set-password", email: client.email, password: p });
      setDone(r.password);
      setPw("");
      setCopied(false);
      onSaved?.(r.account);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(details(done)); setCopied(true); } catch { window.prompt("Copy:", details(done)); }
  }

  if (noEmail) return <p className="gcard-meta">Add their email first — the login is their email.</p>;

  return (
    <div className="clogin">
      <p className="gcard-meta">
        {account
          ? account.lastSignIn ? `Has a login · last signed in ${fmt(account.lastSignIn)}.` : "Has a login · hasn't signed in yet."
          : "No login yet — the share link works without one."}
        {" "}Pick a password for them and they can sign in at rothmediaco.com/portal straight away.
      </p>

      {done ? (
        <div className="clogin-done" role="status">
          <p><strong>Password set ✓</strong> They sign in with:</p>
          <dl className="clogin-creds">
            <div><dt>Email</dt><dd>{client.email}</dd></div>
            <div><dt>Password</dt><dd><code>{done}</code></dd></div>
          </dl>
          <div className="gcard-actions">
            <button type="button" className="abtn" onClick={copy}>{copied ? "Copied ✓" : "Copy sign-in details"}</button>
            {client.phone && (
              <a className="achip" href={`sms:${client.phone.replace(/[^\d+]/g, "")}&body=${encodeURIComponent(details(done))}`}>Text it</a>
            )}
            <a className="achip" href={`mailto:${client.email}?subject=${encodeURIComponent("Your Roth Media login")}&body=${encodeURIComponent(details(done) + "\n\n— Brandon")}`}>Email it</a>
            <button type="button" className="achip" onClick={() => setDone(null)}>Done</button>
          </div>
        </div>
      ) : (
        <form className="clogin-form" onSubmit={save}>
          <label className="clogin-field">
            {account ? "New password" : "Password"}
            <input
              type="text"
              value={pw}
              onChange={(e) => { setPw(e.target.value); setError(""); }}
              placeholder="8+ characters"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={72}
              disabled={busy}
            />
          </label>
          <div className="gcard-actions">
            <button type="button" className="achip" disabled={busy} onClick={() => { setPw(suggest()); setError(""); }}>Suggest one</button>
            <button type="submit" className="abtn" disabled={busy || pw.trim().length < 8}>
              {busy ? "Saving…" : account ? "Save new password" : "Create login"}
            </button>
          </div>
        </form>
      )}
      {error && <p className="cform-error" role="alert">{error}</p>}
    </div>
  );
}
