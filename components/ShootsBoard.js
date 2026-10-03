"use client";

// Studio → Shoots: Brandon's itinerary. Every job with a date, a place, how
// far it is, when the sun sets there, a checklist from the guide for that
// kind of shoot, and notes. New shoots can be spun up from a lead in the
// inbox (address + date pulled from the form).

import { useEffect, useMemo, useState } from "react";
import { sunsetLocal, resolveTimeNote, shiftTime, fmt12 } from "../lib/sun";
import { mapsUrl, HOME } from "../lib/geo";

async function api(payload) {
  const res = await fetch("/api/admin/shoots", { method: payload ? "POST" : "GET", headers: { "Content-Type": "application/json" }, body: payload ? JSON.stringify(payload) : undefined });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
  return json;
}

const KIND_LABEL = { wedding: "Wedding", family: "Family", business: "Business", event: "Event", other: "Other" };
const STATUS_LABEL = { planned: "Planned", confirmed: "Confirmed", done: "Done", cancelled: "Cancelled" };
const fmtDate = (d) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : "No date yet");
const daysOut = (d) => (d ? Math.round((new Date(`${d}T12:00:00`) - new Date()) / 86400000) : null);

// Everything time-related for one shoot, derived on the client.
function timing(s) {
  const sunset = s.lat && s.lng && s.date ? sunsetLocal(s.lat, s.lng, s.date) : s.date ? sunsetLocal(HOME.lat, HOME.lng, s.date) : null;
  const start = s.start_time || resolveTimeNote(s.time_note, sunset) || "";
  const leave = start && s.drive_min ? shiftTime(start, -(s.drive_min + 20)) : "";
  return { sunset, golden: sunset ? shiftTime(sunset, -60) : "", start, leave, resolved: !s.start_time && Boolean(start) };
}

