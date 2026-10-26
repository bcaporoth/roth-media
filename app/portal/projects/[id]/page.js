import { notFound, redirect } from "next/navigation";
import PortalNav from "../../../../components/PortalNav";
import { PortalLobby } from "../../../../components/PortalViews";
import { whoIs } from "../../../../lib/staff-server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { loadClientProject } from "../../../../lib/projects-server";
import { PHASE_LABEL, TASK_CATEGORY_LABEL } from "../../../../lib/production";

// The client's window onto a project: phase, milestones, the days they
// can see (and who's being interviewed), what we still need from them.
// Never the journal, budget, people notes or story internals.
export const dynamic = "force-dynamic";
export const metadata = { title: "Your project — Roth Media", robots: { index: false } };

const fmtDate = (d) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : "Date TBD");
const fmt12 = (t) => { if (!t) return ""; const [h, m] = t.split(":").map(Number); return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`; };

export default async function ClientProjectPage({ params }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const me = await whoIs();
  if (!me) redirect(`/portal?next=/portal/projects/${id}`);
  if (me.role === "brandon") redirect(`/portal/admin/projects/${id}`);
  if (me.role !== "client") notFound();
  const db = supabaseAdmin();
  const { data: owned } = await db.from("projects").select("id").eq("id", id).eq("client_id", me.clientId).maybeSingle();
  if (!owned) notFound();
  const data = await loadClientProject(db, id);
  if (!data) notFound();
  const { project, days, interviews, tasks, stakeholders, milestones } = data;
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
  const upcoming = days.filter((d) => !d.date || d.date >= today);
  const past = days.filter((d) => d.date && d.date < today);
  const next = milestones.find((m) => !m.done);
  return (
    <>
      <PortalNav email={me.email} active="project" brand />
      <PortalLobby kicker="Your project" title={project.title} lede={project.logline || "Where the film is, what's next, and what we need from you."}>
        <div className="cproj">
          <div className="proj-stats">
            <div><strong>{PHASE_LABEL[project.phase] || "Development"}</strong><em>phase</em></div>
            <div><strong>{past.length}/{days.length}</strong><em>days filmed</em></div>
            <div><strong>{interviews.done}/{interviews.total}</strong><em>interviews done</em></div>
            <div><strong>{next ? next.label : "—"}</strong><em>{next?.date ? `next · ${fmtDate(next.date)}` : "next milestone"}</em></div>
          </div>

          {tasks.length > 0 && (
            <section className="cprof-card cproj-needs">
              <div className="cprof-cardhead"><h2>We need from you</h2></div>
              <ul className="shoot-check">{tasks.map((t) => <li key={t.id}><label><span>☐ {t.title}{t.due ? ` — by ${fmtDate(t.due)}` : ""} <em className="gcard-meta">· {TASK_CATEGORY_LABEL[t.category]}</em></span></label></li>)}</ul>
              <p className="gcard-meta">Reply to Brandon&apos;s last message, or text him, when one&apos;s done.</p>
            </section>
          )}

          <section className="cprof-card">
            <div className="cprof-cardhead"><h2>Filming days</h2></div>
            {upcoming.length === 0 && <p className="gcard-meta">Nothing scheduled yet.</p>}
            <ul className="shoot-list">
              {upcoming.map((d) => (
                <li key={d.id} className="shoot"><div className="shoot-row shoot-row-link staff-row">
                  <span className="shoot-when"><strong>{fmtDate(d.date)}</strong><em>{d.start_time ? fmt12(d.start_time) : ""}</em></span>
                  <span className="shoot-main"><strong>{d.title}</strong><em>{d.address || ""}{d.who.length ? ` · on camera: ${d.who.join(", ")}` : ""}</em></span>
                </div></li>
              ))}
            </ul>
            {past.length > 0 && <p className="gcard-meta">Filmed so far: {past.map((d) => `${fmtDate(d.date)} — ${d.title}`).join(" · ")}</p>}
          </section>

          {milestones.length > 0 && (
            <section className="cprof-card">
              <div className="cprof-cardhead"><h2>Milestones</h2></div>
              <ol className="cproj-ms">{milestones.map((m, i) => <li key={m.key || i} className={m.done ? "is-done" : m === next ? "is-next" : ""}><span>{m.done ? "✓" : m === next ? "→" : "·"}</span> {m.label}{m.date ? <em> · {fmtDate(m.date)}</em> : null}</li>)}</ol>
            </section>
          )}

          {stakeholders.length > 0 && (
            <section className="cprof-card">
              <div className="cprof-cardhead"><h2>Your team on this</h2></div>
              <ul className="cprof-list">{stakeholders.map((x, i) => <li key={i}><strong>{x.name}</strong> <span className="gcard-meta">· {x.role}{x.decision_maker ? " · signs off" : ""}{x.primary_contact ? " · main contact" : ""}</span></li>)}</ul>
            </section>
          )}
        </div>
      </PortalLobby>
    </>
  );
}
