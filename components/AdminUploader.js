"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { allocateName, jpgName, safeName, stemKey } from "../lib/upload-names";

// Browser-based gallery uploader, rebuilt for full wedding galleries.
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
//
// Studio round 2:
//  - Stored names are unique per relative path (lib/upload-names.js): two
//    cameras' C0001.MP4 in different subfolders no longer overwrite each other,
//    and the resume record remembers each finished file by its path, with the
//    name it was stored under and its dimensions.
//  - Videos get a poster frame grabbed in the browser and uploaded to the thumb
//    key the viewers already read (fails soft when the codec won't decode).
//  - Pass `gallery` to add files to an existing gallery instead of creating one.

const PHOTO_EXT = /\.(jpe?g|png|webp)$/i;
const VIDEO_EXT = /\.(mp4|mov|m4v|webm)$/i;
const CONCURRENCY = 4;
const MAX_ATTEMPTS = 4;
const RESUME_KEY = "rm-upload-resume";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Folder mode: the picked folder's SUBFOLDERS become gallery sections.
// "Gallery/02 Ceremony/IMG_1.jpg" → section "Ceremony" (leading numbers are
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

// One frame of a video as a JPEG, grabbed with a <video> + canvas. Returns
// { web, thumb } blobs, or null when the browser can't decode the file
// (some HEVC / ProRes exports) — the upload carries on without a poster.
const POSTER_TIMEOUT = 20000;

function waitFor(el, events, ms) {
  return new Promise((resolve, reject) => {
    const off = () => {
      clearTimeout(timer);
      events.forEach((ev) => el.removeEventListener(ev, ok));
      el.removeEventListener("error", bad);
    };
    const ok = () => {
      off();
      resolve();
    };
    const bad = () => {
      off();
      reject(new Error("video could not be read"));
    };
    const timer = setTimeout(bad, ms);
    events.forEach((ev) => el.addEventListener(ev, ok));
    el.addEventListener("error", bad);
  });
}

