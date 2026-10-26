"use client";

// Sprint 2 UI: the call-sheet editor for a day (crew calls, cast calls,
// meals, notes, advance → Issue → text everyone the link), scene strips on
// a day, and the Media card (cards → rolls → drives with the two-copies gate).
import { useState } from "react";
import { P } from "./ProductionCards";
import { WMO, droneGo } from "../lib/weather";

const fmtDate = (d) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : "No date");
const fmt12 = (t) => { if (!t) return "—"; const [h, m] = t.split(":").map(Number); return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`; };
const tel = (v) => (v || "").replace(/[^\d+]/g, "");
async function shootApi(payload) {
  const res = await fetch("/api/admin/shoots", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const j = await res.json().catch(() => ({})); if (!res.ok) throw new Error(j.error || "Couldn't save"); return j;
}

// ── Call sheet editor (a drawer under the day row) ──
export function CallSheetEditor({ project, day, team = [], people = [], scenes = [], onSaved, fail, say }) {
  const cs0 = day.callsheet || {};
  const [cs, setCs] = useState({ general_call: cs0.general_call || day.start_time || "", first_shot: cs0.first_shot || "", wrap_est: cs0.wrap_est || "", meals: cs0.meals || "", notes: cs0.notes || "", advance: cs0.advance || "", walkie: cs0.walkie || "", safety: cs0.safety || "", version: cs0.version || 0, issued_at: cs0.issued_at || null, crew: cs0.crew || [], cast: cs0.cast || [], acks: cs0.acks || [] });
  const [sceneIds, setSceneIds] = useState(day.scene_ids || []);
  const [busy, setBusy] = useState(false);
  const url = day.crew_token ? `https://rothmediaco.com/call/${day.crew_token}` : "";
  const crewRow = (id) => cs.crew.find((x) => x.staff_id === id) || { staff_id: id, call: "", note: "", on: true };
  const setCrew = (id, patch) => setCs((c) => ({ ...c, crew: [...c.crew.filter((x) => x.staff_id !== id), { ...crewRow(id), ...patch }] }));
  const castToday = people.filter((p) => p.kind === "interview" && p.shoot_id === day.id);
  const castRow = (id) => cs.cast.find((x) => x.person_id === id) || { person_id: id, call: "", note: "" };
  const setCast = (id, patch) => setCs((c) => ({ ...c, cast: [...c.cast.filter((x) => x.person_id !== id), { ...castRow(id), ...patch }] }));
  async function save(issue = false) {
    setBusy(true);
    const next = issue ? { ...cs, version: (cs.version || 0) + 1, issued_at: new Date().toISOString() } : cs;
    try { const r = await shootApi({ action: "update", id: day.id, callsheet: next, scene_ids: sceneIds }); setCs(next); onSaved?.(r.shoot); say(issue ? `Call sheet v${next.version} issued — now text the crew` : "Saved"); }
    catch (e) { fail(e); } finally { setBusy(false); }
  }
  const msg = (c) => `Call sheet — ${project.title}, ${fmtDate(day.date)}. Your call: ${fmt12(crewRow(c.id).call || cs.general_call)}. Everything's here: ${url} — tap "Got it" at the bottom. — Brandon`;
  const w = day.weather;
  return (
    <div className="cse">
      <div className="cse-top">
        <span className="kick-sm">Call sheet {cs.version ? `v${cs.version}` : "— not issued yet"}</span>
        {w && <span className="gcard-meta">{WMO(w.code)} · {w.hi}°/{w.lo}° · rain {w.precip ?? "—"}% · wind {w.wind} mph{droneGo(w) ? ` · drone ${droneGo(w)}` : ""} · ☀ {fmt12(w.sunrise)}–{fmt12(w.sunset)}</span>}
      </div>
      <div className="shoot-new scene-fields">
        <label>General call<input type="time" value={cs.general_call} onChange={(e) => setCs({ ...cs, general_call: e.target.value })} /></label>
        <label>First shot<input type="time" value={cs.first_shot} onChange={(e) => setCs({ ...cs, first_shot: e.target.value })} /></label>
        <label>Est. wrap<input type="time" value={cs.wrap_est} onChange={(e) => setCs({ ...cs, wrap_est: e.target.value })} /></label>
        <label>Walkie channel<input value={cs.walkie} onChange={(e) => setCs({ ...cs, walkie: e.target.value })} placeholder="Ch 1 — production" /></label>
        <label className="wide">Meals<input value={cs.meals} onChange={(e) => setCs({ ...cs, meals: e.target.value })} placeholder="Lunch 12:30 — Market St Brewing, production buys · crafty in the van" /></label>
        <label className="wide">Safety / notes for the day<textarea rows={2} value={cs.safety} onChange={(e) => setCs({ ...cs, safety: e.target.value })} placeholder="Bell tower: ladder only with a spotter. Quiet during 8am Mass — no comms." /></label>
        <label className="wide">Notes<textarea rows={2} value={cs.notes} onChange={(e) => setCs({ ...cs, notes: e.target.value })} placeholder="Dress dark, no logos. Fr. Jim prefers 'Father'. Park behind the rectory." /></label>
        <label className="wide">Advance — tomorrow<input value={cs.advance} onChange={(e) => setCs({ ...cs, advance: e.target.value })} placeholder="Tue: b-roll day, Market St + river, call 6:30am for sunrise" /></label>
      </div>

      <div className="cse-block">
        <span className="kick-sm">Scenes on this day</span>
        <span className="pbook-kinds">{scenes.map((sc) => <button key={sc.id} type="button" className={"ifilter" + (sceneIds.includes(sc.id) ? " is-on" : "")} onClick={() => setSceneIds((l) => (l.includes(sc.id) ? l.filter((x) => x !== sc.id) : [...l, sc.id]))}>{sc.number}. {sc.title}</button>)}{scenes.length === 0 && <em className="gcard-meta">No scenes yet — add them on the Story tab.</em>}</span>
      </div>

      <div className="cse-block">
        <span className="kick-sm">Crew calls</span>
        <table className="cs-table cse-table"><tbody>
          {team.map((c) => { const r = crewRow(c.id); return (
            <tr key={c.id} className={r.on === false ? "is-off" : ""}>
              <td><label className="cse-on"><input type="checkbox" checked={r.on !== false} onChange={(e) => setCrew(c.id, { on: e.target.checked })} /> <strong>{c.name}</strong></label><br /><em>{c.position || c.title || "Crew"}</em></td>
              <td><input type="time" value={r.call} onChange={(e) => setCrew(c.id, { call: e.target.value })} aria-label={`Call for ${c.name}`} /></td>
              <td><input value={r.note} onChange={(e) => setCrew(c.id, { note: e.target.value })} placeholder="bring the slider" aria-label="Note" /></td>
              <td className="cse-ack">{r.confirmed_at ? <span className="itag is-rel">✓ got it</span> : cs.version ? <span className="itag">waiting</span> : null}{c.phone && url && <a className="achip" href={`sms:${tel(c.phone)}?&body=${encodeURIComponent(msg(c))}`}>Text</a>}</td>
            </tr>
          ); })}
          {team.length === 0 && <tr><td colSpan={4}><em className="gcard-meta">Nobody on the team yet — add staff on this tab.</em></td></tr>}
        </tbody></table>
      </div>

      {castToday.length > 0 && (
        <div className="cse-block">
          <span className="kick-sm">On camera today</span>
          <table className="cs-table cse-table"><tbody>
            {castToday.map((p) => { const r = castRow(p.id); return <tr key={p.id}><td><strong>{p.name}</strong><br /><em>{p.role}</em></td><td><input type="time" value={r.call} onChange={(e) => setCast(p.id, { call: e.target.value })} aria-label={`Call for ${p.name}`} /></td><td><input value={r.note} onChange={(e) => setCast(p.id, { note: e.target.value })} placeholder="wear what you'd wear to Mass" /></td><td>{p.phone && url && <a className="achip" href={`sms:${tel(p.phone)}?&body=${encodeURIComponent(`Hi ${p.name.split(" ")[0]} — filming ${fmtDate(day.date)}, we'd love you at ${fmt12(r.call || cs.general_call)} at ${day.address || "the church"}. Details: ${url} — Brandon`)}`}>Text</a>}</td></tr>; })}
          </tbody></table>
        </div>
      )}

      {(cs.acks || []).length > 0 && <p className="gcard-meta">Confirmed: {cs.acks.map((a) => a.name).join(", ")}</p>}
      <div className="gcard-actions">
        <button type="button" className="achip" disabled={busy} onClick={() => save(false)}>Save draft</button>
        <button type="button" className="abtn" disabled={busy} onClick={() => save(true)}>{cs.version ? `Issue v${cs.version + 1}` : "Issue call sheet"}</button>
        {url && <a className="achip" href={url} target="_blank" rel="noreferrer">Open ↗</a>}
        {url && <a className="achip" href={`${url}?print=1`} target="_blank" rel="noreferrer">Print</a>}
        {url && <button type="button" className="achip" onClick={() => navigator.clipboard?.writeText(url).then(() => say("Link copied"))}>Copy link</button>}
      </div>
    </div>
  );
}

// ── Media: cards → rolls → drives ──
const ROLE_LABEL = { working: "Working", mirror: "Mirror", offsite: "Offsite / cloud", archive: "Archive", shuttle: "Shuttle" };
const STATUS_LABEL = { in_camera: "In camera", offloading: "Offloading", copy1: "1 copy ✓", copy2: "2 copies", cleared: "Cleared to format", formatted: "Formatted" };
export function MediaCard({ project, media, setMedia, days, fail, say, ready }) {
  const [tab, setTab] = useState("rolls");
  if (!ready) return <section className="cprof-card"><div className="cprof-cardhead"><h2>Media</h2></div><p className="sm-sqlhint">The media chain needs <code>supabase/sprint2.sql</code> run once in the Supabase SQL editor.</p></section>;
  const { cards, drives, rolls } = media;
  const set = (k, fn) => setMedia((m) => ({ ...m, [k]: fn(m[k]) }));
  const code = project.code || "PROJ";
  const todayCode = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" }).slice(2).replace(/-/g, "");
  async function addCard(e) { e.preventDefault(); const f = Object.fromEntries(new FormData(e.currentTarget).entries()); try { const r = await P({ action: "card-add", projectId: project.id, ...f }); set("cards", (l) => [...l, r.card]); e.target.reset(); } catch (err) { fail(err); } }
  async function addDrive(e) { e.preventDefault(); const f = Object.fromEntries(new FormData(e.currentTarget).entries()); try { const r = await P({ action: "drive-add", projectId: project.id, ...f }); set("drives", (l) => [...l, r.drive]); e.target.reset(); } catch (err) { fail(err); } }
  async function addRoll(e) {
    e.preventDefault(); const f = Object.fromEntries(new FormData(e.currentTarget).entries());
    const card = cards.find((c) => c.id === f.card_id);
    const n = rolls.filter((r) => r.shoot_id === (f.shoot_id || null) && r.card_id === f.card_id).length + 1;
    const day = days.find((d) => d.id === f.shoot_id);
    const ymd = (day?.date || new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" })).slice(2).replace(/-/g, "");
    const roll_name = f.roll_name || `${code}_${ymd}_${card?.label || "X00"}_R${String(n).padStart(2, "0")}`;
    try { const r = await P({ action: "roll-add", projectId: project.id, ...f, camera: card?.camera || "A", roll_name }); set("rolls", (l) => [r.roll, ...l]); e.target.reset(); say(`${roll_name} logged`); } catch (err) { fail(err); }
  }
  async function patchRoll(id, fields) { try { const r = await P({ action: "roll-update", id, ...fields }); set("rolls", (l) => l.map((x) => (x.id === id ? r.roll : x))); } catch (err) { fail(err); } }
  async function patchDrive(id, fields) { try { const r = await P({ action: "drive-update", id, ...fields }); set("drives", (l) => l.map((x) => (x.id === id ? r.drive : x))); } catch (err) { fail(err); } }
  const notCleared = rolls.filter((r) => !["cleared", "formatted"].includes(r.status)).length;
  const dname = (id) => drives.find((d) => d.id === id)?.label || "—";
  return (
    <section className="cprof-card media">
      <div className="cprof-cardhead"><h2>Media{rolls.length > 0 && <em className="cprof-count">{rolls.length}</em>}</h2>
        <span className="pbook-kinds">{[["rolls", `Rolls${notCleared ? ` · ${notCleared} not safe` : ""}`], ["cards", `Cards ${cards.length}`], ["drives", `Drives ${drives.length}`]].map(([k, l]) => <button key={k} type="button" className={"ifilter" + (tab === k ? " is-on" : "") + (k === "rolls" && notCleared ? " is-alert" : "")} onClick={() => setTab(k)}>{l}</button>)}</span>
      </div>
      {tab === "rolls" && (
        <>
          <p className="gcard-meta">A roll = one card's worth from one day. Nothing gets formatted until two verified copies exist — the button won't let you.</p>
          <form className="shoot-new" onSubmit={addRoll}>
            <label>Card<select name="card_id" required defaultValue="">{cards.length === 0 && <option value="">— add cards first —</option>}{cards.filter((c) => !c.retired).map((c) => <option key={c.id} value={c.id}>{c.label} ({c.camera}){c.capacity_gb ? ` · ${c.capacity_gb} GB` : ""}</option>)}</select></label>
            <label>Day<select name="shoot_id" defaultValue=""><option value="">—</option>{days.map((d) => <option key={d.id} value={d.id}>{fmtDate(d.date)} {d.title}</option>)}</select></label>
            <label>Shot by<input name="shot_by" placeholder="Brandon" /></label>
            <label>Used GB<input name="used_gb" type="number" step="1" /></label>
            <label>Clips<input name="clip_count" type="number" step="1" /></label>
            <label>Roll name (auto)<input name="roll_name" placeholder={`${code}_${todayCode()}_A01_R01`} /></label>
            <button type="submit" className="abtn" disabled={!cards.length}>Log roll</button>
          </form>
          <ul className="roll-list">
            {rolls.map((r) => (
              <li key={r.id} className={`roll st-${r.status}`}>
                <div className="roll-head"><strong>{r.roll_name}</strong><span className={"itag" + (["cleared", "formatted"].includes(r.status) ? " is-rel" : " is-alert")}>{STATUS_LABEL[r.status]}</span><em className="gcard-meta">{r.used_gb ? `${r.used_gb} GB` : ""}{r.clip_count ? ` · ${r.clip_count} clips` : ""}{r.shot_by ? ` · ${r.shot_by}` : ""}</em></div>
                <div className="roll-steps">
                  <label><input type="checkbox" checked={Boolean(r.offloaded_at)} onChange={(e) => patchRoll(r.id, { offloaded_at: e.target.checked })} /> Offloaded</label>
                  <label><input type="checkbox" checked={Boolean(r.checksum_verified)} onChange={(e) => patchRoll(r.id, { checksum_verified: e.target.checked })} /> Checksum verified</label>
                  <label><input type="checkbox" checked={Boolean(r.copy1_verified_at)} onChange={(e) => patchRoll(r.id, { copy1_verified_at: e.target.checked })} /> Copy 1 on <select value={r.copy1_drive_id || ""} onChange={(e) => patchRoll(r.id, { copy1_drive_id: e.target.value })}><option value="">drive…</option>{drives.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}</select></label>
                  <label><input type="checkbox" checked={Boolean(r.copy2_verified_at)} onChange={(e) => patchRoll(r.id, { copy2_verified_at: e.target.checked })} /> Copy 2 on <select value={r.copy2_drive_id || ""} onChange={(e) => patchRoll(r.id, { copy2_drive_id: e.target.value })}><option value="">drive…</option>{drives.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}</select></label>
                  <label><input type="checkbox" checked={Boolean(r.cloud_at)} onChange={(e) => patchRoll(r.id, { cloud_at: e.target.checked })} /> Cloud / offsite</label>
                  <button type="button" className={"achip" + (r.status === "cleared" ? " achip-primary" : "")} disabled={!["cleared", "formatted"].includes(r.status)} onClick={() => patchRoll(r.id, { formatted: r.status !== "formatted" })} title={r.status === "cleared" ? "Two copies verified — OK to format the card" : r.status === "formatted" ? "Undo" : "Not until two verified copies"}>{r.status === "formatted" ? "Formatted ✓ (undo)" : "Card formatted"}</button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
      {tab === "cards" && (
        <>
          <form className="shoot-new" onSubmit={addCard}>
            <label>Label<input name="label" required placeholder="A01" /></label>
            <label>Camera<input name="camera" defaultValue="A" placeholder="A / B / D / AU" /></label>
            <label>Capacity GB<input name="capacity_gb" type="number" /></label>
            <button type="submit" className="abtn">Add card</button>
          </form>
          <ul className="cprof-list">{cards.map((c) => <li key={c.id}><strong>{c.label}</strong> <span className="gcard-meta">· cam {c.camera}{c.capacity_gb ? ` · ${c.capacity_gb} GB` : ""} · {rolls.filter((r) => r.card_id === c.id).length} rolls</span></li>)}</ul>
          <p className="gcard-meta">Label the physical card the same way. Conventions: {project.conventions?.cards || "set card IDs under Production → Conventions"}.</p>
        </>
      )}
      {tab === "drives" && (
        <>
          <form className="shoot-new" onSubmit={addDrive}>
            <label>Label<input name="label" required placeholder={`${code}-WORK-01`} /></label>
            <label>Role<select name="role" defaultValue="working">{Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
            <label>Capacity TB<input name="capacity_tb" type="number" step="0.5" /></label>
            <label>Where it lives<input name="location" placeholder="Studio desk / Brandon's house / R2" /></label>
            <button type="submit" className="abtn">Add drive</button>
          </form>
          <ul className="cprof-list">{drives.map((d) => <li key={d.id}><strong>{d.label}</strong> <span className="gcard-meta">· {ROLE_LABEL[d.role]}{d.capacity_tb ? ` · ${d.used_tb || 0}/${d.capacity_tb} TB` : ""}{d.location ? ` · ${d.location}` : ""}{d.last_verified ? ` · verified ${fmtDate(d.last_verified)}` : ""}</span><span className="gcard-actions"><button type="button" className="achip" onClick={() => patchDrive(d.id, { last_verified: new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" }) })}>Verified today</button></span></li>)}</ul>
          <p className="gcard-meta">Plan: one working (fast), one mirror (different room), offsite in R2, archive at delivery.</p>
        </>
      )}
    </section>
  );
}
