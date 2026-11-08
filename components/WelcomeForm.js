"use client";

// Step 1 of the portal brief (/portal/brief): the welcome form. Who they are,
// what they're interested in (pick one or more), what they want and what's
// been hard. Saves to /api/portal/welcome, then on to step 2 — the detailed
// brief for each service they picked.

import { useState } from "react";
import { TYPES, WELCOME } from "../lib/intake";

export default function WelcomeForm({ name: name0 = "", phone: phone0 = "", services: services0 = [], initial = {}, editing = false }) {
  const [name, setName] = useState(name0);
  const [phone, setPhone] = useState(phone0);
  const [services, setServices] = useState(services0);
  const [answers, setAnswers] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const toggle = (id) => setServices((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  async function submit(e) {
    e.preventDefault();
    if (!services.length) {
      setError("Pick at least one thing you're interested in. You can pick more than one.");
      document.getElementById("wf-pick")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/portal/welcome", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, services, answers }),
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
          <label className="cx-label" htmlFor={`wf-q${i}`}>{it.q}{it.opt ? <span className="mx-opt"> optional</span> : null}</label>
          {it.hint && <p className="cx-help">{it.hint}</p>}
          {it.long
            ? <textarea className="cx-textarea" id={`wf-q${i}`} rows={3} required={!it.opt} value={answers[it.q] || ""} onChange={(e) => setAnswers({ ...answers, [it.q]: e.target.value })} />
            : <input className="cx-input" id={`wf-q${i}`} required={!it.opt} value={answers[it.q] || ""} onChange={(e) => setAnswers({ ...answers, [it.q]: e.target.value })} />}
        </div>
      ))}

      <button type="submit" className="cx-btn cx-btn--light cx-btn--lg" disabled={busy}>
        {busy ? "Saving…" : editing ? "Save changes" : "Save and keep going →"}
      </button>
      {error && <p className="cx-error" role="alert">{error}</p>}
    </form>
  );
}
