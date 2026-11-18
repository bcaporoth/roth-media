"use client";

// One shoot day, shared. Brandon opens it from Studio (role="brandon"), the
// business owner opens the same day from their portal (role="client"). Both
// see the same running order. Since 2026-11-18 only Brandon edits the cards
// (the client reads them and leaves notes on what to change; see ScriptClient).
// Every script autosaves and says who touched it last. Two people editing the same
// script at once: the second save is refused, the newer copy loads, and a
// line says so — nothing is silently lost (it stays in the notes thread).
//
// Layout, top to bottom:
//   day header   — title, date, start time, where, status (Brandon edits; owner reads)
//   running order — every script with its clock time, kind, status; ↑↓, open
//   script       — the detailed editor (steps: Say / Do / Camera / secs), notes
//   + Add        — a kind picker; Brandon can ask Claude to draft it

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { KINDS, KIND_LABEL, STYLE_LABEL, toTchart, STATUSES, STATUS_LABEL, DAY_STATUSES, DAY_STATUS_LABEL, NEEDS_LABEL, SEE_LABEL, isCard, cleanBody, blankStep, runningOrder, totalMinutes, dayWindow, fmt12, fmtMins, stepSecs, progressOf, versionOf, vLabel, historyOf } from "../lib/scripts";
import { TChartEditor, QuestionsEditor } from "./ScriptCards";
import Teleprompter, { promptItems } from "./Teleprompter";
import ShotList from "./ShotList";
import ShotTemplatePicker from "./ShotTemplatePicker";
import AddressInput from "./AddressInput";
// Brandon's prep lists for the day (Studio only) — loaded when he opens that tab,
// so the client's copy of this page never downloads it.
const ShootPanel = dynamic(() => import("./ShootsBoard").then((m) => m.ShootPanel), { ssr: false, loading: () => <p className="gcard-meta">Loading prep…</p> });
import { confirmTap } from "../lib/confirm-tap";

async function api(payload) {
  const res = await fetch("/api/days", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) { const e = new Error(json.error || `Request failed (${res.status})`); e.status = res.status; e.script = json.script; throw e; }
  return json;
}
const when = (iso) => (iso ? new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "");
const dateLong = (d) => (d ? new Date(d + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }) : "");
const lines = (arr) => (arr || []).join("\n");
// The add picker leads with these; the rest sit behind "More kinds…".

// Under each row: the other person's latest note (unanswered) or the note
// count, and who last changed it — so neither side has to open a script to
// know something moved.
function SyncLine({ s, me, who, last, notes }) {
  const fresh = last && last.who !== me;
  const bits = [];
  if (fresh) bits.push(`💬 ${who(last.who)}: “${last.text.length > 70 ? last.text.slice(0, 70) + "…" : last.text}”`);
  else if (notes) bits.push(`💬 ${notes} note${notes === 1 ? "" : "s"}`);
  if (s.updated_by && s.updated_by !== me) bits.push(`changed by ${who(s.updated_by)} ${when(s.updated_at)}`);
  return bits.length ? <small className={"sday-sync" + (fresh ? " is-new" : "")}>{bits.join(" · ")}</small> : null;
}

