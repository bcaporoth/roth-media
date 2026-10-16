"use client";

// Studio → Clients → profile → Content plan. Ask Claude for a draft from
// the brand palette, brief and your direction; edit every word; publish it
// to the client's portal home. Edits autosave as a draft — the client only
// ever sees what you last published. Moving an item along (planned →
// filmed → editing → delivered) updates their portal straight away.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { KINDS, KIND_LABEL, STATUSES, DEFAULT_COUNTS, publicPlan, blankItem } from "../lib/content-plan";

async function api(payload) {
  const res = await fetch("/api/admin/plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
  return json;
}
const when = (d) => (d ? new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "");
const lines = (arr) => (arr || []).join("\n");
const split = (s) => String(s || "").split("\n");
// Item ids survive cleaning, so this only flags real edits (questions are private, not compared).
const same = (a, b) => JSON.stringify(publicPlan(a || {})) === JSON.stringify(publicPlan(b || {}));
const EMPTY = { intro: "", price: "", items: [], needs: [], questions: [] };

export default function ContentPlanEditor({ client, initial = {}, aiReady }) {
  const [direction, setDirection] = useState(initial.direction || "");
  const [counts, setCounts] = useState(initial.counts || DEFAULT_COUNTS);
  const [free, setFree] = useState(Boolean(initial.free));
  const [draft, setDraft] = useState(initial.draft || EMPTY);
  const [published, setPublished] = useState(initial.published || null);
  const [publishedAt, setPublishedAt] = useState(initial.published_at || null);
  const [generatedAt, setGeneratedAt] = useState(initial.generated_at || null);
  const [state, setState] = useState("saved"); // saved | dirty | saving
  const [busy, setBusy] = useState(""); // "" | draft | publish | unpublish
  const [error, setError] = useState("");
  const [flash, setFlash] = useState("");
  const first = useRef(true);
  const timer = useRef(null);

  const settings = () => ({ clientId: client.id, direction, counts, free });
  const say = (m) => { setFlash(m); setError(""); setTimeout(() => setFlash(""), 3500); };
  const fail = (err) => { setError(err.message || String(err)); setFlash(""); };

  // Autosave the draft + settings a moment after the last keystroke.
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setState("dirty");
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setState("saving");
      try { await api({ action: "save", ...settings(), draft }); setState("saved"); } catch (err) { setState("dirty"); fail(err); }
    }, 1200);
    return () => clearTimeout(timer.current);
  }, [draft, direction, counts, free]); // eslint-disable-line react-hooks/exhaustive-deps

  async function askClaude() {
    if (draft.items.length && !window.confirm("Replace the current draft with a new one from Claude? (What's published stays as it is until you publish again.)")) return;
    setBusy("draft"); setError("");
    try {
      const r = await api({ action: "draft", ...settings() });
      first.current = true; // don't autosave what the server just stored
      setDraft(r.state.draft); setGeneratedAt(r.state.generated_at); setState("saved");
      say("New draft from Claude — read it through and edit anything");
    } catch (err) { fail(err); }
    setBusy("");
  }

  async function publish() {
    if (!window.confirm(`Show this plan on ${client.name || "the client"}'s portal home? (Your questions list stays private.)`)) return;
    clearTimeout(timer.current);
    setBusy("publish");
    try {
      const r = await api({ action: "publish", ...settings(), draft });
      setPublished(r.state.published); setPublishedAt(r.state.published_at); setState("saved");
      say("Published — it's on their portal home");
    } catch (err) { fail(err); }
    setBusy("");
  }

  async function unpublish() {
    if (!window.confirm("Take the plan off their portal? Your draft stays here.")) return;
    setBusy("unpublish");
    try { await api({ action: "unpublish", clientId: client.id }); setPublished(null); setPublishedAt(null); say("Taken off their portal"); } catch (err) { fail(err); }
    setBusy("");
  }

  async function moveStatus(id, status) {
    setDraft((d) => ({ ...d, items: d.items.map((it) => (it.id === id ? { ...it, status } : it)) }));
    if (published?.items?.some((it) => it.id === id)) {
      try {
        await api({ action: "status", clientId: client.id, itemId: id, status });
        setPublished((p) => ({ ...p, items: p.items.map((it) => (it.id === id ? { ...it, status } : it)) }));
      } catch (err) { fail(err); }
    }
  }

  const setItem = (id, patch) => setDraft((d) => ({ ...d, items: d.items.map((it) => (it.id === id ? { ...it, ...patch } : it)) }));
  const moveItem = (i, by) => setDraft((d) => {
    const items = [...d.items]; const j = i + by;
    if (j < 0 || j >= items.length) return d;
    [items[i], items[j]] = [items[j], items[i]];
    return { ...d, items };
  });
  const removeItem = (id) => { if (window.confirm("Remove this item from the draft?")) setDraft((d) => ({ ...d, items: d.items.filter((it) => it.id !== id) })); };
  const addItem = (kind) => setDraft((d) => ({ ...d, items: [...d.items, blankItem(kind)] }));

  const unpublishedChanges = published && !same(draft, published);
  const n = (k) => (
    <label key={k}>
      {k === "reel" ? "Reels" : k === "promo" ? "Promos" : "Photo sets"}
      <input type="number" min={0} max={12} value={counts[k]} onChange={(e) => setCounts({ ...counts, [k]: e.target.value === "" ? 0 : Number(e.target.value) })} />
    </label>
  );

  return (
    <div className="cplan">
      <div className="gcard-actions">
        <Link className="achip" href={`/portal/admin/clients/${client.id}`}>← {client.name || "Client"}</Link>
        <span className={`callsheet-state is-${state}`}>{state === "saved" ? "Draft saved ✓" : state === "saving" ? "Saving…" : "Unsaved"}</span>
      </div>

      <p className="cplan-status" role="status">
        {published
          ? <><strong>On their portal</strong> since {when(publishedAt)}{unpublishedChanges ? " · you have changes they haven't seen yet" : " · up to date"}</>
          : <><strong>Not on their portal yet.</strong> Nothing here shows to {client.name || "them"} until you publish.</>}
      </p>
      {flash && <p className="cplan-flash">{flash}</p>}
      {error && <p className="cplan-error" role="alert">{error}</p>}

      <section className="cprof-card">
        <div className="cprof-cardhead"><h2>Ask Claude for a draft</h2>{generatedAt && <span className="gcard-meta">last draft {when(generatedAt)}</span>}</div>
        <p className="gcard-meta is-wrap">Claude reads their brand palette, their business brief, your notes on the palette and what you write below. It only uses facts it&apos;s given and lists what it doesn&apos;t know as questions for you.</p>
        <div className="callsheet-meta cplan-counts">
          {["reel", "promo", "photos"].map(n)}
          <label className="cplan-free"><input type="checkbox" checked={free} onChange={(e) => setFree(e.target.checked)} /> Free (shows &ldquo;No charge&rdquo;)</label>
        </div>
        <label className="callsheet-q">
          <span>Your direction</span>
          <textarea rows={5} value={direction} onChange={(e) => setDirection(e.target.value)} placeholder="What you know so far: who you met and when, what they want more of, dates coming up, what's off-limits, who's happy on camera." />
        </label>
        <div className="gcard-actions">
          <button type="button" className="abtn" disabled={!aiReady || Boolean(busy)} onClick={askClaude}>
            {busy === "draft" ? "Claude is drafting… (about a minute)" : draft.items.length ? "Draft again with Claude" : "Draft with Claude"}
          </button>
          {!aiReady && <span className="sm-sqlhint">Claude isn&apos;t connected on this server yet — add <code>ANTHROPIC_API_KEY</code>. You can still write the plan by hand below.</span>}
        </div>
      </section>

      <section className="cprof-card">
        <div className="cprof-cardhead"><h2>The plan</h2><span className="gcard-meta">what they&apos;ll see</span></div>
        <label className="callsheet-q">
          <span>Intro</span>
          <textarea rows={2} value={draft.intro} onChange={(e) => setDraft({ ...draft, intro: e.target.value })} placeholder="One or two plain sentences: what this is." />
        </label>
        <div className="callsheet-meta">
          <label>Price tag<input value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} placeholder="No charge" /></label>
        </div>

        <ol className="cplan-items">
          {draft.items.map((it, i) => (
            <li key={it.id} className="cplan-item">
              <div className="cplan-itemhead">
                <strong>{i + 1}. {KIND_LABEL[it.kind]}</strong>
                <select aria-label="Status" value={it.status} onChange={(e) => moveStatus(it.id, e.target.value)}>
                  {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
                <span className="cplan-itemtools">
                  <button type="button" className="achip" disabled={i === 0} onClick={() => moveItem(i, -1)} aria-label="Move up">↑</button>
                  <button type="button" className="achip" disabled={i === draft.items.length - 1} onClick={() => moveItem(i, 1)} aria-label="Move down">↓</button>
                  <button type="button" className="achip achip-danger" onClick={() => removeItem(it.id)}>Remove</button>
                </span>
              </div>
              <div className="callsheet-meta">
                <label>Kind
                  <select value={it.kind} onChange={(e) => setItem(it.id, { kind: e.target.value })}>
                    {KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
                  </select>
                </label>
                <label className="cplan-grow">Title<input value={it.title} onChange={(e) => setItem(it.id, { title: e.target.value })} /></label>
                <label>Length<input value={it.length} onChange={(e) => setItem(it.id, { length: e.target.value })} placeholder="20-30 sec" /></label>
                <label className="cplan-grow">When<input value={it.when} onChange={(e) => setItem(it.id, { when: e.target.value })} placeholder="First shoot" /></label>
              </div>
              <label className="callsheet-q"><span>The idea</span><textarea rows={3} value={it.idea} onChange={(e) => setItem(it.id, { idea: e.target.value })} /></label>
              <label className="callsheet-q"><span>First two seconds</span><textarea rows={2} value={it.hook} onChange={(e) => setItem(it.id, { hook: e.target.value })} /></label>
              <label className="callsheet-q"><span>Shots (one per line)</span><textarea rows={5} value={lines(it.shots)} onChange={(e) => setItem(it.id, { shots: split(e.target.value) })} /></label>
              <label className="callsheet-q"><span>On camera</span><textarea rows={1} value={it.on_camera} onChange={(e) => setItem(it.id, { on_camera: e.target.value })} /></label>
            </li>
          ))}
        </ol>
        {!draft.items.length && <p className="gcard-meta is-wrap">No items yet. Draft with Claude above, or add them by hand.</p>}
        <div className="gcard-actions">
          {KINDS.slice(0, 3).map((k) => <button key={k.id} type="button" className="achip" onClick={() => addItem(k.id)}>+ {k.label}</button>)}
        </div>

        <label className="callsheet-q">
          <span>What I need from you (one per line — they see this)</span>
          <textarea rows={4} value={lines(draft.needs)} onChange={(e) => setDraft({ ...draft, needs: split(e.target.value) })} />
        </label>
      </section>

      <section className="cprof-card">
        <div className="cprof-cardhead"><h2>Questions to ask them</h2><span className="gcard-meta">only you see these</span></div>
        <label className="callsheet-q">
          <span>One per line</span>
          <textarea rows={6} value={lines(draft.questions)} onChange={(e) => setDraft({ ...draft, questions: split(e.target.value) })} />
        </label>
      </section>

      <div className="gcard-actions cplan-publish">
        <button type="button" className="abtn" disabled={Boolean(busy) || !draft.items.length} onClick={publish}>
          {busy === "publish" ? "Publishing…" : published ? (unpublishedChanges ? "Publish changes" : "Publish again") : "Publish to their portal"}
        </button>
        {published && <button type="button" className="achip" disabled={Boolean(busy)} onClick={unpublish}>Take it off their portal</button>}
      </div>
    </div>
  );
}
