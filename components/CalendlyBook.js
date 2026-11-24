"use client";

// Command Center → "Book a meeting" (2026-11-24, Brandon: "takes me to
// Calendly, allows me to put the client in so they can meet with me on a
// certain day and at a certain time, and populates into both our calendars").
// Calendly opens right here with the client's name and email filled in;
// Brandon picks the time and books. Calendly puts it on his calendar, emails
// the client the invite (theirs), and the profile shows "Call booked"
// (api/call-booked, `sid` = the client's intake or inquiry row).

import { useEffect, useState } from "react";
import { CALENDLY, CALENDLY_PLANNING } from "../lib/site";

// Two kinds: a sit-down at their business (default) or the 15-minute phone call.
const KINDS = [
  { id: "plan", label: "Planning meeting · in person, 30 min", url: CALENDLY_PLANNING },
  { id: "call", label: "Phone call · 15 min", url: CALENDLY },
];

export default function CalendlyBook({ name = "", email = "", phone = "", address = "", sid = "", label = "Book a meeting", className = "achip achip-primary", onBooked }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState("plan");
  const pick = KINDS.find((k) => k.id === kind) || KINDS[0];
  const [booked, setBooked] = useState(false);
  const [host, setHost] = useState("");
  useEffect(() => { setHost(window.location.hostname); }, []);
  useEffect(() => {
    if (!open) return;
    function onMessage(e) {
      if (e.origin !== "https://calendly.com" || e.data?.event !== "calendly.event_scheduled") return;
      setBooked(true);
      const p = e.data.payload || {};
      if (sid) fetch("/api/call-booked", { method: "POST", keepalive: true, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ i: sid, event: p.event?.uri || "", invitee: p.invitee?.uri || "" }) }).catch(() => {});
      onBooked?.();
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [open, sid, onBooked]);

  const first = (name || "").split(" ")[0] || "them";
  const q = new URLSearchParams({ embed_type: "Inline", hide_gdpr_banner: "1" });
  if (host) q.set("embed_domain", host);
  if (name) q.set("name", name);
  if (email) q.set("email", email);
  if (phone) q.set("a1", `Phone: ${phone}`);

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(!open)} aria-expanded={open}>{open ? "Close Calendly" : label}</button>
      {open && (
        <div className="cbook" role="region" aria-label={`Book a meeting with ${first}`}>
          <p className="cbook-head">{booked
            ? <><strong>Booked.</strong> It&apos;s on your calendar, and Calendly emailed {first} the invite for theirs.</>
            : <>Pick the day and time with {first}. Their name and email are already in.{kind === "plan" ? (address ? <> Calendly asks where: <strong>{address}</strong>.</> : <> Calendly asks where: type their business address.</>) : phone ? <> Calendly asks for the number you&apos;ll call: <strong>{phone}</strong>.</> : null} When you book, it goes on <strong>both calendars</strong>.</>}</p>
          {!booked && (
            <div className="cx-pills cbook-kinds" role="radiogroup" aria-label="What kind of meeting">
              {KINDS.map((k) => <button key={k.id} type="button" role="radio" aria-checked={kind === k.id} className={"ifilter" + (kind === k.id ? " is-on" : "")} onClick={() => setKind(k.id)}>{k.label}</button>)}
            </div>
          )}
          {host && <iframe key={pick.id} className="bookcall-frame cbook-frame" src={`${pick.url}?${q.toString()}`} title={`Book a meeting with ${first}`} loading="lazy" />}
        </div>
      )}
    </>
  );
}
