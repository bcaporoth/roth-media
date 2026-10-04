"use client";

// Guest Reel upload page: scan → name → consent → pick from camera roll →
// straight to R2 via presigned PUTs. No app, no account. Optional 60-second
// video message recorded in the browser.

import "../app/theme/share.css";
import { useEffect, useRef, useState } from "react";

const BATCH = 12;
const CONCURRENCY = 2;
const WEB_MAX = 1600;
const NAME_KEY = "rm-guest-name";
const MESSAGE_SECONDS = 60;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fmtBytes = (n) =>
  n >= 1e9 ? `${(n / 1e9).toFixed(1)} GB` : n >= 1e6 ? `${(n / 1e6).toFixed(0)} MB` : `${Math.max(1, Math.round(n / 1e3))} KB`;

// Desktop drags of HEIC/MOV sometimes arrive with an empty type.
function guessType(name = "") {
  const ext = name.toLowerCase().split(".").pop();
  return { heic: "image/heic", heif: "image/heif", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif", mov: "video/quicktime", mp4: "video/mp4", m4v: "video/mp4", webm: "video/webm" }[ext] || "application/octet-stream";
}

async function api(payload) {
  const res = await fetch("/api/guest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
  return json;
}

function putXhr(url, body, contentType, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    if (contentType) xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`HTTP ${xhr.status}`)));
    xhr.onerror = () => reject(new Error("Network error"));
    xhr.send(body);
  });
}

async function putWithRetry(url, body, contentType, onProgress) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await putXhr(url, body, contentType, onProgress);
    } catch (err) {
      if (attempt >= 4) throw err;
      await sleep(attempt * 1500);
    }
  }
}

// Web-size JPEG + dimensions for a photo. Returns null if the browser can't
// decode it (rare HEIC on desktop) — the gallery then shows the original.
async function webVersion(file) {
  try {
    const probe = await createImageBitmap(file);
    const { width, height } = probe;
    probe.close?.();
    const scale = Math.min(1, WEB_MAX / Math.max(width, height));
    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(height * scale));
    let bitmap;
    try {
      bitmap = await createImageBitmap(file, { resizeWidth: w, resizeHeight: h, resizeQuality: "high", imageOrientation: "from-image" });
    } catch {
      bitmap = await createImageBitmap(file);
    }
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d").drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    const blob = await new Promise((r) => canvas.toBlob(r, "image/jpeg", 0.85));
    canvas.width = canvas.height = 0;
    return blob ? { blob, width, height } : null;
  } catch {
    return null;
  }
}

