"use client";

// /intake — the questionnaire a client fills in before the orientation call.
// Saves to the Studio inbox (kind "intake"), then offers a call slot.
// mode="portal" (/portal/brief): the same questions, prefilled from their
// saved brief, saving over the same record — no call slot, no new row.
// Portal step 2 (2026-11-08): `types` = the services they picked in the
// welcome form (pills limited to those), `initialByType` = each service's
// saved answers, `skipWelcomeAsked` hides questions the welcome form already asked.

import { useState } from "react";
import AutoText from "./AutoText";
import AddressInput from "./AddressInput";
import { submitLead } from "../lib/submit-lead";
import { track } from "../lib/track";
import { INTAKE, TYPES, TYPE_LABEL, typeOf, ASKED_IN_WELCOME } from "../lib/intake";
import BookCall from "./BookCall";

export default function IntakeForm({ email: email0 = "", name: name0 = "", phone: phone0 = "", type: type0 = "", initial = {}, mode = "public", types = null, initialByType = null, skipWelcomeAsked = false }) {
  const portal = mode === "portal";
  const [type, setType] = useState(type0 ? typeOf(type0) : "");
  const [name, setName] = useState(name0);
  const [email, setEmail] = useState(email0);
  const [phone, setPhone] = useState(phone0);
  // Answers per service, so switching pills never loses what they typed.
  const [byType, setByType] = useState(() => initialByType || (type0 ? { [typeOf(type0)]: initial } : {}));
  const [saved, setSaved] = useState(() => Object.keys(initialByType || {}).filter((t) => Object.keys(initialByType[t] || {}).length));
  const answers = (type && byType[type]) || {};
  const setAnswers = (a) => setByType((b) => ({ ...b, [type]: a }));
  const pills = types?.length ? TYPES.filter((t) => types.includes(t.id)) : TYPES;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const questions = type ? INTAKE[type].filter((it) => !(skipWelcomeAsked && ASKED_IN_WELCOME.test(it.q))) : [];

  async function submit(e) {
    e.preventDefault();
    if (!type) { setError("Pick what this is for first."); return; }
    setBusy(true); setError("");
    const fields = questions.map((it) => [it.q, (answers[it.q] || "").trim()]).filter(([, v]) => v);
    if (portal) {
      try {
        const res = await fetch("/api/portal/brief", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, name, phone, answers }) });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Save failed");
        setSaved((s) => (s.includes(type) ? s : [...s, type]));
        setDone(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch (err) {
        setError(`That didn't save (${err.message}). Try once more, or text me at 845-549-4425.`);
      } finally { setBusy(false); }
      return;
    }
    try {
      await submitLead({
        kind: "intake",
        type,
        name, email, phone,
        subject: `Intake — ${name || email}`,
        summary: `${TYPES.find((t) => t.id === type)?.label || "Intake"} intake · ${fields.length} answers`,
        fields: [["for", type], ...fields],
      });
      track("intake_sent", { category: type });
      setDone(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("That didn't go through — text me at 845-549-4425 and I'll take it by hand.");
    } finally { setBusy(false); }
  }

  if (done && portal) {
    const next = pills.find((t) => !saved.includes(t.id));
    return (
      <div className="mx-intake-done">
        <div className="mx-done" role="status">
          <p className="mx-done-title">{TYPE_LABEL[type]} details saved.</p>
          <p>
            {next
              ? `One more to go: your ${next.label.toLowerCase()} details.`
              : "That's everything. I see it right away. Come back and change anything whenever you like."}
          </p>
        </div>
        <div className="mx-done-acts">
          {next && <button type="button" className="cx-btn cx-btn--light" onClick={() => { setType(next.id); setDone(false); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Next: {next.label} →</button>}
          {!next && <a className="cx-btn cx-btn--light" href="/portal">Back to my portal</a>}
          <button type="button" className="cx-btn" onClick={() => setDone(false)}>Edit {TYPE_LABEL[type].toLowerCase()} again</button>
        </div>
      </div>
    );
  }
  if (done) {
    return (
      <div className="mx-intake-done">
        <div className="mx-done" role="status">
          <p className="mx-done-title">Got it — thank you.</p>
          <p>I&apos;ll read this before we talk, so the call is about you and not about forms.</p>
        </div>
        <BookCall name={name} email={email} from="intake" />
      </div>
    );
  }

  return (
    <form className="mx-form" onSubmit={submit}>
      <div className="mx-field">
        <p className="cx-label" id="in-type">{types?.length > 1 ? "Details for" : "This is for"}</p>
        <div className="cx-pills" role="group" aria-labelledby="in-type">
          {pills.map((t) => (
            <button key={t.id} type="button" className={"cx-pill" + (type === t.id ? " is-on" : "")} aria-pressed={type === t.id} onClick={() => setType(t.id)}>{saved.includes(t.id) ? "✓ " : ""}{t.label}</button>
          ))}
        </div>
        {!type && <p className="cx-help">Pick one and the questions for it appear below.</p>}
        {types?.length > 1 && <p className="cx-help">One set of questions for each thing you picked. A ✓ means it's saved.</p>}
      </div>
      <div className="cx-form-row">
        <div className="mx-field"><label className="cx-label" htmlFor="in-name">Full name</label><input className="cx-input" id="in-name" required value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></div>
        <div className="mx-field"><label className="cx-label" htmlFor="in-phone">Best phone</label><input className="cx-input" id="in-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" inputMode="tel" /></div>
      </div>
      {!portal && <div className="mx-field"><label className="cx-label" htmlFor="in-email">Email</label><input className="cx-input" id="in-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" inputMode="email" autoCapitalize="none" /></div>}

      {questions.map((it, i) => (
        <div key={it.q} className="mx-field mx-q">
          <span className="mx-q-n" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
          <label className="cx-label" htmlFor={`in-q${i}`}>{it.q}{it.opt ? <span className="mx-opt"> optional</span> : null}</label>
          {it.hint && <p className="cx-help">{it.hint}</p>}
          {it.address
            ? <AddressInput endpoint={portal ? "/api/portal/geo" : "/api/admin/geo"} className="mx-addr" inputClassName="cx-input" id={`in-q${i}`} name={`q${i}`} required={!it.opt} placeholder="Start typing the place or address…" value={answers[it.q] || ""} onChange={(v) => setAnswers({ ...answers, [it.q]: v })} />
            : it.long
            ? <AutoText className="cx-textarea" id={`in-q${i}`} rows={3} required={!it.opt} value={answers[it.q] || ""} onChange={(e) => setAnswers({ ...answers, [it.q]: e.target.value })} />
            : <AutoText className="cx-input" id={`in-q${i}`} required={!it.opt} value={answers[it.q] || ""} onChange={(e) => setAnswers({ ...answers, [it.q]: e.target.value })} />}
        </div>
      ))}
      <input type="text" name="website" className="cform-honey" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      {type && <button type="submit" className="cx-btn cx-btn--light cx-btn--lg" disabled={busy}>{busy ? (portal ? "Saving…" : "Sending…") : portal ? `Save my ${TYPE_LABEL[type].toLowerCase()} details` : "Send it to Brandon"}</button>}
      {error && <p className="cx-error" role="alert">{error}</p>}
    </form>
  );
}
