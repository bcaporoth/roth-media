"use client";

import { useEffect, useRef, useState } from "react";
import { createSupabaseBrowser } from "../lib/supabase-browser";

export default function PortalLogin() {
  // idle | sending | sent | verifying | landing
  const [status, setStatus] = useState("idle");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const codeRef = useRef(null);

  // 1) If we arrived from the emailed sign-in link, the session rides in the
  //    URL fragment. Let supabase-js consume it, then reload signed in.
  // 2) If an old/used link bounced us here, show a friendly message.
  useEffect(() => {
    const hash = window.location.hash;
    if (/access_token|refresh_token/.test(hash)) {
      setStatus("landing");
      const supabase = createSupabaseBrowser();
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event) => {
        if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
          supabase.auth.getSession().then(({ data }) => {
            if (data.session) window.location.replace("/portal");
          });
        }
      });
      const bail = setTimeout(() => {
        setStatus("idle");
        setError(
          "That sign-in link didn't work — it may have expired. Enter your email and I'll send a fresh one."
        );
      }, 8000);
      return () => {
        clearTimeout(bail);
        subscription.unsubscribe();
      };
    }
    if (/error=/.test(hash) || /[?&]error=link/.test(window.location.search)) {
      setError(
        "That sign-in link didn't work — it may have expired or been used already. Enter your email and I'll send a fresh one."
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
          emailRedirectTo: `${window.location.origin}/portal`,
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
        "That code didn't match — double-check the digits, or request a fresh email below."
      );
    }
  }

  if (status === "landing") {
    return (
      <div className="cform-success" role="status">
        <p className="cform-success-title">Signing you in…</p>
        <p className="cform-success-body">One second.</p>
      </div>
    );
  }

  if (status === "sent" || status === "verifying") {
    return (
      <div className="cform" role="status">
        <p className="cform-success-title">Check your email.</p>
        <p className="cform-success-body">
          I sent a sign-in email to <strong>{email}</strong>. Tap the button
          in it — it works on any device. If the email shows a 6-digit code,
          you can type it here instead. It can take a minute to arrive.
        </p>
        <form onSubmit={handleVerify}>
          <div>
            <label htmlFor="pl-code">6-digit code (if your email has one)</label>
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
        {status === "sending" ? "Sending…" : "Email me a sign-in link"}
      </button>
      {error && (
        <p className="cform-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
