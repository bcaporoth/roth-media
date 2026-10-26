"use client";

// The client's project page (Sprint 5): needs-from-you they can tick,
// sign-offs with a typed name, cuts with timecoded notes, change orders,
// payments, the latest update, decisions, and the brief they fill in.
import { useRef, useState } from "react";
import { PHASE_LABEL, TASK_CATEGORY_LABEL, DISCOVERY_FIELDS, APPROVAL_STATUS_LABEL, PAYMENT_STATUS_LABEL, money } from "../lib/production";

const fmtDate = (d) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : "Date TBD");
const fmtStamp = (d) => (d ? new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "");
const fmt12 = (t) => { if (!t) return ""; const [h, m] = t.split(":").map(Number); return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`; };
const mmss = (s) => { const n = Math.max(0, Math.floor(Number(s) || 0)); return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`; };
async function api(payload) {
  const r = await fetch("/api/portal/project", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || "Something went wrong");
  return j;
}

export default function ClientProject({ data, me }) {
  const { project, days, interviews, stakeholders, milestones } = data;
  const [tasks, setTasks] = useState(data.tasks);
  const m = data.machine;
  const [approvals, setApprovals] = useState(m?.approvals || []);
  const [cos, setCos] = useState(m?.cos || []);
  const [rnotes, setRnotes] = useState(m?.rnotes || []);
  const [discovery, setDiscovery] = useState(project.discovery || {});
  const [error, setError] = useState("");
  const [flash, setFlash] = useState("");
  const say = (t) => { setFlash(t); setTimeout(() => setFlash(""), 2500); };
  const fail = (e) => { setError(e.message); setTimeout(() => setError(""), 6000); };
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
  const upcoming = days.filter((d) => !d.date || d.date >= today);
  const past = days.filter((d) => d.date && d.date < today);
  const next = milestones.find((x) => !x.done);
  const pending = approvals.filter((a) => a.status === "pending");
  const openCos = cos.filter((c) => c.status === "sent");
  const reviews = (m?.reviews || []);
  const payments = m?.payments || [];
  const due = payments.filter((p) => ["invoiced", "late"].includes(p.status));
  const update = (m?.updates || [])[0];
  const answered = DISCOVERY_FIELDS.filter(([k]) => discovery[k]).length;
  async function tick(t) { try { const r = await api({ action: "task-done", projectId: project.id, id: t.id }); setTasks((l) => l.filter((x) => x.id !== r.task.id)); say("Thanks — Brandon's been told"); } catch (e) { fail(e); } }
  return (
    <div className="cproj">
      {error && <p className="form-error" role="alert">{error}</p>}
      {flash && <p className="form-ok" role="status">{flash}</p>}
      <div className="proj-stats">
        <div><strong>{PHASE_LABEL[project.phase] || "Development"}</strong><em>phase</em></div>
        <div><strong>{past.length}/{days.length}</strong><em>days filmed</em></div>
        <div><strong>{interviews.done}/{interviews.total}</strong><em>interviews done</em></div>
        <div><strong>{next ? next.label : "—"}</strong><em>{next?.date ? `next · ${fmtDate(next.date)}` : "next milestone"}</em></div>
      </div>

      {(tasks.length > 0 || pending.length > 0 || openCos.length > 0 || due.length > 0) && (
        <section className="cprof-card cproj-needs">
          <div className="cprof-cardhead"><h2>We need from you</h2></div>
          <ul className="cproj-todo">
            {pending.map((a) => <Approval key={a.id} a={a} project={project} me={me} onDone={(r) => { setApprovals((l) => l.map((x) => (x.id === r.id ? r : x))); say(r.status === "approved" ? "Signed. Thank you." : "Got it — Brandon will be in touch"); }} fail={fail} />)}
            {openCos.map((c) => <ChangeOrder key={c.id} c={c} project={project} me={me} onDone={(r) => { setCos((l) => l.map((x) => (x.id === r.id ? r : x))); say(r.status === "accepted" ? "Accepted — it's on the schedule" : "Declined — no changes"); }} fail={fail} />)}
            {tasks.map((t) => <li key={t.id} className="todo"><button type="button" className="todo-tick" onClick={() => tick(t)} aria-label="Mark done">☐</button><span><strong>{t.title}</strong>{t.due ? ` — by ${fmtDate(t.due)}` : ""} <em className="gcard-meta">· {TASK_CATEGORY_LABEL[t.category]}</em><br /><em className="gcard-meta">Tap the box when it&apos;s done.</em></span></li>)}
            {due.map((p) => <li key={p.id} className="todo"><span className="todo-tick">$</span><span><strong>{p.label}</strong> — {money(p.amount_cents)}{p.due ? `, due ${fmtDate(p.due)}` : ""}{p.status === "late" ? " · past due" : ""}<br /><em className="gcard-meta">{p.gates}</em></span></li>)}
          </ul>
        </section>
      )}

      {update && (
        <section className="cprof-card">
          <div className="cprof-cardhead"><h2>This week</h2><span className="gcard-meta">{fmtDate(update.week_of)}</span></div>
          <div className="upd-read">{update.body.split(/\n{2,}/).map((p, i) => <p key={i}>{p.split("\n").map((l, j) => <span key={j}>{l}<br /></span>)}</p>)}</div>
        </section>
      )}

      {reviews.length > 0 && (
        <section className="cprof-card">
          <div className="cprof-cardhead"><h2>Cuts to watch</h2></div>
          {reviews.map((r) => <Review key={r.id} r={r} notes={rnotes.filter((n) => n.review_id === r.id)} project={project} me={me} onNote={(n) => { setRnotes((l) => [...l, n]); say("Note saved"); }} fail={fail} />)}
        </section>
      )}

      <section className="cprof-card">
        <div className="cprof-cardhead"><h2>Filming days</h2></div>
        {upcoming.length === 0 && <p className="gcard-meta">Nothing scheduled yet.</p>}
        <ul className="shoot-list">{upcoming.map((d) => <li key={d.id} className="shoot"><div className="shoot-row shoot-row-link staff-row"><span className="shoot-when"><strong>{fmtDate(d.date)}</strong><em>{d.start_time ? fmt12(d.start_time) : ""}</em></span><span className="shoot-main"><strong>{d.title}</strong><em>{d.address || ""}{d.who.length ? ` · on camera: ${d.who.join(", ")}` : ""}</em></span></div></li>)}</ul>
        {past.length > 0 && <p className="gcard-meta">Filmed so far: {past.map((d) => `${fmtDate(d.date)} — ${d.title}`).join(" · ")}</p>}
      </section>

      <div className="cprof-cols">
        <div className="cprof-col">
          {milestones.length > 0 && <section className="cprof-card"><div className="cprof-cardhead"><h2>Milestones</h2></div><ol className="cproj-ms">{milestones.map((x, i) => <li key={x.key || i} className={x.done ? "is-done" : x === next ? "is-next" : ""}><span>{x.done ? "✓" : x === next ? "→" : "·"}</span> {x.label}{x.date ? <em> · {fmtDate(x.date)}</em> : null}</li>)}</ol></section>}
          {approvals.filter((a) => a.status !== "pending").length > 0 && <section className="cprof-card"><div className="cprof-cardhead"><h2>Signed off</h2></div><ul className="cprof-list">{approvals.filter((a) => a.status !== "pending").map((a) => <li key={a.id}><strong>{a.label}</strong> <span className="gcard-meta">· {APPROVAL_STATUS_LABEL[a.status]} by {a.signed_name} · {fmtStamp(a.signed_at)}</span></li>)}</ul></section>}
          {(m?.comms || []).length > 0 && <section className="cprof-card"><div className="cprof-cardhead"><h2>What we agreed</h2></div><ul className="cprof-list">{m.comms.map((c) => <li key={c.id}><strong>{fmtDate(c.date)}</strong> <span>{c.decisions || c.summary}</span></li>)}</ul></section>}
        </div>
        <div className="cprof-col">
          {payments.length > 0 && <section className="cprof-card"><div className="cprof-cardhead"><h2>Payments</h2><span className="gcard-meta">{money(payments.filter((p) => p.status === "paid").reduce((a, p) => a + p.amount_cents, 0))} of {money(payments.filter((p) => p.status !== "waived").reduce((a, p) => a + p.amount_cents, 0))} paid</span></div><ul className="cprof-list">{payments.map((p) => <li key={p.id} className={`pay st-${p.status}`}><span><strong>{p.label}</strong> <span className="gcard-meta">· {money(p.amount_cents)}{p.due ? ` · ${fmtDate(p.due)}` : ""} · {PAYMENT_STATUS_LABEL[p.status]}</span></span></li>)}</ul></section>}
          {cos.filter((c) => c.status !== "sent").length > 0 && <section className="cprof-card"><div className="cprof-cardhead"><h2>Change orders</h2></div><ul className="cprof-list">{cos.filter((c) => c.status !== "sent").map((c) => <li key={c.id}><strong>CO-{String(c.number).padStart(3, "0")} {c.title}</strong> <span className="gcard-meta">· {money(c.amount_cents)} · {c.status}{c.accepted_name ? ` by ${c.accepted_name}` : ""}</span></li>)}</ul></section>}
          {stakeholders.length > 0 && <section className="cprof-card"><div className="cprof-cardhead"><h2>Your team on this</h2></div><ul className="cprof-list">{stakeholders.map((x, i) => <li key={i}><strong>{x.name}</strong> <span className="gcard-meta">· {x.role}{x.decision_maker ? " · signs off" : ""}{x.primary_contact ? " · main contact" : ""}</span></li>)}</ul></section>}
        </div>
      </div>

      {m && (
        <section className="cprof-card">
          <div className="cprof-cardhead"><h2>The brief<em className="cprof-count">{answered}/{DISCOVERY_FIELDS.length}</em></h2><span className="gcard-meta">{project.discovery_locked_at ? `Agreed ${fmtDate(project.discovery_locked_at.slice(0, 10))}` : "Answer what you can — it saves as you go"}</span></div>
          <Discovery project={project} answers={discovery} locked={Boolean(project.discovery_locked_at)} onSaved={(d) => { setDiscovery(d); say("Saved"); }} fail={fail} />
        </section>
      )}
    </div>
  );
}