function frameToJpeg(video, maxDim, quality) {
  const scale = Math.min(1, maxDim / Math.max(video.videoWidth, video.videoHeight));
  const w = Math.max(1, Math.round(video.videoWidth * scale));
  const h = Math.max(1, Math.round(video.videoHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.resolve(null);
  ctx.drawImage(video, 0, 0, w, h);
  return new Promise((resolve) =>
    canvas.toBlob(
      (blob) => {
        canvas.width = 0;
        canvas.height = 0;
        resolve(blob);
      },
      "image/jpeg",
      quality
    )
  );
}

async function videoPoster(file) {
  if (typeof document === "undefined") return null;
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  try {
    const meta = waitFor(video, ["loadedmetadata"], POSTER_TIMEOUT);
    video.src = url;
    await meta;
    // One second in (same as the desktop script), or the midpoint of a very
    // short clip. Seeking also makes iOS decode a frame without playing.
    const dur = Number.isFinite(video.duration) ? video.duration : 0;
    const at = dur > 0 ? Math.min(1, dur / 2) : 0;
    if (at > 0) {
      const seeked = waitFor(video, ["seeked"], POSTER_TIMEOUT);
      video.currentTime = at;
      await seeked;
    }
    if (video.readyState < 2) await waitFor(video, ["loadeddata", "canplay"], 5000);
    if (!video.videoWidth || !video.videoHeight) return null;
    const web = await frameToJpeg(video, 1920, 0.82);
    const thumb = await frameToJpeg(video, 900, 0.78);
    if (!web || !thumb) return null;
    return { web, thumb };
  } catch {
    return null;
  } finally {
    video.removeAttribute("src");
    try {
      video.load();
    } catch {
      /* ignore */
    }
    URL.revokeObjectURL(url);
  }
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

// Resume records: v2 remembers each finished file by relative path, with the
// name it was stored under and its size. Records written before that only
// have bare names — still honoured, once per name.
function readResume(key) {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const r = JSON.parse(raw);
    if (!r || !r.galleryId) return null;
    if (Array.isArray(r.done)) return r;
    return { ...r, done: (r.doneNames || []).map((n) => ({ p: null, n })) };
  } catch {
    return null;
  }
}

// `gallery` ({ id, title, shareToken }) switches the form to "add files to
// this gallery": no title/client fields, new files land after what's there.
export default function AdminUploader({ gallery = null, onDone = null }) {
  const append = Boolean(gallery && gallery.id);
  const resumeKey = append ? `${RESUME_KEY}:${gallery.id}` : RESUME_KEY;
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState("");
  const [progress, setProgress] = useState(null); // {done,total,bytes,totalBytes,startedAt,note}
  const [failures, setFailures] = useState([]);
  const [done, setDone] = useState(null);
  const [error, setError] = useState("");
  const [resume, setResume] = useState(null);
  const [folderMode, setFolderMode] = useState(false);
  // Client roster: pick a saved client or type a new one — new clients are
  // saved to the roster automatically when the gallery is created.
  const [clients, setClients] = useState([]);
  const [clientPick, setClientPick] = useState("new");
  const [clientEmail, setClientEmail] = useState("");
  const [clientName, setClientName] = useState("");

  const filesId = append ? `au-files-${gallery.id}` : "au-files";
  const cancelRef = useRef(false);
  const wakeLockRef = useRef(null);

  useEffect(() => {
    if (append) return;
    api({ action: "clients" })
      .then((r) => setClients(r.clients || []))
      .catch(() => {
        /* roster unavailable — typing still works */
      });
  }, [append]);

  const pickClient = (value) => {
    setClientPick(value);
    if (value === "new") {
      setClientEmail("");
      setClientName("");
      return;
    }
    const c = clients.find((x) => x.id === value);
    if (c) {
      setClientEmail(c.email);
      setClientName(c.name || "");
    }
  };

  useEffect(() => {
    setResume(readResume(resumeKey));
  }, [resumeKey]);

  // Don't let a stray tab-close silently kill a long gallery.
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
      window.localStorage.setItem(resumeKey, JSON.stringify(state));
    } catch {
      /* storage full or blocked — resume is a nicety, not a requirement */
    }
  }, [resumeKey]);

  const clearResume = useCallback(() => {
    try {
      window.localStorage.removeItem(resumeKey);
    } catch {
      /* ignore */
    }
    setResume(null);
  }, [resumeKey]);

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

    const title = append ? gallery.title : String(data.get("title") || "").trim();
    const resuming = append
      ? resume && resume.galleryId === gallery.id
        ? resume
        : null
      : resume && resume.title && title && resume.title === title
        ? resume
        : null;

    // What an earlier, unfinished run already put in storage. Matched by
    // relative path, so "Cam A/C0001.MP4" being done never skips
    // "Cam B/C0001.MP4". Old records only know bare names: one file per name.
    const doneByPath = new Map();
    const legacyByName = new Map();
    for (const d of resuming?.done || []) {
      if (d.p) doneByPath.set(d.p, d);
      else if (d.n) legacyByName.set(d.n, d);
    }
    const entryOf = new Map(); // File → { p, f, k, s, w, h, poster }
    for (const f of all) {
      const byPath = doneByPath.get(relPath(f));
      if (byPath && byPath.f) {
        entryOf.set(f, byPath);
      } else if (legacyByName.has(f.name)) {
        legacyByName.delete(f.name);
        entryOf.set(f, {
          p: relPath(f),
          f: safeName(f.name),
          k: VIDEO_EXT.test(f.name) ? "video" : "photo",
          s: sectionOf(f),
        });
      }
    }
    const carried = entryOf.size;
    const files = all.filter((f) => !entryOf.has(f));

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
    let galleryId = append ? gallery.id : resuming?.galleryId || null;
    let shareToken = append ? gallery.shareToken : resuming?.shareToken || null;

    try {
      if (!galleryId) {
        setStage("Creating the gallery…");
        const created = await apiWithRetry({
          action: "create",
          title,
          clientEmail: data.get("clientEmail"),
          clientName: data.get("clientName"),
          eventDate: data.get("eventDate") || null,
        });
        galleryId = created.galleryId;
        shareToken = created.shareToken;
      } else if (resuming) {
        setStage("Picking up where the last run stopped…");
      } else {
        setStage("Checking what's already in the gallery…");
      }

      // Names already used in this gallery must never be reused — a second
      // "film.mp4" would overwrite the first one in storage.
      const taken = new Set();
      if (append || resuming) {
        const have = await apiWithRetry({ action: "media-names", galleryId });
        for (const n of have.filenames || []) taken.add(stemKey(n));
      }
      for (const e of entryOf.values()) taken.add(stemKey(e.f));
      const names = files.map((f) => allocateName(relPath(f), taken));

      const localFailures = [];
      let completed = 0;
      let bytesDone = 0;
      let noPoster = 0;

      const resumeState = () => ({
        v: 2,
        galleryId,
        shareToken,
        title,
        done: [...entryOf.values()],
      });

      const bump = (note) => {
        setProgress({
          done: completed,
          total: files.length,
          bytes: bytesDone,
          totalBytes,
          startedAt,
          note: note || "",
          alreadyDone: carried,
        });
      };
      bump();

      const handleOne = async (file, i) => {
        const isVideo = VIDEO_EXT.test(file.name);
        const name = names[i];
        const retry = () => bump(`retrying ${file.name}`);

        if (isVideo) {
          const poster = await videoPoster(file);
          const wanted = [
            { size: "orig", filename: name, contentType: file.type || "video/mp4" },
          ];
          if (poster) {
            wanted.push({ size: "thumb", filename: jpgName(name), contentType: "image/jpeg" });
            wanted.push({ size: "web", filename: jpgName(name), contentType: "image/jpeg" });
          }
          const signed = await apiWithRetry({ action: "sign", galleryId, files: wanted });
          const bySize = Object.fromEntries(signed.urls.map((u) => [u.size, u]));
          await putWithRetry(bySize.orig.url, file, retry);
          let hasPoster = false;
          if (poster) {
            // A poster that won't upload must not cost the film itself.
            try {
              await Promise.all([
                putWithRetry(bySize.thumb.url, poster.thumb, retry),
                putWithRetry(bySize.web.url, poster.web, retry),
              ]);
              hasPoster = true;
            } catch {
              hasPoster = false;
            }
          }
          if (!hasPoster) noPoster += 1;
          return {
            p: relPath(file),
            f: bySize.orig.filename || name,
            k: "video",
            s: sectionOf(file),
            poster: hasPoster,
          };
        }

        const size = await imageSize(file);
        const [web, thumb] = [
          await shrink(file, size, 2200, 0.82),
          await shrink(file, size, 900, 0.78),
        ];
        const signed = await apiWithRetry({
          action: "sign",
          galleryId,
          files: [
            { size: "orig", filename: name, contentType: file.type || "image/jpeg" },
            { size: "web", filename: jpgName(name), contentType: "image/jpeg" },
            { size: "thumb", filename: jpgName(name), contentType: "image/jpeg" },
          ],
        });
        const bySize = Object.fromEntries(signed.urls.map((u) => [u.size, u]));
        await Promise.all([
          putWithRetry(bySize.orig.url, file, retry),
          putWithRetry(bySize.web.url, web, retry),
          putWithRetry(bySize.thumb.url, thumb, retry),
        ]);
        return {
          p: relPath(file),
          f: bySize.orig.filename || name,
          k: "photo",
          s: sectionOf(file),
          w: size.width,
          h: size.height,
        };
      };

      let cursor = 0;
      const worker = async () => {
        while (cursor < files.length) {
          if (cancelRef.current) return;
          const i = cursor++;
          const file = files[i];
          try {
            entryOf.set(file, await handleOne(file, i));
          } catch (err) {
            // One bad file must not cost the other 276.
            localFailures.push({ name: file.name, reason: err.message || "upload failed" });
            setFailures([...localFailures]);
          }
          completed += 1;
          bytesDone += file.size;
          bump();
          if (completed % 5 === 0) saveResume(resumeState());
        }
      };

      if (files.length > 0) {
        setStage("Uploading");
        await Promise.all(Array.from({ length: CONCURRENCY }, worker));
      }

      // The gallery in path order. Files from an earlier attempt are already in
      // R2 but may have no media row yet — they're re-listed here (with the
      // name and dimensions the resume record kept) or they'd be missing.
      const media = all
        .filter((f) => entryOf.has(f))
        .map((f) => {
          const e = entryOf.get(f);
          return {
            filename: e.f,
            kind: e.k,
            section: e.s || null,
            ...(e.w > 0 && e.h > 0 ? { width: e.w, height: e.h } : {}),
          };
        });

      if (media.length === 0) {
        // Nothing landed — don't leave a ghost gallery in the dashboard.
        // (Never discards a gallery that existed before this run.)
        if (!append) {
          setStage("Cleaning up…");
          await api({ action: "discard", galleryId }).catch(() => {});
        }
        clearResume();
        throw new Error(
          localFailures[0]?.reason
            ? `Nothing uploaded. First error: ${localFailures[0].reason}`
            : "Nothing uploaded."
        );
      }

      // From here on a dead tab or a failed finalize can be picked back up.
      saveResume(resumeState());
      setResume(resumeState());

      if (cancelRef.current) {
        setStage("");
        setError(
          append
            ? `Stopped. ${media.length} files are safely up — pick the same files again to finish the rest.`
            : `Stopped. ${media.length} files are safely up — re-pick the same folder with the same title to finish the rest.`
        );
        return;
      }

      setStage("Finishing up…");
      // Cover: the first photo; a film-only gallery uses its first poster frame.
      const firstPhoto = media.find((m) => m.kind === "photo");
      const firstPoster = [...entryOf.values()].find((e) => e.k === "video" && e.poster);
      const coverFilename = firstPhoto
        ? jpgName(firstPhoto.filename)
        : firstPoster
          ? jpgName(firstPoster.f)
          : null;
      const fin = await apiWithRetry({ action: "finalize", galleryId, media, coverFilename });

      clearResume();
      setDone({
        galleryId,
        shareUrl: `${window.location.origin}/g/${shareToken}`,
        count: append ? fin.added ?? files.length - localFailures.length : media.length,
        skipped: localFailures.length,
        noPoster,
        zipStale: Boolean(fin.zipStale),
        elapsed: Date.now() - startedAt,
      });
      form.reset();
      if (!append) {
        setClientPick("new");
        setClientEmail("");
        setClientName("");
        // The client just used may be new — refresh the roster.
        api({ action: "clients" })
          .then((r) => setClients(r.clients || []))
          .catch(() => {});
      }
      onDone?.({ galleryId, added: fin.added, count: fin.count });
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

  const resumeCount = resume?.done?.length || 0;

  return (
    <form className={"quote-form admin-upload" + (append ? " is-append" : "")} onSubmit={handleSubmit}>
      {resume && !busy && !done && (
        <div className="rm-resume" role="status">
          <strong>{append ? "Unfinished upload:" : "Unfinished gallery:"}</strong>{" "}
          {append ? "" : `“${resume.title}” — `}
          {resumeCount} file{resumeCount === 1 ? "" : "s"} already uploaded.{" "}
          {append
            ? "Pick the same files again to finish it."
            : "Pick the same folder and use the same title to finish it."}
          <button type="button" className="rm-linkbtn" onClick={clearResume}>
            Forget this
          </button>
        </div>
      )}

      {!append && (
        <>
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
          <div>
            <label htmlFor="au-client">Client *</label>
            <select
              id="au-client"
              value={clientPick}
              onChange={(e) => pickClient(e.target.value)}
            >
              <option value="new">+ New client…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name ? (/@no-email\.rothmediaco\.invalid$/.test(c.email) ? `${c.name} — no email yet` : `${c.name} — ${c.email}`) : c.email}
                </option>
              ))}
            </select>
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
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                readOnly={clientPick !== "new"}
              />
            </div>
            <div>
              <label htmlFor="au-name">Client name</label>
              <input
                id="au-name"
                name="clientName"
                placeholder="Olivia Morgan"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                readOnly={clientPick !== "new"}
              />
            </div>
          </div>
          {clientPick === "new" && clients.length > 0 && (
            <p className="au-client-hint">
              New clients are saved to your roster automatically — next time
              they&apos;ll be in the list above.
            </p>
          )}
        </>
      )}
      <div>
        <label htmlFor={filesId}>
          {folderMode ? (append ? "Folder *" : "Gallery folder *") : "Photos & videos *"}
        </label>
        <input
          id={filesId}
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
            the gallery (&ldquo;01 Getting Ready&rdquo;, &ldquo;02 Ceremony&rdquo;… numbers set the
            order and are hidden from clients).
          </span>
        </label>
        {append && (
          <p className="au-client-hint au-append-hint">
            New files go after what&apos;s already in the gallery — same gallery, same
            link. Nothing is ever overwritten: a file that shares a name with one
            already there is added next to it.
          </p>
        )}
      </div>

      <button type="submit" disabled={busy}>
        {busy ? "Uploading…" : append ? "Add to this gallery →" : "Create gallery →"}
      </button>

      {busy && (
        <button
          type="button"
          className="rm-linkbtn rm-stop"
          onClick={() => {
            cancelRef.current = true;
            setStage("Stopping after the files in flight…");
          }}
        >
          Stop (keeps what&apos;s already uploaded)
        </button>
      )}

      {busy && !progress && stage && (
        <p className="rm-progress-line" role="status">
          {stage}
        </p>
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
                files · {fmtBytes(progress.bytes)} of {fmtBytes(progress.totalBytes)}
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
            {failures.length} file{failures.length === 1 ? "" : "s"} skipped
          </strong>{" "}
          — {busy ? "the rest are still uploading" : "everything else went up"}. Skipped:{" "}
          {failures.slice(0, 6).map((f) => f.name).join(", ")}
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
          <div className="qmatch-kick">{append ? "Added to the gallery" : "Gallery live"}</div>
          <p className="qmatch-includes">
            {done.count} {done.count === 1 ? "file" : "files"} {append ? "added" : "uploaded"} in{" "}
            {fmtDuration(done.elapsed)}
            {done.skipped ? ` · ${done.skipped} skipped` : ""}.{" "}
            {append ? "Same share link as before:" : "Share link (anyone can view, no login):"}
          </p>
          <p className="qmatch-includes">
            <a href={done.shareUrl}>{done.shareUrl}</a>
          </p>
          {done.noPoster > 0 && (
            <p className="qmatch-fineprint">
              {done.noPoster} video{done.noPoster === 1 ? "" : "s"} went up without a preview
              frame — this browser couldn&apos;t read that format. The video itself plays
              fine; its tile just has no still.
            </p>
          )}
          {append ? (
            done.zipStale && (
              <p className="qmatch-fineprint">
                Heads up: this gallery&apos;s one-click “download everything” zip was built
                before these files, so it doesn&apos;t include them. Each new file still has
                its own download button.
              </p>
            )
          ) : (
            <p className="qmatch-fineprint">
              The client also sees it in their portal after signing in. Galleries uploaded here
              don&apos;t include the one-click “download everything” zip — run the desktop
              script if this couple needs that.
            </p>
          )}
        </div>
      )}
    </form>
  );
}
