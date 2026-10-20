"use client";

// One shoot day, shared. Brandon opens it from Studio (role="brandon"), the
// business owner opens the same day from their portal (role="client"). Both
// see the same running order and edit the same scripts; every script
// autosaves and says who touched it last. Two people editing the same
// script at once: the second save is refused, the newer copy loads, and a
// line says so — nothing is silently lost (it stays in the notes thread).
//
// Layout, top to bottom:
//   day header   — title, date, start time, where, status (Brandon edits; owner reads)
//   running order — every script with its clock time, kind, status; ↑↓, open
//   script       — the detailed editor (steps: Say / Do / Camera / secs), notes
//   + Add        — a kind picker; Brandon can ask Claude to draft it

import { useEffect, useRef, useState } from "react";
import { KINDS, KIND_LABEL, STATUSES, STATUS_LABEL, DAY_STATUSES, DAY_STATUS_LABEL, NEEDS_LABEL, cleanBody, blankStep, runningOrder, totalMinutes, fmt12, fmtMins, stepSecs } from "../lib/scripts";

async function api(payload) {
  const res = await fetch("/api/days", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) { const e = new Error(json.error || `Request failed (${res.status})`); e.status = res.status; e.script = json.script; throw e; }
  return json;
}
const when = (iso) => (iso ? new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "");
const dateLong = (d) => (d ? new Date(d + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }) : "");
const lines = (arr) => (arr || []).join("\n");

