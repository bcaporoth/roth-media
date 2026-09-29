"use client";

// "Ask your guests for their photos" — opens the phone share sheet with the
// guest upload link (falls back to copy on desktop).

import { useState } from "react";

export default function GuestInvite({ slug, title, className = "" }) {
  const [done, setDone] = useState("");
  const url = `https://rothmediaco.com/guest/${slug}`;
  const text = `Got photos or videos from ${title}? Send them straight to us here — no app, just pick from your camera roll: ${url}`;

  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({ title: `Photos from ${title}`, text: text.replace(`: ${url}`, "."), url });
        setDone("Sent");
      } else {
        await navigator.clipboard.writeText(text);
        setDone("Copied — paste it anywhere");
      }
    } catch (err) {
      if (err?.name === "AbortError") return;
      try { await navigator.clipboard.writeText(text); setDone("Copied — paste it anywhere"); } catch { window.prompt("Copy this link:", url); }
    }
    setTimeout(() => setDone(""), 2500);
  }

  return (
    <button type="button" className={`guest-invite ${className}`} onClick={share}>
      {done || "Ask your guests for their photos ↗"}
    </button>
  );
}
