"use client";

// /intake — the questionnaire a client fills in before the orientation call.
// Saves to the Studio inbox (kind "intake"), then offers a call slot.
// mode="portal" (/portal/brief): the same questions, prefilled from their
// saved brief, saving over the same record — no call slot, no new row.
// Portal step 2 (2026-11-08): `types` = the services they picked in the
// welcome form (pills limited to those), `initialByType` = each service's
// saved answers, `skipWelcomeAsked` hides questions the welcome form already asked.
// mode="admin" (2026-11-24, Command Center → client → Fill in intake): Brandon
// fills it in WITH the client. Nothing required, saves by itself as he types
// (same row the client edits from their portal), no emails, no call picker.

import { useEffect, useRef, useState } from "react";
import AutoText from "./AutoText";
import AddressInput from "./AddressInput";
import AddonPicker from "./AddonPicker";
import { submitLead } from "../lib/submit-lead";
import { track } from "../lib/track";
import { INTAKE, TYPES, TYPE_LABEL, typeOf, ASKED_IN_WELCOME, SHOT_GROUP, shotPart } from "../lib/intake";
import BookCall from "./BookCall";

// Is pick p in the answer? Match whole phrases, so a pick with a comma in it
// ("Nobody, just the place and the work") still lights up after a reload.
const hasPick = (v, p) => `, ${String(v || "").trim()}, `.includes(`, ${p}, `);
const togglePickText = (v, p) => {
  const cur = String(v || "").trim();
  if (!hasPick(cur, p)) return cur ? `${cur}, ${p}` : p;
  return `, ${cur}, `.replace(`, ${p}, `, ", ").replace(/^, |, $/g, "").replace(/^,\s*|,\s*$/g, "").trim();
};

