import { signedUrl, RELEASE_SIG_RE } from "./r2";
import { projectTeam } from "./staff-server";

// Server-side loaders for the project pages and the vault. A missing table
// (projects.sql not run yet) comes back as null so the page can say so.
const missing = (e) => /projects|project_people|releases/i.test(e.message) && /does not exist|schema cache/i.test(e.message);

export async function signReleases(rows) {
  return Promise.all((rows || []).map(async (r) => ({ ...r, signature_url: RELEASE_SIG_RE.test(r.signature_key || "") ? await signedUrl(r.signature_key).catch(() => "") : "" })));
}

export async function listProjects(db) {
  const { data, error } = await db.from("projects").select("*").order("updated_at", { ascending: false });
  if (error) { if (missing(error)) return null; throw new Error(error.message); }
  const ids = (data || []).map((p) => p.id);
  if (!ids.length) return [];
  const [{ data: people }, { data: shoots }] = await Promise.all([
    db.from("project_people").select("project_id, status").in("project_id", ids),
    db.from("shoots").select("project_id, date, status").in("project_id", ids),
  ]);
  return data.map((p) => ({
    ...p,
    people: (people || []).filter((x) => x.project_id === p.id).length,
    interviewed: (people || []).filter((x) => x.project_id === p.id && (x.status === "interviewed" || x.status === "done")).length,
    days: (shoots || []).filter((x) => x.project_id === p.id && x.status !== "cancelled").length,
    filmed: (shoots || []).filter((x) => x.project_id === p.id && x.status === "done").length,
  }));
}

export async function loadProject(db, id) {
  const { data: project, error } = await db.from("projects").select("*").eq("id", id).maybeSingle();
  if (error) { if (missing(error)) return { missing: true }; throw new Error(error.message); }
  if (!project) return null;
  const soft = (q) => q.then((r) => (r.error ? { data: null } : r), () => ({ data: null }));
  const [{ data: people }, { data: shoots }, { data: releases }, entriesRes, scenesRes, locsRes, linesRes, costsRes, stakeRes, tasksRes, cardsRes, drivesRes, rollsRes, chronoRes, sourcesRes, questionsRes, eventsRes] = await Promise.all([
    db.from("project_people").select("*").eq("project_id", id).order("sort", { ascending: true }),
    db.from("shoots").select("*").eq("project_id", id).order("date", { ascending: true, nullsFirst: false }),
    db.from("releases").select("*").eq("project_id", id).order("signed_at", { ascending: false }),
    db.from("project_entries").select("*").eq("project_id", id).order("pinned", { ascending: false }).order("entry_date", { ascending: false }).order("created_at", { ascending: false }),
    soft(db.from("scenes").select("*").eq("project_id", id).order("sort", { ascending: true })),
    soft(db.from("locations").select("*").eq("project_id", id).order("sort", { ascending: true })),
    soft(db.from("budget_lines").select("*").eq("project_id", id).order("sort", { ascending: true })),
    soft(db.from("cost_entries").select("*").eq("project_id", id).order("date", { ascending: false })),
    soft(db.from("project_stakeholders").select("*").eq("project_id", id).order("sort", { ascending: true })),
    soft(db.from("client_tasks").select("*").eq("project_id", id).order("sort", { ascending: true })),
    soft(db.from("media_cards").select("*").eq("project_id", id).order("label", { ascending: true })),
    soft(db.from("drives").select("*").eq("project_id", id).order("role", { ascending: true })),
    soft(db.from("rolls").select("*").eq("project_id", id).order("created_at", { ascending: false })),
    soft(db.from("chronology").select("*").eq("project_id", id).order("sort_date", { ascending: true, nullsFirst: false })),
    soft(db.from("sources").select("*").eq("project_id", id).order("title", { ascending: true })),
    soft(db.from("questions").select("*").eq("project_id", id).order("theme", { ascending: true }).order("sort", { ascending: true })),
    soft(db.from("events").select("*").eq("project_id", id).order("date", { ascending: true, nullsFirst: false })),
  ]);
  // null = sprint1.sql not run yet
  const sprint1 = scenesRes.data === null ? null : { scenes: scenesRes.data || [], locations: locsRes.data || [], lines: linesRes.data || [], costs: costsRes.data || [], stakeholders: stakeRes.data || [], tasks: tasksRes.data || [] };
  const sprint2 = cardsRes.data === null ? null : { cards: cardsRes.data || [], drives: drivesRes.data || [], rolls: rollsRes.data || [] };
  const sprint3 = chronoRes.data === null ? null : { chronology: chronoRes.data || [], sources: sourcesRes.data || [], questions: questionsRes.data || [], events: eventsRes.data || [] };
  // null = journal.sql not run yet; the card says so.
  const entries = entriesRes.error ? null : entriesRes.data || [];
  const days = (shoots || []).map((s) => {
    const list = Array.isArray(s.checklist) ? s.checklist.filter((c) => ["flow", "camera", "shots", "poses"].includes(c.group)) : [];
    const cs = s.callsheet || {};
    return { id: s.id, title: s.title, kind: s.kind, status: s.status, date: s.date, start_time: s.start_time, address: s.address, lat: s.lat, lng: s.lng, crew_token: s.crew_token || null, location_id: s.location_id || null, client_visible: s.client_visible !== false, scene_ids: s.scene_ids || [], callsheet: cs, weather: s.weather || null, total: list.length, done: list.filter((c) => c.done).length };
  });
  const team = await projectTeam(db, id).catch(() => null);
  return { project, people: people || [], days, releases: await signReleases(releases || []), entries, team, sprint1, sprint2, sprint3 };
}

