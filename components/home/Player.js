"use client";

// Poster + custom play control. Nothing downloads until the tap; then the
// film plays with sound and native controls. One film plays at a time.

import { useEffect, useRef, useState } from "react";

const EVT = "cin:play";

export default function Player({ src, poster, alt, title, sub, runtime, vertical = false, feature = false }) {
  const ref = useRef(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const onOther = (e) => {
      const v = ref.current;
      if (!v || e.detail === v) return;
      if (!v.paused) v.pause();
      setPlaying(false);
    };
    window.addEventListener(EVT, onOther);
    return () => window.removeEventListener(EVT, onOther);
  }, []);

  function play() {
    const v = ref.current;
    if (!v) return;
    window.dispatchEvent(new CustomEvent(EVT, { detail: v }));
    if (!v.getAttribute("src")) v.setAttribute("src", src);
    v.muted = false;
    setPlaying(true);
    v.play().catch(() => {});
  }

  const cls = ["cin-player", vertical ? "cin-player--vertical" : "", feature ? "cin-player--feature" : "", playing ? "is-playing" : ""].filter(Boolean).join(" ");

  return (
    <figure className={cls}>
      <div className="cin-player-frame">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="cin-player-poster" src={poster} alt={alt || title} loading="lazy" />
        <video
          ref={ref}
          poster={poster}
          playsInline
          preload="none"
          controls={playing}
          onEnded={() => setPlaying(false)}
          onError={() => setPlaying(false)}
        />
        {!playing && (
          <button type="button" className="cin-player-hit" onClick={play} aria-label={`Play ${title}`}>
            <span className="cin-play" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="20" height="20"><path d="M8 5v14l11-7z" fill="currentColor" /></svg>
            </span>
            <span className="cin-player-meta">
              <strong>{title}</strong>
              {sub && <span>{sub}</span>}
            </span>
            {runtime && <span className="cin-player-tag">{runtime}</span>}
          </button>
        )}
      </div>
    </figure>
  );
}
