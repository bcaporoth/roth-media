"use client";

import { useState } from "react";

export default function PartnerLeadForm({ slug, brand, utm, cta = "Send", bookingUrl = "" }) {
  const [status, setStatus] = useState("idle");
  const [err, setErr] = useState("");
  async function onSubmit(e) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget).entries());
    if (f.website) return;
    setStatus("going");
    try {
      const res = await fetch("/api/partner/lead", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug, ...f, utm }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "That didn't send");
      setStatus("sent");
    } catch (e2) { setErr(e2.message); setStatus("error"); }
  }
  if (status === "sent") {
    return (
      <div className="golead-done" role="status">
        <p>You’re on the list! {brand}’s team will reach out to set up your orientation.</p>
        {bookingUrl && <a className="qprimary golead-book" href={bookingUrl} target="_blank" rel="noopener noreferrer">Book your orientation now</a>}
      </div>
    );
  }
  return (
    <form className="golead-form" onSubmit={onSubmit}>
      <input type="text" name="website" className="cform-honey" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      <label><span>First name</span><input id="gl-name" name="name" required autoComplete="given-name" /></label>
      <label><span>Mobile number</span><input id="gl-phone" name="phone" type="tel" required autoComplete="tel" /></label>
      <label><span>Email (optional)</span><input id="gl-email" name="email" type="email" autoComplete="email" /></label>
      <button type="submit" className="qprimary" disabled={status === "going"}>{status === "going" ? "Sending…" : cta}</button>
      {status === "error" && <p className="cform-error">{err}</p>}
      <p className="golead-consent">By sending this, you agree {brand} and the people helping run it may call, text, or email you about your orientation. Msg &amp; data rates may apply. Reply STOP anytime.</p>
    </form>
  );
}
