"use client";

import { useState, useRef, useEffect, useCallback } from "react";

// Browser-based gallery uploader, rebuilt for full wedding albums.
//
// What changed vs. the first version, and why:
//  - Photos are decoded straight to the target size via createImageBitmap's
//    resize options instead of allocating a full-resolution bitmap. A 33MP
//    Sony file used to need a ~131MB canvas per photo; Safari's canvas area
//    cap (~16.7MP) rejected it outright and Chrome just ate the memory.
//  - Uploads run CONCURRENCY-wide instead of strictly one at a time.
//  - Every PUT retries with backoff; a photo that still fails is recorded and
//    SKIPPED rather than killing the whole run.
//  - Progress, failures and a resume token survive a dead tab: re-pick the same
//    folder and it continues where it stopped instead of starting over.
//  - A run that uploads nothing cleans up its own empty gallery row.

const PHOTO_EXT = /\.(jpe?g|png|webp)$/i;
const VIDEO_EXT = /\.(mp4|mov|m4v|webm)$/i;
const CONCURRENCY = 4;
const MAX_ATTEMPTS = 4;
const RESUME_KEY = "rm-upload-resume";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function jpgName(f) {
  return f.replace(/\.[^.]+$/, "") + ".jpg";
}

// Folder mode: the picked folder's SUBFOLDERS become album sections.
// "Album/02 Ceremony/IMG_1.jpg" → section "Ceremony" (leading numbers are
// sort order, not display). Files sitting directly in the picked folder
// get no section.
function relPath(file) {
  return file.webkitRelativePath || file.name;
}

function sectionOf(file) {
  const parts = relPath(file).split("/");
  if (parts.length < 3) return null;
  const raw = parts[parts.length - 2].trim();
  const clean = raw.replace(/^\d+[\s._-]*/, "").trim();
  return (clean || raw).slice(0, 80) || null;
}

function fmtBytes(n) {
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(0)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

function fmtDuration(ms) {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

// Read pixel dimensions without decoding the image. Lets us compute the target
// size up front so the browser only ever materialises the small version.
async function imageSize(file) {
  if (/\.jpe?g$/i.test(file.name)) {
    try {
      const buf = await file.slice(0, 256 * 1024).arrayBuffer();
      const view = new DataView(buf);
      if (view.getUint16(0) === 0xffd8) {
        let off = 2;
        while (off + 9 < view.byteLength) {
          if (view.getUint8(off) !== 0xff) {
            off += 1;
            continue;
          }
          const marker = view.getUint8(off + 1);
          if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
            off += 2;
            continue;
          }
          const len = view.getUint16(off + 2);
          const isSOF =
            marker >= 0xc0 &&
            marker <= 0xcf &&
            marker !== 0xc4 &&
            marker !== 0xc8 &&
            marker !== 0xcc;
          if (isSOF) {
            return { width: view.getUint16(off + 7), height: view.getUint16(off + 5) };
          }
          if (len < 2) break;
          off += 2 + len;
        }
      }
    } catch {
      // fall through to the DOM route
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Could not read this image"));
      el.src = url;
    });
    return { width: img.naturalWidth, height: img.naturalHeight };
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function shrink(file, size, maxDim, quality) {
  const scale = Math.min(1, maxDim / Math.max(size.width, size.height));
  const w = Math.max(1, Math.round(size.width * scale));
  const h = Math.max(1, Math.round(size.height * scale));

  let bitmap;
  try {
    bitmap = await createImageBitmap(file, {
      resizeWidth: w,
      resizeHeight: h,
      resizeQuality: "high",
      imageOrientation: "from-image",
    });
  } catch {
    // Older browsers ignore/reject the resize options — take the slow path.
    bitmap = await createImageBitmap(file);
  }

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Browser refused a drawing canvas");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  // Free the backing store immediately rather than waiting on GC.
  canvas.width = 0;
  canvas.height = 0;
  if (!blob) throw new Error("Browser could not resize this photo");
  return blob;
}

async function api(payload) {
  const res = await fetch("/api/admin/gallery", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
  return json;
}

async function apiWithRetry(payload) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await api(payload);
    } catch (err) {
      if (attempt >= MAX_ATTEMPTS) throw err;
      await sleep(attempt * 1500);
    }
  }
}

