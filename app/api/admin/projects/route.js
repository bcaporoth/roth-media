import { NextResponse } from "next/server";
import { whoIs, canProject, projectOf } from "../../../../lib/staff-server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { r2Configured, putSignature, signedUrl } from "../../../../lib/r2";
import { RELEASE_KINDS, TEXT_VERSION, releaseBody } from "../../../../lib/releases";
import { PROJECT_STATUSES, PERSON_STATUSES, PERSON_KINDS } from "../../../../lib/projects";
import { ARC_KEYS } from "../../../../lib/story-arc";
import { ARC_ROLES, ERAS, SOURCE_KINDS, QUESTION_THEMES, PHASES, SCENE_KINDS, SCENE_STATUSES, LOCATION_KINDS, BUDGET_SECTIONS, BUDGET_TOPSHEET, DEFAULT_MILESTONES } from "../../../../lib/production";

// Studio → Projects: the job above the dates. Projects, the people in them
// (cast + sources), story beats, archive to-gets, and the releases signed on
// the spot. Everything here is Brandon-only.
export const dynamic = "force-dynamic";

const deny = () => NextResponse.json({ error: "Not authorized" }, { status: 403 });
const bad = (msg, status = 422) => NextResponse.json({ error: msg }, { status });
const clip = (v, n) => String(v ?? "").trim().slice(0, n);
const isId = (v) => /^[0-9a-f-]{36}$/.test(String(v || ""));
const missing = (e) => bad(/projects|project_people|project_entries|releases|scenes|locations|budget_lines|cost_entries|project_stakeholders|client_tasks|media_cards|drives|rolls|chronology|sources|questions|events/i.test(e.message) && /does not exist|schema cache/i.test(e.message) ? (/project_entries/i.test(e.message) ? "Run supabase/journal.sql once in the Supabase SQL editor first" : /chronology|sources|questions|events|thesis|style|arc_role|eyeline|plan/i.test(e.message) ? "Run supabase/sprint3.sql once in the Supabase SQL editor first" : /media_cards|drives|rolls|callsheet|scene_ids/i.test(e.message) ? "Run supabase/sprint2.sql once in the Supabase SQL editor first" : /scenes|locations|budget_lines|cost_entries|project_stakeholders|client_tasks|column/i.test(e.message) ? "Run supabase/sprint1.sql once in the Supabase SQL editor first" : "Run supabase/projects.sql once in the Supabase SQL editor first") : e.message, 500);


