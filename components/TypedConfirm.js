"use client";

import { useId, useState } from "react";

// The Studio's "are you sure" for anything that can't be undone: the action
// button stays off until the exact word (or gallery title) has been typed.
// Loose on case and curly quotes — phones change both — strict on everything else.
export function normTyped(s) {
  return String(s || "")
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export default function TypedConfirm({ phrase, prompt, cta, busy = false, onConfirm, onCancel }) {
  const id = useId();
  const [typed, setTyped] = useState("");
  const ok = Boolean(normTyped(phrase)) && normTyped(typed) === normTyped(phrase);
  return (
    <form
      className="tconfirm"
      onSubmit={(e) => {
        e.preventDefault();
        if (ok && !busy) onConfirm?.(typed);
      }}
    >
      <label htmlFor={id}>{prompt}</label>
      <div className="tconfirm-row">
        <input
          id={id}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder={phrase}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          disabled={busy}
        />
        <button type="submit" className="abtn tconfirm-go" disabled={!ok || busy}>
          {busy ? "Working…" : cta}
        </button>
        {onCancel && (
          <button type="button" className="achip" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
