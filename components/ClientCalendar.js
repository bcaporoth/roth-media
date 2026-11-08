"use client";

// One small calendar, two seats. mode="client": the client adds their own
// moments (a sale, a launch, a class, a holiday menu) so Brandon can plan
// content around them. mode="studio": Brandon sees that calendar on their
// profile, adds to it, and taps "Follow up on this" — which opens Google
// Calendar prefilled (one tap to save) and marks the event as followed up.
// Shoot days (2026-11-08): `days` = their dated shoot days. They show on the
// grid as 🎬 chips; picking that date shows "Open the scripts →", and any date
// has "Start a shoot day here" — creates the day and opens its scripts page.
// So a filming/photo day and its scripts are 1–2 taps from the calendar, for
// Brandon (Studio) and the client (portal) alike.

import { useEffect, useMemo, useState } from "react";
import { expandEvents } from "../lib/event-repeat";

const pad = (n) => String(n).padStart(2, "0");
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const fmt12 = (t) => { if (!t) return ""; const [h, m] = t.split(":").map(Number); return `${((h + 11) % 12) + 1}:${pad(m)} ${h < 12 ? "AM" : "PM"}`; };
const longDay = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }); };

// Google Calendar template link for the follow-up: a 15-min block at 9 AM
// Eastern on the chosen day (or the event's own time).
export function followupUrl({ clientName, clientPhone, clientId, date, ev }) {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = (ev?.time || "09:00").split(":").map(Number);
  const a = new Date(Date.UTC(y, mo - 1, d, h, mi));
  const b = new Date(a.getTime() + 15 * 60000);
  const f = (dt) => `${dt.getUTCFullYear()}${pad(dt.getUTCMonth() + 1)}${pad(dt.getUTCDate())}T${pad(dt.getUTCHours())}${pad(dt.getUTCMinutes())}00`;
  const text = ev ? `Follow up: ${clientName} — ${ev.title}` : `Follow up with ${clientName}`;
  const details = [ev?.title && `Their event: ${ev.title}${ev.time ? ` at ${fmt12(ev.time)}` : ""}`, ev?.note, clientPhone && `Phone: ${clientPhone}`, clientId && `Profile: https://rothmediaco.com/portal/admin/clients/${clientId}`].filter(Boolean).join("\n");
  const q = new URLSearchParams({ action: "TEMPLATE", text, dates: `${f(a)}/${f(b)}`, details, ctz: "America/New_York" });
  return `https://calendar.google.com/calendar/render?${q}`;
}

