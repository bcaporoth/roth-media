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
  const [autoSetup, setAutoSetup] = useState(false);
  const [recentSend, setRecentSend] = useState(false); // a code went out under a minute ago; nothing new was sent
  // Where to go after signing in (?next=/portal/gallery/…). Portal paths only.
  const [nextPath, setNextPath] = useState("");
  const codeRef = useRef(null);
  const safeNext = (v) => (/^\/portal(\/[\w-]+)*\/?$/.test(String(v || "")) ? String(v) : "");
  const afterSetup = (next) => `/portal/account?setup=1${next ? `&next=${encodeURIComponent(next)}` : ""}`;

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
    const tokenHash = params.get("th"); // the button in our own setup email (/api/portal/setup-code)

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

    // Setup email button: verify the token here (any device), then on to
    // choosing a password — and the album after, if the email was for one.
    if (tokenHash) {
      setMode("landing");
      const supabase = createSupabaseBrowser();
      const then = afterSetup(safeNext(params.get("next")));
      supabase.auth
        .verifyOtp({ token_hash: tokenHash, type: "magiclink" })
        .then(({ error: err }) => (err ? supabase.auth.verifyOtp({ token_hash: tokenHash, type: "email" }) : { error: null }))
        .then(({ error: err }) => (err ? fail() : window.location.replace(then)))
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
      return;
    }

    // Access-invite / "it's ready" email: /portal?email=…&setup=1 prefills the
    // address and goes straight to the one-time-code step (once — the URL is
    // cleaned so a refresh doesn't resend). ?next= is where to land after.
    const wanted = safeNext(params.get("next"));
    if (wanted) setNextPath(wanted);
    const invited = params.get("email");
    if (invited) {
      setEmail(cleanEmail(invited));
      if (params.get("setup") === "1") setAutoSetup(true);
    }
    if (invited || wanted) window.history.replaceState(null, "", "/portal");
  }, []);

  useEffect(() => {
    if (autoSetup && email) {
      setAutoSetup(false);
      handleSendSetup();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSetup, email]);

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
      window.location.assign(nextPath || "/portal");
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
    e?.preventDefault();
    const addr = cleanEmail(email);
    if (!addr) {
      setError("Type your email first, then tap that again.");
      return;
    }
    setMode("sending");
    setError("");
    setNotice("");
    const notOnFile = () => {
      setMode("password");
      setError(
        `I don't have ${addr} on file. It's usually the email you booked with — double-check the spelling, or text me at 845-549-4425 and I'll look it up.`
      );
    };
    const sent = (recent = false) => {
      setMode("sent");
      setRecentSend(recent);
      setNotice(
        recent
          ? "I sent you a code a moment ago — use the one in that email (check spam too). Nothing came? Wait a minute, then tap \"Send a new code\"."
          : "One-time email sent. This is just to prove it's you — after you set your password you'll never need email again."
      );
    };
    try {
      // Sent by the site itself (Resend). It checks the roster — a typo never
      // makes an empty account — and won't send a second code within a
      // minute, so a double tap can't cancel the code they already have.
      const res = await fetch("/api/portal/setup-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: addr, next: nextPath }),
      });
      const json = await res.json().catch(() => ({}));
      if (json.known === false) return notOnFile();
      if (json.recent) return sent(true);
      if (json.ok) return sent();
      if (!json.fallback) throw new Error(json.error || "send failed");

      // Fallback (Resend not configured): Supabase's own email, as before.
      if (!(await emailIsKnown(addr))) return notOnFile();
      window.localStorage.setItem(NEXT_KEY, afterSetup(nextPath));
      const supabase = createSenderClient();
      const { error: err } = await supabase.auth.signInWithOtp({
        email: addr,
        options: {
          emailRedirectTo: `${window.location.origin}/portal`,
        },
      });
      // Supabase refuses a second one inside 60s — the first one is still good.
      if (err && (err.status === 429 || /security purposes|rate limit/i.test(err.message || ""))) return sent(true);
      if (err) throw err;
      sent();
    } catch {
      setMode("password");
      setError(
        "Couldn't send the email just now — wait a minute and tap that again, or text me at 845-549-4425 and I'll get you in."
      );
    }
  }

  async function handleVerify(e) {
    e.preventDefault();
    const token = code.replace(/\D/g, "");
    if (token.length < 6) {
      setError("Type the whole code from the email.");
      return;
    }
    setMode("verifying");
    setError("");
    try {
      const supabase = createSupabaseBrowser();
      const addr = cleanEmail(email);
      let { error: err } = await supabase.auth.verifyOtp({ email: addr, token, type: "email" });
      // Codes for a brand-new login can come from the "confirm signup" path.
      if (err) ({ error: err } = await supabase.auth.verifyOtp({ email: addr, token, type: "signup" }));
      if (err) throw err;
      window.localStorage.removeItem(NEXT_KEY);
      window.location.assign(afterSetup(nextPath));
    } catch (err) {
      setMode("sent");
      setError(
        /expired/i.test(err?.message || "")
          ? "That code has expired — tap \"Send a new code\" below."
          : "That code didn't work. Only the newest email's code counts — if you got two, use the latest one, or tap \"Send a new code\"."
      );
    }
  }

  if (mode === "landing") {
    return (
      <div className="pt-status" role="status">
        <p className="pt-status-title">Signing you in…</p>
        <p className="pt-status-body">One second.</p>
      </div>
    );
  }

  if (mode === "sent" || mode === "verifying") {
    return (
      <div className="pt-desk" role="status">
        <p className="pt-status-title">Check your email.</p>
        <p className="pt-status-body">
          I sent a one-time email to <strong>{email}</strong>. Tap the button
          in it, or type the code here. Either way you&apos;ll land on
          a page to choose your password — then it&apos;s email + password
          from there on out.
        </p>
        {recentSend && <p className="cx-help">{notice}</p>}
        <form className="cx-form pt-form" onSubmit={handleVerify}>
          <div className="cx-field">
            <label className="cx-label" htmlFor="pl-code">Code from the email</label>
            <input
              id="pl-code"
              className="cx-input pt-code"
              ref={codeRef}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              maxLength={8}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            />
          </div>
          <button
            type="submit"
            className="cx-btn cx-btn--light cx-btn--lg cx-btn--block"
            disabled={mode === "verifying"}
          >
            {mode === "verifying" ? "One sec…" : "Continue"}
          </button>
          {error && (
            <p className="cx-error" role="alert">
              {error}
            </p>
          )}
          <button
            type="button"
            className="pt-textbtn"
            disabled={mode === "verifying"}
            onClick={() => {
              setCode("");
              setError("");
              handleSendSetup();
            }}
          >
            Send a new code
          </button>
          <button
            type="button"
            className="pt-textbtn"
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
    <form className="cx-form pt-form pt-desk" onSubmit={handlePasswordSignIn}>
      <div className="cx-field">
        <label className="cx-label" htmlFor="pl-email">Email</label>
        <input
          id="pl-email"
          className="cx-input"
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
      <div className="cx-field">
        <label className="cx-label" htmlFor="pl-password">Password</label>
        <div className="pt-pw">
          <input
            id="pl-password"
            className="cx-input"
            type={showPw ? "text" : "password"}
            placeholder="Your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
          <button
            type="button"
            className="pt-pw-toggle"
            onClick={() => setShowPw((s) => !s)}
            aria-label={showPw ? "Hide password" : "Show password"}
          >
            {showPw ? "Hide" : "Show"}
          </button>
        </div>
      </div>
      <button
        type="submit"
        className="cx-btn cx-btn--light cx-btn--lg cx-btn--block"
        disabled={mode === "sending" || busy}
      >
        {busy ? "Signing you in…" : "Sign in"}
      </button>
      {error && (
        <p className="cx-error" role="alert">
          {error}
        </p>
      )}
      {notice && !error && <p className="cx-help">{notice}</p>}
      <button
        type="button"
        className="pt-setup"
        onClick={handleSendSetup}
        disabled={mode === "sending"}
      >
        {mode === "sending"
          ? "Sending…"
          : "First time here / forgot password? Set one up →"}
      </button>
    </form>
  );
}
