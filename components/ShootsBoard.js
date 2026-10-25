"use client";

// Studio → Shoots: Brandon's itinerary. Every job with a date, a place, how
// far it is, when the sun sets there, a checklist from the guide for that
// kind of shoot, and notes. New shoots can be spun up from a lead in the
// inbox (address + date pulled from the form).
//
// Prep: every shoot carries five lists — the flow of the day (timed),
// camera settings & reminders, shots to get, poses & prompts, gear to pack — copied in from the Playbook
// library and edited per job (add, remove, tick, pull in another list).
// "Print prep sheet" opens a one-page version to print or save as PDF.
//
// Delivery clock: once a shoot has happened it shows what's owed — the
// sneak peek (48 hours) and the finished work (film six weeks, galleries
// four, business content two — lib/delivery.js) — with one-tap "sent" /
// "delivered". Everything still owed is listed at the top, most urgent first.
//
// One filter row: Upcoming | Owed | Done | Month. Owed is the delivery
// to-do list (the only place with the "Delivered" buttons); Month is the
// grid from the Calendar tab. ?open=<id> opens and scrolls to a shoot.
//
// Day mode: a shoot dated today opens in a stripped-down view for the phone
// — start/sunset, Directions/Text/Call, a sticky roll-gate strip (WB ·
// 120fps · plant feet · tripod angle…), the flow as Now / Next, shots to
// tick, notes to read, and "before you leave" counters. Everything that's
// pre-shoot or admin (gear, delivery, edit, playbook pickers) is hidden.
//
// ClientShoots is the same thing scoped to one person, for their profile.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { timing, fmt12 } from "../lib/sun";
import { mapsUrl, HOME } from "../lib/geo";
import { GROUPS, GROUP_LABEL, groupOf, usesSun, showsGroup, ROLL_GATE, WRAP_DEFAULT } from "../lib/shoot-guides";
import { isNoEmail } from "../lib/no-email";
import { briefToShoot } from "../lib/intake";
import { deliveryState, owedList, promiseFor, todayEastern, addDays, easternDateOf } from "../lib/delivery";
import StudioCalendar, { gcalUrl } from "./StudioCalendar";
import QRCode from "qrcode";

async function api(payload, { keepalive = false } = {}) {
  const res = await fetch("/api/admin/shoots", { method: payload ? "POST" : "GET", headers: { "Content-Type": "application/json" }, body: payload ? JSON.stringify(payload) : undefined, keepalive });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) { const err = new Error(json.error || `Request failed (${res.status})`); err.status = res.status; err.needsMigration = Boolean(json.needsMigration); throw err; }
  return json;
}

import { SHOOT_KIND_LABEL as KIND_LABEL, SHOOT_STATUS_LABEL as STATUS_LABEL } from "../lib/studio-labels";
const fmtDate = (d) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : "No date yet");
const daysOut = (d) => (d ? Math.round((new Date(`${d}T12:00:00`) - new Date()) / 86400000) : null);

const SQL_HINT = "Run supabase/studio-2.sql once (Supabase → SQL editor) to tick deliveries off.";
// Same order the server sends: by date, undated last.
const byDate = (a, b) => (a.date && b.date ? a.date.localeCompare(b.date) : a.date ? -1 : b.date ? 1 : 0);

