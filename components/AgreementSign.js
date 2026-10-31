"use client";

import { useState } from "react";
import { money } from "../lib/agreements";

// The client's side of /sign/<token>: read, type name, agree, pay.
export default function AgreementSign({ token, row, checkout, children }) {
  const [status, setStatus] = useState("idle");
  const [err, setErr] = useState("");
  const needSign = row.sign_required && row.status !== "signed";
  const amt = money(row.amount_cents);

  async function onSubmit(e) {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.currentTarget).entries());
    setStatus("going"); setErr("");
    try {
      const res = await fetch("/api/sign", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, signature: d.signature, agree: Boolean(d.agree), website: d.website }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Something went wrong");
      if (j.url) { window.location.assign(j.url); return; }
      setStatus("signed");
    } catch (e2) { setStatus("error"); setErr(e2.message); }
  }

  if (status === "signed") {
    return <div className="mx-done" role="status"><p className="mx-done-title">Signed — thank you.</p><p>Online payment isn&apos;t switched on yet, so Brandon will text you a way to pay {amt}.</p></div>;
  }

  return (
    <form className="mx-pa" onSubmit={onSubmit}>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="cform-honey" aria-hidden="true" />
      <section className="mx-pa-total" aria-live="polite">
        <div className="mx-pa-due"><span>{row.kind === "invoice" ? "Amount" : `This month${row.period ? ` · ${row.period}` : ""}`}</span><strong>{amt}</strong></div>
        {row.note ? <p className="cx-help">{row.note}</p> : null}
      </section>

      {children ? (
        <section className="mx-pa-step">
          <h2>{needSign ? "1. The agreement" : "The agreement"}</h2>
          <div className="mx-pa-agreement" tabIndex={0} role="region" aria-label="Agreement">{children}</div>
          {!needSign && row.signed_name ? <p className="cx-help">Signed by {row.signed_name} on {new Date(row.signed_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.</p> : null}
        </section>
      ) : null}

      {needSign && (
        <section className="mx-pa-step">
          <h2>2. Sign</h2>
          <div className="mx-pa-sign">
            <label className="mx-field"><span className="cx-label">Type your full name to sign *</span><input id="ag-signature" name="signature" required className="cx-input mx-pa-sigline" autoComplete="name" /></label>
            <label className="cx-check"><input type="checkbox" name="agree" required /> <span>I&apos;ve read this agreement and agree to it{row.business ? ` for ${row.business}` : ""}.</span></label>
          </div>
        </section>
      )}

      <div className="mx-pa-pay">
        {status === "error" && <p className="cx-error" role="alert">{err}</p>}
        {checkout ? (
          <button type="submit" className="cx-btn cx-btn--light cx-btn--xl cx-btn--block" disabled={status === "going"}>{status === "going" ? "Opening secure checkout…" : needSign ? `Sign and pay ${amt}` : `Pay ${amt}`}</button>
        ) : needSign ? (
          <button type="submit" className="cx-btn cx-btn--light cx-btn--xl cx-btn--block" disabled={status === "going"}>Sign</button>
        ) : (
          <p className="cx-error">Online payment isn&apos;t switched on yet. Text Brandon at 845-549-4425.</p>
        )}
        <p className="cx-help">Secure checkout by Stripe — card, Apple Pay or Google Pay. Receipt by email.</p>
      </div>
    </form>
  );
}
