"use client";

import { useEffect, useState } from "react";

// Your real Google Calendar, embedded. Google renders it, so it's always
// in sync — events show because you're signed into Google in this browser.
const MODES = [
  { key: "WEEK", label: "Week" },
  { key: "MONTH", label: "Month" },
  { key: "AGENDA", label: "List" },
];
const KEY = "rm-cal-mode";

export default function CalendarEmbed({ calendars }) {
  const [mode, setMode] = useState("WEEK");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (MODES.some((m) => m.key === saved)) setMode(saved);
      else if (window.matchMedia("(max-width: 640px)").matches) setMode("AGENDA");
    } catch {}
  }, []);

  function pick(m) {
    setMode(m);
    try {
      localStorage.setItem(KEY, m);
    } catch {}
  }

  const q = new URLSearchParams({
    ctz: "America/New_York",
    mode,
    showTitle: "0",
    showPrint: "0",
    showTz: "0",
    wkst: "1",
  });
  const src =
    "https://calendar.google.com/calendar/embed?" +
    q.toString() +
    calendars.map((c) => `&src=${encodeURIComponent(c)}`).join("");

  return (
    <div className="scal">
      <div className="srange" role="group" aria-label="Calendar view">
        {MODES.map((m) => (
          <button
            key={m.key}
            type="button"
            className={"ifilter" + (mode === m.key ? " is-on" : "")}
            onClick={() => pick(m.key)}
            aria-pressed={mode === m.key}
          >
            {m.label}
          </button>
        ))}
      </div>
      <div className="scal-frame">
        <iframe key={mode} src={src} title="Google Calendar" loading="lazy" />
      </div>
    </div>
  );
}
