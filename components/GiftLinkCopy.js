"use client";

import { useState } from "react";

// The friend card's link, as one slim row: the link on the left, a small
// raised Copy button on the right. Tapping anywhere on the row copies it.
export default function GiftLinkCopy({ link }) {
  const [ok, setOk] = useState(false);
  const [hold, setHold] = useState(false); // copying is blocked here: ask them to press and hold the link
  async function copy() {
    const done = () => { setOk(true); setTimeout(() => setOk(false), 2000); };
    try { await navigator.clipboard.writeText(link); done(); return; } catch {}
    // Older phones and in-app browsers: copy through a hidden text box.
    try {
      const t = document.createElement("textarea");
      t.value = link; t.setAttribute("readonly", ""); t.style.position = "fixed"; t.style.opacity = "0";
      document.body.appendChild(t); t.select();
      const worked = document.execCommand("copy");
      t.remove();
      if (worked) { done(); return; }
    } catch {}
    setHold(true);
  }
  return (
    <button type="button" className={"pt-giftlink" + (ok ? " is-ok" : "") + (hold ? " is-hold" : "")} onClick={copy} aria-label="Copy the gift link">
      <span className="pt-giftlink-url">{hold ? link : link.replace("https://", "")}</span>
      <span className="pt-giftlink-btn" aria-live="polite">
        {ok ? "Copied ✓" : hold ? "Press and hold the link" : (
          <>
            <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="M15 5.5V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
            Copy
          </>
        )}
      </span>
    </button>
  );
}
