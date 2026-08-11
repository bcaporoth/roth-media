"use client";

import { useEffect, useState } from "react";
import {
  DESIGN_FONTS,
  DESIGN_MODES,
  DESIGN_ACCENTS,
  resolveDesign,
} from "../lib/design";

// Studio Admin — per-album design: font pairing, light/dark mood, accent.
// Live preview updates as you click; Save writes galleries.design.

async function api(payload) {
  const res = await fetch("/api/admin/gallery", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Request failed");
  return json;
}

const PREVIEW = {
  light: { bg: "#f4efe6", ink: "#221f1a", soft: "#6b6358" },
  dark: { bg: "#191612", ink: "#f1ebdf", soft: "#b4a894" },
};

export default function DesignPanel({ galleryId, design: initial, shareToken, title }) {
  const [open, setOpen] = useState(false);
  const [design, setDesign] = useState(() => resolveDesign(initial));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  // Load the three Google pairings so the pickers + preview render true.
  useEffect(() => {
    if (!open) return;
    Object.values(DESIGN_FONTS).forEach((f) => {
      if (f.href && !document.querySelector(`link[href="${f.href}"]`)) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = f.href;
        document.head.appendChild(link);
      }
    });
  }, [open]);

  function set(part) {
    setDesign((d) => ({ ...d, ...part }));
    setMsg("");
  }

  async function save() {
    setBusy(true);
    setMsg("");
    try {
      await api({ action: "set-design", galleryId, design });
      setMsg("Design saved ✓ — it's live on the album now.");
    } catch (e) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  }

  const font = DESIGN_FONTS[design.font];
  const accent = DESIGN_ACCENTS[design.accent];
  const pv = PREVIEW[design.mode];
  const pvDisplay = font.display || "var(--font-display), 'Syne', sans-serif";
  const pvBody = font.body || "var(--font-body), 'Manrope', sans-serif";

  return (
    <div className="design">
      <button type="button" className="cover-picker-toggle" onClick={() => setOpen(!open)}>
        {open ? "Close" : "Design"}
      </button>
      {open && (
        <div className="design-panel">
          <div
            className="design-preview"
            style={{ background: pv.bg, color: pv.ink }}
          >
            <span
              className="design-preview-kick"
              style={{ color: accent.main, fontFamily: pvBody }}
            >
              {design.mode === "dark" ? "An evening premiere" : "A Roth Media gallery"}
            </span>
            <strong style={{ fontFamily: pvDisplay }}>
              {title || "Nolan & Kennedy"}
            </strong>
            <span style={{ color: pv.soft, fontFamily: pvBody }}>
              Watch, view, and download — filmed by Roth Media.
            </span>
            <span
              className="design-preview-btn"
              style={{ background: accent.main, fontFamily: pvBody }}
            >
              View gallery ↓
            </span>
          </div>

          <div className="design-group">
            <strong>Fonts</strong>
            <div className="design-fonts">
              {Object.entries(DESIGN_FONTS).map(([key, f]) => (
                <button
                  key={key}
                  type="button"
                  className={"design-font" + (design.font === key ? " is-on" : "")}
                  onClick={() => set({ font: key })}
                >
                  <span
                    className="design-font-sample"
                    style={{
                      fontFamily: f.display || "var(--font-display), 'Syne', sans-serif",
                    }}
                  >
                    Aa
                  </span>
                  <span className="design-font-meta">
                    <em>{f.label}</em>
                    <small>{f.sub}</small>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="design-row">
            <div className="design-group">
              <strong>Mood</strong>
              <div className="design-modes">
                {Object.entries(DESIGN_MODES).map(([key, m]) => (
                  <button
                    key={key}
                    type="button"
                    className={"design-mode" + (design.mode === key ? " is-on" : "")}
                    onClick={() => set({ mode: key })}
                  >
                    <span
                      className="design-mode-chip"
                      style={{ background: PREVIEW[key].bg, borderColor: PREVIEW[key].soft }}
                    />
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="design-group">
              <strong>Accent</strong>
              <div className="design-accents">
                {Object.entries(DESIGN_ACCENTS).map(([key, a]) => (
                  <button
                    key={key}
                    type="button"
                    title={a.label}
                    aria-label={`Accent: ${a.label}`}
                    className={"design-accent" + (design.accent === key ? " is-on" : "")}
                    style={{ background: a.main }}
                    onClick={() => set({ accent: key })}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="design-actions">
            <button type="button" onClick={save} disabled={busy}>
              {busy ? "Saving…" : "Save design"}
            </button>
            {shareToken && (
              <a href={`/g/${shareToken}`} target="_blank" rel="noreferrer">
                Open album ↗
              </a>
            )}
          </div>
          {msg && <p className="cover-picker-hint" role="status">{msg}</p>}
        </div>
      )}
    </div>
  );
}
