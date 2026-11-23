"use client";

import { useState } from "react";
import CopyChip from "./CopyChip";
import { AGREEMENT_KINDS, OFFER_DAYS, agreementText, money, offerDate, offerDaysLeft, offerExpired, offerExpiry } from "../lib/agreements";
import { confirmTap } from "../lib/confirm-tap";
import { PLANS, planById } from "../lib/plans";

const STATUS = { sent: "Sent — not signed", signed: "Signed — not paid", paid: "Paid", void: "Voided" };
function statusText(r) {
  // A monthly plan that started: its live Stripe state (pay page fills `live`).
  if (r.kind === "plan" && r.status === "paid") return r.live || "Active — charged monthly";
  if (r.status !== "sent" || r.kind === "invoice") return STATUS[r.status] || r.status;
  if (offerExpired(r)) return "Expired — off the table";
  const n = offerDaysLeft(r);
  return `Sent — ${n} day${n === 1 ? "" : "s"} left`;
}

// Studio → Payments → Send an agreement. Pick what it is, type the amount,
// get a private link. Email / text buttons open YOUR mail or messages app
// with the words ready — nothing here messages a client for you.
// `prefill` (pay page, ?plan_from=<inbox row>): a plan request's name,
// email, phone, business, tier and ads answer, so the plan link is one tap.
export default function AgreementSender({ recent = [], prefill = null }) {
  const [kind, setKind] = useState("plan");
  const [tier, setTier] = useState(planById(prefill?.plan)?.id || "t1");
  const [adsOn, setAdsOn] = useState(!!prefill?.adsOn);
  const [invoiceOnly, setInvoiceOnly] = useState(false);
  const [status, setStatus] = useState("idle");
  const [err, setErr] = useState("");
  const [made, setMade] = useState(null);
  const [rows, setRows] = useState(recent);
  const month = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });
  // The agreement text: built live from the form, or whatever Brandon edited.
  const [vars, setVars] = useState({ period: "", name: prefill?.name || "", business: prefill?.business || "", amount: String(planById(tier).price) });
  const [custom, setCustom] = useState(null);
  const plan = kind === "plan";
  const adsFee = plan && adsOn ? Math.round(Number(vars.ads) || 0) : 0;
  const template = agreementText(kind, { client_name: vars.name, business: vars.business, site_url: vars.site, amount_cents: Math.round(Number(vars.amount || 0) * 100), period: vars.period, note: vars.note, plan: tier, price: vars.amount, ads: adsFee });
  // Switching kind or tier resets the fields that depend on it (keyed inputs below).
  function pickKind(id) { setKind(id); setVars((v) => ({ ...v, period: id === "shoot" || id === "plan" ? "" : month, amount: id === "plan" ? String(planById(tier).price) : "" })); }
  function pickTier(id) { setTier(id); setVars((v) => ({ ...v, amount: String(planById(id).price) })); }
  const text = custom ?? template;
  const showText = kind !== "invoice" && !invoiceOnly;
  function onChange(e) { const d = Object.fromEntries(new FormData(e.currentTarget).entries()); setVars(d); }

  async function onSubmit(e) {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.currentTarget).entries());
    setStatus("going"); setErr("");
    try {
      const res = await fetch("/api/admin/agreements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...d, kind, invoiceOnly, plan: tier, adsOn, text: showText && custom !== null ? custom : "" }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Couldn't make the link");
      const total = plan ? Number(d.amount || 0) + (adsOn ? Number(d.ads || 0) : 0) : Number(d.amount);
      setMade({ ...j, name: d.name, email: d.email, phone: d.phone, amount: total, plan });
      setRows([{ id: j.id, created_at: new Date().toISOString(), kind, client_name: d.name, client_email: d.email, business: d.business, amount_cents: Math.round(total * 100), period: d.period, status: "sent", url: j.url }, ...rows]);
      setStatus("done");
    } catch (e2) { setStatus("error"); setErr(e2.message); }
  }

  async function voidRow(id) {
    if (!confirmTap("Void this link? The client won't be able to sign or pay it.")) return;
    await fetch("/api/admin/agreements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ void: true, id }) });
    setRows(rows.map((r) => (r.id === id ? { ...r, status: "void" } : r)));
  }

  const mailto = made ? `mailto:${encodeURIComponent(made.email)}?subject=${encodeURIComponent(made.copy.subject)}&body=${encodeURIComponent(made.copy.body)}` : "";
  const sms = made && made.phone ? `sms:${made.phone.replace(/[^\d+]/g, "")}?&body=${encodeURIComponent(made.copy.sms)}` : "";

  return (
    <div className="agsend">
      <form className="agsend-form" onSubmit={onSubmit} onChange={onChange}>
        <div className="agsend-kinds" role="radiogroup" aria-label="What are you sending?">
          {Object.entries(AGREEMENT_KINDS).map(([id, k]) => (
            <button key={id} type="button" className={"achip" + (kind === id ? " is-on" : "")} aria-pressed={kind === id} onClick={() => pickKind(id)} title={k.short}>☐ {k.label}</button>
          ))}
        </div>
        <p className="inbox-hint">{AGREEMENT_KINDS[kind].short}</p>
        {plan && (
          <>
            <div className="agsend-kinds" role="radiogroup" aria-label="Which tier?">
              {PLANS.map((p) => (
                <button key={p.id} type="button" className={"achip" + (tier === p.id ? " is-on" : "")} aria-pressed={tier === p.id} onClick={() => pickTier(p.id)}>{p.name} · ${p.price}</button>
              ))}
            </div>
            <p className="inbox-hint">{planById(tier).short}. Intro price ${planById(tier).price} a month; after the first 5 businesses it&apos;s ${planById(tier).later.toLocaleString("en-US")}.</p>
          </>
        )}
        <div className="pcharge-row">
          <label className="grow"><span>Client name</span><input name="name" required placeholder="Jane Smith" autoComplete="off" defaultValue={prefill?.name || ""} /></label>
          <label className="grow"><span>Email</span><input name="email" type="email" required placeholder="jane@…" autoComplete="off" defaultValue={prefill?.email || ""} /></label>
          <label><span>Phone</span><input name="phone" type="tel" placeholder="607-…" autoComplete="off" defaultValue={prefill?.phone || ""} /></label>
        </div>
        <div className="pcharge-row">
          <label className="grow"><span>Business</span><input name="business" placeholder="Jane's Flower Shoppe" defaultValue={prefill?.business || ""} /></label>
          {kind === "upkeep" && <label className="grow"><span>Website</span><input name="site" placeholder="janesflowers.com" /></label>}
        </div>
        {plan ? (
          <>
            <label className="agsend-check"><input type="checkbox" checked={adsOn} onChange={(e) => setAdsOn(e.target.checked)} /> <span>Add ads (they asked for ads, or you agreed on the call)</span></label>
            <div className="pcharge-row">
              <label><span>Plan price a month ($)</span><input key={"amt" + tier} name="amount" inputMode="decimal" required defaultValue={planById(tier).price} /></label>
              {adsOn && <label><span>Ads fee a month ($)</span><input name="ads" inputMode="decimal" required placeholder="Your price" defaultValue={prefill?.ads || ""} /></label>}
              <label className="grow"><span>First shoot (optional)</span><input key="plan-period" name="period" placeholder="Early December" /></label>
            </div>
            <p className="inbox-hint"><b>{money(Math.round((Number(vars.amount) || 0) + adsFee) * 100)} a month</b>, charged to their card automatically. They pay the first month when they sign. The ad budget itself they pay to Facebook.</p>
          </>
        ) : (
        <div className="pcharge-row">
          <label><span>Amount ($)</span><input key={"amt-" + kind} name="amount" inputMode="decimal" required placeholder="150" /></label>
          <label><span>{kind === "shoot" ? "Shoot date" : "For (month)"}</span><input key={"period-" + kind} name="period" defaultValue={kind === "shoot" ? "" : month} placeholder={kind === "shoot" ? "Sat Nov 15, 10am" : ""} /></label>
          <label className="grow"><span>{kind === "shoot" ? "Package + what they get" : kind === "invoice" ? "What it's for" : "Note on this month's work (optional)"}</span><input name="note" placeholder={kind === "shoot" ? "Half Day — 5 vertical reels, 10–20 edited photos; pushing the holiday menu + hiring" : kind === "invoice" ? "Landing page for the spring sale" : "Covers the new hours + the Mother's Day landing page"} /></label>
        </div>
        )}
        {kind === "upkeep" && (
          <label className="agsend-check"><input type="checkbox" checked={invoiceOnly} onChange={(e) => setInvoiceOnly(e.target.checked)} /> <span>She already signed — this is just this month&apos;s payment (skip the signature).</span></label>
        )}
        {showText && (
          <div className="agsend-text">
            <div className="pcharge-row" style={{ justifyContent: "space-between" }}>
              <span><b>The agreement she&apos;ll sign</b> — edit anything right here. Lines starting with <code>## </code> are headings, <code>- </code> are bullets.{custom !== null ? " Edited — your name, amount and month are frozen in the text now; Reset to pull in field changes." : " Fills in from the fields above as you type."}</span>
              {custom !== null && <button type="button" className="achip" onClick={() => setCustom(null)}>Reset to template</button>}
            </div>
            <textarea value={text} onChange={(e) => setCustom(e.target.value)} rows={22} spellCheck={false} />
          </div>
        )}
        <div className="pcharge-row">
          <button type="submit" className="abtn" disabled={status === "going"}>{status === "going" ? "Making the link…" : "Make the link"}</button>
          {status === "error" && <p className="cform-error">{err}</p>}
        </div>
      </form>

      {made && (
        <div className="agsend-made">
          <p className="pcharge-ok">Link ready for {made.name} — {money(Math.round(Number(made.amount) * 100))}{made.plan ? " a month" : ""}.{rows[0] && offerExpiry(rows[0]) ? ` Good for ${OFFER_DAYS} days — through ${offerDate(offerExpiry(rows[0]))}.` : ""} Send it your way:</p>
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
                  <td>{statusText(r)}</td>
                  <td>{r.kind === "plan" && r.sub ? <a className="achip" href={`https://dashboard.stripe.com/subscriptions/${r.sub}`} target="_blank" rel="noreferrer">Stripe ↗</a> : r.status === "paid" || r.status === "void" || offerExpired(r) ? null : <span className="pcharge-row" style={{ margin: 0 }}><CopyChip text={r.url} label="Copy link" /><button type="button" className="achip" onClick={() => voidRow(r.id)}>Void</button></span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
