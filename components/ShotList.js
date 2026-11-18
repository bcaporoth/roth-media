"use client";
// The day's shot list: every line from every card, grouped by what the camera
// is on (talent, place, thing, text on screen, B-roll), each one tickable.
// 2026-11-18, Brandon: "as the footer we need the content summed up and
// organized as talent, b-roll etc… so I know what I'm shooting and I can check
// things off and make sure I get all my shots."
// Inside each group the shots fold by skit (the card they came from), so a long
// group is a short list of skits until one is tapped open ("compress via the
// skit… like a dropdown").
// A tick here is the same tick as the "Filmed" box on the card and in Film mode.
import { useState } from "react";
import { shotList } from "../lib/scripts";

export default function ShotList({ scripts, onTick, onOpenCard }) {
  const { groups, total, done } = shotList(scripts);
  const [shut, setShut] = useState({});     // group id → closed
  const [openSkit, setOpenSkit] = useState({}); // "group:scriptId" → open
  const [hideDone, setHideDone] = useState(false);
  if (!total) return null;
  const pct = Math.round((done / total) * 100);
  return (
    <section className="shotlist" aria-label="Shot list for this day">
      <div className="shotlist-head">
        <div>
          <h2>Shot list</h2>
          <p className="gcard-meta">Every shot on this day, pulled from your cards. Grouped by what the camera is on, then by skit. Tap a skit to open it. Tap a shot when you have it.</p>
        </div>
        <p className="shotlist-count"><strong>{done}</strong> of {total} shot</p>
      </div>
      <div className="shotlist-bar" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done}><span style={{ width: `${pct}%` }} /></div>
      {done > 0 && done < total && (
        <button type="button" className="achip shotlist-toggle" onClick={() => setHideDone((v) => !v)}>{hideDone ? `Show the ${done} I have` : "Hide the ones I have"}</button>
      )}
      {done === total && <p className="shotlist-allgot">You have every shot.</p>}
      {groups.map((g) => {
        const got = g.items.filter((x) => x.done).length;
        const closed = Boolean(shut[g.id]);
        // Skits in running order, each with its own shots.
        const skits = [];
        for (const x of g.items) {
          let sk = skits.find((s) => s.id === x.scriptId);
          if (!sk) { sk = { id: x.scriptId, title: x.card, items: [] }; skits.push(sk); }
          sk.items.push(x);
        }
        return (
          <div key={g.id} className={"shotlist-group shotlist-" + g.id}>
            <button type="button" className="shotlist-grouphead" aria-expanded={!closed} onClick={() => setShut((s) => ({ ...s, [g.id]: !closed }))}>
              <span className="shotlist-tag">{g.id === "talent" ? "Talent · A-roll" : g.label}</span>
              <span className="shotlist-groupcount">{got} of {g.items.length}</span>
              <span className="shotlist-arrow" aria-hidden="true">{closed ? "▸" : "▾"}</span>
            </button>
            {!closed && skits.map((sk) => {
              const key = g.id + ":" + sk.id;
              // One skit in the group has nothing to compress, so it starts open.
              const isOpen = openSkit[key] ?? skits.length === 1;
              const skGot = sk.items.filter((x) => x.done).length;
              const items = hideDone ? sk.items.filter((x) => !x.done) : sk.items;
              return (
                <div key={sk.id} className={"shotlist-skit" + (skGot === sk.items.length ? " is-allgot" : "")}>
                  <button type="button" className="shotlist-skithead" aria-expanded={isOpen} onClick={() => setOpenSkit((o) => ({ ...o, [key]: !isOpen }))}>
                    <span className="shotlist-arrow" aria-hidden="true">{isOpen ? "▾" : "▸"}</span>
                    <span className="shotlist-skitname">{sk.title}</span>
                    <span className="shotlist-groupcount">{skGot === sk.items.length ? "✓ " : ""}{skGot} of {sk.items.length}</span>
                  </button>
                  {isOpen && (
                    <ul className="shotlist-items">
                      {items.length === 0 && <li className="shotlist-none">All {sk.items.length} done.</li>}
                      {items.map((x) => (
                        <li key={x.key} className={"shotlist-item" + (x.done ? " is-done" : "")}>
                          <label>
                            <input type="checkbox" checked={x.done} onChange={(e) => onTick(x, e.target.checked)} />
                            <span className="shotlist-text">
                              <span className="shotlist-see">{x.see || x.say}</span>
                              {x.see && x.say && <span className="shotlist-say">Said: {x.say}</span>}
                            </span>
                          </label>
                          <button type="button" className="shotlist-card" onClick={() => onOpenCard(x)}>{x.at.broll !== undefined ? "↪ Open this skit's card" : `↪ Go to this line${x.scene ? ` · ${x.scene}` : ""}`}</button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </section>
  );
}
