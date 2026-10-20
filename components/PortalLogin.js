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

// Plain-words help, used in every message so no screen is a dead end.
const SETUP_LABEL = "First time here / forgot password?";
const TEXT_ME = "text me at 845-549-4425 and I'll set your password for you";
const OFFLINE = "Your phone or computer looks offline — check your Wi-Fi or signal, then try again.";
const isOffline = (err) =>
  (typeof navigator !== "undefined" && navigator.onLine === false) ||
  err instanceof TypeError ||
  /failed to fetch|load failed|network/i.test(err?.message || "");
const isRateLimited = (err) =>
  err?.status === 429 || /rate limit|too many|security purposes|after \d+ seconds/i.test(err?.message || "");
const clock = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const timeOf = (iso) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

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
  const [sentAt, setSentAt] = useState(""); // when the code they should use went out
  const [via, setVia] = useState("site"); // site (our Resend email) | supabase (fallback email)
  const [waitUntil, setWaitUntil] = useState(0); // "Send a new code" unlocks at this time
  const [now, setNow] = useState(() => Date.now());
  const secsLeft = Math.max(0, Math.ceil((waitUntil - now) / 1000));
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
        `That sign-in link didn't work — it has expired (they last about an hour), was already used, or is from an older email. Type your email below and tap "${SETUP_LABEL}" for a fresh one.`
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

  // Ticks the "Send a new code in 0:42" countdown.
  useEffect(() => {
    if (waitUntil <= Date.now()) return;
    const t = setInterval(() => {
      setNow(Date.now());
      if (Date.now() >= waitUntil) clearInterval(t);
    }, 1000);
    return () => clearInterval(t);
  }, [waitUntil]);

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
    } catch (err) {
      setBusy(false);
      if (isOffline(err)) return setError(OFFLINE);
      if (isRateLimited(err))
        return setError(`Too many tries in a row — wait about a minute, then try again. Forgot your password? Tap "${SETUP_LABEL}" below instead.`);
      if (/not confirmed/i.test(err?.message || ""))
        return setError(`Your login isn't finished yet. Tap "${SETUP_LABEL}" below — I'll email you a code, then you choose a password.`);
      const known = await emailIsKnown(addr);
      setError(
        known
          ? `That password didn't match ${addr}. Passwords are case-sensitive — check caps lock, or tap "Show" to see what you typed. Never made one, or forgot it? Tap "${SETUP_LABEL}" below.`
          : `I don't have an account under ${addr}. It's usually the email you booked with — double-check the spelling, or ${TEXT_ME}.`
      );
    }
  }

  // First-time setup & forgot password: email a one-time code/link that
  // lands on the choose-a-password page.
  async function handleSendSetup(e) {
    e?.preventDefault();
    const addr = cleanEmail(email);
    if (!addr) {
      setMode("password");
      setError(`Type your email in the box above first, then tap "${SETUP_LABEL}" again.`);
      return;
    }
    setMode("sending");
    setError("");
    setNotice("");
    const notOnFile = () => {
      setMode("password");
      setError(
        `I don't have ${addr} on file. It's usually the email you booked with — double-check the spelling, or ${TEXT_ME}.`
      );
    };
    // recent: a code already went out under a minute ago — nothing new was sent, that one still works.
    const sent = ({ recent = false, wait = 60, at = "", from = "site" } = {}) => {
      setMode("sent");
      setRecentSend(recent);
      setVia(from);
      setSentAt(at || new Date().toISOString());
      setWaitUntil(Date.now() + wait * 1000);
      setNow(Date.now());
      setNotice("Code sent — after you set your password you'll never need a code again.");
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
      if (json.recent) return sent({ recent: true, wait: json.waitSeconds, at: json.sentAt });
      if (json.ok) return sent({ wait: json.waitSeconds });
      if (!json.fallback) throw Object.assign(new Error(json.error || "send failed"), { sendFailed: true });

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
      if (err && isRateLimited(err)) return sent({ recent: true, from: "supabase" });
      if (err) throw err;
      sent({ from: "supabase" });
    } catch (err) {
      setMode("password");
      setError(
        isOffline(err)
          ? OFFLINE
          : `The email didn't go out — that's on my end, not yours. Wait a minute and tap "${SETUP_LABEL}" again, or ${TEXT_ME}.`
      );
    }
  }

  async function handleVerify(e) {
    e.preventDefault();
    const token = code.replace(/\D/g, "");
    if (token.length < 6) {
      setError("That's not the whole code — type every digit from the email (it's at least 6).");
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
      const msg = err?.message || "";
      setError(
        isOffline(err)
          ? OFFLINE
          : isRateLimited(err)
            ? "Too many tries in a row — wait about a minute, then type the code again."
            : /expired/i.test(msg)
              ? `That code has expired (each one lasts about an hour). Tap "Send a new code" below and use the code in the new email.`
              : `That code didn't match. Make sure it's from the newest email — sending a new code cancels the old one — and that every digit is there. Still stuck? Tap "Send a new code", or ${TEXT_ME}.`
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
          {recentSend ? (
            <>
              I already sent a code to <strong>{email}</strong>
              {sentAt ? ` at ${timeOf(sentAt)}` : ""} — it still works, so use
              that one. (I didn&apos;t send another yet, so a double tap
              can&apos;t cancel it.)
            </>
          ) : (
            <>I just sent a code to <strong>{email}</strong>.</>
          )}
        </p>
        <ol className="pt-steps">
          <li>
            Open your email and find the one{" "}
            {via === "site" ? (
              <>
                from <strong>Brandon Roth</strong> — the subject starts with your
                code: <em>&ldquo;…is your Roth Media sign-in code&rdquo;</em>.
              </>
            ) : (
              <>with your Roth Media sign-in code (it may come from &ldquo;Supabase Auth&rdquo;).</>
            )}
          </li>
          <li>Type the code below and tap <strong>Continue</strong> — or just tap the button in the email.</li>
          <li>Choose your password. From then on it&apos;s just email + password — no more codes.</li>
        </ol>
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
          <div className="pt-nocode">
            <p className="pt-nocode-title">Don&apos;t see it?</p>
            <ul className="pt-steps">
              <li>Give it a minute — it can take up to 60 seconds to arrive.</li>
              <li>Check <strong>Spam</strong> or <strong>Junk</strong> — and in Gmail, the <strong>Promotions</strong> and <strong>Updates</strong> tabs.</li>
              <li>Make sure <strong>{email}</strong> is right. If it isn&apos;t, tap &ldquo;Back to sign in&rdquo; and fix it.</li>
              <li>Still nothing? Text me at 845-549-4425 and I&apos;ll set your password for you.</li>
            </ul>
          </div>
          <button
            type="button"
            className="pt-textbtn"
            disabled={mode === "verifying" || secsLeft > 0}
            onClick={() => {
              setCode("");
              setError("");
              handleSendSetup();
            }}
          >
            {secsLeft > 0 ? `Send a new code — available in ${clock(secsLeft)}` : "Send a new code"}
          </button>
          {secsLeft > 0 && (
            <p className="cx-help">
              Hang tight — to keep your code from getting cancelled, a new one can only go out once a minute.
            </p>
          )}
          {secsLeft === 0 && (
            <p className="cx-help">A new code cancels the old one — after you tap it, use the newest email.</p>
          )}
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
          ? "Sending your code…"
          : `${SETUP_LABEL} Set one up →`}
      </button>
      <p className="cx-help">
        Type your email above, then tap that — I&apos;ll email you a one-time
        code, and you choose a new password. Takes about a minute.
      </p>
    </form>
  );
}
