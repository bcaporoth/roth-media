"use client";

// Sprint 3: Thesis (versioned), Chronology, Sources, Question banks,
// Events on a date, Style guide, and the interview plan + eyeline map.
import { useState } from "react";
import { P } from "./ProductionCards";
import { ARC_ROLES, ARC_ROLE_LABEL, ERAS, EVIDENCE_LABEL, SOURCE_KINDS, SOURCE_KIND_LABEL, RELIABILITY_LABEL, QUESTION_THEMES, ACCESS_LABEL, EVENT_STATUS_LABEL, STYLE_FIELDS } from "../lib/production";

const SqlHint = ({ what }) => <p className="sm-sqlhint">{what} needs <code>supabase/sprint3.sql</code> run once in the Supabase SQL editor.</p>;
const fmtDate = (d) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : "");
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
function F({ label, value, onSave, type = "text", placeholder = "", rows = 0, options = null, wide = false }) {
  const [v, setV] = useState(value ?? "");
  const cls = wide ? "wide" : "";
  if (options) return <label className={cls}>{label}<select value={v} onChange={(e) => { setV(e.target.value); onSave(e.target.value); }}>{options.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>;
  if (rows) return <label className={cls}>{label}<textarea rows={rows} value={v} onChange={(e) => setV(e.target.value)} onBlur={() => v !== (value ?? "") && onSave(v)} placeholder={placeholder} /></label>;
  return <label className={cls}>{label}<input type={type} value={v} onChange={(e) => setV(e.target.value)} onBlur={() => v !== (value ?? "") && onSave(v)} placeholder={placeholder} /></label>;
}
// Generic row helpers for the four story tables.
function useRows(prefix, project, rows, setRows, fail) {
  return {
    add: async (fields) => { const r = await P({ action: `${prefix}-add`, projectId: project.id, ...fields }); setRows((l) => [...l, r.row]); return r.row; },
    patch: async (id, fields) => { try { const r = await P({ action: `${prefix}-update`, id, ...fields }); setRows((l) => l.map((x) => (x.id === id ? r.row : x))); } catch (e) { fail(e); } },
    remove: async (x, label) => { if (!window.confirm(`Delete ${label || "this"}?`)) return; try { await P({ action: `${prefix}-delete`, id: x.id }); setRows((l) => l.filter((y) => y.id !== x.id)); } catch (e) { fail(e); } },
  };
}

// ── Thesis: what the film is really about, versioned ──
export function ThesisCard({ project, onProject, ready }) {
  const list = project.thesis || [];
  const cur = list[list.length - 1] || null;
  const [open, setOpen] = useState(!cur);
  const [text, setText] = useState(cur?.text || "");
  const [one, setOne] = useState(cur?.one_line || "");
  const [changed, setChanged] = useState("");
  const [hist, setHist] = useState(false);
  if (!ready) return <section className="cprof-card"><div className="cprof-cardhead"><h2>What the film is really about</h2></div><SqlHint what="The thesis" /></section>;
  function save() {
    if (!text.trim() && !one.trim()) return;
    onProject({ thesis: [...list, { v: list.length + 1, date: today(), text: text.trim(), one_line: one.trim(), changed: changed.trim() }] });
    setChanged(""); setOpen(false);
  }
  return (
    <section className="cprof-card thesis">
      <div className="cprof-cardhead"><h2>What the film is really about{cur ? <em className="cprof-count">v{cur.v}</em> : null}</h2>
        <span className="gcard-actions">{list.length > 1 && <button type="button" className="achip" onClick={() => setHist(!hist)}>{hist ? "Hide history" : `History (${list.length})`}</button>}<button type="button" className={"achip" + (open ? " is-on" : "")} onClick={() => setOpen(!open)}>{cur ? "Rewrite" : "Write v1"}</button></span>
      </div>
      {cur && !open && <blockquote className="thesis-cur"><strong>{cur.one_line}</strong>{cur.text && <p>{cur.text}</p>}<em className="gcard-meta">v{cur.v} · {fmtDate(cur.date)}{cur.changed ? ` · changed: ${cur.changed}` : ""}</em></blockquote>}
      {!cur && !open && <p className="gcard-meta">One paragraph that names the argument, not the subject. Rewrite it after every interview block and every screening — the diff is the film finding itself.</p>}
      {open && (
        <div className="shoot-new scene-fields">
          <label className="wide">One sentence<input value={one} onChange={(e) => setOne(e.target.value)} placeholder="It was never about the building." /></label>
          <label className="wide">The paragraph (≤150 words)<textarea rows={5} value={text} onChange={(e) => setText(e.target.value)} placeholder="This is a film about what a town keeps when it decides not to let something die — and who pays for it." /></label>
          {cur && <label className="wide">What changed since v{cur.v}<input value={changed} onChange={(e) => setChanged(e.target.value)} placeholder="After the Kellys: it's about the people who stayed, not the priest" /></label>}
          <div className="gcard-actions wide"><button type="button" className="abtn" onClick={save}>Save as v{list.length + 1}</button><button type="button" className="achip" onClick={() => setOpen(false)}>Cancel</button></div>
        </div>
      )}
      {hist && <ol className="thesis-hist">{[...list].reverse().map((t) => <li key={t.v}><strong>v{t.v} · {fmtDate(t.date)}</strong> — {t.one_line}{t.changed ? <em> · {t.changed}</em> : null}</li>)}</ol>}
    </section>
  );
}

// ── Chronology ──
export function ChronologyCard({ project, rows, setRows, people, sources, scenes, fail, ready }) {
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState(null);
  const [era, setEra] = useState("all");
  const api = useRows("chrono", project, rows, setRows, fail);
  if (!ready) return <section className="cprof-card"><div className="cprof-cardhead"><h2>Chronology</h2></div><SqlHint what="The chronology" /></section>;
  async function add(e) { e.preventDefault(); const f = Object.fromEntries(new FormData(e.currentTarget).entries()); try { const r = await api.add({ ...f, turning_point: f.turning_point === "on" }); setAdding(false); setOpen(r.id); e.target.reset(); } catch (err) { fail(err); } }
  const shown = rows.filter((r) => era === "all" || r.era === era);
  const name = (id) => people.find((p) => p.id === id)?.name || "";
  return (
    <section className="cprof-card">
      <div className="cprof-cardhead"><h2>Chronology{rows.length > 0 && <em className="cprof-count">{rows.length}</em>}</h2><button type="button" className="abtn" onClick={() => setAdding(!adding)}>{adding ? "Close" : "+ Event"}</button></div>
      <span className="pbook-kinds">{[["all", "All"], ...ERAS.map((e) => [e, e])].map(([k, l]) => <button key={k} type="button" className={"ifilter" + (era === k ? " is-on" : "")} onClick={() => setEra(k)}>{l}</button>)}</span>
      {adding && (
        <form className="shoot-new" onSubmit={add}>
          <label>When<input name="date_text" required autoFocus placeholder="1962 · Spring 1987 · 2015-03-14" /></label>
          <label>Era<select name="era" defaultValue="">{[["", "—"], ...ERAS.map((e) => [e, e])].map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
          <label>Significance 1–5<input name="significance" type="number" min="1" max="5" defaultValue="3" /></label>
          <label className="wide">What happened<input name="title" required placeholder="The diocese announces the merger plan" /></label>
          <label className="pbook-auto"><input type="checkbox" name="turning_point" /> Turning point</label>
          <button type="submit" className="abtn">Add</button>
        </form>
      )}
      {rows.length === 0 && !adding && <p className="gcard-meta">The factual spine. Every scene points back to a dated event; every event needs a source or it&apos;s a rumor. Mark the turning points — they feed the story line.</p>}
      <ul className="chrono">
        {shown.map((r) => (
          <li key={r.id} className={"chrono-item" + (r.turning_point ? " is-turn" : "") + (open === r.id ? " is-open" : "") + ` ev-${r.evidence}`}>
            <button type="button" className="chrono-row" onClick={() => setOpen(open === r.id ? null : r.id)}>
              <span className="chrono-when">{r.date_text}</span>
              <span className="chrono-main"><strong>{r.turning_point ? "★ " : ""}{r.title}</strong><em>{r.era ? `${r.era} · ` : ""}{EVIDENCE_LABEL[r.evidence]}{r.people?.length ? ` · ${r.people.map(name).filter(Boolean).join(", ")}` : ""}</em></span>
              <span className="chrono-sig">{"●".repeat(r.significance || 0)}</span>
            </button>
            {open === r.id && (
              <div className="person-detail">
                <div className="shoot-new scene-fields">
                  <F label="When" value={r.date_text} onSave={(v) => api.patch(r.id, { date_text: v })} />
                  <F label="Sort date (for order)" value={r.sort_date || ""} type="date" onSave={(v) => api.patch(r.id, { sort_date: v })} />
                  <F label="Era" value={r.era} options={[["", "—"], ...ERAS.map((e) => [e, e])]} onSave={(v) => api.patch(r.id, { era: v })} />
                  <F label="Evidence" value={r.evidence} options={Object.entries(EVIDENCE_LABEL)} onSave={(v) => api.patch(r.id, { evidence: v })} />
                  <F label="Significance" value={r.significance} type="number" onSave={(v) => api.patch(r.id, { significance: v })} />
                  <F label="Scene" value={r.scene_id || ""} options={[["", "—"], ...scenes.map((sc) => [sc.id, `${sc.number}. ${sc.title}`])]} onSave={(v) => api.patch(r.id, { scene_id: v })} />
                  <F label="Title" value={r.title} onSave={(v) => api.patch(r.id, { title: v })} wide />
                  <F label="What happened — the detail" value={r.summary} rows={3} onSave={(v) => api.patch(r.id, { summary: v })} wide />
                </div>
                <div className="scene-people"><span className="kick-sm">Who was there / who tells it</span><span className="pbook-kinds">{people.map((p) => <button key={p.id} type="button" className={"ifilter" + ((r.people || []).includes(p.id) ? " is-on" : "")} onClick={() => api.patch(r.id, { people: (r.people || []).includes(p.id) ? r.people.filter((x) => x !== p.id) : [...(r.people || []), p.id] })}>{p.name}</button>)}</span></div>
                <div className="scene-people"><span className="kick-sm">Sources {(r.source_ids || []).length === 0 && <em className="gcard-meta">— none yet: this is a rumor until it has one</em>}</span><span className="pbook-kinds">{sources.map((s) => <button key={s.id} type="button" className={"ifilter" + ((r.source_ids || []).includes(s.id) ? " is-on" : "")} onClick={() => api.patch(r.id, { source_ids: (r.source_ids || []).includes(s.id) ? r.source_ids.filter((x) => x !== s.id) : [...(r.source_ids || []), s.id] })}>{s.title}</button>)}</span></div>
                <div className="gcard-actions"><button type="button" className={"achip" + (r.turning_point ? " is-on" : "")} onClick={() => api.patch(r.id, { turning_point: !r.turning_point })}>★ Turning point</button><button type="button" className="achip achip-danger" onClick={() => api.remove(r, r.title)}>Delete</button></div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

// ── Sources ──
export function SourcesCard({ project, rows, setRows, fail, ready }) {
  const [adding, setAdding] = useState(false);
  const api = useRows("source", project, rows, setRows, fail);
  if (!ready) return null;
  async function add(e) { e.preventDefault(); const f = Object.fromEntries(new FormData(e.currentTarget).entries()); try { await api.add(f); setAdding(false); e.target.reset(); } catch (err) { fail(err); } }
  return (
    <section className="cprof-card">
      <div className="cprof-cardhead"><h2>Sources{rows.length > 0 && <em className="cprof-count">{rows.length}</em>}</h2><button type="button" className="achip" onClick={() => setAdding(!adding)}>{adding ? "Close" : "+ Source"}</button></div>
      {adding && (
        <form className="shoot-new" onSubmit={add}>
          <label className="wide">Title<input name="title" required autoFocus placeholder="St. Mary's parish register 1950–1975" /></label>
          <label>Kind<select name="kind" defaultValue="document">{SOURCE_KINDS.map((k) => <option key={k} value={k}>{SOURCE_KIND_LABEL[k]}</option>)}</select></label>
          <label>Who has it / author<input name="holder" placeholder="Parish office — Mary" /></label>
          <label>Reliability<select name="reliability" defaultValue="secondary">{Object.entries(RELIABILITY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          <label className="wide">Where<input name="where_text" placeholder="URL / shelf / file" /></label>
          <button type="submit" className="abtn">Add</button>
        </form>
      )}
      {rows.length === 0 && !adding && <p className="gcard-meta">Everything you&apos;ve read, pulled, or been told. Link sources to chronology entries so nothing on screen is unsourced.</p>}
      <ul className="cprof-list">
        {rows.map((s) => <li key={s.id}><strong>{s.title}</strong> <span className="gcard-meta">· {SOURCE_KIND_LABEL[s.kind]} · {RELIABILITY_LABEL[s.reliability]}{s.holder ? ` · ${s.holder}` : ""}{s.where_text ? ` · ${s.where_text}` : ""}</span><span className="gcard-actions"><button type="button" className={"achip" + (s.obtained ? " is-on" : "")} onClick={() => api.patch(s.id, { obtained: !s.obtained })}>{s.obtained ? "In hand ✓" : "Not yet"}</button><button type="button" className="prep-x" onClick={() => api.remove(s, s.title)} aria-label="Remove">×</button></span></li>)}
      </ul>
    </section>
  );
}

// ── Question banks ──
export function QuestionsCard({ project, rows, setRows, people, fail, ready }) {
  const [theme, setTheme] = useState(QUESTION_THEMES[0]);
  const [text, setText] = useState("");
  const api = useRows("question", project, rows, setRows, fail);
  if (!ready) return <section className="cprof-card"><div className="cprof-cardhead"><h2>Questions</h2></div><SqlHint what="Question banks" /></section>;
  const beats = project.beats || [];
  const cast = people.filter((p) => p.kind === "interview");
  async function add(e) { e.preventDefault(); const t = text.trim(); if (!t) return; try { await api.add({ theme, text: t, priority: 2 }); setText(""); } catch (err) { fail(err); } }
  const shown = rows.filter((q) => q.theme === theme);
  const themes = [...new Set([...QUESTION_THEMES, ...rows.map((q) => q.theme)])];
  const askedBy = (q) => Object.entries(q.asked || {}).filter(([, v]) => v?.date);
  return (
    <section className="cprof-card">
      <div className="cprof-cardhead"><h2>Question banks{rows.length > 0 && <em className="cprof-count">{rows.length}</em>}</h2><span className="gcard-meta">By theme, not by person. Tag who to ask; it shows up on their interview plan.</span></div>
      <span className="pbook-kinds">{themes.map((t) => <button key={t} type="button" className={"ifilter" + (theme === t ? " is-on" : "")} onClick={() => setTheme(t)}>{t} {rows.filter((q) => q.theme === t).length || ""}</button>)}</span>
      <form className="prep-add" onSubmit={add}><input value={text} onChange={(e) => setText(e.target.value)} placeholder={`A "${theme}" question — "When did you first think it might actually close?"`} /><button type="submit" className="achip" disabled={!text.trim()}>+ Add</button></form>
      <ul className="qbank">
        {shown.map((q) => (
          <li key={q.id} className={`q-p${q.priority}`}>
            <div className="q-row">
              <select className="q-pri" value={q.priority} onChange={(e) => api.patch(q.id, { priority: Number(e.target.value) })} aria-label="Priority"><option value={1}>must</option><option value={2}>should</option><option value={3}>nice</option></select>
              <input className="q-text" defaultValue={q.text} onBlur={(e) => e.target.value !== q.text && api.patch(q.id, { text: e.target.value })} />
              <select className="q-beat" value={q.beat_index ?? ""} onChange={(e) => api.patch(q.id, { beat_index: e.target.value })} aria-label="Beat"><option value="">beat…</option>{beats.map((b, i) => <option key={i} value={i}>{i + 1}. {b.text.slice(0, 40)}</option>)}</select>
              <button type="button" className="prep-x" onClick={() => api.remove(q, "this question")} aria-label="Remove">×</button>
            </div>
            <div className="q-who"><span className="gcard-meta">Ask:</span>{cast.map((p) => { const a = (q.asked || {})[p.id]; const on = (q.people || []).includes(p.id); return <button key={p.id} type="button" className={"ifilter q-chip" + (on ? " is-on" : "") + (a?.date ? " is-asked" : "")} title={a?.date ? `Asked ${fmtDate(a.date)} · quality ${a.quality}/5` : "Tap to add to their plan"} onClick={() => api.patch(q.id, { people: on ? q.people.filter((x) => x !== p.id) : [...(q.people || []), p.id] })}>{p.name.split(" ")[0]}{a?.date ? ` ✓${a.quality || ""}` : ""}</button>; })}{askedBy(q).length === 0 && (q.people || []).length > 0 && <em className="gcard-meta">not asked yet</em>}</div>
            {q.followups && <p className="q-follow">↳ {q.followups}</p>}
          </li>
        ))}
      </ul>
      {rows.length > 0 && <p className="gcard-meta">Gap check: {beats.map((b, i) => ({ i, n: rows.filter((q) => q.beat_index === i && askedBy(q).some(([, v]) => v.quality >= 4)).length })).filter((x) => x.n === 0).map((x) => `${x.i + 1}`).join(", ") || "every beat has a good answer"} {beats.length ? "— beats without a strong answer yet" : ""}</p>}
    </section>
  );
}

// ── Events: things that happen on a date and won't repeat ──
export function EventsCard({ project, rows, setRows, locations, scenes, days, fail, say, ready, isOwner, onPlanDay }) {
  const [adding, setAdding] = useState(false);
  const api = useRows("event", project, rows, setRows, fail);
  if (!ready) return <section className="cprof-card"><div className="cprof-cardhead"><h2>Events</h2></div><SqlHint what="Events" /></section>;
  async function add(e) { e.preventDefault(); const f = Object.fromEntries(new FormData(e.currentTarget).entries()); try { await api.add(f); setAdding(false); e.target.reset(); } catch (err) { fail(err); } }
  return (
    <section className="cprof-card">
      <div className="cprof-cardhead"><h2>Events{rows.length > 0 && <em className="cprof-count">{rows.length}</em>}</h2><button type="button" className="abtn" onClick={() => setAdding(!adding)}>{adding ? "Close" : "+ Event"}</button></div>
      {adding && (
        <form className="shoot-new" onSubmit={add}>
          <label className="wide">What<input name="title" required autoFocus placeholder="Feast of the Immaculate Conception — evening Mass" /></label>
          <label>Date<input type="date" name="date" /></label>
          <label>Time<input name="time_text" placeholder="7:00 PM" /></label>
          <label className="wide">Why it matters to the film<input name="why" placeholder="The one night a year the church is full and lit by candles" /></label>
          <button type="submit" className="abtn">Add</button>
        </form>
      )}
      {rows.length === 0 && !adding && <p className="gcard-meta">Masses, feast days, funerals, meetings, the bells at noon — things that happen whether you&apos;re there or not. Rank them by story value, get access, make the day.</p>}
      <ul className="people-list">
        {rows.map((ev) => (
          <li key={ev.id} className={"person st-" + ev.status}>
            <div className="person-row staff-row">
              <span className="person-main"><strong>{ev.title}</strong><em>{ev.date ? fmtDate(ev.date) : ev.recurring || "no date"}{ev.time_text ? ` · ${ev.time_text}` : ""}{ev.why ? ` · ${ev.why}` : ""}</em></span>
              <span className="person-tags"><span className={"itag" + (ev.access === "approved" ? " is-rel" : ev.access === "restricted" ? " is-alert" : "")}>{ACCESS_LABEL[ev.access]}</span><span className={`itag st-${ev.status}`}>{EVENT_STATUS_LABEL[ev.status]}</span></span>
            </div>
            <div className="person-detail">
              <div className="gcard-actions">
                <select className="achip" value={ev.access} onChange={(e) => api.patch(ev.id, { access: e.target.value })} aria-label="Access">{Object.entries(ACCESS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
                <select className="achip" value={ev.status} onChange={(e) => api.patch(ev.id, { status: e.target.value })} aria-label="Status">{Object.entries(EVENT_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
                <select className="achip" value={ev.scene_id || ""} onChange={(e) => api.patch(ev.id, { scene_id: e.target.value })} aria-label="Scene"><option value="">scene…</option>{scenes.map((sc) => <option key={sc.id} value={sc.id}>{sc.number}. {sc.title}</option>)}</select>
                {ev.shoot_id ? <span className="itag is-rel">on the calendar</span> : isOwner && ev.date && <button type="button" className="achip achip-primary" onClick={() => onPlanDay(ev)}>Make it a shoot day</button>}
                <button type="button" className="prep-x" onClick={() => api.remove(ev, ev.title)} aria-label="Remove">×</button>
              </div>
              <div className="shoot-new scene-fields">
                <F label="Restrictions" value={ev.restrictions} onSave={(v) => api.patch(ev.id, { restrictions: v })} placeholder="No comms during the consecration · no faces of kids · stay behind the last pew" wide />
                <F label="Plan — crew, gear, positions, audio" value={ev.plan} rows={2} onSave={(v) => api.patch(ev.id, { plan: v })} placeholder="A-cam balcony wide locked off; B-cam side aisle handheld; lav on Father; board feed if the organist allows" wide />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ── Style guide ──
export function StyleCard({ project, onProject, ready }) {
  if (!ready) return null;
  const st = project.style || {};
  return (
    <section className="cprof-card">
      <div className="cprof-cardhead"><h2>Style guide</h2><span className="gcard-meta">So weeks of shooting match. Hand it to the colorist and the editor on day one of post.</span></div>
      <div className="shoot-new scene-fields">{STYLE_FIELDS.map(([k, label, ph]) => <F key={k} label={label} value={st[k] || ""} rows={k === "interview_look" || k === "references" || k === "broll" ? 2 : 0} onSave={(v) => onProject({ style: { ...st, [k]: v } })} placeholder={ph} wide />)}</div>
    </section>
  );
}

// ── Interview plan (inside a person) + eyeline map strip ──
export function EyelineMap({ people, onPatch }) {
  const cast = people.filter((p) => p.kind === "interview");
  if (!cast.length) return null;
  return (
    <div className="eyeline">
      <span className="kick-sm">Eyeline map — opposing characters look at each other across the cut</span>
      <div className="eyeline-cols">
        <div><em>◀ looks left</em>{cast.filter((p) => p.eyeline === "L").map((p) => <button key={p.id} type="button" className="ifilter is-on" onClick={() => onPatch(p.id, { eyeline: "R" })}>{p.name}</button>)}</div>
        <div><em>unset</em>{cast.filter((p) => !p.eyeline).map((p) => <button key={p.id} type="button" className="ifilter" onClick={() => onPatch(p.id, { eyeline: cast.filter((x) => x.eyeline === "L").length <= cast.filter((x) => x.eyeline === "R").length ? "L" : "R" })}>{p.name}</button>)}</div>
        <div><em>looks right ▶</em>{cast.filter((p) => p.eyeline === "R").map((p) => <button key={p.id} type="button" className="ifilter is-on" onClick={() => onPatch(p.id, { eyeline: "L" })}>{p.name}</button>)}</div>
      </div>
    </div>
  );
}
export function InterviewPlan({ x, questions = [], onPatch }) {
  const plan = x.plan || {};
  const set = (k, v) => onPatch({ plan: { ...plan, [k]: v } });
  const mine = questions.filter((q) => (q.people || []).includes(x.id)).sort((a, b) => a.priority - b.priority);
  const [take, setTake] = useState({ at: "", note: "" });
  return (
    <div className="iplan">
      <span className="kick-sm">Interview plan</span>
      <div className="shoot-new scene-fields">
        <F label="Arc role" value={x.arc_role || ""} options={[["", "—"], ...ARC_ROLES.map((r) => [r, ARC_ROLE_LABEL[r]])]} onSave={(v) => onPatch({ arc_role: v })} />
        <F label="Eyeline" value={x.eyeline || ""} options={[["", "—"], ["L", "◀ looks left"], ["R", "looks right ▶"]]} onSave={(v) => onPatch({ eyeline: v })} />
        <F label="On-camera energy 1–5" value={plan.energy || ""} type="number" onSave={(v) => set("energy", v)} />
        <F label="Pre-interview call" value={plan.pre_date || ""} type="date" onSave={(v) => set("pre_date", v)} />
        <F label="Pre-interview notes — what they're good at, best stories heard" value={plan.pre_notes || ""} rows={3} onSave={(v) => set("pre_notes", v)} placeholder="Facts, not emotion. Great on the '87 roof collapse. Cries when the bells come up." wide />
        <F label="Sensitivities — don't ask" value={plan.sensitivities || ""} onSave={(v) => set("sensitivities", v)} placeholder="Her brother; the 2003 pastor" wide />
        <F label="Setup" value={plan.setup || ""} onSave={(v) => set("setup", v)} placeholder="Seated, front pew, altar soft behind" />
        <F label="Look" value={plan.look || ""} onSave={(v) => set("look", v)} placeholder="Interview look A · window key" />
        <F label="Lens / framing" value={plan.lens || ""} onSave={(v) => set("lens", v)} placeholder="A: 85 tight · B: 35 wide" />
        <F label="Mics" value={plan.mics || ""} onSave={(v) => set("mics", v)} placeholder="Lav + boom to recorder" />
        <F label="Duration (min)" value={plan.duration_min || ""} type="number" onSave={(v) => set("duration_min", v)} />
        <F label="Wardrobe note (sent?)" value={plan.wardrobe || ""} onSave={(v) => set("wardrobe", v)} placeholder="Sunday clothes, no patterns — texted 11/2" />
        <F label="Warm-up topics" value={plan.warmup || ""} onSave={(v) => set("warmup", v)} placeholder="The garden, the grandkids" wide />
        <F label="Must-get moments" value={plan.must_gets || ""} rows={2} onSave={(v) => set("must_gets", v)} placeholder="The line about the last Christmas. Her hands on the pew." wide />
      </div>
      <div className="iplan-q"><span className="kick-sm">Their questions · {mine.length}</span>
        {mine.length === 0 && <p className="gcard-meta">None tagged yet — tag them on the Story tab → Question banks, or write below.</p>}
        <ol>{mine.map((q) => { const a = (q.asked || {})[x.id] || {}; return <li key={q.id} className={a.date ? "is-asked" : ""}><span className={`q-p${q.priority}`}>{q.priority === 1 ? "★ " : ""}{q.text}</span>{q.followups && <em> ↳ {q.followups}</em>}<span className="gcard-actions"><button type="button" className={"achip" + (a.date ? " is-on" : "")} onClick={() => P({ action: "question-update", id: q.id, asked: { ...(q.asked || {}), [x.id]: a.date ? {} : { date: today(), quality: a.quality || 3 } } }).then(() => window.location.reload())}>{a.date ? `asked ${fmtDate(a.date)}` : "asked"}</button>{a.date && <select className="achip" value={a.quality || 3} onChange={(e) => P({ action: "question-update", id: q.id, asked: { ...(q.asked || {}), [x.id]: { ...a, quality: Number(e.target.value) } } })} aria-label="Answer quality">{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}/5</option>)}</select>}</span></li>; })}</ol>
      </div>
      <div className="iplan-takes"><span className="kick-sm">Best takes · debrief (same night)</span>
        <ul className="cprof-list">{(plan.best_takes || []).map((t, i) => <li key={i}><strong>{t.at}</strong> <span>{t.note}</span><button type="button" className="prep-x" onClick={() => set("best_takes", plan.best_takes.filter((_, j) => j !== i))} aria-label="Remove">×</button></li>)}</ul>
        <form className="prep-add" onSubmit={(e) => { e.preventDefault(); if (!take.note.trim()) return; set("best_takes", [...(plan.best_takes || []), { at: take.at.trim(), note: take.note.trim() }]); setTake({ at: "", note: "" }); }}><input className="person-at" value={take.at} onChange={(e) => setTake({ ...take, at: e.target.value })} placeholder="00:14:32" aria-label="Timecode" /><input value={take.note} onChange={(e) => setTake({ ...take, note: e.target.value })} placeholder="The pause before 'we stayed' — use it" aria-label="Note" /><button type="submit" className="achip" disabled={!take.note.trim()}>+ Take</button></form>
        <F label="Debrief — how it went, what to re-ask, what changed in the story" value={plan.debrief || ""} rows={3} onSave={(v) => set("debrief", v)} wide />
      </div>
    </div>
  );
}
