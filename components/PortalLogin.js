"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseBrowser } from "../lib/supabase-browser";

// Sender-only client. @supabase/ssr forces PKCE (links that only work in
// the requesting browser), so the sign-in email is requested through a
// plain implicit-flow client instead — the emailed link then carries the
// session itself and works on any device.
function createSenderClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: {
        flowType: "implicit",
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );
}

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
    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(hash.replace(/^#/, ""));
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");
    const code = params.get("code");

    const fail = () => {
      setStatus("idle");
      setError(
        "That sign-in link didn't work — it may have expired or been used already. Enter your email and I'll send a fresh one."
      );
      window.history.replaceState(null, "", "/portal");
    };

    // New-style link: session rides in the URL fragment — works on any device.
    if (accessToken && refreshToken) {
      setStatus("landing");
      const supabase = createSupabaseBrowser();
      supabase.auth
        .setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ error: err }) =>
          err ? fail() : window.location.replace("/portal")
        )
        .catch(fail);
      return;
    }

    // Older-style link (?code=): exchange works in the browser that
    // requested the link.
    if (code) {
      setStatus("landing");
      const supabase = createSupabaseBrowser();
      supabase.auth
        .exchangeCodeForSession(code)
        .then(({ error: err }) =>
          err ? fail() : window.location.replace("/portal")
        )
        .catch(fail);
      return;
    }

    if (/error=/.test(hash) || params.get("error") === "link") {
      fail();
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
      const supabase = createSenderClient();
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