async function api(payload) {
  const res = await fetch("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error || `Request failed (${res.status})`);
  return j;
}

// Studio only: the content idea for that date — a reel, a script line, a shot
// list. Saved on the event, so the plan is there before the shoot.
function IdeaBox({ ev, clientId, onSaved }) {
  const [open, setOpen] = useState(Boolean(ev.idea));
  const [val, setVal] = useState(ev.idea || "");
  const [saving, setSaving] = useState(false);
  if (!open) return <button type="button" className="achip" onClick={() => setOpen(true)}>+ Content idea</button>;
  async function save() {
    setSaving(true);
    try { const j = await api({ op: "idea", client_id: clientId, id: ev.base_id || ev.id, idea: val }); onSaved({ ...ev, idea: j.event.idea }); } catch {}
    setSaving(false);
  }
  return (
    <div className="ccal-idea">
      <textarea value={val} onChange={(e) => setVal(e.target.value)} placeholder="Reel: doors-open rush at 7 AM · photo: the sign · script line: 'one day only'" />
      <button type="button" className="achip" onClick={save} disabled={saving || val === (ev.idea || "")}>{saving ? "Saving…" : val === (ev.idea || "") ? "Saved" : "Save idea"}</button>
    </div>
  );
}

export default function ClientCalendar({ mode = "client", clientId = "", clientName = "", clientPhone = "", initialEvents = null, days = null, defaultLocation = "" }) {
  const studio = mode === "studio";
  const dayHref = (id) => (studio ? `/portal/admin/clients/${clientId}/days/${id}` : `/portal/days/${id}`);
  const [starting, setStarting] = useState(false);
  const shootByDay = useMemo(() => { const m = {}; for (const d of days || []) if (d.date) (m[d.date] ||= []).push(d); return m; }, [days]);
  async function startDay() {
    setStarting(true); setErr("");
    try {
      const res = await fetch("/api/days", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "day-create", clientId, title: "Shoot day", date: day, location: defaultLocation }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Couldn't start the day");
      window.location.href = dayHref(j.id);
    } catch (x) { setStarting(false); setErr(x.message); }
  }
  const [events, setEvents] = useState(initialEvents || []);
  const [loadErr, setLoadErr] = useState("");
  const [cursor, setCursor] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [day, setDay] = useState(() => ymd(new Date()));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const today = ymd(new Date());

  useEffect(() => {
    if (initialEvents) return;
    fetch(`/api/events${studio && clientId ? `?client_id=${clientId}` : ""}`).then(async (r) => { const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || "Couldn't load"); setEvents(j.events || []); }).catch((e) => setLoadErr(e.message));
  }, [initialEvents, studio, clientId]);

  const byDay = useMemo(() => { const m = {}; for (const e of events) (m[e.date] ||= []).push(e); return m; }, [events]);
  const cells = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const days = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const out = Array.from({ length: first.getDay() }, () => null);
    for (let d = 1; d <= days; d++) out.push(ymd(new Date(cursor.getFullYear(), cursor.getMonth(), d)));
    return out;
  }, [cursor]);
  const upcoming = useMemo(() => events.filter((e) => e.date >= today).slice(0, 8), [events, today]);

  async function add(e) {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.currentTarget).entries());
    setBusy(true); setErr("");
    try {
      const j = await api({ op: "add", client_id: clientId, date: day, title: d.title, time: d.time, note: d.note, repeat: d.repeat || "", wants: Boolean(d.wants) });
      setEvents((xs) => [...xs, ...expandEvents([j.event])].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)));
      e.target.reset();
    } catch (x) { setErr(x.message); } finally { setBusy(false); }
  }
  async function remove(ev) {
    if (!confirm(`Remove "${ev.title}"?`)) return;
    const base = ev.base_id || ev.id;
    try { await api({ op: "delete", client_id: clientId, id: base }); setEvents((xs) => xs.filter((x) => (x.base_id || x.id) !== base)); } catch (x) { setErr(x.message); }
  }
  async function wants(ev, on) {
    const base = ev.base_id || ev.id;
    try { await api({ op: "wants", client_id: clientId, id: base, wants: on }); setEvents((xs) => xs.map((x) => ((x.base_id || x.id) === base ? { ...x, wants_shoot: on } : x))); } catch (x) { setErr(x.message); }
  }
  async function followup(ev) {
    window.open(followupUrl({ clientName, clientPhone, clientId, date: ev ? ev.date : day, ev }), "_blank", "noopener");
    if (!ev) return;
    try { const j = await api({ op: "followup", client_id: clientId, id: ev.base_id || ev.id }); setEvents((xs) => xs.map((x) => ((x.base_id || x.id) === (ev.base_id || ev.id) ? { ...x, followup_at: j.event.followup_at } : x))); } catch (x) { setErr(x.message); }
  }

  const monthLabel = cursor.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const dayEvents = byDay[day] || [];

  return (
    <div className={`ccal ${studio ? "ccal--studio" : ""}`}>
      {loadErr && <p className="cform-error">{loadErr}</p>}
      <div className="scal-head">
        <button type="button" className="achip" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} aria-label="Previous month">‹</button>
        <h3>{monthLabel}</h3>
        <button type="button" className="achip" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} aria-label="Next month">›</button>
        <button type="button" className="achip" onClick={() => { const d = new Date(); setCursor(new Date(d.getFullYear(), d.getMonth(), 1)); setDay(today); }}>Today</button>
      </div>
      <div className="scal-grid ccal-grid" role="grid" aria-label={`${monthLabel} calendar`}>
        {DOW.map((d) => <div key={d} className="scal-dow">{d}</div>)}
        {cells.map((c, i) => c ? (
          <button type="button" key={c} className={`scal-cell ccal-cell${c === today ? " is-today" : ""}${c === day ? " is-picked" : ""}`} onClick={() => setDay(c)} aria-pressed={c === day} aria-label={longDay(c)}>
            <span className="scal-num">{Number(c.slice(-2))}</span>
            {(shootByDay[c] || []).map((d) => <span key={d.id} className="scal-ev is-shootday">🎬 {d.title}</span>)}
            {(byDay[c] || []).slice(0, 3).map((e) => <span key={e.id} className={`scal-ev ${e.created_by === "studio" ? "is-business" : "is-event"}${e.followup_at ? " is-followed" : ""}`}>{e.time ? `${fmt12(e.time).replace(":00", "")} ` : ""}{e.title}</span>)}
            {(byDay[c] || []).length > 3 && <span className="scal-num">+{byDay[c].length - 3} more</span>}
          </button>
        ) : <div key={`b${i}`} className="scal-cell is-blank" />)}
      </div>

      <div className="ccal-day">
        <h4>{longDay(day)}</h4>
        {days !== null && (
          <div className="ccal-shoot">
            {(shootByDay[day] || []).map((d) => (
              <a key={d.id} className="ccal-shoot-row" href={dayHref(d.id)}>
                <span><strong>🎬 {d.title}</strong><em>{d.scripts ? `${d.scripts} script${d.scripts === 1 ? "" : "s"}${d.ready ? ` · ${d.ready} ready` : ""}` : "No scripts yet"}</em></span>
                <span className="abtn">Open the scripts →</span>
              </a>
            ))}
            <button type="button" className={(shootByDay[day] || []).length ? "achip" : "abtn ccal-start"} onClick={startDay} disabled={starting}>
              {starting ? "Starting…" : `🎬 Start a shoot day on ${longDay(day).split(",").slice(0, 2).join(",")}`}
            </button>
            {!(shootByDay[day] || []).length && <p className="inbox-hint ccal-start-hint">{studio ? "Opens the scripts page for that day. You and they write it together." : "Opens the scripts page for that day. You and Brandon write it together, and he gets a heads-up."}</p>}
          </div>
        )}
        {dayEvents.length === 0 ? <p className="inbox-hint">{studio ? "Nothing on their calendar this day." : "Nothing here yet — add what's happening below."}</p> : (
          <ul className="ccal-list">
            {dayEvents.map((e) => (
              <li key={e.id}>
                <div>
                  <strong>{e.wants_shoot ? "🔥 " : ""}{e.title}</strong>{e.time ? <span className="ccal-time"> · {fmt12(e.time)}</span> : null}{e.repeat ? <span className="ccal-time"> · every {e.repeat === "weekly" ? "week" : "month"}</span> : null}
                  {e.note ? <em>{e.note}</em> : null}
                  <small>{e.source === "intake" ? "From their intake" : e.created_by === "studio" ? (studio ? "You added this" : "Added by Brandon") : (studio ? `${clientName.split(" ")[0] || "They"} added this` : "You added this")}{e.followup_at ? ` · follow-up on ${studio ? "your" : "Brandon's"} calendar ✓` : ""}</small>
                  {studio && <IdeaBox ev={e} clientId={clientId} onSaved={(ev) => setEvents((xs) => xs.map((x) => ((x.base_id || x.id) === (ev.base_id || ev.id) ? { ...x, idea: ev.idea } : x)))} />}
                  {!studio && e.idea && <p className="ccal-idea-view"><strong>Brandon&rsquo;s idea:</strong> {e.idea}</p>}
                </div>
                <span className="ccal-acts">
                  {!studio && <button type="button" className={"achip" + (e.wants_shoot ? " is-on" : "")} onClick={() => wants(e, !e.wants_shoot)}>{e.wants_shoot ? "Content requested ✓" : "I want content for this"}</button>}
                  {studio && e.wants_shoot && <span className="achip is-on">🔥 They want content for this</span>}
                  {studio && <button type="button" className="abtn" onClick={() => followup(e)}>{e.followup_at ? "Follow up again →" : "Follow up on this →"}</button>}
                  {(studio || e.created_by === "client") && <button type="button" className="achip" onClick={() => remove(e)}>Remove</button>}
                </span>
              </li>
            ))}
          </ul>
        )}
        {studio && dayEvents.length === 0 && <p><button type="button" className="abtn abtn-ghost" onClick={() => followup(null)}>Follow up with {clientName.split(" ")[0] || "them"} this day →</button></p>}

        <form className="ccal-add" onSubmit={add}>
          <label className="grow"><span>{studio ? "Add to their calendar" : "What's happening?"}</span><input name="title" required placeholder={studio ? "Content Day · Shoot the new menu" : "Spring sale starts · New class launches · Anniversary week"} /></label>
          <label><span>Time <small>optional</small></span><input name="time" type="time" /></label>
          <label><span>Repeats</span><select name="repeat" defaultValue=""><option value="">Just once</option><option value="weekly">Every week</option><option value="monthly">Every month</option></select></label>
          {!studio && <label className="ccal-check"><input type="checkbox" name="wants" value="1" /> <span>I&rsquo;d like content for this</span></label>}
          <label className="wide"><span>Notes <small>optional</small></span><input name="note" placeholder={studio ? "What we'll film, who's there" : "Anything Brandon should know — what it is, who's involved, what you'd love content for"} /></label>
          <button type="submit" className="abtn" disabled={busy}>{busy ? "Adding…" : `Add to ${longDay(day).split(",")[0]}`}</button>
          {err && <p className="cform-error">{err}</p>}
        </form>
      </div>

      {upcoming.length > 0 && (
        <div className="ccal-upcoming">
          <h4>Coming up</h4>
          <ul className="scal-agenda">
            {upcoming.map((e) => (
              <li key={e.id}>
                <time>{new Date(e.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}{e.time ? ` · ${fmt12(e.time)}` : ""}</time>
                <span><strong>{e.title}</strong>{e.note ? <em>{e.note}</em> : null}</span>
                <span>{studio ? <button type="button" className="achip" onClick={() => { setDay(e.date); setCursor(new Date(Number(e.date.slice(0, 4)), Number(e.date.slice(5, 7)) - 1, 1)); }}>Open</button> : e.followup_at ? <small className="inbox-hint">Brandon&apos;s on it ✓</small> : null}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
