"use client";

// An address field that helps: type three letters and it offers real
// places (church, shop, street) around the Twin Tiers; pick one and the
// address is filled in clean. Works as a plain <input name=…> in any form
// (FormData sees the value), and as a controlled field via value/onChange.

import { useEffect, useRef, useState } from "react";

export default function AddressInput({ name = "address", value, defaultValue = "", onChange, placeholder = "Start typing a place or address…", onPick, autoFocus = false, className = "" }) {
  const controlled = value !== undefined;
  const [inner, setInner] = useState(defaultValue);
  const text = controlled ? value : inner;
  const [hits, setHits] = useState([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const timer = useRef(null);
  const skip = useRef(false);
  const box = useRef(null);

  function set(v) { if (!controlled) setInner(v); onChange?.(v); }
  useEffect(() => {
    if (skip.current) { skip.current = false; return; }
    const q = (text || "").trim();
    if (q.length < 3) { setHits([]); return; }
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setBusy(true);
      try {
        const r = await fetch(`/api/admin/geo?q=${encodeURIComponent(q)}`).then((x) => x.json());
        setHits(r.hits || []); setOpen(true);
      } catch { setHits([]); } finally { setBusy(false); }
    }, 350);
    return () => clearTimeout(timer.current);
  }, [text]);
  useEffect(() => {
    const away = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, []);
  function pick(h) { skip.current = true; set(h.address); setHits([]); setOpen(false); onPick?.(h); }

  return (
    <div className={"addr" + (className ? ` ${className}` : "")} ref={box}>
      <input name={name} value={text} onChange={(e) => set(e.target.value)} onFocus={() => hits.length && setOpen(true)} placeholder={placeholder} autoComplete="off" autoFocus={autoFocus} aria-autocomplete="list" aria-expanded={open && hits.length > 0} />
      {busy && <span className="addr-busy" aria-hidden="true">…</span>}
      {open && hits.length > 0 && (
        <ul className="addr-list" role="listbox">
          {hits.map((h) => <li key={h.label}><button type="button" role="option" onClick={() => pick(h)}>{h.label}</button></li>)}
        </ul>
      )}
    </div>
  );
}
