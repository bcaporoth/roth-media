"use client";

// Sign a release on the spot: Brandon picks the kind, types their name,
// hands the phone over. They read, sign with a finger, tap "I agree".
// The PNG + the exact text land in the vault (table `releases`).

import { useEffect, useRef, useState } from "react";
import { RELEASE_KINDS } from "../lib/releases";

async function api(payload) {
  const res = await fetch("/api/admin/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error || `Request failed (${res.status})`);
  return j;
}

function SignaturePad({ onChange }) {
  const ref = useRef(null);
  const drawing = useRef(false);
  const dirty = useRef(false);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    const w = c.clientWidth, h = c.clientHeight;
    c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
    const ctx = c.getContext("2d"); ctx.scale(dpr, dpr);
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h);
    ctx.lineWidth = 2.4; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "#1a1612";
    // the baseline
    ctx.strokeStyle = "#ddd"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(16, h - 28); ctx.lineTo(w - 16, h - 28); ctx.stroke();
    ctx.strokeStyle = "#1a1612"; ctx.lineWidth = 2.4;
  }, []);
  const pos = (e) => { const r = ref.current.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  function down(e) { e.preventDefault(); drawing.current = true; ref.current.setPointerCapture(e.pointerId); const ctx = ref.current.getContext("2d"); const [x, y] = pos(e); ctx.beginPath(); ctx.moveTo(x, y); }
  function move(e) { if (!drawing.current) return; e.preventDefault(); const ctx = ref.current.getContext("2d"); const [x, y] = pos(e); ctx.lineTo(x, y); ctx.stroke(); if (!dirty.current) { dirty.current = true; onChange(true); } }
  function up() { drawing.current = false; }
  function clear() { const c = ref.current; const ctx = c.getContext("2d"); const dpr = window.devicePixelRatio || 1; ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height); ctx.restore(); ctx.strokeStyle = "#ddd"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(16, c.clientHeight - 28); ctx.lineTo(c.clientWidth - 16, c.clientHeight - 28); ctx.stroke(); ctx.strokeStyle = "#1a1612"; ctx.lineWidth = 2.4; dirty.current = false; onChange(false); }
  return (
    <div className="sigpad">
      <canvas ref={ref} className="sigpad-canvas" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onPointerLeave={up} aria-label="Sign here with your finger" />
      <div className="sigpad-foot"><span className="gcard-meta">Sign above with your finger</span><button type="button" className="achip" onClick={clear}>Clear</button></div>
    </div>
  );
}
SignaturePad.toPng = (el) => el?.querySelector("canvas")?.toDataURL("image/png") || "";

export default function ReleaseSign({ project = null, person = null, shoot = null, onSigned, onClose }) {
  const [kind, setKind] = useState("appearance");
  const [name, setName] = useState(person?.name || "");
  const [email, setEmail] = useState(person?.email || "");
  const [phone, setPhone] = useState(person?.phone || "");
  const [minor, setMinor] = useState("");
  const [text, setText] = useState("");
  const [step, setStep] = useState("setup"); // setup → read → done
  const [signed, setSigned] = useState(false);
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const padWrap = useRef(null);
  const place = shoot?.address || "";
  const date = shoot?.date ? new Date(`${shoot.date}T12:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "";

  async function prepare() {
    if (!name.trim()) return setErr("Type their name first");
    setErr(""); setBusy(true);
    try { const r = await api({ action: "release-text", kind, name, project: project?.title || "", date, place, minor }); setText(r.body); setStep("read"); }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  }
  async function sign() {
    const png = SignaturePad.toPng(padWrap.current);
    setErr(""); setBusy(true);
    try {
      const r = await api({ action: "release-sign", kind, projectId: project?.id, personId: person?.id, shootId: shoot?.id, signer_name: name, signer_email: email, signer_phone: phone, signature: png, body: text });
      setStep("done"); onSigned?.(r.release);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }
  useEffect(() => { document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = ""; }; }, []);

  return (
    <div className="film relsign" role="dialog" aria-modal="true" aria-label="Sign a release">
      <div className="film-bar">
        <button type="button" className="achip" onClick={onClose}>✕ {step === "done" ? "Done" : "Cancel"}</button>
        <span className="film-pos">{RELEASE_KINDS[kind]}</span>
        <span />
      </div>
      <div className="film-body relsign-body">
        {err && <p className="cform-error">{err}</p>}
        {step === "setup" && (
          <div className="shoot-new relsign-setup">
            <label className="wide">Which release<select value={kind} onChange={(e) => setKind(e.target.value)}>{Object.entries(RELEASE_KINDS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
            <label className="wide">Their full name<input value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="As they'd sign it" /></label>
            {kind === "minor" && <label className="wide">The minor&apos;s name<input value={minor} onChange={(e) => setMinor(e.target.value)} /></label>}
            <label>Email (optional)<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
            <label>Phone (optional)<input value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
            <p className="gcard-meta wide">{project ? `Project: ${project.title}. ` : ""}{date ? `Date: ${date}. ` : ""}{place ? `Place: ${place}.` : ""}</p>
            <button type="button" className="abtn" disabled={busy} onClick={prepare}>{busy ? "…" : "Show them the release →"}</button>
          </div>
        )}
        {step === "read" && (
          <>
            <p className="relsign-hand">Hand the phone to <strong>{name}</strong>.</p>
            <pre className="relview-text">{text}</pre>
            <div ref={padWrap}><SignaturePad onChange={setSigned} /></div>
            <label className="relsign-agree"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} /> I, {name}, have read this and agree to it.</label>
            <button type="button" className="abtn relsign-go" disabled={busy || !signed || !agree} onClick={sign}>{busy ? "Saving…" : "Sign and agree"}</button>
          </>
        )}
        {step === "done" && (
          <div className="relsign-done">
            <h2 className="film-title">✓ Signed</h2>
            <p>Thanks, {name}. Hand the phone back to Brandon.</p>
            <p className="gcard-meta">Stored in the vault with the exact text and the signature.</p>
            <button type="button" className="abtn" onClick={onClose}>Done</button>
          </div>
        )}
      </div>
      <div className="film-foot" />
    </div>
  );
}
