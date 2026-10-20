"use client";

// Notes with Brandon — the one running thread between a client and Brandon.
// Same component on the client's portal home (role="client") and on their
// Studio profile (role="brandon"). Not a chat: a log you both see, with an
// email carrying each note to the other side. Opening it marks the other
// side's notes as seen.

import { useEffect, useRef, useState } from "react";

async function api(payload) {
  const res = await fetch("/api/notes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
  return json;
}
const when = (iso) => new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export default function NotesThread({ role, clientId = null, clientName = "", compact = false }) {
  const [notes, setNotes] = useState(null);
  const [ready, setReady] = useState(true);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const endRef = useRef(null);
  const me = role === "brandon" ? "brandon" : "client";
  const who = (w) => (w === "brandon" ? "Brandon" : clientName.split(" ")[0] || "You");

  async function load() {
    try { const r = await api({ action: "list", clientId }); setNotes(r.notes); setReady(r.ready); } catch (e) { setMsg(e.message); setNotes([]); }
  }
  useEffect(() => { load(); const t = setInterval(() => { if (document.visibilityState === "visible") load(); }, 45000); return () => clearInterval(t); }, [clientId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { endRef.current?.scrollIntoView?.({ block: "nearest" }); }, [notes?.length]);

  async function send(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true); setMsg("");
    try {
      const r = await api({ action: "post", clientId, text });
      setNotes((n) => [...(n || []), r.note]);
      setText("");
      setMsg(r.emailed ? (me === "brandon" ? `Sent — they got an email with it.` : "Sent — Brandon got an email with it.") : "Saved.");
      setTimeout(() => setMsg(""), 4000);
    } catch (err) { setMsg(err.message); } finally { setBusy(false); }
  }

  if (notes === null) return <p className="nt-hint">Loading…</p>;
  if (!ready) return <p className="nt-hint">{me === "brandon" ? "Run supabase/client-notes.sql once in the Supabase SQL editor to turn notes on." : "Notes aren't switched on yet — text me in the meantime."}</p>;

  return (
    <div className={"nt" + (compact ? " is-compact" : "")}>
      {notes.length === 0 && (
        <p className="nt-hint">
          {me === "brandon"
            ? `Nothing yet. Anything you write here lands in ${clientName.split(" ")[0] || "their"} portal and their inbox, in your words.`
            : "Ask anything, any time — a date, a swap, an idea. Brandon gets an email the moment you send it and answers here."}
        </p>
      )}
      <ul className="nt-list">
        {notes.map((n) => (
          <li key={n.id} className={"nt-msg is-" + n.who + (n.who === me ? " is-me" : "")}>
            <span className="nt-who">{n.who === me ? "You" : who(n.who)} <em>{when(n.created_at)}</em></span>
            <p>{n.text}</p>
          </li>
        ))}
        <li ref={endRef} aria-hidden="true" />
      </ul>
      <form className="nt-form" onSubmit={send}>
        <textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} maxLength={4000} placeholder={me === "brandon" ? `A note for ${clientName.split(" ")[0] || "them"}…` : "A note for Brandon…"} onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") send(e); }} />
        <div className="nt-actions">
          <button type="submit" className="abtn" disabled={busy || !text.trim()}>{busy ? "Sending…" : "Send"}</button>
          {msg && <span className="nt-status" role="status">{msg}</span>}
        </div>
      </form>
    </div>
  );
}
