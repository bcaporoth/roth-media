"use client";

// /walkin: name, business, email, one button. A new email goes straight
// into the portal; an email we already know gets the usual sign-in code.

import { useState } from "react";
import SaveCardButton from "./SaveCardButton";

export default function WalkinForm({ k = "", gift = 100, giftCode = "", from = "" }) {
  const [status, setStatus] = useState("idle"); // idle | going | sent | signin | error
  const [err, setErr] = useState("");
  const [email, setEmail] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.currentTarget).entries());
    setStatus("going"); setErr(""); setEmail(String(d.email || "").trim());
    try {
      const res = await fetch("/api/walkin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...d, k, gift: giftCode }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "That didn't work. Try again.");
      if (j.go) { window.location.assign(j.go); return; }
      setStatus(j.sent ? "sent" : "signin");
    } catch (e2) { setStatus("error"); setErr(e2.message); }
  }

  if (status === "sent" || status === "signin") {
    return (
      <div className="mx-done" role="status">
        <p className="mx-done-title">{status === "sent" ? "Check your email." : "You're on the list."}</p>
        {status === "sent"
          ? <p>You already have an account with {email}, so a sign-in code is on its way there. Type the code on the sign-in page and you&apos;re in.</p>
          : <p>Sign in with {email} to see your gallery and your gift cards.</p>}
        <div className="mx-done-acts"><a className="cx-btn cx-btn--light cx-btn--lg" href={`/portal?email=${encodeURIComponent(email)}`}>Open the sign-in page</a></div>
        <SaveCardButton where="walkin" />
      </div>
    );
  }

  return (
    <form className="wk-form" onSubmit={onSubmit}>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="cform-honey" aria-hidden="true" />
      <ul className="wk-gets">
        {giftCode ? (
          <>
            <li><strong>A ${gift} gift card, from {from}.</strong> Use it on any paid shoot with Roth Media, when you choose.</li>
            <li><strong>Roth Media</strong> is Brandon Roth: video and photo for local businesses in the Twin Tiers.</li>
            <li><strong>A ${gift} gift card to pass on.</strong> You get one to give another local business too.</li>
          </>
        ) : (
          <>
            <li><strong>Your free gallery.</strong> The video Brandon shot shows up in your account.</li>
            <li><strong>A ${gift} gift card for you.</strong> Use it on any paid shoot, when you choose.</li>
            <li><strong>A ${gift} gift card for a friend.</strong> Pass it to another local business.</li>
          </>
        )}
      </ul>
      <label className="mx-field"><span className="cx-label">Your name *</span><input className="cx-input" name="name" required autoComplete="name" /></label>
      <label className="mx-field"><span className="cx-label">Your business *</span><input className="cx-input" name="business" required autoComplete="organization" /></label>
      <label className="mx-field"><span className="cx-label">Email * <small>this is how you sign in</small></span><input className="cx-input" name="email" type="email" required autoComplete="email" inputMode="email" /></label>
      <label className="mx-field"><span className="cx-label">Phone <small>optional</small></span><input className="cx-input" name="phone" type="tel" autoComplete="tel" /></label>
      {status === "error" && <p className="cx-error" role="alert">{err}</p>}
      <button type="submit" className="cx-btn cx-btn--light cx-btn--xl cx-btn--block" disabled={status === "going"}>{status === "going" ? "Opening your account…" : giftCode ? `Get my $${gift} gift card` : "Claim my free gallery"}</button>
      <p className="cx-help">Tapping the button makes your free Roth Media account. No password to pick right now. <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy</a></p>
    </form>
  );
}
