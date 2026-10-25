import { signedUrl, RELEASE_SIG_RE } from "./r2";

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
  const [{ data: people }, { data: shoots }, { data: releases }, entriesRes] = await Promise.all([
    db.from("project_people").select("*").eq("project_id", id).order("sort", { ascending: true }),
    db.from("shoots").select("id, title, kind, status, date, start_time, address, checklist, crew_token").eq("project_id", id).order("date", { ascending: true, nullsFirst: false }),
    db.from("releases").select("*").eq("project_id", id).order("signed_at", { ascending: false }),
    db.from("project_entries").select("*").eq("project_id", id).order("pinned", { ascending: false }).order("entry_date", { ascending: false }).order("created_at", { ascending: false }),
  ]);
  // null = journal.sql not run yet; the card says so.
  const entries = entriesRes.error ? null : entriesRes.data || [];
  const days = (shoots || []).map((s) => {
    const list = Array.isArray(s.checklist) ? s.checklist.filter((c) => ["flow", "camera", "shots", "poses"].includes(c.group)) : [];
    return { id: s.id, title: s.title, kind: s.kind, status: s.status, date: s.date, start_time: s.start_time, address: s.address, crew_token: s.crew_token || null, total: list.length, done: list.filter((c) => c.done).length };
  });
  return { project, people: people || [], days, releases: await signReleases(releases || []), entries };
}

export async function listReleases(db) {
  const { data, error } = await db.from("releases").select("*").order("signed_at", { ascending: false }).limit(500);
  if (error) { if (missing(error)) return null; throw new Error(error.message); }
  const pids = [...new Set((data || []).map((r) => r.project_id).filter(Boolean))];
  const { data: projects } = pids.length ? await db.from("projects").select("id, title").in("id", pids) : { data: [] };
  const title = Object.fromEntries((projects || []).map((p) => [p.id, p.title]));
  return signReleases((data || []).map((r) => ({ ...r, project_title: title[r.project_id] || "" })));
}
