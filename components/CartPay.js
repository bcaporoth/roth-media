"use client";

import { useState } from "react";
import { track } from "../lib/track";

// Name + email (pre-filled from the link), then straight to Stripe.
export default function CartPay({ cart, who, label }) {
  const [status, setStatus] = useState("idle");
  const [err, setErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    setStatus("going");
    track("book_now_click", { from: "cart", category: cart.category, package: cart.packageId, pay: cart.pay || "first" });
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...cart, name: data.name, email: data.email, phone: who.phone }),
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
    <form className="cart-pay" onSubmit={onSubmit}>
      <label><span>Your name</span><input name="name" required defaultValue={who.name} autoComplete="name" /></label>
      <label><span>Email for the receipt</span><input name="email" type="email" required defaultValue={who.email} autoComplete="email" /></label>
      <button type="submit" className="qprimary" disabled={status === "going"}>{status === "going" ? "Opening checkout…" : label}</button>
      {status === "error" && <p className="cform-error">{err} — text 845-549-4425 and I&apos;ll fix it.</p>}
    </form>
  );
}
