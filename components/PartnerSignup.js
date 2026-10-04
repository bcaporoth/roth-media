"use client";

import { useState } from "react";
import { CONTENT_PLANS, PARTNER_ADDONS, partnerQuote, partnerPrice } from "../lib/partners";
import { money } from "../lib/packages";

// Pick → read → sign → pay, on one page. The server re-prices everything.
export default function PartnerSignup({ slug, pct: partnerPct, months = 3, checkout, initialCode = "", children }) {
  const [content, setContent] = useState("full");
  const [addons, setAddons] = useState(["ads"]);
  const [status, setStatus] = useState("idle");
  const [err, setErr] = useState("");
  const [code, setCode] = useState(initialCode);
  const q = partnerQuote(slug, { content, addons, code });
  const pct = q?.pct || 0;
  const toggle = (id) => setAddons((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));
  const price = (i) => [
    i.monthly ? `${money(partnerPrice(i.monthly, pct))}/mo` : "",
    i.once ? `${money(partnerPrice(i.once, pct))} once` : "",
  ].filter(Boolean).join(" + ");
  const list = (i) => [i.monthly ? `${money(i.monthly)}/mo` : "", i.once ? money(i.once) : ""].filter(Boolean).join(" + ");

  async function onSubmit(e) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget).entries());
    if (f.signature.trim().toLowerCase() !== f.signer.trim().toLowerCase()) {
      setErr("Type your name exactly as you wrote it above to sign.");
      setStatus("error");
      return;
    }
    setStatus("going");
    try {
      const res = await fetch("/api/partner/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, content, addons, code, ...f, agree: f.agree === "on" }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.url) throw new Error(json.error || "Checkout didn't open");
      window.location.href = json.url;
    } catch (e2) {
      setErr(e2.message);
      setStatus("error");
    }
  }

  return (
    <form className="mx-pa" onSubmit={onSubmit}>
      <section className="mx-pa-step mx-pa-code">
        <label className="cx-label" htmlFor="pa-code"><span>Partner code</span></label>
        <input className="cx-input" id="pa-code" value={code} onChange={(e) => setCode(e.target.value)} autoCapitalize="characters" placeholder="Enter your code" />
        <small className={q?.codeOk ? "is-ok" : code.trim() ? "is-bad" : ""} aria-live="polite">{q?.codeOk ? `Code applied: ${partnerPct}% off your first ${months} months.` : code.trim() ? "That code isn’t right. Prices below are list prices." : `Enter your partner code to see your ${partnerPct}% rate.`}</small>
      </section>
      <section className="mx-pa-step">
        <h2>1. Your content</h2>
        <div className="mx-pa-opts" role="radiogroup" aria-label="Content plan">
          {CONTENT_PLANS.map((p) => (
            <label key={p.id} className={`mx-pa-opt ${content === p.id ? "on" : ""}`}>
              <input type="radio" name="content-plan" checked={content === p.id} onChange={() => setContent(p.id)} />
              <span className="mx-pa-name">{p.name}<small>{p.get}</small></span>
              <span className="mx-pa-price">{price(p)}{pct ? <s>{list(p)}</s> : null}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="mx-pa-step">
        <h2>2. Add-ons <small>(optional)</small></h2>
        <div className="mx-pa-opts">
          {PARTNER_ADDONS.map((a) => (
            <label key={a.id} className={`mx-pa-opt ${addons.includes(a.id) ? "on" : ""}`}>
              <input type="checkbox" checked={addons.includes(a.id)} onChange={() => toggle(a.id)} />
              <span className="mx-pa-name">{a.name}<small>{a.get}</small></span>
              <span className="mx-pa-price">{price(a)}{pct ? <s>{list(a)}</s> : null}</span>
            </label>
          ))}
        </div>
      </section>


      {q && (
        <section className="mx-pa-total" aria-live="polite">
          <div><span>Each month</span><strong>{money(q.monthly)}</strong></div>
          {q.once > 0 && <div><span>Once, today</span><strong>{money(q.once)}</strong></div>}
          <div className="mx-pa-due"><span>Due today</span><strong>{money(q.today)}</strong></div>
          <p>{pct ? `Partner prices are locked for your first ${months} months; then we review the results together. ` : ""} Your ad budget (if you picked ads) is paid to Meta directly. Events are charged only when you book one, after Brandon sends you the amount.</p>
        </section>
      )}

      <section className="mx-pa-step">
        <h2>3. Your details</h2>
        <div className="mx-pa-fields">
          <label className="mx-field wide"><span className="cx-label">Business legal name *</span><input className="cx-input" id="pa-business" name="business" required autoComplete="organization" /></label>
          <label className="mx-field wide"><span className="cx-label">Business address *</span><input className="cx-input" id="pa-address" name="address" required autoComplete="street-address" /></label>
          <label className="mx-field"><span className="cx-label">Your full name *</span><input className="cx-input" id="pa-signer" name="signer" required autoComplete="name" /></label>
          <label className="mx-field"><span className="cx-label">Email *</span><input className="cx-input" id="pa-email" name="email" type="email" required autoComplete="email" /></label>
          <label className="mx-field"><span className="cx-label">Phone</span><input className="cx-input" id="pa-phone" name="phone" type="tel" autoComplete="tel" /></label>
          <label className="mx-field wide"><span className="cx-label">Where should new leads go? (management email; add more with commas) *</span><input className="cx-input" id="pa-leads-to" name="leadsTo" required placeholder="frontdesk@yourgym.com" /></label>
          <label className="mx-field wide"><span className="cx-label">Orientation booking link (optional)</span><input className="cx-input" id="pa-booking" name="bookingUrl" type="url" placeholder="https://…" /></label>
        </div>
      </section>

      <section className="mx-pa-step">
        <h2>4. The agreement</h2>
        <div className="mx-pa-agreement" tabIndex={0} role="region" aria-label="Partner agreement">{children}</div>
        <div className="mx-pa-sign">
          <label className="mx-field"><span className="cx-label">Type your full name to sign *</span><input id="pa-signature" name="signature" required className="cx-input mx-pa-sigline" /></label>
          <label className="cx-check"><input type="checkbox" name="agree" required /> <span>I’ve read this agreement and agree to it for the business above, including the event charges in §3.</span></label>
        </div>
      </section>

      <div className="mx-pa-pay">
        {status === "error" && <p className="cx-error" role="alert">{err}</p>}
        {checkout ? (
          <button type="submit" className="cx-btn cx-btn--light cx-btn--xl cx-btn--block" disabled={status === "going" || !q?.codeOk}>{!q?.codeOk ? "Enter your partner code above" : status === "going" ? "Opening secure checkout…" : `Sign and pay ${q ? money(q.today) : ""}`}</button>
        ) : (
          <p className="cx-error">Online payment isn’t switched on yet. Text Brandon at 845-549-4425.</p>
        )}
        <p className="cx-help">Secure checkout by Stripe. Your card is saved for the monthly plan. Cancel or update it anytime at rothmediaco.com/billing.</p>
      </div>
    </form>
  );
}
