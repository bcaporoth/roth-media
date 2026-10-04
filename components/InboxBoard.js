"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { leadScripts } from "../lib/studio-emails";
import { LOST_REASONS, lostReasonLabel, inboxIntel, inboxSort, dateConflicts, requestedDate, leadCategory, todayKey, addDays } from "../lib/lead-intel";

// Studio inbox — every form from the site, a New → Contacted → Booked
// pipeline, private notes, one-tap call/text/email, and the pages the
// person looked at before they reached out.
//
// Action bar (speed-to-lead): every lead row shows its heat and "your next
// move"; the detail has Text/Email with the same scripts the lead-alert email
// carries (tapping one marks the lead Contacted), Open profile, Plan shoot,
// a follow-up date, a "lost because" reason and a date-clash warning.

import { LEAD_STATUSES as STATUS, FORM_KIND_LABEL as KIND_LABEL } from "../lib/studio-labels";

const FILTERS = [
  { key: "open", label: "Active" },
  { key: "new", label: "New" },
  { key: "contacted", label: "Contacted" },
  { key: "booked", label: "Booked" },
  { key: "lost", label: "Lost" },
  { key: "archived", label: "Archived" },
  { key: "all", label: "All" },
];


function when(d) {
  const date = new Date(d);
  const mins = Math.round((Date.now() - date) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fullWhen(d) {
  return new Date(d).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

async function patch(body) {
  const res = await fetch("/api/admin/inbox", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    keepalive: true, // a tap on Text/Email leaves the page for Messages/Mail — let the save finish
  });
  if (!res.ok) throw new Error("save failed");
  return res.json();
}

const SCRIPTS = [
  { key: "first", label: "First reply" },
  { key: "welcome", label: "Welcome Packet" },
  { key: "blank", label: "Blank" },
];
const enc = encodeURIComponent;
const prettyDay = (k) => new Date(`${k}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

export default function InboxBoard({ initial, did = {}, migrated = true }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [filter, setFilter] = useState("open");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState(null);
  const [notes, setNotes] = useState("");
  const [noteState, setNoteState] = useState("");
  const [journey, setJourney] = useState(null);
  const [sort, setSort] = useState("smart"); // smart = what needs you first · newest = the old order
  const [script, setScript] = useState("first");
  const [shoots, setShoots] = useState(null);
  const [needsSql, setNeedsSql] = useState(!migrated);
  const [flash, setFlash] = useState("");
  const [busyProfile, setBusyProfile] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  // Keep "2h ago / overdue" honest while the tab sits open.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);

  // Shoots already on the calendar — for the date-clash warning. Optional:
  // if shoots aren't set up, there's just no warning.
  useEffect(() => {
    let live = true;
    fetch("/api/admin/shoots")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (live && j && Array.isArray(j.shoots)) setShoots(j.shoots); })
      .catch(() => {});
    return () => { live = false; };
  }, []);

  const say = (m) => { setFlash(m); setTimeout(() => setFlash(""), 5000); };

  // Deep link from Stats: /portal/admin/inbox?open=<id> opens that lead (any status).
  useEffect(() => {
    try {
      const id = new URLSearchParams(window.location.search).get("open");
      if (id && initial.some((it) => it.id === id)) { setFilter("all"); setOpenId(id); }
    } catch {}
  }, [initial]);

  const counts = useMemo(() => {
    const c = { all: items.length, open: 0 };
    for (const s of STATUS) c[s.key] = 0;
    for (const it of items) {
      c[it.status] = (c[it.status] || 0) + 1;
      if (it.status !== "archived" && it.status !== "lost") c.open++;
    }
    return c;
  }, [items]);

  // Heat, next move, overdue and follow-up-due for every row.
  const rows = useMemo(() => {
    // Someone who paid shows up as a separate "booking" row — their lead counts as booked.
    const paid = new Set(items.filter((it) => it.kind === "booking" && it.email).map((it) => it.email));
    return items.map((it) => ({ ...it, intel: inboxIntel(it, did[it.id], now, paid) }));
  }, [items, did, now]);

  const needs = useMemo(() => ({
    due: rows.filter((r) => r.intel.followDue).length,
    overdue: rows.filter((r) => r.intel.overdue && !r.intel.followDue).length,
  }), [rows]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = rows.filter((it) => {
      if (filter === "open" && (it.status === "archived" || it.status === "lost")) return false;
      if (filter !== "open" && filter !== "all" && it.status !== filter) return false;
      if (!q) return true;
      return [it.name, it.email, it.phone, it.summary, it.notes, ...(it.fields || []).map((f) => f[1])]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
    return sort === "smart" ? inboxSort(list) : list;
  }, [rows, filter, query, sort]);

  const open = rows.find((it) => it.id === openId) || null;

  useEffect(() => {
    if (!open) return;
    setNotes(open.notes || "");
    setNoteState("");
    setJourney(null);
    setScript(open.intel.status === "booked" || open.kind === "booking" ? "welcome" : open.intel.lead && open.status === "new" ? "first" : "blank");
    if (!open.read_at) {
      const now = new Date().toISOString();
      setItems((list) => list.map((it) => (it.id === open.id ? { ...it, read_at: now } : it)));
      patch({ id: open.id, read: true }).catch(() => {});
    }
    fetch(`/api/admin/inbox?journey=${open.id}`)
      .then((r) => r.json())
      .then((j) => setJourney(j.steps || []))
      .catch(() => setJourney([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId]);

  async function setStatus(status) {
    const id = open.id;
    const prev = open.status;
    setItems((list) => list.map((it) => (it.id === id ? { ...it, status } : it)));
    try {
      const r = await patch({ id, status });
      if (r.needsMigration) setNeedsSql(true);
      if (r.item?.first_contacted_at) setItems((list) => list.map((it) => (it.id === id ? { ...it, first_contacted_at: r.item.first_contacted_at } : it)));
    } catch {
      setItems((list) => list.map((it) => (it.id === id ? { ...it, status: prev } : it)));
    }
  }

  // Tapped Call / Text / Email: a New lead becomes Contacted and the first
  // touch is stamped (once). Never blocks the link from opening.
  function touched() {
    if (!open || !open.intel.lead) return;
    const id = open.id;
    const wasNew = open.status === "new";
    if (!wasNew && open.first_contacted_at) return;
    const stamp = new Date().toISOString();
    setItems((list) => list.map((it) => (it.id === id ? { ...it, status: wasNew ? "contacted" : it.status, first_contacted_at: it.first_contacted_at || stamp } : it)));
    if (wasNew) say("Marked Contacted ✓");
    patch({ id, touch: true })
      .then((r) => { if (r.needsMigration) setNeedsSql(true); })
      .catch(() => {
        setItems((list) => list.map((it) => (it.id === id ? { ...it, status: wasNew ? "new" : it.status } : it)));
        say("Couldn't save — mark them Contacted by hand");
      });
  }

  async function setFollowUp(date) {
    if (!open) return;
    const id = open.id;
    const prev = open.next_follow_up || null;
    setItems((list) => list.map((it) => (it.id === id ? { ...it, next_follow_up: date || null } : it)));
    try {
      const r = await patch({ id, followUp: date || null });
      if (r.needsMigration) {
        setNeedsSql(true);
        setItems((list) => list.map((it) => (it.id === id ? { ...it, next_follow_up: prev } : it)));
      } else say(date ? `Follow-up set for ${prettyDay(date)} ✓` : "Follow-up cleared");
    } catch {
      setItems((list) => list.map((it) => (it.id === id ? { ...it, next_follow_up: prev } : it)));
      say("Couldn't save the follow-up — try again");
    }
  }

  async function setLostReason(reason) {
    if (!open) return;
    const id = open.id;
    const prev = open.lost_reason || null;
    const next = prev === reason ? null : reason;
    setItems((list) => list.map((it) => (it.id === id ? { ...it, lost_reason: next } : it)));
    try {
      const r = await patch({ id, lostReason: next });
      if (r.needsMigration) {
        setNeedsSql(true);
        setItems((list) => list.map((it) => (it.id === id ? { ...it, lost_reason: prev } : it)));
      }
    } catch {
      setItems((list) => list.map((it) => (it.id === id ? { ...it, lost_reason: prev } : it)));
      say("Couldn't save the reason — try again");
    }
  }

  // Same call Clients uses: find (or make) this person's profile, then go there.
  async function openProfile() {
    if (!open?.email || busyProfile) return;
    setBusyProfile(true);
    try {
      const res = await fetch("/api/admin/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ensure", email: open.email, name: open.name, phone: open.phone }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.id) throw new Error(json.error || "Couldn't open the profile");
      router.push(`/portal/admin/clients/${json.id}`);
    } catch (e) {
      say(e.message || "Couldn't open the profile");
      setBusyProfile(false);
    }
  }

  async function saveNotes() {
    if (!open || notes === (open.notes || "")) return;
    const id = open.id;
    setNoteState("Saving…");
    try {
      await patch({ id, notes });
      setItems((list) => list.map((it) => (it.id === id ? { ...it, notes } : it)));
      setNoteState("Saved ✓");
    } catch {
      setNoteState("Couldn't save — try again");
    }
  }

  const firstName = (open?.name || "").split(/\s+/)[0];
  const replySubject = open
    ? open.kind === "quote"
      ? "Your Roth Media quote"
      : "Roth Media"
    : "";
  const replyBody = open ? `Hi ${firstName || "there"},\n\n` : "";

  // The same words the instant lead-alert email offers — opened in Brandon's
  // own Messages / Mail to edit and send. Nothing sends on its own.
  const category = open ? leadCategory(open) : "";
  const scripts = open ? leadScripts({ name: open.name, email: open.email, category }) : null;
  const msg = !open
    ? null
    : script === "first"
    ? { text: scripts.text, subject: scripts.emailSubject, body: scripts.emailBody }
    : script === "welcome"
    ? { text: scripts.welcomeText, subject: scripts.welcomeSubject, body: scripts.welcomeBody }
    : { text: "", subject: replySubject, body: replyBody };
  const smsHref = open?.phone ? `sms:${open.phone}${msg.text ? `?&body=${enc(msg.text)}` : ""}` : "";
  const mailHref = open?.email ? `mailto:${open.email}?subject=${enc(msg.subject)}&body=${enc(msg.body)}` : "";
  const planHref = open
    ? `/portal/admin/shoots?new=1&name=${enc(open.name || "")}&email=${enc(open.email || "")}&phone=${enc(open.phone || "")}${category ? `&kind=${category}` : ""}`
    : "";
  const asked = open ? requestedDate(open) : { raw: "", date: "" };
  const clashes = open && shoots ? dateConflicts(open, shoots) : [];
  const today = todayKey(now);

  return (
    <div className="inbox">
      <div className="inbox-filters" role="tablist" aria-label="Filter leads">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            role="tab"
            aria-selected={filter === f.key}
            className={"ifilter" + (filter === f.key ? " is-on" : "")}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
            <span className="ifilter-n">{counts[f.key] || 0}</span>
          </button>
        ))}
      </div>
      <div className="atoolbar">
        <input
          type="search"
          placeholder="Search names, emails, notes…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search leads"
        />
        <div className="ix-sort" role="group" aria-label="Sort leads">
          <button type="button" className={"achip" + (sort === "smart" ? " is-on" : "")} aria-pressed={sort === "smart"} onClick={() => setSort("smart")}>
            Needs you first
          </button>
          <button type="button" className={"achip" + (sort === "newest" ? " is-on" : "")} aria-pressed={sort === "newest"} onClick={() => setSort("newest")}>
            Newest
          </button>
        </div>
      </div>
      {(needs.due > 0 || needs.overdue > 0) && (
        <p className="ix-needs" role="status">
          {[
            needs.due > 0 && `${needs.due} follow-up${needs.due > 1 ? "s" : ""} due`,
            needs.overdue > 0 && `${needs.overdue} lead${needs.overdue > 1 ? "s" : ""} waiting over 24 hours`,
          ].filter(Boolean).join(" · ")}
        </p>
      )}
      {needsSql && (
        <p className="ix-sqlhint">
          Follow-up dates, “lost because” and first-reply times need one setup step: run{" "}
          <code>supabase/studio-2.sql</code> once in the Supabase SQL editor. Everything else here works without it.
        </p>
      )}

      <div className={"inbox-split" + (open ? " has-open" : "")}>
        <ul className="inbox-list">
          {shown.length === 0 && (
            <li className="portal-empty">
              {items.length === 0
                ? "No forms yet. When someone sends a quote or fills out your card, it shows up here."
                : "Nothing here."}
            </li>
          )}
          {shown.map((it) => (
            <li key={it.id}>
              <button
                type="button"
                className={
                  "irow" +
                  (it.id === openId ? " is-open" : "") +
                  (!it.read_at ? " is-unread" : "")
                }
                onClick={() => setOpenId(it.id)}
              >
                <span className="irow-top">
                  <strong>{it.name || it.email || it.phone}</strong>
                  <span className="irow-when">{when(it.created_at)}</span>
                </span>
                <span className="irow-sum">{it.summary || KIND_LABEL[it.kind]}</span>
                {it.intel.lead && it.intel.open && it.intel.next && (
                  <span className={`ix-next ix-tone-${it.intel.next.tone}`}>
                    <span className="ix-next-k">Your next move</span> {it.intel.next.text}
                  </span>
                )}
                <span className="irow-tags">
                  {it.intel.followDue && <span className="itag ix-flag">{it.intel.followUp === today ? "Due today" : "Follow-up overdue"}</span>}
                  {it.intel.overdue && <span className="itag ix-flag">Overdue</span>}
                  <span className="itag">{KIND_LABEL[it.kind] || it.kind}</span>
                  <span className={`itag itag-${it.intel.status}`}>{it.intel.status}</span>
                  {it.intel.open && (
                    <span className={"itag ix-heat" + (it.intel.heat >= 60 ? " is-hot" : "")} title="How hot this lead is, 0–100">
                      Heat {it.intel.heat}
                    </span>
                  )}
                  {it.intel.open && it.intel.followUp && !it.intel.followDue && !/^Follow up/.test(it.intel.next?.text || "") && <span className="itag">Follow up {it.intel.followLabel}</span>}
                  {it.status === "lost" && it.lost_reason && <span className="itag">{lostReasonLabel(it.lost_reason)}</span>}
                  {it.utm?.source && <span className="itag">via {it.utm.source}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>

        <section className="inbox-detail" aria-live="polite">
          {!open ? (
            <p className="inbox-hint">Pick a lead to see everything they sent.</p>
          ) : (
            <>
              <button type="button" className="achip inbox-back" onClick={() => setOpenId(null)}>
                ← All leads
              </button>
              <div className="idet-head">
                <span className="kick-sm">
                  {KIND_LABEL[open.kind] || open.kind} · {fullWhen(open.created_at)}
                </span>
                <h2>{open.name || open.email || open.phone}</h2>
                {open.summary && <p className="idet-sum">{open.summary}</p>}
              </div>

              {open.intel.lead && open.intel.next && (
                <div className={`ix-move ix-tone-${open.intel.next.tone}`}>
                  <span className="ix-move-k">Your next move</span>
                  <strong>{open.intel.next.text}</strong>
                  <span className="ix-move-meta">
                    {[
                      open.intel.open && `Heat ${open.intel.heat}`,
                      open.intel.overdue && "Overdue",
                      open.first_contacted_at && `First reply ${fullWhen(open.first_contacted_at)}`,
                    ].filter(Boolean).join(" · ")}
                  </span>
                </div>
              )}

              {clashes.length > 0 && (
                <p className={"ix-clash" + (clashes.every((c) => c.mine) ? " is-mine" : "")}>
                  {clashes.every((c) => c.mine)
                    ? `On your calendar: ${clashes[0].title} · ${prettyDay(clashes[0].date)}`
                    : `Heads up — they asked for ${prettyDay(clashes[0].date)} and you already have ${clashes.filter((c) => !c.mine).map((c) => c.title).join(", ")} that day.`}{" "}
                  <a href="/portal/admin/shoots">Open Shoots</a>
                </p>
              )}

              <div className="ix-bar">
                {(open.phone || open.email) && (
                  <div className="ix-scripts" role="group" aria-label="Which message to start from">
                    <span className="ix-label">Message</span>
                    {SCRIPTS.map((o) => (
                      <button key={o.key} type="button" className={"achip" + (script === o.key ? " is-on" : "")} aria-pressed={script === o.key} onClick={() => setScript(o.key)}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                )}
                <div className="idet-actions ix-actions">
                  {open.phone && (
                    <>
                      <a className="abtn" href={smsHref} onClick={touched}>Text</a>
                      <a className="abtn abtn-ghost" href={`tel:${open.phone}`} onClick={touched}>Call</a>
                    </>
                  )}
                  {open.email && (
                    <a className={"abtn" + (open.phone ? " abtn-ghost" : "")} href={mailHref} onClick={touched}>
                      Email
                    </a>
                  )}
                  {open.email && (
                    <button type="button" className="abtn abtn-ghost" onClick={openProfile} disabled={busyProfile}>
                      {busyProfile ? "Opening…" : "Open profile"}
                    </button>
                  )}
                  <a className="abtn abtn-ghost" href={planHref}>Plan shoot</a>
                </div>
                {(open.phone || open.email) && (
                  <p className="ix-preview">
                    {script === "blank"
                      ? "Opens a blank message to write yourself."
                      : <>Opens in your own Messages or Mail, ready to edit: “{(open.phone ? msg.text : msg.body.replace(/\n+/g, " ")).slice(0, 110)}…”</>}
                    {open.intel.lead && open.status === "new" && " Tapping Text, Call or Email marks them Contacted."}
                  </p>
                )}
                {flash && <p className="ix-flash" role="status">{flash}</p>}
              </div>

              <div className="idet-status" role="group" aria-label="Lead status">
                {STATUS.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    className={"istatus istatus-" + s.key + (open.status === s.key ? " is-on" : "")}
                    onClick={() => setStatus(s.key)}
                    aria-pressed={open.status === s.key}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {open.status === "lost" && (
                <div className="ix-lost" role="group" aria-label="Lost because">
                  <span className="ix-label">Lost because</span>
                  {LOST_REASONS.map((r) => (
                    <button key={r.key} type="button" className={"achip" + (open.lost_reason === r.key ? " is-on" : "")} aria-pressed={open.lost_reason === r.key} onClick={() => setLostReason(r.key)}>
                      {r.label}
                    </button>
                  ))}
                </div>
              )}

              {open.intel.lead && open.status !== "lost" && open.status !== "archived" && (
                <div className="ix-follow">
                  <label className="ix-label" htmlFor="ix-follow-date">Follow up</label>
                  <input
                    id="ix-follow-date"
                    type="date"
                    value={open.next_follow_up || ""}
                    min={today}
                    onChange={(e) => setFollowUp(e.target.value)}
                  />
                  <button type="button" className="achip" onClick={() => setFollowUp(addDays(today, 1))}>Tomorrow</button>
                  <button type="button" className="achip" onClick={() => setFollowUp(addDays(today, 3))}>In 3 days</button>
                  <button type="button" className="achip" onClick={() => setFollowUp(addDays(today, 7))}>In a week</button>
                  {open.next_follow_up && <button type="button" className="achip" onClick={() => setFollowUp(null)}>Clear</button>}
                </div>
              )}

              <label className="idet-notes">
                <span>Your notes (only you see these)</span>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => {
                    setNotes(e.target.value);
                    setNoteState("");
                  }}
                  onBlur={saveNotes}
                  placeholder="Called Tues, wants a Saturday in June…"
                />
                {noteState && <em>{noteState}</em>}
              </label>

              <table className="idet-fields">
                <tbody>
                  {(open.fields || []).map(([k, v], i) => (
                    <tr key={i}>
                      <th scope="row">{k}</th>
                      <td>
                        {v}
                        {asked.date && v === asked.raw && !/\d{4}/.test(asked.raw) && <span className="ix-asked"> → {prettyDay(asked.date)}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="idet-journey">
                <h3>Before they reached out</h3>
                {journey === null ? (
                  <p className="inbox-hint">Loading…</p>
                ) : journey.length === 0 ? (
                  <p className="inbox-hint">
                    No visit trail for this one{open.source_path ? ` — sent from ${open.source_path}` : ""}.
                  </p>
                ) : (
                  <>
                    <p className="inbox-hint">
                      {[
                        journey[0].city && `${journey[0].city}${journey[0].region ? `, ${journey[0].region}` : ""}`,
                        journey[0].device,
                        journey[0].browser,
                        journey[0].referrer ? `came from ${journey[0].referrer}` : journey[0].utm_source ? `came via ${journey[0].utm_source}` : "came direct",
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    <ol className="ijourney">
                      {journey.map((s, i) => (
                        <li key={i}>
                          <time>
                            {new Date(s.created_at).toLocaleTimeString("en-US", {
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </time>
                          <span>{s.type === "event" ? `★ ${s.name.replace(/_/g, " ")}` : s.path}</span>
                        </li>
                      ))}
                    </ol>
                  </>
                )}
              </div>

              {open.status !== "archived" && (
                <button type="button" className="achip" onClick={() => setStatus("archived")}>
                  Archive
                </button>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
