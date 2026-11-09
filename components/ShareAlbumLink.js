"use client";

// The "Share" box on a client's gallery page (2026-11-09). It follows what's
// open: on the day tiles it shares the whole gallery; inside an album (or a
// folder) it shares just that. GalleryDays announces each change with an
// "albumchange" event.

import { useEffect, useState } from "react";

export default function ShareAlbumLink({ shareToken }) {
  const [now, setNow] = useState({ param: null, title: null });
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    const on = (e) => { setNow({ param: e.detail?.param || null, title: e.detail?.title || null }); setCopied(false); };
    window.addEventListener("albumchange", on);
    return () => window.removeEventListener("albumchange", on);
  }, []);

  const full = `https://rothmediaco.com/g/${shareToken}${now.param ? `?album=${now.param}` : ""}`;
  async function copy() {
    try {
      await navigator.clipboard.writeText(full);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      window.prompt("Copy this link:", full);
    }
  }

  // One clear button (the underlined link next to it was the same thing
  // twice). The sentence says exactly what the button shares.
  return (
    <div className="pt-share">
      <p className="cx-kick">Share</p>
      <p className="pt-share-text">
        Send {now.param ? <strong>{now.title}</strong> : "this whole gallery"} to family &amp; friends. They can open it without a login.
      </p>
      <button type="button" className={"cx-btn cx-btn--light pt-share-copy" + (copied ? " is-done" : "")} onClick={copy} aria-live="polite">
        {copied ? "Copied ✓ Now paste it in a text or email" : <>🔗 Copy link{now.param ? " to this album" : ""}</>}
      </button>
    </div>
  );
}
