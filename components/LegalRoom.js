"use client";

// Sprint 6 (owner only): the three gates, the clearance pass, music cues,
// archival items, and the legal register. Exports: Clearance Bible (CSV),
// cue sheet (CSV), E&O packet (MD). Templates here are trackers — the
// agreements themselves are the attorney's.
import { useState } from "react";
import { P } from "./ProductionCards";
import { CLEARANCE_KIND_LABEL, CLEARANCE_STATUS_LABEL, CLEARANCE_BASIS_LABEL, MUSIC_SOURCE_LABEL, MUSIC_USAGE_LABEL, LICENSE_STATUS_LABEL, ARCHIVAL_KIND_LABEL, ARCHIVAL_BASIS_LABEL, ARCHIVAL_STATUS_LABEL, LEGAL_KINDS, LEGAL_STATUS_LABEL, isGood, buildClearanceBible, buildCueSheet, buildEOPacket } from "../lib/legal";
import { money } from "../lib/production";

const SqlHint = ({ what }) => <p className="sm-sqlhint">{what} needs <code>supabase/sprint6.sql</code> run once in the Supabase SQL editor.</p>;
const fmtDate = (d) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "");
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
const mmss = (s) => { if (s == null || s === "") return ""; const n = Math.max(0, Math.floor(Number(s) || 0)); return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`; };
const toSecs = (v) => { if (v === "" || v == null) return ""; const p = String(v).split(":").map(Number); return p.length === 2 ? p[0] * 60 + (p[1] || 0) : Number(v) || 0; };
const download = (name, text, type = "text/plain") => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); };
function useRows(prefix, project, setRows, fail) {
  return {
    add: async (fields) => { const r = await P({ action: `${prefix}-add`, projectId: project.id, ...fields }); setRows((l) => [...l, r.row]); return r; },
    patch: async (id, fields) => { try { const r = await P({ action: `${prefix}-update`, id, ...fields }); setRows((l) => l.map((x) => (x.id === id ? r.row : x))); return r.row; } catch (e) { fail(e); } },
    remove: async (x, label) => { if (!window.confirm(`Delete ${label || "this"}?`)) return; try { await P({ action: `${prefix}-delete`, id: x.id }); setRows((l) => l.filter((y) => y.id !== x.id)); } catch (e) { fail(e); } },
  };
}
const Blur = ({ value, onSave, ...rest }) => <input defaultValue={value ?? ""} onBlur={(e) => e.target.value !== String(value ?? "") && onSave(e.target.value)} {...rest} />;
const Sel = ({ value, onSave, options, ...rest }) => <select className="achip" value={value} onChange={(e) => onSave(e.target.value)} {...rest}>{Object.entries(options).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>;

export function GatesCard({ project, gates, onProject, ready, onExport }) {
  const [open, setOpen] = useState("A");
  if (!ready || !gates) return <section className="cprof-card"><div className="cprof-cardhead"><h2>Gates</h2></div><SqlHint what="The legal layer" /></section>;
  const ov = project.gate_overrides || {};
  function override(c) {
    if (ov[c.key]) { if (window.confirm("Remove this override?")) { const n = { ...ov }; delete n[c.key]; onProject({ gate_overrides: n }); } return; }
    const reason = window.prompt(`Override "${c.label}" — why is it safe to proceed without it? (logged)`); if (!reason?.trim()) return;
    onProject({ gate_overrides: { ...ov, [c.key]: { reason: reason.trim(), at: today() } } });
  }
  return (
    <section className="cprof-card gates">
      <div className="cprof-cardhead"><h2>Gates</h2><span className="gcard-actions"><button type="button" className="achip" onClick={onExport}>E&amp;O packet ↓</button></span></div>
      <div className="gate-tabs">{Object.entries(gates).map(([k, g]) => <button key={k} type="button" className={"gate-tab" + (open === k ? " is-on" : "") + (g.open ? " is-open" : "")} onClick={() => setOpen(k)}><strong>{k}</strong><span>{g.passed}/{g.total}</span><em>{k === "A" ? "first shoot day" : k === "B" ? "picture lock" : "delivery"}</em></button>)}</div>
      <p className="gcard-meta">{gates[open].label}. {gates[open].open ? "Open — everything's in place." : `${gates[open].total - gates[open].passed} to go. Each line says where to fix it.`}</p>
      <ul className="gate-list">{gates[open].checks.map((c) => <li key={c.key} className={"gate-check" + (c.pass ? " is-ok" : "") + (c.override ? " is-ov" : "")}><span className="gate-mark">{c.ok ? "✓" : c.override ? "⚑" : "·"}</span><span className="gate-main"><strong>{c.label}</strong><em>{c.override ? `Overridden ${fmtDate(c.override.at)}: ${c.override.reason}` : c.detail}</em></span>{!c.ok && <button type="button" className={"achip" + (c.override ? " is-on" : "")} onClick={() => override(c)}>{c.override ? "overridden" : "override"}</button>}</li>)}</ul>
    </section>
  );
}

export function ClearanceCard({ project, rows, setRows, scenes, fail, say, ready }) {
  const [kind, setKind] = useState("all");
  const [adding, setAdding] = useState(false);
  if (!ready) return null;
  const api = useRows("clearance", project, setRows, fail);
  async function seed() { try { const r = await P({ action: "clearance-seed", projectId: project.id }); setRows((l) => [...l, ...r.rows]); say(r.rows.length ? `Added ${r.rows.length}` : "Nothing new to add"); } catch (e) { fail(e); } }
  async function add(e) { e.preventDefault(); const f = Object.fromEntries(new FormData(e.currentTarget).entries()); try { await api.add(f); setAdding(false); e.target.reset(); } catch (err) { fail(err); } }
  const shown = rows.filter((r) => kind === "all" || r.kind === kind);
  const n = (s) => rows.filter((r) => r.status === s).length;
  const cycle = { red: "yellow", yellow: "green", green: "red" };
  return (
    <section className="cprof-card">
      <div className="cprof-cardhead"><h2>Clearance pass{rows.length > 0 && <em className="cprof-count"><i className="dot g" /> {n("green")} <i className="dot y" /> {n("yellow")} <i className="dot r" /> {n("red")}</em>}</h2>
        <span className="gcard-actions"><button type="button" className="achip" onClick={seed}>Seed from project</button><button type="button" className="achip" disabled={!rows.length} onClick={() => download(`${project.code || "DOC"}_clearance_bible.csv`, buildClearanceBible({ project, clearance: rows, scenes }), "text/csv")}>Clearance Bible ↓</button><button type="button" className="abtn" onClick={() => setAdding(!adding)}>{adding ? "Close" : "+ Item"}</button></span></div>
      <span className="pbook-kinds">{[["all", "All"], ...Object.entries(CLEARANCE_KIND_LABEL)].map(([k, l]) => <button key={k} type="button" className={"ifilter" + (kind === k ? " is-on" : "")} onClick={() => setKind(k)}>{l}</button>)}</span>
      {adding && (
        <form className="shoot-new" onSubmit={add}>
          <label>Kind<select name="kind" defaultValue="claim">{Object.entries(CLEARANCE_KIND_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          <label className="wide">What<input name="label" required autoFocus placeholder="Diocesan crest on the banner · 'the bishop never visited' claim · Coca-Cola sign in b-roll" /></label>
          <label>Scene<select name="scene_id" defaultValue=""><option value="">—</option>{scenes.map((s) => <option key={s.id} value={s.id}>{s.number}. {s.title}</option>)}</select></label>
          <label>Segment (TC)<input name="segment" placeholder="00:12:40–00:13:05" /></label>
          <button type="submit" className="abtn">Add</button>
        </form>
      )}
      {rows.length === 0 && !adding && <p className="gcard-meta">Every person, archival piece, music cue, location, logo and factual claim in the cut gets a line and a color. Seed it from the project, then add the trademarks and claims by hand as you watch the cut. Green across the board is Gate B.</p>}
      <ul className="clear-list">{shown.map((c) => (
        <li key={c.id} className={`clear st-${c.status}`}>
          <button type="button" className={`dot-btn ${c.status}`} onClick={() => api.patch(c.id, { status: cycle[c.status] })} title={CLEARANCE_STATUS_LABEL[c.status]} aria-label="Cycle status" />
          <span className="clear-main"><strong>{c.label}</strong><em>{CLEARANCE_KIND_LABEL[c.kind]}{c.scene_id ? ` · ${scenes.find((s) => s.id === c.scene_id)?.title || ""}` : ""}{c.segment ? ` · ${c.segment}` : ""}{c.reviewed_at ? ` · ${fmtDate(c.reviewed_at.slice(0, 10))}` : ""}</em></span>
          <span className="gcard-actions"><Sel value={c.basis} options={CLEARANCE_BASIS_LABEL} onSave={(v) => api.patch(c.id, { basis: v })} aria-label="Basis" /><Blur className="clear-doc" value={c.doc} placeholder="doc / link" onSave={(v) => api.patch(c.id, { doc: v })} aria-label="Document" /><button type="button" className="prep-x" onClick={() => api.remove(c, c.label)} aria-label="Remove">×</button></span>
        </li>))}</ul>
    </section>
  );
}

export function MusicCard({ project, rows, setRows, scenes, fail, ready }) {
  const [adding, setAdding] = useState(false);
  if (!ready) return null;
  const api = useRows("cue", project, setRows, fail);
  async function add(e) { e.preventDefault(); const f = Object.fromEntries(new FormData(e.currentTarget).entries()); try { await api.add({ ...f, sort: rows.length }); setAdding(false); e.target.reset(); } catch (err) { fail(err); } }
  const temp = rows.filter((c) => c.source === "temp").length;
  return (
    <section className="cprof-card">
      <div className="cprof-cardhead"><h2>Music cues{rows.length > 0 && <em className="cprof-count">{rows.length}{temp ? ` · ${temp} temp` : ""}</em>}</h2><span className="gcard-actions"><button type="button" className="achip" disabled={!rows.length} onClick={() => download(`${project.code || "DOC"}_cue_sheet.csv`, buildCueSheet({ project, cues: rows, scenes }), "text/csv")}>Cue sheet ↓</button><button type="button" className="abtn" onClick={() => setAdding(!adding)}>{adding ? "Close" : "+ Cue"}</button></span></div>
      {adding && (
        <form className="shoot-new" onSubmit={add}>
          <label className="wide">Title<input name="title" required autoFocus placeholder="Be Thou My Vision (choir, 11am Mass)" /></label>
          <label>Composer / artist<input name="artist" /></label>
          <label>Publisher<input name="publisher" placeholder="OCP · GIA · PD" /></label>
          <label>Source<select name="source" defaultValue="temp">{Object.entries(MUSIC_SOURCE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          <label>Usage<select name="usage" defaultValue="bg">{Object.entries(MUSIC_USAGE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          <label>Scene<select name="scene_id" defaultValue=""><option value="">—</option>{scenes.map((s) => <option key={s.id} value={s.id}>{s.number}. {s.title}</option>)}</select></label>
          <button type="submit" className="abtn">Add</button>
        </form>
      )}
      {rows.length === 0 && !adding && <p className="gcard-meta">Every piece of music in the cut, including what the choir sings at Mass: you own that recording, the publisher owns the song. ONE License covers the parish&apos;s Sunday, not your film. Temp music must be gone by lock.</p>}
      <ul className="cprof-list cue-list">{rows.map((c) => (
        <li key={c.id} className={"cue" + (c.source === "temp" ? " is-temp" : "")}>
          <span className="cue-main"><strong>{c.title}</strong> <span className="gcard-meta">· {c.artist || "?"}{c.publisher ? ` / ${c.publisher}` : ""} · {MUSIC_USAGE_LABEL[c.usage]}{c.scene_id ? ` · ${scenes.find((s) => s.id === c.scene_id)?.title || ""}` : ""}{c.fee_cents ? ` · ${money(c.fee_cents)}` : ""}</span></span>
          <span className="gcard-actions">
            <Sel value={c.source} options={MUSIC_SOURCE_LABEL} onSave={(v) => api.patch(c.id, { source: v })} aria-label="Source" />
            <label className="achip">sync <Sel value={c.sync_status} options={LICENSE_STATUS_LABEL} onSave={(v) => api.patch(c.id, { sync_status: v })} aria-label="Sync" /></label>
            <label className="achip">master <Sel value={c.master_status} options={LICENSE_STATUS_LABEL} onSave={(v) => api.patch(c.id, { master_status: v })} aria-label="Master" /></label>
            <Blur className="cue-tc" value={mmss(c.in_s)} placeholder="in m:ss" onSave={(v) => api.patch(c.id, { in_s: toSecs(v) })} aria-label="In" />
            <Blur className="cue-tc" value={mmss(c.out_s)} placeholder="out" onSave={(v) => api.patch(c.id, { out_s: toSecs(v) })} aria-label="Out" />
            <Blur className="clear-doc" value={c.license_link} placeholder="license link" onSave={(v) => api.patch(c.id, { license_link: v })} aria-label="License" />
            <button type="button" className="prep-x" onClick={() => api.remove(c, c.title)} aria-label="Remove">×</button>
          </span>
        </li>))}</ul>
    </section>
  );
}

export function ArchivalCard({ project, rows, setRows, scenes, sources = [], releases = [], fail, ready }) {
  const [adding, setAdding] = useState(false);
  if (!ready) return null;
  const api = useRows("arch", project, setRows, fail);
  async function add(e) { e.preventDefault(); const f = Object.fromEntries(new FormData(e.currentTarget).entries()); try { await api.add(f); setAdding(false); e.target.reset(); } catch (err) { fail(err); } }
  const mats = releases.filter((r) => r.kind === "materials");
  return (
    <section className="cprof-card">
      <div className="cprof-cardhead"><h2>Archival{rows.length > 0 && <em className="cprof-count">{rows.filter((r) => r.status === "cleared").length}/{rows.length} cleared</em>}</h2><button type="button" className="abtn" onClick={() => setAdding(!adding)}>{adding ? "Close" : "+ Item"}</button></div>
      {adding && (
        <form className="shoot-new" onSubmit={add}>
          <label className="wide">What<input name="title" required autoFocus placeholder="1962 dedication photo · 1987 Leader clipping · parish 8mm reel" /></label>
          <label>Kind<select name="kind" defaultValue="photo">{Object.entries(ARCHIVAL_KIND_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          <label>Lender (who has it)<input name="lender" /></label>
          <label>Rights holder (who owns it — often not the lender)<input name="rights_holder" /></label>
          <label>Basis<select name="basis" defaultValue="unknown">{Object.entries(ARCHIVAL_BASIS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          <label>Scene<select name="scene_id" defaultValue=""><option value="">—</option>{scenes.map((s) => <option key={s.id} value={s.id}>{s.number}. {s.title}</option>)}</select></label>
          <button type="submit" className="abtn">Add</button>
        </form>
      )}
      {rows.length === 0 && !adding && <p className="gcard-meta">A photo lent by a parishioner isn&apos;t cleared by the lending. Who took it? When? A 1950s newspaper photo may still be the paper&apos;s. Write the reasoning down — that&apos;s what the E&amp;O carrier reads.</p>}
      <ul className="cprof-list">{rows.map((a) => (
        <li key={a.id} className={`arch st-${a.status} b-${a.basis}`}>
          <span><strong>{a.title}</strong> <span className="gcard-meta">· {ARCHIVAL_KIND_LABEL[a.kind]}{a.lender ? ` · from ${a.lender}` : ""}{a.rights_holder ? ` · rights: ${a.rights_holder}` : ""}{a.scene_id ? ` · ${scenes.find((s) => s.id === a.scene_id)?.title || ""}` : ""}</span>
            <Blur className="arch-reason" value={a.reasoning} placeholder="Reasoning — why this basis holds (PD: published 1925 w/o notice · fair use: commentary, 4s, low-res · license: # …)" onSave={(v) => api.patch(a.id, { reasoning: v })} aria-label="Reasoning" /></span>
          <span className="gcard-actions"><Sel value={a.basis} options={ARCHIVAL_BASIS_LABEL} onSave={(v) => api.patch(a.id, { basis: v })} aria-label="Basis" /><Sel value={a.status} options={ARCHIVAL_STATUS_LABEL} onSave={(v) => api.patch(a.id, { status: v })} aria-label="Status" />{a.basis === "materials_release" && <select className="achip" value={a.release_id || ""} onChange={(e) => api.patch(a.id, { release_id: e.target.value })} aria-label="Materials release"><option value="">release…</option>{mats.map((r) => <option key={r.id} value={r.id}>{r.signer_name} · {String(r.signed_at).slice(0, 10)}</option>)}</select>}<button type="button" className="prep-x" onClick={() => api.remove(a, a.title)} aria-label="Remove">×</button></span>
        </li>))}</ul>
    </section>
  );
}

export function LegalRegisterCard({ project, rows, setRows, locations = [], scenes = [], fail, ready }) {
  const [kind, setKind] = useState("contract");
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState(null);
  if (!ready) return null;
  const api = useRows("legal", project, setRows, fail);
  const def = LEGAL_KINDS[kind];
  const shown = rows.filter((r) => r.kind === kind);
  async function add(e) { e.preventDefault(); const f = Object.fromEntries(new FormData(e.currentTarget).entries()); const data = {}; for (const [k] of def.fields) if (f[`d_${k}`] !== undefined) { data[k] = f[`d_${k}`]; delete f[`d_${k}`]; } try { const r = await api.add({ ...f, kind, status: def.statuses[0], data }); setAdding(false); setOpen(r.row.id); e.target.reset(); } catch (err) { fail(err); } }
  const todayS = today();
  const count = (k) => { const l = rows.filter((r) => r.kind === k); return l.length ? `${l.filter((r) => isGood(r.status)).length}/${l.length}` : ""; };
  return (
    <section className="cprof-card">
      <div className="cprof-cardhead"><h2>Legal register</h2><button type="button" className="abtn" onClick={() => setAdding(!adding)}>{adding ? "Close" : `+ ${def.label.replace(/s$/, "")}`}</button></div>
      <span className="pbook-kinds">{Object.entries(LEGAL_KINDS).map(([k, d]) => <button key={k} type="button" className={"ifilter" + (kind === k ? " is-on" : "")} onClick={() => { setKind(k); setAdding(false); }}>{d.label} <em>{count(k)}</em></button>)}</span>
      {adding && (
        <form className="shoot-new" onSubmit={add}>
          <label className="wide">Title<input name="title" required autoFocus /></label>
          <label>Party / with<input name="party" /></label>
          <label>Date<input name="date" type="date" /></label>
          <label>Expires<input name="expires" type="date" /></label>
          {def.fields.map(([k, label, ph]) => <label key={k} className="wide">{label}<input name={`d_${k}`} placeholder={ph} /></label>)}
          <label className="wide">Link (Drive / PDF)<input name="link" placeholder="https://" /></label>
          <button type="submit" className="abtn">Add</button>
        </form>
      )}
      {shown.length === 0 && !adding && <p className="gcard-meta">{HINT[kind]}</p>}
      <ul className="people-list">{shown.map((x) => (
        <li key={x.id} className={"person" + (open === x.id ? " is-open" : "")}>
          <button type="button" className="person-row staff-row" onClick={() => setOpen(open === x.id ? null : x.id)}><span className="person-main"><strong>{x.title}</strong><em>{[x.party, x.date ? fmtDate(x.date) : "", x.expires ? `expires ${fmtDate(x.expires)}` : "", ...Object.entries(x.data || {}).filter(([, v]) => v).slice(0, 2).map(([, v]) => v)].filter(Boolean).join(" · ")}</em></span><span className="person-tags"><span className={"itag" + (isGood(x.status) ? " is-rel" : "") + (x.expires && x.expires < todayS ? " is-alert" : "")}>{LEGAL_STATUS_LABEL[x.status] || x.status}{x.expires && x.expires < todayS ? " · expired" : ""}</span></span></button>
          {open === x.id && (
            <div className="person-detail">
              <div className="gcard-actions"><Sel value={x.status} options={Object.fromEntries(def.statuses.map((s) => [s, LEGAL_STATUS_LABEL[s] || s]))} onSave={(v) => api.patch(x.id, { status: v })} aria-label="Status" />{x.link && <a className="achip" href={x.link} target="_blank" rel="noreferrer">Open ↗</a>}<button type="button" className="prep-x" onClick={() => api.remove(x, x.title)} aria-label="Remove">×</button></div>
              <div className="shoot-new scene-fields">
                <label>Party<Blur value={x.party} onSave={(v) => api.patch(x.id, { party: v })} /></label>
                <label>Date<Blur type="date" value={x.date || ""} onSave={(v) => api.patch(x.id, { date: v })} /></label>
                <label>Expires<Blur type="date" value={x.expires || ""} onSave={(v) => api.patch(x.id, { expires: v })} /></label>
                <label>Link<Blur value={x.link} onSave={(v) => api.patch(x.id, { link: v })} /></label>
                {(kind === "permit" || kind === "coi" || kind === "drone" || kind === "permission") && <label>Location<select value={x.location_id || ""} onChange={(e) => api.patch(x.id, { location_id: e.target.value })}><option value="">—</option>{locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></label>}
                {(kind === "defamation" || kind === "fair_use" || kind === "credit") && <label>Scene<select value={x.scene_id || ""} onChange={(e) => api.patch(x.id, { scene_id: e.target.value })}><option value="">—</option>{scenes.map((s) => <option key={s.id} value={s.id}>{s.number}. {s.title}</option>)}</select></label>}
                {def.fields.map(([k, label, ph]) => <label key={k} className="wide">{label}<Blur value={x.data?.[k] || ""} placeholder={ph} onSave={(v) => api.patch(x.id, { data: { ...(x.data || {}), [k]: v } })} /></label>)}
                <label className="wide">Notes<textarea rows={2} defaultValue={x.notes} onBlur={(e) => e.target.value !== x.notes && api.patch(x.id, { notes: e.target.value })} /></label>
              </div>
            </div>
          )}
        </li>))}</ul>
    </section>
  );
}
const HINT = {
  contract: "The client master agreement (once), the composer agreement (once), crew and vendor templates, the transcription vendor's no-training clause. Status Signed is what Gate A reads.",
  permission: "Diocese of Rochester wants it in writing: interiors, filming during Mass, drone over the property, clergy on camera, use of the crest. One line each.",
  policy: "GL · equipment · auto · workers' comp (NY requires it for crew) · drone · E&O (before delivery). Put the expiry on every one — the gate watches it.",
  coi: "Who asked for a certificate, whether they're additional insured, and when it was delivered.",
  permit: "City of Corning for sidewalks and street b-roll; NYS Parks bans drones outright. County for anything on their land.",
  drone: "One line per flight: pilot cert, airspace / LAANC, Remote ID, over-people category, local ordinance checked, weather at launch. Scrubbed flights count too.",
  safety: "Risk assessment per location type, the emergency card the crew carries, briefing acknowledgements, any incident. Gate A wants the first two.",
  title: "Everything that proves you own the film: assignments, work-for-hire, licenses, the copyright registration once it's locked. The binder the E&O carrier asks for.",
  fair_use: "Where you rely on fair use instead of a license, the attorney's letter for that item. Log the request, then the opinion.",
  defamation: "Before lock: every factual claim about a living person or an institution, who says it, what supports it. The attorney signs one line at the end.",
  credit: "Exact credit text each license, deal memo or lender requires — and the disclaimers. Verified against the final credits at timecode.",
  revocation: "Someone wants out after signing. Log what they asked, what you did, whether the attorney was involved. Closed or declined before lock.",
  minor: "Every child who appears: guardian, how they appear, whether crew near them have safe-environment training (diocesan policy). Released or excluded.",
};
