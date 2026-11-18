"use client";

// Guest Reel → what guests sent for one gallery (download / remove junk).
// The on/off switch and the links live in GuestReelSwitch.js.

import { useEffect, useState } from "react";
import TypedConfirm from "./TypedConfirm";

async function api(payload) {
  const res = await fetch("/api/admin/guest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
  return json;
}

const fmtBytes = (n) => (n >= 1e9 ? `${(n / 1e9).toFixed(1)} GB` : `${Math.round(n / 1e6)} MB`);
const fmtSize = (n) => (n >= 1e6 ? fmtBytes(n) : `${Math.max(1, Math.round(n / 1e3))} KB`);
const KIND_LABEL = { photo: "Photo", video: "Video", message: "Video message" };

// What guests sent for one event: a thumbnail list with Download, and Remove
// for the junk (tick the ones to go, then type "remove" once).
export function GuestUploads({ event, onChanged }) {
  const [uploads, setUploads] = useState(null);
  const [picked, setPicked] = useState(() => new Set());
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function load() {
    try {
      const r = await api({ action: "list-uploads", eventId: event.id });
      setUploads(r.uploads || []);
    } catch (err) {
      setMsg(err.message);
      setUploads([]);
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.id]);

  function toggle(id) {
    setPicked((p) => {
      const next = new Set(p);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setConfirming(false);
    setMsg("");
  }

  async function download(u) {
    setMsg("");
    try {
      const r = await api({ action: "download-url", uploadId: u.id });
      const a = document.createElement("a");
      a.href = r.url;
      a.download = u.filename || "";
      a.rel = "noreferrer";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      setMsg(err.message);
    }
  }

  async function removePicked() {
    setBusy(true);
    setMsg("");
    let removed = 0;
    let failed = 0;
    for (const id of picked) {
      try {
        await api({ action: "delete-upload", uploadId: id });
        removed += 1;
      } catch {
        failed += 1;
      }
    }
    setPicked(new Set());
    setConfirming(false);
    await load();
    setMsg(
      `Removed ${removed} upload${removed === 1 ? "" : "s"} ✓` +
        (failed ? ` · ${failed} couldn't be removed — try again` : "")
    );
    setBusy(false);
    onChanged?.();
  }

  if (uploads === null) return <p className="gcard-meta">Loading uploads…</p>;
  if (uploads.length === 0)
    return <p className="gcard-meta">{msg || "Nothing from guests yet."}</p>;
  const n = picked.size;

  return (
    <div className="gmod">
      <ul className="gmod-list">
        {uploads.map((u) => {
          const on = picked.has(u.id);
          return (
            <li key={u.id} className={"gmod-row" + (on ? " is-on" : "")}>
              <span className="gmod-thumb">
                {u.thumbUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={u.thumbUrl} alt="" loading="lazy" />
                ) : (
                  <span aria-hidden="true">▶</span>
                )}
              </span>
              <span className="gmod-main">
                <strong>{u.guestName || "No name given"}</strong>
                <span className="gcard-meta">
                  {KIND_LABEL[u.kind] || u.kind} · {fmtSize(u.bytes)} · {fmtLocal(u.createdAt)}
                </span>
              </span>
              <span className="gmod-actions">
                <button type="button" className="achip" onClick={() => download(u)} disabled={busy}>
                  Download
                </button>
                <button
                  type="button"
                  className={"achip achip-danger" + (on ? " is-on" : "")}
                  aria-pressed={on}
                  onClick={() => toggle(u.id)}
                  disabled={busy}
                >
                  {on ? "Marked ✓" : "Remove"}
                </button>
              </span>
            </li>
          );
        })}
      </ul>
      {n > 0 &&
        (confirming ? (
          <TypedConfirm
            phrase="remove"
            prompt={`Type “remove” to delete ${n} guest upload${n === 1 ? "" : "s"} from “${event.title}” for good.`}
            cta={`Remove ${n} upload${n === 1 ? "" : "s"}`}
            busy={busy}
            onConfirm={removePicked}
            onCancel={() => setConfirming(false)}
          />
        ) : (
          <div className="gmod-bar">
            <button type="button" className="abtn" onClick={() => setConfirming(true)}>
              Remove {n} marked…
            </button>
            <button type="button" className="achip" onClick={() => setPicked(new Set())}>
              Keep them
            </button>
          </div>
        ))}
      {msg && <p className="gcard-meta gmod-msg" role="status">{msg}</p>}
    </div>
  );
}
