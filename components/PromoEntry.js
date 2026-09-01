"use client";

import { useEffect, useState } from "react";

// ── Free Content Day giveaway: entry form + countdown ──
import { PROMO } from "../lib/promo";

const CONTACT_EMAIL = "b.caporoth@gmail.com";
const ENDPOINT = `https://formsubmit.co/ajax/${CONTACT_EMAIL}`;

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
    const payload = Object.fromEntries(Object.entries(rows).filter(([, v]) => v !== undefined && v !== ""));
    try {
      const res = await fetch(ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(payload) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || String(json.success) !== "true") throw new Error("failed");
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  if (closed) return null;

  if (status === "sent") {
    return (
      <div className="cform-success promo-success" role="status">
        <p className="cform-success-title">You&apos;re in the pot.</p>
        <p className="cform-success-body">
          Winner drawn {PROMO.drawLabel} and announced on TikTok — I&apos;ll call or text if it&apos;s you. Want better odds for your town? Tag a business that needs this in the comments.
        </p>
      </div>
    );
  }

  return (
    <form className="quote-form qflow-form promo-form" onSubmit={handleSubmit} id="enter">
      <input type="text" name="_honey" className="cform-honey" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      <div className="qf-grid">
        <div className="qf-field wide"><label htmlFor="pe-business">Business name *</label><input id="pe-business" name="business" required autoComplete="organization" /></div>
        <div className="qf-field"><label htmlFor="pe-name">Your name *</label><input id="pe-name" name="name" required autoComplete="name" /></div>
        <div className="qf-field"><label htmlFor="pe-town">Town *</label><input id="pe-town" name="town" required placeholder="Waverly, Elmira, Sayre…" /></div>
        <div className="qf-field"><label htmlFor="pe-phone">Phone *</label><input id="pe-phone" name="phone" type="tel" required autoComplete="tel" /></div>
        <div className="qf-field"><label htmlFor="pe-email">Email *</label><input id="pe-email" name="email" type="email" required autoComplete="email" /></div>
        <div className="qf-field"><label htmlFor="pe-about">What do you do?</label><input id="pe-about" name="about" placeholder="HVAC, bakery, gym, salon…" /></div>
        <div className="qf-field"><label htmlFor="pe-handle">TikTok or Instagram handle</label><input id="pe-handle" name="handle" placeholder="@yourbusiness" /></div>
        <div className="qf-field wide"><label htmlFor="pe-why">Why should it be you? (optional)</label><textarea id="pe-why" name="why" rows={3} placeholder="Two sentences is plenty." /></div>
      </div>
      <label className="promo-check">
        <input type="checkbox" name="commented" /> I commented my business name on the TikTok too
      </label>
      {status === "error" && <p className="cform-error">That didn&apos;t send. Try again, or text 845-549-4425 with your business name.</p>}
      <div className="qnav-row">
        <span className="qhelp">One entry per business. Rules below.</span>
        <button type="submit" className="qprimary" disabled={status === "sending"}>{status === "sending" ? "Sending…" : "Put me in the pot"}</button>
      </div>
    </form>
  );
}
