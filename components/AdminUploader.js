"use client";

import { useState } from "react";

// Browser-based gallery uploader. Photos are resized to web/thumb sizes
// with canvas, then everything is PUT directly to R2 via presigned URLs —
// no server bandwidth, works for phones and laptops. Big wedding albums
// (500+ photos) are still faster via the CLI script.

const PHOTO_EXT = /\.(jpe?g|png|webp)$/i;
const VIDEO_EXT = /\.(mp4|mov|m4v|webm)$/i;

function jpgName(f) {
  return f.replace(/\.[^.]+$/, "") + ".jpg";
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

export default function AdminUploader() {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [done, setDone] = useState(null);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const files = [...data.getAll("files")].filter(
      (f) => f && f.size > 0 && (PHOTO_EXT.test(f.name) || VIDEO_EXT.test(f.name))
    );
    if (files.length === 0) {
      setError("Pick at least one photo or video.");
      return;
    }
    setBusy(true);
    setError("");
    setDone(null);
    try {
      setProgress("Creating gallery…");
      const { galleryId, shareToken } = await api({
        action: "create",
        title: data.get("title"),
        clientEmail: data.get("clientEmail"),
        clientName: data.get("clientName"),
        eventDate: data.get("eventDate") || null,
      });

      files.sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true })
      );

      const media = [];
      let coverFilename = null;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const isVideo = VIDEO_EXT.test(file.name);
        setProgress(`Uploading ${i + 1} of ${files.length} — ${file.name}`);

        if (isVideo) {
          const [{ url }] = (
            await api({
              action: "sign",
              galleryId,
              files: [{ size: "orig", filename: file.name, contentType: file.type || "video/mp4" }],
            })
          ).urls;
          const put = await fetch(url, { method: "PUT", body: file });
          if (!put.ok) throw new Error(`Upload failed for ${file.name}`);
          media.push({ filename: file.name.replace(/[^\w.\- ]/g, "_"), kind: "video" });
        } else {
          const [web, thumb] = await Promise.all([
            resizeToJpeg(file, 2200, 0.82),
            resizeToJpeg(file, 900, 0.78),
          ]);
          const signed = await api({
            action: "sign",
            galleryId,
            files: [
              { size: "orig", filename: file.name, contentType: file.type || "image/jpeg" },
              { size: "web", filename: jpgName(file.name), contentType: "image/jpeg" },
              { size: "thumb", filename: jpgName(file.name), contentType: "image/jpeg" },
            ],
          });
          const bySize = Object.fromEntries(signed.urls.map((u) => [u.size, u]));
          const puts = await Promise.all([
            fetch(bySize.orig.url, { method: "PUT", body: file }),
            fetch(bySize.web.url, { method: "PUT", body: web }),
            fetch(bySize.thumb.url, { method: "PUT", body: thumb }),
          ]);
          if (puts.some((p) => !p.ok)) throw new Error(`Upload failed for ${file.name}`);
          const safe = file.name.replace(/[^\w.\- ]/g, "_");
          media.push({ filename: safe, kind: "photo" });
          if (!coverFilename) coverFilename = jpgName(safe);
        }
      }

      setProgress("Finishing up…");
      await api({ action: "finalize", galleryId, media, coverFilename });
      setDone({
        galleryId,
        shareUrl: `${window.location.origin}/g/${shareToken}`,
        count: media.length,
      });
      form.reset();
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setBusy(false);
      setProgress("");
    }
  }

  return (
    <form className="quote-form admin-upload" onSubmit={handleSubmit}>
      <div className="row">
        <div>
          <label htmlFor="au-title">Gallery title *</label>
          <input id="au-title" name="title" required placeholder="Olivia Morgan Senior Photos" />
        </div>
        <div>
          <label htmlFor="au-date">Event date</label>
          <input id="au-date" name="eventDate" type="date" />
        </div>
      </div>
      <div className="row">
        <div>
          <label htmlFor="au-email">Client email *</label>
          <input id="au-email" name="clientEmail" type="email" required placeholder="They sign in with this" />
        </div>
        <div>
          <label htmlFor="au-name">Client name</label>
          <input id="au-name" name="clientName" placeholder="Olivia Morgan" />
        </div>
      </div>
      <div>
        <label htmlFor="au-files">Photos &amp; videos *</label>
        <input id="au-files" name="files" type="file" multiple accept="image/*,video/mp4,video/quicktime,video/webm" />
      </div>
      <button type="submit" disabled={busy}>
        {busy ? "Uploading…" : "Create gallery →"}
      </button>
      {progress && <p className="quote-hint" role="status">{progress}</p>}
      {error && <p className="cform-error" role="alert">{error}</p>}
      {done && (
        <div className="qmatch" role="status">
          <div className="qmatch-kick">Gallery live</div>
          <p className="qmatch-includes">
            {done.count} items uploaded. Share link (anyone can view, no
            login):
          </p>
          <p className="qmatch-includes">
            <a href={done.shareUrl}>{done.shareUrl}</a>
          </p>
          <p className="qmatch-fineprint">
            The client also sees it in their portal after signing in. Big
            wedding albums (500+ files) upload faster with the desktop
            script — and that route also builds the download-all zip.
          </p>
        </div>
      )}
    </form>
  );
}
