"use client";

// Sprint 7 (owner): post dashboard, deliverables + QC + handoff, archive +
// retention, follow-ups, premiere, crew pay (timesheets → invoices → 1099),
// vendors + POs, travel, daily production reports.
import { useState } from "react";
import { P } from "./ProductionCards";
import { DELIVERABLE_KINDS, DELIVERABLE_STATUS_LABEL, QC_CHECKS, FOLLOWUP_KIND_LABEL, VENDOR_SERVICES, TRAVEL_KIND_LABEL, IRS_MILEAGE_CENTS, TEN99_THRESHOLD_CENTS, buildDailyReportText } from "../lib/finish";
import { CUT_STAGE_LABEL } from "../lib/edit";
import { money } from "../lib/production";

const SqlHint = ({ what }) => <p className="sm-sqlhint">{what} needs <code>supabase/sprint7.sql</code> run once in the Supabase SQL editor.</p>;
const fmtDate = (d) => (d ? new Date(`${String(d).slice(0, 10)}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "");
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
const gb = (b) => (b ? `${(b / 1e9).toFixed(b > 1e10 ? 0 : 2)} GB` : "");
const download = (name, text, type = "text/plain") => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); };
function useRows(prefix, project, setRows, fail, { prepend = false } = {}) {
  return {
    add: async (fields) => { const r = await P({ action: `${prefix}-add`, projectId: project.id, ...fields }); setRows((l) => (prepend ? [r.row, ...l] : [...l, r.row])); return r; },
    patch: async (id, fields) => { try { const r = await P({ action: `${prefix}-update`, id, ...fields }); setRows((l) => l.map((x) => (x.id === id ? r.row : x))); return r.row; } catch (e) { fail(e); } },
    remove: async (x, label) => { if (!window.confirm(`Delete ${label || "this"}?`)) return; try { await P({ action: `${prefix}-delete`, id: x.id }); setRows((l) => l.filter((y) => y.id !== x.id)); } catch (e) { fail(e); } },
  };
}
const Blur = ({ value, onSave, ...rest }) => <input defaultValue={value ?? ""} onBlur={(e) => e.target.value !== String(value ?? "") && onSave(e.target.value)} {...rest} />;
const Sel = ({ value, onSave, options, ...rest }) => <select className="achip" value={value} onChange={(e) => onSave(e.target.value)} {...rest}>{Object.entries(options).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>;

export function PostDashboard({ clips = [], selects = [], cuts = [], clearance = [], deliverables = [], gates, payments = [], ready }) {
  if (!ready) return <section className="cprof-card"><div className="cprof-cardhead"><h2>Post</h2></div><SqlHint what="The finish" /></section>;
  const latest = cuts[0];
  const tiles = [
    [clips.length, "clips logged", `${clips.filter((c) => c.proxy_key).length} proxied · ${clips.filter((c) => c.transcript_status === "done").length} transcribed`],
    [selects.length, "selects", `${new Set(selects.map((s) => s.scene_id).filter(Boolean)).size} scenes covered`],
    [latest ? `${CUT_STAGE_LABEL[latest.stage]} v${latest.version}` : "—", "current cut", latest?.runtime_s ? `${Math.round(latest.runtime_s / 60)} min` : ""],
    [clearance.length ? `${Math.round(100 * clearance.filter((c) => c.status === "green").length / clearance.length)}%` : "—", "clearance green", `${clearance.filter((c) => c.status === "red").length} red`],
    [`${deliverables.filter((d) => ["delivered", "acknowledged"].includes(d.status)).length}/${deliverables.length}`, "delivered", `${deliverables.filter((d) => d.status === "qc").length} in QC`],
    [gates ? `${gates.B.passed}/${gates.B.total}` : "—", "gate B", gates ? `C ${gates.C.passed}/${gates.C.total}` : ""],
    [payments.length ? money(payments.filter((p) => p.status === "paid").reduce((a, p) => a + p.amount_cents, 0)) : "—", "paid", payments.length ? `of ${money(payments.filter((p) => p.status !== "waived").reduce((a, p) => a + p.amount_cents, 0))}` : ""],
  ];
  return <section className="cprof-card"><div className="proj-stats post-stats">{tiles.map(([v, l, s], i) => <div key={i}><strong>{v}</strong><em>{l}</em>{s && <small>{s}</small>}</div>)}</div></section>;
}

export function DeliverablesCard({ project, rows, setRows, onProject, payments = [], fail, say, ready }) {
  const [open, setOpen] = useState(null);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState("");
  if (!ready) return null;
  const api = useRows("deliverable", project, setRows, fail);
  const unpaid = payments.some((p) => !["paid", "waived"].includes(p.status));
  async function seed() { try { const r = await P({ action: "deliverables-seed", projectId: project.id }); setRows(r.rows); say("Standard package"); } catch (e) { fail(e); } }
  async function add(e) { e.preventDefault(); const f = Object.fromEntries(new FormData(e.currentTarget).entries()); try { await api.add({ ...f, sort: rows.length }); setAdding(false); e.target.reset(); } catch (err) { fail(err); } }
  async function upload(d, e) {
    const f = e.target.files?.[0]; e.target.value = ""; if (!f) return;
    if (f.size > 4.5e9) { fail(new Error("Over 4.5 GB — put masters on the archive drive and paste a link instead")); return; }
    setBusy(d.id);
    try {
      const s = await P({ action: "deliverable-sign", id: d.id, filename: f.name, contentType: f.type || "application/octet-stream" });
      const r = await fetch(s.url, { method: "PUT", body: f, headers: { "content-type": f.type || "application/octet-stream" } }); if (!r.ok) throw new Error(`Upload failed (${r.status})`);
      let checksum = ""; if (f.size < 1.5e9 && window.crypto?.subtle) { try { const h = await crypto.subtle.digest("SHA-256", await f.arrayBuffer()); checksum = "sha256:" + [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join(""); } catch {} }
      const done = await P({ action: "deliverable-done", id: d.id, key: s.key, size_bytes: f.size, checksum }); setRows((l) => l.map((x) => (x.id === d.id ? done.row : x))); say("Up — now QC it");
    } catch (err) { fail(err); } finally { setBusy(""); }
  }
  async function deliverProject() {
    if (!window.confirm("Mark the project delivered? Stamps today, sets 3-year retention, schedules the follow-ups.")) return;
    try { const r = await P({ action: "project-deliver", projectId: project.id }); onProject(null, r.project); say("Delivered. Follow-ups scheduled."); window.setTimeout(() => window.location.reload(), 800); } catch (e) { fail(e); }
  }
  const qcDone = (d) => QC_CHECKS.every(([k]) => d.qc?.checks?.[k]);
  return (
    <section className="cprof-card">
      <div className="cprof-cardhead"><h2>Deliverables{rows.length > 0 && <em className="cprof-count">{rows.filter((d) => ["delivered", "acknowledged"].includes(d.status)).length}/{rows.length}</em>}</h2>
        <span className="gcard-actions">{rows.length === 0 && <button type="button" className="achip" onClick={seed}>Standard package</button>}<button type="button" className="achip" onClick={() => setAdding(!adding)}>{adding ? "Close" : "+ Line"}</button>{!project.delivered_at ? <button type="button" className="abtn" onClick={deliverProject} disabled={!rows.length}>Mark project delivered</button> : <span className="itag is-rel">Delivered {fmtDate(project.delivered_at)}</span>}</span></div>
      {unpaid && <p className="gcard-meta">⚠ A payment is still open — masters, textless, stems and the archive stay locked in the portal until it clears. Everything else hands over normally.</p>}
      {adding && <form className="shoot-new" onSubmit={add}><label>Kind<select name="kind" defaultValue="other">{Object.entries(DELIVERABLE_KINDS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label><label className="wide">Name<input name="name" required autoFocus /></label><label className="wide">Spec<input name="spec" placeholder="codec · resolution · fps · loudness" /></label><button type="button" className="abtn" onClick={(e) => e.currentTarget.form.requestSubmit()}>Add</button></form>}
      {rows.length === 0 && !adding && <p className="gcard-meta">The package a $50–100k film hands over: masters, textless, web, captions, stems, trailer, cutdowns, stills, cue sheet, transcript, credits, archive. Each one gets a QC pass before it&apos;s marked delivered. &ldquo;Standard package&rdquo; lays it out.</p>}
      <ul className="people-list">{rows.map((d) => (
        <li key={d.id} className={"person" + (open === d.id ? " is-open" : "")}>
          <button type="button" className="person-row staff-row" onClick={() => setOpen(open === d.id ? null : d.id)}><span className="person-main"><strong>{d.name}</strong><em>{[DELIVERABLE_KINDS[d.kind], d.file_key ? gb(d.size_bytes) : d.link ? "linked" : "no file", d.delivered_at ? `delivered ${fmtDate(d.delivered_at)}` : "", d.ack_name ? `received by ${d.ack_name}` : ""].filter(Boolean).join(" · ")}</em></span><span className="person-tags">{d.status === "qc" && <span className={"itag" + (qcDone(d) ? " is-rel" : "")}>QC {QC_CHECKS.filter(([k]) => d.qc?.checks?.[k]).length}/{QC_CHECKS.length}</span>}<span className={"itag" + (["delivered", "acknowledged"].includes(d.status) ? " is-rel" : "")}>{DELIVERABLE_STATUS_LABEL[d.status]}</span></span></button>
          {open === d.id && (
            <div className="person-detail">
              <div className="gcard-actions">
                <Sel value={d.status} options={DELIVERABLE_STATUS_LABEL} onSave={(v) => { if (v === "delivered" && d.status === "qc" && !qcDone(d) && !window.confirm("QC isn't complete. Deliver anyway?")) return; api.patch(d.id, { status: v }); }} aria-label="Status" />
                <label className="achip">{busy === d.id ? "Uploading…" : d.file_key ? "Replace file" : "Upload file"}<input type="file" hidden onChange={(e) => upload(d, e)} disabled={Boolean(busy)} /></label>
                {d.file_key && <button type="button" className="achip" onClick={async () => { const r = await P({ action: "deliverable-url", id: d.id }); if (r.url) window.open(r.url, "_blank"); }}>Download ↗</button>}
                <button type="button" className={"achip" + (d.client_visible ? " is-on" : "")} onClick={() => api.patch(d.id, { client_visible: !d.client_visible })}>{d.client_visible ? "in portal when delivered" : "hidden"}</button>
                <button type="button" className="prep-x" onClick={() => api.remove(d, d.name)} aria-label="Remove">×</button>
              </div>
              <div className="shoot-new scene-fields">
                <label className="wide">Spec<Blur value={d.spec} onSave={(v) => api.patch(d.id, { spec: v })} /></label>
                <label className="wide">Link (if it lives on a drive / Vimeo / Frame.io)<Blur value={d.link} onSave={(v) => api.patch(d.id, { link: v })} placeholder="https://" /></label>
                <label>Checksum<Blur value={d.checksum} onSave={(v) => api.patch(d.id, { checksum: v })} placeholder="xxh64 / sha256" /></label>
              </div>
              <div className="qc"><span className="kick-sm">QC checklist {d.qc?.by ? `· ${d.qc.by} ${fmtDate(d.qc.at)}` : ""}</span>
                <ul className="shoot-check">{QC_CHECKS.map(([k, label]) => <li key={k}><label><input type="checkbox" checked={Boolean(d.qc?.checks?.[k])} onChange={(e) => api.patch(d.id, { qc: { ...(d.qc || {}), checks: { ...(d.qc?.checks || {}), [k]: e.target.checked }, by: d.qc?.by || "Brandon", at: today() } })} /> <span>{label}</span></label></li>)}</ul>
                <Blur className="qc-notes" value={d.qc?.notes || ""} placeholder="QC notes — what you fixed, what you accepted" onSave={(v) => api.patch(d.id, { qc: { ...(d.qc || {}), notes: v } })} aria-label="QC notes" />
              </div>
            </div>
          )}
        </li>))}</ul>
      <div className="shoot-new scene-fields handoff">
        <label className="wide">Usage rights — plain English, shown on the client&apos;s delivery page<textarea rows={3} defaultValue={project.usage_rights} placeholder="You own the finished film and may show it anywhere, forever: church, website, social, local TV, festivals. You may not re-edit it or sell it as footage. Roth Media may show it in its portfolio and submit it to festivals. Raw footage stays with Roth Media unless the archive drive is purchased." onBlur={(e) => e.target.value !== project.usage_rights && onProject({ usage_rights: e.target.value })} /></label>
        <label>Retention until<Blur type="date" value={project.retention_until || ""} onSave={(v) => onProject({ retention_until: v })} /></label>
        <label>Archive location<Blur value={project.archive?.location || ""} placeholder="LTO-9 #3 + RothSandisk + R2 cold" onSave={(v) => onProject({ archive: { ...(project.archive || {}), location: v } })} /></label>
        <label className="wide">Archive manifest (paths · bytes · hash) — paste from the offload tool<textarea rows={3} defaultValue={project.archive?.manifest || ""} onBlur={(e) => e.target.value !== (project.archive?.manifest || "") && onProject({ archive: { ...(project.archive || {}), manifest: e.target.value } })} /></label>
      </div>
    </section>
  );
}

export function FollowupsCard({ project, rows, setRows, fail, ready }) {
  const [adding, setAdding] = useState(false);
  if (!ready) return null;
  const api = useRows("followup", project, setRows, fail);
  async function add(e) { e.preventDefault(); const f = Object.fromEntries(new FormData(e.currentTarget).entries()); try { await api.add({ kind: "custom", ...f }); setAdding(false); e.target.reset(); } catch (err) { fail(err); } }
  const t = today();
  return (
    <section className="cprof-card">
      <div className="cprof-cardhead"><h2>After delivery{rows.length > 0 && <em className="cprof-count">{rows.filter((x) => x.status === "scheduled" && x.due <= t).length} due</em>}</h2><button type="button" className="achip" onClick={() => setAdding(!adding)}>{adding ? "Close" : "+ One"}</button></div>
      {adding && <form className="shoot-new" onSubmit={add}><label className="wide">What<input name="label" required autoFocus /></label><label>When<input name="due" type="date" defaultValue={t} /></label><button type="submit" className="abtn">Add</button></form>}
      {rows.length === 0 && !adding && <p className="gcard-meta">Scheduled when you mark the project delivered: testimonial +7d, referral +30d, anniversary +11mo, purge notice 60d before retention ends. They show up in your morning email when due — you send the text yourself.</p>}
      <ul className="cprof-list">{rows.map((f) => <li key={f.id} className={"fu" + (f.status !== "scheduled" ? " is-done" : f.due <= t ? " is-due" : "")}><span><strong>{fmtDate(f.due)}</strong> · {f.label} <span className="gcard-meta">· {FOLLOWUP_KIND_LABEL[f.kind]}{f.done_at ? ` · ${f.status} ${fmtDate(f.done_at)}` : ""}</span></span><span className="gcard-actions">{f.status === "scheduled" ? <><button type="button" className="achip achip-primary" onClick={() => api.patch(f.id, { status: "done" })}>done</button><button type="button" className="achip" onClick={() => api.patch(f.id, { status: "skipped" })}>skip</button></> : <button type="button" className="achip" onClick={() => api.patch(f.id, { status: "scheduled" })}>reopen</button>}<button type="button" className="prep-x" onClick={() => api.remove(f, f.label)} aria-label="Remove">×</button></span></li>)}</ul>
    </section>
  );
}

export function PremiereCard({ project, onProject, ready }) {
  if (!ready) return null;
  const pr = project.premiere || {};
  const set = (k, v) => onProject({ premiere: { ...pr, [k]: v } });
  return (
    <section className="cprof-card">
      <div className="cprof-cardhead"><h2>Premiere</h2><span className="gcard-meta">The night the parish sees it. Plan it like a shoot day.</span></div>
      <div className="shoot-new scene-fields">
        <label>Date<Blur type="date" value={pr.date || ""} onSave={(v) => set("date", v)} /></label>
        <label>Time<Blur value={pr.time || ""} placeholder="7:00 PM · doors 6:30" onSave={(v) => set("time", v)} /></label>
        <label className="wide">Venue<Blur value={pr.venue || ""} placeholder="St. Mary's nave · parish hall · Palace Theatre" onSave={(v) => set("venue", v)} /></label>
        <label>Capacity / RSVP<Blur value={pr.rsvp || ""} placeholder="220 · RSVP link" onSave={(v) => set("rsvp", v)} /></label>
        <label>Projection + sound<Blur value={pr.tech || ""} placeholder="who brings the projector · screen size · PA · test at 4pm" onSave={(v) => set("tech", v)} /></label>
        <label className="wide">Run of show<textarea rows={5} defaultValue={pr.run || ""} placeholder={"6:30 doors · music, slideshow of stills\n7:00 Fr. Matthew welcome (3 min)\n7:05 Brandon: how it was made (3 min)\n7:10 the film (52 min)\n8:05 Q&A with the people in it (15 min)\n8:20 reception · prints on tables · QR to the trailer"} onBlur={(e) => e.target.value !== (pr.run || "") && set("run", e.target.value)} /></label>
        <label className="wide">Press / parish bulletin / social<textarea rows={2} defaultValue={pr.press || ""} placeholder="The Leader · diocesan Courier · bulletin 2 Sundays out · trailer on the parish FB the Monday before" onBlur={(e) => e.target.value !== (pr.press || "") && set("press", e.target.value)} /></label>
        <label className="wide">Notes<textarea rows={2} defaultValue={pr.notes || ""} onBlur={(e) => e.target.value !== (pr.notes || "") && set("notes", e.target.value)} /></label>
      </div>
    </section>
  );
}

export function CrewPayCard({ project, team = [], days = [], sheets, setSheets, invoices, setInvoices, fail, say, ready }) {
  const [who, setWho] = useState(team[0]?.id || "");
  const [adding, setAdding] = useState(false);
  if (!ready) return null;
  const tapi = useRows("timesheet", project, setSheets, fail);
  const iapi = useRows("cinv", project, setInvoices, fail, { prepend: true });
  const m = team.find((x) => x.id === who);
  const mine = sheets.filter((s) => s.staff_id === who);
  const open = mine.filter((s) => s.approved && !s.invoice_id);
  async function add(e) { e.preventDefault(); const f = Object.fromEntries(new FormData(e.currentTarget).entries()); try { await tapi.add({ ...f, staff_id: who, kit: f.kit === "on" }); setAdding(false); e.target.reset(); } catch (err) { fail(err); } }
  async function build() { try { const r = await P({ action: "invoice-build", projectId: project.id, staff_id: who }); setInvoices((l) => [r.row, ...l]); setSheets((l) => l.map((s) => r.sheets.find((x) => x.id === s.id) || s)); say(`${r.row.number} · ${money(r.row.amount_cents)}`); } catch (e) { fail(e); } }
  const year = today().slice(0, 4);
  const paidBy = {}; for (const inv of invoices) if (inv.status === "paid" && String(inv.paid_at || "").startsWith(year)) paidBy[inv.staff_id] = (paidBy[inv.staff_id] || 0) + inv.amount_cents;
  const rate = m ? (m.project_rate_cents ?? m.rate_cents ?? 0) : 0;
  return (
    <section className="cprof-card">
      <div className="cprof-cardhead"><h2>Crew pay</h2><span className="gcard-actions"><select className="achip" value={who} onChange={(e) => setWho(e.target.value)} aria-label="Crew member">{team.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select><button type="button" className="achip" onClick={() => setAdding(!adding)} disabled={!who}>{adding ? "Close" : "+ Day"}</button><button type="button" className="abtn" disabled={!open.length} onClick={build}>Invoice {open.length ? `${open.length} day${open.length > 1 ? "s" : ""}` : ""}</button></span></div>
      {!team.length && <p className="gcard-meta">Add crew on Days &amp; crew → Team first.</p>}
      {m && <p className="gcard-meta">{m.name} · {m.position || m.title || "crew"} · {rate ? `${money(rate)} / ${m.rate_type || "day"}` : "no rate set"}{m.kit_fee_cents ? ` · kit ${money(m.kit_fee_cents)}/day` : ""} · {m.tax_status || "1099"}{!m.deal_release_id ? " · ⚠ no deal memo" : ""}</p>}
      {adding && (
        <form className="shoot-new" onSubmit={add}>
          <label>Date<input name="date" type="date" required defaultValue={today()} /></label>
          <label>Day<select name="shoot_id" defaultValue=""><option value="">—</option>{days.map((d) => <option key={d.id} value={d.id}>{fmtDate(d.date)} · {d.title}</option>)}</select></label>
          <label>Call<input name="call_time" placeholder="7:00" /></label><label>Wrap<input name="wrap_time" placeholder="17:30" /></label>
          <label>Hours<input name="hours" type="number" step="0.5" defaultValue="10" /></label><label>OT hours<input name="ot_hours" type="number" step="0.5" defaultValue="0" /></label>
          <label>Miles<input name="miles" type="number" step="1" defaultValue="0" /></label><label>Per diem ($)<input name="per_diem" type="number" step="1" defaultValue="0" onChange={(e) => { e.target.form.per_diem_cents.value = Math.round(Number(e.target.value) * 100); }} /><input type="hidden" name="per_diem_cents" defaultValue="0" /></label>
          <label className="pbook-auto"><input type="checkbox" name="kit" defaultChecked={Boolean(m?.kit_fee_cents)} /> Kit fee</label>
          <label className="wide">Notes<input name="notes" placeholder="B-cam + sound" /></label>
          <button type="submit" className="abtn">Add</button>
        </form>
      )}
      <ul className="cprof-list">{mine.map((s) => <li key={s.id} className={"ts" + (s.invoice_id ? " is-done" : "")}><span><strong>{fmtDate(s.date)}</strong> <span className="gcard-meta">· {s.hours} h{Number(s.ot_hours) ? ` + ${s.ot_hours} OT` : ""}{s.kit ? " · kit" : ""}{Number(s.miles) ? ` · ${s.miles} mi` : ""}{s.notes ? ` · ${s.notes}` : ""}{s.invoice_id ? " · invoiced" : ""}</span></span><span className="gcard-actions">{!s.invoice_id && <button type="button" className={"achip" + (s.approved ? " is-on" : "")} onClick={() => tapi.patch(s.id, { approved: !s.approved })}>{s.approved ? "approved ✓" : "approve"}</button>}{!s.invoice_id && <button type="button" className="prep-x" onClick={() => tapi.remove(s, "this day")} aria-label="Remove">×</button>}</span></li>)}</ul>
      {invoices.filter((i) => i.staff_id === who).length > 0 && <div className="cs-block"><span className="kick-sm">Invoices</span><ul className="cprof-list">{invoices.filter((i) => i.staff_id === who).map((i) => <li key={i.id}><span><strong>{i.number}</strong> <span className="gcard-meta">· {fmtDate(i.period_from)}–{fmtDate(i.period_to)} · {money(i.amount_cents)} · {(i.lines || []).length} lines{i.paid_at ? ` · paid ${fmtDate(i.paid_at)}` : ""}</span></span><span className="gcard-actions"><Sel value={i.status} options={{ draft: "Draft", sent: "Sent", approved: "Approved", paid: "Paid" }} onSave={(v) => iapi.patch(i.id, { status: v })} aria-label="Status" /><button type="button" className="achip" onClick={() => download(`${i.number}.csv`, ["Date,Item,Amount", ...(i.lines || []).map((l) => `${l.date},"${l.label.replace(/"/g, '""')}",${(l.cents / 100).toFixed(2)}`), `,,${(i.amount_cents / 100).toFixed(2)}`].join("\n"), "text/csv")}>CSV</button><button type="button" className="prep-x" onClick={() => iapi.remove(i, i.number)} aria-label="Remove">×</button></span></li>)}</ul></div>}
      <p className="gcard-meta">1099 {year}: {team.map((t) => `${t.name.split(" ")[0]} ${money(paidBy[t.id] || 0)}${(paidBy[t.id] || 0) >= TEN99_THRESHOLD_CENTS ? " ⚑" : ""}`).join(" · ") || "—"} — ⚑ over the threshold, needs a W-9 and a 1099-NEC in January. NY Freelance Isn&apos;t Free: written deal + paid within 30 days. Mileage at {IRS_MILEAGE_CENTS}¢.</p>
    </section>
  );
}

