"use client";

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
    <div className="pgate-countdown" role="timer" aria-live="off">
      {cells.map(([v, label]) => (
        <div className="pgate-cell" key={label}>
          <span className="pgate-num">{pad(v)}</span>
          <span className="pgate-label">{label}</span>
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
    <form className="pgate-form" onSubmit={handleSubmit}>
      <input
        type="text"
        name="website"
        className="cform-honey"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
      />
      <div>
        <label htmlFor="pg-name">First name</label>
        <input
          id="pg-name"
          type="text"
          placeholder="Your name"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div>
        <label htmlFor="pg-email">Email</label>
        <input
          id="pg-email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <button type="submit" disabled={status === "sending"}>
        {status === "sending" ? "One sec…" : mode === "inline" ? "Save my seat" : "Watch the film"}
      </button>
      {error && (
        <p className="cform-error" role="alert">{error}</p>
      )}
      <p className="pgate-fine">
        You&apos;ll get the film in your inbox the moment it premieres. No spam,
        ever — unsubscribe with one tap.
      </p>
    </form>
  );

  if (mode === "inline") {
    // Pre-reveal page body.
    if (!checked) return <div className="pgate-card" aria-hidden="true" />;
    return (
      <div className="pgate-card">
        {!captured ? (
          <>
            <div className="kick">Tonight&apos;s film</div>
            <h2 className="pgate-title">{title}</h2>
            <p className="pgate-sub">
              The sneak peek premieres soon. Drop your email and it lands in
              your inbox the second it goes live.
            </p>
            {form}
          </>
        ) : (
          <>
            <div className="kick">You&apos;re on the list</div>
            <h2 className="pgate-title">Premieres in</h2>
            <Countdown revealAt={revealAt} />
            <p className="pgate-sub">
              Check your inbox — your confirmation just landed. The film will
              be right here (and in your email) at zero.
            </p>
            <a href="/quote" className="hero-cta-secondary pgate-cta">
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
    <div className="pgate-overlay" role="dialog" aria-modal="true" aria-label="Sign up to watch">
      <div className="pgate-card">
        <div className="kick">Roth Media presents</div>
        <h2 className="pgate-title">{title}</h2>
        <p className="pgate-sub">
          Pop in your name and email and the film is all yours — plus you&apos;ll
          get the link in your inbox to rewatch anytime.
        </p>
        {form}
      </div>
    </div>
  );
}
