"use client";

import { useState } from "react";

// One-tap "please leave a Google review" email to the gallery's client.
export default function ReviewButton({ galleryId, clientEmail, requestedAt }) {
  const [sentAt, setSentAt] = useState(requestedAt);
  const [state, setState] = useState("");

  if (!clientEmail) return null;

  async function send() {
    if (sentAt && !window.confirm(`You already asked on ${new Date(sentAt).toLocaleDateString()}. Send again?`)) return;
    setState("sending");
    try {
      const res = await fetch("/api/admin/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ galleryId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "failed");
      setSentAt(json.sentAt);
      setState("sent");
    } catch (err) {
      setState(err.message || "failed");
    }
  }

  return (
    <button
      type="button"
      className={"achip" + (state === "sent" ? " is-done" : "")}
      onClick={send}
      disabled={state === "sending"}
      title={`Email ${clientEmail} your Google review link`}
    >
      {state === "sending"
        ? "Sending…"
        : state === "sent"
          ? "Review ask sent ✓"
          : state
            ? `Couldn't send — ${state}`
            : sentAt
              ? `★ Asked ${new Date(sentAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
              : "★ Ask for a review"}
    </button>
  );
}