export default function GuestUpload({ slug, title, open, closesAt }) {
  const [name, setName] = useState("");
  const [consent, setConsent] = useState(false);
  const [queue, setQueue] = useState([]); // {id, file, message, status, pct, error}
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(0);
  const [error, setError] = useState("");
  const [rec, setRec] = useState(null); // {stream, recorder, chunks, seconds, preview}
  const fileRef = useRef(null);
  const videoRef = useRef(null);

  useEffect(() => {
    try { setName(localStorage.getItem(NAME_KEY) || ""); } catch {}
  }, []);
  useEffect(() => {
    try { if (name) localStorage.setItem(NAME_KEY, name); } catch {}
  }, [name]);

  const ready = open && consent && name.trim().length > 0;

  function addFiles(list, message = false) {
    const items = Array.from(list || []).map((file) => ({
      id: Math.random().toString(36).slice(2),
      file, message, status: "queued", pct: 0, error: "",
    }));
    if (items.length) setQueue((q) => [...q, ...items]);
  }

  function patch(id, changes) {
    setQueue((q) => q.map((it) => (it.id === id ? { ...it, ...changes } : it)));
  }

  async function sendAll() {
    if (!ready || busy) return;
    const pending = queue.filter((it) => it.status === "queued" || it.status === "failed");
    if (!pending.length) return;
    setBusy(true);
    setError("");
    try {
      for (let i = 0; i < pending.length; i += BATCH) {
        const batch = pending.slice(i, i + BATCH);
        const signed = await api({
          action: "sign", slug, consent: true, guestName: name.trim(),
          files: batch.map((it) => ({
            filename: it.file.name || (it.message ? "message.webm" : "upload"),
            contentType: it.file.type || guessType(it.file.name),
            bytes: it.file.size, message: it.message,
          })),
        });
        const recorded = [];
        let cursor = 0;
        const worker = async () => {
          while (cursor < batch.length) {
            const idx = cursor++;
            const it = batch[idx];
            const s = signed.urls[idx];
            patch(it.id, { status: "uploading", pct: 0 });
            try {
              let dims = null;
              if (s.kind === "photo" && s.web) {
                const web = await webVersion(it.file);
                if (web) {
                  dims = web;
                  await putWithRetry(s.web.url, web.blob, "image/jpeg");
                }
              }
              await putWithRetry(s.url, it.file, s.contentType, (p) => patch(it.id, { pct: Math.round(p * 100) }));
              recorded.push({
                id: s.id, filename: s.filename, key: s.key, kind: s.kind, contentType: s.contentType,
                webKey: dims && s.web ? s.web.key : null, width: dims?.width, height: dims?.height,
              });
              recorded[recorded.length - 1].itemId = it.id;
              patch(it.id, { status: "uploading", pct: 100 });
            } catch (err) {
              patch(it.id, { status: "failed", error: err.message || "Upload failed" });
            }
          }
        };
        await Promise.all(Array.from({ length: CONCURRENCY }, worker));
        if (recorded.length) {
          // Only "Sent ✓" once the server has written the rows — otherwise a
          // dropped record call would show success for files the couple never sees.
          try {
            const r = await api({ action: "record", slug, guestName: name.trim(), items: recorded.map(({ itemId, ...rest }) => rest) });
            setSent((n) => n + (r.recorded || 0));
            for (const rec of recorded) patch(rec.itemId, { status: "done", pct: 100 });
          } catch (err) {
            for (const rec of recorded) patch(rec.itemId, { status: "failed", error: "Didn't save — tap Send again" });
            throw err;
          }
        }
      }
    } catch (err) {
      setError(err.message || "Something went wrong — try again");
    } finally {
      setBusy(false);
    }
  }

  // ── 60-second video message ──
  async function startRecording() {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 } }, audio: true });
      const mime = ["video/mp4", "video/webm;codecs=vp9,opus", "video/webm"].find((m) => window.MediaRecorder?.isTypeSupported?.(m)) || "";
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      const chunks = [];
      recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const type = recorder.mimeType || mime || "video/webm";
        const blob = new Blob(chunks, { type });
        const ext = type.includes("mp4") ? "mp4" : "webm";
        const file = new File([blob], `message-${Date.now()}.${ext}`, { type });
        setRec((r) => ({ ...r, recorder: null, stream: null, preview: URL.createObjectURL(blob), file }));
      };
      setRec({ stream, recorder, chunks, seconds: 0, preview: null, file: null });
      recorder.start(1000);
      const startedAt = Date.now();
      const tick = setInterval(() => {
        const s = Math.floor((Date.now() - startedAt) / 1000);
        setRec((r) => (r ? { ...r, seconds: s } : r));
        if (s >= MESSAGE_SECONDS) { clearInterval(tick); if (recorder.state !== "inactive") recorder.stop(); }
        if (recorder.state === "inactive") clearInterval(tick);
      }, 250);
    } catch (err) {
      setError("Couldn't open the camera — you can still upload a video from your camera roll.");
    }
  }
  useEffect(() => {
    if (rec?.stream && videoRef.current) videoRef.current.srcObject = rec.stream;
  }, [rec?.stream]);

  const total = queue.length;
  const doneCount = queue.filter((it) => it.status === "done").length;
  const failed = queue.filter((it) => it.status === "failed").length;
  const pendingBytes = queue.filter((it) => it.status !== "done").reduce((n, it) => n + it.file.size, 0);

  const hasPending = total > 0 && doneCount < total;

  if (!open) {
    return (
      <div className="sh-closed">
        <p className="cx-kick">Closed</p>
        <h2 className="cx-h3">Uploads have closed for {title}.</h2>
        <p>Thanks for sharing your photos — the couple has everything now.</p>
      </div>
    );
  }

  return (
    <div className="sh-up">
      <div className="cx-field">
        <label className="cx-label" htmlFor="g-name">Your name</label>
        <input id="g-name" className="cx-input sh-up-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="So they know who to thank" autoComplete="name" maxLength={60} />
      </div>
      <label className="cx-check sh-up-consent">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>I took these (or have the okay to share them), and I&apos;m giving them to the couple and Roth Media to keep, share, and use in their photos and films. <a href="/terms" target="_blank" rel="noreferrer">Terms</a></span>
      </label>

      <div className="sh-up-actions">
        <button type="button" className={"cx-btn cx-btn--xl cx-btn--block " + (hasPending ? "cx-btn--ghost" : "cx-btn--light")} disabled={!ready || busy} onClick={() => fileRef.current?.click()}>
          + Add photos &amp; videos
        </button>
        <button type="button" className="cx-btn cx-btn--ghost cx-btn--lg cx-btn--block" disabled={!ready || busy || Boolean(rec)} onClick={startRecording}>
          <span className="sh-rec-dot" aria-hidden="true" /> Record a 60-second message
        </button>
        <input ref={fileRef} type="file" accept="image/*,video/*" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
      </div>
      {!ready && <p className="cx-help sh-up-help">Add your name and tick the box to unlock uploads.</p>}

      {rec && (
        <div className="sh-rec">
          {rec.stream ? (
            <>
              <video ref={videoRef} autoPlay muted playsInline className="sh-rec-video" />
              <div className="sh-rec-bar">
                <span className="sh-rec-left"><span className="sh-rec-dot is-live" aria-hidden="true" /> {Math.max(0, MESSAGE_SECONDS - rec.seconds)}s left</span>
                <button type="button" className="cx-btn cx-btn--light" onClick={() => rec.recorder?.state !== "inactive" && rec.recorder?.stop()}>Stop</button>
              </div>
            </>
          ) : (
            <>
              <video src={rec.preview} controls playsInline className="sh-rec-video" />
              <div className="sh-rec-bar">
                <button type="button" className="cx-btn cx-btn--light" onClick={() => { addFiles([rec.file], true); URL.revokeObjectURL(rec.preview); setRec(null); }}>Use this one</button>
                <button type="button" className="cx-btn cx-btn--ghost" onClick={() => { URL.revokeObjectURL(rec.preview); setRec(null); }}>Redo</button>
              </div>
            </>
          )}
        </div>
      )}

      {total > 0 && (
        <div className="sh-queue">
          <p className="cx-kick sh-queue-kick">Your uploads <span>{doneCount}/{total}</span></p>
          <ul>
            {queue.map((it) => (
              <li key={it.id} className={`sh-item is-${it.status}`}>
                <span className="sh-item-name">{it.message ? "Video message" : it.file.name}</span>
                <span className="sh-item-meta">
                  {it.status === "uploading" ? `${it.pct}%` : it.status === "done" ? "Sent ✓" : it.status === "failed" ? `Failed — ${it.error}` : fmtBytes(it.file.size)}
                </span>
                {it.status === "uploading" && <span className="sh-item-bar" style={{ width: `${it.pct}%` }} />}
              </li>
            ))}
          </ul>
          {doneCount < total && (
            <div className="sh-send">
              <button type="button" className="cx-btn cx-btn--light cx-btn--xl cx-btn--block" disabled={!ready || busy} onClick={sendAll}>
                {busy ? `Sending… ${doneCount}/${total}` : `Send ${total - doneCount} ${total - doneCount === 1 ? "file" : "files"} (${fmtBytes(pendingBytes)})`}
              </button>
            </div>
          )}
          {busy && <p className="cx-help">Keep this page open until it says done. Big videos take a minute on venue Wi-Fi.</p>}
          {!busy && doneCount === total && (
            <p className="cx-success sh-thanks" role="status">All {sent} sent. Thank you, {name.trim().split(/\s+/)[0]}! Add more anytime{closesAt ? ` until ${closesAt}` : ""}.</p>
          )}
          {!busy && failed > 0 && <p className="cx-error" role="alert">{failed} didn&apos;t make it — tap Send again to retry.</p>}
        </div>
      )}
      {error && <p className="cx-error" role="alert">{error}</p>}
    </div>
  );
}
