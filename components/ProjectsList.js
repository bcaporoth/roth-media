"use client";

// Studio → Projects: the list, and "+ New project".
import { useState } from "react";
import { PROJECT_STATUS_LABEL } from "../lib/projects";
import { SHOOT_KINDS, SHOOT_KIND_LABEL } from "../lib/studio-labels";

async function api(payload) {
  const res = await fetch("/api/admin/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error || `Request failed (${res.status})`);
  return j;
}

export default function ProjectsList({ initial }) {
  const [list, setList] = useState(initial || []);
  const [adding, setAdding] = useState(!initial?.length);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function create(e) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget).entries());
    setBusy(true); setError("");
    try { const r = await api({ action: "project-create", ...f }); window.location.href = `/portal/admin/projects/${r.project.id}`; }
    catch (err) { setError(err.message); setBusy(false); }
  }
  if (initial === null) return <p className="sm-sqlhint">Projects aren&apos;t set up yet — run <code>supabase/projects.sql</code> once in the Supabase SQL editor.</p>;
  return (
    <div className="projects">
      <div className="atoolbar shoots-bar">
        <button type="button" className="abtn" onClick={() => setAdding(!adding)}>{adding ? "Close" : "+ New project"}</button>
        <span className="gcard-meta">A project holds its shoot days, the people in it, the story beats and the signed releases.</span>
      </div>
      {error && <p className="cform-error">{error}</p>}
      {adding && (
        <form className="shoot-new" onSubmit={create}>
          <label className="wide">Name<input name="title" required autoFocus placeholder="St. Mary's — the documentary" /></label>
          <label>Type<select name="kind" defaultValue="documentary">{SHOOT_KINDS.map((k) => <option key={k} value={k}>{SHOOT_KIND_LABEL[k]}</option>)}</select></label>
          <label>Client / contact<input name="client_name" placeholder="Fr. — , parish office" /></label>
          <label>Email<input type="email" name="client_email" /></label>
          <label className="wide">Logline — the one sentence<input name="logline" placeholder="How the one church that didn't close became the one everyone goes to" /></label>
          <button type="submit" className="abtn" disabled={busy}>{busy ? "Creating…" : "Create and open →"}</button>
        </form>
      )}
      {list.length === 0 && !adding && <p className="portal-empty">No projects yet.</p>}
      <ul className="shoot-list">
        {list.map((p) => (
          <li key={p.id} className="shoot">
            <a className="shoot-row shoot-row-link" href={`/portal/admin/projects/${p.id}`}>
              <span className="shoot-main"><strong>{p.title}</strong><em>{SHOOT_KIND_LABEL[p.kind] || p.kind}{p.client_name ? ` · ${p.client_name}` : ""}{p.logline ? ` · ${p.logline}` : ""}</em></span>
              <span className="shoot-far"><strong>{p.filmed}/{p.days} days</strong><em>{p.interviewed}/{p.people} people done</em></span>
              <span className={`itag stage-${p.status}`}>{PROJECT_STATUS_LABEL[p.status]}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
