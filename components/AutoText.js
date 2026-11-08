"use client";

// A text box that grows as you type, so the whole answer is always visible
// (2026-11-08, Brandon: "allow the boxes to be expandable"). Starts one line
// tall (or `rows`), never scrolls inside itself. Spell-check, phone
// autocorrect and sentence capitals are on, so typos get caught as you go.

import { useEffect, useRef } from "react";

export default function AutoText({ value = "", onChange, rows = 1, className = "cx-textarea", ...rest }) {
  const ref = useRef(null);
  const fit = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + 2}px`; // +2 = the 1px top and bottom border
  };
  useEffect(fit, [value]);
  useEffect(() => {
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);
  return (
    <textarea
      ref={ref}
      className={`${className} auto-text`}
      rows={rows}
      value={value}
      onChange={onChange}
      spellCheck
      autoCorrect="on"
      autoCapitalize="sentences"
      {...rest}
    />
  );
}
