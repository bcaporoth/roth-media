"use client";

// Studio → Money → Quotes (2026-11-15). Build up to three options for one
// client from building blocks; the price is time × your hourly rate plus
// flat extras. Make the link, then send it yourself (Text / Email open your
// own Messages or Gmail — nothing sends on its own). Blocks & rate live in
// the panel at the bottom. Math in lib/quotes.js; saved via /api/admin/quotes.

import { useEffect, useMemo, useState } from "react";
import { aboutTime, lineLabel, money, optionTotals, quoteTotals, quoteExpired, quoteExpiry, QUOTE_DAYS } from "../lib/quotes";
import { confirmTap } from "../lib/confirm-tap";

async function api(payload) {
  const res = await fetch("/api/admin/quotes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error || "That didn't save");
  return j;
}

const LABELS = ["Simple", "Recommended", "Everything"];
const blankQuote = (prefill = {}) => ({
  name: prefill.name || "", email: prefill.email || "", phone: prefill.phone || "",
  business: prefill.business || "", when: prefill.when || "", note: "", recommended: 1,
  options: LABELS.map((label) => ({ label, lines: [] })),
  from: prefill.from || "",
  credit: null,
});
const lineFrom = (b) => ({ block: b.id, name: b.name, unit: b.unit, qty: 1, shoot: b.shoot, edit: b.edit, flat: b.flat });
const day = (d) => (d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "");
const enc = encodeURIComponent;

function statusOf(q) {
  if (q.status === "paid") return { key: "paid", label: `Paid ${money(q.paid || 0)}` };
  if (q.status === "signed") return { key: "signed", label: "Signed, not paid yet" };
  if (q.status === "void") return { key: "void", label: "Voided" };
  if (quoteExpired(q)) return { key: "expired", label: "Expired" };
  const left = Math.max(0, Math.ceil((quoteExpiry(q).getTime() - Date.now()) / 86400000));
  return { key: "sent", label: `${q.viewedAt ? "Opened" : "Sent"} · ${left} day${left === 1 ? "" : "s"} left` };
}

function Line({ l, block, onChange, onRemove }) {
  const [open, setOpen] = useState(false);
  const num = (k) => (e) => onChange({ ...l, [k]: Math.max(0, Number(e.target.value) || 0) });
  const step = l.block === "coverage" || l.block === "photos" ? 0.5 : 1;
  const per = [l.shoot ? `${l.shoot} min on site` : "", l.edit ? `${l.edit} min editing` : "", l.flat ? `${money(l.flat)}` : ""].filter(Boolean).join(" + ") || "no time or price yet";
  return (
    <li className="qb-line">
      <div className="qb-line-top">
        <span className="qb-line-name">{lineLabel(l)}</span>
        <span className="qb-qty">
          <button type="button" className="achip" aria-label="One less" onClick={() => onChange({ ...l, qty: Math.max(0, +(l.qty - step).toFixed(2)) })}>−</button>
          <input type="number" min="0" step={step} value={l.qty} onChange={num("qty")} aria-label={`How many: ${l.name}`} />
          <button type="button" className="achip" aria-label="One more" onClick={() => onChange({ ...l, qty: +(l.qty + step).toFixed(2) })}>+</button>
        </span>
      </div>
      <div className="qb-line-meta">
        <span>Each {l.unit || "one"}: {per}</span>
        <button type="button" className="qb-link" onClick={() => setOpen((v) => !v)}>{open ? "Done" : "Change"}</button>
        <button type="button" className="qb-link" onClick={onRemove}>Remove</button>
      </div>
      {open && (
        <div className="qb-line-edit">
          <label><span>Min on site</span><input type="number" min="0" value={l.shoot} onChange={num("shoot")} /></label>
          <label><span>Min editing</span><input type="number" min="0" value={l.edit} onChange={num("edit")} /></label>
          <label><span>Flat $</span><input type="number" min="0" value={l.flat} onChange={num("flat")} /></label>
          {block && (block.shoot !== l.shoot || block.edit !== l.edit || block.flat !== l.flat) && <small>Only changes this quote. Your usual: {block.shoot}/{block.edit} min{block.flat ? `, ${money(block.flat)}` : ""}.</small>}
        </div>
      )}
    </li>
  );
}

function OptionCard({ o, i, rate, blocks, recommended, onChange, onRecommend, onCopyPrev }) {
  const t = optionTotals(o, rate);
  const blockOf = (id) => blocks.find((b) => b.id === id);
  function add(e) {
    const b = blockOf(e.target.value);
    e.target.value = "";
    if (!b) return;
    const have = o.lines.findIndex((l) => l.block === b.id);
    if (have >= 0) onChange({ ...o, lines: o.lines.map((l, k) => (k === have ? { ...l, qty: l.qty + 1 } : l)) });
    else onChange({ ...o, lines: [...o.lines, lineFrom(b)] });
  }
  return (
    <section className={`qb-opt${recommended ? " is-rec" : ""}`}>
      <div className="qb-opt-head">
        <input className="qb-opt-label" value={o.label} onChange={(e) => onChange({ ...o, label: e.target.value })} aria-label={`Option ${i + 1} name`} />
        <button type="button" className={"achip" + (recommended ? " is-on" : "")} aria-pressed={recommended} onClick={onRecommend}>{recommended ? "★ Recommended" : "Make recommended"}</button>
      </div>
      {o.lines.length === 0 && <p className="gcard-meta">Empty. Empty options are left off the quote.</p>}
      <ul className="qb-lines">
        {o.lines.map((l, k) => (
          <Line key={`${l.block}-${k}`} l={l} block={blockOf(l.block)}
            onChange={(nl) => onChange({ ...o, lines: o.lines.map((x, j) => (j === k ? nl : x)) })}
            onRemove={() => onChange({ ...o, lines: o.lines.filter((_, j) => j !== k) })} />
        ))}
      </ul>
      <div className="qb-add">
        <select defaultValue="" onChange={add} aria-label={`Add to ${o.label}`}>
          <option value="" disabled>+ Add…</option>
          {blocks.map((b) => <option key={b.id} value={b.id}>{b.name}{b.flat ? ` · ${money(b.flat)}` : ""}</option>)}
        </select>
        {i > 0 && <button type="button" className="achip" onClick={onCopyPrev}>Copy the option before</button>}
      </div>
      <div className="qb-opt-foot">
        <span>{t.shootMin ? `On site ${aboutTime(t.shootMin)}` : "No time on site"}{t.editMin ? ` · editing ${aboutTime(t.editMin).replace("about ", "")}` : ""}</span>
        <strong>{money(t.total)}</strong>
      </div>
    </section>
  );
}

function Settings({ settings, onSaved }) {
  const [rate, setRate] = useState(String(settings.rate));
  const [blocks, setBlocks] = useState(settings.blocks);
  const [removed, setRemoved] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const set = (i, k) => (e) => setBlocks((bs) => bs.map((b, j) => (j === i ? { ...b, [k]: k === "name" || k === "unit" || k === "note" ? e.target.value : Math.max(0, Number(e.target.value) || 0) } : b)));
  async function save() {
    setBusy(true); setMsg("");
    try { const j = await api({ action: "settings", rate, blocks, removed }); onSaved(j.settings); setBlocks(j.settings.blocks); setMsg("Saved ✓ New quotes use these."); }
    catch (e) { setMsg(e.message); }
    finally { setBusy(false); }
  }
  return (
    <div className="qb-settings">
      <label className="cpn-f qb-rate"><span>Your hourly rate <small>shooting and editing</small></span>
        <span className="cpn-inline">$<input className="cpn-num" type="number" min="25" value={rate} onChange={(e) => setRate(e.target.value)} /> an hour</span>
      </label>
      <p className="gcard-meta">Time blocks: minutes for one, on site and at the desk. Flat blocks: a set price for one. Changing these never changes a quote you already sent.</p>
      <div className="qb-blocks">
        {blocks.map((b, i) => (
          <div key={b.id} className="qb-block">
            <label className="qb-bname"><span>Name</span><input value={b.name} onChange={set(i, "name")} /></label>
            <label><span>Per</span><input value={b.unit} onChange={set(i, "unit")} /></label>
            <label><span>Min on site</span><input type="number" min="0" value={b.shoot} onChange={set(i, "shoot")} /></label>
            <label><span>Min editing</span><input type="number" min="0" value={b.edit} onChange={set(i, "edit")} /></label>
            <label><span>Flat $</span><input type="number" min="0" value={b.flat} onChange={set(i, "flat")} /></label>
            <span className="qb-bprice">{money(optionTotals({ lines: [{ ...b, qty: 1 }] }, Number(rate) || 0).total)}</span>
            <button type="button" className="qb-link" onClick={() => { setRemoved((r) => [...r, b.id]); setBlocks((bs) => bs.filter((_, j) => j !== i)); }}>Remove</button>
          </div>
        ))}
      </div>
      <div className="gcard-actions">
        <button type="button" className="achip" onClick={() => setBlocks((bs) => [...bs, { id: "", name: "New block", unit: "each", shoot: 0, edit: 0, flat: 0, note: "" }])}>+ Add a block</button>
        <button type="button" className="abtn" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save blocks & rate"}</button>
        {msg && <span className="ix-flash">{msg}</span>}
      </div>
    </div>
  );
}

export default function QuoteBuilder({ initial = [], settings: initialSettings, prefill = null, asked = [] }) {
  const [list, setList] = useState(initial);
  const [settings, setSettings] = useState(initialSettings);
  const [q, setQ] = useState(() => blankQuote(prefill || {}));
  const [open, setOpen] = useState(Boolean(prefill) || initial.length === 0);
  const [showSettings, setShowSettings] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [made, setMade] = useState(null);
  const [msg, setMsg] = useState("");
  const say = (m) => { setMsg(m); setTimeout(() => setMsg(""), 3000); };
  const set = (k) => (e) => setQ((x) => ({ ...x, [k]: e.target.value }));
  const rate = settings.rate;
  const filled = q.options.filter((o) => o.lines.length);
  const totals = useMemo(() => q.options.map((o) => quoteTotals(o, { rate, credit: q.credit })), [q.options, rate, q.credit]);

  // Gift cards and credits this person can use (walk-in gift card, a
  // friend's link, a thank-you credit). Looked up from their email.
  const [credits, setCredits] = useState([]);
  async function findCredits(email) {
    const e = String(email || "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) { setCredits([]); return; }
    try { const j = await api({ action: "credits", email: e }); setCredits(j.credits || []); } catch { setCredits([]); }
  }
  useEffect(() => { if (prefill?.email) findCredits(prefill.email); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const sameCredit = (a, b) => Boolean(a && b && a.kind === b.kind && a.code === b.code);

  function setOption(i, o) { setQ((x) => ({ ...x, options: x.options.map((y, j) => (j === i ? o : y)) })); }

  async function create(e) {
    e.preventDefault();
    setErr("");
    // Empty options are dropped; the recommended one follows its option.
    const keep = q.options.map((o, i) => ({ o, i })).filter(({ o }) => o.lines.length);
    const rec = Math.max(0, keep.findIndex(({ i }) => i === q.recommended));
    setBusy(true);
    try {
      const j = await api({ action: "create", quote: { ...q, rate, options: keep.map(({ o }) => o), recommended: rec } });
      setList(j.quotes);
      setMade({ url: j.url, copy: j.copy, phone: q.phone, email: q.email, name: q.name });
      setQ(blankQuote());
      setCredits([]);
    } catch (e2) { setErr(e2.message); }
    finally { setBusy(false); }
  }

  async function act(action, quote) {
    if (action === "delete" && !confirmTap(`Delete the quote for ${quote.name}? This can't be undone.`)) return;
    if (action === "void" && !confirmTap(`Void the quote for ${quote.name}? The link stops working.`)) return;
    try { const j = await api({ action, id: quote.id }); setList(j.quotes); say(action === "void" ? "Voided" : "Deleted"); }
    catch (e) { say(e.message); }
  }
  async function copy(text, what) {
    try { await navigator.clipboard.writeText(text); say(`${what} copied ✓`); } catch { window.prompt(`Copy the ${what.toLowerCase()}:`, text); }
  }

  return (
    <div className="qb">
      {msg && <p className="ix-flash qb-flash" role="status">{msg}</p>}

      {made && (
        <div className="cprof-card qb-made" role="status">
          <p className="qb-made-title"><strong>Quote ready for {made.name}.</strong> Nothing has been sent. Send it yourself:</p>
          <p className="qb-made-link"><a href={made.url} target="_blank" rel="noopener noreferrer">{made.url}</a></p>
          <div className="gcard-actions">
            {made.phone && <a className="abtn" href={`sms:${made.phone.replace(/[^\d+]/g, "")}?&body=${enc(made.copy.sms)}`}>Text it</a>}
            {made.email && <a className={"abtn" + (made.phone ? " abtn-ghost" : "")} href={`mailto:${made.email}?subject=${enc(made.copy.subject)}&body=${enc(made.copy.body)}`}>Email it</a>}
            <button type="button" className="achip" onClick={() => copy(made.url, "Link")}>Copy link</button>
            <button type="button" className="achip" onClick={() => setMade(null)}>Close</button>
          </div>
        </div>
      )}

      {!open ? (
        <button type="button" className="abtn" onClick={() => { setOpen(true); setMade(null); }}>+ New quote</button>
      ) : (
        <form className="cprof-card qb-form" onSubmit={create}>
          <h2 className="cpn-h">New quote</h2>
          {asked.length > 0 && (
            <div className="qb-asked">
              <p className="qb-asked-title">What they asked for</p>
              <dl>{asked.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
            </div>
          )}
          <div className="cpn-row">
            <label className="cpn-f"><span>Name *</span><input value={q.name} onChange={set("name")} required /></label>
            <label className="cpn-f"><span>Email * <small>the receipt goes here</small></span><input type="email" value={q.email} onChange={(e) => setQ((x) => ({ ...x, email: e.target.value, credit: null }))} onBlur={(e) => findCredits(e.target.value)} required /></label>
          </div>
          <div className="cpn-row">
            <label className="cpn-f"><span>Phone</span><input type="tel" value={q.phone} onChange={set("phone")} /></label>
            <label className="cpn-f"><span>Business</span><input value={q.business} onChange={set("business")} /></label>
          </div>
          <label className="cpn-f"><span>Shoot date or timing <small>shows on the quote</small></span><input value={q.when} onChange={set("when")} placeholder="Saturday, December 6 · early December · to be set together" /></label>

          {credits.length > 0 && (
            <div className="qb-credits">
              <p className="qb-asked-title">They have money to use</p>
              <div className="gcard-actions">
                {credits.map((c) => {
                  const on = sameCredit(q.credit, c);
                  return <button type="button" key={c.kind + c.code} className={"achip" + (on ? " is-on" : "")} aria-pressed={on} onClick={() => setQ((x) => ({ ...x, credit: on ? null : c }))}>{on ? "✓ " : ""}Take {money(c.amount)} off · {c.label}</button>;
                })}
              </div>
              <p className="gcard-meta">{q.credit ? `${money(q.credit.amount)} comes off whichever option they pick. It is only spent when they pay.` : "Tap one to take it off this quote. Only one per quote."}{credits.some((c) => c.kind === "referral") ? " With a friend's link, the friend earns $100 when this is paid." : ""}</p>
            </div>
          )}

          <p className="gcard-meta qb-rate-line">Priced at <strong>{money(rate)} an hour</strong> for shooting and editing, plus flat extras. <button type="button" className="qb-link" onClick={() => setShowSettings(true)}>Change blocks & rate</button></p>

          <div className="qb-opts">
            {q.options.map((o, i) => (
              <OptionCard key={i} o={o} i={i} rate={rate} blocks={settings.blocks} recommended={q.recommended === i}
                onChange={(no) => setOption(i, no)}
                onRecommend={() => setQ((x) => ({ ...x, recommended: i }))}
                onCopyPrev={() => setOption(i, { ...o, lines: q.options[i - 1].lines.map((l) => ({ ...l })) })} />
            ))}
          </div>

          <label className="cpn-f"><span>A note for them <small>optional, shows above the options, your words</small></span><textarea rows={3} value={q.note} onChange={set("note")} /></label>

          {err && <p className="cform-error">{err}</p>}
          <div className="gcard-actions">
            <button type="submit" className="abtn" disabled={busy || !filled.length}>{busy ? "Making it…" : `Make the quote link${filled.length ? ` (${filled.map((o, k) => money(totals[q.options.indexOf(o)].total)).join(" / ")})` : ""}`}</button>
            <button type="button" className="achip" onClick={() => { setOpen(false); setQ(blankQuote()); setErr(""); }}>Cancel</button>
          </div>
          <p className="gcard-meta">Good for {QUOTE_DAYS} days. They pick one, sign, and pay in full on the same page.</p>
        </form>
      )}

      <h2 className="cpn-h">Your quotes{list.length ? ` (${list.length})` : ""}</h2>
      {list.length === 0 ? <p className="gcard-meta">None yet.</p> : (
        <ul className="cpn-list">
          {list.map((x) => {
            const st = statusOf(x);
            const url = `${typeof window === "undefined" ? "" : window.location.origin}/q/${x.token}`;
            return (
              <li key={x.id} className={`cprof-card cpn-card qb-card is-${st.key}`}>
                <div className="cpn-top">
                  <strong>{x.business || x.name}</strong>
                  <span className={`cpn-status is-${st.key === "paid" ? "live" : st.key === "sent" || st.key === "signed" ? "soon" : "ended"}`}>{st.label}</span>
                </div>
                <p className="gcard-meta">{x.business ? `${x.name} · ` : ""}{x.email} · made {day(x.sentAt || x.createdAt)}{x.credit ? ` · ${money(x.credit.amount)} off (${x.credit.label})` : ""}</p>
                <ul className="qb-card-opts">
                  {(x.options || []).map((o, k) => (
                    <li key={k} className={x.picked === k ? "is-picked" : ""}>
                      <span>{o.label}{x.recommended === k ? " ★" : ""}{x.picked === k ? " · picked" : ""}</span>
                      <b>{money(quoteTotals(o, x).total)}</b>
                    </li>
                  ))}
                </ul>
                <div className="gcard-actions">
                  <button type="button" className="achip" onClick={() => copy(url, "Link")}>Copy link</button>
                  <a className="achip" href={`/q/${x.token}`} target="_blank" rel="noopener noreferrer">Open</a>
                  {x.phone && <a className="achip" href={`sms:${x.phone.replace(/[^\d+]/g, "")}`}>Text</a>}
                  {st.key !== "paid" && st.key !== "void" && <button type="button" className="achip" onClick={() => act("void", x)}>Void</button>}
                  {st.key !== "paid" && <button type="button" className="achip" onClick={() => act("delete", x)}>Delete</button>}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <h2 className="cpn-h">Blocks & rate</h2>
      {showSettings ? (
        <Settings settings={settings} onSaved={setSettings} />
      ) : (
        <button type="button" className="achip" onClick={() => setShowSettings(true)}>Show your blocks & rate ({money(rate)}/hr · {settings.blocks.length} blocks)</button>
      )}
    </div>
  );
}
