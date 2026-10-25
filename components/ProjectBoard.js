"use client";

// One project: the people (cast + sources, with status, contact, which
// scenes they carry, what to ask them, what they said), the story beats,
// the archive to-gets, the shoot days, and the releases signed on the spot.

import { useState } from "react";
import { PROJECT_STATUSES, PROJECT_STATUS_LABEL, PERSON_STATUSES, PERSON_STATUS_LABEL, PERSON_KINDS, PERSON_KIND_LABEL, ARCHIVE_STATUS_LABEL } from "../lib/projects";
import { SHOOT_KIND_LABEL, SHOOT_STATUS_LABEL } from "../lib/studio-labels";
import { RELEASE_KINDS } from "../lib/releases";
import ReleaseSign from "./ReleaseSign";
import { ReleaseView } from "./VaultList";
import AddressInput from "./AddressInput";
import StoryArc from "./StoryArc";

async function api(path, payload) {
  const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error || `Request failed (${res.status})`);
  return j;
}
const P = (payload) => api("/api/admin/projects", payload);
const fmtDate = (d) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : "No date");
const fmt12 = (t) => { if (!t) return ""; const [h, m] = t.split(":").map(Number); return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`; };
const tel = (v) => v.replace(/[^\d+]/g, "");

export default function ProjectBoard({ initial }) {
  const [p, setP] = useState(initial.project);
  const [people, setPeople] = useState(initial.people);
  const [days, setDays] = useState(initial.days);
  const [releases, setReleases] = useState(initial.releases);
  const [entries, setEntries] = useState(initial.entries);
  const [error, setError] = useState("");
  const [flash, setFlash] = useState("");
  const [signing, setSigning] = useState(null); // { person?, shoot? }
  const [viewing, setViewing] = useState(null);
  const say = (m) => { setFlash(m); setTimeout(() => setFlash(""), 2500); };
  const fail = (e) => setError(e.message);
  async function patchProject(fields, msg = "Saved ✓") { try { const r = await P({ action: "project-update", id: p.id, ...fields }); setP(r.project); say(msg); } catch (e) { fail(e); } }

  const byPerson = {};
  for (const r of releases) if (r.person_id) (byPerson[r.person_id] = byPerson[r.person_id] || []).push(r);
  const interviewed = people.filter((x) => x.kind === "interview" && (x.status === "interviewed" || x.status === "done")).length;
  const onCamera = people.filter((x) => x.kind === "interview").length;
  const beatsDone = p.beats.filter((b) => b.done).length;

  return (
    <div className="cprof project">
      <div className="cprof-head">
        <div>
          <select className={`itag stage-${p.status} proj-status`} value={p.status} onChange={(e) => patchProject({ status: e.target.value })} aria-label="Project status">{PROJECT_STATUSES.map((s) => <option key={s} value={s}>{PROJECT_STATUS_LABEL[s]}</option>)}</select>
          <span className="gcard-meta"> · {SHOOT_KIND_LABEL[p.kind] || p.kind}{p.client_name ? ` · ${p.client_name}` : ""}</span>
        </div>
        <div className="gcard-actions">
          <button type="button" className="abtn" onClick={() => setSigning({})}>✍ Sign a release</button>
          <a className="achip" href="/portal/admin/projects">← Projects</a>
        </div>
      </div>
      {flash && <p className="clients-flash">{flash}</p>}
      {error && <p className="cform-error">{error}</p>}

      <div className="proj-stats">
        <div><strong>{days.filter((d) => d.status === "done").length}/{days.length}</strong><em>days filmed</em></div>
        <div><strong>{interviewed}/{onCamera}</strong><em>interviews done</em></div>
        <div><strong>{beatsDone}/{p.beats.length}</strong><em>beats covered</em></div>
        <div><strong>{releases.length}</strong><em>releases signed</em></div>
      </div>

      <JournalCard project={p} entries={entries} setEntries={setEntries} fail={fail} say={say} />

      <section className="cprof-card">
        <div className="cprof-cardhead"><h2>The story</h2></div>
        <Editable label="Logline" value={p.logline} rows={1} placeholder="One sentence: what this film is about" onSave={(v) => patchProject({ logline: v })} />
        <Editable label="Notes" value={p.notes} rows={3} placeholder="Angle, tone, references, what the client wants it to do" onSave={(v) => patchProject({ notes: v })} />
      </section>

      <section className="cprof-card">
        <div className="cprof-cardhead"><h2>Story line — the hero&apos;s journey</h2><span className="gcard-meta">The whole film on one line. Highs are wins, lows are trouble. Fill the blanks.</span></div>
        <StoryArc arc={p.arc || {}} onSave={(arc) => patchProject({ arc }, "Beat saved")} />
      </section>

      <div className="cprof-cols">
        <div className="cprof-col">
          <PeopleCard project={p} people={people} setPeople={setPeople} days={days} byPerson={byPerson} onSign={(person) => setSigning({ person })} onView={setViewing} fail={fail} say={say} />
          <ReleasesCard releases={releases} people={people} onView={setViewing} onSign={() => setSigning({})} />
        </div>
        <div className="cprof-col">
          <DaysCard project={p} days={days} setDays={setDays} people={people} onSign={(shoot) => setSigning({ shoot })} fail={fail} />
          <BeatsCard project={p} people={people} onSave={(beats) => patchProject({ beats }, "Beats saved")} />
          <ArchiveCard project={p} onSave={(archive) => patchProject({ archive }, "Archive saved")} />
        </div>
      </div>

      {signing && <ReleaseSign project={p} person={signing.person || null} shoot={signing.shoot || null} onSigned={(r) => { setReleases((l) => [r, ...l]); if (signing.person) setPeople((l) => l.map((x) => (x.id === signing.person.id ? x : x))); }} onClose={() => setSigning(null)} />}
      {viewing && <ReleaseView r={{ ...viewing, project_title: p.title }} onClose={() => setViewing(null)} />}
    </div>
  );
}

// ── Journal: the film taking shape, one dated entry at a time ──
const dayLong = (d) => new Date(`${d}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
const todayET = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
function JournalCard({ project, entries, setEntries, fail, say }) {
  const [draft, setDraft] = useState("");
  const [date, setDate] = useState(todayET());
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(null);
  const [editText, setEditText] = useState("");
  const [showAll, setShowAll] = useState(false);
  if (entries === null) return <section className="cprof-card"><div className="cprof-cardhead"><h2>Journal</h2></div><p className="sm-sqlhint">The journal needs <code>supabase/journal.sql</code> run once in the Supabase SQL editor.</p></section>;
  async function add(e) {
    e.preventDefault();
    const t = draft.trim(); if (!t) return;
    setBusy(true);
    try { const r = await P({ action: "entry-add", projectId: project.id, body: t, entry_date: date }); setEntries((l) => [r.entry, ...l].sort(sortEntries)); setDraft(""); setDate(todayET()); say("Written down"); }
    catch (err) { fail(err); } finally { setBusy(false); }
  }
  async function patch(id, fields) {
    try { const r = await P({ action: "entry-update", id, ...fields }); setEntries((l) => l.map((x) => (x.id === id ? r.entry : x)).sort(sortEntries)); } catch (err) { fail(err); }
  }
  async function remove(x) {
    if (!window.confirm("Delete this entry?")) return;
    try { await P({ action: "entry-delete", id: x.id }); setEntries((l) => l.filter((y) => y.id !== x.id)); } catch (err) { fail(err); }
  }
  const pinned = entries.filter((x) => x.pinned);
  const rest = entries.filter((x) => !x.pinned);
  const shown = showAll ? rest : rest.slice(0, 5);
  const Entry = ({ x }) => (
    <li className={"jrnl-entry" + (x.pinned ? " is-pinned" : "")}>
      <div className="jrnl-meta">
        <strong>{dayLong(x.entry_date)}</strong>
        <span className="gcard-actions">
          <button type="button" className="achip" onClick={() => patch(x.id, { pinned: !x.pinned })} title={x.pinned ? "Unpin" : "Pin to the top — part of the outline"}>{x.pinned ? "📌 Pinned" : "Pin"}</button>
          <button type="button" className="achip" onClick={() => { setEditing(x.id); setEditText(x.body); }}>Edit</button>
          <button type="button" className="achip achip-danger" onClick={() => remove(x)}>×</button>
        </span>
      </div>
      {editing === x.id ? (
        <div className="jrnl-edit">
          <textarea rows={6} value={editText} onChange={(e) => setEditText(e.target.value)} autoFocus />
          <div className="gcard-actions"><button type="button" className="abtn" onClick={() => { patch(x.id, { body: editText }); setEditing(null); }}>Save</button><button type="button" className="achip" onClick={() => setEditing(null)}>Cancel</button></div>
        </div>
      ) : <p className="jrnl-body">{x.body}</p>}
    </li>
  );
  return (
    <section className="cprof-card jrnl" id="journal">
      <div className="cprof-cardhead"><h2>Journal{entries.length > 0 && <em className="cprof-count">{entries.length}</em>}</h2><span className="gcard-meta">Where the film gets built. Dictate it, write it, pin what sticks.</span></div>
      <form className="jrnl-new" onSubmit={add}>
        <textarea rows={4} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={"What happened today. What someone said that changed the story. The scene you can suddenly see. The question you still don't have an answer to."} />
        <div className="jrnl-newfoot">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Entry date" />
          <button type="submit" className="abtn" disabled={busy || !draft.trim()}>{busy ? "Saving…" : "Write it down"}</button>
        </div>
      </form>
      {pinned.length > 0 && <><span className="kick-sm">Pinned — the working outline</span><ul className="jrnl-list">{pinned.map((x) => <Entry key={x.id} x={x} />)}</ul></>}
      {rest.length > 0 && <><span className="kick-sm">Entries</span><ul className="jrnl-list">{shown.map((x) => <Entry key={x.id} x={x} />)}</ul></>}
      {rest.length > 5 && <button type="button" className="achip" onClick={() => setShowAll(!showAll)}>{showAll ? "Show fewer" : `Show all ${rest.length}`}</button>}
      {entries.length === 0 && <p className="gcard-meta">Nothing yet. First entry: why this film, in your words.</p>}
    </section>
  );
}
const sortEntries = (a, b) => (b.pinned - a.pinned) || (b.entry_date || "").localeCompare(a.entry_date || "") || (b.created_at || "").localeCompare(a.created_at || "");

// A textarea that saves when you tap away.
function Editable({ label, value, rows = 2, placeholder, onSave }) {
  const [v, setV] = useState(value || "");
  return (
    <label className="proj-field"><span className="kick-sm">{label}</span>
      <textarea rows={rows} value={v} onChange={(e) => setV(e.target.value)} onBlur={() => v !== (value || "") && onSave(v)} placeholder={placeholder} />
    </label>
  );
}

// ── People: cast + sources ──
function PeopleCard({ project, people, setPeople, days, byPerson, onSign, onView, fail, say }) {
  const [adding, setAdding] = useState(people.length === 0);
  const [open, setOpen] = useState(null);
  const [filter, setFilter] = useState("all");
  async function add(e) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget).entries());
    try { const r = await P({ action: "person-add", projectId: project.id, ...f }); setPeople((l) => [...l, r.person]); setAdding(false); setOpen(r.person.id); e.target.reset(); } catch (err) { fail(err); }
  }
  async function patch(id, fields, msg) {
    try { const r = await P({ action: "person-update", id, ...fields }); setPeople((l) => l.map((x) => (x.id === id ? r.person : x))); if (msg) say(msg); } catch (err) { fail(err); }
  }
  async function remove(x) {
    if (!window.confirm(`Remove ${x.name} from the project?`)) return;
    try { await P({ action: "person-delete", id: x.id }); setPeople((l) => l.filter((y) => y.id !== x.id)); } catch (err) { fail(err); }
  }
  const shown = people.filter((x) => filter === "all" || (filter === "todo" ? !["interviewed", "done", "declined"].includes(x.status) : x.kind === filter));
  return (
    <section className="cprof-card" id="people">
      <div className="cprof-cardhead"><h2>People{people.length > 0 && <em className="cprof-count">{people.length}</em>}</h2>
        <button type="button" className="abtn" onClick={() => setAdding(!adding)}>{adding ? "Close" : "+ Add a person"}</button>
      </div>
      <span className="pbook-kinds">
        {[["all", "All"], ["todo", "Still to do"], ["interview", "On camera"], ["source", "Sources"]].map(([k, l]) => <button key={k} type="button" className={"ifilter" + (filter === k ? " is-on" : "")} onClick={() => setFilter(k)}>{l}</button>)}
      </span>
      {adding && (
        <form className="shoot-new" onSubmit={add}>
          <label className="wide">Name<input name="name" required autoFocus placeholder="Fr. Matthew Jones" /></label>
          <label>Role in the story<input name="role" placeholder="Pastor since 2019" /></label>
          <label>They are<select name="kind" defaultValue="interview">{PERSON_KINDS.map((k) => <option key={k} value={k}>{PERSON_KIND_LABEL[k]}</option>)}</select></label>
          <label>Phone<input name="phone" /></label>
          <label>Email<input type="email" name="email" /></label>
          <label className="wide">Which parts of the story they carry<input name="scenes" placeholder="The revival · the 2015 near-closure · the bells" /></label>
          <button type="submit" className="abtn">Add</button>
        </form>
      )}
      {people.length === 0 && !adding && <p className="gcard-meta">Who&apos;s in the film and who gets you things: the priest, the parishioners, the parish historian, the county archive. Add them as you think of them — contact, status, which scenes, what to ask, what they said.</p>}
      <ul className="people-list">
        {shown.map((x) => (
          <li key={x.id} className={"person" + (open === x.id ? " is-open" : "") + ` st-${x.status}`}>
            <button type="button" className="person-row" onClick={() => setOpen(open === x.id ? null : x.id)} aria-expanded={open === x.id}>
              <span className="person-main"><strong>{x.name}</strong><em>{x.role || PERSON_KIND_LABEL[x.kind]}{x.scenes ? ` · ${x.scenes}` : ""}</em></span>
              <span className="person-tags">
                <span className={`itag st-${x.status}`}>{PERSON_STATUS_LABEL[x.status]}</span>
                {(byPerson[x.id] || []).length > 0 && <span className="itag is-rel">✍ {byPerson[x.id].length}</span>}
                {x.quotes?.length > 0 && <span className="itag">“ {x.quotes.length}</span>}
              </span>
            </button>
            {open === x.id && <PersonDetail x={x} days={days} releases={byPerson[x.id] || []} onPatch={(f, m) => patch(x.id, f, m)} onRemove={() => remove(x)} onSign={() => onSign(x)} onView={onView} />}
          </li>
        ))}
      </ul>
    </section>
  );
}

