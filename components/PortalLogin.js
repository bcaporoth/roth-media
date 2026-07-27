"use client";

import { useState } from "react";
import { createSupabaseBrowser } from "../lib/supabase-browser";

export default function PortalLogin() {
  const [status, setStatus] = useState("idle");
  const [email, setEmail] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("sending");
    try {
      const supabase = createSupabaseBrowser();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div className="cform-success" role="status">
        <p className="cform-success-title">Check your email.</p>
        <p className="cform-success-body">
          I sent a sign-in link to <strong>{email}</strong>. Click it and
          you&apos;ll land right back here, signed in. It can take a minute
          to arrive.
        </p>
      </div>
    );
  }

  return (
    <form className="cform" onSubmit={handleSubmit}>
      <div>
        <label htmlFor="pl-email">Your email</label>
        <input
          id="pl-email"
          type="email"
          placeholder="The email you used to book with me"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
      </div>
      <button type="submit" disabled={status === "sending"}>
        {status === "sending" ? "Sending link…" : "Email me a sign-in link"}
      </button>
      {status === "error" && (
        <p className="cform-error" role="alert">
          Couldn&apos;t send the link — make sure it&apos;s the email you
          booked with, or text me at 845-549-4425.
        </p>
      )}
    </form>
  );
}
