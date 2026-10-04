"use client";

// One video card for the Work section. Poster + custom play button until you
// tap; then sound on and native controls. Hover on desktop = silent preview.
// Only one card plays at a time.
// Without JS the video keeps its native controls, so the film still plays.

import { useEffect, useRef, useState } from "react";

const EVT = "rm:film-play";

export default function FilmCard({ src, poster, title, sub, label, vertical = false, feature = false, preload = "metadata" }) {
  const ref = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [ready, setReady] = useState(false); // hydrated: swap native controls for the play button
  useEffect(() => setReady(true), []);

  // Someone else started — stop this one.
  useEffect(() => {
    const onOther = (e) => {
      const v = ref.current;
      if (!v || e.detail === v) return;
      if (!v.paused) v.pause();
      v.muted = true;
      setPlaying(false);
      setPreviewing(false);
    };
    window.addEventListener(EVT, onOther);
    return () => window.removeEventListener(EVT, onOther);
  }, []);

  function play() {
    const v = ref.current;
    if (!v) return;
    window.dispatchEvent(new CustomEvent(EVT, { detail: v }));
    v.muted = false;
    v.currentTime = 0;
    v.play().catch(() => {});
    setPlaying(true);
    setPreviewing(false);
  }

  function preview(on) {
    const v = ref.current;
    if (!v || playing) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (on) {
      v.muted = true;
      v.currentTime = 0;
      v.play().then(() => setPreviewing(true)).catch(() => {});
    } else {
      v.pause();
      v.currentTime = 0;
      setPreviewing(false);
    }
  }

  function stopped() {
    const v = ref.current;
    if (v) { v.muted = true; v.currentTime = 0; }
    setPlaying(false);
    setPreviewing(false);
  }

  const cls = ["fc", vertical ? "fc--vertical" : "fc--wide", feature ? "fc--feature" : "", playing ? "is-playing" : "", previewing ? "is-previewing" : ""].filter(Boolean).join(" ");

  return (
    <figure className={cls} onMouseEnter={() => preview(true)} onMouseLeave={() => preview(false)}>
      <div className="fc-frame">
        <video
          ref={ref}
          src={src}
          poster={poster}
          playsInline
          preload={preload}
          controls={playing || !ready}
          onEnded={stopped}
          onPause={() => { if (playing && ref.current?.ended) stopped(); }}
        />
        {ready && !playing && (
          <button type="button" className="fc-hit" onClick={play} aria-label={`Play ${title}`}>
            <span className="fc-play" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="22" height="22"><path d="M8 5v14l11-7z" fill="currentColor" /></svg>
            </span>
          </button>
        )}
        {!playing && (
          <figcaption className="fc-cap">
            {label && <span className="fc-label">{label}</span>}
            <strong>{title}</strong>
            {sub && <span className="fc-sub">{sub}</span>}
          </figcaption>
        )}
      </div>
    </figure>
  );
}
