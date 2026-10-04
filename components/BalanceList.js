"use client";

// Bookings paid through the site (the `bookings` table), as a list Brandon can
// act on: who, what, total / paid / still due, when the balance is due, and
// the balance link to copy or text. Rows are built by lib/money-view.js.
// Nothing here messages a client — "Text it" opens his own Messages app.

import { useState } from "react";
import Link from "next/link";
import { usd } from "../lib/money-view";

function CopyLink({ text }) {
  const [done, setDone] = useState(false);
  async function copy() {
    try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 2000); }
    catch { window.prompt("Copy:", text); }
  }
  return <button type="button" className={"achip" + (done ? " is-done" : "")} onClick={copy}>{done ? "Copied ✓" : "Copy balance link"}</button>;
}

// rows: bookingView() objects · profiles: { email: clientId } (optional) ·
// showName: false on a client's own profile, where the name is the page title.
export default function BalanceList({ rows, profiles = {}, showName = true }) {
  return (
    <ul className="sm-bal">
      {rows.map((r) => {
        const first = (r.name || "").trim().split(/\s+/)[0] || "there";
        const sms = r.link && r.phone
          ? `sms:${r.phone.replace(/[^\d+]/g, "")}&body=${encodeURIComponent(`Hi ${first}, it's Brandon. Here's the link for the balance on your ${r.label} (${usd(r.owedCents)}): ${r.link}`)}`
          : "";
        const what = [showName ? r.label : "", r.event, r.bookedOn && `booked ${r.bookedOn}`].filter(Boolean).join(" · ");
        return (
          <li key={r.id} className={`is-${r.state}`}>
            <div className="sm-bal-who">
              <strong>{showName ? r.name || r.email || "Booking" : r.label}</strong>
              {what && <em>{what}</em>}
              <em>{usd(r.totalCents)} total · {usd(r.paidCents)} paid</em>
              <span className="sm-bal-due">
                {r.owedCents > 0 ? <b>{usd(r.owedCents)} due</b> : null}
                {r.owedCents > 0 ? " · " : ""}{r.due}
              </span>
            </div>
            <div className="sm-bal-actions">
              {r.link && <CopyLink text={r.link} />}
              {sms && <a className="achip" href={sms}>Text it</a>}
              {r.owedCents > 0 && !r.link && <span className="sm-bal-nolink">No balance link for this one — send an invoice from Stripe.</span>}
              {profiles[r.email] && <Link className="achip" href={`/portal/admin/clients/${profiles[r.email]}`}>Profile</Link>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
