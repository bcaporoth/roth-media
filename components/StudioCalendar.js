"use client";

// Studio → Calendar. Google's embed can't sign you in inside an iframe (Google
// blocks it), so the calendar is built from your Shoots instead: a month
// grid + agenda, with one-click "Add to Google Calendar" per shoot so your
// phone calendar stays in sync.
//
// Also shown inside Studio → Shoots as the "Month" view: there it's handed
// the shoots already loaded (no second fetch) and an onOpen, so tapping an
// event opens that shoot right on the page. On its own page every event
// links to /portal/admin/shoots?open=<id>.

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { timing, fmt12, shiftTime } from "../lib/sun";

import { SHOOT_KIND_LABEL as KIND_LABEL } from "../lib/studio-labels";
const pad = (n) => String(n).padStart(2, "0");
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const startOf = (s) => timing(s).start;
export const shootHref = (s) => `/portal/admin/shoots?open=${s.id}`;

// calendar.google.com template link — opens prefilled, one tap to save.
export function gcalUrl(s) {
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

export default function StudioCalendar({ shoots: given = null, onOpen = null }) {
  const embedded = Boolean(given);
  const [fetched, setShoots] = useState(null);
  // Clients' own dates (sales, launches, events) — from /portal/calendar and their intake.
  const [cevents, setCevents] = useState([]);
  useEffect(() => {
    fetch("/api/admin/client-events").then((r) => r.json()).then((j) => setCevents(j.events || [])).catch(() => {});
  }, []);
  const cByDay = useMemo(() => { const m = {}; for (const e of cevents) (m[e.date] ||= []).push(e); return m; }, [cevents]);
  // Free days (lib/free-days.js): the days Brandon marks open. They show green
  // on every client's calendar until something lands on them. "Mark free days"
  // turns the grid into a tap-to-toggle picker.
  const [free, setFree] = useState({ marked: [], taken: {} });
  const [marking, setMarking] = useState(false);
  const [freeErr, setFreeErr] = useState("");
  useEffect(() => {
    fetch("/api/free-days").then((r) => r.json()).then((j) => { if (j.ok) setFree({ marked: j.marked || [], taken: j.taken || {} }); }).catch(() => {});
  }, []);
  const isFree = (k) => free.marked.includes(k);
  // Saves go one at a time, in tap order, so quick taps on several days all stick.
  const saving = useRef(Promise.resolve());
  function toggleFree(k) {
    const on = !isFree(k);
    setFreeErr("");
    setFree((f) => ({ ...f, marked: on ? [...new Set([...f.marked, k])] : f.marked.filter((d) => d !== k) })); // show it right away
    saving.current = saving.current.then(async () => {
      try {
        const res = await fetch("/api/free-days", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date: k, on }) });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(j.error || "Couldn't save");
        setFree((f) => ({ ...f, taken: j.taken || {} }));
      } catch (e) {
        setFreeErr(e.message);
        setFree((f) => ({ ...f, marked: on ? f.marked.filter((d) => d !== k) : [...new Set([...f.marked, k])] }));
      }
    });
  }
  const shoots = useMemo(() => (given ? given.filter((s) => s.status !== "cancelled") : fetched), [given, fetched]);
  const [error, setError] = useState("");
  const [cursor, setCursor] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });

  useEffect(() => {
    if (embedded) return;
    fetch("/api/admin/shoots").then((r) => r.json()).then((j) => (j.error ? setError(j.error) : setShoots(j.shoots.filter((s) => s.status !== "cancelled")))).catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tapping an event: open the shoot in place when the Shoots page is the
  // host, otherwise follow the link to it.
  const go = (s) => (e) => { if (onOpen) { e.preventDefault(); onOpen(s.id); } };

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
  const clientUpcoming = cevents.filter((e) => e.date >= today).sort((a, b) => Number(b.wants_shoot) - Number(a.wants_shoot) || a.date.localeCompare(b.date)).slice(0, 12);
  const firstName = (n) => String(n || "").split(" ")[0];

  if (error) return <p className="portal-empty">{error}</p>;
  if (!shoots) return <p className="portal-empty">Loading…</p>;

  return (
    <div className="scal">
      <div className="scal-head">
        <button type="button" className="achip" onClick={() => setCursor(new Date(year, month - 1, 1))}>‹</button>
        <h3>{title}</h3>
        <button type="button" className="achip" onClick={() => setCursor(new Date(year, month + 1, 1))}>›</button>
        <button type="button" className="achip" onClick={() => { const d = new Date(); setCursor(new Date(d.getFullYear(), d.getMonth(), 1)); }}>Today</button>
        <button type="button" className={"achip scal-freebtn" + (marking ? " is-on" : "")} aria-pressed={marking} onClick={() => setMarking(!marking)}>{marking ? "Done marking" : "Mark free days"}</button>
      </div>
      {marking && <p className="inbox-hint scal-freehint">Tap a day to mark it free. Tap it again to take it off. Free days show green on every client&rsquo;s calendar, and they can ask for one. A day stops showing as free once a shoot lands on it.</p>}
      {freeErr && <p className="cform-error">{freeErr}</p>}
      <div className={"scal-grid" + (marking ? " is-marking" : "")} role="grid">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className="scal-dow">{d}</div>)}
        {cells.map((d, i) => {
          if (!d) return <div key={i} className="scal-cell is-blank" />;
          const k = iso(d), list = byDay[k] || [];
          const fr = isFree(k), tk = fr && Boolean(free.taken[k]), can = marking && k >= today;
          return (
            <div key={i} className={"scal-cell" + (k === today ? " is-today" : "") + (list.length ? " has-shoot" : "") + (fr ? (tk ? " is-free is-free-taken" : " is-free") : "") + (can ? " can-mark" : "")}
              {...(can ? { role: "button", tabIndex: 0, "aria-pressed": fr, "aria-label": `${d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}: ${fr ? "free, tap to take off" : "tap to mark free"}`, onClick: (e) => { if (!e.target.closest("a")) toggleFree(k); }, onKeyDown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleFree(k); } } } : {})}>
              <span className="scal-num">{d.getDate()}</span>
              {fr && <span className="scal-free" title={tk ? `Marked free, but taken: ${free.taken[k].join(", ")}` : "Free: clients can ask for this day"}>{tk ? "Free · taken" : "✓ Free"}</span>}
              {list.map((s) => <Link key={s.id} href={shootHref(s)} onClick={go(s)} className={`scal-ev is-${s.kind}`} title={s.title}>{startOf(s) ? fmt12(startOf(s)).replace(":00", "") + " " : ""}{s.title}</Link>)}
              {(cByDay[k] || []).map((e) => <Link key={e.id} href={`/portal/admin/clients/${e.client_id}#calendar`} className={"scal-ev is-client" + (e.idea ? " has-idea" : "") + (e.wants_shoot ? " is-hot" : "")} title={`${e.clientName}: ${e.title}${e.wants_shoot ? " · wants content" : ""}${e.idea ? " · idea ready" : ""}`}>{e.wants_shoot ? "🔥 " : ""}{firstName(e.clientName)}: {e.title}</Link>)}
            </div>
          );
        })}
      </div>

      <div className="sgrid">
        <section className="spanel">
          <h3>Coming up</h3>
          {upcoming.length === 0 ? <p className="inbox-hint">{embedded ? "Nothing scheduled. Hit “+ New shoot” above." : "Nothing scheduled. Add shoots under the Shoots tab."}</p> : (
            <ul className="scal-agenda">
              {upcoming.map((s) => {
                const st = startOf(s);
                return (
                  <li key={s.id}>
                    <time>{new Date(`${s.date}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</time>
                    <span>
                      <strong><Link className="scal-open" href={shootHref(s)} onClick={go(s)}>{s.title}</Link></strong>
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
            {clientUpcoming.length > 0 && (
              <div className="scal-clientdates">
                <h3>Clients&rsquo; dates coming up</h3>
                <ul className="alist">
                  {clientUpcoming.map((e) => (
                    <li key={e.id} className="arow">
                      <div><strong>{e.clientName}</strong> — {e.title}<br /><small>{new Date(`${e.date}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}{e.time ? ` · ${e.time}` : ""}{e.repeat ? ` · ${e.repeat}` : ""}{e.source === "intake" ? " · from intake" : ""}{e.wants_shoot ? " · 🔥 wants content" : ""}{e.idea ? " · idea ready" : " · no idea yet"}</small></div>
                      <Link className="achip" href={`/portal/admin/clients/${e.client_id}#calendar`}>Plan it →</Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <a className="achip" href="https://calendly.com/app/scheduled_events/user/me" target="_blank" rel="noreferrer">Calendly bookings ↗</a>
            {!embedded && <Link className="achip" href="/portal/admin/shoots">Manage shoots →</Link>}
          </div>
        </section>
      </div>
    </div>
  );
}
