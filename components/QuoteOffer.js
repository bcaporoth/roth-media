"use client";

// The client's side of /q/<token>: pick an option, read the agreement for
// that option, type a name, pay in full. Prices come from the server.

import { useState } from "react";
import AgreementText from "./AgreementText";
import { agreementText } from "../lib/agreements";

const money = (n) => `$${Math.round(Number(n) || 0).toLocaleString("en-US")}`;

export default function QuoteOffer({ token, options, recommended = 0, picked = null, note = "", when = "", business = "", name = "", checkout = true }) {
  const [sel, setSel] = useState(picked ?? (options[recommended] ? recommended : 0));
  const [status, setStatus] = useState("idle");
  const [err, setErr] = useState("");
  const o = options.find((x) => x.i === sel) || options[0];
  const many = options.length > 1;
  const text = agreementText("shoot", { client_name: name, business, period: when, amount_cents: o.total * 100, lines: o.lines });

  async function onSubmit(e) {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.currentTarget).entries());
    setStatus("going"); setErr("");
    try {
      const res = await fetch("/api/q", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, option: o.i, signature: d.signature, agree: Boolean(d.agree), website: d.website }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Something went wrong");
      if (j.url) { window.location.assign(j.url); return; }
      setStatus("signed");
    } catch (e2) { setStatus("error"); setErr(e2.message); }
  }

  if (status === "signed") {
    return <div className="mx-done" role="status"><p className="mx-done-title">Signed, thank you.</p><p>Online payment isn&apos;t switched on yet, so Brandon will text you a way to pay {money(o.total)}.</p></div>;
  }

  return (
    <form className="mx-pa qo" onSubmit={onSubmit}>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="cform-honey" aria-hidden="true" />
      {note && <p className="qo-note">{note}</p>}
      {when && <p className="cx-help qo-when">Shoot: {when}</p>}

      <section className="mx-pa-step">
        {many && <h2>1. Pick one</h2>}
        <div className={`qo-opts${many ? "" : " is-one"}`} role={many ? "radiogroup" : undefined} aria-label={many ? "Your options" : undefined}>
          {options.map((x) => {
            const on = x.i === o.i;
            return (
              <button type="button" key={x.i} className={`qo-opt${on ? " is-on" : ""}${x.i === recommended && many ? " is-rec" : ""}`} role={many ? "radio" : undefined} aria-checked={many ? on : undefined} onClick={() => setSel(x.i)} disabled={!many}>
                {x.i === recommended && many && <span className="qo-flag">Recommended</span>}
                <span className="qo-name">{x.label}</span>
                <span className="qo-price">{money(x.total)}</span>
                {x.onSite && <span className="qo-time">{x.onSite} on site</span>}
                <ul className="qo-lines">{x.lines.map((l, k) => <li key={k}>{l}</li>)}</ul>
                {many && <span className="qo-pick">{on ? "✓ Picked" : "Pick this one"}</span>}
              </button>
            );
          })}
        </div>
      </section>

      <section className="mx-pa-step">
        <h2>{many ? "2. The agreement" : "1. The agreement"}</h2>
        <div className="mx-pa-agreement" tabIndex={0} role="region" aria-label="Agreement"><AgreementText text={text} /></div>
      </section>

      <section className="mx-pa-step">
        <h2>{many ? "3. Sign" : "2. Sign"}</h2>
        <div className="mx-pa-sign">
          <label className="mx-field"><span className="cx-label">Type your full name to sign *</span><input name="signature" required className="cx-input mx-pa-sigline" autoComplete="name" /></label>
          <label className="cx-check"><input type="checkbox" name="agree" required /> <span>I&apos;ve read this agreement and agree to it{business ? ` for ${business}` : ""}.</span></label>
        </div>
      </section>

      <div className="mx-pa-pay">
        {status === "error" && <p className="cx-error" role="alert">{err}</p>}
        <button type="submit" className="cx-btn cx-btn--light cx-btn--xl cx-btn--block" disabled={status === "going"}>
          {status === "going" ? "Opening secure checkout…" : checkout ? `Sign and pay ${money(o.total)}` : "Sign"}
        </button>
        <p className="cx-help">{many ? `${o.label}, paid in full. ` : "Paid in full. "}Secure checkout by Stripe: card, Apple Pay or Google Pay. Receipt by email.</p>
      </div>
    </form>
  );
}
