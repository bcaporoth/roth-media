"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const post = (url, body) => fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(async (r) => { const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || "Didn't save"); return j; });

// Month inputs: ad spend from Meta Ads Manager (+ hours for hourly follow-up).
export function PartnerMonthForm({ slug, month, spend, hours, hourly }) {
  const router = useRouter();
  const [s, setS] = useState(spend ?? "");
  const [h, setH] = useState(hours || "");
  const [msg, setMsg] = useState("");
  async function save() {
    try { await post("/api/admin/partner-month", { slug, month, spend: s, hours: h }); setMsg("Saved"); router.refresh(); }
    catch (e) { setMsg(e.message); }
  }
  return (
    <div className="pcharge-row">
      <label><span>Ad spend this month ($)</span><input id={`pm-spend-${slug}`} inputMode="decimal" value={s} onChange={(e) => setS(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="200" /></label>
      {hourly && <label><span>Follow-up hours</span><input id={`pm-hours-${slug}`} inputMode="decimal" value={h} onChange={(e) => setH(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="4.5" /></label>}
      <button type="button" className="abtn" onClick={save}>Save</button>
      {msg && <span className="itag">{msg}</span>}
    </div>
  );
}

// One lead's buttons: Contacted / Joined (what, optional $) / Lost.
export function PartnerLeadActions({ id, status }) {
  const router = useRouter();
  const [closing, setClosing] = useState(false);
  const [value, setValue] = useState("");
  const [what, setWhat] = useState("");
  const [err, setErr] = useState("");
  async function set(st, extra = {}) {
    setErr("");
    try { await post("/api/admin/partner-lead", { id, status: st, ...extra }); setClosing(false); router.refresh(); }
    catch (e) { setErr(e.message); }
  }
  if (closing) {
    return (
      <div className="pcharge-row">
        <label className="grow"><span>What they signed up for</span><input id={`pl-what-${id}`} value={what} onChange={(e) => setWhat(e.target.value)} placeholder="Monthly unlimited" /></label>
        <label><span>Value ($, optional)</span><input id={`pl-val-${id}`} inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="180" /></label>
        <button type="button" className="abtn" onClick={() => set("closed", { value, what })}>Save</button>
        <button type="button" className="abtn abtn-ghost" onClick={() => setClosing(false)}>Cancel</button>
        <small className="pl-hint">Usually her team marks this from their report.</small>
        {err && <span className="cform-error">{err}</span>}
      </div>
    );
  }
  return (
    <div className="pl-actions">
      {status !== "contacted" && status !== "booked" && <button type="button" className="abtn abtn-ghost" onClick={() => set("contacted")}>Contacted</button>}
      {status !== "booked" && <button type="button" className="abtn" onClick={() => setClosing(true)}>Joined</button>}
      {status !== "lost" && status !== "booked" && <button type="button" className="abtn abtn-ghost" onClick={() => set("lost")}>Lost</button>}
      {(status === "booked" || status === "lost") && <button type="button" className="abtn abtn-ghost" onClick={() => set("new")}>Undo</button>}
      {err && <span className="cform-error">{err}</span>}
    </div>
  );
}
