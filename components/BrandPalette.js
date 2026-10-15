"use client";

// The Brand Palette form (docs/BRAND-PALETTE-SPEC.md §3, §6). One component
// for both sides:
//   mode "client" → /portal/brand, saves through /api/portal/brand
//   mode "admin"  → Studio, saves through /api/admin/brand, plus Brandon's
//                   own note per section (never sent to the client)
// Two ways in: Quick start (the Essentials, one question per screen — the
// ten-minute version) and All sections (A–I as cards, the deep dive). Every
// change autosaves; every field can be skipped or marked "let's talk".

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  SECTIONS, ESSENTIALS, COLOR_ROLES, fieldsFor, completeness, isTalk, talkKey,
} from "../lib/brand";
import { normHex, hexToRgb, hexToCmyk, contrastPairs, contrastLabel, dominantColors } from "../lib/brand-color";
import BrandPreview, { useGoogleFont } from "./BrandPreview";

const LOGO_LABELS = ["Main logo", "Wordmark", "Icon", "Light version", "Dark version", "Other"];
const fmtDay = (d) => (d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "");
const isImage = (a) => /^image\//.test(a.mime || "") || /\.(png|jpe?g|webp|gif|svg)$/i.test(a.filename || "");
const isVector = (a) => /svg/.test(a.mime || "") || /\.(svg|pdf|ai|eps)$/i.test(a.filename || "");
const ext = (name) => (String(name || "").split(".").pop() || "file").toUpperCase().slice(0, 4);

