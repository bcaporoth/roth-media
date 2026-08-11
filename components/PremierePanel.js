"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { FOLLOWUP_TEMPLATES, formatReveal } from "../lib/premiere-emails";

// Studio Admin — Same-Night Premiere controls for one gallery:
// enable + reveal time, QR poster download, lead list/CSV, backup reveal
// send, and the manual follow-up email templates.

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

// ISO → value usable by <input type="datetime-local"> in the local zone.
function toLocalInput(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

// Brand mark path (same as BrandMark.js), drawn on the poster canvas.
const MARK_PATH =
  "M16 122 V8 H56 a38 40 0 0 1 16.5 76 L97 122 H68 L47.5 84 H38 V122 Z";
const PLAY_PATH = "M38 26 L74 50 L38 74 Z";

async function drawPoster({ title, url }) {
  const W = 1700;
  const H = 2200;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  const css = getComputedStyle(document.documentElement);
  const display = css.getPropertyValue("--font-display").trim() || "serif";
  const body = css.getPropertyValue("--font-body").trim() || "sans-serif";

  ctx.fillStyle = "#221f1a";
  ctx.fillRect(0, 0, W, H);

  // Brand mark, centered near the top.
  const markScale = 1.6;
  ctx.save();
  ctx.translate(W / 2 - 50 * markScale, 120);
  ctx.scale(markScale, markScale);
  ctx.fillStyle = "#faf6ee";
  ctx.fill(new Path2D(MARK_PATH));
  ctx.fillStyle = "#b06a4f";
  ctx.fill(new Path2D(PLAY_PATH));
  ctx.restore();

  ctx.textAlign = "center";
  ctx.fillStyle = "#d9c7a7";
  ctx.font = `600 44px ${body}`;
  const spaced = (t) => t.split("").join("  ");
  ctx.fillText(spaced("ROTH MEDIA"), W / 2, 410);

  ctx.fillStyle = "#b06a4f";
  ctx.font = `700 52px ${body}`;
  ctx.fillText(spaced("TONIGHT'S FILM"), W / 2, 560);

  // Title — wrap to two lines max.
  ctx.fillStyle = "#faf6ee";
  ctx.font = `800 108px ${display}`;
  const words = title.split(" ");
  const lines = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > W - 240 && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  lines.slice(0, 2).forEach((l, i) => ctx.fillText(l, W / 2, 700 + i * 128));
  const afterTitle = 700 + Math.min(lines.length, 2) * 128;

  // QR on a cream card for scan contrast.
  const qrSize = 780;
  const card = qrSize + 120;
  const cardX = (W - card) / 2;
  const cardY = afterTitle + 60;
  ctx.fillStyle = "#faf6ee";
  const r = 48;
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, card, card, r);
  ctx.fill();

  const qrCanvas = document.createElement("canvas");
  await QRCode.toCanvas(qrCanvas, url, {
    width: qrSize,
    margin: 0,
    errorCorrectionLevel: "M",
    color: { dark: "#221f1aff", light: "#faf6eeff" },
  });
  ctx.drawImage(qrCanvas, (W - qrSize) / 2, cardY + 60);

  ctx.fillStyle = "#faf6ee";
  ctx.font = `700 64px ${body}`;
  ctx.fillText("Scan to watch the sneak peek", W / 2, cardY + card + 130);
  ctx.fillStyle = "#d8d2c6";
  ctx.font = `400 44px ${body}`;
  ctx.fillText(
    "Drop your email — the film lands in your inbox",
    W / 2,
    cardY + card + 210
  );
  ctx.fillText("the moment it premieres.", W / 2, cardY + card + 270);

  ctx.fillStyle = "#8a8378";
  ctx.font = `600 38px ${body}`;
  ctx.fillText("rothmediaco.com", W / 2, H - 90);

  return canvas.toDataURL("image/png");
}

function download(dataUrl, filename) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

