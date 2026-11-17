"use client";

// Command Center → Inbox → Follow-ups (lib/nurture.js). Three sets of three
// emails. Brandon adds each person, writes the words, can move any date, and
// taps Send himself: nothing here goes out without that tap.

import { useMemo, useState } from "react";
import { NURTURE_SETS, NURTURE_DAYS, NURTURE_PROMPTS, blankWords, fillWords, niceDay, setLabel, stepState, todayKey } from "../lib/nurture";

async function api(payload) {
  const res = await fetch("/api/admin/nurture", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error || "That didn't work");
  return j;
}

const RANK = { late: 0, due: 1, soon: 2, skipped: 3, sent: 4 };

export default function FollowUps({ initialPeople = [], initialWords = null, picks = [] }) {
  const [people, setPeople] = useState(initialPeople);
  const [words, setWords] = useState(initialWords || blankWords());
  const [draft, setDraft] = useState(initialWords || blankWords());
  const [tab, setTab] = useState("lead");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [arm, setArm] = useState(""); // the Send button waiting for its second tap
  const [open, setOpen] = useState(""); // the email being read
  const [add, setAdd] = useState({ email: "", name: "", set: "lead", start: todayKey() });
  const today = todayKey();

  async function run(key, payload, done = "") {
    setBusy(key); setErr(""); setMsg("");
    try {
      const j = await api(payload);
      setPeople(j.people); setWords(j.words);
      if (payload.action === "words") setDraft(j.words);
      if (done) setMsg(done);
      return true;
    } catch (e) {
      setErr(e.message);
      return false;
    } finally {
      setBusy(""); setArm("");
    }
  }

  // Most urgent first: each person sorts by their most urgent open email.
  const rows = useMemo(() => {
    const live = people.map((p) => {
      const states = p.steps.map((s) => stepState(s, today));
      const top = p.stopped ? 5 : Math.min(...states.map((s) => RANK[s.key]));
      return { p, states, top };
    });
    return live.sort((a, b) => a.top - b.top || a.p.name.localeCompare(b.p.name));
  }, [people, today]);
  const count = (k) => rows.filter((r) => !r.p.stopped).reduce((n, r) => n + r.states.filter((s) => s.key === k).length, 0);
  const dirty = JSON.stringify(draft) !== JSON.stringify(words);

  const pick = (email) => {
    const hit = picks.find((x) => x.email === email.trim().toLowerCase());
    setAdd((a) => ({ ...a, email, name: hit && !a.name ? hit.name : a.name }));
  };
  async function start(e) {
    e.preventDefault();
    if (await run("start", { action: "start", ...add }, "Added. Nothing sends until you tap Send.")) setAdd((a) => ({ ...a, email: "", name: "" }));
  }
  const setWord = (i, k) => (e) => setDraft((d) => ({ ...d, [tab]: d[tab].map((w, j) => (j === i ? { ...w, [k]: e.target.value } : w)) }));

  return (
    <div className="nu">
      <p className="inbox-hint nu-lede">
        Follow-up emails for three kinds of people. <strong>Nothing sends by itself.</strong> You add each person, you can move any date, and an email only goes out when you tap Send.
      </p>
      <p className="nu-counts" role="status">
        <span className={"nu-pill" + (count("late") ? " is-late" : "")}>{count("late")} past due</span>
        <span className={"nu-pill" + (count("due") ? " is-due" : "")}>{count("due")} due today</span>
        <span className="nu-pill">{count("soon")} coming up</span>
      </p>
      {err && <p className="nu-err" role="alert">{err}</p>}
      {msg && <p className="nu-ok" role="status">{msg}</p>}

      <section className="cprof-card nu-card" aria-label="Add someone">
        <h2 className="nu-h">Add someone</h2>
        <form className="nu-add" onSubmit={start}>
          <label>Their email
            <input type="email" required list="nu-picks" value={add.email} onChange={(e) => pick(e.target.value)} placeholder="Start typing a client or inquiry" autoComplete="off" />
          </label>
          <datalist id="nu-picks">{picks.map((x) => <option key={x.email} value={x.email}>{x.name}</option>)}</datalist>
          <label>Their name
            <input value={add.name} onChange={(e) => setAdd((a) => ({ ...a, name: e.target.value }))} placeholder="First and last" />
          </label>
          <label>Which emails
            <select value={add.set} onChange={(e) => setAdd((a) => ({ ...a, set: e.target.value }))}>
              {NURTURE_SETS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </label>
          <label>Count the days from
            <input type="date" required value={add.start} onChange={(e) => setAdd((a) => ({ ...a, start: e.target.value }))} />
          </label>
          <button type="submit" className="abtn" disabled={busy === "start"}>{busy === "start" ? "Adding…" : "Start their follow-ups"}</button>
        </form>
        <p className="inbox-hint">Email 1 comes due {NURTURE_DAYS[0]} days after that date, email 2 at {NURTURE_DAYS[1]} days, email 3 at {NURTURE_DAYS[2]} days. You can move each one.</p>
      </section>

      <section aria-label="Who is getting follow-ups" className="nu-list">
        <h2 className="nu-h">Who is getting follow-ups</h2>
        {rows.length === 0 && <p className="inbox-hint">Nobody yet. Add someone above.</p>}
        {rows.map(({ p, states }) => (
          <article key={p.id} className={"cprof-card nu-person" + (p.stopped ? " is-stopped" : "")}>
            <header className="nu-person-head">
              <div>
                <strong>{p.name || p.email}</strong>
                <span className="gcard-meta is-wrap">{p.email} · {setLabel(p.set)} · counted from {niceDay(p.start)}</span>
                {p.optedOut && <span className="itag itag-lost">They turned emails off</span>}
                {p.stopped && <span className="itag itag-lost">Stopped</span>}
              </div>
              <div className="nu-person-acts">
                {!p.stopped && <button type="button" className="achip" disabled={!!busy} onClick={() => run(p.id, { action: "stop", set: p.set, email: p.email }, "Stopped. Nothing else is due for them.")}>Stop</button>}
                <button type="button" className="achip achip-danger" disabled={!!busy} onClick={() => run(p.id, { action: "remove", set: p.set, email: p.email }, "Removed from the list.")}>Remove</button>
              </div>
            </header>
            {!p.stopped && (
              <ol className="nu-steps">
                {p.steps.map((s, i) => {
                  const st = states[i];
                  const k = `${p.id}|${i}`;
                  const w = words[p.set][i];
                  const ready = Boolean(w.subject && w.body);
                  const done = st.key === "sent";
                  return (
                    <li key={i} className={"nu-step is-" + st.key}>
                      <div className="nu-step-top">
                        <span className="nu-step-n">Email {i + 1}</span>
                        <span className={"itag nu-tag is-" + st.key}>{st.label}</span>
                      </div>
                      {!done && (
                        <div className="nu-step-acts">
                          {!s.skipped && (
                            <label className="nu-date">Send on
                              <input type="date" value={s.due} disabled={!!busy} onChange={(e) => e.target.value && run(k, { action: "move", set: p.set, email: p.email, step: i, due: e.target.value })} />
                            </label>
                          )}
                          {s.skipped ? (
                            <button type="button" className="achip" disabled={!!busy} onClick={() => run(k, { action: "unskip", set: p.set, email: p.email, step: i })}>Bring it back</button>
                          ) : arm === k ? (
                            <>
                              <button type="button" className="abtn" disabled={!!busy} onClick={() => run(k, { action: "send", set: p.set, email: p.email, step: i }, `Sent to ${p.name || p.email}. You got a copy.`)}>{busy === k ? "Sending…" : `Yes, send to ${String(p.name || p.email).split(/\s+/)[0]}`}</button>
                              <button type="button" className="achip" onClick={() => setArm("")}>Cancel</button>
                            </>
                          ) : (
                            <>
                              <button type="button" className="abtn" disabled={!!busy || !ready || p.optedOut} onClick={() => setArm(k)} title={ready ? "" : "Write this email first"}>Send now</button>
                              <button type="button" className="achip" disabled={!!busy} onClick={() => run(k, { action: "skip", set: p.set, email: p.email, step: i })}>Skip</button>
                            </>
                          )}
                          {ready && <button type="button" className="achip" onClick={() => setOpen(open === k ? "" : k)}>{open === k ? "Hide it" : "Read it"}</button>}
                        </div>
                      )}
                      {!done && !ready && !s.skipped && <p className="inbox-hint">This email has no words yet. Write it below, then you can send it.</p>}
                      {open === k && ready && (
                        <div className="nu-read">
                          <strong>{fillWords(w.subject, p)}</strong>
                          <p>{fillWords(w.body, p)}</p>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </article>
        ))}
      </section>

      <section className="cprof-card nu-card" aria-label="The words">
        <h2 className="nu-h">The words</h2>
        <p className="inbox-hint">These are yours to write. Type <code>{"{name}"}</code> where their first name goes. Your sign-off and the unsubscribe line are added for you.</p>
        <div className="nu-tabs" role="tablist">
          {NURTURE_SETS.map((s) => (
            <button key={s.key} type="button" role="tab" aria-selected={tab === s.key} className={"achip" + (tab === s.key ? " achip-primary" : "")} onClick={() => setTab(s.key)}>{s.label}</button>
          ))}
        </div>
        {draft[tab].map((w, i) => (
          <div key={tab + i} className="nu-word">
            <h3>Email {i + 1} <span className="gcard-meta">· about day {NURTURE_DAYS[i]}</span></h3>
            <p className="inbox-hint">{NURTURE_PROMPTS[tab][i]}</p>
            <label>Subject
              <input value={w.subject} onChange={setWord(i, "subject")} maxLength={200} />
            </label>
            <label>What it says
              <textarea rows={7} value={w.body} onChange={setWord(i, "body")} maxLength={6000} placeholder={"Hi {name},"} />
            </label>
          </div>
        ))}
        <div className="nu-save">
          <button type="button" className="abtn" disabled={!dirty || busy === "words"} onClick={() => run("words", { action: "words", words: draft }, "Words saved.")}>{busy === "words" ? "Saving…" : dirty ? "Save the words" : "Saved"}</button>
          {dirty && <span className="inbox-hint">You have changes that are not saved yet.</span>}
        </div>
      </section>
    </div>
  );
}
