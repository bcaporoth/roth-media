"use client";

import { useEffect, useMemo, useState } from "react";

// Studio inbox — every form from the site, a New → Contacted → Booked
// pipeline, private notes, one-tap call/text/email, and the pages the
// person looked at before they reached out.

const STATUS = [
  { key: "new", label: "New" },
  { key: "contacted", label: "Contacted" },
  { key: "booked", label: "Booked" },
  { key: "lost", label: "Lost" },
  { key: "archived", label: "Archived" },
];

const FILTERS = [
  { key: "open", label: "Active" },
  { key: "new", label: "New" },
  { key: "contacted", label: "Contacted" },
  { key: "booked", label: "Booked" },
  { key: "lost", label: "Lost" },
  { key: "archived", label: "Archived" },
  { key: "all", label: "All" },
];

const KIND_LABEL = { quote: "Quote", booking: "Booked 💸", promo: "Promo entry", card: "Business card", contact: "Message" };

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
  });
  if (!res.ok) throw new Error("save failed");
  return res.json();
}

export default function InboxBoard({ initial }) {
  const [items, setItems] = useState(initial);
  const [filter, setFilter] = useState("open");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState(null);
  const [notes, setNotes] = useState("");
  const [noteState, setNoteState] = useState("");
  const [journey, setJourney] = useState(null);

  const counts = useMemo(() => {
    const c = { all: items.length, open: 0 };
    for (const s of STATUS) c[s.key] = 0;
    for (const it of items) {
      c[it.status] = (c[it.status] || 0) + 1;
      if (it.status !== "archived" && it.status !== "lost") c.open++;
    }
    return c;
  }, [items]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((it) => {
      if (filter === "open" && (it.status === "archived" || it.status === "lost")) return false;
      if (filter !== "open" && filter !== "all" && it.status !== filter) return false;
      if (!q) return true;
      return [it.name, it.email, it.phone, it.summary, it.notes, ...(it.fields || []).map((f) => f[1])]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [items, filter, query]);

  const open = items.find((it) => it.id === openId) || null;

  useEffect(() => {
    if (!open) return;
    setNotes(open.notes || "");
    setNoteState("");
    setJourney(null);
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
      await patch({ id, status });
    } catch {
      setItems((list) => list.map((it) => (it.id === id ? { ...it, status: prev } : it)));
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
      </div>

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
                <span className="irow-tags">
                  <span className="itag">{KIND_LABEL[it.kind] || it.kind}</span>
                  <span className={`itag itag-${it.status}`}>{it.status}</span>
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

              <div className="idet-actions">
                {open.phone && (
                  <>
                    <a className="abtn" href={`tel:${open.phone}`}>Call</a>
                    <a className="abtn abtn-ghost" href={`sms:${open.phone}`}>Text</a>
                  </>
                )}
                {open.email && (
                  <a
                    className={"abtn" + (open.phone ? " abtn-ghost" : "")}
                    href={`mailto:${open.email}?subject=${encodeURIComponent(replySubject)}&body=${encodeURIComponent(replyBody)}`}
                  >
                    Email
                  </a>
                )}
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
                      <td>{v}</td>
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
