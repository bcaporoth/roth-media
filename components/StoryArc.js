"use client";

// The story line: the hero's-journey curve across the film, a point per
// beat at its % mark. Tap a point (or a beat below) to write into it; the
// example text shows what belongs there. Filled beats are solid dots,
// empty ones hollow — so the macro view shows the blanks at a glance.

import { useMemo, useState } from "react";
import { ARC_BEATS } from "../lib/story-arc";

const W = 1000, H = 300, PAD = 36, TOP = 54, BOT = 250;
const px = (pct) => PAD + (pct / 100) * (W - PAD * 2);
const py = (y) => TOP + y * (BOT - TOP);

// Smooth curve through the beats (Catmull-Rom → cubic Bézier).
function curvePath(pts) {
  if (pts.length < 2) return "";
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${c1[0]} ${c1[1]}, ${c2[0]} ${c2[1]}, ${p2[0]} ${p2[1]}`;
  }
  return d;
}

export default function StoryArc({ arc = {}, onSave }) {
  const [open, setOpen] = useState(null);
  const [draft, setDraft] = useState("");
  const pts = useMemo(() => ARC_BEATS.map((b) => [px(b.pct), py(b.y)]), []);
  const path = useMemo(() => curvePath(pts), [pts]);
  const filled = ARC_BEATS.filter((b) => (arc[b.key] || "").trim()).length;
  function pick(b) { if (open === b.key) { setOpen(null); return; } setOpen(b.key); setDraft(arc[b.key] || ""); }
  function save(b) { if ((draft || "") !== (arc[b.key] || "")) onSave({ ...arc, [b.key]: draft }); }
  const cur = ARC_BEATS.find((b) => b.key === open);

  return (
    <div className="arc">
      <svg className="arc-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Story arc — the hero's journey across the film">
        {[25, 50, 75].map((p) => <g key={p}><line x1={px(p)} x2={px(p)} y1={TOP - 30} y2={BOT + 10} className="arc-grid" /><text x={px(p)} y={TOP - 36} className="arc-pct" textAnchor="middle">{p}%</text></g>)}
        <path d={`${path} L ${px(100)} ${BOT + 30} L ${px(0)} ${BOT + 30} Z`} className="arc-fill" />
        <path d={path} className="arc-line" />
        {ARC_BEATS.map((b, i) => {
          const [x, y] = pts[i];
          const has = Boolean((arc[b.key] || "").trim());
          const below = b.side === "below";
          const anchor = b.pct === 0 ? "start" : b.pct === 100 ? "end" : "middle";
          return (
            <g key={b.key} className={"arc-pt" + (has ? " is-filled" : "") + (open === b.key ? " is-open" : "")} onClick={() => pick(b)} role="button" tabIndex={0} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && pick(b)} aria-label={`${b.label}${has ? " — written" : " — empty"}`}>
              <circle cx={x} cy={y} r={18} className="arc-hit" />
              <circle cx={x} cy={y} r={has ? 9 : 8} className="arc-dot" />
              <text x={x} y={below ? y + 32 : y - 20} textAnchor={anchor} className="arc-label">{b.short || b.label}</text>
            </g>
          );
        })}
      </svg>
      <p className="gcard-meta arc-count">{filled}/{ARC_BEATS.length} beats written · tap a point to write it. Solid = written, hollow = blank.</p>

      {cur && (
        <div className="arc-edit">
          <div className="arc-edit-head"><span className="kick-sm">{cur.pct}% · {cur.label}</span><em>{cur.tip}</em></div>
          <textarea rows={5} value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={() => save(cur)} placeholder={`e.g. ${cur.example}`} autoFocus />
          <div className="gcard-actions">
            <button type="button" className="abtn" onClick={() => { save(cur); const i = ARC_BEATS.indexOf(cur); const n = ARC_BEATS[i + 1]; if (n) { setOpen(n.key); setDraft(arc[n.key] || ""); } else setOpen(null); }}>Save → next beat</button>
            <button type="button" className="achip" onClick={() => { save(cur); setOpen(null); }}>Done</button>
          </div>
        </div>
      )}

      <ol className="arc-list">
        {ARC_BEATS.map((b) => {
          const v = (arc[b.key] || "").trim();
          return (
            <li key={b.key} className={(v ? "is-filled" : "") + (open === b.key ? " is-open" : "")}>
              <button type="button" className="arc-row" onClick={() => pick(b)}>
                <span className="arc-row-pct">{b.pct}%</span>
                <span className="arc-row-main"><strong>{b.label}</strong><em>{v || b.tip}</em></span>
                <span className="arc-row-dot" aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
