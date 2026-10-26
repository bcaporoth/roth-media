"use client";

// Sprint 4: Footage (clip log + proxies + transcripts), Selects → stringout
// exports for Resolve, Cuts + screening notes. The edit lives here until
// the timeline; Resolve gets an EDL/CSV, not a login.
import { useEffect, useMemo, useRef, useState } from "react";
import { P } from "./ProductionCards";
import { CUT_STAGES, CUT_STAGE_LABEL, SELECT_KINDS, VERDICT_LABEL, TRANSCRIPT_STATUS_LABEL, tc, mmss, hms, gb, parseName, buildEDL, buildCSV, buildPaperCut } from "../lib/edit";

const SqlHint = ({ what }) => <p className="sm-sqlhint">{what} needs <code>supabase/sprint4.sql</code> run once in the Supabase SQL editor.</p>;
const VIDEO_EXT = /\.(mov|mp4|m4v|mxf|braw|crm|r3d|avi|mts|m2ts)$/i;
const fmtDate = (d) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "");
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
const download = (name, text, type = "text/plain") => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); };
function Stars({ value, onChange }) {
  return <span className="stars" role="radiogroup" aria-label="Rating">{[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" className={"star" + (n <= (value || 0) ? " is-on" : "")} onClick={() => onChange(n === value ? 0 : n)} aria-label={`${n} star`}>★</button>)}</span>;
}
// Read duration + frame size in the browser. Camera-native codecs Chrome
// can't decode (BRAW, ProRes on some builds) just come back with zeros.
function probe(file) {
  return new Promise((resolve) => {
    const v = document.createElement("video"); v.preload = "metadata"; v.muted = true;
    const url = URL.createObjectURL(file);
    const done = (o) => { URL.revokeObjectURL(url); v.removeAttribute("src"); resolve(o); };
    const t = setTimeout(() => done({}), 4000);
    v.onloadedmetadata = () => { clearTimeout(t); done({ duration_s: +v.duration.toFixed(2), width: v.videoWidth, height: v.videoHeight }); };
    v.onerror = () => { clearTimeout(t); done({}); };
    v.src = url;
  });
}
function useRows(prefix, project, setRows, fail) {
  return {
    add: async (fields) => { const r = await P({ action: `${prefix}-add`, projectId: project.id, ...fields }); setRows((l) => [...l, r.row]); return r; },
    patch: async (id, fields) => { try { const r = await P({ action: `${prefix}-update`, id, ...fields }); setRows((l) => l.map((x) => (x.id === id ? r.row : x))); return r.row; } catch (e) { fail(e); } },
    remove: async (x, label) => { if (!window.confirm(`Delete ${label || "this"}?`)) return; try { await P({ action: `${prefix}-delete`, id: x.id }); setRows((l) => l.filter((y) => y.id !== x.id)); } catch (e) { fail(e); } },
  };
}

// ── Footage ──
export function FootageCard({ project, clips, setClips, selects, setSelects, days, scenes, people, setPeople, fail, say, ready, transcribe }) {
  const [open, setOpen] = useState(null);
  const [filt, setFilt] = useState({ day: "all", scene: "all", person: "all", q: "", min: 0, tx: false });
  const [busy, setBusy] = useState("");
  const [ingestDay, setIngestDay] = useState("");
  const [fps, setFps] = useState("23.976");
  const inputRef = useRef(null);
  if (!ready) return <section className="cprof-card"><div className="cprof-cardhead"><h2>Footage</h2></div><SqlHint what="The edit room" /></section>;
  const api = useRows("clip", project, setClips, fail);
  async function ingest(e) {
    const files = [...(e.target.files || [])].filter((f) => VIDEO_EXT.test(f.name));
    e.target.value = "";
    if (!files.length) { say("No video files in that folder"); return; }
    setBusy(`Reading ${files.length} clips…`);
    try {
      const rows = [];
      for (let i = 0; i < files.length; i += 4) {
        const batch = await Promise.all(files.slice(i, i + 4).map(async (f) => ({ filename: f.name, size_bytes: f.size, fps: Number(fps) || 23.976, ...(await probe(f)) })));
        rows.push(...batch); setBusy(`Reading ${Math.min(i + 4, files.length)}/${files.length}…`);
      }
      let added = 0;
      for (let i = 0; i < rows.length; i += 100) {
        const r = await P({ action: "clips-ingest", projectId: project.id, shoot_id: ingestDay || null, clips: rows.slice(i, i + 100) });
        added += r.rows.length;
        setClips((l) => { const m = new Map(l.map((c) => [c.id, c])); for (const c of r.rows) m.set(c.id, { ...(m.get(c.id) || {}), ...c }); return [...m.values()].sort((a, b) => a.filename.localeCompare(b.filename)); });
      }
      say(`Logged ${added} clips`);
    } catch (err) { fail(err); } finally { setBusy(""); }
  }
  const dayOf = Object.fromEntries(days.map((d) => [d.id, d]));
  const shown = clips.filter((c) => (filt.day === "all" || (filt.day === "none" ? !c.shoot_id : c.shoot_id === filt.day)) && (filt.scene === "all" || c.scene_id === filt.scene) && (filt.person === "all" || c.person_id === filt.person) && (c.rating || 0) >= filt.min && (!filt.tx || c.transcript_status === "done") && (!filt.q || c.filename.toLowerCase().includes(filt.q.toLowerCase()) || (c.notes || "").toLowerCase().includes(filt.q.toLowerCase())));
  const total = clips.reduce((a, c) => a + (+c.duration_s || 0), 0);
  const selCount = (id) => selects.filter((s) => s.clip_id === id).length;
  return (
    <section className="cprof-card footage">
      <div className="cprof-cardhead"><h2>Footage{clips.length > 0 && <em className="cprof-count">{clips.length} · {hms(total)}</em>}</h2>
        <span className="gcard-actions"><label className="achip">fps <input className="fps-in" value={fps} onChange={(e) => setFps(e.target.value)} aria-label="Frame rate" /></label><select className="achip" value={ingestDay} onChange={(e) => setIngestDay(e.target.value)} aria-label="Day for unmatched clips"><option value="">day: from filename</option>{days.map((d) => <option key={d.id} value={d.id}>{fmtDate(d.date)} · {d.title}</option>)}</select><button type="button" className="abtn" disabled={Boolean(busy)} onClick={() => inputRef.current?.click()}>{busy || "+ Log a folder"}</button><input ref={inputRef} type="file" webkitdirectory="" multiple hidden onChange={ingest} /></span>
      </div>
      {clips.length === 0 && !busy && <p className="gcard-meta">Point this at a card's folder (or the whole day's offload). It reads every clip's name, length and size — nothing uploads. Clips named <code>{project.code || "STMARY"}_YYMMDD_A01_R01…</code> land on their roll and day by themselves. Upload small proxies on the clips you'll actually pull from.</p>}
      {clips.length > 0 && (
        <div className="clip-filters">
          <input value={filt.q} onChange={(e) => setFilt({ ...filt, q: e.target.value })} placeholder="search filename / notes" aria-label="Search" />
          <select value={filt.day} onChange={(e) => setFilt({ ...filt, day: e.target.value })} aria-label="Day"><option value="all">all days</option><option value="none">no day</option>{days.map((d) => <option key={d.id} value={d.id}>{fmtDate(d.date)} · {d.title}</option>)}</select>
          <select value={filt.scene} onChange={(e) => setFilt({ ...filt, scene: e.target.value })} aria-label="Scene"><option value="all">all scenes</option>{scenes.map((s) => <option key={s.id} value={s.id}>{s.number}. {s.title}</option>)}</select>
          <select value={filt.person} onChange={(e) => setFilt({ ...filt, person: e.target.value })} aria-label="Person"><option value="all">anyone</option>{people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
          <select value={filt.min} onChange={(e) => setFilt({ ...filt, min: Number(e.target.value) })} aria-label="Min rating"><option value={0}>any rating</option><option value={3}>★★★+</option><option value={4}>★★★★+</option><option value={5}>★★★★★</option></select>
          <button type="button" className={"ifilter" + (filt.tx ? " is-on" : "")} onClick={() => setFilt({ ...filt, tx: !filt.tx })}>has transcript</button>
          <span className="gcard-meta">{shown.length} shown</span>
        </div>
      )}
      <ul className="clip-list">
        {shown.map((c) => (
          <li key={c.id} className={"clip" + (open === c.id ? " is-open" : "")}>
            <button type="button" className="clip-row" onClick={() => setOpen(open === c.id ? null : c.id)}>
              <span className="clip-thumb">{c.thumb_url ? <img src={c.thumb_url} alt="" /> : <i>{c.camera || "·"}</i>}</span>
              <span className="clip-main"><strong>{c.filename}</strong><em>{[c.duration_s ? mmss(c.duration_s) : "", c.width ? `${c.width}×${c.height}` : "", gb(c.size_bytes), c.shoot_id && dayOf[c.shoot_id] ? fmtDate(dayOf[c.shoot_id].date) : "", c.person_id ? people.find((p) => p.id === c.person_id)?.name : ""].filter(Boolean).join(" · ")}</em></span>
              <span className="clip-tags">{c.rating > 0 && <span className="itag">{"★".repeat(c.rating)}</span>}{selCount(c.id) > 0 && <span className="itag is-rel">{selCount(c.id)} selects</span>}{c.proxy_key && <span className="itag">proxy</span>}{c.transcript_status !== "none" && <span className={"itag" + (c.transcript_status === "done" ? " is-rel" : "")}>{TRANSCRIPT_STATUS_LABEL[c.transcript_status]}</span>}</span>
            </button>
            {open === c.id && <ClipView clip={c} api={api} selects={selects.filter((s) => s.clip_id === c.id)} setSelects={setSelects} setClips={setClips} days={days} scenes={scenes} people={people} setPeople={setPeople} project={project} fail={fail} say={say} transcribe={transcribe} />}
          </li>
        ))}
      </ul>
    </section>
  );
}

function ClipView({ clip: c, api, selects, setSelects, setClips, days, scenes, people, setPeople, project, fail, say, transcribe }) {
  const vid = useRef(null);
  const [urls, setUrls] = useState({ proxy_url: "", thumb_url: c.thumb_url || "" });
  const [tx, setTx] = useState(undefined); // undefined = not fetched, null = none
  const [mark, setMark] = useState({ in: null, out: null });
  const [busy, setBusy] = useState("");
  const [pos, setPos] = useState(0);
  const [sel, setSel] = useState({ kind: "bite", scene_id: c.scene_id || "", person_id: c.person_id || "", text: "", note: "", rating: 3 });
  useEffect(() => { let on = true; P({ action: "clip-urls", id: c.id }).then((r) => on && setUrls(r)).catch(() => {}); if (c.transcript_status === "done") P({ action: "transcript-get", id: c.id }).then((r) => on && setTx(r.transcript)).catch(() => on && setTx(null)); else setTx(null); return () => { on = false; }; }, [c.id, c.transcript_status]);
  // Poll AssemblyAI while queued/processing.
  useEffect(() => { if (!["queued", "processing"].includes(c.transcript_status)) return; const t = setInterval(async () => { try { const r = await P({ action: "transcript-poll", id: c.id }); if (r.row) setClips((l) => l.map((x) => (x.id === c.id ? { ...x, ...r.row } : x))); if (r.transcript) setTx(r.transcript); if (r.error) fail(new Error(r.error)); } catch (e) { fail(e); } }, 8000); return () => clearInterval(t); }, [c.id, c.transcript_status]);
  const patchClip = (f) => api.patch(c.id, f);
  const seek = (s) => { if (vid.current && s >= 0) { vid.current.currentTime = s; vid.current.play().catch(() => {}); } };
  async function putFile(which, file, contentType) {
    const s = await P({ action: "clip-proxy-sign", id: c.id, which });
    const r = await fetch(s.url, { method: "PUT", body: file, headers: { "content-type": contentType } });
    if (!r.ok) throw new Error(`Upload failed (${r.status})`);
    return P({ action: "clip-proxy-done", id: c.id, key: s.key });
  }
  async function uploadProxy(e) {
    const f = e.target.files?.[0]; e.target.value = ""; if (!f) return;
    setBusy(`Uploading proxy ${gb(f.size) || ""}…`);
    try {
      const d = await putFile("proxy", f, "video/mp4");
      setUrls((u) => ({ ...u, proxy_url: d.url })); setClips((l) => l.map((x) => (x.id === c.id ? { ...x, ...d.row } : x)));
      // thumb: grab a frame two seconds in
      setBusy("Making thumbnail…");
      const local = URL.createObjectURL(f);
      await new Promise((res) => {
        const v = document.createElement("video"); v.muted = true; v.src = local; v.preload = "auto";
        v.onloadedmetadata = () => { v.currentTime = Math.min(2, v.duration / 2 || 0); };
        v.onseeked = () => { try { const cv = document.createElement("canvas"); const w = 480; cv.width = w; cv.height = Math.round(w * v.videoHeight / v.videoWidth) || 270; cv.getContext("2d").drawImage(v, 0, 0, cv.width, cv.height); cv.toBlob(async (b) => { try { const t = await putFile("thumb", b, "image/jpeg"); setUrls((u) => ({ ...u, thumb_url: t.url })); setClips((l) => l.map((x) => (x.id === c.id ? { ...x, ...t.row, thumb_url: t.url } : x))); } catch {} res(); }, "image/jpeg", 0.8); } catch { res(); } };
        v.onerror = () => res(); setTimeout(res, 15000);
      });
      URL.revokeObjectURL(local);
      if (!c.duration_s) { const v = document.createElement("video"); v.src = d.url; v.onloadedmetadata = () => patchClip({ duration_s: +v.duration.toFixed(2), width: v.videoWidth, height: v.videoHeight }); }
      say("Proxy up");
    } catch (err) { fail(err); } finally { setBusy(""); }
  }
  async function uploadTranscript(e) {
    const f = e.target.files?.[0]; e.target.value = ""; if (!f) return;
    setBusy("Reading transcript…");
    try { const r = await P({ action: "transcript-upload", id: c.id, body: await f.text() }); setTx(r.transcript); setClips((l) => l.map((x) => (x.id === c.id ? { ...x, transcript_status: "done" } : x))); say("Transcript in"); } catch (err) { fail(err); } finally { setBusy(""); }
  }
  async function startTranscribe() {
    setBusy("Sending to the transcriber…");
    try { const r = await P({ action: "transcribe", id: c.id }); setClips((l) => l.map((x) => (x.id === c.id ? { ...x, ...r.row } : x))); say("Queued — a few minutes"); } catch (err) { fail(err); } finally { setBusy(""); }
  }
  function tapWord(w, i) {
    if (w.s >= 0) seek(w.s);
    if (mark.in === null || (mark.out !== null)) setMark({ in: i, out: null });
    else if (i < mark.in) setMark({ in: i, out: mark.in });
    else setMark({ in: mark.in, out: i });
  }
  const words = tx?.words || [];
  const marked = mark.in !== null && mark.out !== null ? words.slice(mark.in, mark.out + 1) : [];
  useEffect(() => { if (marked.length) setSel((s) => ({ ...s, text: marked.map((w) => w.w).join(" ") })); }, [mark.in, mark.out]);
  const inS = marked.length && marked[0].s >= 0 ? marked[0].s : null;
  const outS = marked.length && marked.at(-1).e >= 0 ? marked.at(-1).e : null;
  async function addSelect(e) {
    e.preventDefault();
    const inEl = e.currentTarget.elements.in_s; const outEl = e.currentTarget.elements.out_s;
    const in_s = inS ?? (inEl ? Number(inEl.value) || 0 : pos); const out_s = outS ?? (outEl ? Number(outEl.value) || in_s + 8 : in_s + 8);
    try {
      const r = await P({ action: "select-add", projectId: project.id, clip_id: c.id, ...sel, in_s, out_s: Math.max(out_s, in_s + 0.5), sort: Date.now() % 1e6 });
      setSelects((l) => [...l, r.row]); if (r.person) setPeople((l) => l.map((p) => (p.id === r.person.id ? r.person : p)));
      setMark({ in: null, out: null }); setSel((s) => ({ ...s, text: "", note: "" })); say(r.person ? "Selected · quote added to " + r.person.name.split(" ")[0] : "Selected");
    } catch (err) { fail(err); }
  }
  async function dropSelect(s) { if (!window.confirm("Remove this select?")) return; try { await P({ action: "select-delete", id: s.id }); setSelects((l) => l.filter((x) => x.id !== s.id)); if (s.person_id) setPeople((l) => l.map((p) => (p.id === s.person_id ? { ...p, quotes: (p.quotes || []).filter((q) => q.select_id !== s.id) } : p))); } catch (err) { fail(err); } }
  const curWord = useMemo(() => { if (!words.length) return -1; let lo = 0, hi = words.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (words[m].s <= pos) lo = m; else hi = m - 1; } return words[lo]?.s <= pos && words[lo]?.e >= pos - 0.4 ? lo : -1; }, [pos, words]);
  return (
    <div className="clip-view">
      <div className="clip-cols">
        <div className="clip-media">
          {urls.proxy_url ? <video ref={vid} src={urls.proxy_url} controls playsInline onTimeUpdate={(e) => setPos(e.currentTarget.currentTime)} poster={urls.thumb_url || undefined} /> : <div className="clip-noproxy">{urls.thumb_url ? <img src={urls.thumb_url} alt="" /> : null}<label className="achip achip-primary">{busy || "Upload proxy (H.264 mp4)"}<input type="file" accept="video/mp4,video/*" hidden onChange={uploadProxy} disabled={Boolean(busy)} /></label><span className="gcard-meta">Resolve: Deliver → H.264, 720p, 2–4 Mb/s. Small enough to scrub on the phone.</span></div>}
          <div className="gcard-actions">
            <Stars value={c.rating} onChange={(v) => patchClip({ rating: v })} />
            <select className="achip" value={c.shoot_id || ""} onChange={(e) => patchClip({ shoot_id: e.target.value })} aria-label="Day"><option value="">day…</option>{days.map((d) => <option key={d.id} value={d.id}>{fmtDate(d.date)} · {d.title}</option>)}</select>
            <select className="achip" value={c.scene_id || ""} onChange={(e) => { patchClip({ scene_id: e.target.value }); setSel((s) => ({ ...s, scene_id: e.target.value })); }} aria-label="Scene"><option value="">scene…</option>{scenes.map((s) => <option key={s.id} value={s.id}>{s.number}. {s.title}</option>)}</select>
            <select className="achip" value={c.person_id || ""} onChange={(e) => { patchClip({ person_id: e.target.value }); setSel((s) => ({ ...s, person_id: e.target.value })); }} aria-label="Who"><option value="">who…</option>{people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
            {urls.proxy_url && <label className="achip">{busy || "Replace proxy"}<input type="file" accept="video/mp4,video/*" hidden onChange={uploadProxy} disabled={Boolean(busy)} /></label>}
            <button type="button" className="prep-x" onClick={() => api.remove(c, c.filename)} aria-label="Delete clip">×</button>
          </div>
          <div className="shoot-new scene-fields">
            <label>Start TC<input defaultValue={c.start_tc} placeholder="00:00:00:00" onBlur={(e) => e.target.value !== c.start_tc && patchClip({ start_tc: e.target.value })} /></label>
            <label>Keywords<input defaultValue={(c.keywords || []).join(", ")} placeholder="bells, hands, candle" onBlur={(e) => patchClip({ keywords: e.target.value })} /></label>
            <label className="wide">Notes<textarea rows={2} defaultValue={c.notes} placeholder="Focus soft after 1:20 · best take is the second pass" onBlur={(e) => e.target.value !== c.notes && patchClip({ notes: e.target.value })} /></label>
          </div>
        </div>
        <div className="clip-tx">
          <div className="cprof-cardhead"><h3>Transcript</h3><span className="gcard-actions">
            <label className="achip">{busy && /transcript/i.test(busy) ? busy : "Upload SRT / VTT / txt"}<input type="file" accept=".srt,.vtt,.txt,text/*" hidden onChange={uploadTranscript} /></label>
            {transcribe ? <button type="button" className="achip" disabled={!c.proxy_key || Boolean(busy) || ["queued", "processing"].includes(c.transcript_status)} onClick={startTranscribe} title={!c.proxy_key ? "Upload a proxy first" : ""}>{["queued", "processing"].includes(c.transcript_status) ? "Transcribing…" : "Transcribe"}</button> : <span className="gcard-meta" title="Add ASSEMBLYAI_API_KEY in Vercel to transcribe here">Resolve → Transcribe → export SRT</span>}
          </span></div>
          {tx === undefined && c.transcript_status === "done" && <p className="gcard-meta">Loading…</p>}
          {!words.length && tx !== undefined && <p className="gcard-meta">No transcript yet. In Resolve: right-click the clip → Transcribe Audio → ⋯ → Export SRT. Or type IN/OUT below by hand.</p>}
          {words.length > 0 && (
            <>
              <p className="gcard-meta">Tap a word to jump there. First tap = IN, second tap = OUT. {mark.in !== null && <button type="button" className="achip" onClick={() => setMark({ in: null, out: null })}>clear marks</button>}</p>
              <div className="tx-words">{words.map((w, i) => { const on = mark.in !== null && (mark.out === null ? i === mark.in : i >= mark.in && i <= mark.out); return <span key={i} className={"tx-w" + (on ? " is-marked" : "") + (i === curWord ? " is-now" : "") + (w.s < 0 ? " no-time" : "")} onClick={() => tapWord(w, i)}>{w.sp && (i === 0 || words[i - 1].sp !== w.sp) ? <b className="tx-sp">{w.sp}: </b> : null}{w.w} </span>; })}</div>
            </>
          )}
          <form className="shoot-new select-new" onSubmit={addSelect}>
            <span className="kick-sm wide">New select {marked.length ? `· ${tc(inS, c.fps)} → ${tc(outS, c.fps)} · ${mmss(outS - inS)}` : ""}</span>
            {!marked.length && <><label>In (s)<input name="in_s" type="number" step="0.1" defaultValue={pos.toFixed(1)} /></label><label>Out (s)<input name="out_s" type="number" step="0.1" defaultValue={(pos + 8).toFixed(1)} /></label></>}
            <label>Kind<select value={sel.kind} onChange={(e) => setSel({ ...sel, kind: e.target.value })}>{Object.entries(SELECT_KINDS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
            <label>Scene<select value={sel.scene_id} onChange={(e) => setSel({ ...sel, scene_id: e.target.value })}><option value="">—</option>{scenes.map((s) => <option key={s.id} value={s.id}>{s.number}. {s.title}</option>)}</select></label>
            <label>Who<select value={sel.person_id} onChange={(e) => setSel({ ...sel, person_id: e.target.value })}><option value="">—</option>{people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
            <label>Rating<select value={sel.rating} onChange={(e) => setSel({ ...sel, rating: Number(e.target.value) })}>{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{"★".repeat(n)}</option>)}</select></label>
            <label className="wide">What they say / what we see<textarea rows={2} value={sel.text} onChange={(e) => setSel({ ...sel, text: e.target.value })} placeholder="The line, verbatim — it becomes their quote" /></label>
            <label className="wide">Why it's a select<input value={sel.note} onChange={(e) => setSel({ ...sel, note: e.target.value })} placeholder="The pause before 'we stayed'" /></label>
            <button type="submit" className="abtn">Select it</button>
          </form>
          {selects.length > 0 && <ul className="cprof-list sel-list">{selects.map((s) => <li key={s.id}><button type="button" className="achip" onClick={() => seek(+s.in_s)}>{tc(+s.in_s, c.fps)}</button><span>{"★".repeat(s.rating)} <strong>{SELECT_KINDS[s.kind]}</strong> {s.text || s.note}{s.scene_id ? <em className="gcard-meta"> · {scenes.find((x) => x.id === s.scene_id)?.title}</em> : null}</span><button type="button" className="prep-x" onClick={() => dropSelect(s)} aria-label="Remove">×</button></li>)}</ul>}
        </div>
      </div>
    </div>
  );
}

// ── Stringout: selects by scene → EDL / CSV / paper cut ──
export function StringoutCard({ project, selects, setSelects, clips, scenes, people, setPeople, fail, say, ready }) {
  const [scene, setScene] = useState("all");
  if (!ready) return null;
  const byClip = Object.fromEntries(clips.map((c) => [c.id, c]));
  const order = (a, b) => (a.sort - b.sort) || a.created_at.localeCompare(b.created_at);
  const groups = [...scenes.map((s) => ({ id: s.id, label: `${s.number}. ${s.title}`, list: selects.filter((x) => x.scene_id === s.id).sort(order) })), { id: null, label: "Unplaced", list: selects.filter((x) => !x.scene_id).sort(order) }];
  const shown = scene === "all" ? groups : groups.filter((g) => String(g.id) === scene);
  const flat = shown.flatMap((g) => g.list);
  const runtime = flat.reduce((a, s) => a + (+s.out_s - +s.in_s), 0);
  const fps = Number(clips[0]?.fps) || 23.976;
  const title = `${project.code || "DOC"}_${scene === "all" ? "STRINGOUT" : "SCENE"}_${today().replace(/-/g, "")}`;
  async function move(s, dir) {
    const g = groups.find((x) => (x.id || null) === (s.scene_id || null)); const i = g.list.findIndex((x) => x.id === s.id); const j = i + dir; if (j < 0 || j >= g.list.length) return;
    const other = g.list[j]; const a = s.sort, b = other.sort === s.sort ? s.sort + dir : other.sort;
    try { await Promise.all([P({ action: "select-update", id: s.id, sort: b }), P({ action: "select-update", id: other.id, sort: a })]); setSelects((l) => l.map((x) => (x.id === s.id ? { ...x, sort: b } : x.id === other.id ? { ...x, sort: a } : x))); } catch (e) { fail(e); }
  }
  async function toScene(s, scene_id) { try { const r = await P({ action: "select-update", id: s.id, scene_id }); setSelects((l) => l.map((x) => (x.id === s.id ? r.row : x))); } catch (e) { fail(e); } }
  async function drop(s) { if (!window.confirm("Remove this select?")) return; try { await P({ action: "select-delete", id: s.id }); setSelects((l) => l.filter((x) => x.id !== s.id)); if (s.person_id) setPeople((l) => l.map((p) => (p.id === s.person_id ? { ...p, quotes: (p.quotes || []).filter((q) => q.select_id !== s.id) } : p))); } catch (e) { fail(e); } }
  const empty = scenes.filter((s) => !selects.some((x) => x.scene_id === s.id) && !["idea", "locked"].includes(s.status));
  return (
    <section className="cprof-card">
      <div className="cprof-cardhead"><h2>Stringout{selects.length > 0 && <em className="cprof-count">{selects.length} · {hms(runtime)}</em>}</h2>
        <span className="gcard-actions"><select className="achip" value={scene} onChange={(e) => setScene(e.target.value)} aria-label="Scene"><option value="all">whole film</option>{groups.map((g) => <option key={String(g.id)} value={String(g.id)}>{g.label} ({g.list.length})</option>)}</select>
          <button type="button" className="achip" disabled={!flat.length} onClick={() => download(`${title}.edl`, buildEDL({ title, selects: flat, clips, fps }))}>EDL → Resolve</button>
          <button type="button" className="achip" disabled={!flat.length} onClick={() => download(`${title}.csv`, buildCSV({ selects: flat, clips, scenes, people, fps }), "text/csv")}>CSV</button>
          <button type="button" className="achip" disabled={!flat.length} onClick={() => download(`${title}.md`, buildPaperCut({ title, selects: flat, clips, scenes, people, fps }), "text/markdown")}>Paper cut</button></span>
      </div>
      {selects.length === 0 && <p className="gcard-meta">Selects show up here grouped by scene, in order. Export an EDL and Resolve builds the stringout timeline from your camera originals (File → Import → Timeline; it relinks by clip name).</p>}
      {empty.length > 0 && <p className="gcard-meta">No selects yet for: {empty.map((s) => s.title).join(" · ")}</p>}
      {shown.filter((g) => g.list.length).map((g) => (
        <div key={String(g.id)} className="so-group">
          <span className="kick-sm">{g.label} · {mmss(g.list.reduce((a, s) => a + (+s.out_s - +s.in_s), 0))}</span>
          <ol className="so-list">
            {g.list.map((s) => { const c = byClip[s.clip_id]; return (
              <li key={s.id}>
                <span className="so-main"><strong>{people.find((p) => p.id === s.person_id)?.name || SELECT_KINDS[s.kind]}</strong> {"★".repeat(s.rating)} — {s.text || s.note || <em className="gcard-meta">no text</em>}<em className="gcard-meta"> · {c?.filename} {tc(+s.in_s, fps)} · {mmss(+s.out_s - +s.in_s)}</em></span>
                <span className="gcard-actions"><button type="button" className="achip" onClick={() => move(s, -1)} aria-label="Up">↑</button><button type="button" className="achip" onClick={() => move(s, 1)} aria-label="Down">↓</button><select className="achip" value={s.scene_id || ""} onChange={(e) => toScene(s, e.target.value)} aria-label="Scene"><option value="">unplaced</option>{scenes.map((x) => <option key={x.id} value={x.id}>{x.number}. {x.title}</option>)}</select><button type="button" className="prep-x" onClick={() => drop(s)} aria-label="Remove">×</button></span>
              </li>); })}
          </ol>
        </div>
      ))}
    </section>
  );
}

// ── Cuts + screening notes ──
export function CutsCard({ project, cuts, setCuts, notes, setNotes, scenes, fail, say, ready }) {
  const [open, setOpen] = useState(cuts[0]?.id || null);
  const [adding, setAdding] = useState(false);
  if (!ready) return null;
  const api = useRows("cut", project, setCuts, fail);
  const napi = useRows("note", project, setNotes, fail);
  const thesisV = (project.thesis || []).length || null;
  async function add(e) {
    e.preventDefault(); const f = Object.fromEntries(new FormData(e.currentTarget).entries());
    const version = cuts.filter((c) => c.stage === f.stage).length + 1;
    try { const r = await api.add({ ...f, version, date: today(), thesis_v: thesisV, scene_order: scenes.map((s) => s.id) }); setCuts((l) => [r.row, ...l.filter((x) => x.id !== r.row.id)]); setOpen(r.row.id); setAdding(false); e.target.reset(); } catch (err) { fail(err); }
  }
  return (
    <section className="cprof-card">
      <div className="cprof-cardhead"><h2>Cuts{cuts.length > 0 && <em className="cprof-count">{cuts.length}</em>}</h2><button type="button" className="abtn" onClick={() => setAdding(!adding)}>{adding ? "Close" : "+ Cut"}</button></div>
      {adding && (
        <form className="shoot-new" onSubmit={add}>
          <label>Stage<select name="stage" defaultValue={cuts[0]?.stage || "stringout"}>{CUT_STAGES.map((s) => <option key={s} value={s}>{CUT_STAGE_LABEL[s]}</option>)}</select></label>
          <label>Runtime (min)<input name="runtime_min" type="number" min="0" placeholder="48" onChange={(e) => { e.target.form.runtime_s.value = Math.round(Number(e.target.value) * 60) || 0; }} /><input type="hidden" name="runtime_s" defaultValue="0" /></label>
          <label className="wide">Link (Frame.io / Vimeo / Drive)<input name="link" placeholder="https://" /></label>
          <label className="wide">Intent — what this cut is trying to prove<textarea name="intent" rows={2} placeholder="Does the near-closure land as the midpoint? Is Mary the spine or a chorus?" /></label>
          <button type="submit" className="abtn">Add</button>
        </form>
      )}
      {cuts.length === 0 && !adding && <p className="gcard-meta">Every version of the film, with what it was trying to prove and what the room said. Notes get triaged accept / reject / park — the pattern across a screening is the next cut&apos;s to-do.</p>}
      <ul className="people-list">
        {cuts.map((cut) => { const ns = notes.filter((n) => n.cut_id === cut.id); const by = (v) => ns.filter((n) => n.verdict === v).length; return (
          <li key={cut.id} className={"person" + (open === cut.id ? " is-open" : "")}>
            <button type="button" className="person-row staff-row" onClick={() => setOpen(open === cut.id ? null : cut.id)}>
              <span className="person-main"><strong>{CUT_STAGE_LABEL[cut.stage]} v{cut.version}</strong><em>{[fmtDate(cut.date), cut.runtime_s ? hms(cut.runtime_s) : "", cut.thesis_v ? `thesis v${cut.thesis_v}` : "", `${ns.length} notes`].filter(Boolean).join(" · ")}</em></span>
              <span className="person-tags">{by("accept") > 0 && <span className="itag is-rel">✓ {by("accept")}</span>}{by("reject") > 0 && <span className="itag is-alert">✗ {by("reject")}</span>}{by("park") > 0 && <span className="itag">⏸ {by("park")}</span>}<span className={`itag st-${cut.status}`}>{cut.status}</span></span>
            </button>
            {open === cut.id && <CutDetail cut={cut} api={api} notes={ns} napi={napi} scenes={scenes} project={project} fail={fail} />}
          </li>); })}
      </ul>
    </section>
  );
}
function CutDetail({ cut, api, notes, napi, scenes, project, fail }) {
  const [n, setN] = useState({ at: "", text: "", who: "", scene_id: "" });
  const pattern = useMemo(() => { const m = {}; for (const x of notes) { const k = x.scene_id || "none"; m[k] = m[k] || { r: 0, a: 0, p: 0, t: 0 }; m[k].t += 1; if (x.verdict === "reject") m[k].r += 1; if (x.verdict === "accept") m[k].a += 1; if (x.verdict === "park") m[k].p += 1; } return Object.entries(m).sort((a, b) => b[1].r - a[1].r); }, [notes]);
  async function add(e) { e.preventDefault(); if (!n.text.trim()) return; const [mm, ss] = n.at.split(":").map(Number); const at_s = n.at ? (isNaN(ss) ? mm * 60 : mm * 60 + ss) : null; try { await napi.add({ cut_id: cut.id, at_s, text: n.text.trim(), who: n.who.trim(), scene_id: n.scene_id || null }); setN({ ...n, at: "", text: "" }); } catch (err) { fail(err); } }
  return (
    <div className="person-detail">
      <div className="shoot-new scene-fields">
        <label>Stage<select value={cut.stage} onChange={(e) => api.patch(cut.id, { stage: e.target.value })}>{CUT_STAGES.map((s) => <option key={s} value={s}>{CUT_STAGE_LABEL[s]}</option>)}</select></label>
        <label>Status<select value={cut.status} onChange={(e) => api.patch(cut.id, { status: e.target.value })}>{["open", "screened", "superseded"].map((s) => <option key={s} value={s}>{s}</option>)}</select></label>
        <label>Runtime (min)<input type="number" defaultValue={Math.round((cut.runtime_s || 0) / 60)} onBlur={(e) => api.patch(cut.id, { runtime_s: Math.round(Number(e.target.value) * 60) })} /></label>
        <label>Link<input defaultValue={cut.link} onBlur={(e) => e.target.value !== cut.link && api.patch(cut.id, { link: e.target.value })} /></label>
        <label className="wide">Intent<textarea rows={2} defaultValue={cut.intent} onBlur={(e) => e.target.value !== cut.intent && api.patch(cut.id, { intent: e.target.value })} /></label>
        <label className="wide">What we learned<textarea rows={2} defaultValue={cut.notes} placeholder="After the screening: what held, what died, what moves" onBlur={(e) => e.target.value !== cut.notes && api.patch(cut.id, { notes: e.target.value })} /></label>
      </div>
      {cut.link && <p className="gcard-meta"><a href={cut.link} target="_blank" rel="noreferrer">Watch this cut ↗</a></p>}
      <div className="screen-notes">
        <span className="kick-sm">Screening notes · {notes.length}</span>
        <form className="shoot-new note-new" onSubmit={add}>
          <label>At (m:ss)<input value={n.at} onChange={(e) => setN({ ...n, at: e.target.value })} placeholder="12:40" /></label>
          <label>Who<input value={n.who} onChange={(e) => setN({ ...n, who: e.target.value })} placeholder="Brady" /></label>
          <label>Scene<select value={n.scene_id} onChange={(e) => setN({ ...n, scene_id: e.target.value })}><option value="">—</option>{scenes.map((s) => <option key={s.id} value={s.id}>{s.number}. {s.title}</option>)}</select></label>
          <label className="wide">Note<input value={n.text} onChange={(e) => setN({ ...n, text: e.target.value })} placeholder="Lost the thread here — who is she to him?" /></label>
          <button type="submit" className="abtn" disabled={!n.text.trim()}>Add</button>
        </form>
        <ul className="note-list">
          {notes.map((x) => <li key={x.id} className={"note" + (x.verdict ? ` v-${x.verdict}` : "") + (x.done ? " is-done" : "")}>
            <span className="note-at">{x.at_s != null ? mmss(x.at_s) : "—"}</span>
            <span className="note-main"><span>{x.text}</span><em className="gcard-meta">{[x.who, scenes.find((s) => s.id === x.scene_id)?.title].filter(Boolean).join(" · ")}</em></span>
            <span className="gcard-actions">{["accept", "reject", "park"].map((v) => <button key={v} type="button" className={"achip" + (x.verdict === v ? " is-on" : "")} onClick={() => napi.patch(x.id, { verdict: x.verdict === v ? "" : v })}>{VERDICT_LABEL[v]}</button>)}<button type="button" className={"achip" + (x.done ? " is-on" : "")} onClick={() => napi.patch(x.id, { done: !x.done })}>{x.done ? "done ✓" : "done"}</button><button type="button" className="prep-x" onClick={() => napi.remove(x, "this note")} aria-label="Remove">×</button></span>
          </li>)}
        </ul>
        {pattern.length > 1 && <p className="gcard-meta">Pattern: {pattern.map(([k, v]) => `${k === "none" ? "general" : scenes.find((s) => s.id === k)?.title || "?"} ${v.r ? `✗${v.r}` : ""}${v.a ? ` ✓${v.a}` : ""}${v.p ? ` ⏸${v.p}` : ""}`).join(" · ")}</p>}
      </div>
    </div>
  );
}
