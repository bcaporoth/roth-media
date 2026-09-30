"use client";

// Studio → Calendar. Google's embed can't sign you in inside an iframe (Google
// blocks it), so the calendar is built from your Shoots instead: a month
// grid + agenda, with one-click "Add to Google Calendar" per shoot so your
// phone calendar stays in sync.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { sunsetLocal, resolveTimeNote, fmt12, shiftTime } from "../lib/sun";
import { HOME } from "../lib/geo";

const KIND_LABEL = { wedding: "Wedding", family: "Family", business: "Business", event: "Event", other: "Shoot" };
const pad = (n) => String(n).padStart(2, "0");
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function startOf(s) {
  const sunset = s.date ? sunsetLocal(s.lat || HOME.lat, s.lng || HOME.lng, s.date) : null;
  return s.start_time || resolveTimeNote(s.time_note, sunset) || "";
}

// calendar.google.com template link — opens prefilled, one tap to save.
function gcalUrl(s) {
  const start = startOf(s) || "09:00";
  const [h, m] = start.split(":").map(Number);
  const [y, mo, d] = s.date.split("-").map(Number);
  const a = new Date(Date.UTC(y, mo - 1, d, h, m));
  // Dates given as floating local time with ctz so Google places them in Eastern.
  const fmt = (dt) => `${dt.getUTCFullYear()}${pad(dt.getUTCMonth() + 1)}${pad(dt.getUTCDate())}T${pad(dt.getUTCHours())}${pad(dt.getUTCMinutes())}00`;
  const b = new Date(a.getTime() + (s.kind === "wedding" ? 10 : s.kind === "business" ? 4 : 1.5) * 3600000);
  const details = [s.client_name && `Client: ${s.client_name}${s.client_phone ? ` · ${s.client_phone}` : ""}`, s.miles != null && `${s.miles} mi / ~${s.drive_min} min from home`, s.time_note && `Timing: ${s.time_note}`, s.notes].filter(Boolean).join("\n");
  const q = new URLSearchParams({ action: "TEMPLATE", text: s.title, dates: `${fmt(a)}/${fmt(b)}`, details, location: s.address || "", ctz: "America/New_York" });
  return `https://calendar.google.com/calendar/render?${q}`;
}

export default function StudioCalendar() {
  const [shoots, setShoots] = useState(null);
  const [error, setError] = useState("");
  const [cursor, setCursor] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });

  useEffect(() => {
    fetch("/api/admin/shoots").then((r) => r.json()).then((j) => (j.error ? setError(j.error) : setShoots(j.shoots.filter((s) => s.status !== "cancelled")))).catch((e) => setError(e.message));
  }, []);

  const byDay = useMemo(() => {
    const m = {};
    for (const s of shoots || []) if (s.date) (m[s.date] ||= []).push(s);
    return m;
  }, [shoots]);

  const today = iso(new Date());
  const year = cursor.getFullYear(), month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7; // Monday first
  const days = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7) cells.push(null);
  const title = cursor.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const upcoming = (shoots || []).filter((s) => s.date && s.date >= today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 12);
  const undated = (shoots || []).filter((s) => !s.date);

  if (error) return <p className="portal-empty">{error}</p>;
  if (!shoots) return <p className="portal-empty">Loading…</p>;

  return (
    <div className="scal">
      <div className="scal-head">
        <button type="button" className="achip" onClick={() => setCursor(new Date(year, month - 1, 1))}>‹</button>
        <h3>{title}</h3>
        <button type="button" className="achip" onClick={() => setCursor(new Date(year, month + 1, 1))}>›</button>
        <button type="button" className="achip" onClick={() => { const d = new Date(); setCursor(new Date(d.getFullYear(), d.getMonth(), 1)); }}>Today</button>
      </div>
      <div className="scal-grid" role="grid">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className="scal-dow">{d}</div>)}
        {cells.map((d, i) => {
          if (!d) return <div key={i} className="scal-cell is-blank" />;
          const k = iso(d), list = byDay[k] || [];
          return (
            <div key={i} className={"scal-cell" + (k === today ? " is-today" : "") + (list.length ? " has-shoot" : "")}>
              <span className="scal-num">{d.getDate()}</span>
              {list.map((s) => <Link key={s.id} href="/portal/admin/shoots" className={`scal-ev is-${s.kind}`} title={s.title}>{startOf(s) ? fmt12(startOf(s)).replace(":00", "") + " " : ""}{s.title}</Link>)}
            </div>
          );
        })}
      </div>

      <div className="sgrid">
        <section className="spanel">
          <h3>Coming up</h3>
          {upcoming.length === 0 ? <p className="inbox-hint">Nothing scheduled. Add shoots under the Shoots tab.</p> : (
            <ul className="scal-agenda">
              {upcoming.map((s) => {
                const st = startOf(s);
                return (
                  <li key={s.id}>
                    <time>{new Date(`${s.date}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</time>
                    <span>
                      <strong>{s.title}</strong>
                      <em>{st ? fmt12(st) : s.time_note || "time TBD"}{s.drive_min ? ` · leave ${fmt12(shiftTime(st || "09:00", -(s.drive_min + 20)))} · ${s.miles} mi` : ""}{s.address ? ` · ${s.address}` : ""}</em>
                    </span>
                    <a className="achip" href={gcalUrl(s)} target="_blank" rel="noreferrer">+ Google Cal</a>
                  </li>
                );
              })}
            </ul>
          )}
          {undated.length > 0 && <p className="inbox-hint">{undated.length} shoot{undated.length > 1 ? "s" : ""} without a date yet: {undated.map((s) => s.title).join(", ")}.</p>}
        </section>
        <section className="spanel">
          <h3>Google &amp; Calendly</h3>
          <p className="inbox-hint">Google won&apos;t let you sign in inside an embedded calendar, so this page reads from your Shoots. Tap <strong>+ Google Cal</strong> on any shoot to drop it into your phone&apos;s calendar with the address, client, and drive time filled in.</p>
          <div className="gcard-actions">
            <a className="achip" href="https://calendar.google.com/calendar/r" target="_blank" rel="noreferrer">Open Google Calendar ↗</a>
            <a className="achip" href="https://calendly.com/app/scheduled_events/user/me" target="_blank" rel="noreferrer">Calendly bookings ↗</a>
            <Link className="achip" href="/portal/admin/shoots">Manage shoots →</Link>
          </div>
        </section>
      </div>
    </div>
  );
}