export default function ShootsBoard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState("");
  const [showPast, setShowPast] = useState(false);

  const [prefill, setPrefill] = useState(null);
  const refresh = () => api().then(setData).catch((e) => setError(e.message));
  useEffect(() => {
    refresh();
    // From a client profile: ?new=1&name=&email=&phone=&kind= opens the form filled in.
    const q = new URLSearchParams(window.location.search);
    if (q.get("new") === "1") {
      setPrefill({ client_name: q.get("name") || "", client_email: q.get("email") || "", client_phone: q.get("phone") || "", kind: q.get("kind") || "" });
      setShowNew(true);
      window.history.replaceState(null, "", "/portal/admin/shoots");
    }
  }, []);

  const say = (m) => { setFlash(m); setTimeout(() => setFlash(""), 2500); };
  const shoots = data?.shoots || [];
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = shoots.filter((s) => !s.date || s.date >= today).filter((s) => s.status !== "cancelled" && s.status !== "done");
  const past = shoots.filter((s) => (s.date && s.date < today) || s.status === "done" || s.status === "cancelled").reverse();
  const open = shoots.find((s) => s.id === openId) || null;

  async function create(fields) {
    setBusy(true); setError("");
    try { const r = await api({ action: "create", ...fields }); await refresh(); setShowNew(false); setOpenId(r.shoot.id); say(r.shoot.lat ? `Added — ${r.shoot.miles} mi from home` : "Added"); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function update(id, fields, msg = "Saved ✓") {
    setBusy(true); setError("");
    try { await api({ action: "update", id, ...fields }); await refresh(); say(msg); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function remove(s) {
    if (!window.confirm(`Delete "${s.title}"?`)) return;
    try { await api({ action: "delete", id: s.id }); setOpenId(null); await refresh(); } catch (e) { setError(e.message); }
  }

  if (!data && !error) return <p className="portal-empty">Loading…</p>;
  if (error && !data) return <p className="portal-empty">{error}</p>;

  return (
    <div className="shoots">
      <div className="atoolbar shoots-bar">
        <button type="button" className="abtn" onClick={() => setShowNew((v) => !v)}>{showNew ? "Close" : "+ New shoot"}</button>
        <span className="gcard-meta">{upcoming.length} coming up · from {HOME.label}</span>
        {flash && <span className="clients-flash">{flash}</span>}
      </div>
      {error && <p className="cform-error">{error}</p>}

      {showNew && <NewShoot prefill={prefill} leads={data.leads} guides={data.guides} busy={busy} onCreate={create} />}

      {upcoming.length === 0 && !showNew && <p className="portal-empty">Nothing on the books. Hit “+ New shoot” — or start one from a lead.</p>}

      <ul className="shoot-list">
        {upcoming.map((s) => <ShootRow key={s.id} s={s} open={openId === s.id} onToggle={() => setOpenId(openId === s.id ? null : s.id)} onUpdate={update} onRemove={remove} busy={busy} galleries={data.galleries} guides={data.guides} />)}
      </ul>

      {past.length > 0 && (
        <>
          <button type="button" className="achip shoots-past-toggle" onClick={() => setShowPast((v) => !v)}>{showPast ? "Hide" : "Show"} {past.length} past / done</button>
          {showPast && <ul className="shoot-list is-past">{past.map((s) => <ShootRow key={s.id} s={s} open={openId === s.id} onToggle={() => setOpenId(openId === s.id ? null : s.id)} onUpdate={update} onRemove={remove} busy={busy} galleries={data.galleries} guides={data.guides} />)}</ul>}
        </>
      )}
    </div>
  );
}

function NewShoot({ leads, guides, busy, onCreate, prefill = null }) {
  const [lead, setLead] = useState("");
  const [kind, setKind] = useState(prefill?.kind && guides[prefill.kind] ? prefill.kind : "wedding");
  const [f, setF] = useState({ title: prefill?.client_name ? `${prefill.client_name} — ` : "", client_name: prefill?.client_name || "", client_email: prefill?.client_email || "", client_phone: prefill?.client_phone || "", date: "", start_time: "", time_note: "", address: "", notes: "" });
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  function pickLead(id) {
    setLead(id);
    const l = leads.find((x) => x.id === id);
    if (!l) return;
    const k = /wedding|engage/i.test(l.summary) ? "wedding" : /family/i.test(l.summary) ? "family" : /business|content/i.test(l.summary) ? "business" : "other";
    setKind(k);
    setF((s) => ({ ...s, title: `${l.name || l.email} — ${l.summary.split(" · ")[1] || l.summary}`.slice(0, 120), client_name: l.name || "", client_email: l.email || "", client_phone: l.phone || "", address: l.address || "", notes: l.when ? `They said: ${l.when}` : "" }));
  }

  return (
    <form className="shoot-new" onSubmit={(e) => { e.preventDefault(); onCreate({ ...f, kind, submission_id: lead || null }); }}>
      <label className="wide">Start from a lead (optional)
        <select value={lead} onChange={(e) => pickLead(e.target.value)}>
          <option value="">— pick one to prefill name, phone, address —</option>
          {leads.map((l) => <option key={l.id} value={l.id}>{l.name || l.email} · {l.summary}{l.address ? ` · ${l.address}` : ""}</option>)}
        </select>
      </label>
      <label>Title<input value={f.title} onChange={set("title")} required placeholder="Nicole — golden hour session" /></label>
      <label>Type<select value={kind} onChange={(e) => setKind(e.target.value)}>{Object.entries(guides).map(([k, g]) => <option key={k} value={k}>{g.label}</option>)}</select></label>
      <label>Date<input type="date" value={f.date} onChange={set("date")} /></label>
      <label>Start time<input type="time" value={f.start_time} onChange={set("start_time")} /></label>
      <label>…or relative to sunset<input value={f.time_note} onChange={set("time_note")} placeholder="two hours before sunset" /></label>
      <label className="wide">Address / place<input value={f.address} onChange={set("address")} placeholder="Apples and Moore, Watkins Glen NY" /></label>
      <label>Client<input value={f.client_name} onChange={set("client_name")} /></label>
      <label>Phone<input value={f.client_phone} onChange={set("client_phone")} /></label>
      <label>Email<input type="email" value={f.client_email} onChange={set("client_email")} /></label>
      <label className="wide">Notes<textarea rows={2} value={f.notes} onChange={set("notes")} /></label>
      <p className="gcard-meta wide">The {guides[kind]?.label} checklist gets copied in; distance and sunset are worked out from the address.</p>
      <button type="submit" className="abtn" disabled={busy}>{busy ? "Adding…" : "Add shoot"}</button>
    </form>
  );
}

function ShootRow({ s, open, onToggle, onUpdate, onRemove, busy, galleries, guides }) {
  const t = useMemo(() => timing(s), [s]);
  const n = daysOut(s.date);
  const [notes, setNotes] = useState(s.notes);
  const [edit, setEdit] = useState(false);
  useEffect(() => setNotes(s.notes), [s.notes]);

  function toggleItem(i) {
    const list = s.checklist.map((c, j) => (j === i ? { ...c, done: !c.done } : c));
    onUpdate(s.id, { checklist: list }, list[i].done ? "Checked ✓" : "Unchecked");
  }
  function addItem() {
    const text = window.prompt("Add to the checklist:");
    if (text) onUpdate(s.id, { checklist: [...s.checklist, { text, done: false }] }, "Added");
  }
  function resetFromGuide() {
    if (!window.confirm(`Replace the checklist with the ${guides[s.kind]?.label} guide?`)) return;
    onUpdate(s.id, { checklist: guides[s.kind].items.map((text) => ({ text, done: false })) }, "Guide loaded");
  }
  const done = s.checklist.filter((c) => c.done).length;

  return (
    <li className={"shoot" + (open ? " is-open" : "") + ` is-${s.status}`}>
      <button type="button" className="shoot-row" onClick={onToggle}>
        <span className="shoot-when"><strong>{fmtDate(s.date)}</strong><em>{t.start ? fmt12(t.start) : s.time_note || "time TBD"}{n !== null && n >= 0 ? ` · ${n === 0 ? "today" : n === 1 ? "tomorrow" : `in ${n} days`}` : ""}</em></span>
        <span className="shoot-main"><strong>{s.title}</strong><em>{KIND_LABEL[s.kind]}{s.client_name ? ` · ${s.client_name}` : ""}{s.address ? ` · ${s.address}` : " · no address yet"}</em></span>
        <span className="shoot-far">{s.miles != null ? <><strong>{s.miles} mi</strong><em>~{s.drive_min} min drive</em></> : <em>—</em>}</span>
        <span className={`itag itag-${s.status}`}>{STATUS_LABEL[s.status]}</span>
      </button>

      {open && (
        <div className="shoot-detail">
          <div className="shoot-facts">
            <div><span className="kick-sm">Sunset there</span><strong>{t.sunset ? fmt12(t.sunset) : "—"}</strong><em>golden hour from {t.golden ? fmt12(t.golden) : "—"}</em></div>
            <div><span className="kick-sm">Start</span><strong>{t.start ? fmt12(t.start) : "TBD"}</strong><em>{t.resolved ? `from “${s.time_note}”` : s.time_note || "set a time or a sunset note"}</em></div>
            <div><span className="kick-sm">Leave home</span><strong>{t.leave ? fmt12(t.leave) : "—"}</strong><em>{s.drive_min ? `${s.drive_min} min drive + 20 to set up` : "needs an address"}</em></div>
            <div><span className="kick-sm">Distance</span><strong>{s.miles != null ? `${s.miles} mi` : "—"}</strong><em>{s.place_label ? s.place_label.split(",").slice(0, 3).join(",") : "not located"}</em></div>
          </div>
          <div className="gcard-actions">
            {s.address && <a className="achip" href={mapsUrl(s.address, s.lat, s.lng)} target="_blank" rel="noreferrer">Directions ↗</a>}
            {s.client_phone && <a className="achip" href={`sms:${s.client_phone.replace(/[^\d+]/g, "")}`}>Text {s.client_name.split(" ")[0] || "client"}</a>}
            {s.client_phone && <a className="achip" href={`tel:${s.client_phone.replace(/[^\d+]/g, "")}`}>Call</a>}
            {s.client_email && <a className="achip" href={`mailto:${s.client_email}`}>Email</a>}
            {s.address && !s.lat && <button type="button" className="achip" onClick={() => api({ action: "relocate", id: s.id }).then(() => onUpdate(s.id, {}, "Located")).catch((e) => alert(e.message))}>Find on map</button>}
            <select className="achip" value={s.status} onChange={(e) => onUpdate(s.id, { status: e.target.value })}>{Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
            <button type="button" className="achip" onClick={() => setEdit((v) => !v)}>{edit ? "Close edit" : "Edit details"}</button>
            <button type="button" className="achip achip-danger" onClick={() => onRemove(s)}>Delete</button>
          </div>

          {edit && (
            <form className="shoot-new shoot-edit" key={s.updated_at} onSubmit={(e) => { e.preventDefault(); const f = Object.fromEntries(new FormData(e.currentTarget).entries()); onUpdate(s.id, f); setEdit(false); }}>
              <label>Title<input name="title" defaultValue={s.title} required /></label>
              <label>Type<select name="kind" defaultValue={s.kind}>{Object.entries(guides).map(([k, g]) => <option key={k} value={k}>{g.label}</option>)}</select></label>
              <label>Date<input type="date" name="date" defaultValue={s.date || ""} /></label>
              <label>Start time<input type="time" name="start_time" defaultValue={s.start_time} /></label>
              <label>…or relative to sunset<input name="time_note" defaultValue={s.time_note} placeholder="two hours before sunset" /></label>
              <label className="wide">Address / place<input name="address" defaultValue={s.address} /></label>
              <label>Client<input name="client_name" defaultValue={s.client_name} /></label>
              <label>Phone<input name="client_phone" defaultValue={s.client_phone} /></label>
              <label>Email<input type="email" name="client_email" defaultValue={s.client_email} /></label>
              <label className="wide">Album<select name="gallery_id" defaultValue={s.gallery_id || ""}><option value="">— none yet —</option>{galleries.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}</select></label>
              <button type="submit" className="abtn" disabled={busy}>Save</button>
            </form>
          )}

          <div className="shoot-cols">
            <section>
              <div className="shoot-sec-head"><span className="kick-sm">Checklist · {done}/{s.checklist.length}</span><span><button type="button" className="achip" onClick={addItem}>+ Add</button> <button type="button" className="achip" onClick={resetFromGuide}>Load {guides[s.kind]?.label} guide</button></span></div>
              <ul className="shoot-check">
                {s.checklist.map((c, i) => <li key={i} className={c.done ? "is-done" : ""}><label><input type="checkbox" checked={c.done} onChange={() => toggleItem(i)} /> {c.text}</label></li>)}
              </ul>
            </section>
            <section>
              <div className="shoot-sec-head"><span className="kick-sm">Notes</span>{notes !== s.notes && <button type="button" className="achip" onClick={() => onUpdate(s.id, { notes })} disabled={busy}>Save notes</button>}</div>
              <textarea className="shoot-notes" rows={8} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Must-have shots, who's who, parking, the thing they said on the phone…" />
            </section>
          </div>
        </div>
      )}
    </li>
  );
}