export default function IntakeForm({ email: email0 = "", name: name0 = "", phone: phone0 = "", type: type0 = "", initial = {}, mode = "public", types = null, initialByType = null, skipWelcomeAsked = false, backHref = "", quoteBase = "", savedTypes = null }) {
  const portal = mode === "portal";
  const admin = mode === "admin";
  const [type, setType] = useState(type0 ? typeOf(type0) : "");
  const [name, setName] = useState(name0);
  const [email, setEmail] = useState(email0);
  const [phone, setPhone] = useState(phone0);
  // Answers per service, so switching pills never loses what they typed.
  const [byType, setByType] = useState(() => initialByType || (type0 ? { [typeOf(type0)]: initial } : {}));
  const [saved, setSaved] = useState(() => savedTypes || Object.keys(initialByType || {}).filter((t) => Object.keys(initialByType[t] || {}).length));
  const answers = (type && byType[type]) || {};
  const setAnswers = (a) => { touched.current = true; setByType((b) => ({ ...b, [type]: a })); };
  const setOne = (q, fn) => { touched.current = true; setByType((b) => ({ ...b, [type]: { ...(b[type] || {}), [q]: fn((b[type] || {})[q] || "") } })); };
  const pills = types?.length ? TYPES.filter((t) => types.includes(t.id)) : TYPES;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [sid, setSid] = useState(""); // this intake's id, so a booked call shows in Studio
  // Admin: autosave state. "saved" | "dirty" | "saving" | "error"
  const [saveState, setSaveState] = useState("saved");
  const [savedAt, setSavedAt] = useState("");
  const touched = useRef(false);
  const timer = useRef(null);
  async function adminSave(t = type) {
    if (!t) return null;
    setSaveState("saving");
    try {
      const res = await fetch("/api/admin/clients", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "intake-save", email, name, phone, type: t, answers: byType[t] || {} }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `Save failed (${res.status})`);
      setSid(json.id || "");
      setSaved((s) => (s.includes(t) ? s : [...s, t]));
      setSaveState("saved"); setError("");
      setSavedAt(new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }));
      return json;
    } catch (err) { setSaveState("error"); setError(`Not saved yet: ${err.message}. It will try again when you type, or tap Save.`); return null; }
  }
  useEffect(() => {
    if (!admin || !touched.current || !type) return;
    setSaveState("dirty");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => adminSave(type), 1200);
    return () => clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [byType, name, phone]);
  // Admin: leaving with unsaved typing asks first.
  useEffect(() => {
    if (!admin) return;
    const warn = (e) => { if (saveState === "dirty" || saveState === "saving" || saveState === "error") { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [admin, saveState]);

  const questions = type ? INTAKE[type].filter((it) => !(skipWelcomeAsked && ASKED_IN_WELCOME.test(it.q))) : [];
  // The three shot questions render as one block where the first of them sits.
  const blocks = [];
  questions.forEach((it, i) => {
    if (shotPart(it.q) < 0) return blocks.push({ it, i });
    const g = blocks.find((b) => b.group);
    if (g) g.group.push({ it, i });
    else blocks.push({ group: [{ it, i }] });
  });
  for (const b of blocks) if (b.group) b.group.sort((x, y) => shotPart(x.it.q) - shotPart(y.it.q));
  // Pick several: each tap adds or removes its words ("Instagram, Facebook").
  const togglePick = (it, p) => {
    setOne(it.q, (v) => togglePickText(v, p));
  };
  const pickRow = (it, i) => (
    <div className="cx-pills mx-picks" role="group" aria-label={`${it.q}: tap any`}>
      {it.picks.map((p) => { const on = hasPick(answers[it.q], p); return <button key={p} type="button" aria-pressed={on} className={"cx-pill" + (on ? " is-on" : "")} onClick={() => togglePick(it, p)}>{p}</button>; })}
    </div>
  );
  const box = (it, i) =>
    it.choices
      ? (
        <>
          <div className="cx-pills mx-picks" role="radiogroup" aria-label={it.q} id={`in-q${i}`}>
            {it.choices.map((c) => <button key={c} type="button" role="radio" aria-checked={answers[it.q] === c} className={"cx-pill" + (answers[it.q] === c ? " is-on" : "")} onClick={() => setOne(it.q, (v) => (v === c ? "" : c))}>{c}</button>)}
          </div>
          {answers[it.q] && !it.choices.includes(answers[it.q]) && <p className="cx-help">Earlier answer: {answers[it.q]}</p>}
        </>
      )
      : it.picks
      ? (
        <>
          {pickRow(it, i)}
          <AutoText className="cx-input" id={`in-q${i}`} placeholder="Or type it here" value={answers[it.q] || ""} onChange={(e) => setAnswers({ ...answers, [it.q]: e.target.value })} />
        </>
      )
      : it.addons
      ? <AddonPicker category={it.addons} id={`in-q${i}`} value={answers[it.q] || ""} onChange={(v) => setAnswers({ ...answers, [it.q]: v })} />
      : it.address
      ? <AddressInput endpoint={portal ? "/api/portal/geo" : "/api/admin/geo"} className="mx-addr" inputClassName="cx-input" id={`in-q${i}`} name={`q${i}`} required={!it.opt && !admin} placeholder="Start typing the place or address…" value={answers[it.q] || ""} onChange={(v) => setAnswers({ ...answers, [it.q]: v })} />
      : it.long
      ? <AutoText className="cx-textarea" id={`in-q${i}`} rows={it.opt || shotPart(it.q) >= 0 ? 2 : 3} required={!it.opt && !admin} value={answers[it.q] || ""} onChange={(e) => setAnswers({ ...answers, [it.q]: e.target.value })} />
      : <AutoText className="cx-input" id={`in-q${i}`} required={!it.opt && !admin} value={answers[it.q] || ""} onChange={(e) => setAnswers({ ...answers, [it.q]: e.target.value })} />;

  async function submit(e) {
    e.preventDefault();
    if (!type) { setError("Pick what this is for first."); return; }
    setBusy(true); setError("");
    const fields = questions.map((it) => [it.q, (answers[it.q] || "").trim()]).filter(([, v]) => v);
    if (admin) {
      clearTimeout(timer.current);
      const r = await adminSave(type);
      setBusy(false);
      if (r) { setDone(true); window.scrollTo({ top: 0, behavior: "smooth" }); }
      return;
    }
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
      const res = await submitLead({
        kind: "intake",
        type,
        name, email, phone,
        subject: `Intake — ${name || email}`,
        summary: `${TYPES.find((t) => t.id === type)?.label || "Intake"} intake · ${fields.length} answers`,
        fields: [["for", type], ...fields],
      });
      track("intake_sent", { category: type });
      setSid(res.id);
      setDone(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("That didn't go through — text me at 845-549-4425 and I'll take it by hand.");
    } finally { setBusy(false); }
  }

  if (done && admin) {
    const first = (name || "").split(" ")[0] || "them";
    return (
      <div className="mx-intake-done">
        <div className="mx-done" role="status">
          <p className="mx-done-title">{TYPE_LABEL[type]} intake saved.</p>
          <p>It&apos;s on {first}&apos;s profile under Paperwork. You can come back and change anything.</p>
        </div>
        <div className="mx-done-acts">
          {quoteBase && sid && <a className="cx-btn cx-btn--light" href={`${quoteBase}${sid}`}>Build their quote</a>}
          {backHref && <a className="cx-btn" href={backHref}>Back to {first}&apos;s profile</a>}
          <button type="button" className="cx-btn" onClick={() => setDone(false)}>Keep editing</button>
        </div>
      </div>
    );
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
        <BookCall name={name} email={email} from="intake" sid={sid} />
      </div>
    );
  }

  return (
    <form className="mx-form" onSubmit={submit}>
      <div className="mx-field">
        <p className="cx-label" id="in-type">{types?.length > 1 ? "Details for" : "This is for"}</p>
        <div className="cx-pills" role="group" aria-labelledby="in-type">
          {pills.map((t) => (
            <button key={t.id} type="button" className={"cx-pill" + (type === t.id ? " is-on" : "")} aria-pressed={type === t.id} onClick={() => { if (admin && type && type !== t.id && saveState !== "saved") { clearTimeout(timer.current); adminSave(type); } setType(t.id); }}>{saved.includes(t.id) ? "✓ " : ""}{t.label}</button>
          ))}
        </div>
        {!type && <p className="cx-help">Pick one and the questions for it appear below.</p>}
        {types?.length > 1 && <p className="cx-help">One set of questions for each thing you picked. A ✓ means it's saved.</p>}
      </div>
      <div className="cx-form-row">
        <div className="mx-field"><label className="cx-label" htmlFor="in-name">Full name</label><input className="cx-input" id="in-name" required={!admin} value={name} onChange={(e) => { touched.current = true; setName(e.target.value); }} autoComplete="name" /></div>
        <div className="mx-field"><label className="cx-label" htmlFor="in-phone">Best phone</label><input className="cx-input" id="in-phone" type="tel" value={phone} onChange={(e) => { touched.current = true; setPhone(e.target.value); }} autoComplete="tel" inputMode="tel" /></div>
      </div>
      {admin && <p className="cx-help">Email: {email}. Change it in their Settings tab.</p>}
      {!portal && !admin && <div className="mx-field"><label className="cx-label" htmlFor="in-email">Email</label><input className="cx-input" id="in-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" inputMode="email" autoCapitalize="none" /></div>}

      {blocks.map((b, n) => {
        const num = <span className="mx-q-n" aria-hidden="true">{String(n + 1).padStart(2, "0")}</span>;
        if (b.group) {
          return (
            <div key="shots" className="mx-field mx-q mx-q-group" role="group" aria-labelledby="in-shots">
              {num}
              <p className="cx-label" id="in-shots">{SHOT_GROUP.title}</p>
              <p className="cx-help">{SHOT_GROUP.hint}</p>
              {b.group.map(({ it, i }) => (
                <div key={it.q} className="mx-subq">
                  <label className="mx-subq-label" htmlFor={`in-q${i}`}>{SHOT_GROUP.parts[shotPart(it.q)].label}{it.opt ? <span className="mx-opt"> optional</span> : null}</label>
                  {it.hint && <p className="cx-help">{it.hint}</p>}
                  {box(it, i)}
                </div>
              ))}
            </div>
          );
        }
        const { it, i } = b;
        return (
          <div key={it.q} className="mx-field mx-q">
            {num}
            {it.addons
              ? <p className="cx-label">{it.q}{it.opt ? <span className="mx-opt"> optional</span> : null}</p>
              : <label className="cx-label" htmlFor={`in-q${i}`}>{it.q}{it.opt ? <span className="mx-opt"> optional</span> : null}</label>}
            {it.hint && <p className="cx-help">{it.hint}</p>}
            {box(it, i)}
          </div>
        );
      })}
      <input type="text" name="website" className="cform-honey" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      {type && <button type="submit" className="cx-btn cx-btn--light cx-btn--lg" disabled={busy}>{busy ? (portal || admin ? "Saving…" : "Sending…") : admin ? "Save and finish" : portal ? `Save my ${TYPE_LABEL[type].toLowerCase()} details` : "Send it to Brandon"}</button>}
      {admin && type && <p className="mx-autosave" role="status" aria-live="polite">{saveState === "saving" ? "Saving…" : saveState === "dirty" ? "Typing… saves in a second" : saveState === "error" ? "Not saved yet" : savedAt ? `Saved ${savedAt}` : saved.includes(type) ? "Saved earlier. Changes save by themselves." : "Changes save by themselves as you type."}</p>}
      {error && <p className="cx-error" role="alert">{error}</p>}
    </form>
  );
}