function PersonDetail({ x, days, releases, onPatch, onRemove, onSign, onView }) {
  const [edit, setEdit] = useState(false);
  const [quote, setQuote] = useState("");
  const [at, setAt] = useState("");
  function addQuote(e) {
    e.preventDefault();
    const t = quote.trim(); if (!t) return;
    onPatch({ quotes: [...(x.quotes || []), { text: t, at: at.trim(), when: new Date().toISOString().slice(0, 10) }] }, "Quote saved");
    setQuote(""); setAt("");
  }
  const dropQuote = (i) => onPatch({ quotes: x.quotes.filter((_, j) => j !== i) });
  return (
    <div className="person-detail">
      <div className="gcard-actions">
        {x.phone && <a className="achip" href={`sms:${tel(x.phone)}`}>Text</a>}
        {x.phone && <a className="achip" href={`tel:${tel(x.phone)}`}>Call</a>}
        {x.email && <a className="achip" href={`mailto:${x.email}`}>Email</a>}
        <select className="achip" value={x.status} onChange={(e) => onPatch({ status: e.target.value })} aria-label="Status">{PERSON_STATUSES.map((s) => <option key={s} value={s}>{PERSON_STATUS_LABEL[s]}</option>)}</select>
        <select className="achip" value={x.shoot_id || ""} onChange={(e) => onPatch({ shoot_id: e.target.value || null })} aria-label="Which day"><option value="">— which day —</option>{days.map((d) => <option key={d.id} value={d.id}>{fmtDate(d.date)} · {d.title}</option>)}</select>
        <button type="button" className="achip achip-primary" onClick={onSign}>✍ Sign a release</button>
        <button type="button" className="achip" onClick={() => setEdit(!edit)}>{edit ? "Close edit" : "Edit"}</button>
      </div>
      {edit && (
        <form className="shoot-new" onSubmit={(e) => { e.preventDefault(); onPatch(Object.fromEntries(new FormData(e.currentTarget).entries()), "Saved ✓"); setEdit(false); }}>
          <label>Name<input name="name" defaultValue={x.name} required /></label>
          <label>Role<input name="role" defaultValue={x.role} /></label>
          <label>They are<select name="kind" defaultValue={x.kind}>{PERSON_KINDS.map((k) => <option key={k} value={k}>{PERSON_KIND_LABEL[k]}</option>)}</select></label>
          <label>Phone<input name="phone" defaultValue={x.phone} /></label>
          <label>Email<input type="email" name="email" defaultValue={x.email} /></label>
          <label className="wide">Scenes / parts of the story<input name="scenes" defaultValue={x.scenes} /></label>
          <button type="submit" className="abtn">Save</button>
          <button type="button" className="achip achip-danger" onClick={onRemove}>Remove</button>
        </form>
      )}
      {(x.phone || x.email) && <p className="gcard-meta">{[x.phone, x.email].filter(Boolean).join(" · ")}</p>}
      <Editable label="Questions to ask them" value={x.questions} rows={3} placeholder={"When did you first walk in here?\nWhat was the worst year?\nWhat would be lost if it closed?"} onSave={(v) => onPatch({ questions: v })} />
      <Editable label="Notes" value={x.notes} rows={2} placeholder="How you know them, what they're nervous about, best time to reach them" onSave={(v) => onPatch({ notes: v })} />
      <div className="person-quotes">
        <span className="kick-sm">What they said{x.quotes?.length ? ` · ${x.quotes.length}` : ""}</span>
        <ul>
          {(x.quotes || []).map((q, i) => <li key={i}><q>{q.text}</q><em>{[q.at, q.when].filter(Boolean).join(" · ")}</em><button type="button" className="prep-x" aria-label="Remove quote" onClick={() => dropQuote(i)}>×</button></li>)}
        </ul>
        <form className="prep-add" onSubmit={addQuote}>
          <input value={quote} onChange={(e) => setQuote(e.target.value)} placeholder="The line — as close to verbatim as you can" aria-label="Quote" />
          <input className="person-at" value={at} onChange={(e) => setAt(e.target.value)} placeholder="00:14:32" aria-label="Timecode" />
          <button type="submit" className="achip" disabled={!quote.trim()}>+ Add</button>
        </form>
      </div>
      {releases.length > 0 && (
        <div className="person-rel"><span className="kick-sm">Signed</span>
          {releases.map((r) => <button key={r.id} type="button" className="achip" onClick={() => onView(r)}>✍ {RELEASE_KINDS[r.kind]} · {new Date(r.signed_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</button>)}
        </div>
      )}
    </div>
  );
}

// ── Shoot days ──
function DaysCard({ project, days, setDays, people, onSign, fail }) {
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  async function add(e) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget).entries());
    setBusy(true);
    try {
      const r = await api("/api/admin/shoots", { action: "create", ...f, kind: project.kind, project_id: project.id, client_name: project.client_name, client_email: project.client_email });
      setDays((l) => [...l, { id: r.shoot.id, title: r.shoot.title, kind: r.shoot.kind, status: r.shoot.status, date: r.shoot.date, start_time: r.shoot.start_time, address: r.shoot.address, crew_token: r.shoot.crew_token || null, total: 0, done: 0 }].sort((a, b) => (a.date || "9").localeCompare(b.date || "9")));
      setAdding(false);
    } catch (err) { fail(err); } finally { setBusy(false); }
  }
  return (
    <section className="cprof-card">
      <div className="cprof-cardhead"><h2>Shoot days{days.length > 0 && <em className="cprof-count">{days.length}</em>}</h2>
        <button type="button" className="abtn" onClick={() => setAdding(!adding)}>{adding ? "Close" : "+ Plan a day"}</button>
      </div>
      {adding && (
        <form className="shoot-new" onSubmit={add}>
          <label className="wide">What this day is<input name="title" required autoFocus placeholder="Interviews — Fr. Jones + the Kellys" /></label>
          <label>Date<input type="date" name="date" /></label>
          <label>Start<input type="time" name="start_time" /></label>
          <label className="wide">Where<AddressInput name="address" placeholder="Type it — St. Mary's Corning…" /></label>
          <button type="submit" className="abtn" disabled={busy}>{busy ? "Adding…" : "Add the day"}</button>
          <p className="gcard-meta wide">Goes on the Shoots calendar with the {SHOOT_KIND_LABEL[project.kind]} prep lists — day mode, roll gate, crew QR, the lot.</p>
        </form>
      )}
      {days.length === 0 && !adding && <p className="gcard-meta">Each day of filming is a shoot on the calendar: its own flow, shot list, reminders, crew link.</p>}
      <ul className="shoot-list">
        {days.map((d) => {
          const who = people.filter((x) => x.shoot_id === d.id);
          const pct = d.total ? Math.round((d.done / d.total) * 100) : 0;
          return (
            <li key={d.id} className={`shoot is-${d.status}`}>
              <a className="shoot-row shoot-row-link" href={`/portal/admin/shoots?open=${d.id}`}>
                <span className="shoot-when"><strong>{fmtDate(d.date)}</strong><em>{d.start_time ? fmt12(d.start_time) : "time TBD"}</em></span>
                <span className="shoot-main"><strong>{d.title}</strong><em>{d.address || "no address yet"}{who.length ? ` · ${who.map((x) => x.name.split(" ")[0]).join(", ")}` : ""}</em></span>
                <span className={`itag itag-${d.status}`}>{SHOOT_STATUS_LABEL[d.status]}</span>
              </a>
              <div className="shoot-daylink">
                <div className="crew-progress proj-pct" role="progressbar" aria-valuenow={pct}><span style={{ width: `${pct}%` }} /><em>{pct}%</em></div>
                <button type="button" className="achip" onClick={() => onSign(d)}>✍ Release for this day</button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ── Story beats ──
function BeatsCard({ project, people, onSave }) {
  const [text, setText] = useState("");
  const beats = project.beats || [];
  const set = (next) => onSave(next);
  function add(e) { e.preventDefault(); const t = text.trim(); if (!t) return; set([...beats, { text: t, done: false, who: "" }]); setText(""); }
  const names = people.map((x) => x.name);
  return (
    <section className="cprof-card">
      <div className="cprof-cardhead"><h2>Story beats{beats.length > 0 && <em className="cprof-count">{beats.filter((b) => b.done).length}/{beats.length}</em>}</h2></div>
      {beats.length === 0 && <p className="gcard-meta">The spine of the film, in order. Tick a beat once you&apos;ve got it on camera; name who carries it so you can see what&apos;s still uncovered before the last day.</p>}
      <ul className="shoot-check beats">
        {beats.map((b, i) => (
          <li key={i} className={b.done ? "is-done" : ""}>
            <label><input type="checkbox" checked={b.done} onChange={() => set(beats.map((x, j) => (j === i ? { ...x, done: !x.done } : x)))} /> <span>{i + 1}. {b.text}</span></label>
            <input className="beat-who" list="proj-names" value={b.who} placeholder="who carries it" aria-label="Who carries this beat" onChange={(e) => set(beats.map((x, j) => (j === i ? { ...x, who: e.target.value } : x)))} />
            <button type="button" className="prep-x" aria-label="Remove" onClick={() => set(beats.filter((_, j) => j !== i))}>×</button>
          </li>
        ))}
      </ul>
      <datalist id="proj-names">{names.map((n) => <option key={n} value={n} />)}</datalist>
      <form className="prep-add" onSubmit={add}><input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a beat — e.g. 1962: the church that almost closed" /><button type="submit" className="achip" disabled={!text.trim()}>+ Add</button></form>
    </section>
  );
}

// ── Archive to-gets ──
function ArchiveCard({ project, onSave }) {
  const [text, setText] = useState("");
  const [source, setSource] = useState("");
  const items = project.archive || [];
  const cycle = { wanted: "requested", requested: "in_hand", in_hand: "wanted" };
  function add(e) { e.preventDefault(); const t = text.trim(); if (!t) return; onSave([...items, { text: t, source: source.trim(), status: "wanted" }]); setText(""); setSource(""); }
  return (
    <section className="cprof-card">
      <div className="cprof-cardhead"><h2>Archive &amp; to-gets{items.length > 0 && <em className="cprof-count">{items.filter((a) => a.status === "in_hand").length}/{items.length}</em>}</h2></div>
      {items.length === 0 && <p className="gcard-meta">Old photos, documents, newspaper clippings, the parish register — what you need, who has it, and whether it&apos;s in hand. Tap the status to move it along.</p>}
      <ul className="archive-list">
        {items.map((a, i) => (
          <li key={i} className={`st-${a.status}`}>
            <button type="button" className={`achip arch-st st-${a.status}`} onClick={() => onSave(items.map((x, j) => (j === i ? { ...x, status: cycle[x.status] } : x)))}>{ARCHIVE_STATUS_LABEL[a.status]}</button>
            <span className="arch-text"><strong>{a.text}</strong>{a.source && <em> · {a.source}</em>}</span>
            <button type="button" className="prep-x" aria-label="Remove" onClick={() => onSave(items.filter((_, j) => j !== i))}>×</button>
          </li>
        ))}
      </ul>
      <form className="prep-add arch-add" onSubmit={add}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="1940s photos of the nave" aria-label="What" />
        <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="who has it" aria-label="Source" />
        <button type="submit" className="achip" disabled={!text.trim()}>+ Add</button>
      </form>
    </section>
  );
}

// ── Releases on this project ──
function ReleasesCard({ releases, people, onView, onSign }) {
  return (
    <section className="cprof-card">
      <div className="cprof-cardhead"><h2>Releases{releases.length > 0 && <em className="cprof-count">{releases.length}</em>}</h2>
        <button type="button" className="achip" onClick={onSign}>✍ Sign one</button>
      </div>
      {releases.length === 0 && <p className="gcard-meta">Every signature lands here and in the Vault (More → Vault). Open a person and tap “Sign a release” — they read it on your phone and sign with a finger.</p>}
      <ul className="cprof-list">
        {releases.map((r) => (
          <li key={r.id}><strong>{r.signer_name}</strong> <span className="gcard-meta">· {RELEASE_KINDS[r.kind]} · {new Date(r.signed_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
            <span className="gcard-actions"><button type="button" className="achip" onClick={() => onView(r)}>View</button></span></li>
        ))}
      </ul>
      <p className="gcard-meta">Unsigned on-camera people: {people.filter((x) => x.kind === "interview" && !releases.some((r) => r.person_id === x.id)).map((x) => x.name).join(", ") || "none"}.</p>
    </section>
  );
}