function cleanProject(b) {
  const o = {};
  if (b.title !== undefined) { o.title = clip(b.title, 120); if (!o.title) throw new Error("Give the project a name"); }
  if (b.kind !== undefined) o.kind = clip(b.kind, 30) || "documentary";
  for (const k of ["client_name", "client_email"]) if (b[k] !== undefined) o[k] = clip(b[k], 120);
  if (b.status !== undefined) o.status = PROJECT_STATUSES.includes(b.status) ? b.status : "planning";
  if (b.logline !== undefined) o.logline = clip(b.logline, 400);
  if (b.notes !== undefined) o.notes = clip(b.notes, 8000);
  if (b.beats !== undefined) o.beats = (Array.isArray(b.beats) ? b.beats : []).slice(0, 80).map((x) => ({ text: clip(x?.text, 300), done: Boolean(x?.done), who: clip(x?.who, 120) })).filter((x) => x.text);
  if (b.thesis !== undefined) o.thesis = (Array.isArray(b.thesis) ? b.thesis : []).slice(-40).map((t, i) => ({ v: Number(t?.v) || i + 1, date: clip(t?.date, 10), text: clip(t?.text, 1500), one_line: clip(t?.one_line, 300), changed: clip(t?.changed, 400) })).filter((t) => t.text || t.one_line);
  if (b.style !== undefined && typeof b.style === "object") o.style = Object.fromEntries(Object.entries(b.style || {}).slice(0, 30).map(([k, v]) => [clip(k, 40), clip(v, 1200)]));
  if (b.production_phone !== undefined) o.production_phone = clip(b.production_phone, 40);
  if (b.code !== undefined) o.code = clip(b.code, 8).toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (b.phase !== undefined) o.phase = PHASES.includes(b.phase) ? b.phase : "development";
  if (b.client_id !== undefined) o.client_id = isId(b.client_id) ? b.client_id : null;
  if (b.conventions !== undefined && typeof b.conventions === "object") o.conventions = Object.fromEntries(Object.entries(b.conventions || {}).slice(0, 30).map(([k, v]) => [clip(k, 40), clip(v, 300)]));
  if (b.milestones !== undefined) o.milestones = (Array.isArray(b.milestones) ? b.milestones : []).slice(0, 30).map((m) => ({ key: clip(m?.key, 40), label: clip(m?.label, 80), date: /^\d{4}-\d{2}-\d{2}$/.test(String(m?.date || "")) ? m.date : "", done: Boolean(m?.done), client_visible: m?.client_visible !== false })).filter((m) => m.label);
  if (b.contingency_pct !== undefined) o.contingency_pct = Math.max(0, Math.min(50, Number(b.contingency_pct) || 0));
  if (b.arc !== undefined) o.arc = Object.fromEntries(ARC_KEYS.map((k) => [k, clip(b.arc?.[k], 2000)]).filter(([, v]) => v));
  if (b.archive !== undefined) o.archive = (Array.isArray(b.archive) ? b.archive : []).slice(0, 80).map((x) => ({ text: clip(x?.text, 300), source: clip(x?.source, 160), status: ["wanted", "requested", "in_hand"].includes(x?.status) ? x.status : "wanted" })).filter((x) => x.text);
  return o;
}
function cleanPerson(b) {
  const o = {};
  if (b.name !== undefined) { o.name = clip(b.name, 120); if (!o.name) throw new Error("Give them a name"); }
  for (const k of ["role", "phone", "email"]) if (b[k] !== undefined) o[k] = clip(b[k], 160);
  if (b.kind !== undefined) o.kind = PERSON_KINDS.includes(b.kind) ? b.kind : "interview";
  if (b.status !== undefined) o.status = PERSON_STATUSES.includes(b.status) ? b.status : "to_reach";
  if (b.shoot_id !== undefined) o.shoot_id = isId(b.shoot_id) ? b.shoot_id : null;
  for (const k of ["scenes", "questions", "notes"]) if (b[k] !== undefined) o[k] = clip(b[k], 4000);
  if (b.arc_role !== undefined) o.arc_role = ARC_ROLES.includes(b.arc_role) ? b.arc_role : "";
  if (b.eyeline !== undefined) o.eyeline = ["L", "R"].includes(b.eyeline) ? b.eyeline : "";
  if (b.plan !== undefined && typeof b.plan === "object") {
    const pl = b.plan || {}; const o2 = {};
    for (const k of ["setup", "look", "lens", "wardrobe", "mics", "must_gets", "warmup", "pre_notes", "sensitivities", "debrief", "stories"]) if (pl[k] !== undefined) o2[k] = clip(pl[k], 2000);
    if (pl.duration_min !== undefined) o2.duration_min = Math.max(0, Math.min(600, Math.round(Number(pl.duration_min) || 0)));
    if (pl.energy !== undefined) o2.energy = Math.max(0, Math.min(5, Math.round(Number(pl.energy) || 0)));
    if (pl.pre_date !== undefined) o2.pre_date = clip(pl.pre_date, 10);
    if (pl.best_takes !== undefined) o2.best_takes = (Array.isArray(pl.best_takes) ? pl.best_takes : []).slice(0, 60).map((t) => ({ at: clip(t?.at, 20), note: clip(t?.note, 400) })).filter((t) => t.note);
    o.plan = o2;
  }
  if (b.quotes !== undefined) o.quotes = (Array.isArray(b.quotes) ? b.quotes : []).slice(0, 200).map((q) => ({ text: clip(q?.text, 1200), at: clip(q?.at, 20), when: clip(q?.when, 10) })).filter((q) => q.text);
  if (b.sort !== undefined) o.sort = Number.isFinite(Number(b.sort)) ? Math.round(Number(b.sort)) : 0;
  return o;
}

