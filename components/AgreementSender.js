"use client";

import { useState } from "react";
import CopyChip from "./CopyChip";
import { AGREEMENT_KINDS, money } from "../lib/agreements";

const STATUS = { sent: "Sent — not signed", signed: "Signed — not paid", paid: "Paid", void: "Voided" };

// Studio → Payments → Send an agreement. Pick what it is, type the amount,
// get a private link. Email / text buttons open YOUR mail or messages app
// with the words ready — nothing here messages a client for you.
export default function AgreementSender({ recent = [] }) {
  const [kind, setKind] = useState("upkeep");
  const [invoiceOnly, setInvoiceOnly] = useState(false);
  const [status, setStatus] = useState("idle");
  const [err, setErr] = useState("");
  const [made, setMade] = useState(null);
  const [rows, setRows] = useState(recent);
  const month = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });

  async function onSubmit(e) {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.currentTarget).entries());
    setStatus("going"); setErr("");
    try {
      const res = await fetch("/api/admin/agreements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...d, kind, invoiceOnly }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Couldn't make the link");
      setMade({ ...j, name: d.name, email: d.email, phone: d.phone, amount: d.amount });
      setRows([{ id: j.id, created_at: new Date().toISOString(), kind, client_name: d.name, client_email: d.email, business: d.business, amount_cents: Math.round(Number(d.amount) * 100), period: d.period, status: "sent", url: j.url }, ...rows]);
      setStatus("done");
    } catch (e2) { setStatus("error"); setErr(e2.message); }
  }

  async function voidRow(id) {
    if (!confirm("Void this link? The client won't be able to sign or pay it.")) return;
    await fetch("/api/admin/agreements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ void: true, id }) });
    setRows(rows.map((r) => (r.id === id ? { ...r, status: "void" } : r)));
  }

  const mailto = made ? `mailto:${encodeURIComponent(made.email)}?subject=${encodeURIComponent(made.copy.subject)}&body=${encodeURIComponent(made.copy.body)}` : "";
  const sms = made && made.phone ? `sms:${made.phone.replace(/[^\d+]/g, "")}?&body=${encodeURIComponent(made.copy.sms)}` : "";

  return (
    <div className="agsend">
      <form className="agsend-form" onSubmit={onSubmit}>
        <div className="agsend-kinds" role="radiogroup" aria-label="What are you sending?">
          {Object.entries(AGREEMENT_KINDS).map(([id, k]) => (
            <button key={id} type="button" className={"achip" + (kind === id ? " is-on" : "")} aria-pressed={kind === id} onClick={() => setKind(id)} title={k.short}>☐ {k.label}</button>
          ))}
        </div>
        <p className="inbox-hint">{AGREEMENT_KINDS[kind].short}</p>
        <div className="pcharge-row">
          <label className="grow"><span>Client name</span><input name="name" required placeholder="Jane Smith" autoComplete="off" /></label>
          <label className="grow"><span>Email</span><input name="email" type="email" required placeholder="jane@…" autoComplete="off" /></label>
          <label><span>Phone</span><input name="phone" type="tel" placeholder="607-…" autoComplete="off" /></label>
        </div>
        <div className="pcharge-row">
          <label className="grow"><span>Business</span><input name="business" placeholder="Jane's Flower Shoppe" /></label>
          {kind === "upkeep" && <label className="grow"><span>Website</span><input name="site" placeholder="janesflowers.com" /></label>}
        </div>
        <div className="pcharge-row">
          <label><span>Amount ($)</span><input name="amount" inputMode="decimal" required placeholder="150" /></label>
          <label><span>For (month)</span><input name="period" defaultValue={month} /></label>
          <label className="grow"><span>{kind === "invoice" ? "What it's for" : "Note on this month's work (optional)"}</span><input name="note" placeholder={kind === "invoice" ? "Landing page for the spring sale" : "Covers the new hours + the Mother's Day landing page"} /></label>
        </div>
        {kind === "upkeep" && (
          <label className="agsend-check"><input type="checkbox" checked={invoiceOnly} onChange={(e) => setInvoiceOnly(e.target.checked)} /> <span>She already signed — this is just this month&apos;s payment (skip the signature).</span></label>
        )}
        <div className="pcharge-row">
          <button type="submit" className="abtn" disabled={status === "going"}>{status === "going" ? "Making the link…" : "Make the link"}</button>
          {status === "error" && <p className="cform-error">{err}</p>}
        </div>
      </form>

      {made && (
        <div className="agsend-made">
          <p className="pcharge-ok">Link ready for {made.name} — {money(Math.round(Number(made.amount) * 100))}. Send it your way:</p>
          <div className="pcharge-row">
            <CopyChip text={made.url} label="Copy link" />
            <a className="abtn" href={mailto}>Email it</a>
            {sms ? <a className="abtn abtn-ghost" href={sms}>Text it</a> : null}
            <a className="abtn abtn-ghost" href={made.url} target="_blank" rel="noreferrer">Preview ↗</a>
          </div>
          <details className="st-more"><summary>The email, if you&apos;d rather paste it</summary><div className="st-more-body"><p><b>{made.copy.subject}</b></p><p style={{ whiteSpace: "pre-wrap" }}>{made.copy.body}</p></div></details>
        </div>
      )}

      {rows.length > 0 && (
        <div className="ltable-wrap" style={{ marginTop: "1rem" }}>
          <table className="idet-fields stable">
            <thead><tr><th>When</th><td>Who</td><td>What</td><td>Amount</td><td>Status</td><td></td></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <th scope="row">{new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</th>
                  <td>{r.client_name}{r.business ? <><br /><small>{r.business}</small></> : null}</td>
                  <td>{AGREEMENT_KINDS[r.kind]?.label || r.kind}{r.period ? <><br /><small>{r.period}</small></> : null}</td>
                  <td>{money(r.amount_cents)}</td>
                  <td>{STATUS[r.status] || r.status}</td>
                  <td>{r.status === "paid" || r.status === "void" ? null : <span className="pcharge-row" style={{ margin: 0 }}><CopyChip text={r.url} label="Copy link" /><button type="button" className="achip" onClick={() => voidRow(r.id)}>Void</button></span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
