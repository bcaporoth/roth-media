"use client";

// /intake — the questionnaire a client fills in before the orientation call.
// Saves to the Studio inbox (kind "intake"), then offers a call slot.

import { useState } from "react";
import { submitLead } from "../lib/submit-lead";
import { INTAKE, TYPES, typeOf } from "../lib/intake";
import BookCall from "./BookCall";

export default function IntakeForm({ email: email0 = "", name: name0 = "", type: type0 = "" }) {
  const [type, setType] = useState(type0 ? typeOf(type0) : "");
  const [name, setName] = useState(name0);
  const [email, setEmail] = useState(email0);
  const [phone, setPhone] = useState("");
  const [answers, setAnswers] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const questions = type ? INTAKE[type] : [];

  async function submit(e) {
    e.preventDefault();
    if (!type) { setError("Pick what this is for first."); return; }
    setBusy(true); setError("");
    const fields = questions.map((it) => [it.q, (answers[it.q] || "").trim()]).filter(([, v]) => v);
    try {
      await submitLead({
        kind: "intake",
        type,
        name, email, phone,
        subject: `Intake — ${name || email}`,
        summary: `${TYPES.find((t) => t.id === type)?.label || "Intake"} intake · ${fields.length} answers`,
        fields: [["for", type], ...fields],
      });
      setDone(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("That didn't go through — text me at 845-549-4425 and I'll take it by hand.");
    } finally { setBusy(false); }
  }

  if (done) {
    return (
      <div className="intake-done">
        <div className="cform-success" role="status">
          <p className="cform-success-title">Got it — thank you.</p>
          <p className="cform-success-body">I&apos;ll read this before we talk, so the call is about you and not about forms.</p>
        </div>
        <BookCall name={name} email={email} from="intake" />
      </div>
    );
  }

  return (
    <form className="cform intake-form" onSubmit={submit}>
      <div>
        <label htmlFor="in-type">This is for</label>
        <div className="intake-types" role="radiogroup" aria-labelledby="in-type">
          {TYPES.map((t) => (
            <button key={t.id} type="button" className={"ifilter" + (type === t.id ? " is-on" : "")} aria-pressed={type === t.id} onClick={() => setType(t.id)}>{t.label}</button>
          ))}
        </div>
      </div>
      <div className="row">
        <div><label htmlFor="in-name">Your name</label><input id="in-name" required value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></div>
        <div><label htmlFor="in-phone">Best phone</label><input id="in-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" inputMode="tel" /></div>
      </div>
      <div><label htmlFor="in-email">Email</label><input id="in-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" inputMode="email" autoCapitalize="none" /></div>

      {questions.map((it, i) => (
        <div key={it.q}>
          <label htmlFor={`in-q${i}`}>{it.q}{it.opt ? <span className="intake-opt"> optional</span> : null}</label>
          {it.hint && <p className="intake-hint">{it.hint}</p>}
          {it.long
            ? <textarea id={`in-q${i}`} rows={3} required={!it.opt} value={answers[it.q] || ""} onChange={(e) => setAnswers({ ...answers, [it.q]: e.target.value })} />
            : <input id={`in-q${i}`} required={!it.opt} value={answers[it.q] || ""} onChange={(e) => setAnswers({ ...answers, [it.q]: e.target.value })} />}
        </div>
      ))}
      <input type="text" name="website" className="cform-honey" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      {type && <button type="submit" disabled={busy}>{busy ? "Sending…" : "Send it to Brandon"}</button>}
      {error && <p className="cform-error" role="alert">{error}</p>}
    </form>
  );
}
