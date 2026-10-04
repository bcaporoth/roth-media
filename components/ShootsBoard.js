"use client";

// Studio → Shoots: Brandon's itinerary. Every job with a date, a place, how
// far it is, when the sun sets there, a checklist from the guide for that
// kind of shoot, and notes. New shoots can be spun up from a lead in the
// inbox (address + date pulled from the form).
//
// Prep: every shoot carries four lists — the flow of the day (timed),
// shots to get, poses & prompts, gear to pack — copied in from the Playbook
// library and edited per job (add, remove, tick, pull in another list).
// "Print prep sheet" opens a one-page version to print or save as PDF.
//
// Delivery clock: once a shoot has happened it shows what's owed — the
// sneak peek (48 hours) and the finished work (film six weeks, galleries
// four, business content two — lib/delivery.js) — with one-tap "sent" /
// "delivered". Everything still owed is listed at the top, most urgent first.
//
// List | Month: the month grid from the Calendar tab, right here; tapping
// an event opens that shoot. ?open=<id> opens and scrolls to a shoot.
//
// ClientShoots is the same thing scoped to one person, for their profile.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { timing, fmt12 } from "../lib/sun";
import { mapsUrl, HOME } from "../lib/geo";
import { GROUPS, GROUP_LABEL, groupOf } from "../lib/shoot-guides";
import { deliveryState, owedList, promiseFor, todayEastern, addDays, easternDateOf } from "../lib/delivery";
import StudioCalendar, { gcalUrl } from "./StudioCalendar";

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
  const [showPast, setShowPast] = useState(false);
  const [prefill, setPrefill] = useState(null);
  const [view, setView] = useState("list"); // list | month
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shoots = data?.shoots || [];
  const today = todayEastern(); // the Eastern calendar day, not UTC's — tonight's shoot stays "today" all evening
  const isPast = (s) => (s.date && s.date < today) || s.status === "done" || s.status === "cancelled";

  // A shoot dated today opens by itself (the flow of the day is the first list).
  useEffect(() => {
    if (!data || !first.current) return;
    first.current = false;
    const now = data.shoots.find((s) => s.date === today && s.status !== "cancelled" && s.status !== "done");
    if (now) setOpenId(now.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // Open a shoot wherever it sits (list view, past list unfolded) and bring it into view.
  useEffect(() => {
    if (!wanted || !data) return;
    const s = data.shoots.find((x) => x.id === wanted.id);
    if (!s) { setWanted(null); return; }
    setView("list");
    if (isPast(s)) setShowPast(true);
    setOpenId(s.id);
    const t = setTimeout(() => { document.getElementById(`shoot-${s.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }); setWanted(null); }, 60);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wanted, data]);
  const reveal = (id) => setWanted({ id });

  const rowProps = (s) => ({ s, open: openId === s.id, onToggle: () => setOpenId(openId === s.id ? null : s.id), onUpdate: sh.update, onRemove: sh.remove, onRelocate: sh.relocate, onPatched: sh.patch, onSay: sh.say, clock, busy, galleries: data.galleries, guides: data.guides, playbook: data.playbook });
  const upcoming = shoots.filter((s) => !s.date || s.date >= today).filter((s) => s.status !== "cancelled" && s.status !== "done");
  const past = shoots.filter(isPast).reverse();

  if (!data && !error) return <p className="portal-empty">Loading…</p>;
  if (error && !data) return <p className="portal-empty">{error}</p>;

  return (
    <div className="shoots">
      <div className="atoolbar shoots-bar">
        <button type="button" className="abtn" onClick={() => setShowNew((v) => !v)}>{showNew ? "Close" : "+ New shoot"}</button>
        <span className="gcard-meta">{upcoming.length} coming up · from {HOME.label}</span>
        <span className="sview" role="group" aria-label="View">
          <button type="button" className={view === "list" ? "is-on" : ""} aria-pressed={view === "list"} onClick={() => setView("list")}>List</button>
          <button type="button" className={view === "month" ? "is-on" : ""} aria-pressed={view === "month"} onClick={() => setView("month")}>Month</button>
        </span>
        {flash && <span className="clients-flash">{flash}</span>}
      </div>
      {error && <p className="cform-error">{error}</p>}

      {showNew && <NewShoot prefill={prefill} leads={data.leads} guides={data.guides} busy={busy} onCreate={create} />}

      <OwedPanel shoots={shoots} clock={clock} onOpen={reveal} onBulk={deliverBulk} tucked={shoots.some((s) => s.date === today && s.status !== "cancelled" && s.status !== "done")} />

      {view === "month" ? (
        <StudioCalendar shoots={shoots} onOpen={reveal} />
      ) : (
        <>
          {upcoming.length === 0 && !showNew && <p className="portal-empty">Nothing on the books. Hit “+ New shoot” — or start one from a lead.</p>}

          <ul className="shoot-list">
            {upcoming.map((s) => <ShootRow key={s.id} {...rowProps(s)} />)}
          </ul>

          {past.length > 0 && (
            <>
              <button type="button" className="achip shoots-past-toggle" onClick={() => setShowPast((v) => !v)}>{showPast ? "Hide" : "Show"} {past.length} past / done</button>
              {showPast && <ul className="shoot-list is-past">{past.map((s) => <ShootRow key={s.id} {...rowProps(s)} />)}</ul>}
            </>
          )}
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
function OwedPanel({ shoots, clock, onOpen, onBulk, tucked = false }) {
  const [all, setAll] = useState(false);
  // On a shoot day the list folds down to its one-line summary, so today's
  // flow is the first thing on the screen. null = follow `tucked`.
  const [folded, setFolded] = useState(null);
  const isFolded = folded ?? tucked;
  const now = new Date();
  let rows = owedList(shoots, now);
  if (!clock.ready) { const cutoff = addDays(todayEastern(now), -60); rows = rows.filter((x) => x.shoot.date && x.shoot.date >= cutoff); }
  if (!rows.length) return null;
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
        <em>Done, not delivered yet — most urgent first.</em>
        {(tucked || folded !== null) && <button type="button" className="achip owed-fold" aria-expanded={!isFolded} onClick={() => setFolded(!isFolded)}>{isFolded ? "Show" : "Hide"}</button>}
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
// the same prep lists as the Shoots tab, filtered to their email.
const PLAN_LABEL = { wedding: "Plan the wedding day", business: "Plan a Content Day", family: "Plan a session" };
export function ClientShoots({ client, type = "wedding" }) {
  const sh = useShoots();
  const { data, error, openId, setOpenId, showNew, setShowNew, busy, flash, refresh, create, clock } = sh;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { refresh(); }, []);
  const email = (client.email || "").toLowerCase();
  const mine = (data?.shoots || []).filter((s) => (s.client_email || "").toLowerCase() === email);
  const sorted = [...mine].sort((a, b) => (a.status === "done" || a.status === "cancelled") - (b.status === "done" || b.status === "cancelled"));

  return (
    <section className="cprof-card cprof-shoots">
      <div className="cprof-cardhead"><h2>Shoots &amp; day plan</h2>
        <button type="button" className="abtn" onClick={() => setShowNew((v) => !v)} disabled={!data}>{showNew ? "Close" : `+ ${PLAN_LABEL[type] || "Plan a shoot"}`}</button>
      </div>
      {flash && <p className="clients-flash">{flash}</p>}
      {error && <p className="cform-error">{error}</p>}
      {!data && !error && <p className="gcard-meta">Loading…</p>}
      {data && showNew && <NewShoot key={type} compact prefill={{ client_name: client.name, client_email: client.email, client_phone: client.phone, kind: type }} leads={data.leads.filter((l) => (l.email || "").toLowerCase() === email)} guides={data.guides} busy={busy} onCreate={create} />}
      {data && mine.length === 0 && !showNew && <p className="gcard-meta">Nothing planned yet. Start one and the flow of the day, shot list, poses and gear from your playbook come with it — all editable for this client.</p>}
      {data && mine.length > 0 && (
        <ul className="shoot-list">
          {sorted.map((s) => <ShootRow key={s.id} s={s} open={openId === s.id} onToggle={() => setOpenId(openId === s.id ? null : s.id)} onUpdate={sh.update} onRemove={sh.remove} onRelocate={sh.relocate} onPatched={sh.patch} onSay={sh.say} clock={clock} busy={busy} galleries={data.galleries} guides={data.guides} playbook={data.playbook} />)}
        </ul>
      )}
    </section>
  );
}

function NewShoot({ leads, guides, busy, onCreate, prefill = null, compact = false }) {
  const [lead, setLead] = useState("");
  const [kind, setKind] = useState(prefill?.kind && guides[prefill.kind] ? prefill.kind : "wedding");
  const [f, setF] = useState({ title: prefill?.client_name ? `${prefill.client_name} — ` : "", client_name: prefill?.client_name || "", client_email: prefill?.client_email || "", client_phone: prefill?.client_phone || "", date: "", start_time: "", time_note: "", address: "", notes: "" });
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  function pickLead(id) {
    setLead(id);
    const l = leads.find((x) => x.id === id);
    if (!l) return;
    const k = /wedding|engage/i.test(l.summary) ? "wedding" : /family/i.test(l.summary) ? "family" : /business|content/i.test(l.summary) ? "business" : "other";
    setKind(k);
    setF((s) => ({ ...s, title: `${l.name || l.email} — ${l.summary.split(" · ")[1] || l.summary}`.slice(0, 120), client_name: l.name || "", client_email: l.email || "", client_phone: l.phone || "", address: l.address || "", notes: l.when ? `They said: ${l.when}` : "" }));
  }

  return (
    <form className="shoot-new" onSubmit={(e) => { e.preventDefault(); onCreate({ ...f, kind, submission_id: lead || null }); }}>
      {(!compact || leads.length > 0) && (
        <label className="wide">Start from {compact ? "their inquiry" : "a lead"} (optional)
          <select value={lead} onChange={(e) => pickLead(e.target.value)}>
            <option value="">— pick one to prefill name, phone, address —</option>
            {leads.map((l) => <option key={l.id} value={l.id}>{l.name || l.email} · {l.summary}{l.address ? ` · ${l.address}` : ""}</option>)}
          </select>
        </label>
      )}
      <label>Title<input value={f.title} onChange={set("title")} required placeholder="Nicole — golden hour session" /></label>
      <label>Type<select value={kind} onChange={(e) => setKind(e.target.value)}>{Object.entries(guides).filter(([k]) => !k.startsWith("__")).map(([k, g]) => <option key={k} value={k}>{g.label}</option>)}</select></label>
      <label>Date<input type="date" value={f.date} onChange={set("date")} /></label>
      <label>Start time<input type="time" value={f.start_time} onChange={set("start_time")} /></label>
      <label>…or relative to sunset<input value={f.time_note} onChange={set("time_note")} placeholder="two hours before sunset" /></label>
      <label className="wide">Address / place<input value={f.address} onChange={set("address")} placeholder="Apples and Moore, Watkins Glen NY" /></label>
      {!compact && <label>Client<input value={f.client_name} onChange={set("client_name")} /></label>}
      {!compact && <label>Phone<input value={f.client_phone} onChange={set("client_phone")} /></label>}
      {!compact && <label>Email<input type="email" value={f.client_email} onChange={set("client_email")} /></label>}
      <label className="wide">Notes<textarea rows={2} value={f.notes} onChange={set("notes")} /></label>
      <p className="gcard-meta wide">Your playbook lists for {guides[kind]?.label} — flow, shots, poses, gear — get copied in; distance and sunset are worked out from the address.</p>
      <button type="submit" className="abtn" disabled={busy}>{busy ? "Adding…" : "Add shoot"}</button>
    </form>
  );
}

const NO_CLOCK = { ready: false, deliver: () => {} };
const SAVE_LABEL = { saving: "Saving…", saved: "Saved ✓", retrying: "No signal — still trying. Your ticks are safe.", failed: "Couldn't save." };
export function ShootRow({ s, open, onToggle, onUpdate, onRemove, onRelocate, onPatched, onSay, clock = NO_CLOCK, busy, galleries, guides, playbook = [] }) {
  const t = useMemo(() => timing(s), [s]);
  const n = daysOut(s.date);
  const d = deliveryState(s);
  const [notes, setNotes] = useState(s.notes);
  const [edit, setEdit] = useState(false);
  useEffect(() => setNotes(s.notes), [s.notes]);
  const say = onSay || (() => {});

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
  // Pull a playbook list into this shoot: adds what isn't already there.
  function loadList(list) {
    const have = new Set(items.filter((c) => c.group === list.section).map((c) => c.text));
    const fresh = (list.items || []).filter((it) => it.text && !have.has(it.text)).map((it) => ({ text: it.text, done: false, group: list.section, ...(it.time ? { time: it.time } : {}) }));
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

  return (
    <li id={`shoot-${s.id}`} className={"shoot" + (open ? " is-open" : "") + ` is-${s.status}`}>
      <button type="button" className="shoot-row" onClick={onToggle}>
        <span className="shoot-when"><strong>{fmtDate(s.date)}</strong><em>{t.start ? fmt12(t.start) : s.time_note || "time TBD"}{n !== null && n >= 0 ? ` · ${n === 0 ? "today" : n === 1 ? "tomorrow" : `in ${n} days`}` : ""}</em></span>
        <span className="shoot-main"><strong>{s.title}</strong><em>{KIND_LABEL[s.kind]}{s.client_name ? ` · ${s.client_name}` : ""}{s.address ? ` · ${s.address}` : " · no address yet"}</em></span>
        <span className="shoot-far">{s.miles != null ? <><strong>{s.miles} mi</strong><em>~{s.drive_min} min drive</em></> : <em>—</em>}</span>
        <span className={`itag itag-${s.status}`}>{STATUS_LABEL[s.status]}</span>
      </button>
      {d.applies && (
        <div className="shoot-clock">
          <DeliveryChips d={d} />
          <DeliveryButtons s={s} d={d} clock={clock} />
        </div>
      )}

      {open && (
        <div className="shoot-detail">
          <div className="shoot-facts">
            <div><span className="kick-sm">Sunset there</span><strong>{t.sunset ? fmt12(t.sunset) : "—"}</strong><em>golden hour from {t.golden ? fmt12(t.golden) : "—"}</em></div>
            <div><span className="kick-sm">Start</span><strong>{t.start ? fmt12(t.start) : "TBD"}</strong><em>{t.resolved ? `from “${s.time_note}”` : s.time_note || "set a time or a sunset note"}</em></div>
            <div><span className="kick-sm">Leave home</span><strong>{t.leave ? fmt12(t.leave) : "—"}</strong><em>{s.drive_min ? `${s.drive_min} min drive + 20 to set up` : "needs an address"}</em></div>
            <div><span className="kick-sm">Distance</span><strong>{s.miles != null ? `${s.miles} mi` : "—"}</strong><em>{s.place_label ? s.place_label.split(",").slice(0, 3).join(",") : "not located"}</em></div>
          </div>
          <div className="gcard-actions">
            {s.address && <a className="achip" href={mapsUrl(s.address, s.lat, s.lng)} target="_blank" rel="noreferrer">Directions ↗</a>}
            {s.client_phone && <a className="achip" href={`sms:${s.client_phone.replace(/[^\d+]/g, "")}`}>Text {s.client_name.split(" ")[0] || "client"}</a>}
            {s.client_phone && <a className="achip" href={`tel:${s.client_phone.replace(/[^\d+]/g, "")}`}>Call</a>}
            {s.client_email && <a className="achip" href={`mailto:${s.client_email}`}>Email</a>}
            {s.address && !s.lat && <button type="button" className="achip" onClick={() => (onRelocate ? onRelocate(s) : api({ action: "relocate", id: s.id }).then(() => onUpdate(s.id, {}, "Located")).catch((e) => alert(e.message)))}>Find on map</button>}
            {s.date && s.status !== "cancelled" && <a className="achip" href={gcalUrl(s)} target="_blank" rel="noreferrer">+ Google Cal</a>}
            <select className="achip" value={s.status} onChange={(e) => onUpdate(s.id, { status: e.target.value })}>{Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
            <a className="achip" href={`/portal/admin/shoots/print?id=${s.id}`} target="_blank" rel="noreferrer">Print prep sheet ↗</a>
            <button type="button" className="achip" onClick={() => setEdit((v) => !v)}>{edit ? "Close edit" : "Edit details"}</button>
            <button type="button" className="achip achip-danger" onClick={() => onRemove(s)}>Delete</button>
          </div>

          {edit && (
            <form className="shoot-new shoot-edit" key={s.updated_at} onSubmit={(e) => { e.preventDefault(); const f = Object.fromEntries(new FormData(e.currentTarget).entries()); onUpdate(s.id, f); setEdit(false); }}>
              <label>Title<input name="title" defaultValue={s.title} required /></label>
              <label>Type<select name="kind" defaultValue={s.kind}>{Object.entries(guides).filter(([k]) => !k.startsWith("__")).map(([k, g]) => <option key={k} value={k}>{g.label}</option>)}</select></label>
              <label>Date<input type="date" name="date" defaultValue={s.date || ""} /></label>
              <label>Start time<input type="time" name="start_time" defaultValue={s.start_time} /></label>
              <label>…or relative to sunset<input name="time_note" defaultValue={s.time_note} placeholder="two hours before sunset" /></label>
              <label className="wide">Address / place<input name="address" defaultValue={s.address} /></label>
              <label>Client<input name="client_name" defaultValue={s.client_name} /></label>
              <label>Phone<input name="client_phone" defaultValue={s.client_phone} /></label>
              <label>Email<input type="email" name="client_email" defaultValue={s.client_email} /></label>
              <label className="wide">Gallery<select name="gallery_id" defaultValue={s.gallery_id || ""}><option value="">— none yet —</option>{galleries.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}</select></label>
              <button type="submit" className="abtn" disabled={busy}>Save</button>
            </form>
          )}

          {d.applies && <DeliveryDetail s={s} d={d} clock={clock} onUpdate={onUpdate} />}

          <div className="shoot-prep">
            <div className="shoot-sec-head shoot-prep-head">
              <span className="kick-sm">Prep</span>
              <span className="prep-headtools">
                {status && <span className={`prep-save is-${status}`} role="status" aria-live="polite">{SAVE_LABEL[status]}{status === "failed" && <button type="button" className="achip" onClick={retry}>Try again</button>}</span>}
                {items.some((c) => c.done) && <button type="button" className="achip" onClick={uncheckAll}>Uncheck all</button>}
              </span>
            </div>
            <div className="shoot-cols">
              {GROUPS.map((g) => (
                <PrepList key={g} title={GROUP_LABEL[g]} group={g} kind={s.kind} items={items.filter((c) => c.group === g)} lists={playbook.filter((l) => l.section === g)} onToggle={toggleItem} onAdd={addItem} onRemove={removeItem} onLoad={loadList} onClear={clearGroup} onTime={setTime} />
              ))}
            </div>
          </div>
          <section>
            <div className="shoot-sec-head"><span className="kick-sm">Notes</span>{notes !== s.notes && <button type="button" className="achip" onClick={() => onUpdate(s.id, { notes })} disabled={busy}>Save notes</button>}</div>
            <textarea className="shoot-notes" rows={6} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Must-have shots, who's who, parking, the thing they said on the phone…" />
          </section>
        </div>
      )}
    </li>
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
      <div className="shoot-sec-head"><span className="kick-sm">Delivery</span></div>
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
const ADD_HINT = { gear: "Add gear…", shots: "Add a shot…", flow: "Add a step…", poses: "Add a pose or prompt…" };
function PrepList({ title, group, kind, items, lists, onToggle, onAdd, onRemove, onLoad, onClear, onTime }) {
  const [text, setText] = useState("");
  const [time, setTime] = useState("");
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
  return (
    <section className={"prep-list prep-" + group}>
      <div className="shoot-sec-head">
        <span className="kick-sm">{title} · {done}/{items.length}</span>
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
            <label><input type="checkbox" checked={c.done} onChange={() => onToggle(c)} /> <span>{c.text}</span></label>
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
