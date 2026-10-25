"use client";

// Studio → More → Staff: who works with you. Add them, set their password,
// put them on projects from the project page. Off = they can't sign in.
import { useState } from "react";

async function api(payload) {
  const res = await fetch("/api/admin/staff", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error || `Request failed (${res.status})`);
  return j;
}
const PORTAL = "https://rothmediaco.com/portal";

export default function StaffBoard({ initial }) {
  const [list, setList] = useState(initial || []);
  const [adding, setAdding] = useState(!initial?.length);
  const [error, setError] = useState("");
  const [flash, setFlash] = useState("");
  const [pwFor, setPwFor] = useState(null); // { id, password }
  const say = (m) => { setFlash(m); setTimeout(() => setFlash(""), 2500); };
  if (initial === null) return <p className="sm-sqlhint">Staff isn&apos;t set up yet — run <code>supabase/staff.sql</code> once in the Supabase SQL editor.</p>;
  async function add(e) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget).entries());
    setError("");
    try { const r = await api({ action: "add", ...f }); setList((l) => [...l, r.staff]); setAdding(false); e.target.reset(); say(`${r.staff.name} added — now set their password`); } catch (err) { setError(err.message); }
  }
  async function patch(id, fields) { try { const r = await api({ action: "update", id, ...fields }); setList((l) => l.map((x) => (x.id === id ? { ...x, ...r.staff } : x))); } catch (err) { setError(err.message); } }
  async function remove(x) { if (!window.confirm(`Remove ${x.name} from staff? Their login stays but stops working.`)) return; try { await api({ action: "remove", id: x.id }); setList((l) => l.filter((y) => y.id !== x.id)); } catch (err) { setError(err.message); } }
  async function setPassword(x) {
    const typed = window.prompt(`Password for ${x.name} (blank = make one up)`, "");
    if (typed === null) return;
    try { const r = await api({ action: "set-password", id: x.id, password: typed }); setPwFor({ id: x.id, password: r.password }); } catch (err) { setError(err.message); }
  }
  const details = (x, p) => `Hi ${x.name.split(" ")[0]} — your Roth Media crew login:\n\n${PORTAL}\nEmail: ${x.email}\nPassword: ${p}\n\nYou'll see the projects you're on. Change the password anytime from your account page.`;
  return (
    <div className="staff">
      <div className="atoolbar shoots-bar">
        <button type="button" className="abtn" onClick={() => setAdding(!adding)}>{adding ? "Close" : "+ Add someone"}</button>
        <span className="gcard-meta">Staff sign in at the same /portal page as clients and land on their projects. They never see money, the inbox, galleries or other clients.</span>
        {flash && <span className="clients-flash">{flash}</span>}
      </div>
      {error && <p className="cform-error">{error}</p>}
      {adding && (
        <form className="shoot-new" onSubmit={add}>
          <label>Name<input name="name" required autoFocus /></label>
          <label>Email (their login)<input type="email" name="email" required /></label>
          <label>Title<input name="title" placeholder="Second shooter · Editor · Producer" /></label>
          <label>Phone<input name="phone" /></label>
          <button type="submit" className="abtn">Add</button>
        </form>
      )}
      <ul className="shoot-list">
        {list.map((x) => (
          <li key={x.id} className={"shoot" + (x.active ? "" : " is-cancelled")}>
            <div className="shoot-row shoot-row-link staff-row">
              <span className="shoot-main"><strong>{x.name}</strong><em>{x.title || "Crew"} · {x.email}{x.phone ? ` · ${x.phone}` : ""} · on {x.projects} project{x.projects === 1 ? "" : "s"}</em></span>
              <span className="gcard-actions">
                <button type="button" className="achip" onClick={() => setPassword(x)}>Set password</button>
                <button type="button" className="achip" onClick={() => patch(x.id, { active: !x.active })}>{x.active ? "Turn off" : "Turn on"}</button>
                <button type="button" className="achip achip-danger" onClick={() => remove(x)}>Remove</button>
              </span>
            </div>
            {pwFor?.id === x.id && (
              <div className="shoot-daylink staff-pw">
                <code>{pwFor.password}</code>
                <button type="button" className="achip" onClick={() => navigator.clipboard?.writeText(details(x, pwFor.password))}>Copy sign-in details</button>
                {x.phone && <a className="achip" href={`sms:${x.phone.replace(/[^\d+]/g, "")}?&body=${encodeURIComponent(details(x, pwFor.password))}`}>Text them</a>}
                <button type="button" className="achip" onClick={() => setPwFor(null)}>Hide</button>
              </div>
            )}
          </li>
        ))}
      </ul>
      {list.length === 0 && !adding && <p className="portal-empty">Nobody yet.</p>}
    </div>
  );
}
