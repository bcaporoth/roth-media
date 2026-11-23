"use client";

// The color picker for a project: a row of dots. The picked color is what
// that project's shoots wear on the Studio calendar.
import { PROJECT_COLORS } from "../lib/project-colors";

export default function ProjectColorDots({ value = "", onPick, busy = false, name = "this project" }) {
  return (
    <span className="pcolor" role="group" aria-label={`Calendar color for ${name}`}>
      {PROJECT_COLORS.map((c) => (
        <button key={c.key} type="button" className={"pcolor-dot" + (value === c.key ? " is-on" : "")} style={{ background: c.hex }} aria-pressed={value === c.key} aria-label={c.label} title={value === c.key ? `${c.label} — tap to take the color off` : c.label} disabled={busy} onClick={() => onPick(value === c.key ? "" : c.key)} />
      ))}
    </span>
  );
}
