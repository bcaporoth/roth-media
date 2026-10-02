"use client";

import { useState } from "react";
import { submitLead } from "../lib/submit-lead";
import { track } from "../lib/track";
import BookCall from "./BookCall";

// The short form on an ad landing page (/go/weddings, /go/business). Lands
// in the Studio inbox as a quote lead, tagged with the ad (utm) it came from.
export default function AdLeadForm({ category, label, cta, extra }) {
  const [status, setStatus] = useState("idle");
  const [who, setWho] = useState({ name: "", email: "" });
  async function onSubmit(e) {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.currentTarget).entries());
    if (d.website) return;
    setStatus("sending");
    try {
      await submitLead({
        kind: "quote", category,
        name: d.name, email: d.email || "", phone: d.phone,
        subject: `Ad lead — ${d.name} · ${label}${d.extra ? ` · ${d.extra}` : ""}`,
        summary: `From an ad · ${label}${d.extra ? ` · ${d.extra}` : ""}`,
        fields: [["name", d.name], ["phone", d.phone], ["email", d.email], [extra.label.toLowerCase(), d.extra], ["came in through", `ad page (${label})`]],
      });
      track("ad_lead_sent", { category });
      setWho({ name: d.name, email: d.email || "" });
      setStatus("sent");
    } catch { setStatus("error"); }
  }
  if (status === "sent") {
    return (
      <div className="golead-done" role="status">
        <p>Got it! I’ll text you today. Want to skip the back-and-forth? Grab a 15-minute call:</p>
        <BookCall name={who.name} email={who.email} from={`go-${category}`} />
      </div>
    );
  }
  return (
    <form className="golead-form" onSubmit={onSubmit}>
      <input type="text" name="website" className="cform-honey" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      <label><span>Your name</span><input id="al-name" name="name" required autoComplete="name" /></label>
      <label><span>Mobile number</span><input id="al-phone" name="phone" type="tel" required autoComplete="tel" /></label>
      <label><span>{extra.label}</span><input id="al-extra" name="extra" placeholder={extra.placeholder} /></label>
      <label><span>Email (optional)</span><input id="al-email" name="email" type="email" autoComplete="email" /></label>
      <button type="submit" className="qprimary" disabled={status === "sending"}>{status === "sending" ? "Sending…" : cta}</button>
      {status === "error" && <p className="cform-error">That didn’t send. Text 845-549-4425 instead.</p>}
      <p className="golead-consent">Brandon from Roth Media will text or call you about your request. No spam, no list. Reply STOP anytime.</p>
    </form>
  );
}
