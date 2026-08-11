"use client";

import { useState } from "react";
import { createSupabaseBrowser } from "../lib/supabase-browser";

// Set or change the account password. Used on /portal/account for both
// first-time setup (after the one-time email) and later changes.

export default function PasswordForm({ setup = false }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Make it at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Those two don't match — type the same password twice.");
      return;
    }
    setBusy(true);
    try {
      const supabase = createSupabaseBrowser();
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) throw err;
      setDone(true);
    } catch (err) {
      setError(
        err?.message?.includes("different from the old")
          ? "That's already your password — pick a new one."
          : "Couldn't save that password — try again, or text me at 845-549-4425."
      );
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="cform-success" role="status">
        <p className="cform-success-title">Password saved ✓</p>
        <p className="cform-success-body">
          From now on, just sign in with your email and this password — no
          more email links.
        </p>
        <a href="/portal" className="hero-cta-primary" style={{ marginTop: "1rem", display: "inline-block" }}>
          Go to my portal →
        </a>
      </div>
    );
  }

  return (
    <form className="cform" onSubmit={handleSubmit}>
      <div>
        <label htmlFor="pw-new">{setup ? "Choose a password" : "New password"}</label>
        <div className="pl-pw-wrap">
          <input
            id="pw-new"
            type={showPw ? "text" : "password"}
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={8}
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
      <div>
        <label htmlFor="pw-confirm">Type it again</label>
        <input
          id="pw-confirm"
          type={showPw ? "text" : "password"}
          placeholder="Same password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>
      <button type="submit" disabled={busy}>
        {busy ? "Saving…" : "Save password"}
      </button>
      {error && (
        <p className="cform-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
