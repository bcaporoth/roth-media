"use client";

import { useState } from "react";

// Per-gallery cover chooser for Studio Admin. Pick any photo already in the
// album, or upload a custom image (resized to web/thumb in the browser and
// PUT straight to R2 via presigned URLs — same pipeline as AdminUploader).

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

async function resizeToJpeg(file, maxDim, quality) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d").drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return new Promise((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality)
  );
}

export default function CoverPicker({ galleryId, cover }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState(null);
  const [current, setCurrent] = useState(cover || null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function openPicker() {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    setMsg("");
    if (items === null) {
      setLoading(true);
      try {
        const j = await api({ action: "list-media", galleryId });
        setItems(j.items || []);
        setCurrent(j.cover || null);
      } catch (e) {
        setMsg(e.message);
        setItems([]);
      } finally {
        setLoading(false);
      }
    }
  }

  async function choose(coverName) {
    setBusy(true);
    setMsg("");
    try {
      const j = await api({ action: "set-cover", galleryId, coverFilename: coverName });
      setCurrent(j.cover);
      setMsg("Cover updated ✓");
    } catch (e) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function uploadCustom(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setMsg("Uploading cover…");
    try {
      const name = `custom-cover-${Date.now()}.jpg`;
      const [web, thumb] = await Promise.all([
        resizeToJpeg(file, 2200, 0.82),
        resizeToJpeg(file, 900, 0.78),
      ]);
      const signed = await api({
        action: "sign",
        galleryId,
        files: [
          { size: "web", filename: name, contentType: "image/jpeg" },
          { size: "thumb", filename: name, contentType: "image/jpeg" },
        ],
      });
      const bySize = Object.fromEntries(signed.urls.map((u) => [u.size, u]));
      const puts = await Promise.all([
        fetch(bySize.web.url, { method: "PUT", body: web }),
        fetch(bySize.thumb.url, { method: "PUT", body: thumb }),
      ]);
      if (puts.some((p) => !p.ok)) throw new Error("Upload failed");
      await choose(name);
    } catch (err) {
      setMsg(err.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  const photos = (items || []).filter((i) => i.kind === "photo" && i.thumbUrl);

  return (
    <div className="cover-picker">
      <button type="button" className="cover-picker-toggle" onClick={openPicker}>
        {open ? "Close" : "Set cover"}
      </button>
      {open && (
        <div className="cover-picker-panel">
          {loading && <p className="cover-picker-hint">Loading photos…</p>}
          {!loading && photos.length > 0 && (
            <div className="cover-picker-grid">
              {photos.map((p) => (
                <button
                  key={p.filename}
                  type="button"
                  disabled={busy}
                  className={
                    "cover-picker-thumb" +
                    (current === p.coverName ? " is-current" : "")
                  }
                  onClick={() => choose(p.coverName)}
                  title={p.filename}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.thumbUrl} alt={p.filename} loading="lazy" />
                </button>
              ))}
            </div>
          )}
          {!loading && photos.length === 0 && (
            <p className="cover-picker-hint">
              No photos in this album — upload a custom cover below.
            </p>
          )}
          <label className="cover-picker-upload">
            {busy ? "Working…" : "Upload custom cover…"}
            <input
              type="file"
              accept="image/*"
              onChange={uploadCustom}
              disabled={busy}
              hidden
            />
          </label>
          {msg && <p className="cover-picker-hint" role="status">{msg}</p>}
        </div>
      )}
    </div>
  );
}
