"use client";

// ▶ Teleprompter: the script's spoken lines scrolling up past a reading line,
// big, white on black. Opens from Film mode or a T-chart's header.
//
//   T-chart   — every "said" line, scene labels as dividers; the "seen" side
//               can ride underneath as a small cue (Cues on/off).
//   Questions — each question, the answer you're after as the cue.
//   Scripts   — hook, every Say line (Do as the cue), the close.
//
// Size, speed, margins, mirror (for a beam-splitter glass), cues and the
// 3-2-1 countdown are remembered per device. Tap the words to pause; while
// it runs the controls tuck away. Keys: space play/pause · ↑↓ speed ·
// + − size · ←→ line back/forward · M mirror · Esc close.

import { useCallback, useEffect, useRef, useState } from "react";
import { SEE_LABEL } from "../lib/scripts";

const KEY = "rm-prompter";
const DEFAULTS = { size: 48, speed: 6, width: 90, mirror: false, cues: true, countdown: true };
const READ_AT = 0.3; // the reading line, as a share of the screen height

function loadPrefs() {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch { return DEFAULTS; }
}
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

// What goes on the prompter for each kind: scene markers + lines to read.
export function promptItems(kind, b) {
  if (kind === "tchart") {
    const many = b.scenes.length > 1;
    return b.scenes.flatMap((sc, si) => {
      const lines = sc.lines.filter((l) => l.say.trim()).map((l) => ({ say: l.say, cue: l.see ? `${SEE_LABEL[l.tag] || "Seen"}: ${l.see}` : "" }));
      if (!lines.length) return [];
      return [...(many || sc.label ? [{ scene: sc.label || `Scene ${si + 1}` }] : []), ...lines];
    });
  }
  if (kind === "questions") return b.questions.filter((q) => q.q.trim()).map((q) => ({ say: q.q, cue: q.a }));
  return [
    ...(b.hook ? [{ say: b.hook, cue: "Hook" }] : []),
    ...b.steps.filter((s) => s.say.trim()).map((s) => ({ say: s.say, cue: s.do })),
    ...(b.cta ? [{ say: b.cta, cue: "Close" }] : []),
  ];
}

