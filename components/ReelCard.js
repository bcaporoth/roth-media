"use client";

import { useRef, useState } from "react";

// Vertical reel in a phone-style frame; tap to play with sound.
export default function ReelCard({ src, title, client }) {
  const ref = useRef(null);
  const [playing, setPlaying] = useState(false);

  function toggle() {
    const v = ref.current;
    if (!v) return;
    if (v.paused) {
      v.muted = false;
      v.play();
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  }

  return (
    <figure className="reel-card">
      <button
        className="reel-card-frame"
        onClick={toggle}
        aria-label={playing ? `Pause ${title}` : `Play ${title}`}
      >
        <video
          ref={ref}
          src={src}
          playsInline
          preload="metadata"
          onEnded={() => setPlaying(false)}
        />
        {!playing && (
          <span className="reel-card-play" aria-hidden="true">
            ▶
          </span>
        )}
      </button>
      <figcaption>
        <strong>{title}</strong>
        {client && <span>{client}</span>}
      </figcaption>
    </figure>
  );
}