export default function ShootDay({ initial, role, aiReady = false, backHref = "/portal", backLabel = "Back" }) {
  const [day, setDay] = useState(initial);
  const [scripts, setScripts] = useState(initial.scripts || []);
  const [open, setOpen] = useState(() => (initial.scripts?.length === 1 ? initial.scripts[0].id : null));
  const [adding, setAdding] = useState(false);
  const [flash, setFlash] = useState("");
  const [error, setError] = useState("");
  const me = role === "brandon" ? "brandon" : "client";
  const who = (w) => (w === "brandon" ? "Brandon" : day.client?.name?.split(" ")[0] || "the owner");
  const say = (m) => { setFlash(m); setError(""); setTimeout(() => setFlash(""), 3500); };
  const fail = (e) => { setError(e.message || String(e)); setFlash(""); };

  async function reload() {
    try { const r = await api({ action: "load", dayId: day.id }); setDay(r.day); setScripts(r.day.scripts); } catch (e) { fail(e); }
  }
  // Someone else may be editing: pick up their changes every half minute.
  useEffect(() => {
    const t = setInterval(() => { if (document.visibilityState === "visible") reload(); }, 30000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day.id]);

  async function addScript(kind) {
    setAdding(false);
    try {
      const r = await api({ action: "script-add", dayId: day.id, kind });
      setScripts((s) => [...s, r.script]);
      setOpen(r.script.id);
      say(`${KIND_LABEL[kind]} added`);
    } catch (e) { fail(e); }
  }
  async function move(id, dir) {
    const ids = scripts.map((s) => s.id);
    const i = ids.indexOf(id), j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    const by = Object.fromEntries(scripts.map((s) => [s.id, s]));
    setScripts(ids.map((x, position) => ({ ...by[x], position })));
    try { await api({ action: "script-order", dayId: day.id, order: ids }); } catch (e) { fail(e); reload(); }
  }
  async function remove(s) {
    if (!window.confirm(`Remove “${s.title || KIND_LABEL[s.kind]}” from this day?`)) return;
    try { await api({ action: "script-delete", dayId: day.id, scriptId: s.id }); setScripts((x) => x.filter((y) => y.id !== s.id)); if (open === s.id) setOpen(null); } catch (e) { fail(e); }
  }
  // `remount` reloads the editor with the new copy (Claude's draft, the other
  // person's version); a plain autosave keeps the editor as it is.
  const [bump, setBump] = useState({});
  const replace = (script, remount = false) => {
    setScripts((x) => x.map((y) => (y.id === script.id ? script : y)));
    if (remount) setBump((b) => ({ ...b, [script.id]: (b[script.id] || 0) + 1 }));
  };

  const order = runningOrder(day, scripts);
  const total = totalMinutes(scripts);
  const ready = scripts.filter((s) => s.status !== "draft").length;

  return (
    <div className="sday">
      <div className="sday-top">
        <a className="achip" href={backHref}>← {backLabel}</a>
        {flash && <span className="sday-flash" role="status">{flash}</span>}
        {error && <span className="cform-error" role="alert">{error}</span>}
      </div>

      <DayHeader day={day} role={me} onSaved={(patch) => setDay((d) => ({ ...d, ...patch }))} onError={fail} total={total} ready={ready} count={scripts.length} />

      <section className="sday-order">
        <div className="sday-sechead">
          <h2>Running order</h2>
          <span className="gcard-meta">{scripts.length === 0 ? "Nothing yet" : `${scripts.length} piece${scripts.length === 1 ? "" : "s"} · ${fmtMins(total)} of filming · ${ready} ready`}</span>
        </div>
        {scripts.length === 0 && (
          <p className="sday-empty">
            {me === "brandon" ? "Add the first script below — a reel, a recipe, a how-to. Claude can draft it from their brand and brief, then you both shape it." : "Nothing on the board yet. Add an idea below — even a one-line title — and Brandon picks it up from there."}
          </p>
        )}
        <ol className="sday-list">
          {order.map((s, i) => (
            <li key={s.id} className={"sday-row is-" + s.status + (open === s.id ? " is-open" : "")}>
              <button type="button" className="sday-rowbtn" aria-expanded={open === s.id} onClick={() => setOpen(open === s.id ? null : s.id)}>
                <span className="sday-at">{s.at ? fmt12(s.at) : `#${i + 1}`}</span>
                <span className="sday-main">
                  <strong>{s.title || <em>Untitled {KIND_LABEL[s.kind]}</em>}</strong>
                  <em>{KIND_LABEL[s.kind]} · {fmtMins(s.minutes || 0)} to film{(s.body?.steps || []).length ? ` · ${s.body.steps.length} steps` : ""}{s.body?.length ? ` · ${s.body.length} finished` : ""}</em>
                </span>
                <span className={`itag sday-status is-${s.status}`}>{STATUS_LABEL[s.status]}</span>
              </button>
              <span className="sday-rowactions">
                <button type="button" className="achip" onClick={() => move(s.id, -1)} disabled={i === 0} aria-label="Move earlier">↑</button>
                <button type="button" className="achip" onClick={() => move(s.id, 1)} disabled={i === order.length - 1} aria-label="Move later">↓</button>
              </span>
              {open === s.id && (
                <ScriptEditor key={s.id + ":" + (bump[s.id] || 0)} script={s} day={day} role={me} who={who} aiReady={aiReady} onChange={replace} onRemove={() => remove(s)} onError={fail} onSay={say} />
              )}
            </li>
          ))}
        </ol>

        <div className="sday-add">
          {adding ? (
            <div className="sday-kinds">
              <span className="kick-sm">What kind?</span>
              {KINDS.map((k) => (
                <button key={k.id} type="button" className="sday-kind" onClick={() => addScript(k.id)}>
                  <strong>{k.label}</strong>{k.hint && <em>{k.hint}</em>}
                </button>
              ))}
              <button type="button" className="achip" onClick={() => setAdding(false)}>Cancel</button>
            </div>
          ) : (
            <button type="button" className="abtn" onClick={() => setAdding(true)}>+ Add a script</button>
          )}
        </div>
      </section>
    </div>
  );
}

// Title / date / start / where / status / day notes. Owner edits notes only.
function DayHeader({ day, role, onSaved, onError, total, ready, count }) {
  const [edit, setEdit] = useState(false);
  const [notes, setNotes] = useState(day.notes || "");
  const [busy, setBusy] = useState(false);
  const timer = useRef(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    clearTimeout(timer.current);
    timer.current = setTimeout(() => api({ action: "day-update", dayId: day.id, patch: { notes } }).then(() => onSaved({ notes })).catch(onError), 900);
    return () => clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes]);

  async function save(e) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget).entries());
    setBusy(true);
    try { await api({ action: "day-update", dayId: day.id, patch: f }); onSaved(f); setEdit(false); } catch (err) { onError(err); } finally { setBusy(false); }
  }
  const endMins = /^\d{2}:\d{2}$/.test(day.start_time || "") ? day.start_time.split(":").map(Number).reduce((h, m) => h * 60 + m) + total : null;
  const end = endMins !== null ? `${String(Math.floor(endMins / 60) % 24).padStart(2, "0")}:${String(endMins % 60).padStart(2, "0")}` : "";

  return (
    <header className="sday-head">
      {edit ? (
        <form className="sday-edit" onSubmit={save}>
          <label>Title<input name="title" defaultValue={day.title} required /></label>
          <label>Date<input type="date" name="date" defaultValue={day.date || ""} /></label>
          <label>Start<input type="time" name="start_time" defaultValue={day.start_time || ""} /></label>
          <label className="wide">Where<input name="location" defaultValue={day.location} placeholder="The shop, the kitchen, out front…" /></label>
          <label>Status<select name="status" defaultValue={day.status}>{DAY_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></label>
          <div className="gcard-actions"><button type="submit" className="abtn" disabled={busy}>Save</button><button type="button" className="achip" onClick={() => setEdit(false)}>Cancel</button></div>
        </form>
      ) : (
        <>
          <div className="sday-headtop">
            <div>
              <p className="cx-kick sday-kick">{day.client?.name || "Shoot day"} · <span className={`itag is-${day.status}`}>{DAY_STATUS_LABEL[day.status]}</span></p>
              <h1 className="sday-title">{day.title}</h1>
              <p className="sday-when">
                {day.date ? dateLong(day.date) : <em>Date to be set</em>}
                {day.start_time && ` · ${fmt12(day.start_time)}${end ? ` – ${fmt12(end)}` : ""}`}
                {day.location && ` · ${day.location}`}
              </p>
            </div>
            {role === "brandon" && <button type="button" className="achip" onClick={() => setEdit(true)}>Edit day</button>}
          </div>
          <dl className="sday-stats">
            <div><dt>Scripts</dt><dd>{count}</dd></div>
            <div><dt>Filming</dt><dd>{fmtMins(total)}</dd></div>
            <div><dt>Ready</dt><dd>{ready} of {count}</dd></div>
          </dl>
        </>
      )}
      <label className="sday-notes">
        <span>Day notes — both of you can write here</span>
        <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Parking, who's around that day, what has to be done before lunch, anything either of you should know…" />
      </label>
    </header>
  );
}