export default function PremierePanel({ galleryId }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState(null); // premiere-status payload
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [revealLocal, setRevealLocal] = useState("");
  const [openTpl, setOpenTpl] = useState(null);
  const qrRef = useRef(null);

  const shareUrl = state
    ? `https://rothmediaco.com/g/${state.shareToken}`
    : "";

  async function refresh() {
    setLoading(true);
    setMsg("");
    try {
      const j = await api({ action: "premiere-status", galleryId });
      setState(j);
      setEnabled(Boolean(j.enabled));
      setRevealLocal(toLocalInput(j.revealAt));
    } catch (e) {
      setMsg(e.message);
    } finally {
      setLoading(false);
    }
  }

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && state === null) refresh();
  }

  // Small QR preview once enabled.
  useEffect(() => {
    if (open && enabled && shareUrl && qrRef.current) {
      QRCode.toCanvas(qrRef.current, shareUrl, {
        width: 132,
        margin: 1,
        color: { dark: "#221f1aff", light: "#ffffffff" },
      }).catch(() => {});
    }
  }, [open, enabled, shareUrl]);

  async function save() {
    setBusy(true);
    setMsg("");
    try {
      const revealAt = revealLocal ? new Date(revealLocal).toISOString() : null;
      if (enabled && !revealAt) throw new Error("Pick a reveal date & time first.");
      await api({ action: "set-premiere", galleryId, enabled, revealAt });
      setMsg(enabled ? "Premiere is ON ✓" : "Premiere turned off.");
      await refresh();
      setEnabled(Boolean(enabled));
    } catch (e) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function poster() {
    setBusy(true);
    setMsg("Building poster…");
    try {
      const dataUrl = await drawPoster({ title: state.title, url: shareUrl });
      download(dataUrl, `${state.title.replace(/[^\w ]/g, "")} premiere poster.png`);
      setMsg("Poster downloaded ✓ — print it or AirDrop it to your phone.");
    } catch (e) {
      setMsg(e.message || "Poster failed.");
    } finally {
      setBusy(false);
    }
  }

  async function qrOnly() {
    try {
      const dataUrl = await QRCode.toDataURL(shareUrl, {
        width: 1000,
        margin: 2,
        color: { dark: "#221f1aff", light: "#ffffffff" },
      });
      download(dataUrl, `${state.title.replace(/[^\w ]/g, "")} QR.png`);
    } catch {
      setMsg("QR failed.");
    }
  }

  function copyEmails() {
    const emails = (state?.leads || []).map((l) => l.email).join(", ");
    navigator.clipboard.writeText(emails).then(
      () => setMsg(`Copied ${state.leads.length} emails ✓`),
      () => setMsg("Copy failed — select them manually.")
    );
  }

  function csv() {
    const rows = [["name", "email", "signed_up", "reveal_email"]].concat(
      (state?.leads || []).map((l) => [
        l.name,
        l.email,
        l.created_at,
        l.reveal_sent_at ? "sent/scheduled" : "not sent",
      ])
    );
    const text = rows
      .map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    download(
      `data:text/csv;charset=utf-8,${encodeURIComponent(text)}`,
      `${state.title.replace(/[^\w ]/g, "")} premiere leads.csv`
    );
  }

  async function sendReveal() {
    setBusy(true);
    setMsg("Sending…");
    try {
      const j = await api({ action: "send-reveal", galleryId });
      setMsg(`Sent to ${j.sent} ${j.sent === 1 ? "person" : "people"} ✓`);
      await refresh();
    } catch (e) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  }

  function copyTemplate(t) {
    navigator.clipboard
      .writeText(`Subject: ${t.subject}\n\n${t.body}`)
      .then(
        () => setMsg(`"${t.subject}" copied ✓ — paste into a Resend broadcast or your email app.`),
        () => setMsg("Copy failed.")
      );
  }

  return (
    <div className="premiere">
      <button type="button" className="cover-picker-toggle" onClick={toggle}>
        {open ? "Close" : "Premiere"}
      </button>
      {open && (
        <div className="premiere-panel">
          {loading && <p className="cover-picker-hint">Loading…</p>}
          {!loading && state && (
            <>
              <div className="premiere-row">
                <label className="premiere-check">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => setEnabled(e.target.checked)}
                  />
                  Same-Night Premiere on
                </label>
                <label className="premiere-when">
                  Reveal at
                  <input
                    type="datetime-local"
                    value={revealLocal}
                    onChange={(e) => setRevealLocal(e.target.value)}
                  />
                </label>
                <button type="button" onClick={save} disabled={busy}>
                  Save
                </button>
              </div>
              {state.enabled && state.revealAt && (
                <p className="cover-picker-hint">
                  Live plan: reveals {formatReveal(state.revealAt)}. Set the
                  time <strong>before</strong> printing the QR — already-scheduled
                  reveal emails don&apos;t move if you change it later.
                </p>
              )}
              {!state.emailReady && (
                <p className="cform-error">
                  Heads up: RESEND_API_KEY isn&apos;t set, so signups are saved
                  but no emails go out yet.
                </p>
              )}

              {enabled && (
                <div className="premiere-row premiere-qr">
                  <canvas ref={qrRef} width={132} height={132} />
                  <div className="premiere-qr-actions">
                    <button type="button" onClick={poster} disabled={busy}>
                      Download poster (print-ready)
                    </button>
                    <button type="button" onClick={qrOnly} disabled={busy}>
                      Download QR only
                    </button>
                  </div>
                </div>
              )}

              <div className="premiere-leads">
                <div className="premiere-leads-head">
                  <strong>
                    {state.leads.length}{" "}
                    {state.leads.length === 1 ? "signup" : "signups"}
                  </strong>
                  {state.leads.length > 0 && (
                    <span className="premiere-leads-tools">
                      <button type="button" onClick={copyEmails}>Copy emails</button>
                      <button type="button" onClick={csv}>CSV</button>
                      {state.unsent > 0 && (
                        <button type="button" onClick={sendReveal} disabled={busy}>
                          Send reveal email now ({state.unsent})
                        </button>
                      )}
                    </span>
                  )}
                </div>
                {state.leads.slice(0, 30).map((l) => (
                  <div className="premiere-lead" key={l.email}>
                    <span>{l.name || "—"}</span>
                    <span>{l.email}</span>
                  </div>
                ))}
                {state.leads.length > 30 && (
                  <p className="cover-picker-hint">
                    + {state.leads.length - 30} more — grab the CSV.
                  </p>
                )}
              </div>

              <div className="premiere-templates">
                <strong>Follow-up emails (copy &amp; send)</strong>
                {FOLLOWUP_TEMPLATES.map((t) => (
                  <div className="premiere-tpl" key={t.id}>
                    <button
                      type="button"
                      className="premiere-tpl-head"
                      onClick={() => setOpenTpl(openTpl === t.id ? null : t.id)}
                    >
                      <span>{t.subject}</span>
                      <em>{t.when}</em>
                    </button>
                    {openTpl === t.id && (
                      <div className="premiere-tpl-body">
                        <pre>{t.body}</pre>
                        <button type="button" onClick={() => copyTemplate(t)}>
                          Copy this email
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {msg && <p className="cover-picker-hint" role="status">{msg}</p>}
            </>
          )}
          {!loading && !state && msg && (
            <p className="cform-error">{msg}</p>
          )}
        </div>
      )}
    </div>
  );
}
