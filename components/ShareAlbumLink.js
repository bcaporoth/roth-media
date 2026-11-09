"use client";

// The "Share" box on a client's gallery page (2026-11-09). It follows what's
// open: on the day tiles it shares the whole gallery; inside an album (or a
// folder) it shares just that, with a Copy link button. GalleryDays announces
// each change with an "albumchange" event.

import { useEffect, useState } from "react";

export default function ShareAlbumLink({ shareToken }) {
  const [now, setNow] = useState({ param: null, title: null });
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    const on = (e) => { setNow({ param: e.detail?.param || null, title: e.detail?.title || null }); setCopied(false); };
    window.addEventListener("albumchange", on);
    return () => window.removeEventListener("albumchange", on);
  }, []);

  const path = `/g/${shareToken}${now.param ? `?album=${now.param}` : ""}`;
  const full = `https://rothmediaco.com${path}`;
  async function copy() {
    try {
      await navigator.clipboard.writeText(full);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="pt-share">
      <p className="cx-kick">Share</p>
      <p className="pt-share-text">
        {now.param ? <>Share <strong>{now.title}</strong> with family &amp; friends</> : <>Share this gallery with family &amp; friends</>}
        {" "}— no login needed:{" "}
        <a href={path}>rothmediaco.com/g/{shareToken.slice(0, 8)}…</a>
      </p>
      <button type="button" className={"achip pt-share-copy" + (copied ? " is-on" : "")} onClick={copy}>
        {copied ? "Copied ✓" : "🔗 Copy link"}
      </button>
    </div>
  );
}
