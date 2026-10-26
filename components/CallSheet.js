"use client";

// The call sheet as crew read it: one page, phone-first, printable.
import { useEffect, useState } from "react";
import { WMO, droneGo } from "../lib/weather";

const fmtDate = (d) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }) : "Date TBD");
const fmt12 = (t) => { if (!t) return "—"; const [h, m] = t.split(":").map(Number); return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`; };
const tel = (v) => (v || "").replace(/[^\d+]/g, "");
const maps = (addr, lat, lng) => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(lat && lng ? `${lat},${lng}` : addr || "")}`;
const fmtSecs = (s) => (s ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : "");

export default function CallSheet({ sheet: sh, token, print = false, embedded = false }) {
  const [name, setName] = useState("");
  const [ack, setAck] = useState("");
  useEffect(() => { try { setName(localStorage.getItem("rm-crew-name") || ""); } catch {} if (print) setTimeout(() => window.print(), 400); }, [print]);
  async function confirm() {
    const n = name.trim(); if (!n) return;
    try { localStorage.setItem("rm-crew-name", n); } catch {}
    const staff = sh.crew.find((c) => c.name.toLowerCase() === n.toLowerCase());
    const res = await fetch("/api/crew", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, action: "confirm", name: n, staffId: staff?.id }) });
    setAck(res.ok ? `Got it, ${n.split(" ")[0]} — see you at ${fmt12(staff?.call || sh.general_call)}.` : "Couldn't record that — text Brandon instead.");
  }
  const w = sh.weather;
  return (
    <article className={"callsheet" + (embedded ? " is-embedded" : "")}>
      <header className="cs-head">
        <div>
          <span className="kick-sm">Call sheet{sh.version ? ` · v${sh.version}` : " · draft"}{sh.issued_at ? ` · issued ${new Date(sh.issued_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}` : ""}</span>
          <h1>{sh.project?.title || "Roth Media"}</h1>
          <p className="cs-sub">{sh.shoot.title} · {fmtDate(sh.shoot.date)}</p>
        </div>
        <div className="cs-calls">
          <div><span className="kick-sm">General call</span><strong>{fmt12(sh.general_call)}</strong></div>
          {sh.first_shot && <div><span className="kick-sm">First shot</span><strong>{fmt12(sh.first_shot)}</strong></div>}
          {sh.wrap_est && <div><span className="kick-sm">Est. wrap</span><strong>{fmt12(sh.wrap_est)}</strong></div>}
        </div>
      </header>

      <section className="cs-grid">
        <div className="cs-box">
          <span className="kick-sm">Sun & weather</span>
          <p>☀ up {fmt12(sh.sunrise)} · down {fmt12(sh.sunset)}{sh.golden ? ` · golden from ${fmt12(sh.golden)}` : ""}</p>
          {w ? <p>{WMO(w.code)} · {w.hi}° / {w.lo}° · rain {w.precip ?? "—"}% · wind {w.wind} mph{w.gusts ? ` (gusts ${w.gusts})` : ""}{droneGo(w) ? ` · drone: ${droneGo(w).toUpperCase()}` : ""}</p> : <p className="gcard-meta">Weather appears once the day has a located address.</p>}
        </div>
        <div className="cs-box">
          <span className="kick-sm">Production</span>
          <p>Brandon Roth — <a href={`tel:${tel(sh.production_phone || "845-549-4425")}`}>{sh.production_phone || "845-549-4425"}</a></p>
          {sh.walkie && <p>Walkie: {sh.walkie}</p>}
          {sh.project?.client_name && <p>Client: {sh.project.client_name}</p>}
        </div>
        <div className="cs-box cs-emergency">
          <span className="kick-sm">Emergency</span>
          <p>911 · nearest hospital: <strong>{sh.hospital || "— set on the location —"}</strong></p>
          {sh.safety && <p>{sh.safety}</p>}
        </div>
      </section>

      <section className="cs-box">
        <span className="kick-sm">Location</span>
        <p><strong>{sh.location?.name || sh.shoot.title}</strong><br />{sh.shoot.address || sh.location?.address || "address TBD"} · <a href={maps(sh.shoot.address || sh.location?.address, sh.shoot.lat, sh.shoot.lng)} target="_blank" rel="noreferrer">Directions ↗</a></p>
        {(sh.location?.contact_name || sh.location?.contact_phone) && <p>On site: {sh.location.contact_name}{sh.location.contact_phone ? <> — <a href={`tel:${tel(sh.location.contact_phone)}`}>{sh.location.contact_phone}</a></> : null}</p>}
        {sh.parking && <p>Parking / load-in: {sh.parking}</p>}
        {sh.location?.blackout && <p>Do not film: {sh.location.blackout}</p>}
        {sh.location?.access_hours && <p>Access: {sh.location.access_hours}</p>}
        {sh.location?.sound && <p>Sound: {sh.location.sound}</p>}
      </section>

      {(sh.scenes.length > 0 || sh.flow.length > 0) && (
        <section className="cs-box">
          <span className="kick-sm">Schedule</span>
          {sh.flow.length > 0 && <ol className="cs-sched">{sh.flow.map((f, i) => <li key={i}><span className="cs-time">{f.time ? fmt12(f.time) : ""}</span><span>{f.text}</span></li>)}</ol>}
          {sh.scenes.length > 0 && <><span className="kick-sm">Scenes today</span><ul className="cs-scenes">{sh.scenes.map((sc) => <li key={sc.id}><strong>{sc.number}. {sc.title}</strong>{sc.purpose ? ` — ${sc.purpose}` : ""}{sc.est_seconds ? ` (${fmtSecs(sc.est_seconds)})` : ""}</li>)}</ul></>}
        </section>
      )}

      {sh.cast.length > 0 && (
        <section className="cs-box">
          <span className="kick-sm">On camera</span>
          <table className="cs-table"><tbody>{sh.cast.map((p) => <tr key={p.id}><td><strong>{p.name}</strong><br /><em>{p.role}</em></td><td className="cs-time">{p.call ? fmt12(p.call) : ""}</td><td>{p.phone ? <a href={`tel:${tel(p.phone)}`}>{p.phone}</a> : ""}{p.note ? <><br />{p.note}</> : null}</td></tr>)}</tbody></table>
        </section>
      )}

      <section className="cs-box">
        <span className="kick-sm">Crew</span>
        <table className="cs-table"><tbody>
          <tr><td><strong>Brandon Roth</strong><br /><em>Director / DP</em></td><td className="cs-time">{fmt12(sh.general_call)}</td><td><a href={`tel:${tel(sh.production_phone || "845-549-4425")}`}>{sh.production_phone || "845-549-4425"}</a></td></tr>
          {sh.crew.map((c) => <tr key={c.id} className={c.confirmed_at ? "is-ok" : ""}><td><strong>{c.name}</strong>{c.confirmed_at ? " ✓" : ""}<br /><em>{c.position}</em></td><td className="cs-time">{fmt12(c.call)}</td><td>{c.phone ? <a href={`tel:${tel(c.phone)}`}>{c.phone}</a> : ""}{c.note ? <><br />{c.note}</> : null}</td></tr>)}
        </tbody></table>
      </section>

      {sh.gear.length > 0 && <section className="cs-box"><span className="kick-sm">Kit</span><p className="cs-kit">{sh.gear.map((g) => g.text).join(" · ")}</p></section>}
      {sh.meals && <section className="cs-box"><span className="kick-sm">Meals</span><p>{sh.meals}</p></section>}
      {sh.notes && <section className="cs-box"><span className="kick-sm">Notes</span><p className="cs-pre">{sh.notes}</p></section>}
      {sh.advance && <section className="cs-box"><span className="kick-sm">Advance — tomorrow</span><p className="cs-pre">{sh.advance}</p></section>}

      {!embedded && (
        <section className="cs-box cs-ack">
          <span className="kick-sm">Confirm you've read it</span>
          {ack ? <p><strong>{ack}</strong></p> : (
            <div className="prep-add"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" aria-label="Your name" /><button type="button" className="abtn" disabled={!name.trim()} onClick={confirm}>Got it ✓</button></div>
          )}
          <p className="gcard-meta">Call times can change — the latest version is always at this link. <a href={`/crew/${token}`}>Day ticklist →</a> · <a href={`/call/${token}?print=1`}>Print</a></p>
        </section>
      )}
    </article>
  );
}
