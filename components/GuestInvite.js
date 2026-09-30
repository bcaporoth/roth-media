"use client";

// "Ask your guests for their photos" — opens the phone share sheet with the
// guest upload link (falls back to copy on desktop).

import { useState } from "react";

export default function GuestInvite({ slug, title, className = "" }) {
  const [done, setDone] = useState("");
  const [showLink, setShowLink] = useState(false);
  const url = `https://rothmediaco.com/guest/${slug}`;
  // Generic on purpose: the album might be "Matt & April" or "The Klines" — the
  // sentence has to read right either way when it lands in a text thread.
  const text = `Got photos or videos from the day? Send them straight to our shared album — no app, just pick from your camera roll: ${url}`;

  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({ title: `Share your photos — ${title}`, text: text.replace(`: ${url}`, "."), url });
        setDone("Sent");
      } else {
        await navigator.clipboard.writeText(text);
        setDone("Copied — paste it anywhere");
      }
    } catch (err) {
      if (err?.name === "AbortError") return;
      // Embedded/preview browsers block share, clipboard AND prompt — never look dead.
      try { await navigator.clipboard.writeText(text); setDone("Copied — paste it anywhere"); } catch { setShowLink(true); setDone("Here's the link"); }
    }
    setTimeout(() => setDone(""), 2500);
  }

  return (
    <>
      <button type="button" className={`guest-invite ${className}`} onClick={share}>
        {done || "Ask your guests for their photos ↗"}
      </button>
      {showLink && (
        <p className="gcard-meta guest-invite-link">
          Send this to your guests: <a href={url}>{url.replace("https://", "")}</a>
        </p>
      )}
    </>
  );
}
