"use client";

// The two "card" kinds that live on a shoot day next to full scripts:
//
//   T-chart   — the one script format (2026-11-08). On top, the plan: what
//               kind of piece (its style), what it's for, the hook, who's on
//               camera, where, how long, what to have ready. Then scenes, each a
//               table of lines: what's SAID on the left, what's SEEN on the
//               right (tagged talent / place / thing / text on screen) and how
//               many seconds it gets. Optional interview questions. Then the
//               close: call to action, B-roll, caption, notes.
//   Questions — Brandon's own prompts for whoever is on camera, with room for
//               the answer or notes under each one.
//
// Both edit a slice of the script body (body.scenes / body.questions) through
// the same autosave as the rest of the script — ShootDay owns the body.

import { useEffect, useRef, useState } from "react";
import { SEE_TAGS, SEE_LABEL, STYLES, NEEDS_LABEL, blankLine, blankScene, blankQuestion, sceneLines, tchartSecs } from "../lib/scripts";

function Grow({ value, onChange, rows = 2, placeholder = "", className = "", ariaLabel = "" }) {
  const ref = useRef(null);
  useEffect(() => { const el = ref.current; if (el) { el.style.height = "auto"; el.style.height = el.scrollHeight + 2 + "px"; } }, [value]);
  return <textarea ref={ref} className={className} rows={rows} value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={ariaLabel} />;
}

// ---------- T-chart ----------
// Placeholders that fit the piece.
const HOOK_PH = { recipe: "First thing on screen: the finished dish, or the one line that makes them stay", photos: "The hero shot — the one picture this set is built around", questions: "The opening question, or the line you start the interview with" };
const NEEDS_PH = { recipe: "One per line, with amounts:\n2 cups gluten-free flour blend\n1 tsp xanthan gum\nOven at 375°F", photos: "One per line: props, products, people, outfits", questions: "One per line: a quiet room, a lav mic, water, the notes they want in front of them" };
function PlanField({ label, value, onChange, rows = 1, placeholder = "", wide = false }) {
  return (
    <label className={"scr-field" + (wide ? " wide" : "")}>
      <span>{label}</span>
      <Grow value={value} onChange={onChange} rows={rows} placeholder={placeholder} ariaLabel={label} />
    </label>
  );
}

