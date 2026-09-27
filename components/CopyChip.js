"use client";

import { useState } from "react";

export default function CopyChip({ text, label = "Copy" }) {
  const [done, setDone] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 2000);
    } catch {
      window.prompt("Copy:", text);
    }
  }
  return (
    <button type="button" className={"achip" + (done ? " is-done" : "")} onClick={copy}>
      {done ? "Copied ✓" : label}
    </button>
  );
}
