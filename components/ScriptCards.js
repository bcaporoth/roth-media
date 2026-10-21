"use client";

// The two "card" kinds that live on a shoot day next to full scripts:
//
//   T-chart   — scenes, each a table of lines: what's SAID on the left, what's
//               SEEN on the right, every line tagged talent / place / thing so
//               a day can be filtered by what has to be in front of the lens.
//   Questions — Brandon's own prompts for whoever is on camera, with room for
//               the answer or notes under each one.
//
// Both edit a slice of the script body (body.scenes / body.questions) through
// the same autosave as the rest of the script — ShootDay owns the body.

import { useEffect, useRef, useState } from "react";
import { SEE_TAGS, SEE_LABEL, blankLine, blankScene, blankQuestion, sceneLines } from "../lib/scripts";

function Grow({ value, onChange, rows = 2, placeholder = "", className = "", ariaLabel = "" }) {
  const ref = useRef(null);
  useEffect(() => { const el = ref.current; if (el) { el.style.height = "auto"; el.style.height = el.scrollHeight + 2 + "px"; } }, [value]);
  return <textarea ref={ref} className={className} rows={rows} value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={ariaLabel} />;
}

// ---------- T-chart ----------
export function TChartEditor({ body, setBody }) {
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
      <div className="sday-sechead">
        <h3>Scenes — said | seen</h3>
        <span className="tc-filters" role="group" aria-label="Show lines where the viewer sees">
          <button type="button" className={"achip" + (filter === "" ? " is-on" : "")} onClick={() => setFilter("")}>All · {all.length}</button>
          {SEE_TAGS.map((t) => (
            <button key={t.id} type="button" className={"achip tc-tag-" + t.id + (filter === t.id ? " is-on" : "")} onClick={() => setFilter(filter === t.id ? "" : t.id)}>{t.label} · {counts[t.id]}</button>
          ))}
        </span>
      </div>
      {scenes.length === 0 && (
        <p className="gcard-meta">Label a scene, then one line per beat: the <strong>words</strong> on the left, what the <strong>viewer sees</strong> on the right — tagged talent, place or thing. <button type="button" className="rm-linkbtn" onClick={() => addScene(-1)}>Add the first scene</button></p>
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
                    <select value={l.tag} onChange={(e) => setLine(i, k, { tag: e.target.value })} aria-label={`Line ${k + 1}: what's on camera`}>
                      {SEE_TAGS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                    </select>
                    <Grow value={l.see} onChange={(v) => setLine(i, k, { see: v })} rows={2} placeholder={l.tag === "talent" ? "Who, doing what, framed how" : l.tag === "place" ? "The spot, the angle, the light" : "The product / prop, how close"} ariaLabel={`Line ${k + 1}: what's seen`} />
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
