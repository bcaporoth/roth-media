"use client";

import { useState } from "react";

// Set NEXT_PUBLIC_FORM_ENDPOINT (e.g. a Formspree URL like
// https://formspree.io/f/xxxxxx) to submit in-page. Until then the form
// falls back to opening the visitor's email app pre-filled.
const FORM_ENDPOINT = process.env.NEXT_PUBLIC_FORM_ENDPOINT || "";
const CONTACT_EMAIL = "b.caporoth@gmail.com";

export default function ContactForm() {
  const [status, setStatus] = useState("idle");

  async function handleSubmit(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());

    if (!FORM_ENDPOINT) {
      const subject = encodeURIComponent(
        `Project inquiry from ${data.name}${data.business ? ` (${data.business})` : ""}`
      );
      const body = encodeURIComponent(
        `Name: ${data.name}\nBusiness: ${data.business}\nEmail: ${data.email}\nLooking for: ${data.service}\n\n${data.message}`
      );
      window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
      return;
    }

    setStatus("sending");
    try {
      const res = await fetch(FORM_ENDPOINT, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: new FormData(form),
      });
      if (!res.ok) throw new Error("Request failed");
      setStatus("sent");
      form.reset();
    } catch {
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <p className="form-success" role="status">
        Got it — I&apos;ll get back to you within one business day.
      </p>
    );
  }

  return (
    <form className="contact-form" onSubmit={handleSubmit}>
      <div className="form-row">
        <div className="form-field">
          <label htmlFor="cf-name">Your name *</label>
          <input id="cf-name" name="name" type="text" required autoComplete="name" />
        </div>
        <div className="form-field">
          <label htmlFor="cf-business">Business name</label>
          <input id="cf-business" name="business" type="text" autoComplete="organization" />
        </div>
      </div>
      <div className="form-row">
        <div className="form-field">
          <label htmlFor="cf-email">Email *</label>
          <input id="cf-email" name="email" type="email" required autoComplete="email" />
        </div>
        <div className="form-field">
          <label htmlFor="cf-service">What are you looking for?</label>
          <select id="cf-service" name="service" defaultValue="Video">
            <option>Video</option>
            <option>Photography</option>
            <option>Both</option>
            <option>Not sure yet</option>
          </select>
        </div>
      </div>
      <div className="form-field">
        <label htmlFor="cf-message">Tell me about your business</label>
        <textarea
          id="cf-message"
          name="message"
          rows={4}
          placeholder="What do you sell or do? Where can I see it?"
        />
      </div>
      <button
        type="submit"
        className="btn btn-light"
        disabled={status === "sending"}
      >
        {status === "sending" ? "Sending…" : "Send it"}
      </button>
      {status === "error" && (
        <p className="form-error" role="alert">
          Something went wrong — email me directly at {CONTACT_EMAIL} and
          I&apos;ll get right back to you.
        </p>
      )}
    </form>
  );
}
