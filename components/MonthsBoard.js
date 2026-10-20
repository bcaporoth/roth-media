"use client";

// Studio → Clients → profile → Months: the retainer. One month at a time —
// the lineup (each piece planned → filmed → editing → delivered → posted),
// the price and its pay link, the shoot day made from it, and whether the
// client sees it on their portal. Autosaves.

import { useEffect, useRef, useState } from "react";
import { KINDS, KIND_LABEL, STATUSES, DEFAULT_COUNTS, blankItem } from "../lib/content-plan";

async function api(payload) {
  const res = await fetch("/api/admin/months", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
  return json;
}
const usd = (c) => (c / 100).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const when = (d) => (d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "");
const monthLabel = (m) => new Date(m + "-15T12:00:00").toLocaleDateString("en-US", { month: "long", year: "numeric" });
const shift = (m, by) => { const [y, mo] = m.split("-").map(Number); const d = new Date(Date.UTC(y, mo - 1 + by, 15)); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`; };

export default function MonthsBoard({ client, initialMonth, initial, months: initialList, aiReady, stripeReady }) {
  const [month, setMonth] = useState(initialMonth);
  const [row, setRow] = useState(initial);
  const [list, setList] = useState(initialList || []);
  const [state, setState] = useState("saved");
  const [busy, setBusy] = useState("");
  const [direction, setDirection] = useState("");
  const [counts, setCounts] = useState(DEFAULT_COUNTS);
  const [tool, setTool] = useState("");
  const [flash, setFlash] = useState("");
  const [error, setError] = useState("");
  const timer = useRef(null);
  const skip = useRef(true);
  const say = (m) => { setFlash(m); setError(""); setTimeout(() => setFlash(""), 3500); };
  const fail = (e) => { setError(e.message || String(e)); setFlash(""); };

  async function go(m) {
    setBusy("open");
    try { const r = await api({ action: "open", clientId: client.id, month: m }); skip.current = true; setRow(r.month); setMonth(m); setTool(""); refreshList(); } catch (e) { fail(e); } finally { setBusy(""); }
  }
  async function refreshList() { try { const r = await api({ action: "list", clientId: client.id }); setList(r.months || []); } catch {} }

  // Autosave items / intro / notes / price.
  useEffect(() => {
    if (skip.current) { skip.current = false; return; }
    setState("dirty");
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setState("saving");
      try { await api({ action: "save", clientId: client.id, month, patch: { items: row.items, intro: row.intro, notes: row.notes, price_cents: row.price_cents } }); setState("saved"); refreshList(); } catch (e) { setState("dirty"); fail(e); }
    }, 900);
    return () => clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row.items, row.intro, row.notes, row.price_cents]);

  const setItem = (id, patch) => setRow((r) => ({ ...r, items: r.items.map((it) => (it.id === id ? { ...it, ...patch } : it)) }));
  const move = (i, by) => setRow((r) => { const items = [...r.items]; const j = i + by; if (j < 0 || j >= items.length) return r; [items[i], items[j]] = [items[j], items[i]]; return { ...r, items }; });
  const remove = (id) => { if (window.confirm("Remove this piece from the month?")) setRow((r) => ({ ...r, items: r.items.filter((it) => it.id !== id) })); };
  const add = (kind) => setRow((r) => ({ ...r, items: [...r.items, blankItem(kind)] }));

  async function run(name, payload, done) {
    setBusy(name); setError("");
    try { const r = await api({ clientId: client.id, month, ...payload }); skip.current = true; if (r.month) setRow(r.month); done?.(r); refreshList(); } catch (e) { fail(e); } finally { setBusy(""); }
  }
  const publish = (on) => run("publish", { action: "save", patch: { published: on } }, () => say(on ? "On their portal" : "Taken off their portal"));
  const paid = (on) => run("paid", { action: "save", patch: { paid: on } }, () => say(on ? "Marked paid" : "Marked unpaid"));

  const done = row.items.filter((it) => it.status === "delivered" || it.status === "posted").length;
  const prev = list.filter((m) => m.month < month)[0];
  const thisMonth = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit" }).format(new Date()).slice(0, 7);

  return (
    <div className="mo">
      <div className="mo-nav">
        <button type="button" className="achip" onClick={() => go(shift(month, -1))} disabled={!!busy}>← {monthLabel(shift(month, -1)).split(" ")[0]}</button>
        <h2 className="mo-title">{monthLabel(month)}{month === thisMonth && <em>this month</em>}</h2>
        <button type="button" className="achip" onClick={() => go(shift(month, 1))} disabled={!!busy}>{monthLabel(shift(month, 1)).split(" ")[0]} →</button>
        <span className={`mo-state is-${state}`}>{state === "saved" ? "Saved ✓" : state === "saving" ? "Saving…" : "Unsaved…"}</span>
      </div>
      {flash && <p className="cplan-flash">{flash}</p>}
      {error && <p className="cplan-error" role="alert">{error}</p>}

      <div className="mo-strip">
        <div className="mo-stat"><span>Lineup</span><strong>{row.items.length} piece{row.items.length === 1 ? "" : "s"}</strong><em>{done} delivered or posted</em></div>
        <div className="mo-stat"><span>Price</span><strong><input type="number" min={0} step={25} value={row.price_cents ? row.price_cents / 100 : ""} onChange={(e) => setRow((r) => ({ ...r, price_cents: Math.round(Number(e.target.value || 0) * 100) }))} placeholder="0" aria-label="Price in dollars" /></strong><em>{row.paid_at ? `Paid ${when(row.paid_at)}${row.paid_cents ? ` · ${usd(row.paid_cents)}` : ""}` : row.pay_url ? "Link made, not paid yet" : "No pay link yet"}</em></div>
        <div className="mo-stat"><span>Portal</span><strong>{row.published_at ? "On their portal" : "Hidden"}</strong><em>{row.published_at ? `since ${when(row.published_at)}` : `${client.name.split(" ")[0] || "They"} can't see this month yet`}</em></div>
        <div className="mo-stat"><span>Shoot day</span><strong>{row.day_id ? <a href={`/portal/admin/clients/${client.id}/days/${row.day_id}`}>Open →</a> : "None yet"}</strong><em>{row.day_id ? "scripts live there" : "one tap makes it from the lineup"}</em></div>
      </div>

      <div className="sday-tools">
        <button type="button" className={"achip" + (tool === "draft" ? " is-on" : "")} onClick={() => setTool(tool === "draft" ? "" : "draft")}>✦ Draft this month with Claude</button>
        {prev && <button type="button" className="achip" disabled={!!busy} onClick={() => run("copy", { action: "copy", from: prev.month }, () => say(`Copied ${monthLabel(prev.month)}'s lineup in`))}>Copy {monthLabel(prev.month).split(" ")[0]}'s lineup</button>}
        <button type="button" className="achip" disabled={!!busy || !row.items.length} onClick={() => run("day", { action: "day" }, (r) => say(r.day.reused ? "Shoot day already exists — opened" : `Shoot day made with ${r.day.scripts} script${r.day.scripts === 1 ? "" : "s"}`))}>{row.day_id ? "Shoot day ✓" : "Make the shoot day"}</button>
        <button type="button" className="achip" disabled={!!busy || !stripeReady || !(row.price_cents >= 100)} title={!stripeReady ? "Stripe isn't set up" : !(row.price_cents >= 100) ? "Set a price first" : ""} onClick={() => run("paylink", { action: "paylink" }, () => say("Pay link ready — it's on their portal too"))}>{row.pay_url ? "New pay link" : "Make pay link"}</button>
        {row.pay_url && <button type="button" className="achip" onClick={async () => { try { await navigator.clipboard.writeText(row.pay_url); say("Pay link copied"); } catch { window.prompt("Copy:", row.pay_url); } }}>Copy pay link</button>}
        <button type="button" className="achip" disabled={!!busy} onClick={() => paid(!row.paid_at)}>{row.paid_at ? "Mark unpaid" : "Mark paid (cash / check)"}</button>
        <button type="button" className={"abtn" + (row.published_at ? " abtn-ghost" : "")} disabled={!!busy || (!row.published_at && !row.items.length)} onClick={() => publish(!row.published_at)}>{row.published_at ? "Hide from portal" : "Publish to their portal"}</button>
      </div>

      {tool === "draft" && (
        <div className="sday-box">
          <label className="sday-boxlabel">Direction for {monthLabel(month)} <em>Claude reads their brand palette, brief and earlier months.</em>
            <textarea rows={2} value={direction} onChange={(e) => setDirection(e.target.value)} placeholder="Holiday pre-orders. Push the gift boxes. One 'meet the baker' piece." />
          </label>
          <div className="sday-counts">
            {["reel", "promo", "photos"].map((k) => <label key={k}><span>{KIND_LABEL[k]}</span><input type="number" min={0} max={12} value={counts[k]} onChange={(e) => setCounts({ ...counts, [k]: Math.max(0, Math.min(12, Number(e.target.value) || 0)) })} /></label>)}
          </div>
          <div className="gcard-actions">
            <button type="button" className="abtn" disabled={!!busy || !aiReady} onClick={() => run("draft", { action: "draft", direction, counts }, () => { setTool(""); say("Drafted — read it through"); })}>{busy === "draft" ? "Drafting… (about a minute)" : "Draft the lineup"}</button>
            <button type="button" className="achip" onClick={() => setTool("")}>Cancel</button>
            {!aiReady && <span className="gcard-meta">Claude isn't set up on this server.</span>}
          </div>
        </div>
      )}

      <section className="cprof-card">
        <label className="cplan-grow mo-intro">One line for their portal<input value={row.intro} onChange={(e) => setRow((r) => ({ ...r, intro: e.target.value }))} placeholder={`What ${monthLabel(month).split(" ")[0]} is about`} /></label>
        {row.items.length === 0 && <p className="gcard-meta">Nothing in {monthLabel(month)} yet — draft it, copy last month, or add pieces below.</p>}
        <ol className="cplan-items">
          {row.items.map((it, i) => (
            <li key={it.id} className={`cplan-item mo-item is-${it.status}`}>
              <div className="cplan-itemhead">
                <span className="itag">{KIND_LABEL[it.kind]}</span>
                <span className="mo-steps" role="radiogroup" aria-label="Status">
                  {STATUSES.map((s, si) => { const cur = STATUSES.findIndex((x) => x.id === it.status); return <button key={s.id} type="button" role="radio" aria-checked={it.status === s.id} className={"mo-step" + (si <= cur ? " is-past" : "") + (it.status === s.id ? " is-now" : "")} onClick={() => setItem(it.id, { status: s.id })}>{s.label}</button>; })}
                </span>
                <span className="cplan-itemtools">
                  <button type="button" className="achip" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">↑</button>
                  <button type="button" className="achip" disabled={i === row.items.length - 1} onClick={() => move(i, 1)} aria-label="Move down">↓</button>
                  <button type="button" className="achip achip-danger" onClick={() => remove(it.id)} aria-label="Remove">✕</button>
                </span>
              </div>
              <div className="cplan-row">
                <label className="cplan-grow">Title<input value={it.title} onChange={(e) => setItem(it.id, { title: e.target.value })} /></label>
                <label>Kind<select value={it.kind} onChange={(e) => setItem(it.id, { kind: e.target.value })}>{KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}</select></label>
                <label className="cplan-grow">When<input value={it.when} onChange={(e) => setItem(it.id, { when: e.target.value })} placeholder="Week 2" /></label>
              </div>
              <label className="cplan-field">Idea<textarea rows={2} value={it.idea} onChange={(e) => setItem(it.id, { idea: e.target.value })} /></label>
            </li>
          ))}
        </ol>
        <div className="gcard-actions">{KINDS.map((k) => <button key={k.id} type="button" className="achip" onClick={() => add(k.id)}>+ {k.label}</button>)}</div>
      </section>

      <section className="cprof-card">
        <label className="cplan-field">Your notes on this month (never on their portal)<textarea rows={3} value={row.notes} onChange={(e) => setRow((r) => ({ ...r, notes: e.target.value }))} /></label>
      </section>

      {list.length > 1 && (
        <section className="cprof-card">
          <div className="cprof-cardhead"><h2>All months</h2></div>
          <ul className="cprof-list">
            {list.map((m) => (
              <li key={m.id}><button type="button" className="rm-linkbtn" onClick={() => go(m.month)}><strong>{m.label}</strong></button> <span className="gcard-meta">· {m.total} piece{m.total === 1 ? "" : "s"}, {m.done} done · {m.price_cents ? usd(m.price_cents) : "no price"}{m.paid_at ? " · paid" : m.pay_url ? " · link sent" : ""}{m.published_at ? " · on portal" : ""}</span></li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
