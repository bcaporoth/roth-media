"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseBrowser } from "../lib/supabase-browser";

// Client login: email + password, set up once and used forever after.
// First-time setup and "forgot password" use a one-time emailed code/link
// (the proven OTP flow) that lands on /portal/account to choose a password.

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

const NEXT_KEY = "rm-after-login";

// People type emails with stray capitals and iPhone autofill loves
// trailing spaces — accounts are stored lowercase, so normalize first.
const cleanEmail = (e) => e.trim().toLowerCase();

async function emailIsKnown(email) {
  try {
    const res = await fetch("/api/portal/known-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const json = await res.json();
    return Boolean(json?.known);
  } catch {
    return true; // never block a real client because the check hiccuped
  }
}

export default function PortalLogin() {
  // password | sending | sent | verifying | landing
  const [mode, setMode] = useState("password");
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const codeRef = useRef(null);

  // Consume an emailed sign-in link landing here (works on any device),
  // then continue to the portal — or to password setup if that's what
  // this email was for.
  useEffect(() => {
    const hash = window.location.hash;
    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(hash.replace(/^#/, ""));
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");
    const pkceCode = params.get("code");

    const dest = () => {
      const next = window.localStorage.getItem(NEXT_KEY);
      window.localStorage.removeItem(NEXT_KEY);
      return next || "/portal";
    };

    const fail = () => {
      setMode("password");
      setError(
        "That sign-in link didn't work — it may have expired or been used already. Sign in with your password, or request a fresh email below."
      );
      window.history.replaceState(null, "", "/portal");
    };

    if (accessToken && refreshToken) {
      setMode("landing");
      const supabase = createSupabaseBrowser();
      supabase.auth
        .setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ error: err }) =>
          err ? fail() : window.location.replace(dest())
        )
        .catch(fail);
      return;
    }

    if (pkceCode) {
      setMode("landing");
      const supabase = createSupabaseBrowser();
      supabase.auth
        .exchangeCodeForSession(pkceCode)
        .then(({ error: err }) =>
          err ? fail() : window.location.replace(dest())
        )
        .catch(fail);
      return;
    }

    if (/error=/.test(hash) || params.get("error") === "link") {
      fail();
    }
  }, []);

  useEffect(() => {
    if (mode === "sent") codeRef.current?.focus();
  }, [mode]);

  async function handlePasswordSignIn(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const addr = cleanEmail(email);
    try {
      const supabase = createSupabaseBrowser();
      const { error: err } = await supabase.auth.signInWithPassword({
        email: addr,
        password,
      });
      if (err) throw err;
      window.location.assign("/portal");
    } catch {
      const known = await emailIsKnown(addr);
      setBusy(false);
      setError(
        known
          ? "The password didn't match. Tap \"First time here / forgot password?\" below — you'll be back in within a minute."
          : `I don't have an account under ${addr}. It's usually the email you booked with — double-check the spelling, or text me at 845-549-4425 and I'll look it up.`
      );
    }
  }

  // First-time setup & forgot password: email a one-time code/link that
  // lands on the choose-a-password page.
  async function handleSendSetup(e) {
    e.preventDefault();
    const addr = cleanEmail(email);
    if (!addr) {
      setError("Type your email first, then tap that again.");
      return;
    }
    setMode("sending");
    setError("");
    try {
      // Only email addresses that are actually on the roster — otherwise a
      // typo would silently create an empty account with no galleries in it.
      if (!(await emailIsKnown(addr))) {
        setMode("password");
        setError(
          `I don't have ${addr} on file. It's usually the email you booked with — double-check the spelling, or text me at 845-549-4425 and I'll look it up.`
        );
        return;
      }
      window.localStorage.setItem(NEXT_KEY, "/portal/account?setup=1");
      const supabase = createSenderClient();
      const { error: err } = await supabase.auth.signInWithOtp({
        email: addr,
        options: {
          emailRedirectTo: `${window.location.origin}/portal`,
        },
      });
      if (err) throw err;
      setMode("sent");
      setNotice(
        "One-time email sent. This is just to prove it's you — after you set your password you'll never need email again."
      );
    } catch {
      setMode("password");
      setError(
        "Couldn't send the email — make sure it's the email you booked with, or text me at 845-549-4425."
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
    setMode("verifying");
    setError("");
    try {
      const supabase = createSupabaseBrowser();
      const { error: err } = await supabase.auth.verifyOtp({
        email: cleanEmail(email),
        token,
        type: "email",
      });
      if (err) throw err;
      window.localStorage.removeItem(NEXT_KEY);
      window.location.assign("/portal/account?setup=1");
    } catch {
      setMode("sent");
      setError(
        "That code didn't match — double-check the digits, or go back and resend."
      );
    }
  }

  if (mode === "landing") {
    return (
      <div className="cform-success" role="status">
        <p className="cform-success-title">Signing you in…</p>
        <p className="cform-success-body">One second.</p>
      </div>
    );
  }

  if (mode === "sent" || mode === "verifying") {
    return (
      <div className="cform" role="status">
        <p className="cform-success-title">Check your email.</p>
        <p className="cform-success-body">
          I sent a one-time email to <strong>{email}</strong>. Tap the button
          in it, or type the 6-digit code here. Either way you&apos;ll land on
          a page to choose your password — then it&apos;s email + password
          from there on out.
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
          <button type="submit" disabled={mode === "verifying"}>
            {mode === "verifying" ? "One sec…" : "Continue"}
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
              setMode("password");
              setCode("");
              setError("");
              setNotice("");
            }}
          >
            ← Back to sign in
          </button>
        </form>
      </div>
    );
  }

  return (
    <form className="cform" onSubmit={handlePasswordSignIn}>
      <div>
        <label htmlFor="pl-email">Email</label>
        <input
          id="pl-email"
          type="email"
          placeholder="The email you used to book with me"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          inputMode="email"
          required
        />
      </div>
      <div>
        <label htmlFor="pl-password">Password</label>
        <div className="pl-pw-wrap">
          <input
            id="pl-password"
            type={showPw ? "text" : "password"}
            placeholder="Your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
          <button
            type="button"
            className="pl-pw-toggle"
            onClick={() => setShowPw((s) => !s)}
            aria-label={showPw ? "Hide password" : "Show password"}
          >
            {showPw ? "Hide" : "Show"}
          </button>
        </div>
      </div>
      <button type="submit" disabled={mode === "sending" || busy}>
        {busy ? "Signing you in…" : "Sign in"}
      </button>
      <button
        type="button"
        className="cform-linklike"
        onClick={handleSendSetup}
        disabled={mode === "sending"}
      >
        {mode === "sending"
          ? "Sending…"
          : "First time here / forgot password? Set one up →"}
      </button>
      {notice && !error && <p className="pgate-fine">{notice}</p>}
      {error && (
        <p className="cform-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
