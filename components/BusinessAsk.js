"use client";

// The business + event quote form (2026-11-15). No packages, no prices:
// the client says what they want, it lands in the Studio Inbox, and Brandon
// builds a quote with three options (Studio → Money → Quotes).

import { useEffect, useRef, useState } from "react";
import { submitLead } from "../lib/submit-lead";
import { track } from "../lib/track";
import { ASK } from "../lib/quotes";

function Pills({ label, options, value, onChange, many = false }) {
  const on = (o) => (many ? value.includes(o) : value === o);
  // Functional update, so two quick taps never undo each other.
  const tap = (o) => onChange(many ? (cur) => (cur.includes(o) ? cur.filter((x) => x !== o) : [...cur, o]) : o);
  return (
    <div className="ba-q" role="group" aria-label={label}>
      <div className="cx-pills ba-pills">
        {options.map((o) => (
          <button type="button" key={o} className={`cx-pill${on(o) ? " is-on" : ""}`} aria-pressed={on(o)} onClick={() => tap(o)}>{o}</button>
        ))}
      </div>
    </div>
  );
}

export default function BusinessAsk() {
  const topRef = useRef(null);
  const [goals, setGoals] = useState([]);
  const [where, setWhere] = useState([]);
  const [often, setOften] = useState("");
  const [budget, setBudget] = useState("");
  const [status, setStatus] = useState("idle");
  const [missing, setMissing] = useState("");
  const [sentName, setSentName] = useState("");
  useEffect(() => { if (status === "sent") topRef.current?.scrollIntoView({ block: "start" }); }, [status]);

  const started = useRef(false);
  const touch = () => { if (!started.current) { started.current = true; track("quote_started", { category: "business" }); } };

  async function submit(e) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    if (data._honey) return;
    if (!goals.length) { setMissing("Pick at least one thing you're trying to do."); return; }
    setMissing("");
    setStatus("sending");
    const name = `${data.firstName || ""} ${data.lastName || ""}`.trim();
    const business = String(data.business || "").trim();
    const fields = [
      ["what it's for", "My business or an event"],
      ["business", business],
      ["trying to do", goals.join(", ")],
      ["where it'll show up", where.join(", ")],
      ["how often", often],
      ["budget", budget],
      ["when", String(data.when || "").trim()],
      ["anything else", String(data.notes || "").trim()],
      ["best way to reach", data.reach || ""],
      ["first name", data.firstName], ["last name", data.lastName], ["email", data.email], ["phone", data.phone],
    ].filter(([, v]) => String(v || "").trim());
    try {
      await submitLead({
        kind: "quote",
        category: "business",
        name,
        email: data.email,
        phone: data.phone,
        subject: `Quote request — ${name}${business ? ` · ${business}` : ""}`,
        summary: `Wants a quote · ${goals.join(", ")}${budget ? ` · ${budget}` : ""}`,
        fields,
      });
      track("quote_sent", { category: "business" });
      setSentName(String(data.firstName || "").trim());
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div className="qt-sent ba-sent" role="status" ref={topRef}>
        <p className="cx-kick">Request sent</p>
        <h2 className="cx-h2">Got it{sentName ? `, ${sentName}` : ""}.</h2>
        <p className="cx-lede">I'll look at what you need and send you a quote with three options to pick from. Questions before then? Text 845-549-4425.</p>
      </div>
    );
  }

  return (
    <form className="qt-form ba-form" onSubmit={submit} onInput={touch} ref={topRef}>
      <input type="text" name="_honey" className="cform-honey qt-honey" tabIndex={-1} autoComplete="off" aria-hidden="true" />

      <section className="ba-step">
        <p className="ba-num">01</p>
        <h2 className="cx-h2 qt-q">What are you trying to do?</h2>
        <p className="cx-fine ba-hint">Pick as many as fit.</p>
        <Pills label="What are you trying to do?" options={ASK.goals} value={goals} onChange={(v) => { touch(); setGoals(v); setMissing(""); }} many />
      </section>

      <section className="ba-step">
        <p className="ba-num">02</p>
        <h2 className="cx-h2 qt-q">Where will your content show up?</h2>
        <p className="cx-fine ba-hint">Pick as many as fit.</p>
        <Pills label="Where will your content show up?" options={ASK.where} value={where} onChange={(v) => { touch(); setWhere(v); }} many />
      </section>

      <section className="ba-step">
        <p className="ba-num">03</p>
        <h2 className="cx-h2 qt-q">Is this a one-time shoot, or do you want me back every month?</h2>
        <Pills label="How often" options={ASK.often} value={often} onChange={(v) => { touch(); setOften(v); }} />
      </section>

      <section className="ba-step">
        <p className="ba-num">04</p>
        <h2 className="cx-h2 qt-q">What&apos;s your rough budget?</h2>
        <p className="cx-fine ba-hint">It helps me build options that fit. Your quote will still show three choices.</p>
        <Pills label="Rough budget" options={ASK.budget} value={budget} onChange={(v) => { touch(); setBudget(v); }} />
      </section>

      <section className="ba-step">
        <h2 className="cx-h2 qt-q">Where should I send your quote?</h2>
        <div className="qt-grid">
          <div className="cx-field"><label className="cx-label" htmlFor="ba-first">First name *</label><input className="cx-input" id="ba-first" name="firstName" required autoComplete="given-name" /></div>
          <div className="cx-field"><label className="cx-label" htmlFor="ba-last">Last name *</label><input className="cx-input" id="ba-last" name="lastName" required autoComplete="family-name" /></div>
          <div className="cx-field"><label className="cx-label" htmlFor="ba-email">Email *</label><input className="cx-input" id="ba-email" name="email" type="email" required autoComplete="email" /></div>
          <div className="cx-field"><label className="cx-label" htmlFor="ba-phone">Phone *</label><input className="cx-input" id="ba-phone" name="phone" type="tel" required autoComplete="tel" /></div>
          <div className="cx-field"><label className="cx-label" htmlFor="ba-biz">Business name and town</label><input className="cx-input" id="ba-biz" name="business" autoComplete="organization" /></div>
          <div className="cx-field"><label className="cx-label" htmlFor="ba-when">When are you thinking?</label><input className="cx-input" id="ba-when" name="when" placeholder="Early December · before the grand opening · not sure" /></div>
          <div className="cx-field qt-wide"><label className="cx-label" htmlFor="ba-notes">Anything else I should know?</label><textarea className="cx-textarea" id="ba-notes" name="notes" rows={3} placeholder="What you sell, an event coming up, how big the event is, who should be on camera" /></div>
        </div>
        <div className="qt-reach">
          <span className="cx-label">Best way to reach you</span>
          <ReachPills />
        </div>
      </section>

      {missing && <p className="cx-error" role="alert">{missing}</p>}
      {status === "error" && <p className="cx-error" role="alert">That didn&apos;t send. Try again, or text me at 845-549-4425.</p>}
      <div className="qt-actions ba-actions">
        <button type="submit" className="cx-btn cx-btn--light cx-btn--xl cx-btn--block" disabled={status === "sending"}>{status === "sending" ? "Sending…" : "Send it"}</button>
        <p className="qt-consent">
          By sending this you&apos;re okay with Roth Media texting or emailing you about your quote. No spam, no list. <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy</a>
        </p>
      </div>
    </form>
  );
}

function ReachPills() {
  const [v, setV] = useState("Text me");
  return (
    <div className="cx-pills" role="radiogroup" aria-label="Best way to reach you">
      <input type="hidden" name="reach" value={v} />
      {["Text me", "Call me", "Email me"].map((o) => (
        <button type="button" key={o} className={`cx-pill${v === o ? " is-on" : ""}`} aria-pressed={v === o} onClick={() => setV(o)}>{o}</button>
      ))}
    </div>
  );
}
