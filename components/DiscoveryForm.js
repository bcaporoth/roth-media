"use client";

// Command Center → client → Intake, step 1 (2026-11-24): getting to know a
// business — goals, struggles, interests — filled in WITH them. Questions in
// lib/intake.js DISCOVERY. Saves by itself as Brandon types (one "discovery"
// row per client), no emails. Then: Continue into the Brand Palette (the deep
// one), build a quote, or back to the profile.

import { useEffect, useRef, useState } from "react";
import AutoText from "./AutoText";
import AddonPicker from "./AddonPicker";
import { DISCOVERY } from "../lib/intake";

// Is pick p in the answer? Match whole phrases, so a pick with a comma in it
// ("Nobody, just the place and the work") still lights up after a reload.
const hasPick = (v, p) => `, ${String(v || "").trim()}, `.includes(`, ${p}, `);
const togglePickText = (v, p) => {
  const cur = String(v || "").trim();
  if (!hasPick(cur, p)) return cur ? `${cur}, ${p}` : p;
  return `, ${cur}, `.replace(`, ${p}, `, ", ").replace(/^, |, $/g, "").replace(/^,\s*|,\s*$/g, "").trim();
};

export default function DiscoveryForm({ email, name: name0 = "", phone: phone0 = "", initial = {}, savedId = "", backHref = "", deepHref = "", quoteBase = "", shootHref = "" }) {
  const [name, setName] = useState(name0);
  const [phone, setPhone] = useState(phone0);
  const [answers, setAnswersRaw] = useState(initial);
  const [id, setId] = useState(savedId);
  const [state, setState] = useState("saved"); // saved | dirty | saving | error
  const [savedAt, setSavedAt] = useState("");
  const [error, setError] = useState("");
  const touched = useRef(false);
  const timer = useRef(null);
  // Always from the latest answers, so quick taps never drop each other.
  const set = (q, v) => { touched.current = true; setAnswersRaw((prev) => ({ ...prev, [q]: typeof v === "function" ? v(prev[q] || "") : v })); };

  async function save() {
    setState("saving");
    try {
      const res = await fetch("/api/admin/clients", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "discovery-save", email, name, phone, answers }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `Save failed (${res.status})`);
      setId(json.id || id); setState("saved"); setError("");
      setSavedAt(new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }));
      return json.id || id;
    } catch (err) { setState("error"); setError(`Not saved yet: ${err.message}. It tries again when you type.`); return null; }
  }
  useEffect(() => {
    if (!touched.current) return;
    setState("dirty");
    clearTimeout(timer.current);
    timer.current = setTimeout(save, 1200);
    return () => clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers, name, phone]);
  useEffect(() => {
    const warn = (e) => { if (state !== "saved") { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [state]);
  // Save first, then go (Continue / quote).
  async function go(href) {
    clearTimeout(timer.current);
    const sid = touched.current && state !== "saved" ? await save() : id;
    if (sid === null) return;
    window.location.assign(typeof href === "function" ? href(sid) : href);
  }

  const box = (it, i) => {
    const v = answers[it.q] || "";
    if (it.addons) return <AddonPicker category={it.addons} id={`dq${i}`} value={v} onChange={(x) => set(it.q, x)} />;
    if (it.choices) return (
      <>
        <div className="cx-pills mx-picks" role="radiogroup" aria-label={it.q} id={`dq${i}`}>
          {it.choices.map((c) => <button key={c} type="button" role="radio" aria-checked={v === c} className={"cx-pill" + (v === c ? " is-on" : "")} onClick={() => set(it.q, (cur) => (cur === c ? "" : c))}>{c}</button>)}
        </div>
        {v && !it.choices.includes(v) && <p className="cx-help">Earlier answer: {v}</p>}
      </>
    );
    const text = <AutoText className="cx-input" id={`dq${i}`} rows={it.long ? 2 : 1} placeholder={it.picks ? "Or type it here" : undefined} value={v} onChange={(e) => set(it.q, e.target.value)} />;
    if (!it.picks) return text;
    return (
      <>
        <div className="cx-pills mx-picks" role="group" aria-label={`${it.q}: tap any`}>
          {it.picks.map((p) => <button key={p} type="button" aria-pressed={hasPick(v, p)} className={"cx-pill" + (hasPick(v, p) ? " is-on" : "")} onClick={() => set(it.q, (cur) => togglePickText(cur, p))}>{p}</button>)}
        </div>
        {text}
      </>
    );
  };

  return (
    <form className="mx-form" onSubmit={(e) => { e.preventDefault(); go(deepHref); }}>
      <div className="cx-form-row">
        <div className="mx-field"><label className="cx-label" htmlFor="dq-name">Full name</label><input className="cx-input" id="dq-name" value={name} onChange={(e) => { touched.current = true; setName(e.target.value); }} autoComplete="off" /></div>
        <div className="mx-field"><label className="cx-label" htmlFor="dq-phone">Best phone</label><input className="cx-input" id="dq-phone" type="tel" value={phone} onChange={(e) => { touched.current = true; setPhone(e.target.value); }} autoComplete="off" inputMode="tel" /></div>
      </div>
      <p className="cx-help">Email: {email}. Change it in their Settings tab.</p>
      {DISCOVERY.map((it, i) => (
        <div key={it.q} className="mx-field mx-q">
          <span className="mx-q-n" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
          {it.choices || it.addons || it.picks
            ? <p className="cx-label">{it.q}{it.opt ? <span className="mx-opt"> optional</span> : null}</p>
            : <label className="cx-label" htmlFor={`dq${i}`}>{it.q}{it.opt ? <span className="mx-opt"> optional</span> : null}</label>}
          {it.hint && <p className="cx-help">{it.hint}</p>}
          {box(it, i)}
        </div>
      ))}
      <div className="mx-done">
        <p className="mx-done-title">Next</p>
        <p><strong>Continue</strong> opens the Brand Palette: who they serve, what makes them different, their look and their voice. That&apos;s where you find their niche. Or stop here and build the quote.</p>
      </div>
      <div className="mx-done-acts">
        {deepHref && <button type="submit" className="cx-btn cx-btn--light">Continue: go deeper →</button>}
        {quoteBase && <button type="button" className="cx-btn" onClick={() => go((sid) => (sid ? `${quoteBase}${sid}` : backHref))}>Build their quote</button>}
        {backHref && <button type="button" className="cx-btn" onClick={() => go(backHref)}>Back to their profile</button>}
      </div>
      {shootHref && <p className="cx-help">Planning one specific shoot? <a href={shootHref}>Use the shoot questions</a> (shots, location, brand files).</p>}
      {error && <p className="cx-error" role="alert">{error}</p>}
      <p className="mx-autosave" role="status" aria-live="polite">{state === "saving" ? "Saving…" : state === "dirty" ? "Typing… saves in a second" : state === "error" ? "Not saved yet" : savedAt ? `Saved ${savedAt}` : id ? "Saved earlier. Changes save by themselves." : "Changes save by themselves as you type."}</p>
    </form>
  );
}
