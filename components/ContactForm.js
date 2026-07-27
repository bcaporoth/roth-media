"use client";

import { useState } from "react";

// FormSubmit.co — free form-to-email, no account, no subscription.
// Submissions arrive at CONTACT_EMAIL; the first one triggers a one-time
// confirmation email with an "Activate" link.
const CONTACT_EMAIL = "b.caporoth@gmail.com";
const ENDPOINT = `https://formsubmit.co/ajax/${CONTACT_EMAIL}`;

export default function ContactForm() {
  const [status, setStatus] = useState("idle");

  async function handleSubmit(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    if (data._honey) return; // spam bot filled the hidden field

    setStatus("sending");
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          name: data.name,
          business: data.business,
          email: data.email,
          service: data.service,
          message: data.message,
          _subject: `Roth Media inquiry — ${data.name}${data.business ? ` (${data.business})` : ""}`,
          _template: "table",
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || String(json.success) !== "true") throw new Error("failed");
      setStatus("sent");
      form.reset();
    } catch {
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div className="cform-success" role="status">
        <p className="cform-success-title">Got it — talk soon.</p>
        <p className="cform-success-body">
          I&apos;ll get back to you within one business day. In a hurry? Call
          or text <a href="tel:+18455494425">845-549-4425</a>.
        </p>
      </div>
    );
  }

  return (
    <form className="cform" onSubmit={handleSubmit}>
      <input
        type="text"
        name="_honey"
        className="cform-honey"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
      />
      <div className="row">
        <div>
          <label htmlFor="cf-name">Name</label>
          <input
            id="cf-name"
            name="name"
            type="text"
            placeholder="Your name"
            autoComplete="name"
            required
          />
        </div>
        <div>
          <label htmlFor="cf-business">Business</label>
          <input
            id="cf-business"
            name="business"
            type="text"
            placeholder="Your business (if you have one)"
            autoComplete="organization"
          />
        </div>
      </div>
      <div className="row">
        <div>
          <label htmlFor="cf-email">Email</label>
          <input
            id="cf-email"
            name="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
        </div>
        <div>
          <label htmlFor="cf-service">Looking for</label>
          <select id="cf-service" name="service" defaultValue="Video">
            <option>Video</option>
            <option>Photography</option>
            <option>Both</option>
            <option>Not sure yet</option>
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="cf-message">Tell me about it</label>
        <textarea
          id="cf-message"
          name="message"
          rows={4}
          placeholder="What do you sell or do? Where can I see it?"
        />
      </div>
      <button type="submit" disabled={status === "sending"}>
        {status === "sending" ? "Sending…" : "Send it"}
      </button>
      {status === "error" && (
        <p className="cform-error" role="alert">
          Something went wrong — email me at {CONTACT_EMAIL} or text
          845-549-4425 and I&apos;ll get right back to you.
        </p>
      )}
    </form>
  );
}