// Shoots data + the writes, shared by the board and the client profile.
// A write puts the row the server sent back straight into the list — no
// refetch of shoots + leads + galleries + playbook for every change.
function useShoots() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState("");
  const refresh = () => api().then(setData).catch((e) => setError(e.message));
  const say = useCallback((m) => { setFlash(m); setTimeout(() => setFlash(""), 2500); }, []);
  const patch = useCallback((rows) => {
    const list = (Array.isArray(rows) ? rows : [rows]).filter(Boolean);
    if (!list.length) return;
    const map = new Map(list.map((r) => [r.id, r]));
    setData((d) => (d ? { ...d, shoots: d.shoots.map((x) => map.get(x.id) || x).sort(byDate) } : d));
  }, []);

  async function create(fields) {
    setBusy(true); setError("");
    try { const r = await api({ action: "create", ...fields }); await refresh(); setShowNew(false); setOpenId(r.shoot.id); say(r.shoot.lat ? `Added — ${r.shoot.miles} mi from home` : "Added"); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function update(id, fields, msg = "Saved ✓") {
    setBusy(true); setError("");
    try { const r = await api({ action: "update", id, ...fields }); patch(r.shoot); say(msg); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function remove(s) {
    if (!window.confirm(`Delete "${s.title}"?`)) return;
    try { await api({ action: "delete", id: s.id }); setOpenId(null); await refresh(); } catch (e) { setError(e.message); }
  }
  async function relocate(s) {
    setError("");
    try { const r = await api({ action: "relocate", id: s.id }); patch(r.shoot); say("Located"); } catch (e) { alert(e.message); }
  }
  // Delivery clock: stamp (or un-stamp) "sneak peek sent" / "delivered".
  async function deliver(s, which, undo = false) {
    setError("");
    try {
      const r = await api({ action: "deliver", id: s.id, which, undo });
      patch(r.shoot);
      say(undo ? "Put back on the list" : which === "sneak" ? "Sneak peek sent ✓" : "Delivered ✓");
    } catch (e) {
      if (e.needsMigration) setData((d) => (d ? { ...d, delivery: { ready: false } } : d));
      setError(e.needsMigration ? SQL_HINT : e.message);
    }
  }
  async function deliverBulk(ids) {
    setError("");
    try { const r = await api({ action: "deliver_bulk", ids }); patch(r.shoots); say(`Marked ${r.shoots.length} delivered`); }
    catch (e) { setError(e.needsMigration ? SQL_HINT : e.message); }
  }
  const clock = { ready: data?.delivery?.ready === true, deliver };
  return { data, error, openId, setOpenId, showNew, setShowNew, busy, flash, say, patch, refresh, create, update, remove, relocate, deliverBulk, clock };
}

// The prep lists for one shoot, saved without ever losing a tick.
//   · a tick shows instantly (local copy), the save follows
//   · saves go one at a time, and each one sends the newest list — a slow
//     early save can't land after, or overwrite, a later one
//   · a failed save keeps the list and retries (and again when signal's back)
//   · leaving the page with a save waiting sends it on the way out
// status: "" | "saving" | "saved" | "retrying" | "failed"
function useChecklist(s, onSaved) {
  const server = useMemo(() => (s.checklist || []).map((c) => ({ ...c, group: groupOf(c) })), [s.checklist]);
  const [local, setLocal] = useState(null); // null = showing what the server has
  const [status, setStatus] = useState("");
  const r = useRef({ list: server, pending: null, inFlight: false, timer: null, tries: 0, alive: true }).current;
  const items = local || server;
  const savedCb = useRef(onSaved);
  savedCb.current = onSaved;
  if (!r.pending && !r.inFlight) r.list = items;

  const flush = useCallback(async (keepalive = false) => {
    clearTimeout(r.timer); r.timer = null;
    if (r.inFlight || !r.pending) return;
    const list = r.pending;
    r.pending = null; r.inFlight = true;
    if (r.alive) setStatus(r.tries ? "retrying" : "saving");
    try {
      const out = await api({ action: "update", id: s.id, checklist: list }, { keepalive });
      r.inFlight = false; r.tries = 0;
      if (r.pending) return flush(); // ticks landed while this was in the air — send the newest
      if (r.alive) setStatus("saved");
      savedCb.current?.(out.shoot);
    } catch (e) {
      r.inFlight = false; r.tries += 1;
      if (!r.pending) r.pending = list; // nothing newer waiting: this list still has to land
      // The server said no (not a signal problem): stop hammering, offer a retry.
      const refused = e.status >= 400 && e.status < 500 && e.status !== 408 && e.status !== 429;
      if (r.alive) setStatus(refused ? "failed" : "retrying");
      if (!refused) r.timer = setTimeout(() => flush(), Math.min(15000, 1500 * 2 ** (r.tries - 1)));
    }
  }, [r, s.id]);

  // Take the newest list, show it now, save it shortly (so a run of ticks is one save).
  const commit = useCallback((change) => {
    const next = change(r.list);
    if (next === r.list) return;
    r.list = next; r.pending = next;
    setLocal(next); setStatus((st) => (st === "retrying" ? st : "saving"));
    clearTimeout(r.timer);
    r.timer = setTimeout(() => flush(), 450);
  }, [r, flush]);

  // The server's copy changed (our own save came back, or another edit):
  // follow it, unless there are ticks it hasn't seen yet.
  useEffect(() => { if (!r.pending && !r.inFlight) setLocal(null); }, [r, s.checklist]);
  useEffect(() => { if (status !== "saved") return; const t = setTimeout(() => setStatus((st) => (st === "saved" ? "" : st)), 2500); return () => clearTimeout(t); }, [status]);

  useEffect(() => {
    r.alive = true;
    const out = () => { if (r.pending) flush(true); };
    const hidden = () => { if (document.visibilityState === "hidden") out(); };
    const online = () => { if (r.pending) flush(); };
    const leaving = (e) => { if (r.pending || r.inFlight) { out(); e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("pagehide", out);
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("online", online);
    window.addEventListener("beforeunload", leaving);
    return () => {
      r.alive = false;
      window.removeEventListener("pagehide", out);
      document.removeEventListener("visibilitychange", hidden);
      window.removeEventListener("online", online);
      window.removeEventListener("beforeunload", leaving);
      out(); // leaving this screen with a save waiting: send it now
    };
  }, [r, flush]);

  return { items, commit, status, retry: () => { r.tries = 0; flush(); } };
}
// The same item in the newest list (the object itself, or its twin after a re-render).
const indexOfItem = (list, item) => { const i = list.indexOf(item); return i >= 0 ? i : list.findIndex((c) => c.text === item.text && c.group === item.group && (c.time || "") === (item.time || "")); };

export default function ShootsBoard() {
  const sh = useShoots();
  const { data, error, openId, setOpenId, showNew, setShowNew, busy, flash, refresh, create, deliverBulk, clock } = sh;
  const [prefill, setPrefill] = useState(null);
  const [view, setView] = useState("upcoming"); // upcoming | owed | done | month
  const [wanted, setWanted] = useState(null); // { id } a shoot to open + scroll to
  const first = useRef(true);
  useEffect(() => {
    refresh();
    const q = new URLSearchParams(window.location.search);
    // From a link elsewhere: ?new=1&name=&email=&phone=&kind= opens the form filled in.
    if (q.get("new") === "1") {
      setPrefill({ client_name: q.get("name") || "", client_email: q.get("email") || "", client_phone: q.get("phone") || "", kind: q.get("kind") || "" });
      setShowNew(true);
      first.current = false;
      window.history.replaceState(null, "", "/portal/admin/shoots");
    }
    // From the calendar (or anywhere): ?open=<shoot id> opens that shoot and scrolls to it.
    if (/^[0-9a-f-]{36}$/.test(q.get("open") || "")) {
      setWanted({ id: q.get("open") });
      first.current = false;
      window.history.replaceState(null, "", "/portal/admin/shoots");
    } else if (q.get("view") === "month") setView("month");
    else if (q.get("view") === "owed") setView("owed");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shoots = data?.shoots || [];
  const today = todayEastern(); // the Eastern calendar day, not UTC's — tonight's shoot stays "today" all evening
  const isPast = (s) => (s.date && s.date < today) || s.status === "done" || s.status === "cancelled";

  // A shoot dated today opens by itself, in day mode.
  useEffect(() => {
    if (!data || !first.current) return;
    first.current = false;
    const now = data.shoots.find((s) => s.date === today && s.status !== "cancelled" && s.status !== "done");
    if (now) setOpenId(now.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // Open a shoot wherever it sits and bring it into view.
  useEffect(() => {
    if (!wanted || !data) return;
    const s = data.shoots.find((x) => x.id === wanted.id);
    if (!s) { setWanted(null); return; }
    setView(isPast(s) ? "done" : "upcoming");
    setOpenId(s.id);
    const t = setTimeout(() => { document.getElementById(`shoot-${s.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }); setWanted(null); }, 60);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wanted, data]);
  const reveal = (id) => setWanted({ id });

  const rowProps = (s) => ({ s, open: openId === s.id, onToggle: () => setOpenId(openId === s.id ? null : s.id), onUpdate: sh.update, onRemove: sh.remove, onRelocate: sh.relocate, onPatched: sh.patch, onSay: sh.say, clock, busy, galleries: data.galleries, guides: data.guides, playbook: data.playbook });
  const upcoming = shoots.filter((s) => !s.date || s.date >= today).filter((s) => s.status !== "cancelled" && s.status !== "done");
  const past = shoots.filter(isPast).reverse();
  const owed = data ? owedList(shoots, new Date()) : [];
  const overdue = owed.filter((x) => x.d.overdue).length;

  if (!data && !error) return <p className="portal-empty">Loading…</p>;
  if (error && !data) return <p className="portal-empty">{error}</p>;

  const tabs = [["upcoming", "Upcoming", upcoming.length], ["owed", "Owed", owed.length], ["done", "Done", past.length], ["month", "Month", null]];
  return (
    <div className="shoots">
      <div className="atoolbar shoots-bar">
        <button type="button" className="abtn" onClick={() => setShowNew((v) => !v)}>{showNew ? "Close" : "+ New shoot"}</button>
        <span className="pbook-kinds shoots-tabs" role="tablist" aria-label="Which shoots">
          {tabs.map(([k, label, n]) => (
            <button key={k} type="button" role="tab" aria-selected={view === k} className={"ifilter" + (view === k ? " is-on" : "") + (k === "owed" && overdue ? " is-alert" : "")} onClick={() => setView(k)}>
              {label}{n ? ` ${n}` : ""}{k === "owed" && overdue ? " !" : ""}
            </button>
          ))}
        </span>
        {flash && <span className="clients-flash">{flash}</span>}
      </div>
      {error && <p className="cform-error">{error}</p>}

      {showNew && <NewShoot prefill={prefill} leads={data.leads} guides={data.guides} busy={busy} onCreate={create} />}

      {view === "month" && <StudioCalendar shoots={shoots} onOpen={reveal} />}

      {view === "owed" && <OwedPanel shoots={shoots} clock={clock} onOpen={reveal} onBulk={deliverBulk} full />}

      {view === "upcoming" && (
        <>
          {upcoming.length === 0 && !showNew && <p className="portal-empty">Nothing on the books. Hit “+ New shoot” — or start one from a lead.</p>}
          <ul className="shoot-list">
            {upcoming.map((s) => <ShootRow key={s.id} {...rowProps(s)} />)}
          </ul>
        </>
      )}

      {view === "done" && (
        <>
          {past.length === 0 && <p className="portal-empty">Nothing finished yet.</p>}
          <ul className="shoot-list is-past">{past.map((s) => <ShootRow key={s.id} {...rowProps(s)} />)}</ul>
        </>
      )}
    </div>
  );
}

// "Owed": every shoot that's happened and isn't delivered yet, most urgent
// first, with the two one-tap buttons. Before studio-2.sql is run the due
// dates still show (worked out from the shoot date) for the last 60 days of
// shoots, with a note on how to switch the buttons on.
const OWED_SHOWN = 3;
const BACKLOG_DAYS = 30; // "older ones": finished work more than this far past due
function OwedPanel({ shoots, clock, onOpen, onBulk, tucked = false, full = false }) {
  const [all, setAll] = useState(full);
  // On a shoot day the list folds down to its one-line summary, so today's
  // flow is the first thing on the screen. null = follow `tucked`.
  const [folded, setFolded] = useState(null);
  const isFolded = folded ?? tucked;
  const now = new Date();
  let rows = owedList(shoots, now);
  if (!clock.ready) { const cutoff = addDays(todayEastern(now), -60); rows = rows.filter((x) => x.shoot.date && x.shoot.date >= cutoff); }
  if (!rows.length) return full ? <p className="portal-empty">Nothing owed — everything that's happened has gone out.</p> : null;
  const overdue = rows.filter((x) => x.d.overdue).length;
  const old = rows.filter((x) => x.d.final.due && now - x.d.final.due > BACKLOG_DAYS * 86400000);
  const shown = all ? rows : rows.slice(0, OWED_SHOWN);
  function clearOld() {
    if (!window.confirm(`Mark ${old.length} older shoot${old.length > 1 ? "s" : ""} as delivered? (Everything more than ${BACKLOG_DAYS} days past its due date. You can undo any one of them on its shoot.)`)) return;
    onBulk(old.map((x) => x.shoot.id));
  }
  return (
    <section className="owed" aria-label="Owed to clients">
      <div className="owed-head">
        <span className="kick-sm">Owed · {rows.length}</span>
        {overdue > 0 && <span className="dchip is-over">{overdue} overdue</span>}
        {!full && <em>Done, not delivered yet — most urgent first.</em>}
        {!full && (tucked || folded !== null) && <button type="button" className="achip owed-fold" aria-expanded={!isFolded} onClick={() => setFolded(!isFolded)}>{isFolded ? "Show" : "Hide"}</button>}
      </div>
      {isFolded ? null : <>
      {!clock.ready && <p className="owed-hint">These due dates are worked out from each shoot&apos;s date. {SQL_HINT}</p>}
      <ul className="owed-list">
        {shown.map(({ shoot, d }) => (
          <li key={shoot.id} className={d.overdue ? "is-over" : ""}>
            <button type="button" className="owed-title" onClick={() => onOpen(shoot.id)}>
              <strong>{shoot.title}</strong>
              <em>{fmtDate(shoot.date)} · {KIND_LABEL[shoot.kind]}</em>
            </button>
            <DeliveryChips d={d} />
            <DeliveryButtons s={shoot} d={d} clock={clock} />
          </li>
        ))}
      </ul>
      <div className="owed-foot">
        {rows.length > OWED_SHOWN && <button type="button" className="achip" onClick={() => setAll((v) => !v)}>{all ? "Show fewer" : `Show all ${rows.length}`}</button>}
        {clock.ready && old.length > 0 && <button type="button" className="achip" onClick={clearOld}>Mark the {old.length} older one{old.length > 1 ? "s" : ""} delivered</button>}
      </div>
      </>}
    </section>
  );
}

function DeliveryChips({ d, done = true }) {
  const parts = [d.sneak, d.final].filter((x) => x && (x.open || (done && x.deliveredAt)));
  if (!parts.length) return null;
  return (
    <span className="dchips">
      {parts.map((x) => <span key={x.label} className={"dchip" + (x.deliveredAt ? " is-done" : x.overdue ? " is-over" : "")}>{x.text}</span>)}
    </span>
  );
}
function DeliveryButtons({ s, d, clock }) {
  const [going, setGoing] = useState("");
  if (!clock.ready || !d.owed) return null;
  const tap = (which) => async () => { setGoing(which); try { await clock.deliver(s, which); } finally { setGoing(""); } };
  return (
    <span className="dbtns">
      {d.sneak?.open && <button type="button" className="achip dbtn" disabled={Boolean(going)} onClick={tap("sneak")}>{going === "sneak" ? "Saving…" : "Sneak peek sent"}</button>}
      {d.final.open && <button type="button" className="achip achip-primary dbtn" disabled={Boolean(going)} onClick={tap("final")}>{going === "final" ? "Saving…" : "Delivered"}</button>}
    </span>
  );
}

// One client's shoots, planned right on their profile: the same rows and
// the same prep lists as the Shoots tab, filtered to their email. A business
// client's shoot days (the scripts, shared with the owner) live here too —
// a dated day IS a shoot on the calendar, so each row carries its scripts
// button instead of the day being listed a second time further down.
const PLAN_LABEL = { wedding: "Plan the wedding day", business: "Plan a Content Day", family: "Plan a session", documentary: "Plan a shoot day" };
export function ClientShoots({ client, type = "wedding", brief = null, days = [], onFail }) {
  const pulled = useMemo(() => briefToShoot(brief), [brief]);
  const sh = useShoots();
  const { data, error, openId, setOpenId, showNew, setShowNew, busy, flash, refresh, create, clock } = sh;
  const [newDay, setNewDay] = useState(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { refresh(); }, []);
  const email = (client.email || "").toLowerCase();
  const mine = (data?.shoots || []).filter((s) => (s.client_email || "").toLowerCase() === email);
  const sorted = [...mine].sort((a, b) => (a.status === "done" || a.status === "cancelled") - (b.status === "done" || b.status === "cancelled"));
  const dayHref = (dd) => `/portal/admin/clients/${client.id}/days/${dd.id}`;
  const dayList = days || [];
  const dayByShoot = Object.fromEntries(dayList.filter((dd) => dd.shoot_id).map((dd) => [dd.shoot_id, { ...dd, href: dayHref(dd) }]));
  // Days with no calendar entry yet (undated, or made before days and shoots were linked).
  const loose = dayList.filter((dd) => !dd.shoot_id || !mine.some((s) => s.id === dd.shoot_id));
  const isBiz = type === "business";
  const toggleNew = () => { if (isBiz) { setNewDay((v) => !v); setShowNew(false); } else { setShowNew((v) => !v); setNewDay(false); } };
  const anyOpen = showNew || newDay;

  return (
    <section className="cprof-card cprof-shoots">
      <div className="cprof-cardhead"><h2>Shoots{mine.length + loose.length > 0 && <em className="cprof-count">{mine.length + loose.length}</em>}</h2>
        <span className="gcard-actions">
          {isBiz && !anyOpen && data && <button type="button" className="achip" onClick={() => { setShowNew(true); setNewDay(false); }}>+ Shoot only (no scripts)</button>}
          <button type="button" className="abtn" onClick={toggleNew} disabled={!data}>{anyOpen ? "Close" : `+ ${PLAN_LABEL[type] || "Plan a shoot"}`}</button>
        </span>
      </div>
      {flash && <p className="clients-flash">{flash}</p>}
      {error && <p className="cform-error">{error}</p>}
      {days === null && <p className="sm-sqlhint">Shoot days (the scripts) aren&apos;t set up yet — run <code>supabase/shoot-days.sql</code> once in the Supabase SQL editor.</p>}
      {!data && !error && <p className="gcard-meta">Loading…</p>}
      {newDay && <NewDay client={client} onFail={onFail} />}
      {data && showNew && <NewShoot key={type} compact prefill={{ client_name: client.name, client_email: client.email, client_phone: client.phone, kind: type, address: pulled.address, notes: pulled.notes, brief_shots: pulled.shots }} leads={data.leads.filter((l) => (l.email || "").toLowerCase() === email)} guides={data.guides} busy={busy} onCreate={create} />}
      {data && mine.length === 0 && loose.length === 0 && !anyOpen && (
        <p className="gcard-meta">{isBiz
          ? `Nothing planned yet. A Content Day is the scripts for a day of filming — reels, recipes, how-tos — written with ${client.name.split(" ")[0] || "them"}: they see and edit the same page from their portal. Give it a date and it lands on the calendar with your Content Day prep lists.`
          : `Nothing planned yet. Start one and the flow of the day, settings & reminders, shot list, poses and gear from your playbook come with it${brief ? ", with their brief pulled in — the one shot they can't miss leads the shot list" : ""}. All editable for this client.`}</p>
      )}
      {data && mine.length > 0 && (
        <ul className="shoot-list">
          {sorted.map((s) => <ShootRow key={s.id} s={s} day={dayByShoot[s.id]} open={openId === s.id} onToggle={() => setOpenId(openId === s.id ? null : s.id)} onUpdate={sh.update} onRemove={sh.remove} onRelocate={sh.relocate} onPatched={sh.patch} onSay={sh.say} clock={clock} busy={busy} galleries={data.galleries} guides={data.guides} playbook={data.playbook} />)}
        </ul>
      )}
      {loose.length > 0 && (
        <div className="shoot-loose">
          <span className="kick-sm">Scripts not on the calendar yet</span>
          <ul className="shoot-list">
            {loose.map((dd) => (
              <li key={dd.id} className="shoot shoot-dayonly">
                <a className="shoot-row shoot-row-link" href={dayHref(dd)}>
                  <span className="shoot-when"><strong>{dd.date ? fmtDate(dd.date) : "No date"}</strong><em>{dd.date ? (dd.start_time ? fmt12(dd.start_time) : "") : "set one on the day page"}</em></span>
                  <span className="shoot-main"><strong>{dd.title}</strong><em>{dd.scripts} script{dd.scripts === 1 ? "" : "s"}{dd.scripts ? ` · ${dd.ready} ready` : ""} · {dd.status}</em></span>
                  <span className="abtn shoot-daybtn">Open scripts →</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

// Plan a Content Day: creates the shoot day (scripts page) and opens it.
// Dated, it's put on the Shoots calendar at the same time.
function NewDay({ client: c, onFail }) {
  const [busy, setBusy] = useState(false);
  async function create(e) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget).entries());
    setBusy(true);
    try {
      const r = await fetch("/api/days", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "day-create", clientId: c.id, ...f }) }).then(async (res) => { const j = await res.json().catch(() => ({})); if (!res.ok) throw new Error(j.error || "Couldn't create the day"); return j; });
      window.location.href = `/portal/admin/clients/${c.id}/days/${r.id}`;
    } catch (err) { setBusy(false); if (onFail) onFail(err); else alert(err.message); }
  }
  return (
    <form className="shoot-new cprof-newday" onSubmit={create}>
      <label>Title<input name="title" defaultValue="Content day" required /></label>
      <label>Date<input type="date" name="date" /></label>
      <label>Start<input type="time" name="start_time" defaultValue="09:00" /></label>
      <label>End<input type="time" name="end_time" defaultValue="15:00" /></label>
      <label className="wide">Where<input name="location" placeholder="Their shop, the kitchen…" /></label>
      <p className="gcard-meta wide">Opens the scripts page for the day — you and {c.name.split(" ")[0] || "the owner"} write it together. With a date it goes on the calendar with your Content Day prep lists.</p>
      <button type="submit" className="abtn" disabled={busy}>{busy ? "Opening…" : "Create and open →"}</button>
    </form>
  );
}

function NewShoot({ leads, guides, busy, onCreate, prefill = null, compact = false }) {
  const [lead, setLead] = useState("");
  const [kind, setKind] = useState(prefill?.kind && guides[prefill.kind] ? prefill.kind : "wedding");
  const [more, setMore] = useState(false);
  const [f, setF] = useState({ title: "", client_name: prefill?.client_name || "", client_email: prefill?.client_email || "", client_phone: prefill?.client_phone || "", date: "", start_time: "", time_note: "", address: prefill?.address || "", notes: prefill?.notes || "" });
  const briefShots = prefill?.brief_shots || [];
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  // The title writes itself: "Nicole — Family". Editable under More.
  const autoTitle = `${f.client_name || (lead ? "" : "")}${f.client_name ? " — " : ""}${guides[kind]?.label || "Shoot"}`.trim();

  function pickLead(id) {
    setLead(id);
    const l = leads.find((x) => x.id === id);
    if (!l) return;
    const k = /engage/i.test(l.summary) ? "engagement" : /wedding/i.test(l.summary) ? "wedding" : /family/i.test(l.summary) ? "family" : /document|film/i.test(l.summary) ? "documentary" : /business|content/i.test(l.summary) ? "business" : "other";
    setKind(k);
    setF((s) => ({ ...s, client_name: l.name || "", client_email: l.email || "", client_phone: l.phone || "", address: l.address || "", notes: l.when ? `They said: ${l.when}` : "" }));
  }

  return (
    <form className="shoot-new" onSubmit={(e) => { e.preventDefault(); onCreate({ ...f, title: f.title.trim() || autoTitle, kind, submission_id: lead || null, brief_shots: briefShots }); }}>
      {(!compact || leads.length > 0) && (
        <label className="wide">Start from {compact ? "their inquiry" : "a lead"} (optional)
          <select value={lead} onChange={(e) => pickLead(e.target.value)}>
            <option value="">— pick one to prefill name, phone, address —</option>
            {leads.map((l) => <option key={l.id} value={l.id}>{l.name || l.email} · {l.summary}{l.address ? ` · ${l.address}` : ""}</option>)}
          </select>
        </label>
      )}
      <label>Type<select value={kind} onChange={(e) => setKind(e.target.value)}>{Object.entries(guides).filter(([k]) => !k.startsWith("__")).map(([k, g]) => <option key={k} value={k}>{g.label}</option>)}</select></label>
      <label>Date<input type="date" value={f.date} onChange={set("date")} /></label>
      <label>Start time<input type="time" value={f.start_time} onChange={set("start_time")} /></label>
      <label className="wide">Address / place<input value={f.address} onChange={set("address")} placeholder="Apples and Moore, Watkins Glen NY" /></label>
      {!compact && !f.client_name && !more && <label className="wide">Client<input value={f.client_name} onChange={set("client_name")} placeholder="Who it's for" /></label>}
      <div className="wide shoot-new-foot">
        <button type="submit" className="abtn" disabled={busy}>{busy ? "Adding…" : `Add shoot${f.client_name || f.title ? ` · ${f.title.trim() || autoTitle}` : ""}`}</button>
        <button type="button" className="achip" aria-expanded={more} onClick={() => setMore(!more)}>{more ? "Less" : "More… (title, sunset time, contact, notes)"}</button>
      </div>
      {more && (
        <>
          <label className="wide">Title<input value={f.title} onChange={set("title")} placeholder={autoTitle} /></label>
          {usesSun(kind) && <label>Start relative to sunset<input value={f.time_note} onChange={set("time_note")} placeholder="two hours before sunset" /></label>}
          <label>Client<input value={f.client_name} onChange={set("client_name")} /></label>
          <label>Phone<input value={f.client_phone} onChange={set("client_phone")} /></label>
          <label>Email<input type="email" value={f.client_email} onChange={set("client_email")} /></label>
          <label className="wide">Notes<textarea rows={2} value={f.notes} onChange={set("notes")} /></label>
          {briefShots.length > 0 && <p className="gcard-meta wide">From their brief, at the top of the shot list: {briefShots.length} shot{briefShots.length === 1 ? "" : "s"}.</p>}
        </>
      )}
    </form>
  );
}

const NO_CLOCK = { ready: false, deliver: () => {} };
const SAVE_LABEL = { saving: "Saving…", saved: "Saved ✓", retrying: "No signal — still trying. Your ticks are safe.", failed: "Couldn't save." };
export function ShootRow({ s, day = null, open, onToggle, onUpdate, onRemove, onRelocate, onPatched, onSay, clock = NO_CLOCK, busy, galleries, guides, playbook = [] }) {
  const t = useMemo(() => timing(s), [s]);
  const n = daysOut(s.date);
  const d = deliveryState(s);
  const [notes, setNotes] = useState(s.notes);
  const [edit, setEdit] = useState(false);
  const [more, setMore] = useState(false);
  // Day mode: on by itself when the shoot is today; a toggle any other day.
  const [dayMode, setDayMode] = useState(n === 0 && s.status !== "done" && s.status !== "cancelled");
  const [openList, setOpenList] = useState("flow"); // accordion: which prep list is open (full view)
  useEffect(() => setNotes(s.notes), [s.notes]);
  const say = onSay || (() => {});
  const first = s.client_name ? s.client_name.split(" ")[0] : "client";

  // Items without a group came from before the lists were split — treat them as shots.
  // Every change goes through commit(): shown at once, saved in order (useChecklist).
  const { items, commit, status, retry } = useChecklist(s, onPatched);
  function toggleItem(item) {
    commit((list) => { const i = indexOfItem(list, item); return i < 0 ? list : list.map((c, j) => (j === i ? { ...c, done: !c.done } : c)); });
  }
  function addItem(group, text, time = "") {
    commit((list) => [...list, { text, done: false, group, ...(time ? { time } : {}) }]);
  }
  function removeItem(item) {
    commit((list) => { const i = indexOfItem(list, item); return i < 0 ? list : list.filter((_, j) => j !== i); });
  }
  function setTime(item, time) {
    commit((list) => { const i = indexOfItem(list, item); return i < 0 ? list : list.map((c, j) => (j === i ? { ...c, time } : c)); });
  }
  function renameItem(item, text) {
    const t = (text || "").trim();
    if (!t || t === item.text) return;
    commit((list) => { const i = indexOfItem(list, item); return i < 0 ? list : list.map((c, j) => (j === i ? { ...c, text: t } : c)); });
  }
  // Pull a playbook list into this shoot: adds what isn't already there.
  function loadList(list) {
    const have = new Set(items.filter((c) => c.group === list.section).map((c) => c.text));
    const fresh = (list.items || []).filter((it) => it.text && !have.has(it.text)).map((it) => ({ text: it.text, done: false, group: list.section, ...(it.time ? { time: it.time } : {}), ...(it.img ? { img: it.img, img_url: it.img_url } : {}) }));
    if (!fresh.length) return say("Already all here");
    commit((cur) => [...cur, ...fresh]);
    say(`Added ${fresh.length} from “${list.title}”`);
  }
  function clearGroup(group) {
    if (!window.confirm(`Empty “${GROUP_LABEL[group]}” on this shoot? The playbook isn't touched.`)) return;
    commit((list) => list.filter((c) => c.group !== group));
  }
  function uncheckAll() {
    if (!items.some((c) => c.done)) return;
    commit((list) => list.map((c) => ({ ...c, done: false })));
    say("Reset for the day");
  }
  // "Before you leave" counters (group "wrap"): seeded on first touch.
  const wrap = items.filter((c) => c.group === "wrap");
  const wrapShown = wrap.length ? wrap : WRAP_DEFAULT.map((w) => ({ ...w, got: 0, done: false, group: "wrap" }));
  function bumpWrap(w, delta) {
    commit((list) => {
      const has = list.some((c) => c.group === "wrap");
      const base = has ? list : [...list, ...WRAP_DEFAULT.map((x) => ({ ...x, got: 0, done: false, group: "wrap" }))];
      return base.map((c) => (c.group === "wrap" && c.text === w.text ? { ...c, got: Math.max(0, (c.got || 0) + delta), done: Math.max(0, (c.got || 0) + delta) >= (c.need || 1) } : c));
    });
  }
  const wrapMissing = wrapShown.filter((w) => (w.got || 0) < (w.need || 1));
  function setStatus(status) {
    if (status === "done" && wrapMissing.length && !window.confirm(`Not logged yet: ${wrapMissing.map((w) => w.text).join(", ")}. Mark done anyway?`)) return;
    onUpdate(s.id, { status });
  }
  const saveNotes = () => { if (notes !== s.notes) onUpdate(s.id, { notes }, "Notes saved"); };
  const groups = GROUPS.filter((g) => showsGroup(s.kind, g));
  const counted = items.filter((c) => ["flow", "camera", "shots", "poses"].includes(c.group));
  const pct = counted.length ? Math.round((counted.filter((c) => c.done).length / counted.length) * 100) : 0;
  const [crew, setCrew] = useState(false);
  const flowSorted = (list) => [...list.filter((c) => c.time).sort((a, b) => a.time.localeCompare(b.time)), ...list.filter((c) => !c.time)];

  return (
    <li id={`shoot-${s.id}`} className={"shoot" + (open ? " is-open" : "") + (open && dayMode ? " is-day" : "") + ` is-${s.status}`}>
      <button type="button" className="shoot-row" onClick={onToggle} aria-expanded={open}>
        <span className="shoot-when"><strong>{fmtDate(s.date)}</strong><em>{t.start ? fmt12(t.start) : s.time_note || "time TBD"}{n !== null && n >= 0 ? ` · ${n === 0 ? "today" : n === 1 ? "tomorrow" : `in ${n} days`}` : ""}</em></span>
        <span className="shoot-main"><strong>{s.title}</strong><em>{KIND_LABEL[s.kind]}{s.client_name ? ` · ${s.client_name}` : ""}{!s.address ? " · no address yet" : ""}</em></span>
        <span className="shoot-far">{s.miles != null ? <><strong>{s.miles} mi</strong><em>~{s.drive_min} min drive</em></> : <em>—</em>}</span>
        <span className={`itag itag-${s.status}`}>{STATUS_LABEL[s.status]}</span>
      </button>
      {day && (
        <div className="shoot-daylink">
          <a className="abtn shoot-daybtn" href={day.href}>Open scripts →</a>
          <span className="gcard-meta">{day.scripts} script{day.scripts === 1 ? "" : "s"}{day.scripts ? ` · ${day.ready} ready to film` : " — nothing written yet"} · shared with {first}</span>
        </div>
      )}
      {!open && d.applies && d.owed && d.overdue && <div className="shoot-clock"><DeliveryChips d={d} done={false} /></div>}

      {open && dayMode && (
        <div className="shoot-detail shoot-day">
          <div className="sday-strip">
            <div><span className="kick-sm">Start</span><strong>{t.start ? fmt12(t.start) : "TBD"}</strong></div>
            {usesSun(s.kind) && <div><span className="kick-sm">Sunset</span><strong>{t.sunset ? fmt12(t.sunset) : "—"}</strong><em>golden {t.golden ? fmt12(t.golden) : "—"}</em></div>}
            {t.leave && <div><span className="kick-sm">Leave</span><strong>{fmt12(t.leave)}</strong></div>}
          </div>
          <div className="crew-progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${pct}%` }} /><em>{pct}%</em></div>
          <div className="gcard-actions sday-actions">
            {s.address && <a className="abtn" href={mapsUrl(s.address, s.lat, s.lng)} target="_blank" rel="noreferrer">Directions ↗</a>}
            {s.client_phone && <a className="abtn" href={`sms:${s.client_phone.replace(/[^\d+]/g, "")}`}>Text {first}</a>}
            {s.client_phone && <a className="abtn" href={`tel:${s.client_phone.replace(/[^\d+]/g, "")}`}>Call</a>}
            <button type="button" className={"achip" + (crew ? " is-on" : "")} onClick={() => setCrew(!crew)}>Crew QR</button>
            <button type="button" className="achip" onClick={() => setDayMode(false)}>Full view</button>
          </div>
          {crew && <CrewShare s={s} />}

          <RollGate />

          {status && <span className={`prep-save is-${status}`} role="status" aria-live="polite">{SAVE_LABEL[status]}{status === "failed" && <button type="button" className="achip" onClick={retry}>Try again</button>}</span>}

          <NowNext items={flowSorted(items.filter((c) => c.group === "flow"))} onToggle={toggleItem} />

          {groups.filter((g) => g !== "flow" && g !== "gear" && g !== "camera").map((g) => {
            const list = items.filter((c) => c.group === g);
            return list.length ? <DayList key={g} title={GROUP_LABEL[g]} items={list} onToggle={toggleItem} /> : null;
          })}

          {s.notes && <section className="sday-notes-ro"><span className="kick-sm">Notes</span><p>{s.notes}</p></section>}

          <section className="sday-wrap">
            <span className="kick-sm">Before you leave</span>
            <ul>
              {wrapShown.map((w) => (
                <li key={w.text} className={(w.got || 0) >= (w.need || 1) ? "is-done" : ""}>
                  <span className="sday-wrap-text">{w.text}</span>
                  <span className="sday-wrap-count">{w.got || 0}/{w.need || 1}</span>
                  <button type="button" className="abtn sday-plus" aria-label={`Log ${w.text}`} onClick={() => bumpWrap(w, 1)}>+1</button>
                </li>
              ))}
            </ul>
            <div className="gcard-actions">
              {s.status !== "done" && <button type="button" className={"achip" + (wrapMissing.length ? "" : " achip-primary")} onClick={() => setStatus("done")}>Wrap — mark done</button>}
              {items.some((c) => c.done && c.group !== "wrap") && <button type="button" className="achip" onClick={uncheckAll}>Uncheck all</button>}
            </div>
          </section>
        </div>
      )}

      {open && !dayMode && (
        <div className="shoot-detail">
          <div className="shoot-facts">
            {usesSun(s.kind) && <div><span className="kick-sm">Sunset there</span><strong>{t.sunset ? fmt12(t.sunset) : "—"}</strong><em>golden hour from {t.golden ? fmt12(t.golden) : "—"}</em></div>}
            <div><span className="kick-sm">Start</span><strong>{t.start ? fmt12(t.start) : "TBD"}</strong><em>{t.resolved ? `from “${s.time_note}”` : s.time_note || (usesSun(s.kind) ? "set a time or a sunset note" : "set a time")}</em></div>
            <div><span className="kick-sm">Leave home</span><strong>{t.leave ? fmt12(t.leave) : "—"}</strong><em>{s.drive_min ? `${s.drive_min} min drive + 20 to set up` : "needs an address"}</em></div>
            <div><span className="kick-sm">Distance</span><strong>{s.miles != null ? `${s.miles} mi` : "—"}</strong><em>{s.place_label ? s.place_label.split(",").slice(0, 3).join(",") : "not located"}</em></div>
          </div>
          <div className="gcard-actions">
            {s.address && <a className="achip" href={mapsUrl(s.address, s.lat, s.lng)} target="_blank" rel="noreferrer">Directions ↗</a>}
            {s.client_phone && <a className="achip" href={`sms:${s.client_phone.replace(/[^\d+]/g, "")}`}>Text {first}</a>}
            {s.client_phone && <a className="achip" href={`tel:${s.client_phone.replace(/[^\d+]/g, "")}`}>Call</a>}
            {s.status !== "done" && s.status !== "cancelled" && <button type="button" className="achip" onClick={() => setDayMode(true)}>▶ Day mode</button>}
            <button type="button" className={"achip" + (more ? " is-on" : "")} aria-expanded={more} onClick={() => setMore(!more)}>···</button>
          </div>
          {more && (
            <div className="gcard-actions shoot-more">
              {s.client_email && !isNoEmail(s.client_email) && <a className="achip" href={`mailto:${s.client_email}`}>Email</a>}
              {s.address && !s.lat && <button type="button" className="achip" onClick={() => (onRelocate ? onRelocate(s) : api({ action: "relocate", id: s.id }).then(() => onUpdate(s.id, {}, "Located")).catch((e) => alert(e.message)))}>Find on map</button>}
              {s.date && s.status !== "cancelled" && <a className="achip" href={gcalUrl(s)} target="_blank" rel="noreferrer">+ Google Cal</a>}
              <select className="achip" value={s.status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">{Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
              <a className="achip" href={`/portal/admin/shoots/print?id=${s.id}`} target="_blank" rel="noreferrer">Print prep sheet ↗</a>
              <button type="button" className={"achip" + (crew ? " is-on" : "")} onClick={() => setCrew(!crew)}>Crew link / QR</button>
              <button type="button" className="achip" onClick={() => setEdit((v) => !v)}>{edit ? "Close edit" : "Edit details"}</button>
              <button type="button" className="achip achip-danger" onClick={() => onRemove(s)}>Delete</button>
            </div>
          )}

          {crew && <CrewShare s={s} />}
          {edit && (
            <form className="shoot-new shoot-edit" key={s.updated_at} onSubmit={(e) => { e.preventDefault(); const f = Object.fromEntries(new FormData(e.currentTarget).entries()); onUpdate(s.id, f); setEdit(false); }}>
              <label>Title<input name="title" defaultValue={s.title} required /></label>
              <label>Type<select name="kind" defaultValue={s.kind}>{Object.entries(guides).filter(([k]) => !k.startsWith("__")).map(([k, g]) => <option key={k} value={k}>{g.label}</option>)}</select></label>
              <label>Date<input type="date" name="date" defaultValue={s.date || ""} /></label>
              <label>Start time<input type="time" name="start_time" defaultValue={s.start_time} /></label>
              {usesSun(s.kind) && <label>…or relative to sunset<input name="time_note" defaultValue={s.time_note} placeholder="two hours before sunset" /></label>}
              <label className="wide">Address / place<input name="address" defaultValue={s.address} /></label>
              <label>Client<input name="client_name" defaultValue={s.client_name} /></label>
              <label>Phone<input name="client_phone" defaultValue={s.client_phone} /></label>
              <label>Email<input type="email" name="client_email" defaultValue={s.client_email} /></label>
              <label className="wide">Gallery<select name="gallery_id" defaultValue={s.gallery_id || ""}><option value="">— none yet —</option>{galleries.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}</select></label>
              <button type="submit" className="abtn" disabled={busy}>Save</button>
            </form>
          )}

          <div className="shoot-prep">
            <div className="shoot-sec-head shoot-prep-head">
              <span className="kick-sm">Prep</span>
              <span className="prep-headtools">
                {status && <span className={`prep-save is-${status}`} role="status" aria-live="polite">{SAVE_LABEL[status]}{status === "failed" && <button type="button" className="achip" onClick={retry}>Try again</button>}</span>}
                {items.some((c) => c.done) && <button type="button" className="achip" onClick={uncheckAll}>Uncheck all</button>}
              </span>
            </div>
            <div className="shoot-cols shoot-accordion">
              {groups.map((g) => (
                <PrepList key={g} title={GROUP_LABEL[g]} group={g} kind={s.kind} items={items.filter((c) => c.group === g)} lists={playbook.filter((l) => l.section === g)} collapsed={openList !== g} onOpen={() => setOpenList(openList === g ? "" : g)} onToggle={toggleItem} onAdd={addItem} onRemove={removeItem} onRename={renameItem} onLoad={loadList} onClear={clearGroup} onTime={setTime} />
              ))}
            </div>
          </div>
          <section>
            <div className="shoot-sec-head"><span className="kick-sm">Notes</span>{notes !== s.notes && <em className="gcard-meta">saves when you tap away</em>}</div>
            <textarea className="shoot-notes" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={saveNotes} placeholder="Must-have shots, who's who, parking, the thing they said on the phone…" />
          </section>

          {d.applies && <DeliveryDetail s={s} d={d} clock={clock} onUpdate={onUpdate} />}
        </div>
      )}
    </li>
  );
}

// Crew link: the QR a second shooter scans to get /crew/<token> — the same
// flow, reminders and shot list, ticks shared both ways. No login.
function CrewShare({ s }) {
  const [png, setPng] = useState("");
  const [copied, setCopied] = useState(false);
  const url = s.crew_token ? `https://rothmediaco.com/crew/${s.crew_token}` : "";
  useEffect(() => { if (url) QRCode.toDataURL(url, { width: 320, margin: 1 }).then(setPng).catch(() => setPng("")); }, [url]);
  if (!url) return <p className="sm-sqlhint">Crew links need <code>supabase/crew.sql</code> run once in the Supabase SQL editor.</p>;
  return (
    <div className="crewshare">
      {png && <img src={png} alt="QR code for the crew link" width={160} height={160} />}
      <div className="crewshare-side">
        <strong>Second shooter: scan this</strong>
        <p className="gcard-meta">They get the flow, the roll gate and the shot list — no login. Ticks show for both of you.</p>
        <div className="gcard-actions">
          <button type="button" className="achip" onClick={() => navigator.clipboard?.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })}>{copied ? "Copied ✓" : "Copy link"}</button>
          <a className="achip" href={url} target="_blank" rel="noreferrer">Open ↗</a>
          {navigator.share && <button type="button" className="achip" onClick={() => navigator.share({ title: s.title, url }).catch(() => {})}>Share…</button>}
        </div>
      </div>
    </div>
  );
}

// Day mode pieces ───────────────────────────────────────────────────
// The roll gate: sticky strip of one-word nags. Tap one and it flashes the
// long version for a few seconds — never tick-to-dismiss, it's there all day.
function RollGate() {
  const [hit, setHit] = useState(null);
  useEffect(() => { if (hit === null) return; const t = setTimeout(() => setHit(null), 3500); return () => clearTimeout(t); }, [hit]);
  return (
    <div className="rollgate" role="note" aria-label="Before you roll">
      <div className="rollgate-chips">
        {ROLL_GATE.map((g, i) => <button key={g.tag} type="button" className={"rollgate-chip" + (hit === i ? " is-hit" : "")} onClick={() => setHit(hit === i ? null : i)}>{g.tag}</button>)}
      </div>
      {hit !== null && <p className="rollgate-tip">{ROLL_GATE[hit].tip}</p>}
    </div>
  );
}
// The flow as Now / Next: the first unticked step big, the next one small,
// then the rest of the day compact. Tap "Done →" to move on.
function NowNext({ items, onToggle }) {
  if (!items.length) return null;
  const i = items.findIndex((c) => !c.done);
  const now = i >= 0 ? items[i] : null;
  const next = i >= 0 ? items[i + 1] : null;
  return (
    <section className="nownext">
      {now ? (
        <>
          <div className="nownext-now">
            <span className="kick-sm">Now{now.time ? ` · ${fmt12(now.time)}` : ""}</span>
            <strong>{now.text}</strong>
            <button type="button" className="abtn" onClick={() => onToggle(now)}>Done →</button>
          </div>
          {next && <p className="nownext-next"><span className="kick-sm">Next{next.time ? ` · ${fmt12(next.time)}` : ""}</span> {next.text}</p>}
        </>
      ) : <p className="nownext-done">✓ Flow of the day — all done.</p>}
      <details className="nownext-all"><summary>Whole day ({items.filter((c) => c.done).length}/{items.length})</summary>
        <ul className="shoot-check">
          {items.map((c, j) => <li key={`${c.text}-${j}`} className={c.done ? "is-done" : ""}><label><input type="checkbox" checked={c.done} onChange={() => onToggle(c)} /> <span>{c.time ? `${fmt12(c.time)} · ` : ""}{c.text}</span></label></li>)}
        </ul>
      </details>
    </section>
  );
}
// A tick-only list for the day: big text, no edit affordances.
function DayList({ title, items, onToggle }) {
  const done = items.filter((c) => c.done).length;
  return (
    <section className="prep-list daylist">
      <div className="shoot-sec-head"><span className="kick-sm">{title} · {done}/{items.length}</span></div>
      <ul className="shoot-check">
        {items.map((c, j) => (
          <li key={`${c.text}-${j}`} className={c.done ? "is-done" : ""}>
            <label><input type="checkbox" checked={c.done} onChange={() => onToggle(c)} /> <span>{c.text}</span></label>
            {c.img_url && <a className="pbook-thumb" href={c.img_url} target="_blank" rel="noreferrer" title="Open reference photo"><img src={c.img_url} alt="" loading="lazy" /></a>}
          </li>
        ))}
      </ul>
    </section>
  );
}

// Delivery, inside an open shoot: what was promised, when it's due, when it
// went out — with undo, and a way to move the due date for this one job.
const dayWords = (when) => new Date(when).toLocaleDateString("en-US", { timeZone: "America/New_York", weekday: "short", month: "short", day: "numeric" });
function DeliveryDetail({ s, d, clock, onUpdate }) {
  const p = promiseFor(s.kind);
  const lines = [d.sneak && { key: "sneak", x: d.sneak, promise: "within 48 hours" }, { key: "final", x: d.final, promise: `within ${p.days / 7} weeks` }].filter(Boolean);
  return (
    <section className="shoot-delivery">
      <div className="shoot-sec-head"><span className="kick-sm">Delivery</span><DeliveryButtons s={s} d={d} clock={clock} /></div>
      <ul>
        {lines.map(({ key, x, promise }) => (
          <li key={key}>
            <span className="sd-what"><strong>{x.label}</strong><em>promised {promise}{x.due ? ` — by ${dayWords(x.due)}` : ""}</em></span>
            {x.deliveredAt
              ? <span className="dchip is-done">{key === "sneak" ? "Sent" : "Delivered"} {dayWords(x.deliveredAt)}</span>
              : x.open ? <span className={"dchip" + (x.overdue ? " is-over" : "")}>{x.text}</span> : <span className="dchip is-done">Not needed now</span>}
            {clock.ready && x.deliveredAt && <button type="button" className="achip" onClick={() => clock.deliver(s, key, true)}>Undo</button>}
            {clock.ready && key === "final" && !x.deliveredAt && (
              <label className="sd-move">Move due date
                <input type="date" key={s.final_due || "auto"} defaultValue={x.due ? easternDateOf(x.due) : ""} onBlur={(e) => e.target.value && e.target.value !== (x.due ? easternDateOf(x.due) : "") && onUpdate(s.id, { final_due: e.target.value }, "Due date moved")} />
              </label>
            )}
          </li>
        ))}
      </ul>
      {p.also && s.date && !d.final.deliveredAt && <p className="gcard-meta">{p.also.label}, if this one has photos: promised within {p.also.days / 7} weeks — by {dayWords(`${addDays(s.date, p.also.days)}T12:00:00Z`)}.</p>}
      {!clock.ready && <p className="owed-hint">{SQL_HINT}</p>}
    </section>
  );
}

// One prep list (flow, shots, poses or gear): tick, add inline, remove,
// pull in a list from the playbook. The flow carries a time per step and
// shows in time order once times are set.
const ADD_HINT = { camera: "Add a reminder…", gear: "Add gear…", shots: "Add a shot…", flow: "Add a step…", poses: "Add a pose or prompt…" };
function PrepList({ title, group, kind, items, lists, collapsed = false, onOpen = null, onToggle, onAdd, onRemove, onRename, onLoad, onClear, onTime }) {
  const [text, setText] = useState("");
  const [time, setTime] = useState("");
  const [editing, setEditing] = useState(null); // index into `shown` being edited
  const [draft, setDraft] = useState("");
  const cancelled = useRef(false);
  function startEdit(i, c) { cancelled.current = false; setEditing(i); setDraft(c.text); }
  function finishEdit(c) { if (editing === null) return; if (!cancelled.current) onRename(c, draft); cancelled.current = false; setEditing(null); }
  function cancelEdit() { cancelled.current = true; setEditing(null); }
  const isFlow = group === "flow";
  const done = items.filter((c) => c.done).length;
  const shown = isFlow ? [...items.filter((c) => c.time).sort((a, b) => a.time.localeCompare(b.time)), ...items.filter((c) => !c.time)] : items;
  // This shoot's type first, then "every shoot", then the rest.
  const rank = (l) => (l.kind === kind ? 0 : l.kind === "any" ? 1 : 2);
  const options = [...lists].sort((a, b) => rank(a) - rank(b));
  function submit(e) {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    onAdd(group, t, isFlow ? time : "");
    setText(""); setTime("");
  }
  if (collapsed) {
    return (
      <section className={"prep-list prep-" + group + " is-collapsed"}>
        <button type="button" className="prep-open" onClick={onOpen} aria-expanded={false}><span className="kick-sm">{title}</span><strong>{done}/{items.length}</strong><em>▸</em></button>
      </section>
    );
  }
  return (
    <section className={"prep-list prep-" + group}>
      <div className="shoot-sec-head">
        {onOpen ? <button type="button" className="prep-open is-on" onClick={onOpen} aria-expanded={true}><span className="kick-sm">{title}</span><strong>{done}/{items.length}</strong><em>▾</em></button> : <span className="kick-sm">{title} · {done}/{items.length}</span>}
        <span className="prep-tools">
          {options.length > 0 && (
            <select className="achip" value="" aria-label={`Add to ${title} from the playbook`} onChange={(e) => { const l = lists.find((x) => x.id === e.target.value); if (l) onLoad(l); }}>
              <option value="">+ From playbook…</option>
              {options.map((l) => <option key={l.id} value={l.id}>{l.title} ({(l.items || []).length})</option>)}
            </select>
          )}
          {items.length > 0 && <button type="button" className="achip" onClick={() => onClear(group)}>Clear</button>}
        </span>
      </div>
      <ul className="shoot-check">
        {shown.map((c, i) => (
          <li key={`${c.text}-${i}`} className={c.done ? "is-done" : ""}>
            {isFlow && <input type="time" className="pbook-time" key={c.time || "none"} defaultValue={c.time || ""} aria-label={`Time for ${c.text}`} onBlur={(e) => e.target.value !== (c.time || "") && onTime(c, e.target.value)} />}
            {editing === i ? (
              <input
                className="prep-edit"
                autoFocus
                value={draft}
                aria-label={`Edit ${c.text}`}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={() => finishEdit(c)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); finishEdit(c); } else if (e.key === "Escape") { cancelEdit(); } }}
              />
            ) : (
              <label><input type="checkbox" checked={c.done} onChange={() => onToggle(c)} /> <span onDoubleClick={() => startEdit(i, c)} title="Double-click to edit">{c.text}</span></label>
            )}
            {c.img_url && <a className="pbook-thumb" href={c.img_url} target="_blank" rel="noreferrer" title="Open reference photo"><img src={c.img_url} alt="" loading="lazy" /></a>}
            {editing !== i && <button type="button" className="prep-x prep-pen" aria-label={`Edit ${c.text}`} title="Edit" onClick={() => startEdit(i, c)}>✎</button>}
            <button type="button" className="prep-x" aria-label={`Remove ${c.text}`} title="Remove" onClick={() => onRemove(c)}>×</button>
          </li>
        ))}
        {items.length === 0 && <li className="prep-empty">Nothing here yet — add one below or pull a list from the playbook.</li>}
      </ul>
      <form className="prep-add" onSubmit={submit}>
        {isFlow && <input type="time" className="pbook-time" value={time} onChange={(e) => setTime(e.target.value)} aria-label="Time (optional)" />}
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder={ADD_HINT[group]} aria-label={ADD_HINT[group]} />
        <button type="submit" className="achip" disabled={!text.trim()}>+ Add</button>
      </form>
    </section>
  );
}