export default function BrandPalette({ initial, initialAssets = [], mode = "client", clientId = null, initialNotes = {} }) {
  const admin = mode === "admin";
  const endpoint = admin ? "/api/admin/brand" : "/api/portal/brand";
  const [data, setData] = useState(initial.data || {});
  const [assets, setAssets] = useState(initialAssets);
  const [status, setStatus] = useState(initial.section_status || {});
  const [save, setSave] = useState("saved"); // saved | dirty | saving | error
  const [error, setError] = useState("");
  const [view, setView] = useState("quick");
  const [showPreview, setShowPreview] = useState(false);
  const pending = useRef({});
  const timer = useRef(null);

  const c = useMemo(() => completeness(data, assets), [data, assets]);
  // Open on the deep dive once the Essentials are done (or always, for Brandon).
  useEffect(() => { if (admin || c.essentials.done === c.essentials.of) setView("all"); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const post = useCallback(async (payload, opts = {}) => {
    const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, ...(admin ? { clientId } : {}) }), ...opts });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
    return json;
  }, [endpoint, admin, clientId]);

  const flush = useCallback(async (keepalive = false) => {
    clearTimeout(timer.current);
    const changes = pending.current;
    if (!Object.keys(changes).length) return;
    pending.current = {};
    setSave("saving");
    try {
      const r = await post({ action: "save", changes }, keepalive ? { keepalive: true } : {});
      if (r.section_status) setStatus(r.section_status);
      setSave(Object.keys(pending.current).length ? "dirty" : "saved");
      setError("");
    } catch (err) {
      pending.current = { ...changes, ...pending.current }; // keep them for the next try
      setSave("error");
      setError(err.message);
    }
  }, [post]);

  useEffect(() => {
    const away = () => { if (document.visibilityState === "hidden") flush(true); };
    document.addEventListener("visibilitychange", away);
    return () => document.removeEventListener("visibilitychange", away);
  }, [flush]);

  // set("business.name", "…") — local state now, server in 700 ms.
  const set = useCallback((key, value) => {
    setData((d) => {
      if (key.startsWith("_talk.")) {
        const k = key.slice(6);
        const t = { ...(d._talk || {}) };
        if (value) t[k] = true; else delete t[k];
        return { ...d, _talk: t };
      }
      if (key.startsWith("_suggest.")) {
        const sec = key.slice(9);
        return { ...d, _suggest: { ...d._suggest, [sec]: { ...d._suggest?.[sec], state: value } } };
      }
      const [sec, id] = key.split(".");
      return { ...d, [sec]: { ...(d[sec] || {}), [id]: value } };
    });
    pending.current = { ...pending.current, [key]: value };
    setSave("dirty");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => flush(), 700);
  }, [flush]);

  const ctx = { data, set, assets, setAssets, post, admin, onError: (m) => { setError(m); setSave("error"); } };
  const allDone = c.essentials.done === c.essentials.of;

  return (
    <div className={"bp" + (admin ? " bp--admin" : "")}>
      <div className="bp-top">
        <div className="bp-meter" aria-label="How complete your palette is">
          <div className="bp-meter-row">
            <strong>Essentials {c.essentials.done}/{c.essentials.of}</strong>
            <span>Deep dive {c.deep.pct}%</span>
            <span className={`bp-save is-${save}`} role="status">{save === "saved" ? "Saved ✓" : save === "saving" ? "Saving…" : save === "error" ? "Not saved — retrying on your next change" : "Saving…"}</span>
          </div>
          <div className="bp-bar"><span style={{ width: `${(c.essentials.done / c.essentials.of) * 100}%` }} /></div>
        </div>
        <div className="bp-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={view === "quick"} className={view === "quick" ? "is-on" : ""} onClick={() => setView("quick")}>{allDone ? "Essentials ✓" : "Quick start · 10 min"}</button>
          <button type="button" role="tab" aria-selected={view === "all"} className={view === "all" ? "is-on" : ""} onClick={() => setView("all")}>All sections</button>
          <button type="button" className={"bp-peek" + (showPreview ? " is-on" : "")} aria-expanded={showPreview} onClick={() => setShowPreview(!showPreview)}>{showPreview ? "Hide preview" : "See your brand"}</button>
        </div>
        {error && <p className="bp-error" role="alert">{error}</p>}
      </div>

      <div className="bp-grid">
        <div className="bp-main">
          {showPreview && <div className="bp-preview-inline"><BrandPreview data={data} assets={assets} /></div>}
          {view === "quick"
            ? <QuickStart ctx={ctx} c={c} onDeep={() => { setView("all"); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
            : <AllSections ctx={ctx} c={c} status={status} initialNotes={initialNotes} clientId={clientId} />}
        </div>
        <aside className="bp-aside" aria-label="Live preview">
          <p className="bp-kick">Live preview</p>
          <BrandPreview data={data} assets={assets} />
        </aside>
      </div>
    </div>
  );
}

// ── Quick start: the Essentials, one per screen ──────────────────────
function QuickStart({ ctx, c, onDeep }) {
  const steps = ESSENTIALS;
  const firstOpen = Math.max(0, steps.findIndex((s) => c.essentials.missing.some((m) => m.section === s.section && m.id === s.id)));
  const [i, setI] = useState(c.essentials.missing.length ? firstOpen : steps.length);
  const top = useRef(null);
  const go = (n) => { setI(n); top.current?.scrollIntoView({ block: "start", behavior: "smooth" }); };

  if (i >= steps.length) {
    const left = c.essentials.missing;
    return (
      <div className="bp-step bp-step--end" ref={top}>
        <p className="bp-kick">{left.length ? `${left.length} left` : "Essentials done"}</p>
        <h2 className="bp-h">{left.length ? "Almost there." : "That's your brand."}</h2>
        {left.length > 0 ? (
          <>
            <p className="bp-lede">Skipped these — tap one to go back, or leave them for our call.</p>
            <ul className="bp-missing">{left.map((m) => (
              <li key={`${m.section}.${m.id}`}><button type="button" onClick={() => go(steps.findIndex((s) => s.section === m.section && s.id === m.id))}>{m.label} <span aria-hidden="true">→</span></button></li>
            ))}</ul>
          </>
        ) : <p className="bp-lede">That&apos;s enough to plan your first shoot. Everything else is the deep dive — fill it in whenever you like.</p>}
        <div className="bp-preview-end"><BrandPreview data={ctx.data} assets={ctx.assets} /></div>
        <div className="bp-nav">
          <button type="button" className="bp-btn bp-btn--ghost" onClick={() => go(steps.length - 1)}>← Back</button>
          <button type="button" className="bp-btn" onClick={onDeep}>Keep going: the deep dive</button>
        </div>
      </div>
    );
  }

  const f = steps[i];
  const sec = SECTIONS.find((s) => s.key === f.section);
  const field = fieldsFor(sec, ctx.data).find((x) => x.id === f.id) || f;
  const talk = isTalk(ctx.data, f.section, f.id);
  return (
    <div className="bp-step" ref={top}>
      <div className="bp-dots" aria-hidden="true">{steps.map((s, n) => <span key={n} className={n === i ? "is-now" : n < i ? "is-past" : ""} />)}</div>
      <p className="bp-kick">{i + 1} of {steps.length} · {sec.letter} · {sec.title}</p>
      <Field ctx={ctx} section={f.section} field={field} big />
      <div className="bp-nav">
        <button type="button" className="bp-btn bp-btn--ghost" onClick={() => go(i - 1)} disabled={i === 0}>← Back</button>
        <button type="button" className="bp-btn" onClick={() => go(i + 1)}>{i === steps.length - 1 ? "Finish" : "Next →"}</button>
      </div>
      <button type="button" className={"bp-talk" + (talk ? " is-on" : "")} aria-pressed={talk} onClick={() => { ctx.set(`_talk.${talkKey(f.section, f.id)}`, !talk); if (!talk) go(i + 1); }}>
        {talk ? "✓ We'll talk about this one" : "Not sure — let's talk on the call"}
      </button>
    </div>
  );
}

// ── All sections: A–I as cards ───────────────────────────────────────
function AllSections({ ctx, c, status, initialNotes, clientId }) {
  const [open, setOpen] = useState(null);
  const who = (by) => (by === (ctx.admin ? "brandon" : "client") ? "you" : by === "brandon" ? "Brandon" : by === "client" ? (ctx.admin ? "client" : "you") : "");
  return (
    <div className="bp-sections">
      {SECTIONS.map((s) => {
        const fields = fieldsFor(s, ctx.data);
        const sc = c.sections[s.key];
        const stars = fields.filter((f) => f.star);
        const starsDone = stars.filter((f) => !c.essentials.missing.some((m) => m.section === s.key && m.id === f.id)).length;
        const st = status?.[s.key];
        const isOpen = open === s.key;
        return (
          <section key={s.key} className={"bp-sec" + (isOpen ? " is-open" : "")} id={`bp-${s.key}`}>
            <button type="button" className="bp-sec-head" aria-expanded={isOpen} onClick={() => { setOpen(isOpen ? null : s.key); if (!isOpen) setTimeout(() => document.getElementById(`bp-${s.key}`)?.scrollIntoView({ block: "start", behavior: "smooth" }), 30); }}>
              <span className="bp-sec-letter">{s.letter}</span>
              <span className="bp-sec-title">{s.title}
                <small>{sc.done}/{sc.of}{stars.length ? ` · ★ ${starsDone}/${stars.length}` : ""}{st?.at ? ` · updated ${fmtDay(st.at)}${who(st.by) ? ` by ${who(st.by)}` : ""}` : ""}</small>
              </span>
              <span className="bp-sec-ring" style={{ "--p": `${sc.of ? (sc.done / sc.of) * 100 : 0}%` }} aria-hidden="true" />
            </button>
            {isOpen && (
              <div className="bp-sec-body">
                <p className="bp-lede">{s.blurb}</p>
                {fields.map((f) => (
                  <div key={f.id} className="bp-row">
                    <Field ctx={ctx} section={s.key} field={f} />
                    <TalkToggle ctx={ctx} section={s.key} id={f.id} />
                  </div>
                ))}
                {ctx.admin && <BrandonNote section={s.key} initial={initialNotes?.[s.key] || ""} clientId={clientId} />}
                <button type="button" className="bp-btn bp-btn--ghost bp-sec-close" onClick={() => setOpen(null)}>Done with {s.title.toLowerCase()}</button>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function TalkToggle({ ctx, section, id }) {
  const on = isTalk(ctx.data, section, id);
  return (
    <button type="button" className={"bp-talk bp-talk--sm" + (on ? " is-on" : "")} aria-pressed={on} onClick={() => ctx.set(`_talk.${talkKey(section, id)}`, !on)}>
      {on ? "✓ Let's talk" : "Not sure — let's talk"}
    </button>
  );
}

function BrandonNote({ section, initial, clientId }) {
  const [text, setText] = useState(initial);
  const [state, setState] = useState("saved");
  const timer = useRef(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setState("dirty");
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setState("saving");
      try {
        const r = await fetch("/api/admin/brand", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "notes", clientId, section, text }) });
        if (!r.ok) throw new Error();
        setState("saved");
      } catch { setState("error"); }
    }, 700);
    return () => clearTimeout(timer.current);
  }, [text, clientId, section]);
  return (
    <label className="bp-note">
      <span>Your note <em>· they never see this · {state === "saved" ? "saved" : state === "error" ? "not saved" : "saving…"}</em></span>
      <textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="What came up on the call, what to push, what to fix." />
    </label>
  );
}

// "Suggested from the voucher — are these yours?" A draft Brandon seeded;
// never counted as their answer until they tap Use these.
function Suggestion({ ctx, section }) {
  const s = ctx.data?._suggest?.[section];
  if (!s || s.state) return null;
  const colors = (s.colors || []).filter((x) => normHex(x.hex));
  const use = () => {
    if (colors.length) ctx.set(`${section}.colors`, colors.slice(0, 6));
    if (s.fonts) ctx.set(`${section}.fonts`, { headline: s.fonts.headline || "", body: s.fonts.body || "", pick: false });
    ctx.set(`_suggest.${section}`, "used");
  };
  return (
    <div className="bp-suggest">
      <p><strong>Suggested from {s.from || "what I have"}: are these yours?</strong> Swap anything that isn&apos;t.</p>
      <div className="bp-suggest-swatches">{colors.map((x) => <span key={x.hex} title={`${x.name || x.role} ${x.hex}`} style={{ background: x.hex }} />)}</div>
      {s.fonts && <p className="bp-help">Fonts: {[s.fonts.headline, s.fonts.body].filter(Boolean).join(" + ")}</p>}
      <div className="bp-nav bp-nav--tight">
        <button type="button" className="bp-btn" onClick={use}>Yes, use these</button>
        <button type="button" className="bp-btn bp-btn--ghost" onClick={() => ctx.set(`_suggest.${section}`, "dismissed")}>Not ours</button>
      </div>
    </div>
  );
}

// ── One field ────────────────────────────────────────────────────────
function Field({ ctx, section, field: f, big = false }) {
  const key = `${section}.${f.id}`;
  const value = ctx.data?.[section]?.[f.id];
  const id = `bp-${section}-${f.id}`;
  const Label = big ? "h2" : "span";
  const head = (
    <>
      <Label className={big ? "bp-h" : "bp-label"} id={`${id}-l`}>{f.label}{f.star && !big ? <span className="bp-star" title="Essential"> ★</span> : null}</Label>
      {f.hint && <p className="bp-help">{f.hint}</p>}
    </>
  );
  const kind = f.kind || "text";
  let control = null;
  if (kind === "text") control = <input id={id} aria-labelledby={`${id}-l`} className="bp-input" value={value || ""} placeholder={f.placeholder || ""} onChange={(e) => ctx.set(key, e.target.value)} />;
  if (kind === "long") control = <textarea id={id} aria-labelledby={`${id}-l`} className="bp-input" rows={big ? 4 : 3} value={value || ""} placeholder={f.placeholder || ""} onChange={(e) => ctx.set(key, e.target.value)} />;
  if (kind === "choice") control = <Choice f={f} value={value} onChange={(v) => ctx.set(key, v)} labelId={`${id}-l`} />;
  if (kind === "chips") control = <Chips f={f} value={value || []} onChange={(v) => ctx.set(key, v)} labelId={`${id}-l`} />;
  if (kind === "sliders") control = <Sliders f={f} value={value || {}} onChange={(v) => ctx.set(key, v)} />;
  if (kind === "colors") control = <><Suggestion ctx={ctx} section={section} /><Colors ctx={ctx} k={key} value={value || []} /></>;
  if (kind === "fonts") control = <Fonts value={value || {}} onChange={(v) => ctx.set(key, v)} />;
  if (kind === "assets") control = <Assets ctx={ctx} kind={f.asset} />;
  if (kind === "checklist") control = <Checklist f={f} value={value || {}} onChange={(v) => ctx.set(key, v)} />;
  return <div className={"bp-field" + (big ? " bp-field--big" : "")}>{head}{control}</div>;
}

function Choice({ f, value, onChange, labelId }) {
  return (
    <div className="bp-pills" role="radiogroup" aria-labelledby={labelId}>
      {f.options.map((o) => (
        <button key={o} type="button" role="radio" aria-checked={value === o} className={"bp-pill" + (value === o ? " is-on" : "")} onClick={() => onChange(value === o ? "" : o)}>{f.optionLabels?.[o] || o}</button>
      ))}
    </div>
  );
}

function Chips({ f, value, onChange, labelId }) {
  const [add, setAdd] = useState("");
  const full = f.max && value.length >= f.max;
  const toggle = (o) => onChange(value.includes(o) ? value.filter((x) => x !== o) : full ? value : [...value, o]);
  const extra = value.filter((v) => !(f.options || []).includes(v));
  const submit = (e) => { e.preventDefault(); const v = add.trim(); if (v && !value.includes(v) && !full) onChange([...value, v]); setAdd(""); };
  return (
    <>
      <div className="bp-pills" role="group" aria-labelledby={labelId}>
        {[...(f.options || []), ...extra].map((o) => (
          <button key={o} type="button" aria-pressed={value.includes(o)} className={"bp-pill" + (value.includes(o) ? " is-on" : "")} disabled={!value.includes(o) && full} onClick={() => toggle(o)}>{o}</button>
        ))}
      </div>
      {f.max ? <p className="bp-help">{value.length}/{f.max} picked{full ? " — tap one to swap it out" : ""}</p> : null}
      {f.custom && (
        <form className="bp-add" onSubmit={submit}>
          <input className="bp-input" value={add} onChange={(e) => setAdd(e.target.value)} placeholder="Add your own" aria-label={`Add your own: ${f.label}`} disabled={full} />
          <button type="submit" className="bp-btn bp-btn--ghost" disabled={!add.trim() || full}>Add</button>
        </form>
      )}
    </>
  );
}

function Sliders({ f, value, onChange }) {
  return (
    <div className="bp-sliders">
      {f.pairs.map(([l, r]) => {
        const k = `${l}|${r}`;
        const v = value[k];
        const setV = (n) => onChange({ ...value, [k]: Number(n) });
        return (
          <div key={k} className={"bp-slider" + (v ? "" : " is-unset")}>
            <div className="bp-slider-ends"><span>{l}</span><em>{v ? ["", `Very ${l.toLowerCase()}`, l, "Right in between", r, `Very ${r.toLowerCase()}`][v] : "Not set"}</em><span>{r}</span></div>
            <input type="range" min={1} max={5} step={1} value={v || 3} aria-label={`${l} to ${r}`} onChange={(e) => setV(e.target.value)} onClick={(e) => { if (!v) setV(e.currentTarget.value); }} />
            {/* Always rendered (hidden when unset) so setting one slider never shifts the rest. */}
            <button type="button" className="bp-clear" style={v ? undefined : { visibility: "hidden" }} tabIndex={v ? 0 : -1} aria-hidden={!v} onClick={() => { const n = { ...value }; delete n[k]; onChange(n); }}>Clear</button>
          </div>
        );
      })}
    </div>
  );
}

function Checklist({ f, value, onChange }) {
  return (
    <div className="bp-checks">
      {f.options.map((o) => (
        <label key={o} className={"bp-check" + (value[o] ? " is-on" : "")}>
          <input type="checkbox" checked={!!value[o]} onChange={(e) => { const n = { ...value }; if (e.target.checked) n[o] = true; else delete n[o]; onChange(n); }} />
          <span>{o}</span>
        </label>
      ))}
    </div>
  );
}

// ── Colors: up to six, each with a role; logo pull; contrast check ───
function Colors({ ctx, k, value }) {
  const fromLogo = (ctx.data?.visual?.logo_colors || []).filter((h) => !value.some((c) => normHex(c.hex) === h));
  const used = new Set(value.map((c) => c.role));
  const nextRole = COLOR_ROLES.find((r) => !used.has(r.id))?.id || "accent";
  const update = (i, patch) => ctx.set(k, value.map((c, n) => (n === i ? { ...c, ...patch } : c)));
  const add = (hex) => value.length < 6 && ctx.set(k, [...value, { hex, role: nextRole, name: "" }]);
  const pairs = contrastPairs(value);
  return (
    <div className="bp-colors">
      {fromLogo.length > 0 && value.length < 6 && (
        <div className="bp-fromlogo">
          <span className="bp-help">From your logo — tap to add:</span>
          <div className="bp-swatch-row">{fromLogo.map((h) => <button key={h} type="button" className="bp-swatch-btn" style={{ background: h }} onClick={() => add(h)} aria-label={`Add ${h}`} title={h} />)}</div>
        </div>
      )}
      {value.map((c, i) => {
        const hex = normHex(c.hex) || "#000000";
        const rgb = hexToRgb(hex);
        const cmyk = hexToCmyk(hex);
        return (
          <div key={i} className="bp-color">
            <label className="bp-color-pick" style={{ background: hex }}>
              <input type="color" value={hex} onChange={(e) => update(i, { hex: e.target.value })} aria-label={`Color ${i + 1}`} />
            </label>
            <div className="bp-color-fields">
              <div className="bp-color-line">
                <HexInput value={hex} onChange={(h) => update(i, { hex: h })} />
                <select className="bp-input bp-select" value={c.role} onChange={(e) => update(i, { role: e.target.value })} aria-label="What this color is for">
                  {COLOR_ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                </select>
                <button type="button" className="bp-x" onClick={() => ctx.set(k, value.filter((_, n) => n !== i))} aria-label="Remove this color">×</button>
              </div>
              <span className="bp-color-codes">RGB {rgb.join(" ")} · CMYK {cmyk.join(" ")}</span>
            </div>
          </div>
        );
      })}
      {value.length < 6 && <button type="button" className="bp-btn bp-btn--ghost" onClick={() => add(value.length ? "#888888" : "#222222")}>+ Add a color</button>}
      {pairs.length > 0 && (
        <div className="bp-contrast">
          <span className="bp-help">Can people read text in these pairs?</span>
          {pairs.map((p, i) => {
            const l = contrastLabel(p.ratio);
            return (
              <div key={i} className={"bp-pair" + (l.ok ? "" : " is-bad")}>
                <span className="bp-pair-chip" style={{ background: p.bg.hex, color: p.fg.hex }}>Aa</span>
                <span>{COLOR_ROLES.find((r) => r.id === p.fg.role)?.label} on {COLOR_ROLES.find((r) => r.id === p.bg.role)?.label.toLowerCase()} · <strong>{p.ratio.toFixed(1)}:1 {l.grade}</strong> — {l.say}</span>
              </div>
            );
          })}
        </div>
      )}
      {value.length > 0 && <p className="bp-help">CMYK here is a starting point for a printer, not a proof.</p>}
    </div>
  );
}

function HexInput({ value, onChange }) {
  const [t, setT] = useState(value);
  useEffect(() => setT(value), [value]);
  return <input className="bp-input bp-hex" value={t} aria-label="Hex code" spellCheck={false} autoCapitalize="none" onChange={(e) => { setT(e.target.value); const h = normHex(e.target.value); if (h) onChange(h); }} onBlur={() => setT(value)} />;
}

function Fonts({ value, onChange }) {
  useGoogleFont(value.headline);
  useGoogleFont(value.body);
  const set = (patch) => onChange({ headline: "", body: "", pick: false, ...value, ...patch });
  return (
    <div className="bp-fonts">
      {[["headline", "Headline font", "e.g. Playfair Display"], ["body", "Body font", "e.g. Lato"]].map(([k, l, ph]) => (
        <label key={k} className="bp-font">
          <span className="bp-label bp-label--sm">{l}</span>
          <input className="bp-input" value={value[k] || ""} placeholder={ph} onChange={(e) => set({ [k]: e.target.value, pick: false })} />
          {value[k] && <span className="bp-font-sample" style={{ fontFamily: `"${value[k]}", var(--font-body), sans-serif`, fontWeight: k === "headline" ? 700 : 400 }}>The quick brown fox, 1 2 3</span>}
        </label>
      ))}
      <button type="button" className={"bp-pill" + (value.pick ? " is-on" : "")} aria-pressed={!!value.pick} onClick={() => set({ pick: !value.pick })}>No idea — Brandon picks</button>
    </div>
  );
}

// ── Files: logos, mood board, reference pictures, brand guide ────────
async function measure(file) {
  if (!/^image\//.test(file.type) || /svg/.test(file.type)) return { width: null, height: null, colors: null };
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = url; });
    const scale = Math.min(1, 160 / Math.max(img.naturalWidth, img.naturalHeight));
    const cv = document.createElement("canvas");
    cv.width = Math.max(1, Math.round(img.naturalWidth * scale)); cv.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const cx = cv.getContext("2d");
    cx.drawImage(img, 0, 0, cv.width, cv.height);
    let colors = null;
    try { colors = dominantColors(cx.getImageData(0, 0, cv.width, cv.height).data); } catch {}
    return { width: img.naturalWidth, height: img.naturalHeight, colors };
  } catch { return { width: null, height: null, colors: null }; }
  finally { URL.revokeObjectURL(url); }
}

// SVG logos: rasterize from the local file so colors can still be pulled.
async function svgColors(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = url; });
    const cv = document.createElement("canvas"); cv.width = 160; cv.height = 160;
    const cx = cv.getContext("2d"); cx.drawImage(img, 0, 0, 160, 160);
    return dominantColors(cx.getImageData(0, 0, 160, 160).data);
  } catch { return null; } finally { URL.revokeObjectURL(url); }
}

