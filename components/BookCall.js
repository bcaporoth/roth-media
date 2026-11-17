"use client";

import { useEffect, useState } from "react";
import { CALENDLY } from "../lib/site";
import { track } from "../lib/track";

// The step right after any form: pick a call time without leaving the page.
// Calendly's inline embed, pre-filled with what they just typed. Calendly
// posts a message when the booking lands — that's the "call booked" stat.
// `sid` is the inquiry this call belongs to (the id /api/forms hands back):
// with it, Studio shows "Call booked" on that person (lib/call.js).
export default function BookCall({ name = "", email = "", from = "site", dark = false, sid = "" }) {
  const [booked, setBooked] = useState(false);
  // The picker needs the page's host name, which only the browser knows, so
  // it is drawn after the page loads (matters on /call, which renders on the server).
  const [host, setHost] = useState("");
  useEffect(() => { setHost(window.location.hostname); }, []);

  useEffect(() => {
    track("call_picker_shown", { from });
    function onMessage(e) {
      if (e.origin !== "https://calendly.com") return;
      if (e.data && e.data.event === "calendly.event_scheduled") {
        track("call_booked", { from });
        setBooked(true);
        if (sid) {
          const p = e.data.payload || {};
          fetch("/api/call-booked", {
            method: "POST", keepalive: true,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ i: sid, event: p.event?.uri || "", invitee: p.invitee?.uri || "" }),
          }).catch(() => {});
        }
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [from, sid]);

  const q = new URLSearchParams({ embed_type: "Inline", hide_gdpr_banner: "1", hide_event_type_details: "1" });
  if (host) q.set("embed_domain", host);
  if (name) q.set("name", name);
  if (email) q.set("email", email);

  return (
    <div className={"bookcall" + (dark ? " is-dark" : "")}>
      <p className="bookcall-title">{booked ? "Call booked. Talk soon." : "Last step: pick a time for a 15-minute call."}</p>
      <p className="bookcall-sub">
        {booked
          ? "The invite is in your inbox. I\u2019ll call you at the number you give \u2014 have your date and any must-haves handy."
          : "It\u2019s the fastest way to a firm price and a locked date. Most people grab a slot in the next day or two."}
      </p>
      {host ? (
        <iframe
          className="bookcall-frame"
          src={`${CALENDLY}?${q.toString()}`}
          title="Pick a time for a call with Brandon"
          loading="lazy"
        />
      ) : (
        <div className="bookcall-frame" aria-hidden="true" />
      )}
      {!booked && (
        <p className="bookcall-sub">
          Rather text? <a href="sms:+18455494425" onClick={() => track("card_text", { from })}>845-549-4425</a>
        </p>
      )}
    </div>
  );
}
