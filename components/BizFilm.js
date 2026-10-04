"use client";

// A reel on the business pages: poster + one big play control, then the film
// plays with sound and native controls. Nothing downloads until the tap, and
// one film plays at a time. Without JS it is a plain <video controls>.
// Styles: app/theme/business.css (.bz-film …).

import { useEffect, useRef, useState } from "react";

const EVT = "bz:play";

export default function BizFilm({ src, poster, title, sub, vertical = false }) {
  const ref = useRef(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    setReady(true);
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
    v.muted = false;
    setPlaying(true);
    v.play().catch(() => {});
  }

  const cls = ["bz-film", vertical ? "bz-film--vertical" : "", playing ? "is-playing" : ""].filter(Boolean).join(" ");

  return (
    <figure className={cls}>
      <div className="bz-film-frame">
        <video
          ref={ref}
          src={src}
          poster={poster}
          playsInline
          preload="none"
          controls={!ready || playing}
          aria-label={`${title}${sub ? ` — ${sub}` : ""}`}
          onEnded={() => setPlaying(false)}
          onError={() => setPlaying(false)}
        />
        {ready && !playing && (
          <button type="button" className="bz-film-hit" onClick={play} aria-label={`Play ${title}`}>
            <span className="bz-film-play" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="20" height="20"><path d="M8 5v14l11-7z" fill="currentColor" /></svg>
            </span>
            <span className="bz-film-meta">
              <strong>{title}</strong>
              {sub && <span>{sub}</span>}
            </span>
          </button>
        )}
      </div>
      {!ready && <figcaption className="bz-film-cap">{title}{sub ? ` — ${sub}` : ""}</figcaption>}
    </figure>
  );
}
