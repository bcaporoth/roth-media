import { signedUrl, RELEASE_SIG_RE } from "./r2";
import { projectTeam } from "./staff-server";
import { computeGates } from "./legal";

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
  const [{ data: people }, { data: shoots }, { data: releases }, entriesRes, scenesRes, locsRes, linesRes, costsRes, stakeRes, tasksRes, cardsRes, drivesRes, rollsRes, chronoRes, sourcesRes, questionsRes, eventsRes, clipsRes, selectsRes, cutsRes, notesRes, apprRes, revRes, rnRes, coRes, payRes, commRes, updRes, sensRes, clearRes, cueRes, archRes, legalRes, delRes, fuRes, tsRes, cinvRes, vendRes, poRes, travRes, dprRes] = await Promise.all([
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
    soft(db.from("clips").select("*").eq("project_id", id).order("filename", { ascending: true })),
    soft(db.from("selects").select("*").eq("project_id", id).order("sort", { ascending: true }).order("created_at", { ascending: true })),
    soft(db.from("cuts").select("*").eq("project_id", id).order("created_at", { ascending: false })),
    soft(db.from("screening_notes").select("*").eq("project_id", id).order("at_s", { ascending: true, nullsFirst: false })),
    soft(db.from("approvals").select("*").eq("project_id", id).order("created_at", { ascending: false })),
    soft(db.from("review_versions").select("*").eq("project_id", id).order("created_at", { ascending: false })),
    soft(db.from("review_notes").select("*").eq("project_id", id).order("at_s", { ascending: true, nullsFirst: false })),
    soft(db.from("change_orders").select("*").eq("project_id", id).order("number", { ascending: true })),
    soft(db.from("project_payments").select("*").eq("project_id", id).order("sort", { ascending: true })),
    soft(db.from("comms").select("*").eq("project_id", id).order("date", { ascending: false })),
    soft(db.from("updates").select("*").eq("project_id", id).order("week_of", { ascending: false })),
    soft(db.from("sensitivities").select("*").eq("project_id", id).order("created_at", { ascending: true })),
    soft(db.from("clearance_items").select("*").eq("project_id", id).order("kind", { ascending: true }).order("label", { ascending: true })),
    soft(db.from("music_cues").select("*").eq("project_id", id).order("sort", { ascending: true }).order("created_at", { ascending: true })),
    soft(db.from("archival_items").select("*").eq("project_id", id).order("title", { ascending: true })),
    soft(db.from("legal_items").select("*").eq("project_id", id).order("kind", { ascending: true }).order("sort", { ascending: true }).order("created_at", { ascending: true })),
    soft(db.from("deliverables").select("*").eq("project_id", id).order("sort", { ascending: true })),
    soft(db.from("followups").select("*").eq("project_id", id).order("due", { ascending: true })),
    soft(db.from("timesheets").select("*").eq("project_id", id).order("date", { ascending: true })),
    soft(db.from("crew_invoices").select("*").eq("project_id", id).order("created_at", { ascending: false })),
    soft(db.from("vendors").select("*").order("name", { ascending: true })),
    soft(db.from("purchase_orders").select("*").eq("project_id", id).order("number", { ascending: true })),
    soft(db.from("travel").select("*").eq("project_id", id).order("date", { ascending: false })),
    soft(db.from("daily_reports").select("*").eq("project_id", id)),
  ]);
  // null = sprint1.sql not run yet
  const sprint1 = scenesRes.data === null ? null : { scenes: scenesRes.data || [], locations: locsRes.data || [], lines: linesRes.data || [], costs: costsRes.data || [], stakeholders: stakeRes.data || [], tasks: tasksRes.data || [] };
  const sprint2 = cardsRes.data === null ? null : { cards: cardsRes.data || [], drives: drivesRes.data || [], rolls: rollsRes.data || [] };
  // Thumbs get a signed URL here (local crypto, no round trip); the proxy video is signed on open.
  const sprint4 = clipsRes.data === null ? null : { clips: await Promise.all((clipsRes.data || []).map(async (c) => ({ ...c, thumb_url: c.thumb_key ? await signedUrl(c.thumb_key).catch(() => "") : "" }))), selects: selectsRes.data || [], cuts: cutsRes.data || [], notes: notesRes.data || [], transcribe: Boolean(process.env.ASSEMBLYAI_API_KEY) };
  const sprint5 = apprRes.data === null ? null : { approvals: apprRes.data || [], reviews: revRes.data || [], rnotes: rnRes.data || [], cos: coRes.data || [], payments: payRes.data || [], comms: commRes.data || [], updates: updRes.data || [], sens: sensRes.data || [], email: Boolean(process.env.RESEND_API_KEY) };
  const sprint3 = chronoRes.data === null ? null : { chronology: chronoRes.data || [], sources: sourcesRes.data || [], questions: questionsRes.data || [], events: eventsRes.data || [] };
  // null = journal.sql not run yet; the card says so.
  const entries = entriesRes.error ? null : entriesRes.data || [];
  const days = (shoots || []).map((s) => {
    const list = Array.isArray(s.checklist) ? s.checklist.filter((c) => ["flow", "camera", "shots", "poses"].includes(c.group)) : [];
    const cs = s.callsheet || {};
    return { id: s.id, title: s.title, kind: s.kind, status: s.status, date: s.date, start_time: s.start_time, address: s.address, lat: s.lat, lng: s.lng, crew_token: s.crew_token || null, location_id: s.location_id || null, client_visible: s.client_visible !== false, scene_ids: s.scene_ids || [], callsheet: cs, weather: s.weather || null, total: list.length, done: list.filter((c) => c.done).length };
  });
  const team = await projectTeam(db, id).catch(() => null);
  const sprint7 = delRes.data === null ? null : { deliverables: delRes.data || [], followups: fuRes.data || [], timesheets: tsRes.data || [], invoices: cinvRes.data || [], vendors: vendRes.data || [], pos: poRes.data || [], travel: travRes.data || [], reports: dprRes.data || [] };
  const sprint6 = clearRes.data === null ? null : { clearance: clearRes.data || [], cues: cueRes.data || [], archival: archRes.data || [], legal: legalRes.data || [] };
  const bundle = { project, people: people || [], days, releases: await signReleases(releases || []), entries, team, sprint1, sprint2, sprint3, sprint4, sprint5, sprint6, sprint7 };
  bundle.gates = computeGates(bundle);
  return bundle;
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
  const { data: full, error } = await db.from("projects").select("*").eq("id", id).maybeSingle();
  if (error || !full) return null;
  // Only these fields leave the server — never budget, notes, thesis, arc.
  const project = { id: full.id, title: full.title, kind: full.kind, status: full.status, phase: full.phase, logline: full.logline, milestones: full.milestones, client_name: full.client_name, discovery: full.discovery || {}, discovery_locked_at: full.discovery_locked_at || null, usage_rights: full.usage_rights || "", delivered_at: full.delivered_at || null, retention_until: full.retention_until || null, premiere: full.premiere || {} };
  const soft = (q) => q.then((r) => (r.error ? { data: null } : r), () => ({ data: null }));
  const [{ data: shoots }, { data: people }, tasksRes, stakeRes, apprRes, revRes, rnRes, coRes, payRes, commRes, updRes, delRes] = await Promise.all([
    db.from("shoots").select("id, title, date, start_time, address, status, client_visible").eq("project_id", id).order("date", { ascending: true, nullsFirst: false }),
    db.from("project_people").select("id, name, role, kind, status, shoot_id").eq("project_id", id).eq("kind", "interview"),
    db.from("client_tasks").select("*").eq("project_id", id).order("sort", { ascending: true }).then((r) => r, () => ({ data: [] })),
    db.from("project_stakeholders").select("name, role, portal_role, primary_contact, decision_maker").eq("project_id", id).then((r) => r, () => ({ data: [] })),
    soft(db.from("approvals").select("id, kind, label, detail, status, signed_name, signed_at, note, created_at").eq("project_id", id).order("created_at", { ascending: false })),
    soft(db.from("review_versions").select("id, label, link, video_key, message, status, created_at").eq("project_id", id).eq("client_visible", true).order("created_at", { ascending: false })),
    soft(db.from("review_notes").select("id, review_id, at_s, text, who, side, resolved, created_at").eq("project_id", id).order("at_s", { ascending: true, nullsFirst: false })),
    soft(db.from("change_orders").select("id, number, title, description, amount_cents, expires, status, accepted_name, accepted_at").eq("project_id", id).neq("status", "draft").order("number", { ascending: true })),
    soft(db.from("project_payments").select("id, label, amount_cents, due, status, paid_at, gates").eq("project_id", id).order("sort", { ascending: true })),
    soft(db.from("comms").select("id, date, channel, summary, decisions").eq("project_id", id).eq("client_visible", true).order("date", { ascending: false })),
    soft(db.from("updates").select("id, week_of, body, published_at").eq("project_id", id).not("published_at", "is", null).order("week_of", { ascending: false }).limit(3)),
    soft(db.from("deliverables").select("id, name, kind, spec, status, link, file_key, size_bytes, delivered_at, ack_name, ack_at").eq("project_id", id).eq("client_visible", true).in("status", ["delivered", "acknowledged"]).order("sort", { ascending: true })),
  ]);
  // Masters hand over when the last payment clears — policy, enforced here.
  const unpaid = (payRes.data || []).some((p) => !["paid", "waived"].includes(p.status));
  const deliverables = await Promise.all((delRes.data || []).map(async (d) => { const gated = unpaid && ["master", "textless", "archive", "stems"].includes(d.kind); return { ...d, gated, url: !gated && d.file_key ? await signedUrl(d.file_key, { download: d.file_key.split("/").pop() }).catch(() => "") : "", link: gated ? "" : d.link, file_key: undefined }; }));
  const reviews = await Promise.all((revRes.data || []).map(async (r) => ({ ...r, video_url: r.video_key ? await signedUrl(r.video_key).catch(() => "") : "", video_key: undefined })));
  const machine = apprRes.data === null ? null : { approvals: apprRes.data || [], reviews, rnotes: rnRes.data || [], cos: coRes.data || [], payments: payRes.data || [], comms: commRes.data || [], updates: updRes.data || [], deliverables };
  const days = (shoots || []).filter((s) => s.client_visible !== false && s.status !== "cancelled").map((s) => ({ ...s, who: (people || []).filter((p) => p.shoot_id === s.id).map((p) => p.name) }));
  const interviews = { done: (people || []).filter((p) => ["interviewed", "done"].includes(p.status)).length, total: (people || []).length };
  return { project, days, interviews, tasks: (tasksRes.data || []).filter((t) => !t.done_at), stakeholders: stakeRes.data || [], milestones: (project.milestones || []).filter((m) => m.client_visible !== false), machine };
}
