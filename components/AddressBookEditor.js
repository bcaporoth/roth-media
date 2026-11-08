"use client";

// Settings → Your addresses (2026-11-08, Brandon: "I can't change this as a
// user"). Add, edit (with the place picker) and remove. Places that came from
// their brief or a shoot day can be edited (copied into their own list) or
// removed (hidden). Saves to /api/portal/addresses after each change.

import { useState } from "react";
import AddressInput from "./AddressInput";
import { addressKey, directionsUrl } from "../lib/client-addresses";

export default function AddressBookEditor({ initial = [], book: book0 = [], hidden: hidden0 = [] }) {
  const [list, setList] = useState(initial); // merged view: { address, label, from, mine }
  const [book, setBook] = useState(book0);
  const [hidden, setHidden] = useState(hidden0);
  const [editing, setEditing] = useState(null); // index in list, or "new"
  const [draft, setDraft] = useState({ label: "", address: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function save(nextBook, nextHidden, nextList, note) {
    setBusy(true); setMsg("");
    try {
      const res = await fetch("/api/portal/addresses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ book: nextBook, hidden: nextHidden }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "That didn't save");
      setBook(j.book); setHidden(j.hidden); setList(nextList); setEditing(null); setMsg(note);
    } catch (e) { setMsg(e.message); } finally { setBusy(false); }
  }

  function startEdit(i) { setEditing(i); setDraft({ label: list[i].label || "", address: list[i].address }); setMsg(""); }
  function startNew() { setEditing("new"); setDraft({ label: "", address: "" }); setMsg(""); }

  function submit(e) {
    e.preventDefault();
    const address = draft.address.replace(/\s+/g, " ").trim();
    if (address.length < 3) { setMsg("Type the address, or pick it from the list."); return; }
    const entry = { label: draft.label.trim(), address };
    if (editing === "new") {
      const nextBook = [entry, ...book.filter((b) => addressKey(b.address) !== addressKey(address))];
      const nextList = [{ ...entry, from: ["Saved in Settings"], mine: true }, ...list.filter((x) => addressKey(x.address) !== addressKey(address))];
      return save(nextBook, hidden.filter((h) => h !== addressKey(address)), nextList, "Added.");
    }
    const old = list[editing];
    const nextBook = old.mine
      ? book.map((b) => (addressKey(b.address) === addressKey(old.address) ? entry : b))
      : [entry, ...book];
    // Editing a place from the brief or a shoot day: theirs replaces it here.
    const nextHidden = !old.mine && addressKey(old.address) !== addressKey(address) ? [...hidden, addressKey(old.address)] : hidden;
    const nextList = list.map((x, i) => (i === editing ? { ...entry, from: ["Saved in Settings"], mine: true } : x));
    save(nextBook, nextHidden, nextList, "Saved.");
  }

  function remove(i) {
    const x = list[i];
    const key = addressKey(x.address);
    const nextBook = book.filter((b) => addressKey(b.address) !== key);
    // A place from the brief or a shoot day would come back on its own, so hide it.
    const nextHidden = x.mine && !x.from.some((f) => f !== "Saved in Settings") ? hidden : [...new Set([...hidden, key])];
    save(nextBook, nextHidden, list.filter((_, j) => j !== i), "Removed.");
  }

  const form = (
    <form className="ab-form" onSubmit={submit}>
      <label className="cx-field"><span className="cx-label">Name <small>optional</small></span><input className="cx-input" value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} placeholder="The shop · Home · The farm" maxLength={60} /></label>
      <div className="cx-field"><span className="cx-label">Address</span>
        <AddressInput endpoint="/api/portal/geo" className="mx-addr" inputClassName="cx-input" value={draft.address} onChange={(v) => setDraft((d) => ({ ...d, address: v }))} placeholder="Start typing the place or address…" />
      </div>
      <div className="st-row">
        <button type="submit" className="cx-btn cx-btn--light" disabled={busy}>{busy ? "Saving…" : "Save"}</button>
        <button type="button" className="cx-btn cx-btn--ghost" onClick={() => { setEditing(null); setMsg(""); }}>Cancel</button>
      </div>
    </form>
  );

  return (
    <div className="ab">
      {list.length === 0 && editing !== "new" && <p className="cx-help">None yet. Add the places we shoot: your shop, your home, a favorite spot.</p>}
      <ul className="st-list">
        {list.map((a, i) => (
          <li key={a.address + i}>
            {editing === i ? form : (
              <>
                <span><strong>{a.label ? `${a.label} · ` : ""}{a.address}</strong><em>{a.from.join(" · ")}</em></span>
                <span className="ab-acts">
                  <a className="cx-link" href={directionsUrl(a.address)} target="_blank" rel="noopener noreferrer">Map</a>
                  <button type="button" className="achip" onClick={() => startEdit(i)} disabled={busy}>Edit</button>
                  <button type="button" className="achip achip-danger" onClick={() => remove(i)} disabled={busy}>Remove</button>
                </span>
              </>
            )}
          </li>
        ))}
      </ul>
      {editing === "new" ? form : <button type="button" className="cx-btn cx-btn--ghost st-btn" onClick={startNew} disabled={busy || editing !== null}>+ Add an address</button>}
      {msg && <p className="st-msg" role="status">{msg}</p>}
    </div>
  );
}
