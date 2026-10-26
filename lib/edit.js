// Sprint 4 — the edit room's shared vocabulary. Pure functions, no I/O:
// timecode math, SRT/VTT parsing, EDL / CSV / paper-cut builders.
export const CUT_STAGES = ["stringout", "assembly", "rough", "fine", "lock"];
export const CUT_STAGE_LABEL = { stringout: "Stringout", assembly: "Assembly", rough: "Rough cut", fine: "Fine cut", lock: "Picture lock" };
export const SELECT_KINDS = { bite: "Bite", broll: "B-roll", sound: "Sound", archival: "Archival" };
export const VERDICT_LABEL = { "": "—", accept: "Accept", reject: "Reject", park: "Park" };
export const TRANSCRIPT_STATUS_LABEL = { none: "No transcript", queued: "Queued", processing: "Transcribing…", done: "Transcript", error: "Transcribe failed" };

// Seconds → HH:MM:SS:FF at fps (non-drop). 23.976 is treated as 24 for frame math.
export function tc(seconds, fps = 23.976) {
  const f = Math.round(fps) || 24;
  const total = Math.max(0, Math.round((Number(seconds) || 0) * f));
  const fr = total % f; const s = Math.floor(total / f) % 60; const m = Math.floor(total / f / 60) % 60; const h = Math.floor(total / f / 3600);
  return [h, m, s, fr].map((n) => String(n).padStart(2, "0")).join(":");
}
export function tcToSeconds(str, fps = 23.976) {
  const f = Math.round(fps) || 24;
  const p = String(str || "").trim().split(/[:;]/).map(Number);
  if (p.length !== 4 || p.some(isNaN)) return 0;
  return p[0] * 3600 + p[1] * 60 + p[2] + p[3] / f;
}
export const mmss = (s) => { const n = Math.max(0, Math.floor(Number(s) || 0)); return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`; };
export const hms = (s) => { const n = Math.max(0, Math.floor(Number(s) || 0)); const h = Math.floor(n / 3600); return h ? `${h}:${String(Math.floor((n % 3600) / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}` : mmss(n); };
export const gb = (bytes) => (bytes ? `${(bytes / 1e9).toFixed(bytes > 1e10 ? 0 : 1)} GB` : "");

// Filename → convention bits. Roll naming is {PROJ}_{YYMMDD}_{CAM}{CARD}_R{roll};
// camera-native names (C0012.MP4, A001_C003_...) still give a camera letter.
export function parseName(filename) {
  const stem = String(filename || "").replace(/\.[^.]+$/, "");
  const m = /^([A-Z0-9]{2,8})_(\d{6})_([A-Z])(\d{2})_R(\d{2})/i.exec(stem);
  if (m) return { stem, code: m[1].toUpperCase(), ymd: `20${m[2].slice(0, 2)}-${m[2].slice(2, 4)}-${m[2].slice(4, 6)}`, camera: m[3].toUpperCase(), card: `${m[3]}${m[4]}`.toUpperCase(), roll: `${m[1]}_${m[2]}_${m[3]}${m[4]}_R${m[5]}`.toUpperCase() };
  const a = /^([A-Z])\d{3}_C\d{3}/i.exec(stem);
  return { stem, code: "", ymd: "", camera: a ? a[1].toUpperCase() : "", card: "", roll: "" };
}

// SRT / VTT → { segments:[{s,e,text}], words:[{w,s,e}], text }.
// Words inside a segment get linearly spread timings — close enough to seek.
export function parseSubs(raw) {
  const t = String(raw || "").replace(/\r/g, "");
  const time = (x) => { const m = /(\d+):(\d{2}):(\d{2})[.,](\d{1,3})/.exec(x) || /(\d{2}):(\d{2})[.,](\d{1,3})/.exec(x); if (!m) return null; return m.length === 5 ? +m[1] * 3600 + +m[2] * 60 + +m[3] + +m[4].padEnd(3, "0") / 1000 : +m[1] * 60 + +m[2] + +m[3].padEnd(3, "0") / 1000; };
  const segments = [];
  for (const block of t.split(/\n\s*\n/)) {
    const lines = block.split("\n").filter((l) => l.trim());
    const ti = lines.findIndex((l) => l.includes("-->"));
    if (ti < 0) continue;
    const [a, b] = lines[ti].split("-->");
    const s = time(a); const e = time(b);
    if (s == null || e == null) continue;
    const text = lines.slice(ti + 1).join(" ").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    if (text) segments.push({ s, e, text });
  }
  return finishTranscript(segments);
}
// Plain text with no timings → one segment per paragraph, no times (words get s = -1).
export function parsePlain(raw) {
  const segs = String(raw || "").split(/\n\s*\n|\n/).map((x) => x.trim()).filter(Boolean).map((text) => ({ s: -1, e: -1, text }));
  return finishTranscript(segs);
}
export function finishTranscript(segments) {
  const words = [];
  for (const sg of segments) {
    const ws = sg.text.split(/\s+/).filter(Boolean);
    const span = sg.e > sg.s ? (sg.e - sg.s) / ws.length : 0;
    ws.forEach((w, i) => words.push({ w, s: sg.s < 0 ? -1 : +(sg.s + i * span).toFixed(2), e: sg.s < 0 ? -1 : +(sg.s + (i + 1) * span).toFixed(2) }));
  }
  return { segments, words, text: segments.map((x) => x.text).join("\n") };
}
// AssemblyAI response → same shape.
export function fromAssembly(j) {
  const words = (j.words || []).map((w) => ({ w: w.text, s: +(w.start / 1000).toFixed(2), e: +(w.end / 1000).toFixed(2), sp: w.speaker || "" }));
  const segments = (j.utterances || []).map((u) => ({ s: +(u.start / 1000).toFixed(2), e: +(u.end / 1000).toFixed(2), text: u.text, sp: u.speaker || "" }));
  return { segments: segments.length ? segments : [{ s: 0, e: words.at(-1)?.e || 0, text: j.text || "" }], words, text: j.text || "" };
}

// ── Stringout exports ──
// CMX3600 EDL: Resolve relinks by the FROM CLIP NAME comment. Source TC is
// the clip's start TC (00:00:00:00 if the camera didn't stamp one) + in.
export function buildEDL({ title, selects, clips, fps = 23.976 }) {
  const byId = Object.fromEntries(clips.map((c) => [c.id, c]));
  const lines = [`TITLE: ${String(title || "STRINGOUT").slice(0, 60)}`, "FCM: NON-DROP FRAME", ""];
  let rec = 3600; let n = 0;
  for (const s of selects) {
    const c = byId[s.clip_id]; if (!c) continue;
    const dur = Math.max(1 / Math.round(fps), (Number(s.out_s) || 0) - (Number(s.in_s) || 0));
    const base = tcToSeconds(c.start_tc, c.fps || fps);
    n += 1;
    lines.push(`${String(n).padStart(3, "0")}  AX       V     C        ${tc(base + +s.in_s, fps)} ${tc(base + +s.in_s + dur, fps)} ${tc(rec, fps)} ${tc(rec + dur, fps)}`);
    lines.push(`* FROM CLIP NAME: ${c.filename}`);
    if (s.text) lines.push(`* COMMENT: ${String(s.text).replace(/\s+/g, " ").slice(0, 200)}`);
    lines.push("");
    rec += dur;
  }
  return lines.join("\n");
}
export function buildCSV({ selects, clips, scenes = [], people = [], fps = 23.976 }) {
  const byId = Object.fromEntries(clips.map((c) => [c.id, c]));
  const sc = Object.fromEntries(scenes.map((s) => [s.id, `${s.number}. ${s.title}`]));
  const pp = Object.fromEntries(people.map((p) => [p.id, p.name]));
  const q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = [["Scene", "Kind", "Clip", "In", "Out", "Duration", "Who", "Rating", "Text", "Note"].map(q).join(",")];
  for (const s of selects) { const c = byId[s.clip_id]; if (!c) continue; const base = tcToSeconds(c.start_tc, c.fps || fps); rows.push([sc[s.scene_id] || "", SELECT_KINDS[s.kind] || s.kind, c.filename, tc(base + +s.in_s, fps), tc(base + +s.out_s, fps), mmss(+s.out_s - +s.in_s), pp[s.person_id] || "", s.rating, s.text, s.note].map(q).join(",")); }
  return rows.join("\n");
}
export function buildPaperCut({ title, selects, clips, scenes = [], people = [], fps = 23.976 }) {
  const byId = Object.fromEntries(clips.map((c) => [c.id, c]));
  const pp = Object.fromEntries(people.map((p) => [p.id, p.name]));
  const out = [`# ${title || "Paper cut"}`, ""];
  const groups = [...scenes.map((s) => ({ id: s.id, label: `${s.number}. ${s.title}` })), { id: null, label: "Unplaced" }];
  let total = 0;
  for (const g of groups) {
    const list = selects.filter((s) => (s.scene_id || null) === g.id); if (!list.length) continue;
    const dur = list.reduce((a, s) => a + (+s.out_s - +s.in_s), 0); total += dur;
    out.push(`## ${g.label} · ${mmss(dur)}`);
    for (const s of list) { const c = byId[s.clip_id]; out.push(`- **${pp[s.person_id] || SELECT_KINDS[s.kind]}** ${"★".repeat(s.rating || 0)} — ${s.text || s.note || "(no text)"}  \n  ${c?.filename || "?"} ${tc(+s.in_s, fps)}–${tc(+s.out_s, fps)}${s.note && s.text ? ` · ${s.note}` : ""}`); }
    out.push("");
  }
  out.unshift(`Runtime of selects: ${hms(total)}`);
  return out.join("\n");
}
