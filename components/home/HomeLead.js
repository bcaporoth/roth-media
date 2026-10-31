"use client";

import { useState } from "react";
import { submitLead } from "../../lib/submit-lead";
import { track } from "../../lib/track";

const FOR = [["wedding", "A wedding"], ["business", "My business"], ["family", "Family photos"], ["", "Not sure yet"]];
const CONTACT = [["text", "Text"], ["call", "Call"], ["email", "Email"]];

// The homepage lead form: what they're struggling with, what they want,
// how to reach them. Lands in the Studio inbox as a "Homepage" lead; the
// thank-you offers the full questionnaire (/intake), prefilled.
export default function HomeLead() {
  const [status, setStatus] = useState("idle");
  const [cat, setCat] = useState("");
  const [picked, setPicked] = useState("");
  const [pref, setPref] = useState("text");
  const [sent, setSent] = useState(null);

  async function onSubmit(e) {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.currentTarget).entries());
    if (d.website) return;
    setStatus("sending");
    const catLabel = picked;
    try {
      await submitLead({
        kind: "home",
        category: cat,
        name: d.name, email: d.email, phone: d.phone,
        subject: `Homepage — ${d.name}${catLabel ? ` · ${catLabel}` : ""}`,
        summary: `${d.struggle || d.goal || "New lead"}`.slice(0, 120),
        fields: [
          ["name", d.name], ["email", d.email], ["phone", d.phone],
          ["for", catLabel], ["struggling with", d.struggle], ["goal", d.goal],
          ["reach me by", pref],
        ],
      });
      track("home_lead_sent", { category: cat, pref });
      setSent({ ...d, cat });
      setStatus("sent");
    } catch { setStatus("error"); }
  }

  if (status === "sent" && sent) {
    const q = new URLSearchParams({ name: sent.name, email: sent.email, phone: sent.phone, type: sent.cat, goal: sent.goal || "", struggle: sent.struggle || "" });
    return (
      <div className="cin-lead cin-lead--done" role="status">
        <p className="cin-lead-kick">Got it, {String(sent.name).split(/\s+/)[0]}</p>
        <h2>I&apos;ll {pref === "email" ? "email" : pref} you today.</h2>
        <p className="cin-lead-sub">Want to skip a call&apos;s worth of questions? Five minutes now and our first conversation is all about you — dates, what it&apos;s for, the one shot you can&apos;t miss.</p>
        <a className="cin-btn cin-btn--light cin-lead-next" href={`/intake?${q.toString()}`}>Go a step further → the questionnaire</a>
        <p className="cin-lead-fine">Already filled in: your name and contact. Nothing to retype.</p>
      </div>
    );
  }

  return (
    <form className="cin-lead" onSubmit={onSubmit}>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="cin-honey" aria-hidden="true" />
      <p className="cin-lead-kick">Start here</p>
      <h2>Tell me what you&apos;re working on.</h2>
      <p className="cin-lead-sub">A couple of lines is plenty. I read every one and reply the same day.</p>

      <fieldset className="cin-lead-for">
        <legend>It&apos;s for</legend>
        <div className="cin-lead-pills">
          {FOR.map(([id, label]) => (
            <button key={label} type="button" className={"cin-lead-pill" + (picked === label ? " is-on" : "")} aria-pressed={picked === label} onClick={() => { setCat(id); setPicked(label); }}>{label}</button>
          ))}
        </div>
      </fieldset>

      <label className="cin-lead-field">
        <span>What are you struggling with?</span>
        <textarea name="struggle" rows={2} placeholder="e.g. Nobody knows we exist · our wedding is in 5 months and we have no video · the website looks ten years old" />
      </label>
      <label className="cin-lead-field">
        <span>What would a win look like?</span>
        <textarea name="goal" rows={2} placeholder="e.g. 10 more bookings a month · a film we'll watch for 50 years · a site that actually gets calls" />
      </label>

      <div className="cin-lead-grid">
        <label className="cin-lead-field"><span>Name</span><input name="name" required autoComplete="name" /></label>
        <label className="cin-lead-field"><span>Email</span><input name="email" type="email" required autoComplete="email" inputMode="email" /></label>
        <label className="cin-lead-field"><span>Phone</span><input name="phone" type="tel" required autoComplete="tel" inputMode="tel" /></label>
        <fieldset className="cin-lead-field cin-lead-pref">
          <legend>Reach me by</legend>
          <div className="cin-lead-pills">
            {CONTACT.map(([id, label]) => (
              <button key={id} type="button" className={"cin-lead-pill" + (pref === id ? " is-on" : "")} aria-pressed={pref === id} onClick={() => setPref(id)}>{label}</button>
            ))}
          </div>
        </fieldset>
      </div>

      <button type="submit" className="cin-btn cin-btn--light cin-lead-go" disabled={status === "sending"}>
        {status === "sending" ? "Sending…" : "Have Brandon reach out"}
      </button>
      {status === "error" && <p className="cin-lead-err" role="alert">That didn&apos;t send — text me at 845-549-4425 instead.</p>}
      <p className="cin-lead-fine">No newsletter, no bots. Just me.</p>
    </form>
  );
}