function Assets({ ctx, kind }) {
  const [busy, setBusy] = useState("");
  const input = useRef(null);
  const list = ctx.assets.filter((a) => a.kind === kind);
  const isLogo = kind === "logo";
  async function upload(files) {
    for (const file of [...files]) {
      setBusy(`Uploading ${file.name}…`);
      try {
        const m = await measure(file);
        const colors = m.colors || (/svg/.test(file.type) ? await svgColors(file) : null);
        const contentType = file.type || "application/octet-stream";
        const s = await ctx.post({ action: "sign", kind, filename: file.name, contentType, bytes: file.size });
        const put = await fetch(s.url, { method: "PUT", headers: { "Content-Type": s.contentType }, body: file });
        if (!put.ok) throw new Error(`Upload failed (${put.status})`);
        const label = isLogo ? (list.some((a) => a.label === "Main logo") ? "Other" : "Main logo") : "";
        const r = await ctx.post({ action: "done", id: s.id, key: s.key, kind, label, filename: file.name, contentType, bytes: file.size, width: m.width, height: m.height });
        ctx.setAssets((a) => [...a, r.asset]);
        if (isLogo && colors?.length) {
          const had = ctx.data?.visual?.logo_colors || [];
          ctx.set("visual.logo_colors", [...new Set([...had, ...colors])].slice(0, 8));
        }
      } catch (err) { ctx.onError(`${file.name}: ${err.message}`); }
    }
    setBusy("");
    if (input.current) input.current.value = "";
  }
  async function remove(a) {
    if (!window.confirm(`Remove ${a.filename || "this file"}?`)) return;
    try { await ctx.post({ action: "remove", id: a.id }); ctx.setAssets((x) => x.filter((y) => y.id !== a.id)); } catch (err) { ctx.onError(err.message); }
  }
  async function relabel(a, label) {
    ctx.setAssets((x) => x.map((y) => (y.id === a.id ? { ...y, label } : y)));
    try { await ctx.post({ action: "label", id: a.id, label }); } catch (err) { ctx.onError(err.message); }
  }
  const accept = kind === "guide" ? ".pdf,application/pdf" : "image/*,.svg,.pdf,.ai,.eps";
  return (
    <div className="bp-assets">
      {list.length > 0 && (
        <ul className={"bp-tiles" + (isLogo ? " bp-tiles--logo" : "")}>
          {list.map((a) => {
            const small = isImage(a) && !isVector(a) && a.width && Math.max(a.width, a.height || 0) < 600;
            return (
              <li key={a.id} className="bp-tile">
                <a href={a.download || a.url} className="bp-tile-img" target="_blank" rel="noreferrer" title="Download the original">
                  {isImage(a) && a.url ? <img src={a.url} alt={a.label || a.filename} /> : <span className="bp-tile-file">{ext(a.filename)}</span>}
                </a>
                {isLogo
                  ? <select className="bp-input bp-select" value={LOGO_LABELS.includes(a.label) ? a.label : "Other"} onChange={(e) => relabel(a, e.target.value)} aria-label="Which version is this?">{LOGO_LABELS.map((l) => <option key={l}>{l}</option>)}</select>
                  : <span className="bp-tile-name">{a.filename}</span>}
                {small && <span className="bp-warn">This is {Math.max(a.width, a.height)}px — do you have a bigger one?</span>}
                {!isImage(a) && isLogo && <span className="bp-help">Saved. A PNG or SVG copy shows in the preview.</span>}
                <button type="button" className="bp-x" onClick={() => remove(a)} aria-label={`Remove ${a.filename}`}>×</button>
              </li>
            );
          })}
        </ul>
      )}
      <label className={"bp-drop" + (busy ? " is-busy" : "")}>
        <input ref={input} type="file" multiple accept={accept} onChange={(e) => e.target.files?.length && upload(e.target.files)} disabled={!!busy} />
        <span>{busy || (list.length ? "+ Add more" : isLogo ? "Upload your logo" : kind === "guide" ? "Upload your brand guide" : "Upload pictures")}</span>
      </label>
    </div>
  );
}
