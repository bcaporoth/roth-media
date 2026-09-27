"use client";

import { useState } from "react";
import { submitLead } from "../lib/submit-lead";
import { track } from "../lib/track";

const FOR = ["A wedding", "My business", "Family photos", "Something else"];

// Three fields and done — for someone standing in front of you with a
// phone. Lands in the Studio inbox as a "Business card" lead.
export default function CardLeadForm() {
  const [status, setStatus] = useState("idle");
  const [what, setWhat] = useState("");

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
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <p className="bcard-done" role="status">
        Got it — talk soon. I usually reply the same day.
      </p>
    );
  }

  return (
    <form className="bcard-fields" onSubmit={onSubmit}>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="cform-honey" aria-hidden="true" />
      <label>
        <span>Your name</span>
        <input name="name" required autoComplete="name" />
      </label>
      <label>
        <span>Phone or email</span>
        <input name="contact" required autoComplete="tel" />
      </label>
      <fieldset>
        <legend>What&apos;s it for?</legend>
        <div className="bcard-chips">
          {FOR.map((f) => (
            <button
              key={f}
              type="button"
              className={"bcard-chip" + (what === f ? " is-on" : "")}
              aria-pressed={what === f}
              onClick={() => setWhat(what === f ? "" : f)}
            >
              {f}
            </button>
          ))}
        </div>
      </fieldset>
      <label>
        <span>Anything else? (optional)</span>
        <input name="note" />
      </label>
      <button type="submit" className="bcard-primary" disabled={status === "sending"}>
        {status === "sending" ? "Sending…" : "Have Brandon reach out"}
      </button>
      {status === "error" && (
        <p className="bcard-err" role="alert">
          That didn&apos;t send — tap Call or Text above instead.
        </p>
      )}
    </form>
  );
}