export default function ShootDay({ initial, role, aiReady = false, emailReady = false, backHref = "/portal", backLabel = "Back", printHref = "" }) {
  const [day, setDay] = useState(initial);
  const [scripts, setScripts] = useState(initial.scripts || []);
  const [open, setOpen] = useState(() => (initial.scripts?.length === 1 ? initial.scripts[0].id : null));
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  // "" | plan | import | send. An empty day opens on "Tell Claude what to film".
  const [tool, setTool] = useState(() => (role === "brandon" && !(initial.scripts || []).length ? "plan" : ""));
  const [more, setMore] = useState(false); // Brandon's less-used tools, folded away
  // One page for the whole day (2026-11-16): Scripts | Prep & details. Prep is
  // the calendar shoot's lists, times, notes and delivery — Studio only.
  // A wedding / portrait day with nothing scripted opens on Prep — that is the work there.
  const [pane, setPane] = useState(() => (role === "brandon" && initial.shoot_id && initial.shoot_kind && initial.shoot_kind !== "business" && !(initial.scripts || []).length ? "prep" : "scripts"));
  useEffect(() => { if (typeof window !== "undefined" && window.location.hash === "#prep") setPane("prep"); }, []);
  const [allKinds, setAllKinds] = useState(false);
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

  // The picker stays open on failure and shows the error right there — the
  // toolbar error is off-screen when you're down at the bottom of a long day.
  async function addScript(kind) {
    setAddError("");
    try {
      const r = await api({ action: "script-add", dayId: day.id, kind });
      setAdding(false);
      setScripts((s) => [...s, r.script]);
      setOpen(r.script.id);
      say(`${KIND_LABEL[kind]} added`);
    } catch (e) { setAddError(e.message || String(e)); }
  }
  // Drop a Playbook shot list onto the day as its own card.
  async function addTemplate(list) {
    setBusy(true);
    try {
      const r = await api({ action: "template-add", dayId: day.id, listId: list.id });
      setScripts((s) => [...s, r.script]);
      setTool("");
      say(`${list.title} added. Its shots are in the Shot list below.`);
      setTimeout(() => document.querySelector(".shotlist")?.scrollIntoView({ behavior: "smooth", block: "start" }), 200);
    } catch (e) { fail(e); } finally { setBusy(false); }
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
  // Two taps to remove (no confirm() popup — phones swallow it): the first
  // arms the button for 4 s, the second deletes.
  const [armed, setArmed] = useState(null);
  const armTimer = useRef(null);
  async function remove(s) {
    if (armed !== s.id) {
      setArmed(s.id);
      clearTimeout(armTimer.current);
      armTimer.current = setTimeout(() => setArmed(null), 4000);
      return;
    }
    clearTimeout(armTimer.current); setArmed(null);
    try { await api({ action: "script-delete", dayId: day.id, scriptId: s.id }); setScripts((x) => x.filter((y) => y.id !== s.id)); if (open === s.id) setOpen(null); say("Removed"); } catch (e) { fail(e); }
  }
  // Delete the whole day (More → Delete this day). Same two taps. It takes the
  // day, its scripts and its spot on the Shoots calendar, then goes back.
  const [dayArmed, setDayArmed] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const dayTimer = useRef(null);
  async function removeDay() {
    if (!dayArmed) {
      setDayArmed(true);
      clearTimeout(dayTimer.current);
      dayTimer.current = setTimeout(() => setDayArmed(false), 6000);
      return;
    }
    clearTimeout(dayTimer.current); setDayArmed(false); setDeleting(true);
    try { await api({ action: "day-delete", dayId: day.id, withShoot: true }); window.location.href = backHref; } catch (e) { setDeleting(false); fail(e); }
  }
  async function duplicate(s) {
    try { const r = await api({ action: "script-duplicate", dayId: day.id, scriptId: s.id }); setScripts((x) => [...x, r.script]); setOpen(r.script.id); say("Copied — rename it"); } catch (e) { fail(e); }
  }
  // Write N scripts: the outline lands first (titles, goals, minutes), then
  // each script is written in its own request so a long day never times out.
  const [writing, setWriting] = useState(""); // "Writing 3 of 8 — Title…"
  // The progress bar under the buttons while Claude writes: `at` steps done out
  // of `of` (planning the day is step one, then one step per card).
  const [prog, setProg] = useState(null);
  async function planDay(theme, counts) {
    setBusy(true);
    let r;
    try {
      const want = Object.values(counts || {}).reduce((n, v) => n + (Number(v) || 0), 0);
      setWriting("Planning the day…"); setProg({ at: 0, of: want + 1 });
      r = await api({ action: "day-draft", dayId: day.id, theme, counts });
      setDay(r.day); setScripts(r.day.scripts); setTool("");
    } catch (e) { fail(e); setBusy(false); setWriting(""); setProg(null); return; }
    const ids = r.newIds || [];
    let done = 0, failed = 0;
    for (let i = 0; i < ids.length; i++) {
      const sc = r.day.scripts.find((x) => x.id === ids[i]);
      setWriting(`Writing ${i + 1} of ${ids.length} — ${sc?.title || KIND_LABEL[sc?.kind] || "script"}…`); setProg({ at: i + 1, of: ids.length + 1 });
      try {
        const rr = await api({ action: "script-draft", dayId: day.id, scriptId: ids[i], title: sc?.title, idea: sc?.body?.goal || theme });
        replace(rr.script, true); done++;
      } catch { failed++; }
    }
    setWriting(""); setProg(null); setBusy(false);
    say(failed ? `${done} of ${ids.length} written — ${failed} didn't finish; open each one and tap "Ask Claude"` : `${done} script${done === 1 ? "" : "s"} written — read them through`);
  }
  // ✦ The Pinned Three: the three pinned-post T-charts, written by Claude from
  // their brand page answers (pinned-start, then script-draft one at a time).
  async function writePinned() {
    setBusy(true);
    let r;
    try {
      setWriting("Setting up the Pinned Three…"); setProg({ at: 0, of: 4 });
      r = await api({ action: "pinned-start", dayId: day.id });
      setDay(r.day); setScripts(r.day.scripts);
    } catch (e) { fail(e); setBusy(false); setWriting(""); setProg(null); return; }
    let done = 0, failed = 0;
    for (let i = 0; i < r.pins.length; i++) {
      const p = r.pins[i];
      setWriting(`Writing ${i + 1} of 3 — ${p.title}…`); setProg({ at: i + 1, of: r.pins.length + 1 });
      try { const rr = await api({ action: "script-draft", dayId: day.id, scriptId: p.id, title: p.title, idea: p.idea }); replace(rr.script, true); done++; } catch { failed++; }
    }
    setWriting(""); setProg(null); setBusy(false);
    const empty = r.pins.filter((p) => !p.answered).length;
    say(failed ? `${done} of 3 written — open the others and tap "Ask Claude"` : `The Pinned Three are written — read them through${empty ? ` (${empty} had no answer on their brand page yet, so look for [brackets])` : ""}`);
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
  // Shot list ticks: show it at once, then save one at a time (two saves on
  // the same card at the same moment would each overwrite the other's tick).
  // Tap a shot's card name: open that card and land on the exact line, lit up
  // for a moment. A B-roll shot lands on the top of its card.
  const jumpToShot = (x) => {
    setOpen(x.scriptId);
    setTimeout(() => {
      const card = document.getElementById("scr-" + x.scriptId);
      const row = x.at.scene !== undefined ? card?.querySelector(`[data-line="${x.at.scene}:${x.at.line}"]`) : null;
      const el = row || card;
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: row ? "center" : "start" });
      if (row) { row.classList.add("is-landed"); setTimeout(() => row.classList.remove("is-landed"), 2600); }
    }, 250);
  };
  const tickQueue = useRef(Promise.resolve());
  const tickShot = (x, done) => {
    setScripts((all) => all.map((s) => {
      if (s.id !== x.scriptId) return s;
      const b = cleanBody(s.body);
      if (x.at.broll !== undefined) { const got = new Set(b.broll_done); if (done) got.add(b.broll[x.at.broll]); else got.delete(b.broll[x.at.broll]); b.broll_done = [...got]; }
      else if (b.scenes[x.at.scene]?.lines[x.at.line]) b.scenes[x.at.scene].lines[x.at.line] = { ...b.scenes[x.at.scene].lines[x.at.line], done };
      return { ...s, body: b };
    }));
    tickQueue.current = tickQueue.current.then(async () => {
      try { const r = await api({ action: "script-tick", dayId: day.id, scriptId: x.scriptId, ...x.at, done }); replace({ ...r.script, body: cleanBody(r.script.body) }, true); }
      catch (e) { fail(e); reload(); }
    });
  };
  const total = totalMinutes(scripts);
  const ready = scripts.filter((s) => s.status !== "draft").length;
  // A wedding or portrait client with no scripts sees the day itself (when,
  // where, the flow, talking points) and none of the script tools.
  const lite = me === "client" && Boolean(day.shoot_kind) && day.shoot_kind !== "business" && scripts.length === 0;
  // What's waiting on whoever is looking: a note from the other person that
  // hasn't been answered, and scripts still in draft.
  const threadOf = (s) => (Array.isArray(s.thread) ? s.thread : []);
  const lastNote = (s) => threadOf(s)[threadOf(s).length - 1];
  // For Brandon a client's note stops waiting once he has said OK to it.
  const waiting = order.filter((s) => { const l = lastNote(s); return l && l.who !== me && !(me === "brandon" && l.ok); });
  const drafts = order.filter((s) => s.status === "draft");
  const openScript = (id, toNotes = false) => { setOpen(id); setTimeout(() => (toNotes && document.getElementById("notes-" + id) || document.getElementById("scr-" + id))?.scrollIntoView({ behavior: "smooth", block: "start" }), 50); };

  return (
    <div className="sday">
      <div className="sday-top">
        <a className="achip" href={backHref}>← {backLabel}</a>
        {writing && <span className="sday-flash sday-writing" role="status" aria-live="polite">⏳ {writing}</span>}
        {flash && !writing && <span className="sday-flash" role="status">{flash}</span>}
        {error && <span className="cform-error" role="alert">{error}</span>}
      </div>

      <DayHeader day={day} role={me} onSaved={(patch) => setDay((d) => ({ ...d, ...patch }))} onError={fail} total={total} ready={ready} count={scripts.length} lite={lite} />
      {/* The itinerary, for the client: Brandon's "Flow of the day" list, once the day is locked in. */}
      {me === "client" && (day.flow || []).length > 0 && (
        <section className="sday-flow" aria-label="Flow of the day">
          <h2 className="sday-flow-h">Flow of the day</h2>
          <ol className="sday-flow-list">{day.flow.map((f, i) => <li key={i}><span className="sday-flow-at">{f.time ? fmt12(f.time) : ""}</span><span>{f.text}</span></li>)}</ol>
        </section>
      )}
      {me === "client" && !lite && <QuickTips scripts={scripts} client={day.client} />}

      {me === "brandon" && day.shoot_id && (
        <div className="pbook-kinds cprof-tabs sday-panes" role="tablist" aria-label="This day">
          <button type="button" role="tab" aria-selected={pane === "scripts"} className={"ifilter" + (pane === "scripts" ? " is-on" : "")} onClick={() => setPane("scripts")}>Scripts{scripts.length ? <em className="ifilter-n"> {scripts.length}</em> : null}</button>
          <button type="button" role="tab" aria-selected={pane === "prep"} className={"ifilter" + (pane === "prep" ? " is-on" : "")} onClick={() => setPane("prep")}>Prep &amp; details</button>
        </div>
      )}
      {me === "brandon" && day.shoot_id && pane === "prep" && <ShootPanel shootId={day.shoot_id} />}

      <div className={"sday-scripts" + ((pane === "prep" && me === "brandon" && day.shoot_id) || lite ? " is-hidden" : "")}>
      <div className="sday-tools">
        {scripts.length > 0 && <button type="button" className="abtn" onClick={() => setFilming(0)}>{me === "brandon" ? "▶ Film mode" : "▶ Read them one by one"}</button>}
        {me === "brandon" && <button type="button" className={"achip" + (tool === "send" ? " is-on" : "")} onClick={() => setTool(tool === "send" ? "" : "send")} disabled={!scripts.length}>✉ Send to {day.client?.name?.split(" ")[0] || "client"}</button>}
        {me === "brandon" && <button type="button" className={"achip sday-tellbtn" + (tool === "plan" ? " is-on" : "")} aria-expanded={tool === "plan"} onClick={() => setTool(tool === "plan" ? "" : "plan")}>✦ Tell Claude what to film</button>}
        {printHref && <a className="achip" href={printHref} target="_blank" rel="noreferrer">🖨 Print</a>}
        {me === "brandon" && aiReady && <button type="button" className="achip" onClick={() => { if (!scripts.some((s) => /^Pinned #[123]\b/.test(s.title || "")) || confirmTap("Rewrite the three Pinned posts with Claude from their brand page? It keeps what's good and fills in what's thin.")) writePinned(); }} disabled={busy}>✦ Write the Pinned Three</button>}
        {me === "brandon" && <button type="button" className={"achip" + (more ? " is-on" : "")} aria-expanded={more} onClick={() => setMore(!more)}>⋯ More</button>}
      </div>
      {me === "brandon" && more && (
        <div className="sday-tools sday-more">
          <button type="button" className={"achip" + (tool === "import" ? " is-on" : "")} onClick={() => setTool(tool === "import" ? "" : "import")}>Import from content plan</button>
          <button type="button" className={"achip achip-danger sday-delete" + (dayArmed ? " is-armed" : "")} onClick={removeDay} disabled={deleting}>{deleting ? "Deleting…" : dayArmed ? "Tap again to delete for good" : "Delete this day"}</button>
          {dayArmed && <p className="sday-delete-warn" role="alert">This deletes the day{scripts.length ? `, its ${scripts.length} script${scripts.length === 1 ? "" : "s"}` : ""}{day.shoot_id ? " and its spot on your Shoots calendar" : ""}. It can’t be undone.</p>}
        </div>
      )}
      {prog && (
        <div className="sday-progress" role="status" aria-live="polite">
          <p className="sday-progress-msg"><strong>{writing || "Working…"}</strong><span>Step {Math.min(prog.at + 1, prog.of)} of {prog.of}</span></p>
          <div className="sday-progress-bar" role="progressbar" aria-valuemin={0} aria-valuemax={prog.of} aria-valuenow={prog.at}><span style={{ width: `${Math.max(6, Math.round((prog.at / prog.of) * 100))}%` }} /></div>
          <p className="gcard-meta">Claude is writing. Each card takes about half a minute. Keep this page open.</p>
        </div>
      )}
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
          reminders={me === "brandon" ? day.reminders || [] : []}
          tips={me === "client" ? { scripts, client: day.client } : null}
          readOnly={me !== "brandon"}
          onTick={async (s, i, done) => { try { const r = await api({ action: "script-tick", dayId: day.id, scriptId: s.id, ...(typeof i === "object" ? i : { step: i }), done }); replace({ ...r.script, body: cleanBody(r.script.body) }, true); } catch (e) { fail(e); } }}
          onStatus={async (s, status) => { try { const r = await api({ action: "script-status", dayId: day.id, scriptId: s.id, status }); replace({ ...r.script, body: cleanBody(r.script.body) }, true); } catch (e) { fail(e); } }}
        />
      )}

      {scripts.length > 0 && (
        <div className={"sday-todo" + (waiting.length || drafts.length ? "" : " is-clear")} role="status">
          {me !== "brandon" && waiting.length === 0 && <p>Read each card. If you would change something, open the card and tell Brandon. He makes the change.</p>}
          {me === "brandon" && waiting.length === 0 && drafts.length === 0 && <p>✓ All caught up: no notes waiting on you, nothing still in draft.</p>}
          {waiting.length > 0 && (
            <p><strong>💬 Waiting on you:</strong>{" "}
              {waiting.map((s, i) => <span key={s.id}>{i > 0 && " · "}<button type="button" className="rm-linkbtn" onClick={() => openScript(s.id, true)}>{who(lastNote(s).who)} on “{s.title || `Untitled ${KIND_LABEL[s.kind]}`}”</button></span>)}
            </p>
          )}
          {me === "brandon" && drafts.length > 0 && (
            <p><strong>Still draft:</strong>{" "}
              {drafts.map((s, i) => <span key={s.id}>{i > 0 && " · "}<button type="button" className="rm-linkbtn" onClick={() => openScript(s.id)}>{s.title || `Untitled ${KIND_LABEL[s.kind]}`}</button></span>)}
              <em> (set it to Ready to film once you both agree)</em>
            </p>
          )}
        </div>
      )}

      <section className="sday-order">
        <div className="sday-sechead">
          <h2>Running order</h2>
          {scripts.length === 0 && <span className="gcard-meta">Nothing yet</span>}
        </div>
        {scripts.length === 0 && (
          <p className="sday-empty">
            {me === "brandon" ? "Nothing here yet. Tell Claude what to film (above) and it makes one card for each reel. Or add a T-chart yourself below." : "Nothing here yet. Brandon adds the cards, and you will see them here."}
          </p>
        )}
        <ol className="sday-list">
          {order.map((s, i) => (
            <li key={s.id} id={"scr-" + s.id} className={"sday-row is-" + s.status + (open === s.id ? " is-open" : "")}>
              <button type="button" className="sday-rowbtn" aria-expanded={open === s.id} onClick={() => setOpen(open === s.id ? null : s.id)}>
                <span className="sday-at">{s.at ? fmt12(s.at) : `#${i + 1}`}</span>
                <span className="sday-main">
                  <strong>{s.title || <em>Untitled {KIND_LABEL[s.kind]}</em>}</strong>
                  <em>{KIND_LABEL[s.kind]}{s.body?.style ? ` · ${STYLE_LABEL[s.body.style]}` : ""}{s.body?.length ? ` · plays ${s.body.length}` : ""}{(() => { const p = progressOf(s.kind, s.body); return p.total ? ` · ${p.done ? `${p.done}/` : ""}${p.total} ${p.noun}${p.total === 1 ? "" : "s"}${p.done ? " done" : ""}` : ""; })()} · about {fmtMins(s.minutes || 0)} on set · {vLabel(versionOf(s.body))}</em>
                  <SyncLine s={s} me={me} who={who} last={lastNote(s)} notes={threadOf(s).length} />
                </span>
                <span className={`itag sday-status is-${s.status}`}>{STATUS_LABEL[s.status]}</span>
              </button>
              {me === "brandon" && <span className="sday-rowactions">
                <button type="button" className="achip" onClick={() => move(s.id, -1)} disabled={i === 0} aria-label="Move earlier">↑</button>
                <button type="button" className="achip" onClick={() => move(s.id, 1)} disabled={i === order.length - 1} aria-label="Move later">↓</button>
                {(me === "brandon" || s.created_by === "client") && <button type="button" className={"achip achip-danger sday-rowx" + (armed === s.id ? " is-armed" : "")} onClick={() => remove(s)} aria-label={`Remove ${s.title || KIND_LABEL[s.kind]}`} title="Remove from this day">{armed === s.id ? "Sure?" : "×"}</button>}
              </span>}
              {open === s.id && me !== "brandon" && (
                <ScriptClient key={s.id} script={s} day={day} who={who} onChange={replace} onClose={() => setOpen(null)} onError={fail} onSay={say} />
              )}
              {open === s.id && me === "brandon" && (
                <ScriptEditor key={s.id + ":" + (bump[s.id] || 0)} script={s} day={day} role={me} who={who} aiReady={aiReady} onChange={replace} onRemove={() => remove(s)} removeArmed={armed === s.id} onDuplicate={() => duplicate(s)} onClose={() => { setOpen(null); setTimeout(() => document.getElementById("scr-" + s.id)?.scrollIntoView({ behavior: "smooth", block: "center" }), 30); }} onError={fail} onSay={say} />
              )}
            </li>
          ))}
        </ol>

        {/* Only T-charts from here on (2026-11-08); the style is picked inside it. */}
        {me === "brandon" && <div className="sday-add">
          <button type="button" className="abtn" onClick={() => addScript("tchart")}>+ Add a T-chart</button>
          {<button type="button" className={"abtn" + (tool === "template" ? " is-on" : "")} aria-expanded={tool === "template"} onClick={() => setTool(tool === "template" ? "" : "template")}>+ Use a shot list</button>}
          {addError && <p className="cform-error" role="alert" style={{ width: "100%", margin: 0 }}>{addError}</p>}
        </div>}
        {tool === "template" && <ShotTemplatePicker busy={busy} onPick={addTemplate} onCancel={() => setTool("")} />}

        {/* The whole day as one tickable list, grouped by what the camera is on. */}
        {me === "brandon" && <ShotList scripts={order} onTick={tickShot} onOpenCard={jumpToShot} />}
      </section>
      </div>
    </div>
  );
}

// Title / date / start / where / status / day notes. Owner edits notes only.
// Quick tips for whoever's on camera — shown to the client on their day
// page and in Film mode, so the talent reads the rules before the first take.
// Who the talent is comes from the scripts' "On camera" lines; otherwise it's
// the owner. Brandon's own copy, keep it blunt.
export const TALENT_TIPS = [
  "Eye contact with the lens from the first word to the last — the lens is the customer.",
  "Don't look up at Brandon mid-take. If you lose your place, pause, breathe, restart the line — we cut it.",
  "Stay engaged the whole take: energy up, face alive, even between lines.",
  "Empty your pockets — phone, keys, wallet. They show.",
  "Clear the background: boxes, cords, trash cans, yesterday's stuff. Clean counter, clean wall.",
  "Be eccentric. Big gestures, big expressions. What feels like too much on the day is exactly right on a phone screen.",
  "Don't be boring. Say it like you'd say it to a friend, not like you're reading.",
  "Smile before you start talking — it reads for the first second, which is the only second that matters.",
  "Hands: hold the thing, point at the thing, do the thing. Don't hide them.",
  "Wear what you'd wear on your best day there. No busy patterns, no logos that aren't yours.",
];
function talentOf(scripts, client) {
  const names = [...new Set((scripts || []).map((s) => (s.body?.on_camera || "").trim()).filter(Boolean))];
  if (names.length) return names.join(" · ");
  return client?.name ? `${client.name.split(" ")[0]} — that's you` : "you";
}
function QuickTips({ scripts, client, compact = false }) {
  const talent = talentOf(scripts, client);
  const [open, setOpen] = useState(!compact);
  return (
    <section className={"sday-tips" + (compact ? " is-compact" : "")}>
      <button type="button" className="sday-tips-head" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="kick-sm">Quick tips for on camera</span>
        <strong>Talent: {talent}</strong>
        <em>{open ? "Hide" : "Show"}</em>
      </button>
      {open && (
        <ol className="sday-tips-list">
          {TALENT_TIPS.map((t, i) => <li key={i}>{t}</li>)}
        </ol>
      )}
    </section>
  );
}

function DayHeader({ day, role, onSaved, onError, total, ready, count, lite = false }) {
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
  const win = dayWindow(day, [{ minutes: total }]);

  return (
    <header className="sday-head">
      {edit ? (
        <form className="sday-edit" onSubmit={save}>
          <label className="wide">Title<input name="title" defaultValue={day.title} required /></label>
          <label>Date<input type="date" name="date" defaultValue={day.date || ""} /></label>
          <label>Start<input type="time" name="start_time" defaultValue={day.start_time || ""} /></label>
          <label>End<input type="time" name="end_time" defaultValue={day.end_time || ""} /></label>
          <label className="wide">Where{role === "brandon" ? <AddressInput name="location" defaultValue={day.location} placeholder="Type the place — their shop, the church…" /> : <input name="location" defaultValue={day.location} placeholder="The shop, the kitchen, out front…" />}</label>
          <label>Status<select name="status" defaultValue={day.status}>{DAY_STATUSES.filter((s) => s.id !== "delivered" || day.status === "delivered").map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></label>
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
          {role === "brandon" && (day.location || day.client?.phone) && (
            <div className="sday-basics">
              <div className="gcard-actions">
                {day.location && <a className="abtn" href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(day.location)}`} target="_blank" rel="noreferrer">Directions ↗</a>}
                {day.client?.phone && <a className="abtn" href={`sms:${day.client.phone.replace(/[^\d+]/g, "")}`}>Text {day.client?.name?.split(" ")[0] || "them"}</a>}
                {day.client?.phone && <a className="abtn" href={`tel:${day.client.phone.replace(/[^\d+]/g, "")}`}>Call</a>}
              </div>
            </div>
          )}
          {!lite && <dl className="sday-stats">
            <div><dt>Scripts</dt><dd>{count}</dd></div>
            <div><dt>Filming</dt><dd>{fmtMins(total)}{win.wraps && <small className="sday-wraps"> · wraps {fmt12(win.wraps)}</small>}</dd></div>
            {win.available !== null && (
              <div className={win.over > 0 ? "is-over" : ""}><dt>Window</dt><dd>{fmtMins(win.available)}{win.over > 0 ? <small className="sday-wraps"> · {fmtMins(win.over)} over</small> : win.over < 0 ? <small className="sday-wraps"> · {fmtMins(-win.over)} spare</small> : null}</dd></div>
            )}
            <div><dt>Ready</dt><dd>{ready} of {count}</dd></div>
          </dl>}
        </>
      )}
      <label className="sday-notes">
        <span>Talking points: you both see and edit this</span>
        <textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={"What we're filming and why\nThe 2–3 things that must come across\nWho's on camera, parking, anything to sort before the day"} />
      </label>
    </header>
  );
}

// The script itself. Autosaves 900ms after the last change, with the rev it
// was loaded at; a 409 means the other person saved first.
function ScriptEditor({ script, day, role, who, aiReady, onChange, onRemove, removeArmed = false, onDuplicate, onClose = null, onError, onSay }) {
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
  const [prompting, setPrompting] = useState(false);
  const [peek, setPeek] = useState(null); // an older version being looked at
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
  // Versions: every one of these keeps the card as it is first, so nothing is
  // lost. They wait for the autosave ("Saved ✓") so the kept copy is complete.
  const cur = versionOf(script.body);
  const hist = historyOf(script.body);
  async function versionOp(payload, msg) {
    setBusy(true);
    try {
      const r = await api({ dayId: day.id, scriptId: script.id, rev: rev.current, ...payload });
      onChange({ ...r.script, body: cleanBody(r.script.body) }, true);
      onSay(msg(r));
    } catch (err) { onError(err.status === 409 ? new Error("This card changed a moment ago. Close it, open it again, and try once more.") : err); } finally { setBusy(false); }
  }
  const keptMsg = (r) => (r.kept ? `${vLabel(r.kept)} is kept. You are now on ${vLabel(r.now)}.` : "Marked OK.");
  async function askClaude() {
    if ((body.steps.length || body.scenes.some((sc) => sc.lines.some((l) => l.say || l.see))) && !confirmTap("Rewrite this script with Claude? It keeps what's good and fills in what's thin. The notes thread is read too.")) return;
    setBusy(true);
    try {
      const r = await api({ action: "script-draft", dayId: day.id, scriptId: script.id, title, idea });
      onChange({ ...r.script, body: cleanBody(r.script.body) }, true); // reload the editor with the draft
      onSay("Drafted — read it through, change anything.");
    } catch (err) { onError(err); } finally { setBusy(false); setAsking(false); }
  }
  const secs = stepSecs(body);
  // Decided once on open, so the fold never snaps shut while you type.
  const [moreOpen] = useState(() => Boolean(body.on_camera || body.where || body.length || body.broll.length || body.caption || body.notes));
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
          {kind === "tchart"
            ? null
            : <button type="button" className="achip scr-convert" onClick={() => { setBody((b) => toTchart(kind, b)); setKind("tchart"); }}>Turn this {KIND_LABEL[kind].toLowerCase()} into a T-chart</button>}
          <label>Status<select value={status} onChange={(e) => setStatus(e.target.value)}>{/* No "Delivered" to pick (2026-11-17, Brandon: not needed right now); one already set to it still shows. */}{STATUSES.filter((s) => s.id !== "delivered" || status === "delivered").map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></label>
          {kind !== "tchart" && <label>Minutes on set (setup and takes)<input type="number" min={0} max={720} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} /></label>}
          <span className={`scr-state is-${state}`}>{state === "saved" ? `Saved ✓ · last by ${who(script.updated_by)} ${when(script.updated_at)}` : state === "saving" ? "Saving…" : state === "stale" ? "Not saved" : "Unsaved…"}</span>
        </div>
      </div>

      <div className="scr-vers" aria-label="Versions of this card">
        <span className="scr-vers-now"><strong>{vLabel(cur)}</strong> is the one you are editing.</span>
        {hist.length > 0 && <span className="scr-vers-old">Older:{" "}
          {hist.map((h) => <button key={h.v} type="button" className={"achip" + (peek === h.v ? " is-on" : "")} aria-expanded={peek === h.v} onClick={() => setPeek(peek === h.v ? null : h.v)}>{vLabel(h.v)}</button>)}
        </span>}
        <button type="button" className="achip" disabled={busy || state !== "saved"} onClick={() => versionOp({ action: "version-new" }, keptMsg)}>Keep {vLabel(cur)}, start {vLabel(cur + 1)}</button>
      </div>
      {peek !== null && (() => { const h = hist.find((x) => x.v === peek); if (!h) return null; return (
        <div className="scr-peek">
          <p className="scr-peek-h"><strong>{vLabel(h.v)}</strong> · kept {when(h.at)}{h.title ? ` · ${h.title}` : ""}</p>
          <ScriptBody body={h.body} />
          <div className="gcard-actions">
            <button type="button" className="abtn" disabled={busy || state !== "saved"} onClick={() => { setPeek(null); versionOp({ action: "version-restore", v: h.v }, (r) => `Back to ${vLabel(h.v)}. It is now ${vLabel(r.now)}, and ${vLabel(r.kept)} is kept.`); }}>Go back to {vLabel(h.v)}</button>
            <button type="button" className="achip" onClick={() => setPeek(null)}>Close {vLabel(h.v)}</button>
          </div>
          <p className="gcard-meta">Going back does not delete anything. {vLabel(cur)} is kept, and {vLabel(h.v)} comes back as {vLabel(cur + 1)}.</p>
        </div>
      ); })()}

      {role === "brandon" && (kind === "tchart" || !isCard(kind)) && (
        <div className="scr-ai">
          {/* Always showing (2026-11-17, Brandon: "I tell it everything I need
              and then it writes up the script"). Claude also gets what is
              already typed on this card, the notes, their brand page and brief. */}
          <div className="scr-ai-box">
            <label>Tell Claude what you want in this one <em>Say it messy: what it's about, who's in it, what has to be said. It also reads what's already on this card, their brand page and their brief.</em>
              <textarea rows={4} value={idea} onChange={(e) => setIdea(e.target.value)} placeholder={kind === "recipe" ? "Her sourdough sandwich loaf, start to finish, with the crumb reveal" : kind === "howto" ? "How to tell real gluten-free from “made in a shared kitchen”" : "The one thing people drive 40 minutes for. Kaci on camera, at the counter, 30 seconds."} />
            </label>
            <div className="gcard-actions">
              <button type="button" className="abtn" disabled={busy || !aiReady} onClick={askClaude}>{busy ? "Writing… (up to a minute)" : body.steps.length || (body.scenes || []).length ? "✦ Rewrite the script" : "✦ Write the script"}</button>
              {!aiReady && <span className="gcard-meta">Claude isn't set up on this computer. It works on the live site.</span>}
            </div>
          </div>
        </div>
      )}

      {kind === "tchart" && <TChartEditor body={body} setBody={setBody} onPrompt={() => setPrompting(true)} extra={<label className="scr-field scr-mins"><span>Minutes on set (setup and takes)</span><input type="number" min={0} max={720} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} /></label>} />}
      {prompting && <Teleprompter title={title || "T-chart"} items={promptItems(kind, cleanBody(body))} onClose={() => setPrompting(false)} />}
      {kind === "questions" && <QuestionsEditor body={body} setBody={setBody} />}
      {kind === "questions" && <div className="scr-grid"><Field label="Notes for the day" v={body.notes} on={(v) => set("notes", v)} rows={2} ph="Where this happens, who answers, anything to set up first" wide /></div>}

      {!isCard(kind) && <>
      <div className="scr-grid">
        <Field label="What it's for" v={body.goal} on={(v) => set("goal", v)} rows={2} ph="One sentence: trust, proof, craving, teaching, or selling one thing." />
        <Field label="The hook — first words / first thing on screen" v={body.hook} on={(v) => set("hook", v)} rows={2} ph="The exact words. For a reel it lands in under 2 seconds." />
        <Field label={NEEDS_LABEL[kind] || "What to have ready"} v={lines(body.needs)} on={(v) => set("needs", v.split("\n"))} rows={3} ph={kind === "recipe" ? "One per line, with amounts:\n2 cups GF flour blend\n1 tsp xanthan gum\nOven at 375°F" : "One per line"} wide />
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
        <Field label="Call to action — the closing line" v={body.cta} on={(v) => set("cta", v)} rows={2} ph="One ask." wide />
      </div>
      {/* The extras: folded away unless something's already in them. */}
      <details className="scr-more" open={moreOpen}>
        <summary>More details: on camera, where, length, B-roll, caption, notes</summary>
        <div className="scr-grid">
          <Field label="On camera" v={body.on_camera} on={(v) => set("on_camera", v)} rows={1} ph="Who's in it, who's filming" />
          <Field label="Where" v={body.where} on={(v) => set("where", v)} rows={1} ph="The spot, the light, time of day" />
          <Field label="Finished length" v={body.length} on={(v) => set("length", v)} rows={1} ph="30–45s · 3 min" />
          <Field label="B-roll to grab" v={lines(body.broll)} on={(v) => set("broll", v.split("\n"))} rows={3} ph="One per line: hands, textures, the sign, the street, customers" />
          <Field label="Caption" v={body.caption} on={(v) => set("caption", v)} rows={3} ph="1–3 lines + hashtags" />
          <Field label="Notes for the day" v={body.notes} on={(v) => set("notes", v)} rows={3} ph="Safety, timing, shoot this first while the light is good, what can be faked for camera" />
        </div>
      </details>
      </>}

      <details className="scr-thread scr-threadfold" id={"notes-" + script.id} open={thread.length > 0}>
        <summary><h3>Notes between you{thread.length ? ` · ${thread.length}` : ""}</h3></summary>
        {thread.length === 0 && <p className="gcard-meta">Questions, changes, “can we do this instead” — it all goes here so the script stays the script.</p>}
        <ul>
          {thread.map((t, i) => (
            <li key={i} className={"scr-msg is-" + t.who}><strong>{who(t.who)}</strong> <em>{when(t.at)}{t.v ? ` · about ${vLabel(t.v)}` : ""}</em><p>{t.text}</p>
              {t.who === "client" && (t.ok
                ? <small className="scr-ok">✓ You said OK{t.ok_v ? ` · the change goes in ${vLabel(t.ok_v)}` : ""}</small>
                : <button type="button" className="achip scr-okbtn" disabled={busy || state !== "saved"} onClick={() => versionOp({ action: "note-ok", index: i }, keptMsg)}>OK, I&rsquo;ll change this</button>)}
            </li>
          ))}
        </ul>
        <form onSubmit={addNote} className="scr-msgform">
          <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder={role === "brandon" ? "A note for them…" : "A note for Brandon…"} maxLength={2000} />
          <button type="submit" className="abtn" disabled={busy || !note.trim()}>Post note</button>
        </form>
      </details>

      <div className="gcard-actions scr-foot">
        <button type="button" className="achip" onClick={onDuplicate}>Duplicate</button>
        {(role === "brandon" || script.created_by === "client") && <button type="button" className={"achip achip-danger" + (removeArmed ? " is-armed" : "")} onClick={onRemove}>{removeArmed ? "Tap again to remove" : "Remove from this day"}</button>}
        {onClose && <button type="button" className="abtn scr-close" onClick={onClose}>Close ▲</button>}
      </div>
    </div>
  );
}

// A card, read only: the hook, every scene (said / seen), B-roll, closing
// line. Used for the client's view and for looking at an older version.
function ScriptBody({ body }) {
  const b = cleanBody(body);
  const meta = [b.on_camera && `On camera: ${b.on_camera}`, b.where && `Where: ${b.where}`, b.length && `Plays ${b.length}`].filter(Boolean);
  const empty = !b.hook && !b.scenes.length && !b.steps.length && !b.questions.length && !b.broll.length && !b.cta;
  return (
    <div className="scrv">
      {empty && <p className="gcard-meta">Nothing is written on this card yet.</p>}
      {meta.length > 0 && <p className="scrv-meta">{meta.join(" · ")}</p>}
      {b.goal && <div className="scrv-block"><span>What it is for</span><p>{b.goal}</p></div>}
      {b.hook && <div className="scrv-block"><span>Hook · goes first</span><p>{b.hook}</p></div>}
      {b.scenes.map((sc, si) => (
        <div key={si} className="scrv-scene">
          <h4>{sc.label || `Scene ${si + 1}`}</h4>
          <ol>{sc.lines.filter((l) => l.say || l.see).map((l, li) => (
            <li key={li}>{l.say && <p className="scrv-say">{l.say}</p>}{l.see && <p className="scrv-see"><span>{SEE_LABEL[l.tag] || "Seen"}</span> {l.see}</p>}</li>
          ))}</ol>
        </div>
      ))}
      {b.steps.length > 0 && (
        <div className="scrv-scene">
          <h4>Scenes</h4>
          <ol>{b.steps.map((st, i) => (
            <li key={i}>{st.say && <p className="scrv-say">{st.say}</p>}{st.do && <p className="scrv-see"><span>Do</span> {st.do}</p>}{st.shot && <p className="scrv-see"><span>Camera</span> {st.shot}</p>}</li>
          ))}</ol>
        </div>
      )}
      {b.questions.length > 0 && (
        <div className="scrv-scene">
          <h4>Questions</h4>
          <ol>{b.questions.map((q, i) => <li key={i}><p className="scrv-say">{q.q}</p>{q.a && <p className="scrv-see"><span>After</span> {q.a}</p>}</li>)}</ol>
        </div>
      )}
      {b.cta && <div className="scrv-block"><span>Closing line</span><p>{b.cta}</p></div>}
      {b.broll.length > 0 && <div className="scrv-block"><span>B-roll</span><ul>{b.broll.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
      {b.needs.length > 0 && <div className="scrv-block"><span>What to have ready</span><ul>{b.needs.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
      {b.notes && <div className="scrv-block"><span>Notes for the day</span><p>{b.notes}</p></div>}
    </div>
  );
}

// The client's card (2026-11-18, Brandon: "allow them to see the cards made
// and only input their two cents on revisions. Then I okay them and make the
// revisions"). They read the card and say what they would change. Each of
// their notes shows where it stands: waiting, or Brandon said OK.
function ScriptClient({ script, day, who, onChange, onClose, onError, onSay }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const thread = Array.isArray(script.thread) ? script.thread : [];
  const cur = versionOf(script.body);
  async function send(e) {
    e.preventDefault();
    if (!note.trim()) return;
    setBusy(true);
    try { const r = await api({ action: "script-note", dayId: day.id, scriptId: script.id, text: note }); onChange({ ...script, thread: r.thread }); setNote(""); onSay("Sent to Brandon"); } catch (err) { onError(err); } finally { setBusy(false); }
  }
  return (
    <div className="scr scr-readonly">
      <p className="scrv-top"><strong className="scrv-v">{vLabel(cur)}</strong> {STATUS_LABEL[script.status]} · Only Brandon changes the card. Tell him below what you would change.</p>
      <ScriptBody body={script.body} />
      <section className="scr-thread scr-revise" id={"notes-" + script.id}>
        <h3>What would you change?</h3>
        {thread.length === 0 && <p className="gcard-meta">Nothing yet. If the card is right, you do not need to write anything.</p>}
        <ul>
          {thread.map((t, i) => (
            <li key={i} className={"scr-msg is-" + t.who}><strong>{who(t.who)}</strong> <em>{when(t.at)}{t.v ? ` · about ${vLabel(t.v)}` : ""}</em><p>{t.text}</p>
              {t.who === "client" && <small className={"scr-ok" + (t.ok ? "" : " is-waiting")}>{t.ok ? `✓ Brandon said OK${t.ok_v ? `. The change goes in ${vLabel(t.ok_v)}` : ""}` : "Waiting for Brandon"}</small>}
            </li>
          ))}
        </ul>
        <form onSubmit={send} className="scr-msgform">
          <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Say what you would change on this card. A line, a word, the order, anything." maxLength={2000} />
          <button type="submit" className="abtn" disabled={busy || !note.trim()}>{busy ? "Sending…" : "Send to Brandon"}</button>
        </form>
      </section>
      <div className="gcard-actions scr-foot"><button type="button" className="abtn scr-close" onClick={onClose}>Close ▲</button></div>
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
  // One number up front (reels); the other kinds sit behind "Other kinds".
  const [counts, setCounts] = useState({ reel: 3, howto: 0, recipe: 0, manual: 0, promo: 0, photos: 0 });
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const num = (k) => (e) => setCounts({ ...counts, [k]: Math.max(0, Math.min(8, Number(e.target.value) || 0)) });
  return (
    <div className="sday-box sday-tell">
      <label className="sday-boxlabel">Tell Claude what you want to film <em>Say it messy. It makes one card for each reel, and you fix them after. It reads their brand page and brief too{existing ? `, and won't repeat the ${existing} already here` : ""}.</em>
        <textarea rows={4} value={theme} onChange={(e) => setTheme(e.target.value)} placeholder="Three reels for holiday pre-orders: the best sellers, how to order, and one on why we're different. Kaci's happy on camera." />
      </label>
      <div className="sday-counts">
        <label><span>How many reels?</span><input type="number" min={0} max={8} value={counts.reel} onChange={num("reel")} /></label>
      </div>
      <details className="tc-fold sday-otherkinds">
        <summary>Other kinds<em> · how-to, recipe, promo video, photo set</em></summary>
        <div className="sday-counts">
          {KINDS.filter((k) => k.id !== "other" && k.id !== "reel" && !isCard(k.id)).map((k) => (
            <label key={k.id}><span>{k.label}</span><input type="number" min={0} max={8} value={counts[k.id] || 0} onChange={num(k.id)} /></label>
          ))}
        </div>
      </details>
      <div className="gcard-actions">
        <button type="button" className="abtn" disabled={busy || !aiReady || !total} onClick={() => onGo(theme, counts)}>{busy ? "Writing the cards… (a minute or two)" : `✦ Write ${total} card${total === 1 ? "" : "s"}`}</button>
        <button type="button" className="achip" onClick={onCancel} disabled={busy}>Close</button>
        {!aiReady && <span className="gcard-meta">Claude isn't set up on this computer. It works on the live site.</span>}
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
function FilmMode({ order, index, who, onJump, onClose, onTick, onStatus, reminders = [], tips = null, readOnly = false }) {
  const s = order[index];
  const b = cleanBody(s.body);
  const prog = progressOf(s.kind, b);
  const done = prog.done;
  const next = index + 1 < order.length ? index + 1 : null;
  const [prompting, setPrompting] = useState(false);
  const items = promptItems(s.kind, b);
  useEffect(() => {
    const onKey = (e) => { if (prompting) return; if (e.key === "Escape") onClose(); if (e.key === "ArrowRight" && next !== null) onJump(next); if (e.key === "ArrowLeft" && index > 0) onJump(index - 1); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [index, next, onClose, onJump, prompting]);
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
      {prompting && <Teleprompter title={s.title || KIND_LABEL[s.kind]} items={items} onClose={() => setPrompting(false)} />}
      <div className="film-body">
        <p className="film-kick">{KIND_LABEL[s.kind]}{b.style ? ` · ${STYLE_LABEL[b.style]}` : ""} · {fmtMins(s.minutes || 0)}{b.length ? ` · ${b.length} finished` : ""} · <span className={`itag is-${s.status}`}>{STATUS_LABEL[s.status]}</span></p>
        <h2 className="film-title">{s.title || `Untitled ${KIND_LABEL[s.kind]}`}</h2>
        {items.length > 0 && <button type="button" className="abtn film-prompt" onClick={() => setPrompting(true)}>▶ Teleprompter</button>}
        {(b.on_camera || b.where) && <p className="film-meta">{[b.on_camera, b.where].filter(Boolean).join(" · ")}</p>}
        {b.hook && <div className="film-hook"><span>Hook</span><p>{b.hook}</p></div>}
        {tips && <details className="film-needs film-remind"><summary>🎯 Quick tips · talent: {talentOf(tips.scripts, tips.client)}</summary><ul>{TALENT_TIPS.map((t, i) => <li key={i}>{t}</li>)}</ul></details>}
        {reminders.length > 0 && <details className="film-needs film-remind"><summary>📷 Camera reminders ({reminders.length})</summary><ul>{reminders.map((r, i) => <li key={i}>{r}</li>)}</ul></details>}
        {b.needs.length > 0 && <details className="film-needs"><summary>{NEEDS_LABEL[b.style] || NEEDS_LABEL[s.kind] || "Have ready"} ({b.needs.length})</summary><ul>{b.needs.map((n, i) => <li key={i}>{n}</li>)}</ul></details>}
        <div className="film-progress"><span style={{ width: `${prog.total ? Math.round((done / prog.total) * 100) : 0}%` }} /></div>
        {s.kind === "tchart" && b.scenes.map((sc, si) => (
          <div key={si} className="film-scene">
            <h3 className="film-scenelabel">{sc.label || `Scene ${si + 1}`}</h3>
            <ol className="film-steps">
              {sc.lines.map((l, li) => (
                <li key={li} className={"film-step" + (l.done ? " is-done" : "")}>
                  <button type="button" className="film-tick" aria-pressed={Boolean(l.done)} disabled={readOnly} onClick={() => onTick(s, { scene: si, line: li }, !l.done)}>{l.done ? "✓" : li + 1}</button>
                  <div className="film-stepbody">
                    {l.say && <p className="film-say">{l.say}</p>}
                    {l.see && <p className="film-shot"><span>{SEE_LABEL[l.tag] || "Seen"}</span>{l.see}{l.secs ? ` · ${l.secs}s` : ""}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        ))}
        {s.kind === "tchart" && b.scenes.length === 0 && <p className="gcard-meta">No scenes written yet.</p>}
        {(s.kind === "questions" || (s.kind === "tchart" && b.questions.length > 0)) && (
          <ol className="film-steps">
            {b.questions.map((q, qi) => (
              <li key={qi} className={"film-step" + (q.done ? " is-done" : "")}>
                <button type="button" className="film-tick" aria-pressed={Boolean(q.done)} disabled={readOnly} onClick={() => onTick(s, { question: qi }, !q.done)}>{q.done ? "✓" : qi + 1}</button>
                <div className="film-stepbody">
                  <p className="film-say">{q.q}</p>
                  {q.a && <p className="film-do"><span>After</span>{q.a}</p>}
                </div>
              </li>
            ))}
            {b.questions.length === 0 && <li className="gcard-meta">No questions written yet.</li>}
          </ol>
        )}
        {!isCard(s.kind) && <ol className="film-steps">
          {b.steps.map((st, i) => (
            <li key={i} className={"film-step" + (st.done ? " is-done" : "")}>
              <button type="button" className="film-tick" aria-pressed={Boolean(st.done)} disabled={readOnly} onClick={() => onTick(s, i, !st.done)}>{st.done ? "✓" : i + 1}</button>
              <div className="film-stepbody">
                {st.say && <p className="film-say">{st.say}</p>}
                {st.do && <p className="film-do"><span>Do</span>{st.do}</p>}
                {st.shot && <p className="film-shot"><span>Camera</span>{st.shot}{st.secs ? ` · ${st.secs}s` : ""}</p>}
              </div>
            </li>
          ))}
          {b.steps.length === 0 && <li className="gcard-meta">No steps written yet.</li>}
        </ol>}
        {b.broll.length > 0 && <div className="film-broll"><span>B-roll</span><ul>{b.broll.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
        {b.cta && <div className="film-hook film-cta"><span>Close with</span><p>{b.cta}</p></div>}
        {b.notes && <p className="film-notes">{b.notes}</p>}
      </div>
      <div className="film-foot">
        {readOnly ? (next !== null ? <button type="button" className="abtn" onClick={() => onJump(next)}>Next →</button> : <button type="button" className="abtn" onClick={onClose}>Done</button>)
        : s.status === "filmed" || s.status === "delivered" ? (
          <button type="button" className="achip" onClick={() => onStatus(s, "ready")}>Un-mark filmed</button>
        ) : (
          <button type="button" className="abtn" onClick={async () => { await onStatus(s, "filmed"); if (next !== null) onJump(next); }}>{next !== null ? "Filmed → next" : "Filmed ✓"}</button>
        )}
        <span className="gcard-meta">{done}/{prog.total} {prog.noun}s · last by {who(s.updated_by)}</span>
      </div>
    </div>
  );
}