function Approval({ a, project, me, onDone, fail }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  async function go(decision) { try { const r = await api({ action: "approve", projectId: project.id, id: a.id, decision, name, note }); onDone(r.approval); } catch (e) { fail(e); } }
  return (
    <li className="todo todo-sign">
      <span className="todo-tick">✍</span>
      <span className="todo-body"><strong>Sign off: {a.label}</strong>{a.detail && <em className="gcard-meta"><br />{a.detail}</em>}
        {!open ? <button type="button" className="achip achip-primary" onClick={() => setOpen(true)}>Review &amp; sign</button> : (
          <span className="sign-box">
            <label>Type your full name<input value={name} onChange={(e) => setName(e.target.value)} placeholder={me.name || ""} autoFocus /></label>
            <label>Note (optional, required for changes)<textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What should change, and where" /></label>
            <span className="gcard-actions"><button type="button" className="achip achip-primary" disabled={!name.trim()} onClick={() => go("approved")}>Approve</button><button type="button" className="achip" disabled={!name.trim() || !note.trim()} onClick={() => go("changes")}>Request changes</button><button type="button" className="achip" onClick={() => setOpen(false)}>Not now</button></span>
            <em className="gcard-meta">Your typed name, email and the time are kept as the record.</em>
          </span>
        )}
      </span>
    </li>
  );
}
function ChangeOrder({ c, project, me, onDone, fail }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  async function go(decision) { try { const r = await api({ action: "co-answer", projectId: project.id, id: c.id, decision, name }); onDone(r.co); } catch (e) { fail(e); } }
  return (
    <li className="todo todo-sign">
      <span className="todo-tick">+</span>
      <span className="todo-body"><strong>Change order CO-{String(c.number).padStart(3, "0")}: {c.title}</strong> <span className="gcard-meta">· {money(c.amount_cents)}{c.expires ? ` · good until ${fmtDate(c.expires)}` : ""}</span>{c.description && <em className="co-desc">{c.description}</em>}
        {!open ? <button type="button" className="achip achip-primary" onClick={() => setOpen(true)}>Respond</button> : (
          <span className="sign-box">
            <label>Type your full name to accept<input value={name} onChange={(e) => setName(e.target.value)} placeholder={me.name || ""} autoFocus /></label>
            <span className="gcard-actions"><button type="button" className="achip achip-primary" disabled={!name.trim()} onClick={() => go("accept")}>Accept {money(c.amount_cents)}</button><button type="button" className="achip" onClick={() => go("decline")}>Decline</button><button type="button" className="achip" onClick={() => setOpen(false)}>Not now</button></span>
            <em className="gcard-meta">Accepting adds this amount to the payment schedule.</em>
          </span>
        )}
      </span>
    </li>
  );
}
function Review({ r, notes, project, me, onNote, fail }) {
  const vid = useRef(null);
  const [at, setAt] = useState("");
  const [text, setText] = useState("");
  const grab = () => { if (vid.current) setAt(mmss(vid.current.currentTime)); };
  async function add(e) { e.preventDefault(); if (!text.trim()) return; const [mm, ss] = at.split(":").map(Number); const at_s = at ? (isNaN(ss) ? mm * 60 : mm * 60 + ss) : null; try { const res = await api({ action: "review-note", projectId: project.id, reviewId: r.id, at_s, text }); onNote(res.note); setText(""); } catch (err) { fail(err); } }
  return (
    <div className="review">
      <div className="cprof-cardhead"><h3>{r.label}</h3><span className="gcard-meta">{fmtDate(r.created_at.slice(0, 10))}{r.status !== "open" ? " · notes closed" : ""}</span></div>
      {r.message && <p className="review-msg">{r.message}</p>}
      {r.video_url ? <video ref={vid} src={r.video_url} controls playsInline onPause={grab} /> : r.link ? <p><a className="abtn" href={r.link} target="_blank" rel="noreferrer">Watch it ↗</a></p> : <p className="gcard-meta">Video coming.</p>}
      {r.status === "open" && (
        <form className="prep-add review-add" onSubmit={add}>
          <input className="person-at" value={at} onChange={(e) => setAt(e.target.value)} placeholder="m:ss" aria-label="At" title="Pause the video and this fills in" />
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="What you noticed at that moment" aria-label="Note" />
          <button type="submit" className="achip achip-primary" disabled={!text.trim()}>Add note</button>
        </form>
      )}
      {notes.length > 0 && <ul className="note-list">{notes.map((n) => <li key={n.id} className={"note" + (n.side === "us" ? " v-park" : "") + (n.resolved ? " is-done" : "")}><span className="note-at">{n.at_s != null ? mmss(n.at_s) : "—"}</span><span className="note-main"><span>{n.text}</span><em className="gcard-meta">{n.side === "us" ? "Brandon" : n.who} · {fmtStamp(n.created_at)}{n.resolved ? " · addressed" : ""}</em></span></li>)}</ul>}
      <p className="gcard-meta">Pause the video where something strikes you — the time fills in. Watch the whole thing once before you write.</p>
    </div>
  );
}
function Discovery({ project, answers, locked, onSaved, fail }) {
  const [a, setA] = useState(answers);
  const [dirty, setDirty] = useState(false);
  async function save() { try { const r = await api({ action: "discovery-save", projectId: project.id, answers: a }); onSaved(r.discovery); setDirty(false); } catch (e) { fail(e); } }
  return (
    <div className="shoot-new scene-fields discovery">
      {DISCOVERY_FIELDS.map(([k, label, ph]) => <label key={k} className="wide">{label}<textarea rows={2} value={a[k] || ""} placeholder={ph} disabled={locked} onChange={(e) => { setA({ ...a, [k]: e.target.value }); setDirty(true); }} onBlur={() => dirty && save()} /></label>)}
      {!locked && <div className="gcard-actions wide"><button type="button" className="abtn" disabled={!dirty} onClick={save}>Save answers</button></div>}
    </div>
  );
}
