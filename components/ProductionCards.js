"use client";

// Sprint 1 cards for the project page: Scenes (the hub), Locations,
// Budget (owner only), Conventions, Stakeholders + Needs-from-you +
// Milestones + Phase (the client side of the project).

import { useState } from "react";
import { PHASES, PHASE_LABEL, SCENE_KINDS, SCENE_KIND_LABEL, SCENE_STATUSES, SCENE_STATUS_LABEL, LOCATION_KINDS, LOCATION_KIND_LABEL, LOCATION_STATUS_LABEL, PERMIT_LABEL, COI_LABEL, BUDGET_SECTIONS, BUDGET_SECTION_LABEL, COST_KINDS, TASK_CATEGORY_LABEL, STAKEHOLDER_ROLE_LABEL, money, fmtSecs } from "../lib/production";
import AddressInput from "./AddressInput";

export async function P(payload) {
  const res = await fetch("/api/admin/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error || `Request failed (${res.status})`);
  return j;
}
const fmtDate = (d) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "");
const SqlHint = ({ what }) => <p className="sm-sqlhint">{what} needs <code>supabase/sprint1.sql</code> run once in the Supabase SQL editor.</p>;

// A small inline field that saves on blur.
function F({ label, value, onSave, type = "text", placeholder = "", rows = 0, options = null, wide = false }) {
  const [v, setV] = useState(value ?? "");
  const cls = wide ? "wide" : "";
  if (options) return <label className={cls}>{label}<select value={v} onChange={(e) => { setV(e.target.value); onSave(e.target.value); }}>{options.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>;
  if (rows) return <label className={cls}>{label}<textarea rows={rows} value={v} onChange={(e) => setV(e.target.value)} onBlur={() => v !== (value ?? "") && onSave(v)} placeholder={placeholder} /></label>;
  return <label className={cls}>{label}<input type={type} value={v} onChange={(e) => setV(e.target.value)} onBlur={() => v !== (value ?? "") && onSave(v)} placeholder={placeholder} /></label>;
}

// ── Scenes ──────────────────────────────────────────────────────────
export function ScenesCard({ project, scenes, setScenes, people, locations, fail, say, ready }) {
  const [open, setOpen] = useState(null);
  const [adding, setAdding] = useState(false);
  if (!ready) return <section className="cprof-card"><div className="cprof-cardhead"><h2>Scenes</h2></div><SqlHint what="Scenes" /></section>;
  const beats = project.beats || [];
  async function add(e) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget).entries());
    try { const r = await P({ action: "scene-add", projectId: project.id, ...f }); setScenes((l) => [...l, r.scene]); setAdding(false); setOpen(r.scene.id); e.target.reset(); } catch (err) { fail(err); }
  }
  async function patch(id, fields, msg) { try { const r = await P({ action: "scene-update", id, ...fields }); setScenes((l) => l.map((x) => (x.id === id ? r.scene : x))); if (msg) say(msg); } catch (err) { fail(err); } }
  async function remove(x) { if (!window.confirm(`Delete scene “${x.title}”?`)) return; try { await P({ action: "scene-delete", id: x.id }); setScenes((l) => l.filter((y) => y.id !== x.id)); } catch (err) { fail(err); } }
  async function move(i, dir) {
    const j = i + dir; if (j < 0 || j >= scenes.length) return;
    const next = [...scenes]; [next[i], next[j]] = [next[j], next[i]];
    setScenes(next.map((s, k) => ({ ...s, number: k + 1, sort: k + 1 })));
    try { await P({ action: "scenes-reorder", projectId: project.id, ids: next.map((s) => s.id) }); } catch (err) { fail(err); }
  }
  const total = scenes.reduce((a, s) => a + (s.est_seconds || 0), 0);
  const byAct = (a) => scenes.filter((s) => s.act === a);
  const personName = (id) => people.find((p) => p.id === id)?.name || "";
  return (
    <section className="cprof-card scenes">
      <div className="cprof-cardhead"><h2>Scenes{scenes.length > 0 && <em className="cprof-count">{scenes.length}</em>}</h2>
        <span className="gcard-actions"><span className="gcard-meta">est. {fmtSecs(total)}</span><button type="button" className="abtn" onClick={() => setAdding(!adding)}>{adding ? "Close" : "+ Scene"}</button></span>
      </div>
      {adding && (
        <form className="shoot-new" onSubmit={add}>
          <label className="wide">Title<input name="title" required autoFocus placeholder="Bells at 6am — the empty nave" /></label>
          <label>Act<select name="act" defaultValue="1"><option value="1">Act 1 — now</option><option value="2">Act 2 — how it almost died</option><option value="3">Act 3 — why it matters</option></select></label>
          <label>Kind<select name="kind" defaultValue="interview">{SCENE_KINDS.map((k) => <option key={k} value={k}>{SCENE_KIND_LABEL[k]}</option>)}</select></label>
          <label>Beat<select name="beat_index" defaultValue=""><option value="">—</option>{beats.map((b, i) => <option key={i} value={i}>{i + 1}. {b.text}</option>)}</select></label>
          <label className="wide">Purpose — what it does for the argument<input name="purpose" placeholder="Shows the result before we show the fight" /></label>
          <button type="submit" className="abtn">Add scene</button>
        </form>
      )}
      {scenes.length === 0 && !adding && <p className="gcard-meta">The film on cards. A scene is one thing the audience sees — an interview moment, a mass, a montage — in the order they&apos;ll see it. Beats are the argument; scenes are how you make it. Everything else (b-roll, said/seen, footage) hangs off a scene.</p>}
      {["1", "2", "3"].map((a) => byAct(a).length > 0 && (
        <div key={a} className="scene-act">
          <span className="kick-sm">Act {a} · {byAct(a).length} scene{byAct(a).length === 1 ? "" : "s"} · {fmtSecs(byAct(a).reduce((x, s) => x + (s.est_seconds || 0), 0))}</span>
          <ul className="scene-list">
            {byAct(a).map((s) => {
              const i = scenes.indexOf(s);
              return (
                <li key={s.id} className={"scene st-" + s.status + (open === s.id ? " is-open" : "")}>
                  <button type="button" className="scene-row" onClick={() => setOpen(open === s.id ? null : s.id)} aria-expanded={open === s.id}>
                    <span className="scene-num">{s.number}</span>
                    <span className="scene-main"><strong>{s.title}</strong><em>{SCENE_KIND_LABEL[s.kind]}{s.purpose ? ` · ${s.purpose}` : ""}{s.people?.length ? ` · ${s.people.map(personName).filter(Boolean).join(", ")}` : ""}</em></span>
                    <span className="scene-tags"><span className={`itag st-${s.status}`}>{SCENE_STATUS_LABEL[s.status]}</span>{s.est_seconds ? <span className="itag">{fmtSecs(s.est_seconds)}</span> : null}{(s.tchart || []).some((r) => r.said && !r.seen) && <span className="itag is-alert" title="Said with nothing seen">needs b-roll</span>}</span>
                  </button>
                  {open === s.id && <SceneDetail s={s} beats={beats} people={people} locations={locations} onPatch={(f, m) => patch(s.id, f, m)} onRemove={() => remove(s)} onMove={(d) => move(i, d)} />}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </section>
  );
}

function SceneDetail({ s, beats, people, locations, onPatch, onRemove, onMove }) {
  const [tchart, setTchart] = useState(s.tchart || []);
  const [broll, setBroll] = useState(s.broll || []);
  const [said, setSaid] = useState(""); const [seen, setSeen] = useState(""); const [want, setWant] = useState("");
  const saveT = (next) => { setTchart(next); onPatch({ tchart: next }); };
  const saveB = (next) => { setBroll(next); onPatch({ broll: next }); };
  const togglePerson = (id) => { const has = (s.people || []).includes(id); onPatch({ people: has ? s.people.filter((x) => x !== id) : [...(s.people || []), id] }); };
  return (
    <div className="scene-detail">
      <div className="shoot-new scene-fields">
        <F label="Title" value={s.title} onSave={(v) => onPatch({ title: v })} wide />
        <F label="Act" value={s.act} options={[["1", "Act 1"], ["2", "Act 2"], ["3", "Act 3"]]} onSave={(v) => onPatch({ act: v })} />
        <F label="Kind" value={s.kind} options={SCENE_KINDS.map((k) => [k, SCENE_KIND_LABEL[k]])} onSave={(v) => onPatch({ kind: v })} />
        <F label="Status" value={s.status} options={SCENE_STATUSES.map((k) => [k, SCENE_STATUS_LABEL[k]])} onSave={(v) => onPatch({ status: v })} />
        <F label="Beat" value={s.beat_index ?? ""} options={[["", "—"], ...beats.map((b, i) => [String(i), `${i + 1}. ${b.text}`])]} onSave={(v) => onPatch({ beat_index: v === "" ? null : Number(v) })} />
        <F label="Location" value={s.location_id || ""} options={[["", "—"], ...locations.map((l) => [l.id, l.name])]} onSave={(v) => onPatch({ location_id: v || null })} />
        <F label="Est. seconds" value={s.est_seconds || 0} type="number" onSave={(v) => onPatch({ est_seconds: Number(v) || 0 })} />
        <F label="Purpose" value={s.purpose} onSave={(v) => onPatch({ purpose: v })} placeholder="What this scene does for the argument" wide />
        <F label="Notes" value={s.notes} rows={2} onSave={(v) => onPatch({ notes: v })} wide />
      </div>
      <div className="scene-people"><span className="kick-sm">Carried by</span>
        <span className="pbook-kinds">{people.filter((p) => p.kind === "interview").map((p) => <button key={p.id} type="button" className={"ifilter" + ((s.people || []).includes(p.id) ? " is-on" : "")} onClick={() => togglePerson(p.id)}>{p.name}</button>)}</span>
      </div>
      <div className="tchart">
        <span className="kick-sm">Said | Seen — what we hear vs what we see</span>
        <table><thead><tr><th>Said</th><th>Seen</th><th></th></tr></thead><tbody>
          {tchart.map((r, i) => (
            <tr key={i} className={!r.seen ? "is-gap" : ""}>
              <td><textarea rows={2} value={r.said} onChange={(e) => setTchart(tchart.map((x, j) => (j === i ? { ...x, said: e.target.value } : x)))} onBlur={() => saveT(tchart)} /></td>
              <td><textarea rows={2} value={r.seen} onChange={(e) => setTchart(tchart.map((x, j) => (j === i ? { ...x, seen: e.target.value } : x)))} onBlur={() => saveT(tchart)} placeholder={!r.seen ? "nothing yet — what do we SEE here?" : ""} /></td>
              <td><select value={r.rel} onChange={(e) => saveT(tchart.map((x, j) => (j === i ? { ...x, rel: e.target.value } : x)))} aria-label="Relationship"><option value="illustrates">illustrates</option><option value="counterpoints">counterpoints</option><option value="reveals">reveals</option><option value="transitions">transitions</option></select><button type="button" className="prep-x" onClick={() => saveT(tchart.filter((_, j) => j !== i))} aria-label="Remove">×</button></td>
            </tr>
          ))}
          <tr><td><textarea rows={2} value={said} onChange={(e) => setSaid(e.target.value)} placeholder="“We thought that was the last Christmas.”" /></td><td><textarea rows={2} value={seen} onChange={(e) => setSeen(e.target.value)} placeholder="Empty pews, December light, one candle" /></td><td><button type="button" className="achip" disabled={!said.trim() && !seen.trim()} onClick={() => { saveT([...tchart, { said: said.trim(), seen: seen.trim(), rel: "illustrates" }]); setSaid(""); setSeen(""); }}>+ Row</button></td></tr>
        </tbody></table>
      </div>
      <div className="scene-broll">
        <span className="kick-sm">B-roll wanted · {broll.filter((b) => b.status === "shot").length}/{broll.length}</span>
        <ul className="shoot-check">
          {broll.map((b, i) => <li key={i} className={b.status === "shot" ? "is-done" : ""}><label><input type="checkbox" checked={b.status === "shot"} onChange={() => saveB(broll.map((x, j) => (j === i ? { ...x, status: x.status === "shot" ? "wanted" : "shot" } : x)))} /> <span>{b.text}{b.when ? ` · ${b.when}` : ""}</span></label><button type="button" className="prep-x" onClick={() => saveB(broll.filter((_, j) => j !== i))} aria-label="Remove">×</button></li>)}
        </ul>
        <form className="prep-add" onSubmit={(e) => { e.preventDefault(); if (!want.trim()) return; saveB([...broll, { text: want.trim(), when: "", status: "wanted" }]); setWant(""); }}><input value={want} onChange={(e) => setWant(e.target.value)} placeholder="Slow push on the stained glass, late afternoon" /><button type="submit" className="achip" disabled={!want.trim()}>+ Want</button></form>
      </div>
      <div className="gcard-actions">
        <button type="button" className="achip" onClick={() => onMove(-1)}>↑ Earlier</button>
        <button type="button" className="achip" onClick={() => onMove(1)}>↓ Later</button>
        <button type="button" className="achip achip-danger" onClick={onRemove}>Delete scene</button>
      </div>
    </div>
  );
}

// ── Locations ───────────────────────────────────────────────────────
export function LocationsCard({ project, locations, setLocations, fail, ready, isOwner }) {
  const [open, setOpen] = useState(null);
  const [adding, setAdding] = useState(false);
  if (!ready) return <section className="cprof-card"><div className="cprof-cardhead"><h2>Locations</h2></div><SqlHint what="Locations" /></section>;
  async function add(e) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget).entries());
    try { const r = await P({ action: "location-add", projectId: project.id, ...f }); setLocations((l) => [...l, r.location]); setAdding(false); setOpen(r.location.id); e.target.reset(); } catch (err) { fail(err); }
  }
  async function patch(id, fields) { try { const r = await P({ action: "location-update", id, ...fields }); setLocations((l) => l.map((x) => (x.id === id ? r.location : x))); } catch (err) { fail(err); } }
  async function remove(x) { if (!window.confirm(`Remove ${x.name}?`)) return; try { await P({ action: "location-delete", id: x.id }); setLocations((l) => l.filter((y) => y.id !== x.id)); } catch (err) { fail(err); } }
  const tel = (v) => (v || "").replace(/[^\d+]/g, "");
  return (
    <section className="cprof-card">
      <div className="cprof-cardhead"><h2>Locations{locations.length > 0 && <em className="cprof-count">{locations.length}</em>}</h2>
        <button type="button" className="abtn" onClick={() => setAdding(!adding)}>{adding ? "Close" : "+ Location"}</button>
      </div>
      {adding && (
        <form className="shoot-new" onSubmit={add}>
          <label className="wide">Name<input name="name" required autoFocus placeholder="St. Mary's — nave" /></label>
          <label>Kind<select name="kind" defaultValue="church">{LOCATION_KINDS.map((k) => <option key={k} value={k}>{LOCATION_KIND_LABEL[k]}</option>)}</select></label>
          <label className="wide">Address<AddressInput name="address" /></label>
          <button type="submit" className="abtn">Add</button>
        </form>
      )}
      {locations.length === 0 && !adding && <p className="gcard-meta">Every place you&apos;ll point a camera: who lets you in, when you can&apos;t (Mass times, funerals), parking, power, the HVAC that ruins audio, where the light is good, the nearest hospital. Scout once, never ask twice.</p>}
      <ul className="people-list">
        {locations.map((l) => (
          <li key={l.id} className={"person" + (open === l.id ? " is-open" : "")}>
            <button type="button" className="person-row" onClick={() => setOpen(open === l.id ? null : l.id)} aria-expanded={open === l.id}>
              <span className="person-main"><strong>{l.name}</strong><em>{LOCATION_KIND_LABEL[l.kind]}{l.address ? ` · ${l.address}` : ""}</em></span>
              <span className="person-tags"><span className={`itag st-${l.status}`}>{LOCATION_STATUS_LABEL[l.status]}</span>{l.permit !== "none" && <span className={"itag" + (l.permit === "granted" ? " is-rel" : " is-alert")}>{PERMIT_LABEL[l.permit]}</span>}{l.coi !== "none" && <span className={"itag" + (l.coi === "delivered" ? " is-rel" : " is-alert")}>{COI_LABEL[l.coi]}</span>}</span>
            </button>
            {open === l.id && (
              <div className="person-detail">
                <div className="gcard-actions">
                  {l.address && <a className="achip" href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(l.address)}`} target="_blank" rel="noreferrer">Directions ↗</a>}
                  {l.contact_phone && <a className="achip" href={`tel:${tel(l.contact_phone)}`}>Call {l.contact_name.split(" ")[0] || "contact"}</a>}
                  {l.contact_phone && <a className="achip" href={`sms:${tel(l.contact_phone)}`}>Text</a>}
                </div>
                <div className="shoot-new scene-fields">
                  <F label="Status" value={l.status} options={Object.entries(LOCATION_STATUS_LABEL)} onSave={(v) => patch(l.id, { status: v })} />
                  <F label="Permit" value={l.permit} options={Object.entries(PERMIT_LABEL)} onSave={(v) => patch(l.id, { permit: v })} />
                  <F label="Certificate of insurance" value={l.coi} options={Object.entries(COI_LABEL)} onSave={(v) => patch(l.id, { coi: v })} />
                  <label className="wide">Address<AddressInput defaultValue={l.address} onPick={(h) => patch(l.id, { address: h.address, lat: h.lat, lng: h.lng })} onChange={() => {}} /></label>
                  <F label="Who lets us in" value={l.contact_name} onSave={(v) => patch(l.id, { contact_name: v })} />
                  <F label="Their phone" value={l.contact_phone} onSave={(v) => patch(l.id, { contact_phone: v })} />
                  <F label="Authority (parish / diocese / city / private)" value={l.authority} onSave={(v) => patch(l.id, { authority: v })} />
                  <F label="Access hours" value={l.access_hours} onSave={(v) => patch(l.id, { access_hours: v })} placeholder="Weekdays 9–4, Sat by arrangement" />
                  <F label="Blackout — when we can't" value={l.blackout} onSave={(v) => patch(l.id, { blackout: v })} placeholder="Mass 8am daily, 5pm Sat, 8/10:30 Sun; funerals" wide />
                  <F label="Parking / load-in" value={l.parking} onSave={(v) => patch(l.id, { parking: v })} />
                  <F label="Power" value={l.power} onSave={(v) => patch(l.id, { power: v })} placeholder="Outlets by the side door; sacristy has 20A" />
                  <F label="Sound issues" value={l.sound} onSave={(v) => patch(l.id, { sound: v })} placeholder="HVAC cycles every 20 min; bells on the hour; reverb" />
                  <F label="Light" value={l.light} onSave={(v) => patch(l.id, { light: v })} placeholder="East windows — best 7–9am; practicals warm" />
                  <F label="Hazards" value={l.hazards} onSave={(v) => patch(l.id, { hazards: v })} placeholder="Bell tower ladder; icy steps" />
                  <F label="Nearest hospital" value={l.hospital} onSave={(v) => patch(l.id, { hospital: v })} placeholder="Guthrie Corning Hospital, 1 Guthrie Dr — 6 min" />
                  <F label="Notes" value={l.notes} rows={2} onSave={(v) => patch(l.id, { notes: v })} wide />
                </div>
                {isOwner && <div className="gcard-actions"><button type="button" className="achip achip-danger" onClick={() => remove(l)}>Remove</button></div>}
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

// ── Budget (owner only) ──────────────────────────────────────────────
export function BudgetCard({ project, lines, setLines, costs, setCosts, days, fail, say, ready, onProject }) {
  const [adding, setAdding] = useState(false);
  const [showCosts, setShowCosts] = useState(false);
  if (!ready) return <section className="cprof-card"><div className="cprof-cardhead"><h2>Budget</h2></div><SqlHint what="Budget" /></section>;
  async function seed() { try { const r = await P({ action: "budget-seed", projectId: project.id }); setLines((l) => [...l, ...r.lines]); say(`${r.lines.length} lines added`); } catch (err) { fail(err); } }
  async function patchLine(id, fields) { try { const r = await P({ action: "budget-line-update", id, ...fields }); setLines((l) => l.map((x) => (x.id === id ? r.line : x))); } catch (err) { fail(err); } }
  async function addLine(e) { e.preventDefault(); const f = Object.fromEntries(new FormData(e.currentTarget).entries()); try { const r = await P({ action: "budget-line-add", projectId: project.id, ...f, rate_cents: Math.round(Number(f.rate) * 100) }); setLines((l) => [...l, r.line]); e.target.reset(); } catch (err) { fail(err); } }
  async function removeLine(x) { if (!window.confirm(`Remove ${x.code} ${x.description}?`)) return; try { await P({ action: "budget-line-delete", id: x.id }); setLines((l) => l.filter((y) => y.id !== x.id)); } catch (err) { fail(err); } }
  async function addCost(e) { e.preventDefault(); const f = Object.fromEntries(new FormData(e.currentTarget).entries()); try { const r = await P({ action: "cost-add", projectId: project.id, ...f, amount_cents: Math.round(Number(f.amount) * 100) }); setCosts((l) => [r.cost, ...l]); e.target.reset(); say("Logged"); } catch (err) { fail(err); } }
  async function patchCost(id, fields) { try { const r = await P({ action: "cost-update", id, ...fields }); setCosts((l) => l.map((x) => (x.id === id ? r.cost : x))); } catch (err) { fail(err); } }
  async function removeCost(x) { try { await P({ action: "cost-delete", id: x.id }); setCosts((l) => l.filter((y) => y.id !== x.id)); } catch (err) { fail(err); } }
  const est = (l) => Math.round((Number(l.qty) || 0) * (l.rate_cents || 0));
  const actualFor = (id) => costs.filter((c) => c.line_id === id).reduce((a, c) => a + c.amount_cents, 0);
  const subtotal = lines.reduce((a, l) => a + est(l), 0);
  const contingency = Math.round(subtotal * (Number(project.contingency_pct) || 0) / 100);
  const total = subtotal + contingency;
  const spent = costs.reduce((a, c) => a + c.amount_cents, 0);
  const unpaid = costs.filter((c) => !c.paid).reduce((a, c) => a + c.amount_cents, 0);
  return (
    <section className="cprof-card budget">
      <div className="cprof-cardhead"><h2>Budget</h2>
        <span className="gcard-actions">{lines.length === 0 && <button type="button" className="abtn" onClick={seed}>Start from the doc top sheet</button>}<button type="button" className="achip" onClick={() => setAdding(!adding)}>{adding ? "Close" : "+ Line"}</button><button type="button" className={"achip" + (showCosts ? " is-on" : "")} onClick={() => setShowCosts(!showCosts)}>Costs {costs.length ? `(${costs.length})` : ""}</button></span>
      </div>
      <div className="proj-stats budget-stats">
        <div><strong>{money(total)}</strong><em>estimate incl. {project.contingency_pct || 0}% contingency</em></div>
        <div><strong>{money(spent)}</strong><em>spent so far</em></div>
        <div><strong>{money(total - spent)}</strong><em>left</em></div>
        <div><strong>{money(unpaid)}</strong><em>logged, not yet paid</em></div>
      </div>
      {adding && (
        <form className="shoot-new" onSubmit={addLine}>
          <label>Code<input name="code" placeholder="2100" /></label>
          <label>Section<select name="section" defaultValue="production">{BUDGET_SECTIONS.map((k) => <option key={k} value={k}>{BUDGET_SECTION_LABEL[k]}</option>)}</select></label>
          <label className="wide">Description<input name="description" required placeholder="Second shooter" /></label>
          <label>Unit<select name="unit" defaultValue="day"><option value="day">day</option><option value="week">week</option><option value="flat">flat</option><option value="allow">allowance</option><option value="each">each</option></select></label>
          <label>Qty<input name="qty" type="number" step="0.5" defaultValue="1" /></label>
          <label>Rate $<input name="rate" type="number" step="1" defaultValue="0" /></label>
          <button type="submit" className="abtn">Add line</button>
        </form>
      )}
      {lines.length > 0 && (
        <div className="budget-table">
          {BUDGET_SECTIONS.map((sec) => lines.some((l) => l.section === sec) && (
            <div key={sec}>
              <span className="kick-sm">{BUDGET_SECTION_LABEL[sec]} · {money(lines.filter((l) => l.section === sec).reduce((a, l) => a + est(l), 0))}</span>
              <table><thead><tr><th>#</th><th>Line</th><th>Qty</th><th>Unit</th><th>Rate</th><th>Est.</th><th>Actual</th><th></th></tr></thead><tbody>
                {lines.filter((l) => l.section === sec).map((l) => {
                  const act = actualFor(l.id); const e = est(l);
                  return (
                    <tr key={l.id} className={act > e && e > 0 ? "is-over" : ""}>
                      <td className="b-code">{l.code}</td>
                      <td><input className="b-in b-desc" defaultValue={l.description} onBlur={(ev) => ev.target.value !== l.description && patchLine(l.id, { description: ev.target.value })} /></td>
                      <td><input className="b-in b-num" type="number" step="0.5" defaultValue={l.qty} onBlur={(ev) => Number(ev.target.value) !== Number(l.qty) && patchLine(l.id, { qty: ev.target.value })} /></td>
                      <td><select className="b-in" defaultValue={l.unit} onChange={(ev) => patchLine(l.id, { unit: ev.target.value })}><option value="day">day</option><option value="week">wk</option><option value="flat">flat</option><option value="allow">allow</option><option value="each">ea</option></select></td>
                      <td><input className="b-in b-num" type="number" step="1" defaultValue={l.rate_cents / 100} onBlur={(ev) => Math.round(Number(ev.target.value) * 100) !== l.rate_cents && patchLine(l.id, { rate_cents: Math.round(Number(ev.target.value) * 100) })} /></td>
                      <td className="b-money">{money(e)}</td>
                      <td className="b-money">{act ? money(act) : "—"}</td>
                      <td><button type="button" className="prep-x" aria-label="Remove line" onClick={() => removeLine(l)}>×</button></td>
                    </tr>
                  );
                })}
              </tbody></table>
            </div>
          ))}
          <p className="budget-foot">Subtotal {money(subtotal)} · contingency <input className="b-in b-num" type="number" step="1" defaultValue={project.contingency_pct || 10} onBlur={(ev) => onProject({ contingency_pct: Number(ev.target.value) })} />% {money(contingency)} · <strong>Total {money(total)}</strong></p>
        </div>
      )}
      {showCosts && (
        <div className="costs">
          <span className="kick-sm">Log a cost</span>
          <form className="shoot-new" onSubmit={addCost}>
            <label>Date<input type="date" name="date" defaultValue={new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" })} /></label>
            <label>Amount $<input name="amount" type="number" step="0.01" required /></label>
            <label>Kind<select name="kind" defaultValue="card">{Object.entries(COST_KINDS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
            <label>Line<select name="line_id" defaultValue=""><option value="">—</option>{lines.map((l) => <option key={l.id} value={l.id}>{l.code} {l.description}</option>)}</select></label>
            <label>Shoot day<select name="shoot_id" defaultValue=""><option value="">—</option>{days.map((d) => <option key={d.id} value={d.id}>{fmtDate(d.date)} {d.title}</option>)}</select></label>
            <label className="wide">Vendor / what<input name="vendor" placeholder="B&H — V-mount batteries" /></label>
            <button type="submit" className="abtn">Log</button>
          </form>
          <ul className="cprof-list">
            {costs.map((c) => <li key={c.id}><strong>{money(c.amount_cents)}</strong> <span className="gcard-meta">· {fmtDate(c.date)} · {c.vendor || COST_KINDS[c.kind]}{c.line_id ? ` · ${lines.find((l) => l.id === c.line_id)?.code || ""}` : ""}</span><span className="gcard-actions"><button type="button" className={"achip" + (c.paid ? " is-on" : "")} onClick={() => patchCost(c.id, { paid: !c.paid })}>{c.paid ? "Paid ✓" : "Mark paid"}</button><button type="button" className="prep-x" onClick={() => removeCost(c)} aria-label="Remove">×</button></span></li>)}
          </ul>
        </div>
      )}
      <p className="gcard-meta">Only you see this. Staff never do.</p>
    </section>
  );
}

// ── Conventions ─────────────────────────────────────────────────────
const CONV = [["cameras", "Cameras", "A = FX3 (interviews), B = A7IV, D = drone"], ["codec", "Codec / profile", "4K 10-bit All-I, S-Log3, 23.976"], ["slomo", "Slo-mo", "120fps 1080p"], ["audio", "Audio", "48k/24-bit WAV, lav + boom to recorder, TC jam"], ["cards", "Card IDs", "A01–A04, B01–B03, D01–D02 — labeled"], ["folders", "Folder root", "STMARY/01_MEDIA/{CAM}/{YYMMDD}/"], ["rolls", "Roll naming", "{CODE}_{YYMMDD}_{CAM}{CARD}_R{##}"], ["drives", "Drives", "WORK-01 (NVMe) · MIRROR-01 (HDD) · R2 offsite"], ["lut", "Monitoring LUT", "s709 — grade in Resolve"]];
export function ConventionsCard({ project, onProject, clients = [] }) {
  const conv = project.conventions || {};
  return (
    <section className="cprof-card">
      <div className="cprof-cardhead"><h2>Conventions</h2><span className="gcard-meta">Set once. Every card, roll, drive and timeline follows this.</span></div>
      <div className="shoot-new scene-fields">
        <F label="Project code" value={project.code || ""} onSave={(v) => onProject({ code: v })} placeholder="STMARY" />
        <F label="Phase" value={project.phase || "development"} options={PHASES.map((p) => [p, PHASE_LABEL[p]])} onSave={(v) => onProject({ phase: v })} />
        <F label="Client (portal login)" value={project.client_id || ""} options={[["", "— none —"], ...clients.map((c) => [c.id, `${c.name} · ${c.email}`])]} onSave={(v) => onProject({ client_id: v || null })} wide />
        {CONV.map(([k, label, ph]) => <F key={k} label={label} value={conv[k] || ""} onSave={(v) => onProject({ conventions: { ...conv, [k]: v } })} placeholder={ph} wide={["folders", "rolls", "drives", "cameras"].includes(k)} />)}
      </div>
    </section>
  );
}

// ── Client side: stakeholders · milestones · needs from you ──────────
export function ClientSideCard({ project, stakeholders, setStakeholders, tasks, setTasks, days, onProject, onDayVisible, fail, say, ready }) {
  const [addS, setAddS] = useState(false);
  const [addT, setAddT] = useState(false);
  if (!ready) return <section className="cprof-card"><div className="cprof-cardhead"><h2>The client side</h2></div><SqlHint what="Stakeholders and client tasks" /></section>;
  const ms = project.milestones || [];
  async function addStake(e) { e.preventDefault(); const f = Object.fromEntries(new FormData(e.currentTarget).entries()); try { const r = await P({ action: "stakeholder-add", projectId: project.id, ...f, decision_maker: f.decision_maker === "on", primary_contact: f.primary_contact === "on" }); setStakeholders((l) => [...l, r.stakeholder]); setAddS(false); } catch (err) { fail(err); } }
  async function patchStake(id, fields) { try { const r = await P({ action: "stakeholder-update", id, ...fields }); setStakeholders((l) => l.map((x) => (x.id === id ? r.stakeholder : x))); } catch (err) { fail(err); } }
  async function removeStake(x) { if (!window.confirm(`Remove ${x.name}?`)) return; try { await P({ action: "stakeholder-delete", id: x.id }); setStakeholders((l) => l.filter((y) => y.id !== x.id)); } catch (err) { fail(err); } }
  async function addTask(e) { e.preventDefault(); const f = Object.fromEntries(new FormData(e.currentTarget).entries()); try { const r = await P({ action: "task-add", projectId: project.id, ...f }); setTasks((l) => [...l, r.task]); setAddT(false); e.target.reset(); } catch (err) { fail(err); } }
  async function patchTask(id, fields) { try { const r = await P({ action: "task-update", id, ...fields }); setTasks((l) => l.map((x) => (x.id === id ? r.task : x))); } catch (err) { fail(err); } }
  async function removeTask(x) { try { await P({ action: "task-delete", id: x.id }); setTasks((l) => l.filter((y) => y.id !== x.id)); } catch (err) { fail(err); } }
  const setMs = (next) => onProject({ milestones: next });
  return (
    <section className="cprof-card clientside">
      <div className="cprof-cardhead"><h2>The client side</h2><span className="gcard-meta">What the parish sees is a window onto this project, not a copy of it. Only what&apos;s marked visible shows.</span></div>

      <div className="cs-block">
        <div className="shoot-sec-head"><span className="kick-sm">Who at the client</span><button type="button" className="achip" onClick={() => setAddS(!addS)}>{addS ? "Close" : "+ Person"}</button></div>
        {addS && (
          <form className="shoot-new" onSubmit={addStake}>
            <label>Name<input name="name" required autoFocus /></label>
            <label>Role there<input name="role" placeholder="Pastor · Finance council · Office" /></label>
            <label>Portal role<select name="portal_role" defaultValue="viewer">{Object.entries(STAKEHOLDER_ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
            <label>Email<input type="email" name="email" /></label>
            <label>Phone<input name="phone" /></label>
            <label className="pbook-auto"><input type="checkbox" name="decision_maker" /> Decision maker</label>
            <label className="pbook-auto"><input type="checkbox" name="primary_contact" /> Primary contact</label>
            <button type="submit" className="abtn">Add</button>
          </form>
        )}
        <ul className="cprof-list">
          {stakeholders.map((x) => <li key={x.id}><strong>{x.name}</strong> <span className="gcard-meta">· {x.role || "—"} · {STAKEHOLDER_ROLE_LABEL[x.portal_role]}{x.decision_maker ? " · decides" : ""}{x.primary_contact ? " · primary" : ""}{x.phone ? ` · ${x.phone}` : ""}</span><span className="gcard-actions"><select className="achip" value={x.portal_role} onChange={(e) => patchStake(x.id, { portal_role: e.target.value })} aria-label="Portal role">{Object.entries(STAKEHOLDER_ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select><button type="button" className="prep-x" onClick={() => removeStake(x)} aria-label="Remove">×</button></span></li>)}
        </ul>
        {stakeholders.length === 0 && !addS && <p className="gcard-meta">Exactly one decision maker, one primary contact. Everyone else is a reviewer or a viewer.</p>}
      </div>

      <div className="cs-block">
        <div className="shoot-sec-head"><span className="kick-sm">Milestones</span>{ms.length === 0 && <button type="button" className="achip" onClick={async () => { try { const r = await P({ action: "milestones-seed", id: project.id }); onProject(null, r.project); } catch (err) { fail(err); } }}>Use the standard nine</button>}</div>
        <ul className="ms-list">
          {ms.map((m, i) => (
            <li key={m.key || i} className={m.done ? "is-done" : ""}>
              <label><input type="checkbox" checked={Boolean(m.done)} onChange={() => setMs(ms.map((x, j) => (j === i ? { ...x, done: !x.done } : x)))} /> <span>{m.label}</span></label>
              <input type="date" value={m.date || ""} onChange={(e) => setMs(ms.map((x, j) => (j === i ? { ...x, date: e.target.value } : x)))} aria-label={`Date for ${m.label}`} />
              <button type="button" className={"achip" + (m.client_visible !== false ? " is-on" : "")} onClick={() => setMs(ms.map((x, j) => (j === i ? { ...x, client_visible: x.client_visible === false } : x)))} title="Client can see this">{m.client_visible !== false ? "👁 visible" : "hidden"}</button>
            </li>
          ))}
        </ul>
      </div>

      <div className="cs-block">
        <div className="shoot-sec-head"><span className="kick-sm">Needs from them · {tasks.filter((t) => !t.done_at).length} open</span><button type="button" className="achip" onClick={() => setAddT(!addT)}>{addT ? "Close" : "+ Need"}</button></div>
        {addT && (
          <form className="shoot-new" onSubmit={addTask}>
            <label className="wide">What<input name="title" required autoFocus placeholder="Written filming permission from the diocese" /></label>
            <label>Kind<select name="category" defaultValue="access">{Object.entries(TASK_CATEGORY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
            <label>Due<input type="date" name="due" /></label>
            <button type="submit" className="abtn">Add</button>
          </form>
        )}
        <ul className="shoot-check">
          {tasks.map((t) => <li key={t.id} className={t.done_at ? "is-done" : ""}><label><input type="checkbox" checked={Boolean(t.done_at)} onChange={() => patchTask(t.id, { done: !t.done_at })} /> <span>{t.title}{t.due ? ` · by ${fmtDate(t.due)}` : ""} <em className="gcard-meta">· {TASK_CATEGORY_LABEL[t.category]}</em></span></label><button type="button" className="prep-x" onClick={() => removeTask(t)} aria-label="Remove">×</button></li>)}
        </ul>
      </div>

      <div className="cs-block">
        <span className="kick-sm">Days the client can see</span>
        <ul className="cprof-list">{days.map((d) => <li key={d.id}><strong>{fmtDate(d.date) || "No date"}</strong> <span className="gcard-meta">· {d.title}</span><span className="gcard-actions"><button type="button" className={"achip" + (d.client_visible !== false ? " is-on" : "")} onClick={() => onDayVisible(d, d.client_visible === false)}>{d.client_visible !== false ? "👁 visible" : "hidden"}</button></span></li>)}</ul>
        {days.length === 0 && <p className="gcard-meta">No days yet.</p>}
      </div>
      <p className="gcard-meta">Client view: <code>rothmediaco.com/portal/projects/{project.id.slice(0, 8)}…</code> — they need a client login on the same email as a stakeholder, and the project linked to their client record (Conventions → Client).</p>
    </section>
  );
}