export async function POST(request) {
  const me = await whoIs();
  if (!me || (me.role !== "brandon" && me.role !== "staff")) return deny();
  const body = await request.json().catch(() => ({}));
  const db = supabaseAdmin();
  const now = () => new Date().toISOString();
  // Brandon does anything. Staff: only on projects they're on, and never
  // create or delete a project. Every row-level action resolves its project.
  const OWNER_ONLY = new Set(["project-create", "project-delete"]);
  if (me.role === "staff") {
    if (OWNER_ONLY.has(body.action)) return deny();
    let pid = body.projectId || null;
    if (body.action === "project-update") pid = body.id;
    else if (/^person-(update|delete)$/.test(body.action)) pid = await projectOf(db, "project_people", body.id);
    else if (/^entry-(update|delete)$/.test(body.action)) pid = await projectOf(db, "project_entries", body.id);
    else if (body.action === "release-delete") pid = await projectOf(db, "releases", body.id);
    else if (/^scene-(update|delete)$/.test(body.action)) pid = await projectOf(db, "scenes", body.id);
    else if (/^location-(update|delete)$/.test(body.action)) pid = await projectOf(db, "locations", body.id);
    else if (/^(chrono|source|question|event)-(update|delete)$/.test(body.action)) pid = await projectOf(db, { chrono: "chronology", source: "sources", question: "questions", event: "events" }[body.action.split("-")[0]], body.id);
    else if (/^(card|drive)-(update|delete)$/.test(body.action)) pid = await projectOf(db, body.action.startsWith("card") ? "media_cards" : "drives", body.id);
    else if (/^roll-(update|delete)$/.test(body.action)) pid = await projectOf(db, "rolls", body.id);
    else if (/^(budget|cost|stakeholder|task)-/.test(body.action)) return deny(); // owner only: money + the client relationship
    else if (body.action === "release-text") pid = null; // just text, nothing touched
    if (body.action !== "release-text" && !canProject(me, pid)) return deny();
  }
  try {
    // ── projects ──
    if (body.action === "project-create") {
      const row = cleanProject(body);
      if (!row.title) return bad("Give the project a name");
      const { data, error } = await db.from("projects").insert(row).select("*").single();
      if (error) return missing(error);
      return NextResponse.json({ project: data });
    }
    if (body.action === "project-update") {
      if (!isId(body.id)) return bad("Bad request");
      const { data, error } = await db.from("projects").update({ ...cleanProject(body), updated_at: now() }).eq("id", body.id).select("*").single();
      if (error) return missing(error);
      return NextResponse.json({ project: data });
    }
    if (body.action === "project-delete") {
      if (!isId(body.id)) return bad("Bad request");
      await db.from("shoots").update({ project_id: null }).eq("project_id", body.id);
      const { error } = await db.from("projects").delete().eq("id", body.id);
      if (error) return missing(error);
      return NextResponse.json({ ok: true });
    }
    // ── people ──
    if (body.action === "person-add") {
      if (!isId(body.projectId)) return bad("Bad request");
      const row = cleanPerson(body);
      if (!row.name) return bad("Give them a name");
      const { data: last } = await db.from("project_people").select("sort").eq("project_id", body.projectId).order("sort", { ascending: false }).limit(1);
      row.sort = (last?.[0]?.sort ?? 0) + 1;
      const { data, error } = await db.from("project_people").insert({ project_id: body.projectId, ...row }).select("*").single();
      if (error) return missing(error);
      return NextResponse.json({ person: data });
    }
    if (body.action === "person-update") {
      if (!isId(body.id)) return bad("Bad request");
      const { data, error } = await db.from("project_people").update({ ...cleanPerson(body), updated_at: now() }).eq("id", body.id).select("*").single();
      if (error) return missing(error);
      return NextResponse.json({ person: data });
    }
    if (body.action === "person-delete") {
      if (!isId(body.id)) return bad("Bad request");
      const { error } = await db.from("project_people").delete().eq("id", body.id);
      if (error) return missing(error);
      return NextResponse.json({ ok: true });
    }
    // ── scenes ──
    const cleanScene = (b) => {
      const o = {};
      if (b.title !== undefined) { o.title = clip(b.title, 160); if (!o.title) throw new Error("Give the scene a title"); }
      if (b.act !== undefined) o.act = ["1", "2", "3"].includes(String(b.act)) ? String(b.act) : "1";
      if (b.beat_index !== undefined) o.beat_index = Number.isInteger(Number(b.beat_index)) && b.beat_index !== "" && b.beat_index !== null ? Number(b.beat_index) : null;
      if (b.purpose !== undefined) o.purpose = clip(b.purpose, 600);
      if (b.kind !== undefined) o.kind = SCENE_KINDS.includes(b.kind) ? b.kind : "interview";
      if (b.people !== undefined) o.people = (Array.isArray(b.people) ? b.people : []).filter(isId).slice(0, 20);
      if (b.location_id !== undefined) o.location_id = isId(b.location_id) ? b.location_id : null;
      if (b.est_seconds !== undefined) o.est_seconds = Math.max(0, Math.min(7200, Math.round(Number(b.est_seconds) || 0)));
      if (b.status !== undefined) o.status = SCENE_STATUSES.includes(b.status) ? b.status : "idea";
      if (b.tchart !== undefined) o.tchart = (Array.isArray(b.tchart) ? b.tchart : []).slice(0, 40).map((r) => ({ said: clip(r?.said, 600), seen: clip(r?.seen, 400), rel: ["illustrates", "counterpoints", "reveals", "transitions"].includes(r?.rel) ? r.rel : "illustrates" })).filter((r) => r.said || r.seen);
      if (b.broll !== undefined) o.broll = (Array.isArray(b.broll) ? b.broll : []).slice(0, 60).map((r) => ({ text: clip(r?.text, 300), when: clip(r?.when, 80), status: ["wanted", "scheduled", "shot"].includes(r?.status) ? r.status : "wanted" })).filter((r) => r.text);
      if (b.notes !== undefined) o.notes = clip(b.notes, 4000);
      if (b.sort !== undefined) o.sort = Math.round(Number(b.sort) || 0);
      if (b.number !== undefined) o.number = Math.round(Number(b.number) || 0);
      return o;
    };
    if (body.action === "scene-add") {
      if (!isId(body.projectId)) return bad("Bad request");
      const row = cleanScene(body); if (!row.title) return bad("Give the scene a title");
      const { data: last } = await db.from("scenes").select("sort, number").eq("project_id", body.projectId).order("sort", { ascending: false }).limit(1);
      row.sort = (last?.[0]?.sort ?? 0) + 1; row.number = row.number || (last?.[0]?.number ?? 0) + 1;
      const { data, error } = await db.from("scenes").insert({ project_id: body.projectId, ...row }).select("*").single();
      if (error) return missing(error);
      return NextResponse.json({ scene: data });
    }
    if (body.action === "scene-update") {
      if (!isId(body.id)) return bad("Bad request");
      const { data, error } = await db.from("scenes").update({ ...cleanScene(body), updated_at: now() }).eq("id", body.id).select("*").single();
      if (error) return missing(error);
      return NextResponse.json({ scene: data });
    }
    if (body.action === "scene-delete") {
      if (!isId(body.id)) return bad("Bad request");
      const { error } = await db.from("scenes").delete().eq("id", body.id);
      if (error) return missing(error);
      return NextResponse.json({ ok: true });
    }
    if (body.action === "scenes-reorder") {
      if (!isId(body.projectId) || !Array.isArray(body.ids)) return bad("Bad request");
      await Promise.all(body.ids.filter(isId).map((id, i) => db.from("scenes").update({ sort: i + 1, number: i + 1 }).eq("id", id).eq("project_id", body.projectId)));
      return NextResponse.json({ ok: true });
    }
    // ── locations ──
    const cleanLocation = (b) => {
      const o = {};
      if (b.name !== undefined) { o.name = clip(b.name, 160); if (!o.name) throw new Error("Give the location a name"); }
      if (b.kind !== undefined) o.kind = LOCATION_KINDS.includes(b.kind) ? b.kind : "interior";
      for (const k of ["address", "contact_name", "contact_phone", "contact_email", "authority", "access_hours", "blackout", "parking", "power", "sound", "light", "hazards", "hospital"]) if (b[k] !== undefined) o[k] = clip(b[k], 400);
      if (b.notes !== undefined) o.notes = clip(b.notes, 4000);
      if (b.lat !== undefined) o.lat = Number.isFinite(Number(b.lat)) ? Number(b.lat) : null;
      if (b.lng !== undefined) o.lng = Number.isFinite(Number(b.lng)) ? Number(b.lng) : null;
      if (b.permit !== undefined) o.permit = ["none", "needed", "requested", "granted"].includes(b.permit) ? b.permit : "none";
      if (b.coi !== undefined) o.coi = ["none", "needed", "requested", "delivered"].includes(b.coi) ? b.coi : "none";
      if (b.status !== undefined) o.status = ["idea", "scouted", "cleared", "shot"].includes(b.status) ? b.status : "idea";
      return o;
    };
    if (body.action === "location-add") {
      if (!isId(body.projectId)) return bad("Bad request");
      const row = cleanLocation(body); if (!row.name) return bad("Give the location a name");
      const { data: last } = await db.from("locations").select("sort").eq("project_id", body.projectId).order("sort", { ascending: false }).limit(1);
      row.sort = (last?.[0]?.sort ?? 0) + 1;
      const { data, error } = await db.from("locations").insert({ project_id: body.projectId, ...row }).select("*").single();
      if (error) return missing(error);
      return NextResponse.json({ location: data });
    }
    if (body.action === "location-update") {
      if (!isId(body.id)) return bad("Bad request");
      const { data, error } = await db.from("locations").update({ ...cleanLocation(body), updated_at: now() }).eq("id", body.id).select("*").single();
      if (error) return missing(error);
      return NextResponse.json({ location: data });
    }
    if (body.action === "location-delete") {
      if (!isId(body.id)) return bad("Bad request");
      const { error } = await db.from("locations").delete().eq("id", body.id);
      if (error) return missing(error);
      return NextResponse.json({ ok: true });
    }
    // ── budget (owner only, enforced above) ──
    if (body.action === "budget-seed") {
      if (!isId(body.projectId)) return bad("Bad request");
      const { data: have } = await db.from("budget_lines").select("code").eq("project_id", body.projectId);
      const codes = new Set((have || []).map((x) => x.code));
      const rows = BUDGET_TOPSHEET.filter(([code]) => !codes.has(code)).map(([code, section, description, unit], i) => ({ project_id: body.projectId, code, section, description, unit, qty: 1, rate_cents: 0, sort: i + 1 }));
      if (!rows.length) return NextResponse.json({ lines: [] });
      const { data, error } = await db.from("budget_lines").insert(rows).select("*");
      if (error) return missing(error);
      return NextResponse.json({ lines: data });
    }
    if (body.action === "budget-line-add" || body.action === "budget-line-update") {
      const o = {};
      if (body.code !== undefined) o.code = clip(body.code, 10);
      if (body.section !== undefined) o.section = BUDGET_SECTIONS.includes(body.section) ? body.section : "production";
      if (body.description !== undefined) o.description = clip(body.description, 160);
      if (body.unit !== undefined) o.unit = ["day", "week", "flat", "allow", "each"].includes(body.unit) ? body.unit : "day";
      if (body.qty !== undefined) o.qty = Math.max(0, Number(body.qty) || 0);
      if (body.rate_cents !== undefined) o.rate_cents = Math.max(0, Math.round(Number(body.rate_cents) || 0));
      if (body.notes !== undefined) o.notes = clip(body.notes, 600);
      if (body.action === "budget-line-add") {
        if (!isId(body.projectId) || !o.description) return bad("Describe the line");
        const { data: last } = await db.from("budget_lines").select("sort").eq("project_id", body.projectId).order("sort", { ascending: false }).limit(1);
        const { data, error } = await db.from("budget_lines").insert({ project_id: body.projectId, code: o.code || "", section: o.section || "production", unit: o.unit || "day", qty: o.qty ?? 1, rate_cents: o.rate_cents || 0, ...o, sort: (last?.[0]?.sort ?? 0) + 1 }).select("*").single();
        if (error) return missing(error);
        return NextResponse.json({ line: data });
      }
      if (!isId(body.id)) return bad("Bad request");
      const { data, error } = await db.from("budget_lines").update(o).eq("id", body.id).select("*").single();
      if (error) return missing(error);
      return NextResponse.json({ line: data });
    }
    if (body.action === "budget-line-delete") {
      if (!isId(body.id)) return bad("Bad request");
      const { error } = await db.from("budget_lines").delete().eq("id", body.id);
      if (error) return missing(error);
      return NextResponse.json({ ok: true });
    }
    if (body.action === "cost-add" || body.action === "cost-update") {
      const o = {};
      if (body.line_id !== undefined) o.line_id = isId(body.line_id) ? body.line_id : null;
      if (body.shoot_id !== undefined) o.shoot_id = isId(body.shoot_id) ? body.shoot_id : null;
      if (body.date !== undefined && /^\d{4}-\d{2}-\d{2}$/.test(String(body.date))) o.date = body.date;
      if (body.vendor !== undefined) o.vendor = clip(body.vendor, 160);
      if (body.amount_cents !== undefined) o.amount_cents = Math.round(Number(body.amount_cents) || 0);
      if (body.kind !== undefined) o.kind = ["invoice", "card", "cash", "mileage", "perdiem"].includes(body.kind) ? body.kind : "invoice";
      if (body.paid !== undefined) o.paid = Boolean(body.paid);
      if (body.notes !== undefined) o.notes = clip(body.notes, 600);
      if (body.action === "cost-add") {
        if (!isId(body.projectId)) return bad("Bad request");
        if (!o.amount_cents) return bad("Amount?");
        const { data, error } = await db.from("cost_entries").insert({ project_id: body.projectId, ...o }).select("*").single();
        if (error) return missing(error);
        return NextResponse.json({ cost: data });
      }
      if (!isId(body.id)) return bad("Bad request");
      const { data, error } = await db.from("cost_entries").update(o).eq("id", body.id).select("*").single();
      if (error) return missing(error);
      return NextResponse.json({ cost: data });
    }
    if (body.action === "cost-delete") {
      if (!isId(body.id)) return bad("Bad request");
      const { error } = await db.from("cost_entries").delete().eq("id", body.id);
      if (error) return missing(error);
      return NextResponse.json({ ok: true });
    }
    // ── client side: stakeholders + needs-from-you ──
    if (body.action === "stakeholder-add" || body.action === "stakeholder-update") {
      const o = {};
      for (const k of ["name", "role", "email", "phone", "notes"]) if (body[k] !== undefined) o[k] = clip(body[k], k === "notes" ? 1000 : 160);
      if (body.portal_role !== undefined) o.portal_role = ["approver", "reviewer", "viewer"].includes(body.portal_role) ? body.portal_role : "viewer";
      if (body.decision_maker !== undefined) o.decision_maker = Boolean(body.decision_maker);
      if (body.primary_contact !== undefined) o.primary_contact = Boolean(body.primary_contact);
      if (body.action === "stakeholder-add") {
        if (!isId(body.projectId) || !o.name) return bad("Give them a name");
        const { data, error } = await db.from("project_stakeholders").insert({ project_id: body.projectId, ...o }).select("*").single();
        if (error) return missing(error);
        return NextResponse.json({ stakeholder: data });
      }
      if (!isId(body.id)) return bad("Bad request");
      const { data, error } = await db.from("project_stakeholders").update(o).eq("id", body.id).select("*").single();
      if (error) return missing(error);
      return NextResponse.json({ stakeholder: data });
    }
    if (body.action === "stakeholder-delete") {
      if (!isId(body.id)) return bad("Bad request");
      const { error } = await db.from("project_stakeholders").delete().eq("id", body.id);
      if (error) return missing(error);
      return NextResponse.json({ ok: true });
    }
    if (body.action === "task-add" || body.action === "task-update") {
      const o = {};
      if (body.title !== undefined) o.title = clip(body.title, 200);
      if (body.category !== undefined) o.category = ["access", "document", "introduction", "approval", "scheduling", "materials", "payment"].includes(body.category) ? body.category : "access";
      if (body.due !== undefined) o.due = /^\d{4}-\d{2}-\d{2}$/.test(String(body.due || "")) ? body.due : null;
      if (body.done !== undefined) o.done_at = body.done ? now() : null;
      if (body.note !== undefined) o.note = clip(body.note, 1000);
      if (body.action === "task-add") {
        if (!isId(body.projectId) || !o.title) return bad("What do you need from them?");
        const { data, error } = await db.from("client_tasks").insert({ project_id: body.projectId, ...o }).select("*").single();
        if (error) return missing(error);
        return NextResponse.json({ task: data });
      }
      if (!isId(body.id)) return bad("Bad request");
      const { data, error } = await db.from("client_tasks").update(o).eq("id", body.id).select("*").single();
      if (error) return missing(error);
      return NextResponse.json({ task: data });
    }
    if (body.action === "task-delete") {
      if (!isId(body.id)) return bad("Bad request");
      const { error } = await db.from("client_tasks").delete().eq("id", body.id);
      if (error) return missing(error);
      return NextResponse.json({ ok: true });
    }
    // ── story engine: chronology · sources · questions · events (one CRUD shape) ──
    const uuids = (v) => (Array.isArray(v) ? v : []).filter(isId).slice(0, 40);
    const TABLES = {
      chrono: { table: "chronology", clean: (b) => { const o = {}; if (b.date_text !== undefined) o.date_text = clip(b.date_text, 40); if (b.sort_date !== undefined) o.sort_date = /^\d{4}-\d{2}-\d{2}$/.test(String(b.sort_date || "")) ? b.sort_date : (/^\d{4}$/.test(String(b.date_text || "").trim()) ? `${String(b.date_text).trim()}-07-01` : null); if (b.era !== undefined) o.era = ERAS.includes(b.era) ? b.era : ""; if (b.title !== undefined) o.title = clip(b.title, 200); if (b.summary !== undefined) o.summary = clip(b.summary, 2000); if (b.significance !== undefined) o.significance = Math.max(1, Math.min(5, Math.round(Number(b.significance) || 3))); if (b.evidence !== undefined) o.evidence = ["documented", "single", "oral", "disputed"].includes(b.evidence) ? b.evidence : "single"; if (b.turning_point !== undefined) o.turning_point = Boolean(b.turning_point); if (b.people !== undefined) o.people = uuids(b.people); if (b.source_ids !== undefined) o.source_ids = uuids(b.source_ids); if (b.scene_id !== undefined) o.scene_id = isId(b.scene_id) ? b.scene_id : null; if (b.notes !== undefined) o.notes = clip(b.notes, 2000); return o; }, need: "title" },
      source: { table: "sources", clean: (b) => { const o = {}; if (b.kind !== undefined) o.kind = SOURCE_KINDS.includes(b.kind) ? b.kind : "document"; if (b.title !== undefined) o.title = clip(b.title, 200); for (const k of ["holder", "date_text", "where_text"]) if (b[k] !== undefined) o[k] = clip(b[k], 300); if (b.reliability !== undefined) o.reliability = ["primary", "secondary", "hearsay"].includes(b.reliability) ? b.reliability : "secondary"; if (b.obtained !== undefined) o.obtained = Boolean(b.obtained); if (b.notes !== undefined) o.notes = clip(b.notes, 2000); return o; }, need: "title" },
      question: { table: "questions", clean: (b) => { const o = {}; if (b.theme !== undefined) o.theme = clip(b.theme, 40) || "general"; if (b.text !== undefined) o.text = clip(b.text, 500); if (b.followups !== undefined) o.followups = clip(b.followups, 800); if (b.beat_index !== undefined) o.beat_index = b.beat_index === "" || b.beat_index === null ? null : Math.round(Number(b.beat_index)); if (b.people !== undefined) o.people = uuids(b.people); if (b.priority !== undefined) o.priority = [1, 2, 3].includes(Number(b.priority)) ? Number(b.priority) : 2; if (b.asked !== undefined && typeof b.asked === "object") o.asked = Object.fromEntries(Object.entries(b.asked || {}).filter(([k]) => isId(k)).slice(0, 60).map(([k, v]) => [k, { date: clip(v?.date, 10), quality: Math.max(0, Math.min(5, Math.round(Number(v?.quality) || 0))) }])); if (b.sort !== undefined) o.sort = Math.round(Number(b.sort) || 0); return o; }, need: "text" },
      event: { table: "events", clean: (b) => { const o = {}; if (b.title !== undefined) o.title = clip(b.title, 200); if (b.date !== undefined) o.date = /^\d{4}-\d{2}-\d{2}$/.test(String(b.date || "")) ? b.date : null; for (const k of ["time_text", "recurring", "why", "restrictions", "plan"]) if (b[k] !== undefined) o[k] = clip(b[k], k === "plan" ? 2000 : 400); if (b.location_id !== undefined) o.location_id = isId(b.location_id) ? b.location_id : null; if (b.scene_id !== undefined) o.scene_id = isId(b.scene_id) ? b.scene_id : null; if (b.shoot_id !== undefined) o.shoot_id = isId(b.shoot_id) ? b.shoot_id : null; if (b.access !== undefined) o.access = ["ask", "asked", "approved", "restricted"].includes(b.access) ? b.access : "ask"; if (b.status !== undefined) o.status = ["planned", "shot", "missed"].includes(b.status) ? b.status : "planned"; return o; }, need: "title" },
    };
    const m3 = /^(chrono|source|question|event)-(add|update|delete)$/.exec(body.action || "");
    if (m3) {
      const def = TABLES[m3[1]]; const op = m3[2];
      if (op === "add") {
        if (!isId(body.projectId)) return bad("Bad request");
        const row = def.clean(body); if (!row[def.need]) return bad(`Needs a ${def.need}`);
        const { data, error } = await db.from(def.table).insert({ project_id: body.projectId, ...row }).select("*").single();
        if (error) return missing(error);
        return NextResponse.json({ row: data });
      }
      if (!isId(body.id)) return bad("Bad request");
      if (op === "delete") { const { error } = await db.from(def.table).delete().eq("id", body.id); if (error) return missing(error); return NextResponse.json({ ok: true }); }
      const { data, error } = await db.from(def.table).update(def.clean(body)).eq("id", body.id).select("*").single();
      if (error) return missing(error);
      return NextResponse.json({ row: data });
    }
    // ── media chain: cards → rolls → drives ──
    if (body.action === "card-add" || body.action === "card-update") {
      const o = {};
      if (body.label !== undefined) o.label = clip(body.label, 12).toUpperCase();
      if (body.camera !== undefined) o.camera = clip(body.camera, 4).toUpperCase() || "A";
      if (body.capacity_gb !== undefined) o.capacity_gb = Math.max(0, Math.round(Number(body.capacity_gb) || 0));
      if (body.notes !== undefined) o.notes = clip(body.notes, 300);
      if (body.retired !== undefined) o.retired = Boolean(body.retired);
      if (body.action === "card-add") {
        if (!isId(body.projectId) || !o.label) return bad("Card label? (A01)");
        const { data, error } = await db.from("media_cards").insert({ project_id: body.projectId, ...o }).select("*").single();
        if (error) return missing(error);
        return NextResponse.json({ card: data });
      }
      if (!isId(body.id)) return bad("Bad request");
      const { data, error } = await db.from("media_cards").update(o).eq("id", body.id).select("*").single();
      if (error) return missing(error);
      return NextResponse.json({ card: data });
    }
    if (body.action === "card-delete") { if (!isId(body.id)) return bad("Bad request"); const { error } = await db.from("media_cards").delete().eq("id", body.id); if (error) return missing(error); return NextResponse.json({ ok: true }); }
    if (body.action === "drive-add" || body.action === "drive-update") {
      const o = {};
      if (body.label !== undefined) o.label = clip(body.label, 40);
      if (body.role !== undefined) o.role = ["working", "mirror", "offsite", "archive", "shuttle"].includes(body.role) ? body.role : "working";
      if (body.capacity_tb !== undefined) o.capacity_tb = Math.max(0, Number(body.capacity_tb) || 0);
      if (body.used_tb !== undefined) o.used_tb = Math.max(0, Number(body.used_tb) || 0);
      if (body.location !== undefined) o.location = clip(body.location, 120);
      if (body.last_verified !== undefined) o.last_verified = /^\d{4}-\d{2}-\d{2}$/.test(String(body.last_verified || "")) ? body.last_verified : null;
      if (body.notes !== undefined) o.notes = clip(body.notes, 300);
      if (body.action === "drive-add") {
        if (!isId(body.projectId) || !o.label) return bad("Drive label? (STMARY-WORK-01)");
        const { data, error } = await db.from("drives").insert({ project_id: body.projectId, ...o }).select("*").single();
        if (error) return missing(error);
        return NextResponse.json({ drive: data });
      }
      if (!isId(body.id)) return bad("Bad request");
      const { data, error } = await db.from("drives").update(o).eq("id", body.id).select("*").single();
      if (error) return missing(error);
      return NextResponse.json({ drive: data });
    }
    if (body.action === "drive-delete") { if (!isId(body.id)) return bad("Bad request"); const { error } = await db.from("drives").delete().eq("id", body.id); if (error) return missing(error); return NextResponse.json({ ok: true }); }
    if (body.action === "roll-add" || body.action === "roll-update") {
      const o = {};
      if (body.shoot_id !== undefined) o.shoot_id = isId(body.shoot_id) ? body.shoot_id : null;
      if (body.card_id !== undefined) o.card_id = isId(body.card_id) ? body.card_id : null;
      if (body.camera !== undefined) o.camera = clip(body.camera, 4).toUpperCase() || "A";
      if (body.roll_name !== undefined) o.roll_name = clip(body.roll_name, 60);
      if (body.shot_by !== undefined) o.shot_by = clip(body.shot_by, 80);
      if (body.used_gb !== undefined) o.used_gb = Math.max(0, Number(body.used_gb) || 0);
      if (body.clip_count !== undefined) o.clip_count = Math.max(0, Math.round(Number(body.clip_count) || 0));
      if (body.offload_tool !== undefined) o.offload_tool = clip(body.offload_tool, 40);
      if (body.checksum_verified !== undefined) o.checksum_verified = Boolean(body.checksum_verified);
      for (const k of ["copy1_drive_id", "copy2_drive_id"]) if (body[k] !== undefined) o[k] = isId(body[k]) ? body[k] : null;
      for (const k of ["offloaded_at", "copy1_verified_at", "copy2_verified_at", "cloud_at"]) if (body[k] !== undefined) o[k] = body[k] ? now() : null;
      if (body.notes !== undefined) o.notes = clip(body.notes, 600);
      if (body.action === "roll-add") {
        if (!isId(body.projectId) || !o.roll_name) return bad("Roll name?");
        const { data, error } = await db.from("rolls").insert({ project_id: body.projectId, ...o }).select("*").single();
        if (error) return missing(error);
        return NextResponse.json({ roll: data });
      }
      if (!isId(body.id)) return bad("Bad request");
      // Status is derived, never set by hand: two verified copies before a card may be formatted.
      const { data: cur } = await db.from("rolls").select("*").eq("id", body.id).maybeSingle();
      if (!cur) return bad("Roll's gone", 404);
      const next = { ...cur, ...o };
      let status = "in_camera";
      if (next.offloaded_at) status = "offloading";
      if (next.copy1_verified_at && next.checksum_verified) status = "copy1";
      if (next.copy1_verified_at && next.copy2_verified_at && next.checksum_verified) status = "cleared";
      if (body.formatted !== undefined) {
        if (body.formatted && status !== "cleared" && cur.status !== "formatted") return bad("Not yet — two verified copies before this card is formatted.");
        status = body.formatted ? "formatted" : status;
      } else if (cur.status === "formatted") status = "formatted";
      const { data, error } = await db.from("rolls").update({ ...o, status, updated_at: now() }).eq("id", body.id).select("*").single();
      if (error) return missing(error);
      return NextResponse.json({ roll: data });
    }
    if (body.action === "roll-delete") { if (!isId(body.id)) return bad("Bad request"); const { error } = await db.from("rolls").delete().eq("id", body.id); if (error) return missing(error); return NextResponse.json({ ok: true }); }
    if (body.action === "milestones-seed") {
      if (!isId(body.id)) return bad("Bad request");
      const { data, error } = await db.from("projects").update({ milestones: DEFAULT_MILESTONES.map((m) => ({ ...m, date: "", done: false })), updated_at: now() }).eq("id", body.id).select("*").single();
      if (error) return missing(error);
      return NextResponse.json({ project: data });
    }
    // ── journal ──
    if (body.action === "entry-add") {
      if (!isId(body.projectId)) return bad("Bad request");
      const text = clip(body.body, 20000);
      if (!text) return bad("Write something first");
      const row = { project_id: body.projectId, body: text, pinned: Boolean(body.pinned) };
      if (/^\d{4}-\d{2}-\d{2}$/.test(String(body.entry_date || ""))) row.entry_date = body.entry_date;
      const { data, error } = await db.from("project_entries").insert(row).select("*").single();
      if (error) return missing(error);
      return NextResponse.json({ entry: data });
    }
    if (body.action === "entry-update") {
      if (!isId(body.id)) return bad("Bad request");
      const patch = { updated_at: now() };
      if (body.body !== undefined) { patch.body = clip(body.body, 20000); if (!patch.body) return bad("An entry can't be empty — delete it instead"); }
      if (body.pinned !== undefined) patch.pinned = Boolean(body.pinned);
      if (body.entry_date !== undefined && /^\d{4}-\d{2}-\d{2}$/.test(String(body.entry_date))) patch.entry_date = body.entry_date;
      const { data, error } = await db.from("project_entries").update(patch).eq("id", body.id).select("*").single();
      if (error) return missing(error);
      return NextResponse.json({ entry: data });
    }
    if (body.action === "entry-delete") {
      if (!isId(body.id)) return bad("Bad request");
      const { error } = await db.from("project_entries").delete().eq("id", body.id);
      if (error) return missing(error);
      return NextResponse.json({ ok: true });
    }
    // ── releases: signed on Brandon's phone, handed to the person ──
    if (body.action === "release-sign") {
      if (!RELEASE_KINDS[body.kind]) return bad("Which release?");
      if (!r2Configured) return bad("Signature storage (R2) isn't set up");
      const name = clip(body.signer_name, 120);
      if (!name) return bad("Type the signer's name");
      const m = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(String(body.signature || ""));
      if (!m) return bad("Sign in the box first");
      const png = Buffer.from(m[1], "base64");
      if (png.length < 500) return bad("That signature looks empty — try again");
      if (png.length > 2 * 1024 * 1024) return bad("Signature too big");
      const text = clip(body.body, 12000);
      if (!text) return bad("No release text");
      const key = await putSignature(png);
      const row = {
        project_id: isId(body.projectId) ? body.projectId : null,
        person_id: isId(body.personId) ? body.personId : null,
        shoot_id: isId(body.shootId) ? body.shootId : null,
        kind: body.kind, signer_name: name, signer_email: clip(body.signer_email, 160), signer_phone: clip(body.signer_phone, 60),
        signature_key: key, text_version: TEXT_VERSION, body: text,
        ip: clip(request.headers.get("x-forwarded-for") || "", 80), user_agent: clip(request.headers.get("user-agent") || "", 300),
      };
      const { data, error } = await db.from("releases").insert(row).select("*").single();
      if (error) return missing(error);
      // A signed deal memo hangs on the crew assignment.
      if (body.kind === "deal" && isId(body.staffId) && row.project_id) await db.from("project_members").update({ deal_release_id: data.id }).eq("project_id", row.project_id).eq("staff_id", body.staffId);
      return NextResponse.json({ release: { ...data, signature_url: await signedUrl(key).catch(() => "") } });
    }
    if (body.action === "release-text") {
      return NextResponse.json({ body: releaseBody(body.kind, { name: clip(body.name, 120) || "____________", project: clip(body.project, 160) || "the project", date: clip(body.date, 60) || "the agreed date", place: clip(body.place, 200) || "the agreed location", minor: clip(body.minor, 120), position: clip(body.position, 80) || "crew", rate: clip(body.rate, 80) || "as agreed", kit: clip(body.kit, 80) || "none", credit: clip(body.credit, 120) || "as agreed", items: clip(body.items, 600) || "the items listed with Roth Media" }), version: TEXT_VERSION });
    }
    if (body.action === "release-delete") {
      if (!isId(body.id)) return bad("Bad request");
      const { error } = await db.from("releases").delete().eq("id", body.id);
      if (error) return missing(error);
      return NextResponse.json({ ok: true });
    }
  } catch (e) {
    return bad(e.message);
  }
  return bad("Unknown action", 400);
}

