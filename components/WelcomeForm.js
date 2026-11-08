"use client";

// Step 1 of the portal brief (/portal/brief): the welcome form. Who they are,
// what they're interested in (pick one or more), what they want and what's
// been hard. Saves to /api/portal/welcome, then on to step 2 — the detailed
// brief for each service they picked.

import { useState } from "react";
import AutoText from "./AutoText";
import { TYPES, WELCOME } from "../lib/intake";

export default function WelcomeForm({ name: name0 = "", phone: phone0 = "", services: services0 = [], initial = {}, editing = false }) {
  const [name, setName] = useState(name0);
  const [phone, setPhone] = useState(phone0);
  const [services, setServices] = useState(services0);
  // A pick with a detail is saved as "Choice — detail"; split it back for editing.
  const [answers, setAnswers] = useState(() => {
    const a = { ...initial };
    for (const it of WELCOME) {
      const v = a[it.q];
      if (!it.choices || !v || it.choices.includes(v)) continue;
      const hit = it.choices.find((c) => v.startsWith(`${c} — `));
      if (hit) { a[it.q] = hit; a[`${it.q}::detail`] = v.slice(hit.length + 3); }
    }
    return a;
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const toggle = (id) => setServices((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  // The pick and its little detail box travel as one answer.
  function packed() {
    const out = {};
    for (const it of WELCOME) {
      const v = (answers[it.q] || "").trim();
      const d = it.detail ? (answers[`${it.q}::detail`] || "").trim() : "";
      if (v || d) out[it.q] = v && d ? `${v} — ${d}` : v || d;
    }
    return out;
  }

  async function submit(e) {
    e.preventDefault();
    if (!services.length) {
      setError("Pick at least one thing you're interested in. You can pick more than one.");
      document.getElementById("wf-pick")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const unpicked = WELCOME.find((it) => it.choices && !it.opt && !answers[it.q]);
    if (unpicked) {
      setError(`Pick one for "${unpicked.q}".${unpicked.choices.includes("Not sure yet") ? ' "Not sure yet" is fine.' : ""}`);
      document.getElementById(`wf-q${WELCOME.indexOf(unpicked)}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/portal/welcome", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, services, answers: packed() }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Save failed");
      // On to step 2: the details for the first service they picked.
      window.location.assign(`/portal/brief?type=${encodeURIComponent(services[0])}&saved=1`);
    } catch (err) {
      setBusy(false);
      setError(`That didn't save (${err.message}). Try once more, or text me at 845-549-4425.`);
    }
  }

  return (
    <form className="mx-form" onSubmit={submit}>
      <div className="cx-form-row">
        <div className="mx-field">
          <label className="cx-label" htmlFor="wf-name">Full name</label>
          <input className="cx-input" id="wf-name" required value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </div>
        <div className="mx-field">
          <label className="cx-label" htmlFor="wf-phone">Best phone</label>
          <input className="cx-input" id="wf-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" inputMode="tel" />
        </div>
      </div>

      <div className="mx-field" id="wf-pick">
        <p className="cx-label" id="wf-pick-label">What are you interested in?</p>
        <p className="cx-help">Pick as many as you like.</p>
        <div className="cx-pills" role="group" aria-labelledby="wf-pick-label">
          {TYPES.map((t) => (
            <button key={t.id} type="button" className={"cx-pill" + (services.includes(t.id) ? " is-on" : "")} aria-pressed={services.includes(t.id)} onClick={() => toggle(t.id)}>
              {services.includes(t.id) ? "✓ " : ""}{t.label}
            </button>
          ))}
        </div>
      </div>

      {WELCOME.map((it, i) => (
        <div key={it.q} className="mx-field mx-q">
          <span className="mx-q-n" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
          {it.choices ? <p className="cx-label" id={`wf-q${i}-l`}>{it.q}</p> : <label className="cx-label" htmlFor={`wf-q${i}`}>{it.q}{it.opt ? <span className="mx-opt"> optional</span> : null}</label>}
          {it.hint && <p className="cx-help">{it.hint}</p>}
          {it.choices ? (
            <>
            <div className="cx-pills" role="radiogroup" aria-labelledby={`wf-q${i}-l`} id={`wf-q${i}`}>
              {it.choices.map((c) => (
                <button key={c} type="button" role="radio" aria-checked={answers[it.q] === c} className={"cx-pill" + (answers[it.q] === c ? " is-on" : "")} onClick={() => setAnswers({ ...answers, [it.q]: c })}>
                  {c}
                </button>
              ))}
            </div>
            {it.detail && (
              <input className="cx-input wf-detail" spellCheck autoCorrect="on" autoCapitalize="words" aria-label={it.detail} placeholder={it.detail} value={answers[`${it.q}::detail`] || ""} onChange={(e) => setAnswers({ ...answers, [`${it.q}::detail`]: e.target.value })} />
            )}
            </>
          ) : it.long
            ? <AutoText className="cx-textarea" id={`wf-q${i}`} rows={3} required={!it.opt} value={answers[it.q] || ""} onChange={(e) => setAnswers({ ...answers, [it.q]: e.target.value })} />
            : <AutoText className="cx-input" id={`wf-q${i}`} required={!it.opt} value={answers[it.q] || ""} onChange={(e) => setAnswers({ ...answers, [it.q]: e.target.value })} />}
        </div>
      ))}

      <button type="submit" className="cx-btn cx-btn--light cx-btn--lg" disabled={busy}>
        {busy ? "Saving…" : editing ? "Save changes" : "Save and keep going →"}
      </button>
      {error && <p className="cx-error" role="alert">{error}</p>}
    </form>
  );
}
