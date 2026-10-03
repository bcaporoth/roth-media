"use client";

// Studio → Clients: the roster, each client's galleries and login status,
// one-tap actions (share link, gallery-ready email, temp password), and a
// broadcast composer for everyone or a checked few.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { STAGES, STAGE_LABEL, TYPES, TYPE_LABEL } from "../lib/intake";

async function api(payload) {
  const res = await fetch("/api/admin/clients", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
  return json;
}
const fmt = (d) => (d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "");

export default function ClientsBoard({ initial, emailReady }) {
  const [clients, setClients] = useState(initial);
  const [query, setQuery] = useState("");
  const [checked, setChecked] = useState({});
  const [open, setOpen] = useState(null); // client id expanded
  const [flash, setFlash] = useState("");
  const [error, setError] = useState("");
  const [composer, setComposer] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ name: "", email: "", phone: "" });
  const [stage, setStage] = useState("");   // "" = everyone
  const [type, setType] = useState("");

  const refresh = async () => {
    const res = await fetch("/api/admin/clients");
    const json = await res.json();
    if (res.ok) setClients(json.clients);
  };
  const say = (m) => { setFlash(m); setTimeout(() => setFlash(""), 3000); };
  const fail = (e) => { setError(e.message || String(e)); setTimeout(() => setError(""), 6000); };

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return clients.filter((c) => {
      if (stage && c.stage !== stage) return false;
      if (type && c.type !== type) return false;
      if (!q) return true;
      return [c.name, c.email, c.phone, STAGE_LABEL[c.stage], TYPE_LABEL[c.type], ...(c.galleries || []).map((g) => g.title)].join(" ").toLowerCase().includes(q);
    });
  }, [clients, query, stage, type]);
  const stageCounts = useMemo(() => { const n = {}; for (const c of clients) n[c.stage] = (n[c.stage] || 0) + 1; return n; }, [clients]);
  const checkedIds = Object.keys(checked).filter((k) => checked[k]);

  async function copy(text, label) {
    try { await navigator.clipboard.writeText(text); say(`${label} copied`); } catch { window.prompt("Copy:", text); }
  }
  async function add(e) {
    e.preventDefault();
    try { await api({ action: "add", ...draft }); setDraft({ name: "", email: "", phone: "" }); setAdding(false); await refresh(); say("Added"); } catch (err) { fail(err); }
  }
  async function save(c, patch) {
    try { await api({ action: "update", id: c.id, ...patch }); await refresh(); say("Saved"); } catch (err) { fail(err); }
  }
  async function tempPassword(c) {
    if (!window.confirm(`Set a new temporary password for ${c.email}? Their old one stops working.`)) return;
    try { const r = await api({ action: "set-password", email: c.email }); window.prompt(`Temporary password for ${c.email} — copy it and text it to them:`, r.password); await refresh(); } catch (err) { fail(err); }
  }
  async function galleryReady(c, g) {
    if (!window.confirm(`Email ${c.email} that "${g.title}" is ready?`)) return;
    try { await api({ action: "gallery-ready", clientId: c.id, galleryId: g.id }); say("Sent"); } catch (err) { fail(err); }
  }
  async function addMember(g) {
    const email = window.prompt(`Who else should see "${g.title}"? Their email:`);
    if (!email) return;
    const name = window.prompt("Their name (optional):") || "";
    try { await api({ action: "add-member", galleryId: g.id, email, name }); await refresh(); say("Added — they log in with their own email"); } catch (err) { fail(err); }
  }
  async function removeMember(g, m) {
    if (!window.confirm(`Remove ${m.name || m.email} from "${g.title}"?`)) return;
    try { await api({ action: "remove-member", galleryId: g.id, clientId: m.id }); await refresh(); say("Removed"); } catch (err) { fail(err); }
  }
  async function remove(c) {
    if (!window.confirm(`Remove ${c.name || c.email} from the roster?`)) return;
    try { const r = await api({ action: "remove", id: c.id }); await refresh(); say(r.loginRemoved ? "Removed — login deleted too" : "Removed"); } catch (err) { fail(err); }
  }
  async function resubscribe(c) {
    if (!window.confirm(`${c.name || c.email} unsubscribed. Only switch them back on if they asked you to. Continue?`)) return;
    try { await api({ action: "resubscribe", id: c.id }); await refresh(); say("Back on the list"); } catch (err) { fail(err); }
  }
  async function broadcast(e) {
    e.preventDefault();
    const n = checkedIds.length || clients.length;
    if (!window.confirm(`Send "${subject}" to ${n} ${n === 1 ? "client" : "clients"}?`)) return;
    setSending(true);
    try {
      const r = await api({ action: "broadcast", subject, message, ids: checkedIds });
      say(`Sent to ${r.sent}${r.skipped ? ` · ${r.skipped} unsubscribed, skipped` : ""}${r.failed?.length ? ` · ${r.failed.length} failed` : ""}`);
      if (r.failed?.length) setError(r.failed.join("\n"));
      setComposer(false); setSubject(""); setMessage(""); setChecked({});
    } catch (err) { fail(err); } finally { setSending(false); }
  }

  return (
    <div className="clients">
      <div className="atoolbar">
        <input type="search" placeholder="Search name, email, gallery…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search clients" />
        <button type="button" className="abtn abtn-ghost" onClick={() => setAdding(!adding)}>{adding ? "Close" : "+ Add client"}</button>
        <button type="button" className="abtn" onClick={() => setComposer(!composer)} disabled={!emailReady} title={emailReady ? "" : "Add RESEND_API_KEY in Vercel to send email"}>
          ✉ Email {checkedIds.length ? `${checkedIds.length} checked` : "everyone"}
        </button>
      </div>
      <div className="inbox-filters" role="tablist" aria-label="Filter by stage">
        <button type="button" role="tab" aria-selected={!stage} className={"ifilter" + (!stage ? " is-on" : "")} onClick={() => setStage("")}>Everyone <span className="ifilter-n">{clients.length}</span></button>
        {STAGES.filter((s) => stageCounts[s.key]).map((s) => (
          <button key={s.key} type="button" role="tab" aria-selected={stage === s.key} className={"ifilter" + (stage === s.key ? " is-on" : "")} onClick={() => setStage(stage === s.key ? "" : s.key)}>{s.label} <span className="ifilter-n">{stageCounts[s.key]}</span></button>
        ))}
        <span className="ifilter-sep" aria-hidden="true" />
        {TYPES.map((t) => (
          <button key={t.id} type="button" className={"ifilter" + (type === t.id ? " is-on" : "")} aria-pressed={type === t.id} onClick={() => setType(type === t.id ? "" : t.id)}>{t.label}</button>
        ))}
      </div>
      {!emailReady && <p className="inbox-hint">Email sending isn&apos;t switched on yet — add <code>RESEND_API_KEY</code> in Vercel → Settings → Environment Variables, redeploy, and the email buttons light up. Everything else here works now.</p>}
      {flash && <p className="clients-flash">{flash}</p>}
      {error && <p className="cform-error" style={{ whiteSpace: "pre-wrap" }}>{error}</p>}

      {adding && (
        <form className="clients-add" onSubmit={add}>
          <input placeholder="Name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          <input placeholder="Email" type="email" required value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
          <input placeholder="Phone (optional)" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
          <button type="submit" className="abtn">Add</button>
        </form>
      )}

      {composer && (
        <form className="clients-compose" onSubmit={broadcast}>
          <div className="kick-sm">To: {checkedIds.length ? `${checkedIds.length} checked` : `everyone (${clients.length})`} · write {"{name}"} for their first name</div>
          <input placeholder="Subject" required value={subject} onChange={(e) => setSubject(e.target.value)} />
          <textarea rows={8} required placeholder={"Hi {name},\n\n…"} value={message} onChange={(e) => setMessage(e.target.value)} />
          <div className="gcard-actions">
            <button type="submit" className="abtn" disabled={sending}>{sending ? "Sending…" : "Send"}</button>
            <button type="button" className="abtn abtn-ghost" onClick={() => setComposer(false)}>Cancel</button>
          </div>
        </form>
      )}

      {shown.length === 0 && <p className="portal-empty">{clients.length ? "Nothing matches that filter." : "No clients yet — they're added automatically when you create a gallery, or add one above."}</p>}

      <ul className="clients-list">
        {shown.map((c) => {
          const isOpen = open === c.id;
          return (
            <li key={c.id} className={"client" + (isOpen ? " is-open" : "")}>
              <div className="client-row">
                <input type="checkbox" checked={!!checked[c.id]} onChange={(e) => setChecked({ ...checked, [c.id]: e.target.checked })} aria-label={`Select ${c.email}`} />
                <button type="button" className="client-main" onClick={() => setOpen(isOpen ? null : c.id)}>
                  <strong>{c.name || c.email} <span className={`itag stage-${c.stage}`}>{STAGE_LABEL[c.stage]}</span>{c.type && <span className="itag">{TYPE_LABEL[c.type]}</span>}</strong>
                  <span className="gcard-meta">{c.email}{c.phone ? ` · ${c.phone}` : ""}</span>
                  <span className="gcard-meta">
                    {c.galleries.length} {c.galleries.length === 1 ? "gallery" : "galleries"}
                    {" · "}{c.account ? (c.account.lastSignIn ? `logs in · last ${fmt(c.account.lastSignIn)}` : "has a login · never signed in") : "no login yet — share link only"}
                    {c.email_opt_out && <> · <em>unsubscribed</em></>}
                  </span>
                </button>
                <div className="client-quick">
                  <Link className="achip achip-primary" href={`/portal/admin/clients/${c.id}`}>Profile</Link>
                  <a className="achip" href={`mailto:${c.email}`}>Email</a>
                  {c.phone && <a className="achip" href={`sms:${c.phone.replace(/[^\d+]/g, "")}`}>Text</a>}
                </div>
              </div>

              {isOpen && (
                <div className="client-detail" key={`${c.id}-${c.name}-${c.email}-${c.phone}`}>
                  <div className="client-fields">
                    <label>Name<input defaultValue={c.name} onBlur={(e) => e.target.value !== c.name && save(c, { name: e.target.value })} /></label>
                    <label>Email<input defaultValue={c.email} onBlur={(e) => e.target.value !== c.email && save(c, { email: e.target.value })} /></label>
                    <label>Phone<input defaultValue={c.phone} onBlur={(e) => e.target.value !== c.phone && save(c, { phone: e.target.value })} /></label>
                  </div>
                  <label className="client-notes">Notes<textarea rows={3} defaultValue={c.notes} placeholder="Anniversary, kids' names, what they loved…" onBlur={(e) => e.target.value !== c.notes && save(c, { notes: e.target.value })} /></label>

                  <div className="kick-sm">Galleries</div>
                  {c.galleries.length === 0 && <p className="gcard-meta">None yet.</p>}
                  <ul className="client-galleries">
                    {c.galleries.map((g) => (
                      <li key={g.id + (g.shared ? "-s" : "")}>
                        <span><strong>{g.title}</strong> <span className="gcard-meta">· {g.media_count || 0} items{g.event_date ? ` · ${fmt(g.event_date)}` : ""}{g.shared ? " · shared with them" : ""}</span></span>
                        <span className="gcard-actions">
                          <button type="button" className="achip" onClick={() => copy(`https://rothmediaco.com/g/${g.share_token}`, "Share link")}>Copy link</button>
                          <a className="achip" href={`/portal/gallery/${g.id}`}>Open</a>
                          <button type="button" className="achip" disabled={!emailReady} onClick={() => galleryReady(c, g)}>Email &quot;it&apos;s ready&quot;</button>
                        </span>
                        {!g.shared && (
                          <span className="client-members">
                            <span className="gcard-meta">Also on this album:</span>
                            {(g.members || []).map((m) => (
                              <span key={m.id} className="itag">{m.name || m.email} <button type="button" aria-label={`Remove ${m.email}`} onClick={() => removeMember(g, m)}>×</button></span>
                            ))}
                            <button type="button" className="achip" onClick={() => addMember(g)}>+ Add someone</button>
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>

                  <div className="kick-sm">Login</div>
                  <p className="gcard-meta">
                    {c.account ? (c.account.lastSignIn ? `Account exists · last sign-in ${fmt(c.account.lastSignIn)}.` : "Account exists · never signed in.") : "No account yet — the share link works without one."}
                    {" "}Set a temporary password and text it to them; they can change it anytime from their account page.
                  </p>
                  <div className="gcard-actions">
                    <button type="button" className="achip" onClick={() => tempPassword(c)}>{c.account ? "Reset password" : "Create login + password"}</button>
                    <button type="button" className="achip" onClick={() => copy("https://rothmediaco.com/portal", "Portal link")}>Copy portal link</button>
                    {c.email_opt_out && <button type="button" className="achip" onClick={() => resubscribe(c)}>Re-subscribe</button>}
                    <button type="button" className="achip achip-danger" onClick={() => remove(c)}>Remove</button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