export default function Teleprompter({ title, items, onClose }) {
  const [prefs, setPrefs] = useState(DEFAULTS);
  const [playing, setPlaying] = useState(false);
  const [count, setCount] = useState(0); // countdown seconds left, 0 = none
  const [panel, setPanel] = useState(true); // controls showing
  const [progress, setProgress] = useState(0);
  const box = useRef(null);
  const pos = useRef(0); // exact scroll position (scrollTop rounds)
  const set = (patch) => setPrefs((p) => { const n = { ...p, ...patch }; try { localStorage.setItem(KEY, JSON.stringify(n)); } catch {} return n; });

  useEffect(() => { setPrefs(loadPrefs()); }, []);

  // Scroll: speed is in "lines-ish per second", so bigger words move faster in pixels and read the same.
  useEffect(() => {
    if (!playing) return;
    let raf, last = performance.now();
    const tick = (now) => {
      const el = box.current;
      if (!el) return;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (Math.abs(el.scrollTop - pos.current) > 3) pos.current = el.scrollTop; // a finger moved it
      const max = el.scrollHeight - el.clientHeight;
      pos.current = Math.min(max, pos.current + prefs.speed * prefs.size * 0.11 * dt);
      el.scrollTop = pos.current;
      if (pos.current >= max - 1) { setPlaying(false); setPanel(true); return; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, prefs.speed, prefs.size]);

  // Countdown, then roll.
  useEffect(() => {
    if (!count) return;
    const t = setTimeout(() => { if (count === 1) { setCount(0); setPlaying(true); } else setCount(count - 1); }, 800);
    return () => clearTimeout(t);
  }, [count]);

  // Keep the screen on while it's open (iOS 16.4+, Chrome); quietly skipped elsewhere.
  useEffect(() => {
    let lock = null;
    const get = () => navigator.wakeLock?.request("screen").then((l) => { lock = l; }).catch(() => {});
    get();
    const onVis = () => { if (document.visibilityState === "visible") get(); };
    document.addEventListener("visibilitychange", onVis);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("visibilitychange", onVis); lock?.release().catch(() => {}); document.body.style.overflow = ""; };
  }, []);

  // Controls tuck away a moment after it starts rolling.
  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => setPanel(false), 1800);
    return () => clearTimeout(t);
  }, [playing]);

  const start = useCallback(() => {
    const el = box.current;
    if (el && el.scrollTop >= el.scrollHeight - el.clientHeight - 1) { pos.current = 0; el.scrollTop = 0; } // at the end: from the top
    if (prefs.countdown && el && el.scrollTop < 4) setCount(3);
    else setPlaying(true);
  }, [prefs.countdown]);
  const stop = () => { setPlaying(false); setCount(0); setPanel(true); };
  const toggle = () => (playing || count ? stop() : start());
  const restart = () => { stop(); pos.current = 0; if (box.current) box.current.scrollTop = 0; };

  // Jump so the next / previous line sits on the reading line.
  const jump = useCallback((dir) => {
    const el = box.current;
    if (!el) return;
    const mark = el.scrollTop + 2;
    const tops = [...el.querySelectorAll("[data-line]")].map((n) => n.offsetTop - el.clientHeight * READ_AT);
    const to = dir > 0 ? tops.find((t) => t > mark + 2) : [...tops].reverse().find((t) => t < mark - 4);
    if (to === undefined) return;
    pos.current = clamp(to, 0, el.scrollHeight - el.clientHeight);
    el.scrollTop = pos.current;
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest?.("input, select")) return;
      if (e.key === "Escape") onClose();
      else if (e.key === " ") { e.preventDefault(); toggle(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); set({ speed: clamp(prefs.speed + 1, 1, 20) }); }
      else if (e.key === "ArrowDown") { e.preventDefault(); set({ speed: clamp(prefs.speed - 1, 1, 20) }); }
      else if (e.key === "ArrowRight") jump(1);
      else if (e.key === "ArrowLeft") jump(-1);
      else if (e.key === "+" || e.key === "=") set({ size: clamp(prefs.size + 4, 24, 120) });
      else if (e.key === "-") set({ size: clamp(prefs.size - 4, 24, 120) });
      else if (e.key === "m" || e.key === "M") set({ mirror: !prefs.mirror });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const onScroll = () => {
    const el = box.current;
    if (!el) return;
    const max = el.scrollHeight - el.clientHeight;
    setProgress(max > 0 ? el.scrollTop / max : 0);
  };

  const rolling = playing || count > 0;
  return (
    <div className={"tp" + (rolling && !panel ? " is-rolling" : "")} role="dialog" aria-modal="true" aria-label="Teleprompter">
      <div className="tp-progress"><span style={{ width: `${Math.round(progress * 100)}%` }} /></div>
      <div className="tp-read" style={{ top: `${READ_AT * 100}%` }} aria-hidden="true" />
      <div ref={box} className="tp-scroll" onScroll={onScroll} onClick={() => (rolling ? stop() : setPanel(!panel))}>
        <div className="tp-text" style={{ fontSize: `${prefs.size}px`, width: `${prefs.width}%`, transform: prefs.mirror ? "scaleX(-1)" : undefined, paddingTop: `${READ_AT * 100}vh` }}>
          {items.length === 0 && <p className="tp-empty">Nothing to read yet. Write some lines first.</p>}
          {items.map((it, i) => it.scene
            ? <p key={i} className="tp-scene">{it.scene}</p>
            : (
              <div key={i} className="tp-line" data-line>
                <p className="tp-say">{it.say}</p>
                {prefs.cues && it.cue && <p className="tp-cue">{it.cue}</p>}
              </div>
            ))}
          {items.length > 0 && <p className="tp-end">— end —</p>}
        </div>
      </div>
      {count > 0 && <div className="tp-count" aria-live="assertive">{count}</div>}

      <div className="tp-panel" onClick={(e) => e.stopPropagation()}>
        <div className="tp-row">
          <button type="button" className="tp-btn" onClick={onClose} aria-label="Close teleprompter">✕</button>
          <span className="tp-title">{title}</span>
          <button type="button" className="tp-btn" onClick={() => jump(-1)} aria-label="Back a line">⏮</button>
          <button type="button" className="tp-btn tp-play" onClick={toggle} aria-label={rolling ? "Pause" : "Play"}>{rolling ? "❚❚" : "▶"}</button>
          <button type="button" className="tp-btn" onClick={() => jump(1)} aria-label="Forward a line">⏭</button>
        </div>
        <label className="tp-slide"><span>Size <b>{prefs.size}</b></span>
          <input type="range" min={24} max={120} step={2} value={prefs.size} onChange={(e) => set({ size: Number(e.target.value) })} />
        </label>
        <label className="tp-slide"><span>Speed <b>{prefs.speed}</b></span>
          <input type="range" min={1} max={20} step={1} value={prefs.speed} onChange={(e) => set({ speed: Number(e.target.value) })} />
        </label>
        <label className="tp-slide"><span>Width <b>{prefs.width}%</b></span>
          <input type="range" min={50} max={100} step={5} value={prefs.width} onChange={(e) => set({ width: Number(e.target.value) })} />
        </label>
        <div className="tp-row tp-toggles">
          <button type="button" className="tp-chip" aria-pressed={prefs.mirror} onClick={() => set({ mirror: !prefs.mirror })}>Mirror</button>
          <button type="button" className="tp-chip" aria-pressed={prefs.cues} onClick={() => set({ cues: !prefs.cues })}>Cues</button>
          <button type="button" className="tp-chip" aria-pressed={prefs.countdown} onClick={() => set({ countdown: !prefs.countdown })}>3-2-1</button>
          <button type="button" className="tp-chip" onClick={restart}>↺ Top</button>
        </div>
      </div>
    </div>
  );
}