export function TChartEditor({ body, setBody, onPrompt }) {
  const set = (k, v) => setBody((b) => ({ ...b, [k]: v }));
  const style = body.style || "";
  const secsTotal = tchartSecs(body);
  const [moreOpen] = useState(() => Boolean(body.broll?.length || body.caption));
  const planFilled = [body.goal && "for", body.on_camera && "who", body.where && "where", body.length && "length", body.needs?.length && "ready"].filter(Boolean);
  const [planOpen] = useState(false);
  const [askOpen, setAskOpen] = useState(() => (body.questions || []).length > 0 || style === "questions");
  const [filter, setFilter] = useState(""); // "" | talent | place | thing
  const scenes = body.scenes || [];
  const all = sceneLines(body);
  const counts = Object.fromEntries(SEE_TAGS.map((t) => [t.id, all.filter((l) => l.tag === t.id).length]));

  const setScenes = (fn) => setBody((b) => ({ ...b, scenes: fn(b.scenes || []) }));
  const setScene = (i, patch) => setScenes((sc) => sc.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const addScene = (i) => setScenes((sc) => { const out = [...sc]; out.splice(i + 1, 0, blankScene()); return out; });
  const delScene = (i) => setScenes((sc) => sc.filter((_, j) => j !== i));
  const moveScene = (i, d) => setScenes((sc) => { const j = i + d; if (j < 0 || j >= sc.length) return sc; const out = [...sc]; [out[i], out[j]] = [out[j], out[i]]; return out; });
  const setLine = (i, k, patch) => setScene(i, { lines: scenes[i].lines.map((l, m) => (m === k ? { ...l, ...patch } : l)) });
  const addLine = (i, k) => setScene(i, { lines: (() => { const out = [...scenes[i].lines]; out.splice(k + 1, 0, blankLine()); return out; })() });
  const delLine = (i, k) => setScene(i, { lines: scenes[i].lines.filter((_, m) => m !== k) });
  const moveLine = (i, k, d) => setScene(i, { lines: (() => { const m = k + d; const out = [...scenes[i].lines]; if (m < 0 || m >= out.length) return out; [out[k], out[m]] = [out[m], out[k]]; return out; })() });

  return (
    <div className="tc">
      <div className="tc-plan">
        <div className="tc-style" role="group" aria-label="What kind of piece">
          <span className="kick-sm">What kind of piece?</span>
          {STYLES.map((t) => (
            <button key={t.id} type="button" className={"achip" + (style === t.id ? " is-on" : "")} aria-pressed={style === t.id} onClick={() => set("style", style === t.id ? "" : t.id)}>{t.label}</button>
          ))}
        </div>
        <PlanField label="The hook" value={body.hook} onChange={(v) => set("hook", v)} placeholder={HOOK_PH[style] || "The first words or first thing on screen"} wide />
        {/* The rest of the plan, folded (2026-11-08, Brandon: "too much to look at"). */}
        <details className="tc-fold" open={planOpen}>
          <summary>Details{planFilled.length ? <em> · {planFilled.join(", ")}</em> : <em> · what it&apos;s for, who, where, length, what to have ready</em>}</summary>
          <div className="scr-grid">
            <PlanField label="What it's for" value={body.goal} onChange={(v) => set("goal", v)} placeholder="Trust, proof, craving, teaching, or selling one thing" />
            <PlanField label="Who's on camera" value={body.on_camera} onChange={(v) => set("on_camera", v)} placeholder="Who's in it" />
            <PlanField label="Where" value={body.where} onChange={(v) => set("where", v)} placeholder="The spot, the light" />
            <PlanField label="Finished length" value={body.length} onChange={(v) => set("length", v)} placeholder={style === "photos" ? "How many photos" : "30–45s"} />
            <PlanField label={NEEDS_LABEL[style] || "What to have ready"} value={(body.needs || []).join("\n")} onChange={(v) => set("needs", v.split("\n"))} placeholder={NEEDS_PH[style] || "One per line"} wide />
          </div>
        </details>
      </div>

      <div className="sday-sechead">
        <h3>Scenes — said | seen</h3>
        {secsTotal > 0 && <span className="gcard-meta">{secsTotal}s on screen</span>}
        {onPrompt && all.some((l) => l.say.trim()) && <button type="button" className="achip" onClick={onPrompt}>▶ Teleprompter</button>}
        {all.length >= 4 && <span className="tc-filters" role="group" aria-label="Show lines where the viewer sees">
          <button type="button" className={"achip" + (filter === "" ? " is-on" : "")} onClick={() => setFilter("")}>All · {all.length}</button>
          {SEE_TAGS.map((t) => (
            <button key={t.id} type="button" className={"achip tc-tag-" + t.id + (filter === t.id ? " is-on" : "")} onClick={() => setFilter(filter === t.id ? "" : t.id)}>{t.label} · {counts[t.id]}</button>
          ))}
        </span>}
      </div>
      {scenes.length === 0 && (
        <p className="gcard-meta">Label a scene, then one line per beat: the <strong>words</strong> on the left, what the <strong>viewer sees</strong> on the right — tagged talent, place, thing or text on screen. <button type="button" className="rm-linkbtn" onClick={() => addScene(-1)}>Add the first scene</button></p>
      )}
      {scenes.map((sc, i) => {
        const shown = sc.lines.map((l, k) => ({ l, k })).filter(({ l }) => !filter || l.tag === filter);
        if (filter && shown.length === 0) return null;
        return (
          <section key={i} className="tc-scene">
            <div className="scr-stephead">
              <input className="tc-label" value={sc.label} onChange={(e) => setScene(i, { label: e.target.value })} placeholder={`Scene ${i + 1}`} aria-label={`Scene ${i + 1} label`} maxLength={120} />
              <span className="scr-stepactions">
                <button type="button" className="achip" onClick={() => moveScene(i, -1)} disabled={i === 0} aria-label="Move scene up">↑</button>
                <button type="button" className="achip" onClick={() => moveScene(i, 1)} disabled={i === scenes.length - 1} aria-label="Move scene down">↓</button>
                <button type="button" className="achip" onClick={() => addScene(i)}>+ Scene after</button>
                <button type="button" className="achip achip-danger" onClick={() => { if (!sc.lines.some((l) => l.say || l.see) || window.confirm(`Remove ${sc.label || `Scene ${i + 1}`} and its ${sc.lines.length} line${sc.lines.length === 1 ? "" : "s"}?`)) delScene(i); }} aria-label="Remove scene">✕</button>
              </span>
            </div>
            <div className="tc-table" role="table">
              <div className="tc-head" role="row" aria-hidden="true"><span /><span>🗣 What&apos;s said</span><span>👁 What&apos;s seen</span><span /></div>
              {shown.map(({ l, k }) => (
                <div key={k} className={"tc-row" + (l.done ? " is-done" : "")} role="row">
                  <label className="tc-done" title="Filmed"><input type="checkbox" checked={Boolean(l.done)} onChange={(e) => setLine(i, k, { done: e.target.checked })} /><span>{k + 1}</span></label>
                  <Grow className="tc-say" value={l.say} onChange={(v) => setLine(i, k, { say: v })} rows={2} placeholder="The exact words — or (no talking)" ariaLabel={`Line ${k + 1}: what's said`} />
                  <div className="tc-see">
                    <span className="tc-seehead">
                      <select value={l.tag} onChange={(e) => setLine(i, k, { tag: e.target.value })} aria-label={`Line ${k + 1}: what's on camera`}>
                        {SEE_TAGS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                      </select>
                      <label className="tc-secs">secs<input type="number" min={0} max={3600} value={l.secs || ""} onChange={(e) => setLine(i, k, { secs: Number(e.target.value) })} aria-label={`Line ${k + 1}: seconds`} /></label>
                    </span>
                    <Grow value={l.see} onChange={(v) => setLine(i, k, { see: v })} rows={2} placeholder={l.tag === "talent" ? "Who, doing what, framed how (wide / medium / close)" : l.tag === "place" ? "The spot, the angle, the light" : l.tag === "text" ? "The words on screen" : "The product / prop, how close — amounts for a recipe"} ariaLabel={`Line ${k + 1}: what's seen`} />
                  </div>
                  <span className="tc-rowactions">
                    <button type="button" className="achip" onClick={() => moveLine(i, k, -1)} disabled={k === 0} aria-label="Move line up">↑</button>
                    <button type="button" className="achip" onClick={() => moveLine(i, k, 1)} disabled={k === sc.lines.length - 1} aria-label="Move line down">↓</button>
                    <button type="button" className="achip" onClick={() => addLine(i, k)} aria-label="Add a line after">+</button>
                    <button type="button" className="achip achip-danger" onClick={() => delLine(i, k)} aria-label="Remove line">✕</button>
                  </span>
                </div>
              ))}
            </div>
            {!filter && <button type="button" className="achip" onClick={() => addLine(i, sc.lines.length - 1)}>+ Add a line</button>}
          </section>
        );
      })}
      {scenes.length > 0 && !filter && <button type="button" className="achip" onClick={() => addScene(scenes.length - 1)}>+ Add a scene</button>}
      {filter && <p className="gcard-meta">Showing only lines where the viewer sees <strong>{SEE_LABEL[filter].toLowerCase()}</strong>. <button type="button" className="rm-linkbtn" onClick={() => setFilter("")}>Show all</button></p>}

      {askOpen ? (
        <QuestionsEditor body={body} setBody={setBody} />
      ) : (
        <button type="button" className="achip tc-askbtn" onClick={() => setAskOpen(true)}>+ Interview questions</button>
      )}

      <div className="scr-grid tc-close">
        <PlanField label="Call to action" value={body.cta} onChange={(v) => set("cta", v)} placeholder="One ask: stop in, order, book, follow" />
        <PlanField label="Notes" value={body.notes} onChange={(v) => set("notes", v)} placeholder="Timing, safety, shoot this first" />
      </div>
      <details className="tc-fold" open={moreOpen}>
        <summary>B-roll &amp; caption{body.broll?.length || body.caption ? <em> · {[body.broll?.length && `${body.broll.length} B-roll`, body.caption && "caption"].filter(Boolean).join(", ")}</em> : null}</summary>
        <div className="scr-grid">
          <PlanField label="B-roll to grab" value={(body.broll || []).join("\n")} onChange={(v) => set("broll", v.split("\n"))} placeholder="One per line" />
          <PlanField label="Caption" value={body.caption} onChange={(v) => set("caption", v)} placeholder="1–3 lines + hashtags" />
        </div>
      </details>
    </div>
  );
}

// ---------- Questions ----------
export function QuestionsEditor({ body, setBody }) {
  const qs = body.questions || [];
  const [bulk, setBulk] = useState(false);
  const [paste, setPaste] = useState("");
  const setQs = (fn) => setBody((b) => ({ ...b, questions: fn(b.questions || []) }));
  const setQ = (i, patch) => setQs((q) => q.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const addQ = (i) => setQs((q) => { const out = [...q]; out.splice(i + 1, 0, blankQuestion()); return out; });
  const delQ = (i) => setQs((q) => q.filter((_, j) => j !== i));
  const moveQ = (i, d) => setQs((q) => { const j = i + d; if (j < 0 || j >= q.length) return q; const out = [...q]; [out[i], out[j]] = [out[j], out[i]]; return out; });
  function addMany(e) {
    e.preventDefault();
    const fresh = paste.split("\n").map((x) => x.replace(/^\s*(\d+[.)]|[-•*])\s*/, "").trim()).filter(Boolean).map((q) => ({ ...blankQuestion(), q }));
    if (fresh.length) setQs((q) => [...q, ...fresh]);
    setPaste(""); setBulk(false);
  }
  return (
    <div className="qc">
      <div className="sday-sechead">
        <h3>Questions — in the order you&apos;ll ask them</h3>
        <span className="gcard-meta">{qs.length} question{qs.length === 1 ? "" : "s"}</span>
      </div>
      {qs.length === 0 && !bulk && (
        <p className="gcard-meta">Your prompts for whoever is on camera; room under each for the answer you&apos;re after or what they said. <button type="button" className="rm-linkbtn" onClick={() => addQ(-1)}>Add the first question</button> · <button type="button" className="rm-linkbtn" onClick={() => setBulk(true)}>Paste a list</button></p>
      )}
      <ol className="qc-list">
        {qs.map((x, i) => (
          <li key={i} className={"qc-item" + (x.done ? " is-done" : "")}>
            <div className="qc-row">
              <label className="tc-done" title="Asked"><input type="checkbox" checked={Boolean(x.done)} onChange={(e) => setQ(i, { done: e.target.checked })} /><span>{i + 1}</span></label>
              <Grow className="qc-q" value={x.q} onChange={(v) => setQ(i, { q: v })} rows={1} placeholder="The question, as you'd ask it" ariaLabel={`Question ${i + 1}`} />
              <span className="tc-rowactions">
                <button type="button" className="achip" onClick={() => moveQ(i, -1)} disabled={i === 0} aria-label="Move up">↑</button>
                <button type="button" className="achip" onClick={() => moveQ(i, 1)} disabled={i === qs.length - 1} aria-label="Move down">↓</button>
                <button type="button" className="achip" onClick={() => addQ(i)} aria-label="Add a question after">+</button>
                <button type="button" className="achip achip-danger" onClick={() => delQ(i)} aria-label="Remove question">✕</button>
              </span>
            </div>
            <Grow className="qc-a" value={x.a} onChange={(v) => setQ(i, { a: v })} rows={1} placeholder="The answer you're after, or what they said" ariaLabel={`Answer ${i + 1}`} />
          </li>
        ))}
      </ol>
      {bulk ? (
        <form className="qc-bulk" onSubmit={addMany}>
          <textarea rows={5} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder={"One question per line:\nWhat made you start baking gluten-free?\nWhat's the one thing people drive out here for?"} autoFocus />
          <div className="gcard-actions">
            <button type="submit" className="abtn" disabled={!paste.trim()}>Add them</button>
            <button type="button" className="achip" onClick={() => { setBulk(false); setPaste(""); }}>Cancel</button>
          </div>
        </form>
      ) : qs.length > 0 && (
        <div className="gcard-actions">
          <button type="button" className="achip" onClick={() => addQ(qs.length - 1)}>+ Add a question</button>
          <button type="button" className="achip" onClick={() => setBulk(true)}>Paste a list</button>
        </div>
      )}
    </div>
  );
}
