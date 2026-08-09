"use client";

import { useEffect, useRef, useState } from "react";
import { createSupabaseBrowser } from "../lib/supabase-browser";

export default function PortalLogin() {
  const [status, setStatus] = useState("idle"); // idle | sending | sent | verifying
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const codeRef = useRef(null);

  // Surface a friendly message when an emailed link couldn't be verified
  // (expired, already used, or opened after a newer link was sent).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "link") {
      setError(
        "That sign-in link didn't work — it may have expired or been used already. Enter your email below and I'll send a fresh one."
      );
      window.history.replaceState(null, "", "/portal");
    }
  }, []);

  useEffect(() => {
    if (status === "sent") codeRef.current?.focus();
  }, [status]);

  async function handleSend(e) {
    e.preventDefault();
    setStatus("sending");
    setError("");
    try {
      const supabase = createSupabaseBrowser();
      const { error: err } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (err) throw err;
      setStatus("sent");
    } catch {
      setStatus("idle");
      setError(
        "Couldn't send the link — make sure it's the email you booked with, or text me at 845-549-4425."
      );
    }
  }

  async function handleVerify(e) {
    e.preventDefault();
    const token = code.replace(/\D/g, "");
    if (token.length < 6) {
      setError("The code is the 6 digits from the email.");
      return;
    }
    setStatus("verifying");
    setError("");
    try {
      const supabase = createSupabaseBrowser();
      const { error: err } = await supabase.auth.verifyOtp({
        email,
        token,
        type: "email",
      });
      if (err) throw err;
      window.location.assign("/portal");
    } catch {
      setStatus("sent");
      setError(
        "That code didn't match — double-check the 6 digits, or request a fresh email below."
      );
    }
  }

  if (status === "sent" || status === "verifying") {
    return (
      <div className="cform" role="status">
        <p className="cform-success-title">Check your email.</p>
        <p className="cform-success-body">
          I sent a sign-in email to <strong>{email}</strong>. Tap the button
          in it — it works on any device — or type the 6-digit code here. It
          can take a minute to arrive.
        </p>
        <form onSubmit={handleVerify}>
          <div>
            <label htmlFor="pl-code">6-digit code</label>
            <input
              id="pl-code"
              ref={codeRef}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            />
          </div>
          <button type="submit" disabled={status === "verifying"}>
            {status === "verifying" ? "Signing you in…" : "Sign in with code"}
          </button>
          {error && (
            <p className="cform-error" role="alert">
              {error}
            </p>
          )}
          <button
            type="button"
            className="cform-linklike"
            onClick={() => {
              setStatus("idle");
              setCode("");
              setError("");
            }}
          >
            Use a different email / resend
          </button>
        </form>
      </div>
    );
  }

  return (
    <form className="cform" onSubmit={handleSend}>
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
        {status === "sending" ? "Sending…" : "Email me a sign-in code"}
      </button>
      {error && (
        <p className="cform-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