export async function listReleases(db) {
  const { data, error } = await db.from("releases").select("*").order("signed_at", { ascending: false }).limit(500);
  if (error) { if (missing(error)) return null; throw new Error(error.message); }
  const pids = [...new Set((data || []).map((r) => r.project_id).filter(Boolean))];
  const { data: projects } = pids.length ? await db.from("projects").select("id, title").in("id", pids) : { data: [] };
  const title = Object.fromEntries((projects || []).map((p) => [p.id, p.title]));
  return signReleases((data || []).map((r) => ({ ...r, project_title: title[r.project_id] || "" })));
}

// What the client gets to see of a project: a curated projection, never the
// journal, budget, people notes or story internals.
export async function loadClientProject(db, id) {
  const { data: project, error } = await db.from("projects").select("id, title, kind, status, phase, logline, milestones, client_name").eq("id", id).maybeSingle();
  if (error || !project) return null;
  const [{ data: shoots }, { data: people }, tasksRes, stakeRes] = await Promise.all([
    db.from("shoots").select("id, title, date, start_time, address, status, client_visible").eq("project_id", id).order("date", { ascending: true, nullsFirst: false }),
    db.from("project_people").select("id, name, role, kind, status, shoot_id").eq("project_id", id).eq("kind", "interview"),
    db.from("client_tasks").select("*").eq("project_id", id).order("sort", { ascending: true }).then((r) => r, () => ({ data: [] })),
    db.from("project_stakeholders").select("name, role, portal_role, primary_contact, decision_maker").eq("project_id", id).then((r) => r, () => ({ data: [] })),
  ]);
  const days = (shoots || []).filter((s) => s.client_visible !== false && s.status !== "cancelled").map((s) => ({ ...s, who: (people || []).filter((p) => p.shoot_id === s.id).map((p) => p.name) }));
  const interviews = { done: (people || []).filter((p) => ["interviewed", "done"].includes(p.status)).length, total: (people || []).length };
  return { project, days, interviews, tasks: (tasksRes.data || []).filter((t) => !t.done_at), stakeholders: stakeRes.data || [], milestones: (project.milestones || []).filter((m) => m.client_visible !== false) };
}
