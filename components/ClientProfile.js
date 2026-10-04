"use client";

// Studio → Clients → one person. Intake answers, orientation-call sheets
// (autosave), shoots with their day plan (flow, shots, poses, gear), galleries, payments, messages — and the next step.

import { useEffect, useRef, useState } from "react";
import { isNoEmail } from "../lib/no-email";
import Link from "next/link";
import { ClientShoots } from "./ShootsBoard";
import BalanceList from "./BalanceList";
import { usd } from "../lib/money-view";
import { CALL, TYPES, TYPE_LABEL, STAGE_LABEL, STAGES, intakeUrl, typeOf } from "../lib/intake";

async function api(path, payload) {
  const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
  return json;
}
const fmt = (d) => (d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", ...(String(d).length <= 10 ? { timeZone: "UTC" } : {}) }) : "");
const money = (c) => (c / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
const today = () => new Date().toISOString().slice(0, 10);

export default function ClientProfile({ initial, emailReady }) {
  const [d, setD] = useState(initial);
  const [flash, setFlash] = useState("");
  const [error, setError] = useState("");
  const [type, setType] = useState(initial.type || "wedding");
  const [openCall, setOpenCall] = useState(initial.calls[0]?.id || null);
  const [pasting, setPasting] = useState(false);
  const [paste, setPaste] = useState({ text: "", date: "" });
  const c = d.client;
  const bookings = d.bookings || [];
  const owedCents = bookings.reduce((n, b) => n + b.owedCents, 0);
  const say = (m) => { setFlash(m); setTimeout(() => setFlash(""), 3000); };
  const fail = (e) => { setError(e.message || String(e)); setTimeout(() => setError(""), 6000); };

  async function copy(text, label) {
    try { await navigator.clipboard.writeText(text); say(`${label} copied`); } catch { window.prompt("Copy:", text); }
  }
  async function saveClient(patch) {
    try { await api("/api/admin/clients", { action: "update", id: c.id, ...patch }); setD({ ...d, client: { ...c, ...patch } }); say("Saved"); } catch (err) { fail(err); }
  }
  const link = intakeUrl({ email: isNoEmail(c.email) ? "" : c.email, name: c.name, type });
  async function intakeSent(how) {
    try {
      const r = await api("/api/admin/clients", { action: "intake-sent", email: c.email, name: c.name, phone: c.phone, type });
      if (!d.intakeSent) setD({ ...d, intakeSent: { id: r.id, created_at: new Date().toISOString(), utm: { type } }, stage: d.stage === "new" ? "intake_sent" : d.stage });
      if (how === "copy") await copy(link, "Intake link");
      if (how === "sms") window.location.href = `sms:${c.phone.replace(/[^\d+]/g, "")}&body=${encodeURIComponent(`Hi ${c.name.split(" ")[0] || ""} — before our call, could you fill this in? Takes five minutes: ${link}`)}`;
      if (how === "mail") window.location.href = `mailto:${c.email}?subject=${encodeURIComponent("Before we talk")}&body=${encodeURIComponent(`Hi ${c.name.split(" ")[0] || ""},\n\nBefore our call, could you fill this in? It takes about five minutes and means we skip the basics:\n${link}\n\n— Brandon`)}`;
    } catch (err) { fail(err); }
  }
  async function newCall() {
    // Anything they already answered on /intake lands in the sheet, so the call starts from there.
    const answers = {};
    for (const it of [...d.intakes].reverse()) for (const [q, a] of it.fields || []) if (q !== "for" && a) answers[q] = String(a);
    try {
      const r = await api("/api/admin/clients", { action: "call-save", email: c.email, name: c.name, phone: c.phone, type, answers, checks: {}, callDate: today() });
      setD({ ...d, calls: [r.item, ...d.calls], stage: ["new", "intake_sent", "intake"].includes(d.stage) ? "call" : d.stage });
      setOpenCall(r.item.id);
    } catch (err) { fail(err); }
  }
  async function addInquiry(e) {
    e.preventDefault();
    try {
      const r = await api("/api/admin/clients", { action: "add-inquiry", email: c.email, name: c.name, phone: c.phone, text: paste.text, date: paste.date });
      setD({ ...d, messages: [r.item, ...d.messages] }); setPasting(false); setPaste({ text: "", date: "" }); say("Added");
    } catch (err) { fail(err); }
  }
  async function deleteCall(call) {
    if (!window.confirm("Delete this call sheet?")) return;
    try { await api("/api/admin/clients", { action: "call-delete", id: call.id }); setD({ ...d, calls: d.calls.filter((x) => x.id !== call.id) }); } catch (err) { fail(err); }
  }

  return (
    <div className="cprof">
      <div className="cprof-head">
        <div>
          <span className={`itag stage-${d.stage}`}>{STAGE_LABEL[d.stage]}</span>
          <span className="gcard-meta"> · client since {fmt(c.created_at)}</span>
        </div>
        <div className="gcard-actions">
          {!isNoEmail(c.email) && <a className="achip" href={`mailto:${c.email}`}>Email</a>}
          {c.phone && <a className="achip" href={`sms:${c.phone.replace(/[^\d+]/g, "")}`}>Text</a>}
          {c.phone && <a className="achip" href={`tel:${c.phone.replace(/[^\d+]/g, "")}`}>Call</a>}
          <Link className="achip" href="/portal/admin/clients">← All clients</Link>
        </div>
      </div>
      {flash && <p className="clients-flash">{flash}</p>}
      {error && <p className="cform-error">{error}</p>}

      <ol className="cprof-stages" aria-label="Where they are">
        {STAGES.map((s, i) => { const at = STAGES.findIndex((x) => x.key === d.stage); return <li key={s.key} className={i < at ? "is-past" : i === at ? "is-now" : ""}>{s.label}</li>; })}
      </ol>

      <section className="cprof-card">
        <div className="client-fields" key={`${c.name}-${c.email}-${c.phone}`}>
          <label>Name<input defaultValue={c.name} onBlur={(e) => e.target.value !== c.name && saveClient({ name: e.target.value })} /></label>
          <label>Email<input type="email" placeholder="Add when you have it" defaultValue={isNoEmail(c.email) ? "" : c.email} onBlur={(e) => e.target.value.trim() && e.target.value !== c.email && saveClient({ email: e.target.value })} /></label>
          <label>Phone<input defaultValue={c.phone} onBlur={(e) => e.target.value !== c.phone && saveClient({ phone: e.target.value })} /></label>
        </div>
        <label className="client-notes">Notes<textarea rows={2} defaultValue={c.notes} placeholder="Anniversary, kids' names, what they loved…" onBlur={(e) => e.target.value !== c.notes && saveClient({ notes: e.target.value })} /></label>
        <div className="cprof-type">
          <span className="kick-sm" id="cprof-type-label">Questions to use</span>
          {TYPES.map((t) => <button key={t.id} type="button" aria-pressed={type === t.id} aria-describedby="cprof-type-hint" className={"ifilter" + (type === t.id ? " is-on" : "")} onClick={() => setType(t.id)}>{t.label}</button>)}
          <p className="sm-typehint" id="cprof-type-hint">Picks which questions the intake link, a new call sheet and a new shoot use. It isn&apos;t a saved setting — it starts on whatever their last intake, call sheet or shoot was.</p>
        </div>
      </section>

      <div className="cprof-cols">
        <div className="cprof-col cprof-ref">
          <section className="cprof-card">
            <div className="cprof-cardhead"><h2>Initial inquiry</h2>
              <button type="button" className="achip" onClick={() => setPasting(!pasting)}>{pasting ? "Cancel" : "+ Paste an old one"}</button>
            </div>
            {pasting && (
              <form className="cprof-paste" onSubmit={addInquiry}>
                <textarea rows={6} required placeholder="Paste what they sent — the old form, the text, the email…" value={paste.text} onChange={(e) => setPaste({ ...paste, text: e.target.value })} />
                <div className="gcard-actions"><label className="gcard-meta">Sent on <input type="date" value={paste.date} onChange={(e) => setPaste({ ...paste, date: e.target.value })} /></label><button type="submit" className="abtn">Save</button></div>
              </form>
            )}
            {d.messages.length === 0 && !pasting && <p className="gcard-meta">No form from them on file. If they reached out before Studio existed, paste it in so it&apos;s beside you on the call.</p>}
            {d.messages.map((m, i) => <Answers key={m.id} item={m} title={`${m.summary || m.subject || m.kind} · ${fmt(m.created_at)}`} closed={i > 0} />)}
          </section>

          <section className="cprof-card">
            <div className="cprof-cardhead"><h2>Before the call</h2>
              <div className="gcard-actions">
                <button type="button" className="achip" onClick={() => intakeSent("copy")}>Copy intake link</button>
                {c.phone && <button type="button" className="achip" onClick={() => intakeSent("sms")}>Text it</button>}
                <button type="button" className="achip" onClick={() => intakeSent("mail")}>Email it</button>
              </div>
            </div>
            {d.intakes.length === 0 && (
              <p className="gcard-meta">{d.intakeSent ? `Link sent ${fmt(d.intakeSent.created_at)} — nothing back yet.` : "Optional: send the questionnaire and their answers land here (and prefill the call sheet)."}</p>
            )}
            {d.intakes.map((it) => <Answers key={it.id} item={it} title={`${TYPE_LABEL[typeOf(it.utm?.type)]} questionnaire · ${fmt(it.created_at)}`} />)}
          </section>
        </div>

        <div className="cprof-col">
          <section className="cprof-card">
            <div className="cprof-cardhead"><h2>Orientation call</h2>
              <button type="button" className="abtn" onClick={newCall}>+ New call sheet</button>
            </div>
            {d.calls.length === 0 && <p className="gcard-meta">Start a sheet when you&apos;re on the call. Their inquiry stays on the left; the sheet saves as you type.</p>}
            {d.calls.map((call) => (
              <CallSheet key={call.id} call={call} client={c} open={openCall === call.id} onToggle={() => setOpenCall(openCall === call.id ? null : call.id)} onDelete={() => deleteCall(call)} onError={fail} />
            ))}
          </section>

          <ClientShoots client={c} type={type} />

          <section className="cprof-card">
            <div className="cprof-cardhead"><h2>Galleries</h2></div>
            {d.galleries.length === 0 ? <p className="gcard-meta">None yet.</p> : (
              <ul className="cprof-list">{d.galleries.map((g) => (
                <li key={g.id + (g.shared ? "-s" : "")}><strong>{g.title}</strong> <span className="gcard-meta">· {g.media_count || 0} items{g.event_date ? ` · ${fmt(g.event_date)}` : ""}{g.shared ? " · shared with them" : ""}</span>
                  <span className="gcard-actions"><button type="button" className="achip" onClick={() => copy(`https://rothmediaco.com/g/${g.share_token}`, "Share link")}>Copy link</button><a className="achip" href={`/portal/gallery/${g.id}`}>Open</a></span></li>
              ))}</ul>
            )}
          </section>

          <section className="cprof-card">
            <div className="cprof-cardhead"><h2>Payments</h2>
              {owedCents > 0 && <span className="gcard-meta">{usd(owedCents)} still due</span>}
            </div>
            {d.bookingsReady === false && <p className="sm-sqlhint">Bookings aren&apos;t set up yet — run <code>supabase/bookings.sql</code> once and what they pay through the site shows here.</p>}
            {d.bookingsReady !== false && bookings.length === 0 && d.payments.length === 0 && <p className="gcard-meta">Nothing paid through the site under {c.email} yet.</p>}
            {bookings.length > 0 && <BalanceList rows={bookings} showName={false} />}
            {d.payments.length > 0 && (
              <>
                {bookings.length > 0 && <div className="kick-sm">Recorded by hand</div>}
                <ul className="cprof-list">{d.payments.map((p) => <li key={p.id}><strong>{money(p.amount_cents)}</strong> <span className="gcard-meta">· {fmt(p.paid_on)}{p.note ? ` · ${p.note}` : ""}</span></li>)}</ul>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function Answers({ item, title, closed = false }) {
  const [open, setOpen] = useState(!closed);
  const fields = (item.fields || []).filter(([k]) => k !== "for");
  return (
    <div className="cprof-answers">
      <button type="button" className="cprof-toggle" onClick={() => setOpen(!open)} aria-expanded={open}>{title} <span className="gcard-meta">{open ? "▾" : "▸"}</span></button>
      {open && (
        <dl>
          {fields.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{String(v)}</dd></div>)}
          {item.notes && <div><dt>Notes</dt><dd>{item.notes}</dd></div>}
        </dl>
      )}
    </div>
  );
}

// One call sheet: prompts + checks + notes, saved whole on every change (debounced).
function CallSheet({ call, client, open, onToggle, onDelete, onError }) {
  const type = typeOf(call.utm?.type);
  const def = CALL[type];
  const [answers, setAnswers] = useState(Object.fromEntries((call.fields || []).map(([q, a]) => [q, a])));
  const [checks, setChecks] = useState(call.utm?.checks || {});
  const [notes, setNotes] = useState(call.notes || "");
  const [callDate, setCallDate] = useState(call.utm?.call_date || today());
  const [followUp, setFollowUp] = useState(call.utm?.follow_up || "");
  const [state, setState] = useState("saved"); // saved | dirty | saving
  const timer = useRef(null);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setState("dirty");
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setState("saving");
      try {
        await fetch("/api/admin/clients", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "call-save", id: call.id, email: client.email, name: client.name, phone: client.phone, type, answers, checks, notes, callDate, followUp }) }).then(async (r) => { if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "Save failed"); });
        setState("saved");
      } catch (err) { setState("dirty"); onError(err); }
    }, 700);
    return () => clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers, checks, notes, callDate, followUp]);

  const done = def.checks.filter((k) => checks[k]).length;
  return (
    <div className={"callsheet" + (open ? " is-open" : "")}>
      <button type="button" className="cprof-toggle" onClick={onToggle} aria-expanded={open}>
        {TYPE_LABEL[type]} call · {fmt(callDate)} <span className="gcard-meta">· {done}/{def.checks.length} ticked {open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div className="callsheet-body">
          <div className="callsheet-meta">
            <label>Call date<input type="date" value={callDate} onChange={(e) => setCallDate(e.target.value)} /></label>
            <label>Follow up by<input type="date" value={followUp} onChange={(e) => setFollowUp(e.target.value)} /></label>
            <span className={`callsheet-state is-${state}`}>{state === "saved" ? "Saved ✓" : state === "saving" ? "Saving…" : "Unsaved"}</span>
          </div>
          <div className="callsheet-checks">
            {def.checks.map((k) => (
              <label key={k} className={"achip" + (checks[k] ? " is-done" : "")}><input type="checkbox" checked={!!checks[k]} onChange={(e) => setChecks({ ...checks, [k]: e.target.checked })} /> {k}</label>
            ))}
          </div>
          {def.sections.map((sec) => (
            <div key={sec.title} className="callsheet-sec">
              <div className="kick-sm">{sec.title}</div>
              {sec.prompts.map((q) => (
                <label key={q} className="callsheet-q"><span>{q}</span><textarea rows={2} value={answers[q] || ""} onChange={(e) => setAnswers({ ...answers, [q]: e.target.value })} /></label>
              ))}
            </div>
          ))}
          <label className="callsheet-q"><span>Anything else</span><textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
          <div className="gcard-actions"><button type="button" className="achip achip-danger" onClick={onDelete}>Delete sheet</button></div>
        </div>
      )}
    </div>
  );
}
