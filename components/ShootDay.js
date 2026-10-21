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
import { KINDS, KIND_LABEL, STATUSES, STATUS_LABEL, DAY_STATUSES, DAY_STATUS_LABEL, NEEDS_LABEL, cleanBody, blankStep, runningOrder, totalMinutes, dayWindow, fmt12, fmtMins, stepSecs, stepsDone } from "../lib/scripts";

async function api(payload) {
  const res = await fetch("/api/days", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) { const e = new Error(json.error || `Request failed (${res.status})`); e.status = res.status; e.script = json.script; throw e; }
  return json;
}
const when = (iso) => (iso ? new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "");
const dateLong = (d) => (d ? new Date(d + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }) : "");
const lines = (arr) => (arr || []).join("\n");

export default function ShootDay({ initial, role, aiReady = false, emailReady = false, backHref = "/portal", backLabel = "Back", printHref = "" }) {
  const [day, setDay] = useState(initial);
  const [scripts, setScripts] = useState(initial.scripts || []);
  const [open, setOpen] = useState(() => (initial.scripts?.length === 1 ? initial.scripts[0].id : null));
  const [adding, setAdding] = useState(false);
  const [tool, setTool] = useState(""); // "" | plan | import | send
  const [filming, setFilming] = useState(null); // index into the running order, or null
  const [busy, setBusy] = useState(false);
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
  async function duplicate(s) {
    try { const r = await api({ action: "script-duplicate", dayId: day.id, scriptId: s.id }); setScripts((x) => [...x, r.script]); setOpen(r.script.id); say("Copied — rename it"); } catch (e) { fail(e); }
  }
  async function planDay(theme, counts) {
    setBusy(true);
    try {
      const r = await api({ action: "day-draft", dayId: day.id, theme, counts });
      setDay(r.day); setScripts(r.day.scripts); setTool(""); say(`${r.added} script${r.added === 1 ? "" : "s"} drafted — read them through`);
    } catch (e) { fail(e); } finally { setBusy(false); }
  }
  async function importPlan(itemIds) {
    setBusy(true);
    try { const r = await api({ action: "plan-import", dayId: day.id, itemIds }); setDay(r.day); setScripts(r.day.scripts); setTool(""); say(`${r.added} brought in from the content plan`); } catch (e) { fail(e); } finally { setBusy(false); }
  }
  async function sendDay(note) {
    setBusy(true);
    try { const r = await api({ action: "day-send", dayId: day.id, note }); setTool(""); say(`Sent to ${r.to}`); } catch (e) { fail(e); } finally { setBusy(false); }
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

      <div className="sday-tools">
        {scripts.length > 0 && <button type="button" className="abtn" onClick={() => setFilming(0)}>▶ Film mode</button>}
        {me === "brandon" && <button type="button" className={"achip" + (tool === "plan" ? " is-on" : "")} onClick={() => setTool(tool === "plan" ? "" : "plan")}>✦ Plan the day with Claude</button>}
        {me === "brandon" && <button type="button" className={"achip" + (tool === "import" ? " is-on" : "")} onClick={() => setTool(tool === "import" ? "" : "import")}>Import from content plan</button>}
        {printHref && <a className="achip" href={printHref} target="_blank" rel="noreferrer">Print the day ↗</a>}
        {me === "brandon" && <button type="button" className={"achip" + (tool === "send" ? " is-on" : "")} onClick={() => setTool(tool === "send" ? "" : "send")} disabled={!scripts.length}>✉ Send to {day.client?.name?.split(" ")[0] || "client"}</button>}
      </div>
      {tool === "plan" && <PlanDayBox aiReady={aiReady} busy={busy} onGo={planDay} onCancel={() => setTool("")} existing={scripts.length} />}
      {tool === "import" && <ImportBox dayId={day.id} busy={busy} onGo={importPlan} onCancel={() => setTool("")} onError={fail} />}
      {tool === "send" && <SendBox day={day} emailReady={emailReady} busy={busy} onGo={sendDay} onCancel={() => setTool("")} />}
      {filming !== null && order[filming] && (
        <FilmMode
          order={order}
          index={filming}
          who={who}
          onJump={setFilming}
          onClose={() => setFilming(null)}
          onTick={async (s, i, done) => { try { const r = await api({ action: "script-tick", dayId: day.id, scriptId: s.id, step: i, done }); replace({ ...r.script, body: cleanBody(r.script.body) }, true); } catch (e) { fail(e); } }}
          onStatus={async (s, status) => { try { const r = await api({ action: "script-status", dayId: day.id, scriptId: s.id, status }); replace({ ...r.script, body: cleanBody(r.script.body) }, true); } catch (e) { fail(e); } }}
        />
      )}

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
                  <em>{KIND_LABEL[s.kind]} · {fmtMins(s.minutes || 0)} to film{(s.body?.steps || []).length ? ` · ${stepsDone(s.body) ? `${stepsDone(s.body)}/` : ""}${s.body.steps.length} steps${stepsDone(s.body) ? " done" : ""}` : ""}{s.body?.length ? ` · ${s.body.length} finished` : ""}</em>
                </span>
                <span className={`itag sday-status is-${s.status}`}>{STATUS_LABEL[s.status]}</span>
              </button>
              <span className="sday-rowactions">
                <button type="button" className="achip" onClick={() => move(s.id, -1)} disabled={i === 0} aria-label="Move earlier">↑</button>
                <button type="button" className="achip" onClick={() => move(s.id, 1)} disabled={i === order.length - 1} aria-label="Move later">↓</button>
              </span>
              {open === s.id && (
                <ScriptEditor key={s.id + ":" + (bump[s.id] || 0)} script={s} day={day} role={me} who={who} aiReady={aiReady} onChange={replace} onRemove={() => remove(s)} onDuplicate={() => duplicate(s)} onError={fail} onSay={say} />
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
  const win = dayWindow(day, scripts);

  return (
    <header className="sday-head">
      {edit ? (
        <form className="sday-edit" onSubmit={save}>
          <label>Title<input name="title" defaultValue={day.title} required /></label>
          <label>Date<input type="date" name="date" defaultValue={day.date || ""} /></label>
          <label>Start<input type="time" name="start_time" defaultValue={day.start_time || ""} /></label>
          <label>End<input type="time" name="end_time" defaultValue={day.end_time || ""} /></label>
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
                {day.start_time && ` · ${fmt12(day.start_time)}${day.end_time ? ` – ${fmt12(day.end_time)}` : ""}`}
                {day.location && ` · ${day.location}`}
              </p>
            </div>
            {role === "brandon" && <button type="button" className="achip" onClick={() => setEdit(true)}>Edit day</button>}
          </div>
          <dl className="sday-stats">
            <div><dt>Scripts</dt><dd>{count}</dd></div>
            <div><dt>Filming</dt><dd>{fmtMins(total)}{win.wraps && <small className="sday-wraps"> · wraps {fmt12(win.wraps)}</small>}</dd></div>
            {win.available !== null && (
              <div className={win.over > 0 ? "is-over" : ""}><dt>Window</dt><dd>{fmtMins(win.available)}{win.over > 0 ? <small className="sday-wraps"> · {fmtMins(win.over)} over</small> : win.over < 0 ? <small className="sday-wraps"> · {fmtMins(-win.over)} spare</small> : null}</dd></div>
            )}
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
function ScriptEditor({ script, day, role, who, aiReady, onChange, onRemove, onDuplicate, onError, onSay }) {
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
          <h3>Scenes — in filming order</h3>
          <span className="gcard-meta">{body.steps.length} scene{body.steps.length === 1 ? "" : "s"}{secs ? ` · ${secs}s on screen` : ""}</span>
        </div>
        {body.steps.length === 0 && (
          <p className="gcard-meta">One row per scene: <strong>what&apos;s said</strong> on the left, <strong>what&apos;s shown</strong> on the right — the action and how the camera frames it — and how many seconds it gets. <button type="button" className="rm-linkbtn" onClick={() => addStep(-1)}>Add the first scene</button></p>
        )}
        {body.steps.length > 0 && <div className="scr-tchart-head" aria-hidden="true"><span>Scene</span><span>What&apos;s said</span><span>What&apos;s shown</span></div>}
        <ol className="scr-steplist">
          {body.steps.map((st, i) => (
            <li key={i} className="scr-step">
              <div className="scr-stephead">
                <label className="scr-done"><input type="checkbox" checked={Boolean(st.done)} onChange={(e) => setStep(i, "done", e.target.checked)} /><strong>Scene {i + 1}</strong>{st.done && <em>filmed</em>}</label>
                <span className="scr-stepactions">
                  <label className="scr-secs">secs<input type="number" min={0} max={3600} value={st.secs || ""} onChange={(e) => setStep(i, "secs", Number(e.target.value))} /></label>
                  <button type="button" className="achip" onClick={() => moveStep(i, -1)} disabled={i === 0} aria-label="Move scene up">↑</button>
                  <button type="button" className="achip" onClick={() => moveStep(i, 1)} disabled={i === body.steps.length - 1} aria-label="Move scene down">↓</button>
                  <button type="button" className="achip" onClick={() => addStep(i)}>+ After</button>
                  <button type="button" className="achip achip-danger" onClick={() => delStep(i)} aria-label="Remove scene">✕</button>
                </span>
              </div>
              <div className="scr-tchart">
                <div className="scr-tcol scr-tcol-say">
                  <Field label="Say" v={st.say} on={(v) => setStep(i, "say", v)} rows={3} ph="The exact words, as they'd come out — or (no talking)" />
                </div>
                <div className="scr-tcol scr-tcol-show">
                  <Field label="Do" v={st.do} on={(v) => setStep(i, "do", v)} rows={2} ph="The action, specific: amounts, which hand, which button" />
                  <Field label="Camera" v={st.shot} on={(v) => setStep(i, "shot", v)} rows={1} ph="Wide / medium / close / top-down · angle · movement" />
                </div>
              </div>
            </li>
          ))}
        </ol>
        {body.steps.length > 0 && <button type="button" className="achip" onClick={() => addStep(body.steps.length - 1)}>+ Add a scene</button>}
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
        <button type="button" className="achip" onClick={onDuplicate}>Duplicate</button>
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


// ✦ Plan the day: a theme + how many of each kind → Claude writes them all.
function PlanDayBox({ aiReady, busy, onGo, onCancel, existing }) {
  const [theme, setTheme] = useState("");
  const [counts, setCounts] = useState({ reel: 3, howto: 1, recipe: 0, manual: 0, promo: 0, photos: 1 });
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return (
    <div className="sday-box">
      <label className="sday-boxlabel">What's this day about? <em>Claude reads their brand palette and brief too{existing ? `, and won't repeat the ${existing} already here` : ""}.</em>
        <textarea rows={2} value={theme} onChange={(e) => setTheme(e.target.value)} placeholder="Holiday pre-orders: the three best sellers, how to order, and one 'why we're different' piece. Kaci's happy on camera." />
      </label>
      <div className="sday-counts">
        {KINDS.filter((k) => k.id !== "other").map((k) => (
          <label key={k.id}><span>{k.label}</span><input type="number" min={0} max={8} value={counts[k.id]} onChange={(e) => setCounts({ ...counts, [k.id]: Math.max(0, Math.min(8, Number(e.target.value) || 0)) })} /></label>
        ))}
      </div>
      <div className="gcard-actions">
        <button type="button" className="abtn" disabled={busy || !aiReady || !total} onClick={() => onGo(theme, counts)}>{busy ? "Writing the day… (a minute or two)" : `Write ${total} script${total === 1 ? "" : "s"}`}</button>
        <button type="button" className="achip" onClick={onCancel} disabled={busy}>Cancel</button>
        {!aiReady && <span className="gcard-meta">Claude isn't set up on this server.</span>}
      </div>
    </div>
  );
}

// Import from the content plan: tick the items, they become scripts.
function ImportBox({ dayId, busy, onGo, onCancel, onError }) {
  const [items, setItems] = useState(null);
  const [picked, setPicked] = useState(() => new Set());
  useEffect(() => { api({ action: "plan-items", dayId }).then((r) => { setItems(r.items); setPicked(new Set(r.items.map((i) => i.id))); }).catch((e) => { onError(e); setItems([]); }); }, [dayId]); // eslint-disable-line react-hooks/exhaustive-deps
  if (items === null) return <p className="gcard-meta">Loading the plan…</p>;
  if (!items.length) return <div className="sday-box"><p className="gcard-meta">No content plan for them yet — nothing to bring in.</p><button type="button" className="achip" onClick={onCancel}>Close</button></div>;
  const toggle = (id) => setPicked((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  return (
    <div className="sday-box">
      <p className="gcard-meta">Each becomes a script with its idea, hook and shot list filled in — then flesh out the Say / Do lines, or hit ✦ Rewrite with Claude on it.</p>
      <ul className="sday-picks">{items.map((it) => <li key={it.id}><label><input type="checkbox" checked={picked.has(it.id)} onChange={() => toggle(it.id)} /> {it.label}</label></li>)}</ul>
      <div className="gcard-actions">
        <button type="button" className="abtn" disabled={busy || !picked.size} onClick={() => onGo([...picked])}>Bring in {picked.size}</button>
        <button type="button" className="achip" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

// ✉ Send: emails the owner a button that opens this day in their portal.
function SendBox({ day, emailReady, busy, onGo, onCancel }) {
  const [note, setNote] = useState("");
  const email = day.client?.email || "";
  const none = !email || /@no-email\.rothmediaco\.invalid$/.test(email);
  return (
    <div className="sday-box">
      <p className="gcard-meta">{none ? "They have no email on file yet — add one on their profile first." : `Emails ${day.client?.name || email} a button that opens this day in their portal (you get a copy).`}</p>
      <label className="sday-boxlabel">A line in your words (optional)<textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Have a read before Thursday — swap anything you'd say differently." /></label>
      <div className="gcard-actions">
        <button type="button" className="abtn" disabled={busy || none || !emailReady} onClick={() => onGo(note)}>{busy ? "Sending…" : "Send"}</button>
        <button type="button" className="achip" onClick={onCancel}>Cancel</button>
        {!emailReady && <span className="gcard-meta">Email isn't set up on this server.</span>}
      </div>
    </div>
  );
}

// ▶ Film mode: one script at a time, phone-sized. The hook and the Say lines
// big enough to read from across a counter; tick each step as it's in the
// can; "Filmed → next" moves on. Ticks save, so the other person sees them.
function FilmMode({ order, index, who, onJump, onClose, onTick, onStatus }) {
  const s = order[index];
  const b = cleanBody(s.body);
  const done = stepsDone(b);
  const next = index + 1 < order.length ? index + 1 : null;
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); if (e.key === "ArrowRight" && next !== null) onJump(next); if (e.key === "ArrowLeft" && index > 0) onJump(index - 1); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [index, next, onClose, onJump]);
  return (
    <div className="film" role="dialog" aria-modal="true" aria-label="Film mode">
      <div className="film-bar">
        <button type="button" className="achip" onClick={onClose}>✕ Close</button>
        <span className="film-pos">{index + 1} / {order.length}{s.at ? ` · ${fmt12(s.at)}` : ""}</span>
        <span className="film-nav">
          <button type="button" className="achip" disabled={index === 0} onClick={() => onJump(index - 1)}>← Prev</button>
          <button type="button" className="achip" disabled={next === null} onClick={() => onJump(next)}>Next →</button>
        </span>
      </div>
      <div className="film-body">
        <p className="film-kick">{KIND_LABEL[s.kind]} · {fmtMins(s.minutes || 0)}{b.length ? ` · ${b.length} finished` : ""} · <span className={`itag is-${s.status}`}>{STATUS_LABEL[s.status]}</span></p>
        <h2 className="film-title">{s.title || `Untitled ${KIND_LABEL[s.kind]}`}</h2>
        {(b.on_camera || b.where) && <p className="film-meta">{[b.on_camera, b.where].filter(Boolean).join(" · ")}</p>}
        {b.hook && <div className="film-hook"><span>Hook</span><p>{b.hook}</p></div>}
        {b.needs.length > 0 && <details className="film-needs"><summary>{NEEDS_LABEL[s.kind] || "Have ready"} ({b.needs.length})</summary><ul>{b.needs.map((n, i) => <li key={i}>{n}</li>)}</ul></details>}
        <div className="film-progress"><span style={{ width: `${b.steps.length ? Math.round((done / b.steps.length) * 100) : 0}%` }} /></div>
        <ol className="film-steps">
          {b.steps.map((st, i) => (
            <li key={i} className={"film-step" + (st.done ? " is-done" : "")}>
              <button type="button" className="film-tick" aria-pressed={Boolean(st.done)} onClick={() => onTick(s, i, !st.done)}>{st.done ? "✓" : i + 1}</button>
              <div className="film-stepbody">
                {st.say && <p className="film-say">{st.say}</p>}
                {st.do && <p className="film-do"><span>Do</span>{st.do}</p>}
                {st.shot && <p className="film-shot"><span>Camera</span>{st.shot}{st.secs ? ` · ${st.secs}s` : ""}</p>}
              </div>
            </li>
          ))}
          {b.steps.length === 0 && <li className="gcard-meta">No steps written yet.</li>}
        </ol>
        {b.broll.length > 0 && <div className="film-broll"><span>B-roll</span><ul>{b.broll.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
        {b.cta && <div className="film-hook film-cta"><span>Close with</span><p>{b.cta}</p></div>}
        {b.notes && <p className="film-notes">{b.notes}</p>}
      </div>
      <div className="film-foot">
        {s.status === "filmed" || s.status === "delivered" ? (
          <button type="button" className="achip" onClick={() => onStatus(s, "ready")}>Un-mark filmed</button>
        ) : (
          <button type="button" className="abtn" onClick={async () => { await onStatus(s, "filmed"); if (next !== null) onJump(next); }}>{next !== null ? "Filmed → next" : "Filmed ✓"}</button>
        )}
        <span className="gcard-meta">{done}/{b.steps.length} steps · last by {who(s.updated_by)}</span>
      </div>
    </div>
  );
}
