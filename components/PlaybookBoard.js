"use client";

// Studio → Playbook: the reusable library behind every shoot — gear lists,
// shot lists, flows of the day, poses & prompts. Edit in place; everything
// saves as you go. Lists marked "auto" are copied onto new shoots of that
// type; any list can also be pulled into a shoot from its prep section.

import { useEffect, useState } from "react";
import { SECTION_LABEL } from "../lib/shoot-guides";

const SECTIONS = ["gear", "shots", "flow", "poses"];
const KINDS = [["any", "Every shoot"], ["wedding", "Wedding"], ["family", "Family"], ["business", "Business"], ["event", "Event"], ["other", "Other"]];
const KIND_LABEL = Object.fromEntries(KINDS);
const BLURB = {
  gear: "What goes in the bag. The “every shoot” kit plus extras per type.",
  shots: "The frames you don't leave without.",
  flow: "The order of the day. Put times on it once it's on a shoot.",
  poses: "Poses and things to say that get real reactions.",
};
const ADD_HINT = { gear: "Add gear…", shots: "Add a shot…", flow: "Add a step…", poses: "Add a pose or prompt…" };

async function api(payload) {
  const res = await fetch("/api/admin/playbook", { method: payload ? "POST" : "GET", headers: { "Content-Type": "application/json" }, body: payload ? JSON.stringify(payload) : undefined });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
  return json;
}

export default function PlaybookBoard() {
  const [lists, setLists] = useState(null);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState("");
  const [flash, setFlash] = useState("");
  const [section, setSection] = useState("gear");
  const [kind, setKind] = useState("all");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    api().then((r) => { setLists(r.lists); setMissing(Boolean(r.missing)); }).catch((e) => setError(e.message));
    const q = new URLSearchParams(window.location.search).get("s");
    if (SECTIONS.includes(q)) setSection(q);
  }, []);

  const say = (m) => { setFlash(m); setTimeout(() => setFlash(""), 2000); };
  const fail = (e) => { setError(e.message || String(e)); setTimeout(() => setError(""), 6000); };

  async function patch(id, fields, msg = "Saved ✓") {
    // Show the change right away; the server copy replaces it when it lands.
    setLists((ls) => ls.map((l) => (l.id === id ? { ...l, ...fields } : l)));
    try { const r = await api({ action: "update", id, ...fields }); setLists((ls) => ls.map((l) => (l.id === id ? r.list : l))); say(msg); }
    catch (e) { fail(e); api().then((r) => setLists(r.lists)).catch(() => {}); }
  }
  async function create(fields) {
    try { const r = await api({ action: "create", section, ...fields }); setLists((ls) => [...ls, r.list]); setAdding(false); say("List added"); } catch (e) { fail(e); }
  }
  async function duplicate(l) {
    try { const r = await api({ action: "duplicate", id: l.id }); setLists((ls) => [...ls, r.list]); say("Copied — rename it and make it yours"); } catch (e) { fail(e); }
  }
  async function remove(l) {
    if (!window.confirm(`Delete “${l.title}”? Shoots that already used it keep their own copy.`)) return;
    try { await api({ action: "delete", id: l.id }); setLists((ls) => ls.filter((x) => x.id !== l.id)); } catch (e) { fail(e); }
  }

  if (!lists && !error) return <p className="portal-empty">Loading…</p>;
  if (!lists) return <p className="portal-empty">{error}</p>;

  const count = (s) => lists.filter((l) => l.section === s).length;
  const shown = lists.filter((l) => l.section === section && (kind === "all" || l.kind === kind || l.kind === "any"));

  return (
    <div className="pbook">
      {missing && <p className="cform-error">Showing the starter lists, read-only. Run supabase/playbook.sql in Supabase once and they become yours to edit.</p>}
      <div className="pbook-tabs" role="tablist" aria-label="Playbook sections">
        {SECTIONS.map((s) => (
          <button key={s} type="button" role="tab" aria-selected={section === s} className={"pbook-tab" + (section === s ? " is-on" : "")} onClick={() => { setSection(s); setAdding(false); }}>
            <strong>{SECTION_LABEL[s]}</strong><em>{count(s)} {count(s) === 1 ? "list" : "lists"}</em>
          </button>
        ))}
      </div>
      <div className="atoolbar shoots-bar">
        {!missing && <button type="button" className="abtn" onClick={() => setAdding((v) => !v)}>{adding ? "Close" : "+ New list"}</button>}
        <span className="pbook-kinds">
          {[["all", "All types"], ...KINDS.filter(([k]) => k !== "any" && k !== "other")].map(([k, label]) => (
            <button key={k} type="button" className={"ifilter" + (kind === k ? " is-on" : "")} onClick={() => setKind(k)}>{label}</button>
          ))}
        </span>
        {flash && <span className="clients-flash">{flash}</span>}
      </div>
      <p className="gcard-meta">{BLURB[section]}</p>
      {error && <p className="cform-error">{error}</p>}

      {adding && (
        <form className="shoot-new" onSubmit={(e) => { e.preventDefault(); const f = Object.fromEntries(new FormData(e.currentTarget).entries()); create({ title: f.title, kind: f.kind, auto: f.auto === "on", items: [] }); }}>
          <label className="wide">Name<input name="title" required autoFocus placeholder={section === "poses" ? "Engagement session — prompts" : section === "flow" ? "Elopement — run of show" : section === "gear" ? "Drone day" : "Reception must-haves"} /></label>
          <label>For<select name="kind" defaultValue={kind === "all" ? "any" : kind}>{KINDS.map(([k, label]) => <option key={k} value={k}>{label}</option>)}</select></label>
          <label className="pbook-auto"><input type="checkbox" name="auto" /> Copy onto new shoots of this type automatically</label>
          <button type="submit" className="abtn">Add list</button>
        </form>
      )}

      {shown.length === 0 && !adding && <p className="portal-empty">No {SECTION_LABEL[section].toLowerCase()} for that type yet. Hit “+ New list”.</p>}
      <div className="pbook-grid">
        {shown.map((l) => <ListCard key={l.id} l={l} readOnly={missing} onPatch={patch} onDuplicate={duplicate} onRemove={remove} />)}
      </div>
    </div>
  );
}

