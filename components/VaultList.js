"use client";

// Studio → More → Vault: signed releases. Tap one to read the exact text
// and see the signature; print it from there.
import { useState } from "react";
import { RELEASE_KINDS } from "../lib/releases";

const when = (iso) => new Date(iso).toLocaleString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

export function ReleaseView({ r, onClose }) {
  return (
    <div className="film relview" role="dialog" aria-modal="true" aria-label="Signed release">
      <div className="film-bar">
        <button type="button" className="achip" onClick={onClose}>✕ Close</button>
        <span className="film-pos">{RELEASE_KINDS[r.kind]}</span>
        <button type="button" className="achip" onClick={() => window.print()}>Print</button>
      </div>
      <div className="film-body relview-body">
        <h2 className="film-title">{r.signer_name}</h2>
        <p className="gcard-meta">{RELEASE_KINDS[r.kind]} · signed {when(r.signed_at)}{r.project_title ? ` · ${r.project_title}` : ""} · text v{r.text_version}{r.signer_email ? ` · ${r.signer_email}` : ""}{r.signer_phone ? ` · ${r.signer_phone}` : ""}</p>
        <pre className="relview-text">{r.body}</pre>
        <div className="relview-sig">
          {r.signature_url ? <img src={r.signature_url} alt={`Signature of ${r.signer_name}`} /> : <em>Signature image unavailable</em>}
          <span>{r.signer_name} · {when(r.signed_at)}</span>
        </div>
        <p className="gcard-meta">Record: {r.id}{r.ip ? ` · from ${r.ip}` : ""}</p>
      </div>
      <div className="film-foot" />
    </div>
  );
}

export default function VaultList({ initial }) {
  const [open, setOpen] = useState(null);
  const [q, setQ] = useState("");
  if (initial === null) return <p className="sm-sqlhint">The vault isn&apos;t set up yet — run <code>supabase/projects.sql</code> once in the Supabase SQL editor.</p>;
  const rows = initial.filter((r) => !q || `${r.signer_name} ${r.project_title} ${r.kind}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="vault">
      <div className="atoolbar shoots-bar">
        <input className="vault-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a name or project…" aria-label="Search releases" />
        <span className="gcard-meta">{initial.length} signed release{initial.length === 1 ? "" : "s"}. Releases are signed from a project (People → Sign a release) or a shoot.</span>
      </div>
      {rows.length === 0 && <p className="portal-empty">Nothing signed yet.</p>}
      <ul className="shoot-list">
        {rows.map((r) => (
          <li key={r.id} className="shoot">
            <button type="button" className="shoot-row shoot-row-link" onClick={() => setOpen(r)}>
              <span className="shoot-main"><strong>{r.signer_name}</strong><em>{RELEASE_KINDS[r.kind]}{r.project_title ? ` · ${r.project_title}` : ""} · {when(r.signed_at)}</em></span>
              {r.signature_url && <img className="vault-thumb" src={r.signature_url} alt="" />}
              <span className="abtn shoot-daybtn">View</span>
            </button>
          </li>
        ))}
      </ul>
      {open && <ReleaseView r={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
