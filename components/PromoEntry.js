"use client";

import { track } from "../lib/track";
import { submitLead } from "../lib/submit-lead";
import { CALENDLY } from "../lib/site";
import { useEffect, useState } from "react";

// ── Free Content Day giveaway: entry form + countdown ──
import { PROMO } from "../lib/promo";


function useCountdown(iso) {
  const [left, setLeft] = useState(null);
  useEffect(() => {
    const end = new Date(iso).getTime();
    const tick = () => setLeft(Math.max(0, end - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [iso]);
  if (left === null) return null;
  const d = Math.floor(left / 86400000);
  const h = Math.floor((left % 86400000) / 3600000);
  const m = Math.floor((left % 3600000) / 60000);
  const s = Math.floor((left % 60000) / 1000);
  return { d, h, m, s, over: left === 0 };
}

export function PromoCountdown() {
  const t = useCountdown(PROMO.closesAt);
  if (!t) return <div className="promo-count" aria-hidden="true" />;
  if (t.over) return <p className="promo-closed">Entries are closed — winner announced {PROMO.drawLabel} on TikTok.</p>;
  const cell = (n, l) => (
    <span className="promo-cell"><strong>{String(n).padStart(2, "0")}</strong><small>{l}</small></span>
  );
  return (
    <div className="promo-count" role="timer" aria-label="Time left to enter">
      {cell(t.d, "days")}{cell(t.h, "hrs")}{cell(t.m, "min")}{cell(t.s, "sec")}
    </div>
  );
}

// "Enter" button for the top of /promo — only while entries are open.
export function PromoEnterLink() {
  const t = useCountdown(PROMO.closesAt);
  if (!t || t.over) return null;
  return <a href="#enter" className="cx-btn cx-btn--light cx-btn--lg bz-promo-jump">Put me in the pot</a>;
}

export default function PromoEntry() {
  const [status, setStatus] = useState("idle");
  const t = useCountdown(PROMO.closesAt);
  const closed = t?.over;

  async function handleSubmit(e) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    if (data._honey) return;
    setStatus("sending");
    const rows = {
      _subject: `PROMO ENTRY — ${data.business} (${data.name})`,
      _template: "table",
      business: data.business,
      "what they do": data.about,
      name: data.name,
      phone: data.phone,
      email: data.email,
      "tiktok / instagram": data.handle,
      "town": data.town,
      "why them": data.why,
      "commented on tiktok": data.commented ? "yes" : "no",
    };
    const { _subject, _template, ...fieldRows } = rows;
    try {
      await submitLead({
        kind: "promo",
        name: data.name,
        email: data.email,
        phone: data.phone,
        subject: _subject,
        summary: `Promo entry · ${data.business}${data.town ? ` · ${data.town}` : ""}`,
        fields: Object.entries(fieldRows),
      });
      track("promo_entry_sent");
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  if (closed) return null;

  if (status === "sent") {
    return (
      <div className="cx-success promo-success" role="status">
        <p className="cx-h3">You&apos;re in the pot.</p>
        <p>
          Winner drawn {PROMO.drawLabel} and announced on TikTok — I&apos;ll call or text if it&apos;s you. Want better odds for your town? Tag a business that needs this in the comments.
        </p>
        <p>
          Don&apos;t want to wait on the draw? <a href={CALENDLY} target="_blank" rel="noopener noreferrer" onClick={() => track("book_call_click", { from: "promo" })}>Book a 15-minute call</a> and we&apos;ll talk about your business now.
        </p>
      </div>
    );
  }

  return (
    <form className="cx-form cx-panel promo-form" onSubmit={handleSubmit} id="enter">
      <input type="text" name="_honey" className="cform-honey" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      <p className="cx-kick">Lock it in · 30 seconds</p>
      <div className="cx-field"><label className="cx-label" htmlFor="pe-business">Business name *</label><input className="cx-input" id="pe-business" name="business" required autoComplete="organization" /></div>
      <div className="cx-form-row">
        <div className="cx-field"><label className="cx-label" htmlFor="pe-name">Your name *</label><input className="cx-input" id="pe-name" name="name" required autoComplete="name" /></div>
        <div className="cx-field"><label className="cx-label" htmlFor="pe-town">Town *</label><input className="cx-input" id="pe-town" name="town" required placeholder="Waverly, Elmira, Sayre…" /></div>
      </div>
      <div className="cx-form-row">
        <div className="cx-field"><label className="cx-label" htmlFor="pe-phone">Phone *</label><input className="cx-input" id="pe-phone" name="phone" type="tel" required autoComplete="tel" /></div>
        <div className="cx-field"><label className="cx-label" htmlFor="pe-email">Email *</label><input className="cx-input" id="pe-email" name="email" type="email" required autoComplete="email" /></div>
      </div>
      <div className="cx-form-row">
        <div className="cx-field"><label className="cx-label" htmlFor="pe-about">What do you do?</label><input className="cx-input" id="pe-about" name="about" placeholder="HVAC, bakery, gym, salon…" /></div>
        <div className="cx-field"><label className="cx-label" htmlFor="pe-handle">TikTok or Instagram handle</label><input className="cx-input" id="pe-handle" name="handle" placeholder="@yourbusiness" /></div>
      </div>
      <div className="cx-field"><label className="cx-label" htmlFor="pe-why">Why should it be you? (optional)</label><textarea className="cx-textarea" id="pe-why" name="why" rows={3} placeholder="Two sentences is plenty." /></div>
      <label className="cx-check promo-check">
        <input type="checkbox" name="commented" /> <span>I commented my business name on the TikTok too</span>
      </label>
      {status === "error" && <p className="cx-error" role="alert">That didn&apos;t send. Try again, or text 845-549-4425 with your business name.</p>}
      <button type="submit" className="cx-btn cx-btn--light cx-btn--lg cx-btn--block" disabled={status === "sending"}>{status === "sending" ? "Sending…" : "Put me in the pot"}</button>
      <p className="cx-help">One entry per business. Rules below.</p>
      <p className="cx-help bz-consent">By entering you&apos;re okay with Roth Media texting or emailing you about the giveaway and a related offer. Reply STOP any time. <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy</a></p>
    </form>
  );
}