async function putWithRetry(url, body, onRetry) {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { method: "PUT", body });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return;
    } catch (err) {
      if (attempt >= MAX_ATTEMPTS) throw err;
      onRetry?.(attempt);
      await sleep(attempt * 1500);
    }
  }
}

export default function AdminUploader() {
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState("");
  const [progress, setProgress] = useState(null); // {done,total,bytes,totalBytes,startedAt,note}
  const [failures, setFailures] = useState([]);
  const [done, setDone] = useState(null);
  const [error, setError] = useState("");
  const [resume, setResume] = useState(null);
  const [folderMode, setFolderMode] = useState(false);

  const cancelRef = useRef(false);
  const wakeLockRef = useRef(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(RESUME_KEY);
      if (raw) setResume(JSON.parse(raw));
    } catch {
      /* ignore unreadable resume state */
    }
  }, []);

  // Don't let a stray tab-close silently kill a long album.
  useEffect(() => {
    if (!busy) return undefined;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = "";
      return "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [busy]);

  const saveResume = useCallback((state) => {
    try {
      window.localStorage.setItem(RESUME_KEY, JSON.stringify(state));
    } catch {
      /* storage full or blocked — resume is a nicety, not a requirement */
    }
  }, []);

  const clearResume = useCallback(() => {
    try {
      window.localStorage.removeItem(RESUME_KEY);
    } catch {
      /* ignore */
    }
    setResume(null);
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);

    const all = [...data.getAll("files")].filter(
      (f) => f && f.size > 0 && (PHOTO_EXT.test(f.name) || VIDEO_EXT.test(f.name))
    );
    if (all.length === 0) {
      setError("Pick at least one photo or video.");
      return;
    }
    // Folder mode: sorting by relative path keeps each subfolder's photos
    // together and orders sections by folder name (01 …, 02 …).
    all.sort((a, b) => relPath(a).localeCompare(relPath(b), undefined, { numeric: true }));

    const title = String(data.get("title") || "").trim();
    const resuming =
      resume && resume.title && title && resume.title === title ? resume : null;
    const alreadyDone = new Set(resuming?.doneNames || []);
    const files = all.filter((f) => !alreadyDone.has(f.name));

    if (resuming && files.length === 0) {
      setError("Every photo in this folder is already uploaded for that album.");
      return;
    }

    cancelRef.current = false;
    setBusy(true);
    setError("");
    setDone(null);
    setFailures([]);

    // Keep the machine awake; a sleeping laptop is the #1 killer of long runs.
    try {
      wakeLockRef.current = await navigator.wakeLock?.request("screen");
    } catch {
      /* not supported / denied — carry on */
    }

    const totalBytes = files.reduce((n, f) => n + f.size, 0);
    const startedAt = Date.now();
    let galleryId = resuming?.galleryId || null;
    let shareToken = resuming?.shareToken || null;

    try {
      if (!galleryId) {
        setStage("Creating the album…");
        const created = await apiWithRetry({
          action: "create",
          title,
          clientEmail: data.get("clientEmail"),
          clientName: data.get("clientName"),
          eventDate: data.get("eventDate") || null,
        });
        galleryId = created.galleryId;
        shareToken = created.shareToken;
      } else {
        setStage("Picking up where the last run stopped…");
      }

      const results = new Array(files.length).fill(null);
      const localFailures = [];
      const doneNames = [...alreadyDone];
      let completed = 0;
      let bytesDone = 0;

      const bump = (note) => {
        setProgress({
          done: completed,
          total: files.length,
          bytes: bytesDone,
          totalBytes,
          startedAt,
          note: note || "",
          alreadyDone: alreadyDone.size,
        });
      };
      bump();

      const handleOne = async (file, i) => {
        const isVideo = VIDEO_EXT.test(file.name);
        const safe = file.name.replace(/[^\w.\- ]/g, "_");

        if (isVideo) {
          const signed = await apiWithRetry({
            action: "sign",
            galleryId,
            files: [
              {
                size: "orig",
                filename: file.name,
                contentType: file.type || "video/mp4",
              },
            ],
          });
          await putWithRetry(signed.urls[0].url, file, () => bump(`retrying ${file.name}`));
          results[i] = { filename: safe, kind: "video", section: sectionOf(file) };
        } else {
          const size = await imageSize(file);
          const [web, thumb] = [
            await shrink(file, size, 2200, 0.82),
            await shrink(file, size, 900, 0.78),
          ];
          const signed = await apiWithRetry({
            action: "sign",
            galleryId,
            files: [
              { size: "orig", filename: file.name, contentType: file.type || "image/jpeg" },
              { size: "web", filename: jpgName(file.name), contentType: "image/jpeg" },
              { size: "thumb", filename: jpgName(file.name), contentType: "image/jpeg" },
            ],
          });
          const bySize = Object.fromEntries(signed.urls.map((u) => [u.size, u]));
          await Promise.all([
            putWithRetry(bySize.orig.url, file, () => bump(`retrying ${file.name}`)),
            putWithRetry(bySize.web.url, web, () => bump(`retrying ${file.name}`)),
            putWithRetry(bySize.thumb.url, thumb, () => bump(`retrying ${file.name}`)),
          ]);
          results[i] = { filename: safe, kind: "photo", section: sectionOf(file) };
        }
      };

      let cursor = 0;
      const worker = async () => {
        while (cursor < files.length) {
          if (cancelRef.current) return;
          const i = cursor++;
          const file = files[i];
          try {
            await handleOne(file, i);
            doneNames.push(file.name);
          } catch (err) {
            // One bad photo must not cost the other 276.
            localFailures.push({ name: file.name, reason: err.message || "upload failed" });
            setFailures([...localFailures]);
          }
          completed += 1;
          bytesDone += file.size;
          bump();
          if (completed % 5 === 0) {
            saveResume({ galleryId, shareToken, title, doneNames });
          }
        }
      };

      setStage("Uploading");
      await Promise.all(Array.from({ length: CONCURRENCY }, worker));

      // Rebuild the full album in filename order. On a resumed run the photos
      // from the earlier attempt are already in R2 but have no media row yet —
      // they have to be re-listed here or they'd be missing from the gallery.
      const uploadedNow = new Map();
      results.forEach((r, i) => {
        if (r) uploadedNow.set(files[i].name, r);
      });
      const media = all
        .filter((f) => uploadedNow.has(f.name) || alreadyDone.has(f.name))
        .map(
          (f) =>
            uploadedNow.get(f.name) || {
              filename: f.name.replace(/[^\w.\- ]/g, "_"),
              kind: VIDEO_EXT.test(f.name) ? "video" : "photo",
              section: sectionOf(f),
            }
        );

      if (media.length === 0) {
        // Nothing landed — don't leave a ghost album in the dashboard.
        setStage("Cleaning up…");
        await api({ action: "discard", galleryId }).catch(() => {});
        clearResume();
        throw new Error(
          localFailures[0]?.reason
            ? `Nothing uploaded. First error: ${localFailures[0].reason}`
            : "Nothing uploaded."
        );
      }

      if (cancelRef.current) {
        saveResume({ galleryId, shareToken, title, doneNames });
        setStage("");
        setError(
          `Stopped. ${doneNames.length} photos are safely up — re-pick the same folder with the same title to finish the rest.`
        );
        return;
      }

      setStage("Finishing up…");
      const coverFilename = media.find((m) => m.kind === "photo")
        ? jpgName(media.find((m) => m.kind === "photo").filename)
        : null;
      await apiWithRetry({ action: "finalize", galleryId, media, coverFilename });

      clearResume();
      setDone({
        galleryId,
        shareUrl: `${window.location.origin}/g/${shareToken}`,
        count: media.length,
        skipped: localFailures.length,
        elapsed: Date.now() - startedAt,
      });
      form.reset();
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      try {
        await wakeLockRef.current?.release();
      } catch {
        /* ignore */
      }
      wakeLockRef.current = null;
      setBusy(false);
      setStage("");
      setProgress(null);
    }
  }

  const pct =
    progress && progress.totalBytes
      ? Math.min(100, Math.round((progress.bytes / progress.totalBytes) * 100))
      : 0;
  const elapsed = progress ? Date.now() - progress.startedAt : 0;
  const eta =
    progress && progress.bytes > 0 && pct > 2
      ? fmtDuration((elapsed / progress.bytes) * (progress.totalBytes - progress.bytes))
      : null;

  return (
    <form className="quote-form admin-upload" onSubmit={handleSubmit}>
      {resume && !busy && !done && (
        <div className="rm-resume" role="status">
          <strong>Unfinished album:</strong> “{resume.title}” — {resume.doneNames?.length || 0}{" "}
          photos already uploaded. Pick the same folder and use the same title to finish it.
          <button type="button" className="rm-linkbtn" onClick={clearResume}>
            Forget this
          </button>
        </div>
      )}

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
          <input
            id="au-email"
            name="clientEmail"
            type="email"
            required
            placeholder="They sign in with this"
          />
        </div>
        <div>
          <label htmlFor="au-name">Client name</label>
          <input id="au-name" name="clientName" placeholder="Olivia Morgan" />
        </div>
      </div>
      <div>
        <label htmlFor="au-files">
          {folderMode ? "Album folder *" : "Photos & videos *"}
        </label>
        <input
          id="au-files"
          name="files"
          type="file"
          multiple
          accept={folderMode ? undefined : "image/*,video/mp4,video/quicktime,video/webm"}
          {...(folderMode ? { webkitdirectory: "", directory: "" } : {})}
        />
        <label className="au-foldermode">
          <input
            type="checkbox"
            checked={folderMode}
            onChange={(e) => setFolderMode(e.target.checked)}
          />
          <span>
            Upload a whole folder — subfolders become <strong>sections</strong> of
            the album (&ldquo;01 Getting Ready&rdquo;, &ldquo;02 Ceremony&rdquo;… numbers set the
            order and are hidden from clients).
          </span>
        </label>
      </div>

      <button type="submit" disabled={busy}>
        {busy ? "Uploading…" : "Create gallery →"}
      </button>

      {busy && (
        <button
          type="button"
          className="rm-linkbtn rm-stop"
          onClick={() => {
            cancelRef.current = true;
            setStage("Stopping after the photos in flight…");
          }}
        >
          Stop (keeps what's already uploaded)
        </button>
      )}

      {progress && (
        <div className="rm-progress" role="status" aria-live="polite">
          <div className="rm-bar">
            <span style={{ width: `${pct}%` }} />
          </div>
          <p className="rm-progress-line">
            {stage === "Uploading" ? (
              <>
                <strong>
                  {progress.done} of {progress.total}
                </strong>{" "}
                photos · {fmtBytes(progress.bytes)} of {fmtBytes(progress.totalBytes)}
                {eta ? ` · about ${eta} left` : ""}
                {progress.alreadyDone ? ` · ${progress.alreadyDone} carried over` : ""}
              </>
            ) : (
              stage
            )}
          </p>
          {progress.note && <p className="rm-progress-note">{progress.note}</p>}
        </div>
      )}

      {failures.length > 0 && (
        <div className="rm-failures" role="status">
          <strong>
            {failures.length} photo{failures.length === 1 ? "" : "s"} skipped
          </strong>{" "}
          — the rest are still uploading. Skipped: {failures.slice(0, 6).map((f) => f.name).join(", ")}
          {failures.length > 6 ? `, +${failures.length - 6} more` : ""}.
        </div>
      )}

      {error && (
        <p className="cform-error" role="alert">
          {error}
        </p>
      )}

      {done && (
        <div className="qmatch" role="status">
          <div className="qmatch-kick">Gallery live</div>
          <p className="qmatch-includes">
            {done.count} items uploaded in {fmtDuration(done.elapsed)}
            {done.skipped ? ` · ${done.skipped} skipped` : ""}. Share link (anyone can view, no
            login):
          </p>
          <p className="qmatch-includes">
            <a href={done.shareUrl}>{done.shareUrl}</a>
          </p>
          <p className="qmatch-fineprint">
            The client also sees it in their portal after signing in. Albums uploaded here don&apos;t
            include the one-click “download everything” zip — run the desktop script if this couple
            needs that.
          </p>
        </div>
      )}
    </form>
  );
}
