"use client";

// Sprint 5 (owner side): discovery brief, approvals, review versions,
// change orders, payments, comm log, weekly update, sensitivity register.
import { useState } from "react";
import { P } from "./ProductionCards";
import { DISCOVERY_FIELDS, APPROVAL_KIND_LABEL, APPROVAL_STATUS_LABEL, CO_STATUS_LABEL, PAYMENT_STATUS_LABEL, CHANNEL_LABEL, HANDLING_LABEL, money } from "../lib/production";

const SqlHint = ({ what }) => <p className="sm-sqlhint">{what} needs <code>supabase/sprint5.sql</code> run once in the Supabase SQL editor.</p>;
const fmtDate = (d) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "");
const fmtStamp = (d) => (d ? new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "");
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
const mmss = (s) => { const n = Math.max(0, Math.floor(Number(s) || 0)); return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`; };
function useRows(prefix, project, setRows, fail) {
  return {
    add: async (fields) => { const r = await P({ action: `${prefix}-add`, projectId: project.id, ...fields }); setRows((l) => [r.row, ...l]); return r; },
    patch: async (id, fields) => { try { const r = await P({ action: `${prefix}-update`, id, ...fields }); setRows((l) => l.map((x) => (x.id === id ? r.row : x))); return r.row; } catch (e) { fail(e); } },
    remove: async (x, label) => { if (!window.confirm(`Delete ${label || "this"}?`)) return; try { await P({ action: `${prefix}-delete`, id: x.id }); setRows((l) => l.filter((y) => y.id !== x.id)); } catch (e) { fail(e); } },
  };
}
const Blur = ({ value, onSave, ...rest }) => <input defaultValue={value ?? ""} onBlur={(e) => e.target.value !== (value ?? "") && onSave(e.target.value)} {...rest} />;

export function DiscoveryCard({ project, onProject, ready }) {
  const [open, setOpen] = useState(false);
  if (!ready) return <section className="cprof-card"><div className="cprof-cardhead"><h2>The brief</h2></div><SqlHint what="The client machinery" /></section>;
  const d = project.discovery || {};
  const answered = DISCOVERY_FIELDS.filter(([k]) => d[k]).length;
  const locked = Boolean(project.discovery_locked_at);
  return (
    <section className="cprof-card">
      <div className="cprof-cardhead"><h2>The brief<em className="cprof-count">{answered}/{DISCOVERY_FIELDS.length}</em></h2>
        <span className="gcard-actions"><button type="button" className={"achip" + (locked ? " is-on" : "")} onClick={() => onProject({ discovery_locked: !locked })}>{locked ? `Locked ${fmtDate(project.discovery_locked_at.slice(0, 10))} · reopen` : "Lock it"}</button><button type="button" className="achip" onClick={() => setOpen(!open)}>{open ? "Collapse" : "Open"}</button></span>
      </div>
      <p className="gcard-meta">The client answers this in their portal (or you do, on the call). Lock it once agreed — it&apos;s what every later &ldquo;but we thought…&rdquo; gets measured against.</p>
      {open && <div className="shoot-new scene-fields">{DISCOVERY_FIELDS.map(([k, label, ph]) => <label key={k} className="wide">{label}<textarea rows={2} defaultValue={d[k] || ""} placeholder={ph} disabled={locked} onBlur={(e) => e.target.value !== (d[k] || "") && onProject({ discovery: { ...d, [k]: e.target.value } })} /></label>)}</div>}
    </section>
  );
}

export function ApprovalsCard({ project, rows, setRows, cuts = [], fail, ready }) {
  const [adding, setAdding] = useState(false);
  if (!ready) return null;
  const api = useRows("approval", project, setRows, fail);
  const ms = (project.milestones || []).filter((m) => !m.done);
  async function add(e) { e.preventDefault(); const f = Object.fromEntries(new FormData(e.currentTarget).entries()); try { await api.add(f); setAdding(false); e.target.reset(); } catch (err) { fail(err); } }
  return (
    <section className="cprof-card">
      <div className="cprof-cardhead"><h2>Sign-offs{rows.length > 0 && <em className="cprof-count">{rows.filter((r) => r.status === "pending").length} open</em>}</h2><button type="button" className="abtn" onClick={() => setAdding(!adding)}>{adding ? "Close" : "+ Ask for one"}</button></div>
      {adding && (
        <form className="shoot-new" onSubmit={add}>
          <label>Kind<select name="kind" defaultValue="milestone">{Object.entries(APPROVAL_KIND_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          <label className="wide">What they&apos;re signing off on<input name="label" required autoFocus list="appr-labels" placeholder="Treatment v2 · Rough cut 1 · Final deliverables" /><datalist id="appr-labels">{ms.map((m) => <option key={m.key} value={m.label} />)}{cuts.map((c) => <option key={c.id} value={`${c.stage} v${c.version}`} />)}</datalist></label>
          <label className="wide">What approving means (plain English)<textarea name="detail" rows={2} placeholder="You've watched the whole cut. Approving locks the structure; from here changes are polish, not re-ordering." /></label>
          <button type="submit" className="abtn">Put it in the portal</button>
        </form>
      )}
      {rows.length === 0 && !adding && <p className="gcard-meta">Each one shows in the portal with Approve / Request changes and a typed-name signature. Keeps the receipts.</p>}
      <ul className="cprof-list">{rows.map((a) => <li key={a.id} className={`appr st-${a.status}`}><span><strong>{a.label}</strong> <span className="gcard-meta">· {APPROVAL_KIND_LABEL[a.kind]} · {APPROVAL_STATUS_LABEL[a.status]}{a.signed_name ? ` by ${a.signed_name} · ${fmtStamp(a.signed_at)}` : ""}</span>{a.note && <em className="appr-note">&ldquo;{a.note}&rdquo;</em>}</span><span className="gcard-actions">{a.status !== "pending" && <button type="button" className="achip" onClick={() => api.patch(a.id, { status: "pending" })}>Re-ask</button>}<button type="button" className="prep-x" onClick={() => api.remove(a, a.label)} aria-label="Remove">×</button></span></li>)}</ul>
    </section>
  );
}

export function ReviewsCard({ project, rows, setRows, notes, setNotes, cuts = [], fail, say, ready }) {
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState(null);
  const [busy, setBusy] = useState("");
  if (!ready) return null;
  const api = useRows("review", project, setRows, fail);
  const napi = useRows("rnote", project, setNotes, fail);
  async function add(e) { e.preventDefault(); const f = Object.fromEntries(new FormData(e.currentTarget).entries()); try { const r = await api.add(f); setAdding(false); setOpen(r.row.id); e.target.reset(); } catch (err) { fail(err); } }
  async function upload(id, e) {
    const f = e.target.files?.[0]; e.target.value = ""; if (!f) return;
    setBusy("Uploading…");
    try { const s = await P({ action: "review-sign", id }); const r = await fetch(s.url, { method: "PUT", body: f, headers: { "content-type": "video/mp4" } }); if (!r.ok) throw new Error(`Upload failed (${r.status})`); const d = await P({ action: "review-done", id, key: s.key }); setRows((l) => l.map((x) => (x.id === id ? d.row : x))); say("Cut is up"); } catch (err) { fail(err); } finally { setBusy(""); }
  }
  return (
    <section className="cprof-card">
      <div className="cprof-cardhead"><h2>Cuts for review{rows.length > 0 && <em className="cprof-count">{rows.length}</em>}</h2><button type="button" className="abtn" onClick={() => setAdding(!adding)}>{adding ? "Close" : "+ Send a cut"}</button></div>
      {adding && (
        <form className="shoot-new" onSubmit={add}>
          <label>Label<input name="label" required autoFocus placeholder="Rough cut 1" /></label>
          <label>From cut<select name="cut_id" defaultValue=""><option value="">—</option>{cuts.map((c) => <option key={c.id} value={c.id}>{c.stage} v{c.version}</option>)}</select></label>
          <label className="wide">Link (Vimeo / Frame.io) — or upload after<input name="link" placeholder="https://vimeo.com/…" /></label>
          <label className="wide">Note to them<textarea name="message" rows={2} placeholder="Temp music, no color, no titles. Watch the whole thing once before notes. Timecode your notes with the field under the player." /></label>
          <button type="submit" className="abtn">Create</button>
        </form>
      )}
      {rows.length === 0 && !adding && <p className="gcard-meta">A version the client watches in their portal and leaves timecoded notes on. Close it when the next one goes up.</p>}
      <ul className="people-list">{rows.map((r) => { const ns = notes.filter((n) => n.review_id === r.id); return (
        <li key={r.id} className={"person" + (open === r.id ? " is-open" : "")}>
          <button type="button" className="person-row staff-row" onClick={() => setOpen(open === r.id ? null : r.id)}><span className="person-main"><strong>{r.label}</strong><em>{[fmtDate(r.created_at.slice(0, 10)), r.video_key ? "uploaded" : r.link ? "linked" : "no video yet", `${ns.length} notes`, ns.filter((n) => !n.resolved && n.side === "client").length ? `${ns.filter((n) => !n.resolved && n.side === "client").length} open` : ""].filter(Boolean).join(" · ")}</em></span><span className="person-tags"><span className={"itag" + (r.status === "open" ? " is-rel" : "")}>{r.status}</span>{!r.client_visible && <span className="itag">hidden</span>}</span></button>
          {open === r.id && (
            <div className="person-detail">
              <div className="gcard-actions">
                <label className="achip">{busy || (r.video_key ? "Replace video" : "Upload mp4")}<input type="file" accept="video/mp4,video/*" hidden onChange={(e) => upload(r.id, e)} disabled={Boolean(busy)} /></label>
                <button type="button" className={"achip" + (r.status === "open" ? " is-on" : "")} onClick={() => api.patch(r.id, { status: r.status === "open" ? "closed" : "open" })}>{r.status === "open" ? "Notes open" : "Notes closed"}</button>
                <button type="button" className={"achip" + (r.client_visible ? " is-on" : "")} onClick={() => api.patch(r.id, { client_visible: !r.client_visible })}>{r.client_visible ? "Visible to client" : "Hidden"}</button>
                <button type="button" className="prep-x" onClick={() => api.remove(r, r.label)} aria-label="Remove">×</button>
              </div>
              <div className="shoot-new scene-fields"><label className="wide">Link<Blur value={r.link} onSave={(v) => api.patch(r.id, { link: v })} /></label><label className="wide">Note to them<Blur value={r.message} onSave={(v) => api.patch(r.id, { message: v })} /></label></div>
              <ul className="note-list">{ns.map((n) => <li key={n.id} className={"note" + (n.side === "us" ? " v-park" : "") + (n.resolved ? " is-done" : "")}><span className="note-at">{n.at_s != null ? mmss(n.at_s) : "—"}</span><span className="note-main"><span>{n.text}</span><em className="gcard-meta">{n.who}{n.side === "us" ? " (us)" : ""} · {fmtStamp(n.created_at)}</em></span><span className="gcard-actions"><button type="button" className={"achip" + (n.resolved ? " is-on" : "")} onClick={() => napi.patch(n.id, { resolved: !n.resolved })}>{n.resolved ? "resolved ✓" : "resolve"}</button><button type="button" className="prep-x" onClick={() => napi.remove(n, "this note")} aria-label="Remove">×</button></span></li>)}</ul>
              <form className="prep-add" onSubmit={async (e) => { e.preventDefault(); const f = e.currentTarget; const t = f.text.value.trim(); if (!t) return; const [m, s] = f.at.value.split(":").map(Number); try { await napi.add({ review_id: r.id, at_s: f.at.value ? (isNaN(s) ? m * 60 : m * 60 + s) : null, text: t, who: "Brandon" }); f.reset(); } catch (err) { fail(err); } }}><input name="at" className="person-at" placeholder="m:ss" aria-label="At" /><input name="text" placeholder="Reply or a note of your own — the client sees it" aria-label="Note" /><button type="submit" className="achip">+ Note</button></form>
            </div>
          )}
        </li>); })}</ul>
    </section>
  );
}

export function ChangeOrdersCard({ project, rows, setRows, fail, ready }) {
  const [adding, setAdding] = useState(false);
  if (!ready) return null;
  const api = useRows("co", project, setRows, fail);
  async function add(e) { e.preventDefault(); const f = Object.fromEntries(new FormData(e.currentTarget).entries()); try { const r = await P({ action: "co-add", projectId: project.id, ...f, amount_cents: Math.round(Number(f.amount) * 100) || 0 }); setRows((l) => [...l, r.row]); setAdding(false); e.target.reset(); } catch (err) { fail(err); } }
  const num = (n) => `CO-${String(n).padStart(3, "0")}`;
  return (
    <section className="cprof-card">
      <div className="cprof-cardhead"><h2>Change orders{rows.length > 0 && <em className="cprof-count">{money(rows.filter((c) => c.status === "accepted").reduce((a, c) => a + c.amount_cents, 0))} accepted</em>}</h2><button type="button" className="abtn" onClick={() => setAdding(!adding)}>{adding ? "Close" : "+ Change order"}</button></div>
      {adding && (
        <form className="shoot-new" onSubmit={add}>
          <label className="wide">Title<input name="title" required autoFocus placeholder="Second interview day — the choir" /></label>
          <label>Amount ($)<input name="amount" type="number" step="1" placeholder="1200" /></label>
          <label>Expires<input name="expires" type="date" /></label>
          <label className="wide">What it covers, and what it doesn&apos;t<textarea name="description" rows={3} placeholder="One additional shoot day (up to 8 hrs) with two cameras and sound; travel included; does not include extra edit time beyond integrating the footage." /></label>
          <button type="submit" className="abtn">Draft it</button>
        </form>
      )}
      {rows.length === 0 && !adding && <p className="gcard-meta">Scope creep with a price tag and an expiry. Draft → Send puts it in the portal; accepted ones add a payment line.</p>}
      <ul className="cprof-list">{rows.map((c) => <li key={c.id} className={`co st-${c.status}`}><span><strong>{num(c.number)} {c.title}</strong> <span className="gcard-meta">· {money(c.amount_cents)} · {CO_STATUS_LABEL[c.status]}{c.expires ? ` · expires ${fmtDate(c.expires)}` : ""}{c.accepted_name ? ` · ${c.accepted_name} ${fmtStamp(c.accepted_at)}` : ""}</span></span><span className="gcard-actions">{c.status === "draft" && <button type="button" className="achip achip-primary" onClick={() => api.patch(c.id, { status: "sent" })}>Send</button>}{c.status === "sent" && <button type="button" className="achip" onClick={() => api.patch(c.id, { status: "draft" })}>Pull back</button>}{["declined", "expired"].includes(c.status) && <button type="button" className="achip" onClick={() => api.patch(c.id, { status: "sent", expires: null })}>Reissue</button>}<button type="button" className="prep-x" onClick={() => api.remove(c, num(c.number))} aria-label="Remove">×</button></span></li>)}</ul>
    </section>
  );
}

export function PaymentsCard({ project, rows, setRows, onProject, fail, say, ready }) {
  const [adding, setAdding] = useState(false);
  if (!ready) return null;
  const api = useRows("payment", project, setRows, fail);
  const total = rows.reduce((a, p) => a + (p.status === "waived" ? 0 : p.amount_cents), 0);
  const paid = rows.filter((p) => p.status === "paid").reduce((a, p) => a + p.amount_cents, 0);
  async function seed() { const v = window.prompt("Contract total ($)", project.contract_cents ? String(project.contract_cents / 100) : ""); if (!v) return; try { const r = await P({ action: "payments-seed", projectId: project.id, contract_cents: Math.round(Number(v) * 100) }); setRows(r.rows); onProject(null, { ...project, contract_cents: Math.round(Number(v) * 100) }); say("30 / 30 / 20 / 20"); } catch (err) { fail(err); } }
  async function add(e) { e.preventDefault(); const f = Object.fromEntries(new FormData(e.currentTarget).entries()); try { const r = await P({ action: "payment-add", projectId: project.id, ...f, amount_cents: Math.round(Number(f.amount) * 100) || 0, sort: rows.length }); setRows((l) => [...l, r.row]); setAdding(false); e.target.reset(); } catch (err) { fail(err); } }
  return (
    <section className="cprof-card">
      <div className="cprof-cardhead"><h2>Payments{rows.length > 0 && <em className="cprof-count">{money(paid)} of {money(total)}</em>}</h2><span className="gcard-actions">{rows.length === 0 && <button type="button" className="achip" onClick={seed}>Seed 30/30/20/20</button>}<button type="button" className="abtn" onClick={() => setAdding(!adding)}>{adding ? "Close" : "+ Line"}</button></span></div>
      {adding && <form className="shoot-new" onSubmit={add}><label>Label<input name="label" required autoFocus /></label><label>Amount ($)<input name="amount" type="number" /></label><label>Due<input name="due" type="date" /></label><label className="wide">What it gates<input name="gates" placeholder="Masters hand over when this clears" /></label><button type="submit" className="abtn">Add</button></form>}
      {rows.length === 0 && !adding && <p className="gcard-meta">The schedule the client sees. Masters don&apos;t hand over until the last line is paid — that&apos;s policy, not a reminder.</p>}
      <ul className="cprof-list">{rows.map((p) => <li key={p.id} className={`pay st-${p.status}`}><span><strong>{p.label}</strong> <span className="gcard-meta">· {money(p.amount_cents)}{p.due ? ` · due ${fmtDate(p.due)}` : ""}{p.paid_at ? ` · paid ${fmtDate(p.paid_at)}${p.method ? ` by ${p.method}` : ""}` : ""}{p.gates ? ` · ${p.gates}` : ""}</span></span><span className="gcard-actions"><select className="achip" value={p.status} onChange={(e) => api.patch(p.id, { status: e.target.value })} aria-label="Status">{Object.entries(PAYMENT_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select><Blur className="pay-due" type="date" value={p.due || ""} onSave={(v) => api.patch(p.id, { due: v })} aria-label="Due" /><button type="button" className="prep-x" onClick={() => api.remove(p, p.label)} aria-label="Remove">×</button></span></li>)}</ul>
    </section>
  );
}

export function CommsCard({ project, rows, setRows, fail, ready }) {
  const [adding, setAdding] = useState(false);
  if (!ready) return null;
  const api = useRows("comm", project, setRows, fail);
  async function add(e) { e.preventDefault(); const f = Object.fromEntries(new FormData(e.currentTarget).entries()); try { await api.add({ ...f, client_visible: f.client_visible === "on" }); setAdding(false); e.target.reset(); } catch (err) { fail(err); } }
  return (
    <section className="cprof-card">
      <div className="cprof-cardhead"><h2>Conversations{rows.length > 0 && <em className="cprof-count">{rows.length}</em>}</h2><button type="button" className="abtn" onClick={() => setAdding(!adding)}>{adding ? "Close" : "+ Log one"}</button></div>
      {adding && (
        <form className="shoot-new" onSubmit={add}>
          <label>Date<input name="date" type="date" defaultValue={today()} /></label>
          <label>How<select name="channel" defaultValue="call">{Object.entries(CHANNEL_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          <label>With<input name="who" placeholder="Fr. Matthew" /></label>
          <label className="wide">What was said<textarea name="summary" rows={2} required autoFocus /></label>
          <label className="wide">Decisions<input name="decisions" placeholder="Premiere moves to Dec 14 · choir day approved" /></label>
          <label className="pbook-auto"><input type="checkbox" name="client_visible" /> Show the decisions in their portal</label>
          <button type="submit" className="abtn">Log</button>
        </form>
      )}
      {rows.length === 0 && !adding && <p className="gcard-meta">Calls, texts, hallway promises. Decisions marked visible become the shared record — &ldquo;we agreed on the 14th&rdquo; with a date on it.</p>}
      <ul className="cprof-list">{rows.map((c) => <li key={c.id}><span><strong>{fmtDate(c.date)} · {CHANNEL_LABEL[c.channel]}{c.who ? ` · ${c.who}` : ""}</strong><br />{c.summary}{c.decisions && <em className="appr-note">Decided: {c.decisions}</em>}</span><span className="gcard-actions"><button type="button" className={"achip" + (c.client_visible ? " is-on" : "")} onClick={() => api.patch(c.id, { client_visible: !c.client_visible })}>{c.client_visible ? "in portal" : "private"}</button><button type="button" className="prep-x" onClick={() => api.remove(c, "this entry")} aria-label="Remove">×</button></span></li>)}</ul>
    </section>
  );
}

export function UpdateCard({ project, rows, setRows, email, fail, say, ready }) {
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(rows[0]?.id || null);
  if (!ready) return null;
  const api = useRows("update", project, setRows, fail);
  async function draft() {
    setBusy(true);
    try { const d = await P({ action: "update-draft", projectId: project.id }); const r = await api.add({ week_of: today(), body: d.body }); setOpen(r.row.id); } catch (err) { fail(err); } finally { setBusy(false); }
  }
  async function publish(u, withEmail) {
    if (withEmail && !window.confirm("Email this to the client contacts too?")) return;
    try { const r = await P({ action: "update-publish", id: u.id, email: withEmail }); setRows((l) => l.map((x) => (x.id === u.id ? r.row : x))); say(r.emailed ? `Published + emailed ${r.emailed}` : "Published to the portal"); } catch (err) { fail(err); }
  }
  return (
    <section className="cprof-card">
      <div className="cprof-cardhead"><h2>Weekly update{rows.length > 0 && <em className="cprof-count">{rows.length}</em>}</h2><button type="button" className="abtn" disabled={busy} onClick={draft}>{busy ? "Drafting…" : "Draft this week's"}</button></div>
      {rows.length === 0 && <p className="gcard-meta">Friday ritual. It drafts itself from the week — filmed, interviews, what&apos;s next, what you need — you fix the tone and publish. The client always knows where the film is.</p>}
      <ul className="people-list">{rows.map((u) => (
        <li key={u.id} className={"person" + (open === u.id ? " is-open" : "")}>
          <button type="button" className="person-row staff-row" onClick={() => setOpen(open === u.id ? null : u.id)}><span className="person-main"><strong>Week of {fmtDate(u.week_of)}</strong><em>{u.published_at ? `published ${fmtStamp(u.published_at)}${u.emailed_to ? ` · emailed ${u.emailed_to}` : ""}` : "draft"}</em></span><span className="person-tags"><span className={"itag" + (u.published_at ? " is-rel" : "")}>{u.published_at ? "live" : "draft"}</span></span></button>
          {open === u.id && (
            <div className="person-detail">
              <textarea className="upd-body" rows={12} defaultValue={u.body} onBlur={(e) => e.target.value !== u.body && api.patch(u.id, { body: e.target.value })} />
              <div className="gcard-actions"><button type="button" className="achip achip-primary" onClick={() => publish(u, false)}>{u.published_at ? "Re-publish" : "Publish to portal"}</button>{email && <button type="button" className="achip" onClick={() => publish(u, true)}>Publish + email</button>}{u.published_at && <button type="button" className="achip" onClick={() => api.patch(u.id, { published: false })}>Unpublish</button>}<button type="button" className="achip" onClick={() => navigator.clipboard?.writeText(u.body).then(() => say("Copied"))}>Copy</button><button type="button" className="prep-x" onClick={() => api.remove(u, "this update")} aria-label="Remove">×</button></div>
            </div>
          )}
        </li>))}</ul>
    </section>
  );
}

export function SensitivityCard({ project, rows, setRows, fail, ready }) {
  const [adding, setAdding] = useState(false);
  if (!ready) return null;
  const api = useRows("sens", project, setRows, fail);
  async function add(e) { e.preventDefault(); const f = Object.fromEntries(new FormData(e.currentTarget).entries()); try { await api.add(f); setAdding(false); e.target.reset(); } catch (err) { fail(err); } }
  return (
    <section className="cprof-card">
      <div className="cprof-cardhead"><h2>Sensitivities{rows.length > 0 && <em className="cprof-count">{rows.length}</em>}</h2><button type="button" className="abtn" onClick={() => setAdding(!adding)}>{adding ? "Close" : "+ Topic"}</button></div>
      {adding && (
        <form className="shoot-new" onSubmit={add}>
          <label className="wide">Topic<input name="topic" required autoFocus placeholder="The 2003 pastor · the merger vote · the Kelly family" /></label>
          <label>Handling<select name="handling" defaultValue="approve_before_use">{Object.entries(HANDLING_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          <label>Raised by<input name="raised_by" placeholder="Fr. Matthew" /></label>
          <label className="wide">How, exactly<textarea name="note" rows={2} placeholder="Can be mentioned as 'a difficult period'; no names; nothing from the diocesan file on camera." /></label>
          <button type="submit" className="abtn">Add</button>
        </form>
      )}
      {rows.length === 0 && !adding && <p className="gcard-meta">What the client said must be handled with care — and how. The edit checks against this before picture lock.</p>}
      <ul className="cprof-list">{rows.map((s) => <li key={s.id} className={`sens h-${s.handling}`}><span><strong>{s.topic}</strong> <span className="gcard-meta">· {HANDLING_LABEL[s.handling]}{s.raised_by ? ` · ${s.raised_by}` : ""}</span>{s.note && <em className="appr-note">{s.note}</em>}</span><span className="gcard-actions"><select className="achip" value={s.handling} onChange={(e) => api.patch(s.id, { handling: e.target.value })} aria-label="Handling">{Object.entries(HANDLING_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select><button type="button" className="prep-x" onClick={() => api.remove(s, s.topic)} aria-label="Remove">×</button></span></li>)}</ul>
    </section>
  );
}
