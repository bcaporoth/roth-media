"use client";

import "../app/theme/share.css";
import { useEffect, useMemo, useState } from "react";

// Same-Night Premiere gate. Two modes:
//  - "inline"  (pre-reveal page): the gate IS the page — email capture,
//    then a live countdown to the reveal; reloads at T-zero.
//  - "overlay" (post-reveal): the gallery is rendered underneath; guests
//    who haven't signed up yet see a full-screen ask first.
// Returning guests are remembered per-gallery in localStorage.

const storeKey = (id) => `rm-premiere-${id}`;

function useCountdown(revealAt) {
  const target = useMemo(
    () => (revealAt ? new Date(revealAt).getTime() : 0),
    [revealAt]
  );
  const [left, setLeft] = useState(() => Math.max(0, target - Date.now()));
  useEffect(() => {
    if (!target) return;
    const t = setInterval(() => {
      const remaining = target - Date.now();
      setLeft(Math.max(0, remaining));
      if (remaining <= 0) {
        clearInterval(t);
        // The film just premiered — pull down the real page.
        setTimeout(() => window.location.reload(), 1200);
      }
    }, 1000);
    return () => clearInterval(t);
  }, [target]);
  return left;
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function Countdown({ revealAt }) {
  const left = useCountdown(revealAt);
  const s = Math.floor(left / 1000);
  const days = Math.floor(s / 86400);
  const hrs = Math.floor((s % 86400) / 3600);
  const min = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const cells = days > 0
    ? [[days, "days"], [hrs, "hrs"], [min, "min"], [sec, "sec"]]
    : [[hrs, "hrs"], [min, "min"], [sec, "sec"]];
  return (
    <div className="sh-count" role="timer" aria-live="off">
      {cells.map(([v, label]) => (
        <div className="sh-count-cell" key={label}>
          <span className="sh-count-num">{pad(v)}</span>
          <span className="sh-count-label">{label}</span>
        </div>
      ))}
    </div>
  );
}

export default function PremiereGate({ galleryId, token, title, revealAt, mode }) {
  // idle | sending | done
  const [status, setStatus] = useState("idle");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [captured, setCaptured] = useState(mode === "inline" ? false : true);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const ok = window.localStorage.getItem(storeKey(galleryId)) === "ok";
    setCaptured(ok);
    setChecked(true);
  }, [galleryId]);

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("sending");
    setError("");
    try {
      const res = await fetch("/api/premiere/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, name, email }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Something went wrong.");
      window.localStorage.setItem(storeKey(galleryId), "ok");
      setCaptured(true);
      setStatus("done");
    } catch (err) {
      setStatus("idle");
      setError(err.message || "Something went wrong — try again.");
    }
  }

  const form = (
    <form className="cx-form sh-gate-form" onSubmit={handleSubmit}>
      <input
        type="text"
        name="website"
        className="cform-honey"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
      />
      <div className="cx-field">
        <label className="cx-label" htmlFor="pg-name">First name</label>
        <input
          id="pg-name"
          className="cx-input"
          type="text"
          placeholder="Your name"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="cx-field">
        <label className="cx-label" htmlFor="pg-email">Email</label>
        <input
          id="pg-email"
          className="cx-input"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <button type="submit" className="cx-btn cx-btn--light cx-btn--lg cx-btn--block" disabled={status === "sending"}>
        {status === "sending" ? "One sec…" : mode === "inline" ? "Save my seat" : "Watch the film"}
      </button>
      {error && (
        <p className="cx-error" role="alert">{error}</p>
      )}
      <p className="cx-help">
        You&apos;ll get the film in your inbox the moment it premieres, plus a
        couple of notes from Roth Media afterward. No spam — unsubscribe with one tap.
      </p>
    </form>
  );

  if (mode === "inline") {
    // Pre-reveal page body.
    if (!checked) return <div className="sh-gate sh-gate--wait" aria-hidden="true" />;
    return (
      <div className="sh-gate">
        {!captured ? (
          <>
            <p className="cx-kick">Tonight&apos;s film</p>
            <h2 className="cx-h3 sh-gate-title">{title}</h2>
            <p className="sh-gate-sub">
              The sneak peek premieres soon. Drop your email and it lands in
              your inbox the second it goes live.
            </p>
            {form}
          </>
        ) : (
          <>
            <p className="cx-kick">You&apos;re on the list</p>
            <h2 className="cx-h3 sh-gate-title">Premieres in</h2>
            <Countdown revealAt={revealAt} />
            <p className="sh-gate-sub">
              Check your inbox — your confirmation just landed. The film will
              be right here (and in your email) at zero.
            </p>
            <a href="/quote" className="cx-btn cx-btn--ghost cx-btn--block sh-gate-cta">
              While you wait — book your own shoot →
            </a>
          </>
        )}
      </div>
    );
  }

  // Overlay mode: post-reveal, gallery rendered underneath.
  if (!checked || captured) return null;
  return (
    <div className="sh-gate-overlay" role="dialog" aria-modal="true" aria-label="Sign up to watch">
      <div className="sh-gate">
        <p className="cx-kick">Roth Media presents</p>
        <h2 className="cx-h2 sh-gate-title">{title}</h2>
        <p className="sh-gate-sub">
          Pop in your name and email and the film is all yours — plus you&apos;ll
          get the link in your inbox to rewatch anytime.
        </p>
        {form}
      </div>
    </div>
  );
}
