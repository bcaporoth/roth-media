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
import { confirmTap } from "../lib/confirm-tap";

import { SHOOT_KINDS, SHOOT_KIND_LABEL as KIND_LABEL } from "../lib/studio-labels";
import { projectHex } from "../lib/project-colors";
import ProjectColorDots from "./ProjectColorDots";
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

export default function StudioCalendar({ shoots: given = null, projects: givenProjects = null, onOpen = null, onMoved = null }) {
  const embedded = Boolean(given);
  const [fetched, setShoots] = useState(null);
  // Project colors: a shoot filed under a colored project wears that color.
  const [projects, setProjects] = useState(givenProjects || []);
  useEffect(() => { if (givenProjects) setProjects(givenProjects); }, [givenProjects]);
  const [pickFor, setPickFor] = useState("");
  const [colorBusy, setColorBusy] = useState(false);
  const pById = useMemo(() => Object.fromEntries(projects.map((p) => [p.id, p])), [projects]);
  const tint = (s) => { const hex = projectHex(pById[s.project_id]?.color); return hex ? { background: hex, color: "#fff" } : null; };
  async function setProjectColor(id, color) {
    const before = projects;
    setColorBusy(true); setProjects((ps) => ps.map((p) => (p.id === id ? { ...p, color } : p)));
    try {
      const res = await fetch("/api/admin/shoots", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "project-color", id, color }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Couldn't save the color");
      setPickFor("");
    } catch (e) { setProjects(before); setFreeErr(e.message); }
    setColorBusy(false);
  }
  // Clients' own dates (sales, launches, events) — from /portal/calendar and their intake.
  const [cevents, setCevents] = useState([]);
  useEffect(() => {
    fetch("/api/admin/client-events").then((r) => r.json()).then((j) => setCevents(j.events || [])).catch(() => {});
  }, []);
  const cByDay = useMemo(() => { const m = {}; for (const e of cevents) (m[e.date] ||= []).push(e); return m; }, [cevents]);
  // Free days (lib/free-days.js): the days Brandon marks open. They show green
  // on every client's calendar until something lands on them. "Mark free days"
  // turns the grid into a tap-to-toggle picker.
  const [free, setFree] = useState({ marked: [], taken: {}, times: {}, busy: [] });
  const takeFree = (j) => setFree({ marked: j.marked || [], taken: j.taken || {}, times: j.times || {}, busy: j.busy || [] });
  // The hours for the days you tap next ("" = all day); kept on this device.
  const [win, setWin] = useState({ from: "", to: "" });
  useEffect(() => { try { const w = JSON.parse(localStorage.getItem("rm-free-hours") || "null"); if (w) setWin({ from: w.from || "", to: w.to || "" }); } catch {} }, []);
  const setHours = (w) => { setWin(w); try { localStorage.setItem("rm-free-hours", JSON.stringify(w)); } catch {} };
  const winOk = !(win.from && win.to && win.to <= win.from);
  const hm = (t) => (t ? fmt12(t).replace(":00", "") : "");
  const hours = (w) => (!w ? "" : w.from && w.to ? `${hm(w.from)} to ${hm(w.to)}` : w.from ? `from ${hm(w.from)}` : `until ${hm(w.to)}`);
  const [allBusy, setAllBusy] = useState(false);
  async function applyAll() {
    if (!winOk) return;
    setAllBusy(true); setFreeErr("");
    try {
      const res = await fetch("/api/free-days", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ allTimes: win }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Couldn't save");
      takeFree(j);
      setMoveMsg(win.from || win.to ? `Every free day is now ${hours(win)}.` : "Every free day is now all day."); setTimeout(() => setMoveMsg(""), 5000);
    } catch (e) { setFreeErr(e.message); }
    setAllBusy(false);
  }
  const [marking, setMarking] = useState(false);
  const [freeErr, setFreeErr] = useState("");
  useEffect(() => {
    fetch("/api/free-days").then((r) => r.json()).then((j) => { if (j.ok) takeFree(j); }).catch(() => {});
  }, []);
  // Clear free days in one go: this month's, or all of them (two-tap confirm).
  async function clearFree(which, label) {
    if (!confirmTap(`Take off ${label}? Clients stop seeing them as free.`)) return;
    setAllBusy(true); setFreeErr("");
    try {
      const res = await fetch("/api/free-days", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clear: which }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Couldn't clear");
      takeFree(j); setMoveMsg(`Cleared ${label}.`); setTimeout(() => setMoveMsg(""), 5000);
    } catch (e) { setFreeErr(e.message); }
    setAllBusy(false);
  }
  // Busy times: weekly blocks you are never free (PT clients, training).
  const [busyOpen, setBusyOpen] = useState(false);
  const [busyBusy, setBusyBusy] = useState(false);
  const [draft, setDraft] = useState({ days: [], from: "", to: "", label: "" });
  const DAYS = [[1, "Mon"], [2, "Tue"], [3, "Wed"], [4, "Thu"], [5, "Fri"], [6, "Sat"], [0, "Sun"]];
  const dayNames = (ds) => (ds.length === 7 ? "Every day" : DAYS.filter(([n]) => ds.includes(n)).map(([, l]) => l).join(", "));
  const draftOk = draft.days.length > 0 && draft.from && draft.to && draft.to > draft.from;
  async function saveBusy(list, msg) {
    setBusyBusy(true); setFreeErr("");
    try {
      const res = await fetch("/api/free-days", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ busy: list }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Couldn't save");
      takeFree(j); setMoveMsg(msg); setTimeout(() => setMoveMsg(""), 5000);
      setBusyBusy(false); return true;
    } catch (e) { setFreeErr(e.message); setBusyBusy(false); return false; }
  }
  async function addBusy(e) {
    e.preventDefault();
    if (!draftOk) return;
    const ok = await saveBusy([...free.busy, { id: `b${Date.now()}`, ...draft }], "Busy time added.");
    if (ok) setDraft({ days: [], from: "", to: "", label: "" });
  }
  const busyFor = (k) => { const dow = new Date(`${k}T12:00:00`).getDay(); return free.busy.filter((b) => b.days.includes(dow)).sort((a, b) => a.from.localeCompare(b.from)); };
  const isFree = (k) => free.marked.includes(k);
  // Drag a shoot to another day (2026-11-16). Dropping saves the new date; its
  // shoot day (scripts) moves with it on the server. On a phone there is no
  // dragging — open the shoot and change the date there.
  const [dragId, setDragId] = useState(null);
  const [overDay, setOverDay] = useState("");
  const [moveMsg, setMoveMsg] = useState("");
  // Week and Day views (2026-11-17): an hour grid. Drop a shoot on an hour and
  // it takes that start time (snapped to 15 minutes).
  const [view, setViewRaw] = useState("month");
  const [focus, setFocus] = useState(() => new Date());
  const [overMin, setOverMin] = useState(null);
  const grabY = useRef(0);
  useEffect(() => { try { const v = localStorage.getItem("rm-cal-view"); if (v === "week" || v === "day") setViewRaw(v); } catch {} }, []);
  async function moveShoot(id, to, time) {
    const s = (shoots || []).find((x) => x.id === id);
    setDragId(null); setOverDay(""); setOverMin(null);
    if (!s || !to) return;
    const timed = typeof time === "string" && time !== startOf(s);
    if (s.date === to && !timed) return;
    const from = s.date, fromTime = s.start_time || "";
    const put = (date, start_time) => { const next = { ...s, date, ...(timed ? { start_time } : {}) }; return onMoved ? onMoved(next) : setShoots((xs) => (xs || []).map((x) => (x.id === id ? next : x))); };
    put(to, time); setFreeErr(""); // show it right away
    try {
      const res = await fetch("/api/admin/shoots", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "update", id, date: to, ...(timed ? { start_time: time } : {}) }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Couldn't move it");
      if (onMoved && j.shoot) onMoved(j.shoot);
      const nice = (d) => new Date(`${d}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
      setMoveMsg(`Moved “${s.title}” to ${nice(to)}${timed ? ` at ${fmt12(time)}` : ""}.`); setTimeout(() => setMoveMsg(""), 5000);
      fetch("/api/free-days").then((r) => r.json()).then((f) => { if (f.ok) takeFree(f); }).catch(() => {});
    } catch (e) { put(from, fromTime); setFreeErr(e.message); }
  }
  // Saves go one at a time, in tap order, so quick taps on several days all stick.
  const saving = useRef(Promise.resolve());
  function toggleFree(k) {
    const on = !isFree(k);
    setFreeErr("");
    const w = on && winOk && (win.from || win.to) ? { from: win.from, to: win.to } : null;
    setFree((f) => { const times = { ...f.times }; if (w) times[k] = w; else delete times[k]; return { ...f, times, marked: on ? [...new Set([...f.marked, k])] : f.marked.filter((d) => d !== k) }; }); // show it right away
    saving.current = saving.current.then(async () => {
      try {
        const res = await fetch("/api/free-days", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date: k, on, ...(w || {}) }) });
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
    fetch("/api/admin/shoots").then((r) => r.json()).then((j) => (j.error ? setError(j.error) : (setProjects(j.projects || []), setShoots(j.shoots.filter((s) => s.status !== "cancelled"))))).catch((e) => setError(e.message));
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
  const monthTitle = cursor.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const setView = (v) => {
    if (v !== "month" && view === "month") { const n = new Date(); setFocus(n.getFullYear() === year && n.getMonth() === month ? n : new Date(year, month, 1)); }
    if (v !== "month") setMarking(false);
    setViewRaw(v); try { localStorage.setItem("rm-cal-view", v); } catch {}
  };
  const goTo = (d) => { setFocus(d); setCursor(new Date(d.getFullYear(), d.getMonth(), 1)); };
  const step = (n) => (view === "month" ? setCursor(new Date(year, month + n, 1)) : goTo(new Date(focus.getFullYear(), focus.getMonth(), focus.getDate() + n * (view === "week" ? 7 : 1))));
  const openDay = (d) => { goTo(d); setMarking(false); setViewRaw("day"); try { localStorage.setItem("rm-cal-view", "day"); } catch {} };
  const monday = new Date(focus.getFullYear(), focus.getMonth(), focus.getDate() - ((focus.getDay() + 6) % 7));
  const cols = view === "week" ? Array.from({ length: 7 }, (_, i) => new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i)) : [focus];
  const short = (d, o) => d.toLocaleDateString("en-US", o);
  const title = view === "month" ? monthTitle
    : view === "day" ? short(focus, { weekday: "short", month: "short", day: "numeric", year: "numeric" })
    : `${short(cols[0], { month: "short", day: "numeric" })} – ${short(cols[6], cols[0].getMonth() === cols[6].getMonth() ? { day: "numeric" } : { month: "short", day: "numeric" })}, ${cols[6].getFullYear()}`;
  // The hour grid: 6 AM to 10 PM, stretched if a shoot starts or ends outside that.
  const PX = 48;
  const mins = (t) => { const [h, m] = String(t).split(":").map(Number); return h * 60 + (m || 0); };
  const toHM = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
  const lenOf = (s) => (s.kind === "wedding" ? 600 : s.kind === "business" ? 240 : 90); // no end time is stored: a guess by type
  const shown = view === "month" ? [] : cols.flatMap((d) => (byDay[iso(d)] || []).filter((s) => startOf(s)));
  const H0 = Math.max(0, Math.min(6, ...shown.map((s) => Math.floor(mins(startOf(s)) / 60))));
  const H1 = Math.min(24, Math.max(22, ...shown.map((s) => Math.ceil((mins(startOf(s)) + lenOf(s)) / 60))));
  const top = (m) => ((m - H0 * 60) / 60) * PX;
  const dropMin = (e) => { const r = e.currentTarget.getBoundingClientRect(); const m = H0 * 60 + Math.round((((e.clientY - r.top - grabY.current) / PX) * 60) / 15) * 15; return Math.max(0, Math.min(1425, m)); };
  // Shoots that overlap sit side by side.
  const lanes = (list) => {
    const ends = [], out = list.slice().sort((a, b) => mins(startOf(a)) - mins(startOf(b))).map((s) => { const a = mins(startOf(s)); let i = ends.findIndex((e) => e <= a); if (i < 0) i = ends.length; ends[i] = a + lenOf(s); return { s, lane: i }; });
    return out.map((o) => ({ ...o, of: ends.length }));
  };
  const dragProps = (s) => ({ draggable: !marking, onDragStart: (e) => { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", s.id); grabY.current = view === "month" || !startOf(s) ? 0 : e.clientY - e.currentTarget.getBoundingClientRect().top; setDragId(s.id); }, onDragEnd: () => { setDragId(null); setOverDay(""); setOverMin(null); } });

  const upcoming = (shoots || []).filter((s) => s.date && s.date >= today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 12);
  const undated = (shoots || []).filter((s) => !s.date);
  const clientUpcoming = cevents.filter((e) => e.date >= today).sort((a, b) => Number(b.wants_shoot) - Number(a.wants_shoot) || a.date.localeCompare(b.date)).slice(0, 12);
  const firstName = (n) => String(n || "").split(" ")[0];

  if (error) return <p className="portal-empty">{error}</p>;
  if (!shoots) return <p className="portal-empty">Loading…</p>;

  return (
    <div className="scal">
      <div className="scal-head">
        <button type="button" className="achip" aria-label="Back" onClick={() => step(-1)}>‹</button>
        <h3>{title}</h3>
        <button type="button" className="achip" aria-label="Forward" onClick={() => step(1)}>›</button>
        <button type="button" className="achip" onClick={() => goTo(new Date())}>Today</button>
        <div className="scal-views" role="group" aria-label="Calendar view">
          {[["month", "Month"], ["week", "Week"], ["day", "Day"]].map(([v, l]) => <button key={v} type="button" className={"achip" + (view === v ? " is-on" : "")} aria-pressed={view === v} onClick={() => setView(v)}>{l}</button>)}
        </div>
        <button type="button" className={"achip scal-busybtn" + (busyOpen ? " is-on" : "")} aria-pressed={busyOpen} onClick={() => setBusyOpen(!busyOpen)}>{busyOpen ? "Close busy times" : `Busy times${free.busy.length ? ` (${free.busy.length})` : ""}`}</button>
        <button type="button" className={"achip" + (marking ? " is-on" : "")} aria-pressed={marking} onClick={() => { if (!marking && view !== "month") setView("month"); setMarking(!marking); }}>{marking ? "Done marking" : "Mark free days"}</button>
      </div>
      {marking && (
        <div className="scal-freebox">
          <p className="inbox-hint scal-freehint">Tap a day to mark it free. Tap it again to take it off. Free days show green on every client&rsquo;s calendar, and they can ask for one. A day stops showing as free once a shoot lands on it.</p>
          <div className="scal-hours">
            <strong>Hours you&rsquo;re free</strong>
            <label>From<input type="time" value={win.from} onChange={(e) => setHours({ ...win, from: e.target.value })} /></label>
            <label>To<input type="time" value={win.to} onChange={(e) => setHours({ ...win, to: e.target.value })} /></label>
            {(win.from || win.to) && <button type="button" className="achip" onClick={() => setHours({ from: "", to: "" })}>All day</button>}
            <button type="button" className="achip" disabled={allBusy || !winOk || !free.marked.length} onClick={applyAll}>{allBusy ? "Saving…" : `Use on all ${free.marked.length} free day${free.marked.length === 1 ? "" : "s"}`}</button>
          </div>
          {free.marked.length > 0 && (() => {
            const ym = `${year}-${pad(month + 1)}`, inMonth = free.marked.filter((d) => d.startsWith(`${ym}-`)).length, mName = cursor.toLocaleDateString("en-US", { month: "long" });
            return (
              <div className="scal-clear">
                <strong>Clear</strong>
                <span className="inbox-hint">One day: tap it.</span>
                {inMonth > 0 && <button type="button" className="achip achip-danger" disabled={allBusy} onClick={() => clearFree(ym, `the ${inMonth} free day${inMonth === 1 ? "" : "s"} in ${mName}`)}>Clear {mName} ({inMonth})</button>}
                <button type="button" className="achip achip-danger" disabled={allBusy} onClick={() => clearFree("all", `all ${free.marked.length} free day${free.marked.length === 1 ? "" : "s"}`)}>Clear all ({free.marked.length})</button>
              </div>
            );
          })()}
          <p className="inbox-hint scal-freehint">{!winOk ? "The end time needs to be after the start time." : win.from || win.to ? `Days you tap next are marked free ${hours(win)}. To change one day, take it off and tap it again.` : "No hours set, so days you tap are free all day. Set hours first to mark a time window."}</p>
        </div>
      )}
      {busyOpen && (
        <div className="scal-busybox">
          <p className="inbox-hint scal-freehint">Times you are never free, every week: PT clients, training, anything regular. They show on your calendar on those days. On a free day, clients see these hours as not free. They never see what it is for.</p>
          {free.busy.length > 0 && (
            <ul className="scal-busylist">
              {free.busy.map((b) => (
                <li key={b.id}>
                  <span><strong>{dayNames(b.days)}</strong> · {hm(b.from)} to {hm(b.to)}{b.label ? <em> · {b.label}</em> : null}</span>
                  <button type="button" className="achip achip-danger" disabled={busyBusy} onClick={() => saveBusy(free.busy.filter((x) => x.id !== b.id), "Busy time removed.")}>Remove</button>
                </li>
              ))}
            </ul>
          )}
          <form className="scal-busyadd" onSubmit={addBusy}>
            <div className="scal-busydays" role="group" aria-label="Which days">
              {DAYS.map(([n, l]) => <button key={n} type="button" className={"achip" + (draft.days.includes(n) ? " is-on" : "")} aria-pressed={draft.days.includes(n)} onClick={() => setDraft((d) => ({ ...d, days: d.days.includes(n) ? d.days.filter((x) => x !== n) : [...d.days, n] }))}>{l}</button>)}
            </div>
            <div className="scal-hours">
              <label>From<input type="time" value={draft.from} onChange={(e) => setDraft({ ...draft, from: e.target.value })} /></label>
              <label>To<input type="time" value={draft.to} onChange={(e) => setDraft({ ...draft, to: e.target.value })} /></label>
              <label className="scal-busylabel">What for <input type="text" maxLength={60} placeholder="PT clients (only you see this)" value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} /></label>
              <button type="submit" className="abtn" disabled={busyBusy || !draftOk}>{busyBusy ? "Saving…" : "Add busy time"}</button>
            </div>
            {draft.from && draft.to && draft.to <= draft.from && <p className="inbox-hint scal-freehint">The end time needs to be after the start time.</p>}
          </form>
        </div>
      )}
      {freeErr && <p className="cform-error">{freeErr}</p>}
      {moveMsg && <p className="clients-flash" role="status">{moveMsg}</p>}
      {view !== "month" && (
        <>
          <p className="inbox-hint scal-freehint scal-tg-hint">Drag a shoot up or down to change its start time, or across to another day. It snaps to 15 minutes. How long a block looks is a guess by shoot type. On a phone, open the shoot to change its time.</p>
          <div className="scal-tg-wrap">
            <div className={"scal-tg is-" + view} style={{ gridTemplateColumns: `3.2rem repeat(${cols.length}, minmax(${view === "week" ? "5.6rem" : "0"}, 1fr))` }}>
              <div className="scal-tg-corner" />
              {cols.map((d) => { const k = iso(d); return (
                <button key={k} type="button" className={"scal-tg-day" + (k === today ? " is-today" : "")} onClick={() => openDay(d)} title="Open this day">
                  <span>{short(d, { weekday: "short" })}</span> <strong>{d.getDate()}</strong>
                </button>
              ); })}
              <div className="scal-tg-corner scal-tg-alllabel">Any time</div>
              {cols.map((d) => { const k = iso(d), fr = isFree(k), tk = fr && Boolean(free.taken[k]); return (
                <div key={k} className={"scal-tg-all" + (dragId && overDay === k && overMin == null ? " is-drop" : "")}
                  onDragOver={(e) => { if (dragId) { e.preventDefault(); e.dataTransfer.dropEffect = "move"; if (overDay !== k) setOverDay(k); if (overMin != null) setOverMin(null); } }}
                  onDrop={(e) => { if (dragId) { e.preventDefault(); moveShoot(dragId, k); } }}>
                  {fr && <span className="scal-free">{tk ? "Free · taken" : free.times[k] ? `✓ ${hours(free.times[k])}` : "✓ Free"}</span>}
                  {(byDay[k] || []).filter((s) => !startOf(s)).map((s) => <Link key={s.id} href={shootHref(s)} onClick={go(s)} className={`scal-ev is-${s.kind}${dragId === s.id ? " is-dragging" : ""}`} style={tint(s) || undefined} title={`${s.title} — no time yet. Drag it onto an hour.`} {...dragProps(s)}>{s.title}</Link>)}
                  {(cByDay[k] || []).map((e) => <Link key={e.id} href={`/portal/admin/clients/${e.client_id}#calendar`} className={"scal-ev is-client" + (e.wants_shoot ? " is-hot" : "")} title={`${e.clientName}: ${e.title}`}>{e.wants_shoot ? "🔥 " : ""}{firstName(e.clientName)}: {e.title}</Link>)}
                </div>
              ); })}
              <div className="scal-tg-gutter" style={{ height: (H1 - H0) * PX }}>
                {Array.from({ length: H1 - H0 }, (_, i) => <span key={i} style={{ top: i * PX }}>{hm(`${pad(H0 + i)}:00`)}</span>)}
              </div>
              {cols.map((d) => { const k = iso(d), fr = isFree(k) && !free.taken[k], w = free.times[k]; return (
                <div key={k} className={"scal-tg-col" + (k === today ? " is-today" : "")} style={{ height: (H1 - H0) * PX, backgroundSize: `100% ${PX}px` }}
                  onDragOver={(e) => { if (dragId) { e.preventDefault(); e.dataTransfer.dropEffect = "move"; const m = dropMin(e); if (overDay !== k) setOverDay(k); if (overMin !== m) setOverMin(m); } }}
                  onDrop={(e) => { if (dragId) { e.preventDefault(); moveShoot(dragId, k, toHM(dropMin(e))); } }}>
                  {fr && (() => { const a = Math.max(H0 * 60, w && w.from ? mins(w.from) : 0), b = Math.min(H1 * 60, w && w.to ? mins(w.to) : 1440); return b > a ? <div className="scal-tg-free" style={{ top: top(a), height: top(b) - top(a) }} /> : null; })()}
                  {busyFor(k).map((b) => { const a = Math.max(H0 * 60, mins(b.from)), z = Math.min(H1 * 60, mins(b.to)); return z > a ? <div key={b.id} className="scal-tg-busy" style={{ top: top(a), height: top(z) - top(a) }} title={`Busy ${hm(b.from)} to ${hm(b.to)}${b.label ? ` (${b.label})` : ""}`}><span>✕ {b.label || "Busy"} · {hm(b.from)}–{hm(b.to)}</span></div> : null; })}
                  {lanes((byDay[k] || []).filter((s) => startOf(s))).map(({ s, lane, of }) => (
                    <Link key={s.id} href={shootHref(s)} onClick={go(s)} className={`scal-ev scal-tg-ev is-${s.kind}${dragId === s.id ? " is-dragging" : ""}`} style={{ ...(tint(s) || {}), top: top(mins(startOf(s))), height: Math.max(22, (lenOf(s) / 60) * PX - 2), left: `calc(${(lane / of) * 100}% + 2px)`, width: `calc(${100 / of}% - 4px)` }} title={`${s.title} — drag to move it`} {...dragProps(s)}>
                      <strong>{hm(startOf(s))}</strong> {s.title}{s.client_name ? <em> · {s.client_name}</em> : null}
                    </Link>
                  ))}
                  {dragId && overDay === k && overMin != null && <div className="scal-tg-drop" style={{ top: top(overMin) }}><span>{fmt12(toHM(overMin))}</span></div>}
                </div>
              ); })}
            </div>
          </div>
        </>
      )}
      {view === "month" && <div className={"scal-grid" + (marking ? " is-marking" : "")} role="grid">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className="scal-dow">{d}</div>)}
        {cells.map((d, i) => {
          if (!d) return <div key={i} className="scal-cell is-blank" />;
          const k = iso(d), list = byDay[k] || [];
          const fr = isFree(k), tk = fr && Boolean(free.taken[k]), can = marking && k >= today;
          return (
            <div key={i} className={"scal-cell" + (k === today ? " is-today" : "") + (list.length ? " has-shoot" : "") + (fr ? (tk ? " is-free is-free-taken" : " is-free") : "") + (can ? " can-mark" : "") + (dragId && overDay === k ? " is-drop" : "")}
              onDragOver={(e) => { if (dragId) { e.preventDefault(); e.dataTransfer.dropEffect = "move"; if (overDay !== k) setOverDay(k); } }}
              onDrop={(e) => { if (dragId) { e.preventDefault(); moveShoot(dragId, k); } }}
              {...(can ? { role: "button", tabIndex: 0, "aria-pressed": fr, "aria-label": `${d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}: ${fr ? "free, tap to take off" : "tap to mark free"}`, onClick: (e) => { if (!e.target.closest("a")) toggleFree(k); }, onKeyDown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleFree(k); } } } : {})}>
              {marking ? <span className="scal-num">{d.getDate()}</span> : <button type="button" className="scal-num scal-numbtn" title="Open this day by the hour" onClick={() => openDay(d)}>{d.getDate()}</button>}
              {fr && <span className="scal-free" title={tk ? `Marked free, but taken: ${free.taken[k].join(", ")}` : "Free: clients can ask for this day"}>{tk ? "Free · taken" : free.times[k] ? `✓ ${hours(free.times[k])}` : "✓ Free"}</span>}
              {busyFor(k).map((b) => <span key={b.id} className="scal-busy" title={`Busy ${hm(b.from)} to ${hm(b.to)}${b.label ? ` (${b.label})` : ""}`}>✕ {hm(b.from)}–{hm(b.to)}{b.label ? <em className="scal-busywhat"> {b.label}</em> : null}</span>)}
              {list.map((s) => <Link key={s.id} href={shootHref(s)} onClick={go(s)} className={`scal-ev is-${s.kind}${dragId === s.id ? " is-dragging" : ""}`} style={tint(s) || undefined} title={marking ? s.title : `${s.title}${pById[s.project_id] ? ` · ${pById[s.project_id].title}` : ""} — drag to another day to move it`} {...dragProps(s)}>{startOf(s) ? fmt12(startOf(s)).replace(":00", "") + " " : ""}{s.title}</Link>)}
              {(cByDay[k] || []).map((e) => <Link key={e.id} href={`/portal/admin/clients/${e.client_id}#calendar`} className={"scal-ev is-client" + (e.idea ? " has-idea" : "") + (e.wants_shoot ? " is-hot" : "")} title={`${e.clientName}: ${e.title}${e.wants_shoot ? " · wants content" : ""}${e.idea ? " · idea ready" : ""}`}>{e.wants_shoot ? "🔥 " : ""}{firstName(e.clientName)}: {e.title}</Link>)}
            </div>
          );
        })}
      </div>}

      <div className="scal-legend" aria-label="What the colors mean">
        <strong>Key</strong>
        {SHOOT_KINDS.filter((k) => (shoots || []).some((s) => s.kind === k)).map((k) => <span key={k} className="scal-key"><i className={`scal-ev is-${k}`} />{KIND_LABEL[k]}</span>)}
        {cevents.length > 0 && <span className="scal-key"><i className="scal-ev is-client" />Client&rsquo;s own date</span>}
        <span className="scal-key"><i className="scal-keyfree" />Free day</span>
        <span className="scal-key"><i className="scal-keybusy" />Busy time</span>
        {projects.length > 0 && <span className="scal-keysep">Projects</span>}
        {projects.map((p) => (
          <span key={p.id} className="scal-key scal-keyproj">
            <button type="button" className={"achip" + (pickFor === p.id ? " is-on" : "")} aria-expanded={pickFor === p.id} onClick={() => setPickFor(pickFor === p.id ? "" : p.id)} title="Pick this project's color">
              <i className="scal-keydot" style={projectHex(p.color) ? { background: projectHex(p.color) } : undefined} />{p.title}{p.color ? "" : " · no color"}
            </button>
            {pickFor === p.id && <ProjectColorDots value={p.color || ""} busy={colorBusy} name={p.title} onPick={(c) => setProjectColor(p.id, c)} />}
          </span>
        ))}
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
