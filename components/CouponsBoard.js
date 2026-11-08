"use client";

// Studio → Money → Coupons (2026-11-08). Make a code clients type on the
// quote page or the pay page: % off or $ off, on everything or just some
// packages, with optional dates, one client only, and a use limit.
// Pause / resume / delete. Saved through /api/admin/coupons.

import { useState } from "react";

const SITE = "https://rothmediaco.com";
const blank = { code: "", label: "", type: "pct", value: "", all: true, only: {}, starts: "", ends: "", email: "", maxUses: "" };
const money = (n) => `$${Number(n).toLocaleString("en-US")}`;
const day = (d) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "");
const today = () => new Date().toISOString().slice(0, 10);

async function api(payload) {
  const res = await fetch("/api/admin/coupons", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error || "That didn't save");
  return j;
}

function status(c) {
  if (c.off) return { key: "paused", label: "Paused" };
  if (c.starts && today() < c.starts) return { key: "soon", label: `Starts ${day(c.starts)}` };
  if (c.ends && today() > c.ends) return { key: "ended", label: "Ended" };
  if (c.maxUses && c.uses >= c.maxUses) return { key: "ended", label: "Used up" };
  return { key: "live", label: "Live" };
}

export default function CouponsBoard({ initial = [], menu = [] }) {
  const [list, setList] = useState(initial);
  const [f, setF] = useState(blank);
  const [editId, setEditId] = useState(null);
  const [open, setOpen] = useState(initial.length === 0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const nameOf = (cat, id) => menu.find((m) => m.id === cat)?.packages.find((p) => p.id === id)?.name || id;
  const coversText = (only) => !only ? "Everything" : Object.entries(only).map(([cat, ids]) => `${menu.find((m) => m.id === cat)?.title}: ${ids.map((id) => nameOf(cat, id)).join(", ")}`).join(" · ");
  const say = (m) => { setMsg(m); setTimeout(() => setMsg(""), 3000); };

  function togglePkg(cat, id) {
    setF((x) => {
      const cur = x.only[cat] || [];
      const next = cur.includes(id) ? cur.filter((y) => y !== id) : [...cur, id];
      return { ...x, all: false, only: { ...x.only, [cat]: next } };
    });
  }
  function makeCode() {
    const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let s = ""; for (let i = 0; i < 5; i++) s += abc[Math.floor(Math.random() * abc.length)];
    setF((x) => ({ ...x, code: `ROTH-${s}` }));
  }
  function startEdit(c) {
    setEditId(c.id);
    setF({ code: c.code, label: c.label === c.code ? "" : c.label, type: c.type, value: String(c.value), all: !c.only, only: c.only || {}, starts: c.starts || "", ends: c.ends || "", email: c.email || "", maxUses: c.maxUses ? String(c.maxUses) : "" });
    setOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save(e) {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      const coupon = { ...f, only: f.all ? null : f.only, off: editId ? list.find((c) => c.id === editId)?.off : false };
      const j = await api({ action: "save", id: editId, coupon });
      setList(j.coupons); setF(blank); setEditId(null); setOpen(false);
      say(editId ? "Saved." : `${coupon.code.toUpperCase()} is live.`);
    } catch (x) { setErr(x.message); } finally { setBusy(false); }
  }
  async function act(action, c) {
    if (action === "delete" && !window.confirm(`Delete ${c.code}? It stops working right away. Bookings already paid with it are not affected.`)) return;
    try { const j = await api({ action, id: c.id }); setList(j.coupons); say(action === "pause" ? `${c.code} paused.` : action === "resume" ? `${c.code} is live again.` : `${c.code} deleted.`); }
    catch (x) { setErr(x.message); }
  }
  async function copy(text, what) {
    try { await navigator.clipboard.writeText(text); say(`${what} copied.`); } catch { window.prompt("Copy:", text); }
  }

  return (
    <div className="cpn">
      <p className="inbox-hint">Make a code your clients type on the quote page or the pay page. One code per booking; it never stacks with another code. Travel, websites and ads are never discounted.</p>
      {msg && <p className="clients-flash" role="status">{msg}</p>}
      {err && <p className="cform-error" role="alert">{err}</p>}

      {!open ? (
        <button type="button" className="abtn" onClick={() => { setF(blank); setEditId(null); setOpen(true); }}>+ New coupon</button>
      ) : (
        <form className="cprof-card cpn-form" onSubmit={save}>
          <div className="cprof-cardhead"><h2>{editId ? `Edit ${f.code}` : "New coupon"}</h2><button type="button" className="achip" onClick={() => { setOpen(false); setEditId(null); setF(blank); setErr(""); }}>Cancel</button></div>

          <div className="cpn-row">
            <label className="cpn-f"><span>Code</span>
              <span className="cpn-inline"><input value={f.code} onChange={(e) => setF((x) => ({ ...x, code: e.target.value.toUpperCase().replace(/\s+/g, "") }))} placeholder="WINTER20" required maxLength={24} disabled={Boolean(editId)} />{!editId && <button type="button" className="achip" onClick={makeCode}>Make one up</button>}</span>
            </label>
            <label className="cpn-f"><span>Name <small>what clients see, optional</small></span><input value={f.label} onChange={set("label")} placeholder="Winter special" maxLength={60} /></label>
          </div>

          <div className="cpn-row">
            <div className="cpn-f"><span>Takes off</span>
              <span className="cpn-inline">
                <button type="button" className={"achip" + (f.type === "pct" ? " is-on" : "")} aria-pressed={f.type === "pct"} onClick={() => setF((x) => ({ ...x, type: "pct" }))}>% off</button>
                <button type="button" className={"achip" + (f.type === "amount" ? " is-on" : "")} aria-pressed={f.type === "amount"} onClick={() => setF((x) => ({ ...x, type: "amount" }))}>$ off</button>
                <input className="cpn-num" type="number" min="1" max={f.type === "pct" ? 100 : undefined} value={f.value} onChange={set("value")} placeholder={f.type === "pct" ? "20" : "100"} required aria-label={f.type === "pct" ? "Percent off" : "Dollars off"} />
                <em>{f.type === "pct" ? "%" : "dollars"}</em>
              </span>
            </div>
          </div>

          <div className="cpn-f"><span>Works on</span>
            <label className="cpn-check"><input type="checkbox" checked={f.all} onChange={(e) => setF((x) => ({ ...x, all: e.target.checked }))} /> Everything</label>
            {!f.all && (
              <div className="cpn-cats">
                {menu.map((m) => (
                  <div key={m.id} className="cpn-cat">
                    <strong>{m.title}</strong>
                    {m.packages.map((p) => (
                      <label key={p.id} className="cpn-check"><input type="checkbox" checked={(f.only[m.id] || []).includes(p.id)} onChange={() => togglePkg(m.id, p.id)} /> {p.name} <small>{money(p.price)}</small></label>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="cpn-row">
            <label className="cpn-f"><span>Starts <small>optional</small></span><input type="date" value={f.starts} onChange={set("starts")} /></label>
            <label className="cpn-f"><span>Ends <small>optional, last day it works</small></span><input type="date" value={f.ends} onChange={set("ends")} /></label>
          </div>
          <div className="cpn-row">
            <label className="cpn-f"><span>Only for this client <small>email, optional</small></span><input type="email" value={f.email} onChange={set("email")} placeholder="kaci@bakeagainstthegrain.com" /></label>
            <label className="cpn-f"><span>How many times it can be used <small>optional</small></span><input type="number" min="0" value={f.maxUses} onChange={set("maxUses")} placeholder="No limit" /></label>
          </div>

          <button type="submit" className="abtn" disabled={busy}>{busy ? "Saving…" : editId ? "Save changes" : "Make this coupon"}</button>
        </form>
      )}

      <h2 className="cpn-h">Your coupons{list.length ? ` (${list.length})` : ""}</h2>
      {list.length === 0 ? <p className="gcard-meta">None yet.</p> : (
        <ul className="cpn-list">
          {list.map((c) => {
            const st = status(c);
            return (
              <li key={c.id} className={`cprof-card cpn-card is-${st.key}`}>
                <div className="cpn-top">
                  <code className="cpn-code">{c.code}</code>
                  <span className={`cpn-status is-${st.key}`}>{st.label}</span>
                </div>
                <p className="cpn-what"><strong>{c.type === "amount" ? `${money(c.value)} off` : `${c.value}% off`}</strong>{c.label && c.label !== c.code ? ` · “${c.label}”` : ""}</p>
                <p className="gcard-meta">
                  {coversText(c.only)}
                  {c.starts ? ` · from ${day(c.starts)}` : ""}{c.ends ? ` · until ${day(c.ends)}` : ""}
                  {c.email ? ` · only ${c.email}` : ""}
                  {` · used ${c.uses}${c.maxUses ? ` of ${c.maxUses}` : ""} time${c.uses === 1 ? "" : "s"}`}
                </p>
                <div className="gcard-actions">
                  <button type="button" className="achip" onClick={() => copy(c.code, "Code")}>Copy code</button>
                  <button type="button" className="achip" onClick={() => copy(`${SITE}/quote?code=${encodeURIComponent(c.code)}`, "Quote link with the code")}>Copy link</button>
                  <button type="button" className="achip" onClick={() => startEdit(c)}>Edit</button>
                  {c.off ? <button type="button" className="achip" onClick={() => act("resume", c)}>Turn back on</button> : <button type="button" className="achip" onClick={() => act("pause", c)}>Pause</button>}
                  <button type="button" className="achip" onClick={() => act("delete", c)}>Delete</button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