// The script itself. Autosaves 900ms after the last change, with the rev it
// was loaded at; a 409 means the other person saved first.
function ScriptEditor({ script, day, role, who, aiReady, onChange, onRemove, onError, onSay }) {
  const [title, setTitle] = useState(script.title || "");
  const [kind, setKind] = useState(script.kind);
  const [status, setStatus] = useState(script.status);
  const [minutes, setMinutes] = useState(script.minutes || 20);
  const [body, setBody] = useState(() => cleanBody(script.body));
  const [state, setState] = useState("saved"); // saved | dirty | saving | stale
  const [stale, setStale] = useState(null); // the newer copy, when a save was refused
  const [note, setNote] = useState("");
  const [idea, setIdea] = useState("");
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const rev = useRef(script.rev);
  const timer = useRef(null);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (stale) return;
    setState("dirty");
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setState("saving");
      try {
        const r = await api({ action: "script-save", dayId: day.id, scriptId: script.id, rev: rev.current, patch: { title, kind, status, minutes, body } });
        rev.current = r.script.rev;
        onChange({ ...r.script, body: cleanBody(r.script.body) });
        setState("saved");
      } catch (e) {
        if (e.status === 409 && e.script) { setStale(e.script); setState("stale"); }
        else { setState("dirty"); onError(e); }
      }
    }, 900);
    return () => clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, kind, status, minutes, body]);

  const set = (k, v) => setBody((b) => ({ ...b, [k]: v }));
  const setStep = (i, k, v) => setBody((b) => ({ ...b, steps: b.steps.map((s, j) => (j === i ? { ...s, [k]: v } : s)) }));
  const addStep = (i) => setBody((b) => { const steps = [...b.steps]; steps.splice(i + 1, 0, blankStep()); return { ...b, steps }; });
  const delStep = (i) => setBody((b) => ({ ...b, steps: b.steps.filter((_, j) => j !== i) }));
  const moveStep = (i, d) => setBody((b) => { const j = i + d; if (j < 0 || j >= b.steps.length) return b; const steps = [...b.steps]; [steps[i], steps[j]] = [steps[j], steps[i]]; return { ...b, steps }; });

  async function addNote(e) {
    e.preventDefault();
    if (!note.trim()) return;
    setBusy(true);
    try { const r = await api({ action: "script-note", dayId: day.id, scriptId: script.id, text: note }); onChange({ ...script, thread: r.thread }); setNote(""); } catch (err) { onError(err); } finally { setBusy(false); }
  }
  async function askClaude() {
    if (body.steps.length && !window.confirm("Rewrite this script with Claude? It keeps what's good and fills in what's thin. The notes thread is read too.")) return;
    setBusy(true);
    try {
      const r = await api({ action: "script-draft", dayId: day.id, scriptId: script.id, title, idea });
      onChange({ ...r.script, body: cleanBody(r.script.body) }, true); // reload the editor with the draft
      onSay("Drafted — read it through, change anything.");
    } catch (err) { onError(err); } finally { setBusy(false); setAsking(false); }
  }
  const secs = stepSecs(body);
  const thread = Array.isArray(script.thread) ? script.thread : [];

  return (
    <div className="scr">
      {stale && (
        <p className="scr-stale" role="alert">
          <strong>{who(stale.updated_by)} saved a newer version while you were typing.</strong> Your last few changes weren't saved.{" "}
          <button type="button" className="rm-linkbtn" onClick={() => onChange({ ...stale, body: cleanBody(stale.body) }, true)}>Load theirs</button>
          {" · "}
          <button type="button" className="rm-linkbtn" onClick={() => { rev.current = stale.rev; setStale(null); setState("dirty"); setBody((b) => ({ ...b })); }}>Keep mine and save over it</button>
        </p>
      )}
      <div className="scr-top">
        <input className="scr-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={`Name this ${KIND_LABEL[kind].toLowerCase()}`} maxLength={140} />
        <div className="scr-meta">
          <label>Kind<select value={kind} onChange={(e) => setKind(e.target.value)}>{KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}</select></label>
          <label>Status<select value={status} onChange={(e) => setStatus(e.target.value)}>{STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></label>
          <label>Minutes to film<input type="number" min={0} max={720} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} /></label>
          <span className={`scr-state is-${state}`}>{state === "saved" ? `Saved ✓ · last by ${who(script.updated_by)} ${when(script.updated_at)}` : state === "saving" ? "Saving…" : state === "stale" ? "Not saved" : "Unsaved…"}</span>
        </div>
      </div>

      {role === "brandon" && (
        <div className="scr-ai">
          {asking ? (
            <div className="scr-ai-box">
              <label>What's the idea? <em>(one line is enough — Claude reads their brand palette, brief and the notes below too)</em>
                <textarea rows={2} value={idea} onChange={(e) => setIdea(e.target.value)} placeholder={kind === "recipe" ? "Her sourdough sandwich loaf, start to finish, with the crumb reveal" : kind === "howto" ? "How to tell real gluten-free from “made in a shared kitchen”" : "The one thing people drive 40 minutes for"} />
              </label>
              <div className="gcard-actions">
                <button type="button" className="abtn" disabled={busy || !aiReady} onClick={askClaude}>{busy ? "Drafting… (up to a minute)" : "Draft it"}</button>
                <button type="button" className="achip" onClick={() => setAsking(false)}>Cancel</button>
                {!aiReady && <span className="gcard-meta">Claude isn't set up on this server.</span>}
              </div>
            </div>
          ) : (
            <button type="button" className="achip" onClick={() => setAsking(true)}>✦ {body.steps.length ? "Rewrite with Claude" : "Ask Claude to draft this"}</button>
          )}
        </div>
      )}

      <div className="scr-grid">
        <Field label="What it's for" v={body.goal} on={(v) => set("goal", v)} rows={2} ph="One sentence: trust, proof, craving, teaching, or selling one thing." />
        <Field label="The hook — first words / first thing on screen" v={body.hook} on={(v) => set("hook", v)} rows={2} ph="The exact words. For a reel it lands in under 2 seconds." />
        <Field label="On camera" v={body.on_camera} on={(v) => set("on_camera", v)} rows={1} ph="Who's in it, who's filming" />
        <Field label="Where" v={body.where} on={(v) => set("where", v)} rows={1} ph="The spot, the light, time of day" />
        <Field label="Finished length" v={body.length} on={(v) => set("length", v)} rows={1} ph="30–45s · 3 min" />
        <Field label={NEEDS_LABEL[kind] || "What to have ready"} v={lines(body.needs)} on={(v) => set("needs", v.split("\n"))} rows={4} ph={kind === "recipe" ? "One per line, with amounts:\n2 cups GF flour blend\n1 tsp xanthan gum\nOven at 375°F" : "One per line"} wide />
      </div>

      <div className="scr-steps">
        <div className="sday-sechead">
          <h3>Steps — in filming order</h3>
          <span className="gcard-meta">{body.steps.length} step{body.steps.length === 1 ? "" : "s"}{secs ? ` · ${secs}s on screen` : ""}</span>
        </div>
        {body.steps.length === 0 && (
          <p className="gcard-meta">Each step: what to <strong>say</strong>, what to <strong>do</strong>, what the <strong>camera shows</strong>, and how many seconds it gets. <button type="button" className="rm-linkbtn" onClick={() => addStep(-1)}>Add the first step</button></p>
        )}
        <ol className="scr-steplist">
          {body.steps.map((st, i) => (
            <li key={i} className="scr-step">
              <div className="scr-stephead">
                <strong>Step {i + 1}</strong>
                <span className="scr-stepactions">
                  <label className="scr-secs">secs<input type="number" min={0} max={3600} value={st.secs || ""} onChange={(e) => setStep(i, "secs", Number(e.target.value))} /></label>
                  <button type="button" className="achip" onClick={() => moveStep(i, -1)} disabled={i === 0} aria-label="Move step up">↑</button>
                  <button type="button" className="achip" onClick={() => moveStep(i, 1)} disabled={i === body.steps.length - 1} aria-label="Move step down">↓</button>
                  <button type="button" className="achip" onClick={() => addStep(i)}>+ After</button>
                  <button type="button" className="achip achip-danger" onClick={() => delStep(i)} aria-label="Remove step">✕</button>
                </span>
              </div>
              <div className="scr-stepgrid">
                <Field label="Say" v={st.say} on={(v) => setStep(i, "say", v)} rows={2} ph="The exact words — or (no talking)" />
                <Field label="Do" v={st.do} on={(v) => setStep(i, "do", v)} rows={2} ph="The action, specific: amounts, which hand, which button" />
                <Field label="Camera shows" v={st.shot} on={(v) => setStep(i, "shot", v)} rows={2} ph="Wide / medium / close / top-down · angle · movement" />
              </div>
            </li>
          ))}
        </ol>
        {body.steps.length > 0 && <button type="button" className="achip" onClick={() => addStep(body.steps.length - 1)}>+ Add a step</button>}
      </div>

      <div className="scr-grid">
        <Field label="B-roll to grab" v={lines(body.broll)} on={(v) => set("broll", v.split("\n"))} rows={3} ph="One per line: hands, textures, the sign, the street, customers" />
        <Field label="Call to action — the closing line" v={body.cta} on={(v) => set("cta", v)} rows={2} ph="One ask." />
        <Field label="Caption" v={body.caption} on={(v) => set("caption", v)} rows={3} ph="1–3 lines + hashtags" />
        <Field label="Notes for the day" v={body.notes} on={(v) => set("notes", v)} rows={3} ph="Safety, timing, shoot this first while the light is good, what can be faked for camera" />
      </div>

      <div className="scr-thread">
        <h3>Notes between you</h3>
        {thread.length === 0 && <p className="gcard-meta">Questions, changes, “can we do this instead” — it all goes here so the script stays the script.</p>}
        <ul>
          {thread.map((t, i) => (
            <li key={i} className={"scr-msg is-" + t.who}><strong>{who(t.who)}</strong> <em>{when(t.at)}</em><p>{t.text}</p></li>
          ))}
        </ul>
        <form onSubmit={addNote} className="scr-msgform">
          <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder={role === "brandon" ? "A note for them…" : "A note for Brandon…"} maxLength={2000} />
          <button type="submit" className="abtn" disabled={busy || !note.trim()}>Post note</button>
        </form>
      </div>

      <div className="gcard-actions scr-foot">
        {(role === "brandon" || script.created_by === "client") && <button type="button" className="achip achip-danger" onClick={onRemove}>Remove from this day</button>}
      </div>
    </div>
  );
}

function Field({ label, v, on, rows = 2, ph = "", wide = false }) {
  const ref = useRef(null);
  useEffect(() => { const el = ref.current; if (el) { el.style.height = "auto"; el.style.height = el.scrollHeight + 2 + "px"; } }, [v]);
  return (
    <label className={"scr-field" + (wide ? " wide" : "")}>
      <span>{label}</span>
      <textarea ref={ref} rows={rows} value={v || ""} onChange={(e) => on(e.target.value)} placeholder={ph} />
    </label>
  );
}