function ListCard({ l, readOnly, onPatch, onDuplicate, onRemove }) {
  const [text, setText] = useState("");
  const [time, setTime] = useState("");
  const items = l.items || [];
  const isFlow = l.section === "flow";
  const saveItems = (next, msg) => onPatch(l.id, { items: next }, msg);

  function add(e) {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    saveItems([...items, { text: t, ...(time ? { time } : {}) }], "Added");
    setText(""); setTime("");
  }
  function move(i, by) {
    const j = i + by;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    saveItems(next, "Moved");
  }
  const edit = (i, fields) => saveItems(items.map((it, k) => (k === i ? { ...it, ...fields } : it)));

  return (
    <article className="pbook-card">
      <header className="pbook-card-head">
        <input className="pbook-title" key={l.title} defaultValue={l.title} readOnly={readOnly} aria-label="List name" onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== l.title) onPatch(l.id, { title: v }); else e.target.value = l.title; }} />
        <div className="pbook-meta">
          <select className="achip" value={l.kind} disabled={readOnly} aria-label="Shoot type" onChange={(e) => onPatch(l.id, { kind: e.target.value })}>{KINDS.map(([k, label]) => <option key={k} value={k}>{label}</option>)}</select>
          <label className={"achip pbook-autochip" + (l.auto ? " is-done" : "")} title="Copied onto new shoots of this type"><input type="checkbox" checked={Boolean(l.auto)} disabled={readOnly} onChange={(e) => onPatch(l.id, { auto: e.target.checked }, e.target.checked ? "Auto on" : "Auto off")} /> auto</label>
          <span className="gcard-meta">{items.length} {items.length === 1 ? "item" : "items"} · {KIND_LABEL[l.kind]}</span>
        </div>
      </header>

      <ol className={"pbook-items" + (isFlow ? " is-flow" : "")}>
        {items.map((it, i) => (
          <li key={`${i}-${it.text}-${it.time || ""}`}>
            {isFlow ? <input type="time" className="pbook-time" defaultValue={it.time || ""} disabled={readOnly} aria-label="Time" onBlur={(e) => e.target.value !== (it.time || "") && edit(i, { time: e.target.value })} /> : <span className="pbook-n">{i + 1}</span>}
            <input className="pbook-text" defaultValue={it.text} readOnly={readOnly} aria-label={`Item ${i + 1}`} onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== it.text) edit(i, { text: v }); else e.target.value = it.text; }} onKeyDown={(e) => e.key === "Enter" && e.target.blur()} />
            {!readOnly && (
              <span className="pbook-row-actions">
                <button type="button" className="prep-x" aria-label="Move up" title="Move up" disabled={i === 0} onClick={() => move(i, -1)}>↑</button>
                <button type="button" className="prep-x" aria-label="Move down" title="Move down" disabled={i === items.length - 1} onClick={() => move(i, 1)}>↓</button>
                <button type="button" className="prep-x" aria-label={`Remove ${it.text}`} title="Remove" onClick={() => saveItems(items.filter((_, k) => k !== i), "Removed")}>×</button>
              </span>
            )}
          </li>
        ))}
        {items.length === 0 && <li className="prep-empty">Empty — add the first one below.</li>}
      </ol>

      {!readOnly && (
        <form className="prep-add" onSubmit={add}>
          {isFlow && <input type="time" className="pbook-time" value={time} onChange={(e) => setTime(e.target.value)} aria-label="Time (optional)" />}
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder={ADD_HINT[l.section]} aria-label={ADD_HINT[l.section]} />
          <button type="submit" className="achip" disabled={!text.trim()}>+ Add</button>
        </form>
      )}

      <textarea className="shoot-notes pbook-notes" rows={2} key={l.notes} defaultValue={l.notes} readOnly={readOnly} placeholder="Notes — when to use this, what to remember…" onBlur={(e) => e.target.value !== l.notes && onPatch(l.id, { notes: e.target.value })} />

      {!readOnly && (
        <div className="gcard-actions">
          <button type="button" className="achip" onClick={() => onDuplicate(l)}>Duplicate</button>
          <button type="button" className="achip achip-danger" onClick={() => onRemove(l)}>Delete</button>
        </div>
      )}
    </article>
  );
}