export function VendorsCard({ project, vendors, setVendors, pos, setPos, lines = [], fail, ready }) {
  const [addV, setAddV] = useState(false);
  const [addP, setAddP] = useState(false);
  if (!ready) return null;
  const vapi = useRows("vendor", project, setVendors, fail);
  const papi = useRows("po", project, setPos, fail);
  async function addVendor(e) { e.preventDefault(); const f = Object.fromEntries(new FormData(e.currentTarget).entries()); try { await vapi.add({ ...f, w9: f.w9 === "on", coi: f.coi === "on" }); setAddV(false); e.target.reset(); } catch (err) { fail(err); } }
  async function addPo(e) { e.preventDefault(); const f = Object.fromEntries(new FormData(e.currentTarget).entries()); try { const r = await P({ action: "po-add", projectId: project.id, ...f, amount_cents: Math.round(Number(f.amount) * 100) || 0 }); setPos((l) => [...l, r.row]); setAddP(false); e.target.reset(); } catch (err) { fail(err); } }
  const vn = Object.fromEntries(vendors.map((v) => [v.id, v.name]));
  return (
    <section className="cprof-card">
      <div className="cprof-cardhead"><h2>Vendors &amp; POs{pos.length > 0 && <em className="cprof-count">{money(pos.reduce((a, p) => a + p.amount_cents, 0))} committed</em>}</h2><span className="gcard-actions"><button type="button" className="achip" onClick={() => { setAddV(!addV); setAddP(false); }}>{addV ? "Close" : "+ Vendor"}</button><button type="button" className="abtn" onClick={() => { setAddP(!addP); setAddV(false); }} disabled={!vendors.length}>{addP ? "Close" : "+ PO"}</button></span></div>
      {addV && <form className="shoot-new" onSubmit={addVendor}><label>Name<input name="name" required autoFocus /></label><label>Service<select name="service" defaultValue="other">{VENDOR_SERVICES.map((s) => <option key={s} value={s}>{s}</option>)}</select></label><label>Contact<input name="contact" /></label><label>Email<input name="email" type="email" /></label><label>Phone<input name="phone" /></label><label className="pbook-auto"><input type="checkbox" name="w9" /> W-9 on file</label><label className="pbook-auto"><input type="checkbox" name="coi" /> COI on file</label><button type="submit" className="abtn">Add</button></form>}
      {addP && <form className="shoot-new" onSubmit={addPo}><label>Vendor<select name="vendor_id" required>{vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</select></label><label>Amount ($)<input name="amount" type="number" step="1" /></label><label>Date<input name="date" type="date" defaultValue={today()} /></label><label className="wide">For<input name="description" required placeholder="Original score — 12 cues, WFH, delivery by Dec 1" /></label><label>Budget line<select name="budget_line_id" defaultValue=""><option value="">—</option>{lines.map((l) => <option key={l.id} value={l.id}>{l.code ? `${l.code} ` : ""}{l.label || l.name}</option>)}</select></label><button type="submit" className="abtn">Issue</button></form>}
      {vendors.length === 0 && !addV && <p className="gcard-meta">Composer, colorist, mixer, transcription, drone sub, broker, attorney. W-9 and COI before the first payment. POs make the commitment visible before the invoice arrives.</p>}
      {vendors.length > 0 && <ul className="cprof-list vend-list">{vendors.map((v) => <li key={v.id}><span><strong>{v.name}</strong> <span className="gcard-meta">· {v.service}{v.contact ? ` · ${v.contact}` : ""}{v.email ? ` · ${v.email}` : ""}</span></span><span className="gcard-actions"><button type="button" className={"achip" + (v.w9 ? " is-on" : "")} onClick={() => vapi.patch(v.id, { w9: !v.w9 })}>W-9</button><button type="button" className={"achip" + (v.coi ? " is-on" : "")} onClick={() => vapi.patch(v.id, { coi: !v.coi })}>COI</button><button type="button" className="prep-x" onClick={() => vapi.remove(v, v.name)} aria-label="Remove">×</button></span></li>)}</ul>}
      {pos.length > 0 && <div className="cs-block"><span className="kick-sm">Purchase orders</span><ul className="cprof-list">{pos.map((p) => <li key={p.id}><span><strong>PO-{String(p.number).padStart(3, "0")}</strong> {vn[p.vendor_id] || "—"} · {p.description} <span className="gcard-meta">· {money(p.amount_cents)}{p.date ? ` · ${fmtDate(p.date)}` : ""}</span></span><span className="gcard-actions"><Sel value={p.status} options={{ draft: "Draft", sent: "Sent", received: "Received", paid: "Paid" }} onSave={(v) => papi.patch(p.id, { status: v })} aria-label="Status" /><button type="button" className="prep-x" onClick={() => papi.remove(p, `PO-${p.number}`)} aria-label="Remove">×</button></span></li>)}</ul></div>}
    </section>
  );
}

export function TravelCard({ project, rows, setRows, days = [], fail, ready }) {
  const [adding, setAdding] = useState(false);
  if (!ready) return null;
  const api = useRows("travel", project, setRows, fail, { prepend: true });
  async function add(e) { e.preventDefault(); const f = Object.fromEntries(new FormData(e.currentTarget).entries()); const miles = Number(f.miles) || 0; try { await api.add({ ...f, miles, amount_cents: f.kind === "mileage" ? Math.round(miles * IRS_MILEAGE_CENTS) : Math.round(Number(f.amount) * 100) || 0 }); setAdding(false); e.target.reset(); } catch (err) { fail(err); } }
  const total = rows.reduce((a, r) => a + r.amount_cents, 0);
  return (
    <section className="cprof-card">
      <div className="cprof-cardhead"><h2>Travel{rows.length > 0 && <em className="cprof-count">{money(total)} · {rows.reduce((a, r) => a + Number(r.miles || 0), 0)} mi</em>}</h2><button type="button" className="achip" onClick={() => setAdding(!adding)}>{adding ? "Close" : "+ Entry"}</button></div>
      {adding && <form className="shoot-new" onSubmit={add}><label>Kind<select name="kind" defaultValue="mileage">{Object.entries(TRAVEL_KIND_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label><label>Date<input name="date" type="date" defaultValue={today()} /></label><label>Who<input name="who" placeholder="Brandon" /></label><label>Day<select name="shoot_id" defaultValue=""><option value="">—</option>{days.map((d) => <option key={d.id} value={d.id}>{fmtDate(d.date)} · {d.title}</option>)}</select></label><label className="wide">From → to / what<input name="from_to" placeholder="Sayre → Corning → Sayre · 46 mi" /></label><label>Miles<input name="miles" type="number" step="1" /></label><label>Amount ($, non-mileage)<input name="amount" type="number" step="0.01" /></label><button type="submit" className="abtn">Add</button></form>}
      {rows.length === 0 && !adding && <p className="gcard-meta">Mileage at the IRS rate, lodging, meals, fares. Billable if the agreement says so; deductible either way.</p>}
      <ul className="cprof-list">{rows.map((r) => <li key={r.id}><span><strong>{fmtDate(r.date)}</strong> · {TRAVEL_KIND_LABEL[r.kind]}{r.who ? ` · ${r.who}` : ""} · {r.from_to} <span className="gcard-meta">· {money(r.amount_cents)}{Number(r.miles) ? ` · ${r.miles} mi` : ""}</span></span><button type="button" className="prep-x" onClick={() => api.remove(r, "this entry")} aria-label="Remove">×</button></li>)}</ul>
    </section>
  );
}

export function ReportsCard({ project, days = [], reports, setReports, rolls = [], scenes = [], fail, say, ready }) {
  const [open, setOpen] = useState(null);
  if (!ready) return null;
  const t = today();
  const past = days.filter((d) => d.date && d.date <= t).sort((a, b) => b.date.localeCompare(a.date));
  const rep = (d) => reports.find((r) => r.shoot_id === d.id) || null;
  async function save(d, fields) {
    const r0 = rep(d) || {};
    const cs = d.callsheet || {};
    const base = r0.id ? {} : { date: d.date, call_actual: cs.general_call || cs.call || "", crew_present: (cs.crew || []).map((c) => c.name || c).join(", "), rolls: rolls.filter((r) => r.shoot_id === d.id).map((r) => r.roll_name).join(", "), scenes_shot: (d.scene_ids || []).map((id) => scenes.find((s) => s.id === id)?.title).filter(Boolean).join(", ") };
    try { const r = await P({ action: "report-upsert", projectId: project.id, shoot_id: d.id, ...base, ...fields }); setReports((l) => (l.some((x) => x.id === r.row.id) ? l.map((x) => (x.id === r.row.id ? r.row : x)) : [...l, r.row])); } catch (e) { fail(e); }
  }
  const F = ({ d, k, label, rows = 0, ph = "" }) => { const r = rep(d) || {}; return <label className={rows || /notes|issues|scenes|next/.test(k) ? "wide" : ""}>{label}{rows ? <textarea rows={rows} defaultValue={r[k] || ""} placeholder={ph} onBlur={(e) => e.target.value !== (r[k] || "") && save(d, { [k]: e.target.value })} /> : <input defaultValue={r[k] ?? ""} placeholder={ph} onBlur={(e) => String(e.target.value) !== String(r[k] ?? "") && save(d, { [k]: e.target.value })} />}</label>; };
  return (
    <section className="cprof-card">
      <div className="cprof-cardhead"><h2>Daily reports{past.length > 0 && <em className="cprof-count">{past.filter((d) => rep(d)).length}/{past.length}</em>}</h2><span className="gcard-meta">Written at wrap, every day. Insurance, the client, and future-you all read it.</span></div>
      {past.length === 0 && <p className="gcard-meta">Appears once a shoot day has happened.</p>}
      <ul className="people-list">{past.map((d) => { const r = rep(d); return (
        <li key={d.id} className={"person" + (open === d.id ? " is-open" : "")}>
          <button type="button" className="person-row staff-row" onClick={() => { setOpen(open === d.id ? null : d.id); if (!r) save(d, {}); }}><span className="person-main"><strong>{fmtDate(d.date)} · {d.title}</strong><em>{r ? [r.call_actual && `call ${r.call_actual}`, r.wrap_actual && `wrap ${r.wrap_actual}`, r.setups ? `${r.setups} setups` : "", r.issues ? "⚠ issues" : ""].filter(Boolean).join(" · ") || "started" : "no report yet"}</em></span><span className="person-tags"><span className={"itag" + (r?.signed_by ? " is-rel" : "")}>{r?.signed_by ? "signed" : r ? "draft" : "—"}</span></span></button>
          {open === d.id && (
            <div className="person-detail">
              <div className="shoot-new scene-fields">
                <F d={d} k="crew_present" label="Crew present" ph="Brandon, Brady" /><F d={d} k="call_actual" label="Call (actual)" ph="7:00" /><F d={d} k="first_shot" label="First shot" ph="8:10" /><F d={d} k="wrap_actual" label="Wrap (actual)" ph="17:40" /><F d={d} k="setups" label="Setups" ph="6" /><F d={d} k="weather" label="Weather" ph="42°F overcast, wind 12" />
                <F d={d} k="scenes_shot" label="Scenes shot" ph="3. The bells · 7. Mary at the pew" /><F d={d} k="rolls" label="Rolls" />
                <F d={d} k="camera_notes" label="Camera notes" rows={2} ph="A-cam 120p for the candles; B-cam dropped a frame on card A02 — flagged" /><F d={d} k="sound_notes" label="Sound notes" rows={2} ph="HVAC on until 9:15; room tone 30s at 11:02" />
                <F d={d} k="issues" label="Issues / incidents (none = none)" rows={2} /><F d={d} k="meals" label="Meals" /><F d={d} k="next_day" label="Next day" rows={2} ph="Pick-ups: the wide of the nave empty; Fr. Matthew 2pm" />
                <F d={d} k="signed_by" label="Signed by" ph="Brandon Roth" />
              </div>
              <div className="gcard-actions"><button type="button" className="achip" onClick={() => download(`${project.code || "DOC"}_DPR_${d.date}.txt`, buildDailyReportText({ project, day: d, report: rep(d) || {}, scenes, rolls: rolls.filter((x) => x.shoot_id === d.id) }))}>Export ↓</button><button type="button" className="achip" onClick={() => navigator.clipboard?.writeText(buildDailyReportText({ project, day: d, report: rep(d) || {}, scenes, rolls: rolls.filter((x) => x.shoot_id === d.id) })).then(() => say("Copied"))}>Copy</button></div>
            </div>
          )}
        </li>); })}</ul>
    </section>
  );
}
