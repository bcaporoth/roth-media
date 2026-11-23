"use client";

// The business + event quote form (2026-11-15). No packages, no prices:
// the client says what they want, it lands in the Studio Inbox, and Brandon
// builds a quote with three options (Studio → Money → Quotes).

import { useEffect, useRef, useState } from "react";
import { submitLead } from "../lib/submit-lead";
import BookCall from "./BookCall";
import { WORK_TITLE, WORK_STEPS } from "../lib/call";
import { track } from "../lib/track";
import { ASK } from "../lib/quotes";
import { isReferralCode, REFERRAL_AMOUNT } from "../lib/referral-rules";
import { PLANS, planById } from "../lib/plans";

// `plan` (t1|t2|t3) comes from /quote?for=business&plan=… when they tapped a
// monthly plan on the homepage; they can still switch, or pick one project.
const ONE_OFF = "One project, not monthly";
const planLabel = (p) => `${p.name}, $${p.price} a month`;

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

export default function BusinessAsk({ plan = "" }) {
  const picked0 = planById(plan);
  const [planPick, setPlanPick] = useState(picked0 ? planLabel(picked0) : "");
  const isPlan = !!planPick && planPick !== ONE_OFF;
  const topRef = useRef(null);
  const [goals, setGoals] = useState([]);
  const [where, setWhere] = useState([]);
  const [often, setOften] = useState("");
  const [budget, setBudget] = useState("");
  const [status, setStatus] = useState("idle");
  const [missing, setMissing] = useState("");
  const [sentName, setSentName] = useState("");
  const [who, setWho] = useState({ name: "", email: "", sid: "" }); // for the call picker after the form
  useEffect(() => { if (status === "sent") topRef.current?.scrollIntoView({ block: "start" }); }, [status]);

  // Came in through a friend's link (?ref=FRIEND-NAME-1234): say so, and file
  // the code with the request so Brandon can take the $100 off the quote.
  const [friend, setFriend] = useState("");
  useEffect(() => {
    try { const c = String(new URLSearchParams(window.location.search).get("ref") || "").trim().toUpperCase(); if (isReferralCode(c)) setFriend(c); } catch {}
  }, []);
  const friendName = friend ? (() => { const s = friend.split("-")[1] || ""; return s.charAt(0) + s.slice(1).toLowerCase(); })() : "";

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
      ["monthly plan", planPick],
      ["business", business],
      ["trying to do", goals.join(", ")],
      ["where it'll show up", where.join(", ")],
      ["how often", often],
      ["budget", budget],
      ["when", String(data.when || "").trim()],
      ["anything else", String(data.notes || "").trim()],
      ["best way to reach", data.reach || ""],
      ["friend code", friend],
      ["first name", data.firstName], ["last name", data.lastName], ["email", data.email], ["phone", data.phone],
    ].filter(([, v]) => String(v || "").trim());
    try {
      const res = await submitLead({
        kind: "quote",
        category: "business",
        name,
        email: data.email,
        phone: data.phone,
        subject: `${isPlan ? `Plan request (${planPick.split(",")[0]})` : "Quote request"} — ${name}${business ? ` · ${business}` : ""}`,
        summary: `${isPlan ? `Wants ${planPick}` : "Wants a quote"} · ${goals.join(", ")}${budget ? ` · ${budget}` : ""}`,
        fields,
      });
      track("quote_sent", { category: "business" });
      setSentName(String(data.firstName || "").trim());
      setWho({ name, email: String(data.email || ""), sid: res.id, business });
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div className="qt-sent ba-sent" role="status" ref={topRef}>
        <p className="cx-kick">Request sent</p>
        <h2 className="cx-h2">Welcome{sentName ? `, ${sentName}` : ""}.</h2>
        <p className="cx-lede">I have your form and I'm looking at it now. The next step is a quick call so I can hear about {who.business || "your business"}.</p>
        <BookCall name={who.name} email={who.email} from="business-ask" sid={who.sid} dark />
        <section className="ba-work" aria-label={WORK_TITLE}>
          <h3 className="ba-work-h">{WORK_TITLE}</h3>
          <ol className="ba-work-list">{WORK_STEPS.map(([t, d]) => <li key={t}><strong>{t}</strong> {d}</li>)}</ol>
          <p className="ba-work-foot">Questions before then? Text <a href="sms:+18455494425">845-549-4425</a>.</p>
        </section>
      </div>
    );
  }

  return (
    <form className="qt-form ba-form" onSubmit={submit} onInput={touch} ref={topRef}>
      <input type="text" name="_honey" className="cform-honey qt-honey" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      {friend && (
        <div className="qt-friend" role="status">
          <strong>{friendName} sent you ${REFERRAL_AMOUNT} off.</strong>
          <span>It&apos;s already on your quote. Nothing to type.</span>
        </div>
      )}

      {picked0 && (
        <section className="ba-step">
          <p className="ba-num">Your plan</p>
          <h2 className="cx-h2 qt-q">Monthly social media management</h2>
          <p className="cx-fine ba-hint">Intro prices, 3-month minimum. Switch here if you change your mind.</p>
          <Pills label="Your plan" options={[...PLANS.map(planLabel), ONE_OFF]} value={planPick} onChange={(v) => { touch(); setPlanPick(v); }} />
        </section>
      )}

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
