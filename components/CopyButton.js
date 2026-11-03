"use client";

import { useState } from "react";

// One tap → it's on their clipboard. Falls back to selecting the text.
export default function CopyButton({ text, label = "Copy", done = "Copied", className = "" }) {
  const [ok, setOk] = useState(false);
  async function copy() {
    try { await navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 2000); }
    catch { window.prompt("Copy this:", text); }
  }
  return <button type="button" className={className} onClick={copy} aria-live="polite">{ok ? done : label}</button>;
}
