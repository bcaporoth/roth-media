"use client";

import { useState } from "react";

// One partner's charge box: write it, text the notice, then charge.
export default function PartnerCharge({ id, name, phone, defaultAmount = "", defaultWhat = "" }) {
  const [amount, setAmount] = useState(defaultAmount);
  const [what, setWhat] = useState(defaultWhat);
  const [status, setStatus] = useState("idle");
  const [msg, setMsg] = useState("");
  const first = String(name || "").split(/\s+/)[0] || "there";
  const amt = Number(amount) > 0 ? `$${Number(amount).toLocaleString("en-US")}` : "$___";
  const notice = `Hey ${first}! ${what || "This month's fees"}: ${amt}. I'll put it on your card on file in 3 days. Let me know if anything looks off!`;
  const sms = phone ? `sms:${phone}?&body=${encodeURIComponent(notice)}` : "";

  async function charge() {
    if (!(Number(amount) > 0) || !what.trim()) { setStatus("error"); setMsg("Add the amount and what it's for first."); return; }
    setStatus("going");
    try {
      const res = await fetch("/api/admin/partner-charge", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, amount: Number(amount), description: what }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Charge failed");
      setStatus(json.ok ? "done" : "error");
      setMsg(json.ok ? `Charged — ${json.note}` : `Stripe says: ${json.status}. Check Stripe before trying again.`);
    } catch (e) { setStatus("error"); setMsg(e.message); }
  }

  return (
    <div className="pcharge">
      <div className="pcharge-row">
        <label><span>Amount</span><input id={`pc-amt-${id}`} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="50" /></label>
        <label className="grow"><span>What it's for</span><input id={`pc-what-${id}`} value={what} onChange={(e) => setWhat(e.target.value)} placeholder="October closing fees: 2 new members" /></label>
      </div>
      <div className="pcharge-row">
        {sms ? <a className="abtn abtn-ghost" href={sms}>1. Text her the notice</a> : <span className="itag">No phone on file</span>}
        <button type="button" className="abtn" onClick={charge} disabled={status === "going"}>{status === "going" ? "Charging…" : "2. Charge her card (3+ days later)"}</button>
      </div>
      {msg && <p className={status === "done" ? "pcharge-ok" : "cform-error"}>{msg}</p>}
    </div>
  );
}
