"use client";

import { useEffect, useState } from "react";
import { money } from "../lib/packages";
import { submitLead } from "../lib/submit-lead";
import { track } from "../lib/track";
import BookCall from "./BookCall";

// The short form on an ad landing page (/go/weddings, /go/business). Lands
// in the Studio inbox as a quote lead, tagged with the ad (utm) it came from.
// plans: [{ id, name, price, scope }] — one-tap package chips. With a plan
// picked, the lead carries a cart, so /api/forms emails them their quote,
// pay link and the call link the second they hit send. ?pkg=<id> on the
// URL pre-selects a chip, so each ad can point at its own tier.
export default function AdLeadForm({ category, label, cta, extra, plans = [], emailRequired = false }) {
  const [status, setStatus] = useState("idle");
  const [who, setWho] = useState({ name: "", email: "" });
  const [plan, setPlan] = useState(plans.find((p) => p.popular)?.id || plans[0]?.id || "");
  useEffect(() => {
    if (!plans.length) return;
    const want = new URLSearchParams(window.location.search).get("pkg");
    if (want && plans.some((p) => p.id === want)) setPlan(want);
  }, [plans]);
  const picked = plans.find((p) => p.id === plan);
  async function onSubmit(e) {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.currentTarget).entries());
    if (d.website) return;
    setStatus("sending");
    try {
      const tag = picked ? ` · ${picked.name}` : plans.length ? " · help me pick" : "";
      await submitLead({
        kind: "quote", category,
        name: d.name, email: d.email || "", phone: d.phone,
        subject: `Ad lead — ${d.name} · ${label}${tag}${d.extra ? ` · ${d.extra}` : ""}`,
        summary: `From an ad · ${label}${tag}${d.extra ? ` · ${d.extra}` : ""}`,
        fields: [["name", d.name], ["phone", d.phone], ["email", d.email], [extra.label.toLowerCase(), d.extra], ["plan", picked ? `${picked.name} — ${money(picked.price)}` : plans.length ? "not sure — help me pick" : ""], ["came in through", `ad page (${label})`]],
        ...(picked ? { cart: { category, packageId: picked.id, addons: [], code: "" } } : {}),
      });
      track("ad_lead_sent", { category });
      setWho({ name: d.name, email: d.email || "" });
      setStatus("sent");
    } catch { setStatus("error"); }
  }
  if (status === "sent") {
    return (
      <div className="golead-done" role="status">
        <p>{who.email ? "Done — your quote, what you get, and your pay link are in your inbox. I’ll text you today." : "Got it! I’ll text you today."} Want to skip the back-and-forth? Grab a 15-minute call:</p>
        <BookCall name={who.name} email={who.email} from={`go-${category}`} />
      </div>
    );
  }
  return (
    <form className="golead-form" onSubmit={onSubmit}>
      <input type="text" name="website" className="cform-honey" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      {plans.length > 0 && (
        <fieldset className="golead-plans">
          <legend>Pick a plan</legend>
          {plans.map((p) => (
            <label key={p.id} className={"golead-plan" + (plan === p.id ? " is-on" : "")}>
              <input type="radio" name="plan" value={p.id} checked={plan === p.id} onChange={() => setPlan(p.id)} />
              <span className="golead-plan-name">{p.name}{p.popular && <em>Most booked</em>}</span>
              <span className="golead-plan-scope">{p.scope}</span>
              <strong className="golead-plan-price">{money(p.price)}{p.per || ""}</strong>
            </label>
          ))}
          <label className={"golead-plan golead-plan--any" + (plan === "" ? " is-on" : "")}>
            <input type="radio" name="plan" value="" checked={plan === ""} onChange={() => setPlan("")} />
            <span className="golead-plan-name">Not sure — help me pick</span>
          </label>
        </fieldset>
      )}
      <label><span>Your name</span><input id="al-name" name="name" required autoComplete="name" /></label>
      <label><span>Mobile number</span><input id="al-phone" name="phone" type="tel" required autoComplete="tel" /></label>
      <label><span>{extra.label}</span><input id="al-extra" name="extra" placeholder={extra.placeholder} /></label>
      <label><span>{emailRequired ? "Email" : "Email (optional)"}</span><input id="al-email" name="email" type="email" required={emailRequired} autoComplete="email" /></label>
      <button type="submit" className="qprimary" disabled={status === "sending"}>{status === "sending" ? "Sending…" : cta}</button>
      {status === "error" && <p className="cform-error">That didn’t send. Text 845-549-4425 instead.</p>}
      {picked && <p className="golead-instant">Your price, what you get, and a link to book your call land in your inbox the second you hit send.</p>}
      <p className="golead-consent">Brandon from Roth Media will text or call you about your request. No spam, no list. Reply STOP anytime.</p>
    </form>
  );
}
