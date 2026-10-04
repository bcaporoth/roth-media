"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// One lead on the partner's report: tap Joined when they sign up.
export default function PartnerJoined({ slug, k, id, joined }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function set(v) {
    setBusy(true); setErr("");
    try {
      const res = await fetch("/api/partner/joined", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug, k, id, joined: v }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Didn't save");
      router.refresh();
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }
  return (
    <span className="pj">
      {joined
        ? <><span className="mx-joined">Joined</span><button type="button" className="pj-undo" onClick={() => set(false)} disabled={busy}>undo</button></>
        : <button type="button" className="pj-btn cx-btn cx-btn--ghost cx-btn--sm" onClick={() => set(true)} disabled={busy}>{busy ? "Saving…" : "Mark joined"}</button>}
      {err && <small role="alert">{err}</small>}
    </span>
  );
}
