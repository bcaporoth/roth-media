"use client";

// The crew page: one shoot, on a second shooter's phone. Flow as Now/Next,
// reminders as the roll gate, shots to tick — the same checklist Brandon is
// ticking, so the % at the top moves for both of you. Polls every 20s.

import { useEffect, useMemo, useState } from "react";
import { GROUPS, GROUP_LABEL, groupOf, usesSun, showsGroup, ROLL_GATE } from "../lib/shoot-guides";
import { timing, fmt12 } from "../lib/sun";
import { mapsUrl } from "../lib/geo";
import { SHOOT_KIND_LABEL as KIND_LABEL } from "../lib/studio-labels";

const fmtDate = (d) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" }) : "No date");
// What counts toward the day: flow + shots + poses (+ camera). Gear is packing, wrap is Brandon's.
const COUNTED = new Set(["flow", "camera", "shots", "poses"]);

export default function CrewDay({ token, initial }) {
  const [shoot, setShoot] = useState(initial.shoot);
  const [items, setItems] = useState(initial.checklist.map((c) => ({ ...c, group: groupOf(c) })));
  const [err, setErr] = useState("");
  const [hit, setHit] = useState(null);
  const t = useMemo(() => timing(shoot), [shoot]);

  async function call(payload) {
    const res = await fetch("/api/crew", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, ...payload }) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(j.error || "Couldn't reach the day");
    setShoot(j.shoot); setItems(j.checklist.map((c) => ({ ...c, group: groupOf(c) })));
  }
  useEffect(() => {
    const id = setInterval(() => call({ action: "load" }).catch(() => {}), 20000);
    const onShow = () => document.visibilityState === "visible" && call({ action: "load" }).catch(() => {});
    document.addEventListener("visibilitychange", onShow);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", onShow); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);
  useEffect(() => { if (hit === null) return; const x = setTimeout(() => setHit(null), 3500); return () => clearTimeout(x); }, [hit]);

  async function tick(c) {
    const done = !c.done;
    setItems((list) => list.map((x) => (x === c ? { ...x, done } : x)));
    setErr("");
    try { await call({ action: "tick", group: c.group, text: c.text, done }); } catch (e) { setErr(e.message); }
  }

  const counted = items.filter((c) => COUNTED.has(c.group));
  const pct = counted.length ? Math.round((counted.filter((c) => c.done).length / counted.length) * 100) : 0;
  const flowAll = items.filter((c) => c.group === "flow");
  const flow = [...flowAll.filter((c) => c.time).sort((a, b) => a.time.localeCompare(b.time)), ...flowAll.filter((c) => !c.time)];
  const ni = flow.findIndex((c) => !c.done);
  const now = ni >= 0 ? flow[ni] : null;
  const next = ni >= 0 ? flow[ni + 1] : null;
  const groups = GROUPS.filter((g) => g !== "flow" && g !== "gear" && g !== "camera" && showsGroup(shoot.kind, g));

  return (
    <div className="crew">
      <header className="crew-head">
        <span className="kick-sm">Roth Media · crew</span>
        <h1>{shoot.title}</h1>
        <p className="crew-meta">{fmtDate(shoot.date)} · {KIND_LABEL[shoot.kind] || "Shoot"}{shoot.client_name ? ` · ${shoot.client_name}` : ""}</p>
        <div className="crew-progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${pct}%` }} /><em>{pct}%</em></div>
        <div className="sday-strip">
          <div><span className="kick-sm">Start</span><strong>{t.start ? fmt12(t.start) : shoot.time_note || "TBD"}</strong></div>
          {usesSun(shoot.kind) && <div><span className="kick-sm">Sunset</span><strong>{t.sunset ? fmt12(t.sunset) : "—"}</strong><em>golden {t.golden ? fmt12(t.golden) : "—"}</em></div>}
        </div>
        {shoot.address && <a className="abtn" href={mapsUrl(shoot.address, shoot.lat, shoot.lng)} target="_blank" rel="noreferrer">Directions ↗ {shoot.address}</a>}
      </header>
      {err && <p className="cform-error">{err}</p>}

      <div className="rollgate" role="note" aria-label="Before you roll">
        <div className="rollgate-chips">
          {ROLL_GATE.map((g, i) => <button key={g.tag} type="button" className={"rollgate-chip" + (hit === i ? " is-hit" : "")} onClick={() => setHit(hit === i ? null : i)}>{g.tag}</button>)}
        </div>
        {hit !== null && <p className="rollgate-tip">{ROLL_GATE[hit].tip}</p>}
      </div>

      {flow.length > 0 && (
        <section className="nownext">
          {now ? (
            <>
              <div className="nownext-now">
                <span className="kick-sm">Now{now.time ? ` · ${fmt12(now.time)}` : ""}</span>
                <strong>{now.text}</strong>
                <button type="button" className="abtn" onClick={() => tick(now)}>Done →</button>
              </div>
              {next && <p className="nownext-next"><span className="kick-sm">Next{next.time ? ` · ${fmt12(next.time)}` : ""}</span> {next.text}</p>}
            </>
          ) : <p className="nownext-done">✓ Flow of the day — all done.</p>}
          <details className="nownext-all"><summary>Whole day ({flow.filter((c) => c.done).length}/{flow.length})</summary>
            <ul className="shoot-check">{flow.map((c, j) => <li key={`${c.text}-${j}`} className={c.done ? "is-done" : ""}><label><input type="checkbox" checked={Boolean(c.done)} onChange={() => tick(c)} /> <span>{c.time ? `${fmt12(c.time)} · ` : ""}{c.text}</span></label></li>)}</ul>
          </details>
        </section>
      )}

      {groups.map((g) => {
        const list = items.filter((c) => c.group === g);
        if (!list.length) return null;
        return (
          <section key={g} className="prep-list daylist">
            <div className="shoot-sec-head"><span className="kick-sm">{GROUP_LABEL[g]} · {list.filter((c) => c.done).length}/{list.length}</span></div>
            <ul className="shoot-check">
              {list.map((c, j) => (
                <li key={`${c.text}-${j}`} className={c.done ? "is-done" : ""}>
                  <label><input type="checkbox" checked={Boolean(c.done)} onChange={() => tick(c)} /> <span>{c.text}</span></label>
                  {c.img_url && <a className="pbook-thumb" href={c.img_url} target="_blank" rel="noreferrer"><img src={c.img_url} alt="" loading="lazy" /></a>}
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      {shoot.notes && <section className="sday-notes-ro"><span className="kick-sm">Notes</span><p>{shoot.notes}</p></section>}
      <p className="crew-foot">Ticks save for both of you. Pull down to refresh if it looks stale.</p>
    </div>
  );
}
