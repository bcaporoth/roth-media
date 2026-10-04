"use client";

import { useState } from "react";
import { submitLead } from "../lib/submit-lead";
import { track } from "../lib/track";
import BookCall from "./BookCall";

const FOR = ["A wedding", "My business", "Family photos", "Something else"];

// Three fields and done — for someone standing in front of you with a
// phone. Lands in the Studio inbox as a "Business card" lead.
export default function CardLeadForm() {
  const [status, setStatus] = useState("idle");
  const [what, setWhat] = useState("");
  const [who, setWho] = useState({ name: "", email: "" });

  async function onSubmit(e) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    if (data.website) return;
    const contact = String(data.contact || "").trim();
    const isEmail = contact.includes("@");
    setStatus("sending");
    try {
      await submitLead({
        kind: "card",
        category: what === "A wedding" ? "wedding" : what === "My business" ? "business" : what === "Family photos" ? "family" : "",
        name: data.name,
        email: isEmail ? contact : "",
        phone: isEmail ? "" : contact,
        subject: `Business card — ${data.name}${what ? ` · ${what}` : ""}`,
        summary: `From your business card${what ? ` · ${what}` : ""}`,
        fields: [
          ["name", data.name],
          [isEmail ? "email" : "phone", contact],
          ["looking for", what],
          ["note", data.note],
        ],
      });
      track("card_lead_sent", { what });
      setWho({ name: data.name, email: isEmail ? contact : "" });
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div role="status">
        <div className="mx-done"><p className="mx-done-title">Got it — I usually reply the same day. Want to skip the wait?</p></div>
        <BookCall name={who.name} email={who.email} from="card" dark />
      </div>
    );
  }

  return (
    <form className="mx-form" onSubmit={onSubmit}>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="cform-honey" aria-hidden="true" />
      <label className="mx-field">
        <span className="cx-label">Your name</span>
        <input className="cx-input" name="name" required autoComplete="name" />
      </label>
      <label className="mx-field">
        <span className="cx-label">Phone or email</span>
        <input className="cx-input" name="contact" required autoComplete="tel" />
      </label>
      <fieldset>
        <legend className="cx-label">What&apos;s it for?</legend>
        <div className="cx-pills">
          {FOR.map((f) => (
            <button
              key={f}
              type="button"
              className={"cx-pill" + (what === f ? " is-on" : "")}
              aria-pressed={what === f}
              onClick={() => setWhat(what === f ? "" : f)}
            >
              {f}
            </button>
          ))}
        </div>
      </fieldset>
      <label className="mx-field">
        <span className="cx-label">Anything else? <small>optional</small></span>
        <input className="cx-input" name="note" />
      </label>
      <button type="submit" className="cx-btn cx-btn--light cx-btn--lg cx-btn--block" disabled={status === "sending"}>
        {status === "sending" ? "Sending…" : "Have Brandon reach out"}
      </button>
      {status === "error" && (
        <p className="cx-error" role="alert">
          That didn&apos;t send — tap Call or Text above instead.
        </p>
      )}
    </form>
  );
}
