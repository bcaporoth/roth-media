"use client";
// "Use a shot list": pick one of the master shot lists from the Playbook and
// drop it onto this shoot day as its own card. Its A-roll and B-roll shots then
// show in the day's Shot list, tickable. 2026-11-18, Brandon: "a template I can
// use when I show up… contains all potential A-roll and B-roll I could shoot."
import { useEffect, useState } from "react";
import { rollOf } from "../lib/scripts";
import { playbookKindLabel } from "../lib/studio-labels";

export default function ShotTemplatePicker({ busy, onPick, onCancel }) {
  const [lists, setLists] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    fetch("/api/admin/playbook").then(async (r) => { const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || "Could not load your shot lists"); setLists((j.lists || []).filter((l) => l.section === "shots" && (l.items || []).length)); }).catch((e) => setError(e.message));
  }, []);
  return (
    <div className="stpl" role="group" aria-label="Use a shot list">
      <div className="stpl-head">
        <strong>Use a shot list</strong>
        <button type="button" className="achip" onClick={onCancel}>Close</button>
      </div>
      <p className="gcard-meta">Pick one. It is added to this day as its own card, and every shot shows in the Shot list below so you can tick it off. Your master list is not changed.</p>
      {error && <p className="cform-error" role="alert">{error}</p>}
      {!lists && !error && <p className="gcard-meta">Loading your shot lists…</p>}
      {lists && lists.length === 0 && <p className="gcard-meta">No shot lists yet. Make one in More → Playbook → Shot lists.</p>}
      {lists && lists.length > 0 && (
        <ul className="stpl-list">
          {lists.map((l) => {
            const a = l.items.filter((it) => rollOf(it) === "a").length;
            return (
              <li key={l.id}>
                <button type="button" className="abtn stpl-pick" disabled={busy} onClick={() => onPick(l)}>
                  <strong>{l.title}</strong>
                  <em>{playbookKindLabel(l.kind)} · {a} A-roll · {l.items.length - a} B-roll</em>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <p className="gcard-meta"><a href="/portal/admin/playbook?s=shots">Edit your master shot lists ↗</a></p>
    </div>
  );
}
