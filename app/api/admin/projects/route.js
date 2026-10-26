import { NextResponse } from "next/server";
import { whoIs, canProject, projectOf, projectTeam } from "../../../../lib/staff-server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { r2Configured, putSignature, signedUrl, putUrl, PROXY_KEY_RE } from "../../../../lib/r2";
import { parseName, parseSubs, parsePlain, fromAssembly, CUT_STAGES } from "../../../../lib/edit";
import { RELEASE_KINDS, TEXT_VERSION, releaseBody } from "../../../../lib/releases";
import { PROJECT_STATUSES, PERSON_STATUSES, PERSON_KINDS } from "../../../../lib/projects";
import { ARC_KEYS } from "../../../../lib/story-arc";
import { ARC_ROLES, ERAS, SOURCE_KINDS, QUESTION_THEMES, PHASES, SCENE_KINDS, SCENE_STATUSES, LOCATION_KINDS, BUDGET_SECTIONS, BUDGET_TOPSHEET, DEFAULT_MILESTONES, DEFAULT_PAYMENTS, DISCOVERY_FIELDS } from "../../../../lib/production";
import { draftUpdate } from "../../../../lib/client-machine";
import { LEGAL_KINDS } from "../../../../lib/legal";
import { DEFAULT_DELIVERABLES, DELIVERABLE_KINDS, QC_CHECKS, defaultFollowups, invoiceLines } from "../../../../lib/finish";
import { resendConfigured, sendBatch } from "../../../../lib/resend";
import { wrapHtml } from "../../../../lib/client-email";

// Studio → Projects: the job above the dates. Projects, the people in them
// (cast + sources), story beats, archive to-gets, and the releases signed on
// the spot. Everything here is Brandon-only.
export const dynamic = "force-dynamic";

const deny = () => NextResponse.json({ error: "Not authorized" }, { status: 403 });
const bad = (msg, status = 422) => NextResponse.json({ error: msg }, { status });
const clip = (v, n) => String(v ?? "").trim().slice(0, n);
const isId = (v) => /^[0-9a-f-]{36}$/.test(String(v || ""));
const missing = (e) => bad(/projects|project_people|project_entries|releases|scenes|locations|budget_lines|cost_entries|project_stakeholders|client_tasks|media_cards|drives|rolls|chronology|sources|questions|events|clips|transcripts|selects|cuts|screening_notes|approvals|review_versions|review_notes|change_orders|project_payments|comms|updates|sensitivities|discovery|contract_cents|clearance_items|music_cues|archival_items|legal_items|gate_overrides|deliverables|followups|timesheets|crew_invoices|vendors|purchase_orders|travel|daily_reports|retention_until|usage_rights/i.test(e.message) && /does not exist|schema cache/i.test(e.message) ? (/project_entries/i.test(e.message) ? "Run supabase/journal.sql once in the Supabase SQL editor first" : /deliverables|followups|timesheets|crew_invoices|vendors|purchase_orders|travel|daily_reports|retention_until|usage_rights|premiere/i.test(e.message) ? "Run supabase/sprint7.sql once in the Supabase SQL editor first" : /clearance_items|music_cues|archival_items|legal_items|gate_overrides/i.test(e.message) ? "Run supabase/sprint6.sql once in the Supabase SQL editor first" : /approvals|review_versions|review_notes|change_orders|project_payments|comms|updates|sensitivities|discovery|contract_cents/i.test(e.message) ? "Run supabase/sprint5.sql once in the Supabase SQL editor first" : /clips|transcripts|selects|cuts|screening_notes/i.test(e.message) ? "Run supabase/sprint4.sql once in the Supabase SQL editor first" : /chronology|sources|questions|events|thesis|style|arc_role|eyeline|plan/i.test(e.message) ? "Run supabase/sprint3.sql once in the Supabase SQL editor first" : /media_cards|drives|rolls|callsheet|scene_ids/i.test(e.message) ? "Run supabase/sprint2.sql once in the Supabase SQL editor first" : /scenes|locations|budget_lines|cost_entries|project_stakeholders|client_tasks|column/i.test(e.message) ? "Run supabase/sprint1.sql once in the Supabase SQL editor first" : "Run supabase/projects.sql once in the Supabase SQL editor first") : e.message, 500);


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
  if (b.discovery !== undefined && typeof b.discovery === "object") o.discovery = Object.fromEntries(DISCOVERY_FIELDS.map(([k]) => [k, clip(b.discovery?.[k], 2000)]));
  if (b.discovery_locked !== undefined) o.discovery_locked_at = b.discovery_locked ? new Date().toISOString() : null;
  if (b.delivered_at !== undefined) o.delivered_at = /^\d{4}-\d{2}-\d{2}$/.test(String(b.delivered_at || "")) ? b.delivered_at : null;
  if (b.retention_until !== undefined) o.retention_until = /^\d{4}-\d{2}-\d{2}$/.test(String(b.retention_until || "")) ? b.retention_until : null;
  if (b.usage_rights !== undefined) o.usage_rights = clip(b.usage_rights, 4000);
  if (b.premiere !== undefined && typeof b.premiere === "object") o.premiere = Object.fromEntries(Object.entries(b.premiere || {}).slice(0, 20).map(([k, v]) => [clip(k, 30), clip(v, 3000)]));
  if (b.archive !== undefined && typeof b.archive === "object") o.archive = Object.fromEntries(Object.entries(b.archive || {}).slice(0, 20).map(([k, v]) => [clip(k, 30), clip(v, 6000)]));
  if (b.gate_overrides !== undefined && typeof b.gate_overrides === "object") o.gate_overrides = Object.fromEntries(Object.entries(b.gate_overrides || {}).slice(0, 60).filter(([k, v]) => /^[abc]\.[a-z_]+$/.test(k) && v && typeof v === "object").map(([k, v]) => [k, { reason: clip(v.reason, 300), at: clip(v.at, 10) }]));
  if (b.contract_cents !== undefined) o.contract_cents = Math.max(0, Math.round(Number(b.contract_cents) || 0));
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
  if (b.quotes !== undefined) o.quotes = (Array.isArray(b.quotes) ? b.quotes : []).slice(0, 300).map((q) => ({ text: clip(q?.text, 1200), at: clip(q?.at, 20), when: clip(q?.when, 10), ...(q?.clip ? { clip: clip(q.clip, 160) } : {}), ...(isId(q?.select_id) ? { select_id: q.select_id } : {}) })).filter((q) => q.text);
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
    else if (/^(clip|select|cut|note)-(update|delete)$/.test(body.action)) pid = await projectOf(db, { clip: "clips", select: "selects", cut: "cuts", note: "screening_notes" }[body.action.split("-")[0]], body.id);
    else if (/^(clip-proxy-sign|clip-proxy-done|clip-urls|transcript-get|transcript-upload|transcribe|transcript-poll)$/.test(body.action)) pid = await projectOf(db, "clips", body.id);
    else if (/^(review|rnote|comm|sens)-(update|delete)$/.test(body.action)) pid = await projectOf(db, { review: "review_versions", rnote: "review_notes", comm: "comms", sens: "sensitivities" }[body.action.split("-")[0]], body.id);
    else if (body.action === "review-sign") pid = await projectOf(db, "review_versions", body.id);
    else if (/^(report|timesheet)-(update|delete)$/.test(body.action)) pid = await projectOf(db, body.action.startsWith("report") ? "daily_reports" : "timesheets", body.id);
    else if (/^(budget|cost|stakeholder|task|payment|co|approval|update|discovery|clearance|cue|arch|legal|deliverable|followup|cinv|vendor|po|travel|invoice)-/.test(body.action) || /^(payments|deliverables|project-deliver)/.test(body.action)) return deny(); // owner only: money + the client relationship
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
    const num = (v, lo, hi, d) => { const n = Number(v); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : d; };
    Object.assign(TABLES, {
      clip: { table: "clips", clean: (b) => { const o = {}; if (b.filename !== undefined) { o.filename = clip(b.filename, 160); o.stem = parseName(o.filename).stem.toLowerCase(); } for (const k of ["shoot_id", "roll_id", "scene_id", "person_id"]) if (b[k] !== undefined) o[k] = isId(b[k]) ? b[k] : null; if (b.camera !== undefined) o.camera = clip(b.camera, 4).toUpperCase(); if (b.card !== undefined) o.card = clip(b.card, 8).toUpperCase(); if (b.duration_s !== undefined) o.duration_s = num(b.duration_s, 0, 1e6, 0); if (b.width !== undefined) o.width = Math.round(num(b.width, 0, 20000, 0)); if (b.height !== undefined) o.height = Math.round(num(b.height, 0, 20000, 0)); if (b.fps !== undefined) o.fps = num(b.fps, 1, 1000, 23.976); if (b.codec !== undefined) o.codec = clip(b.codec, 40); if (b.size_bytes !== undefined) o.size_bytes = Math.round(num(b.size_bytes, 0, 1e13, 0)); if (b.start_tc !== undefined) o.start_tc = clip(b.start_tc, 11); if (b.rating !== undefined) o.rating = Math.round(num(b.rating, 0, 5, 0)); if (b.keywords !== undefined) o.keywords = (Array.isArray(b.keywords) ? b.keywords : String(b.keywords).split(",")).map((k) => clip(k, 30)).filter(Boolean).slice(0, 20); if (b.notes !== undefined) o.notes = clip(b.notes, 2000); return o; }, need: "filename" },
      select: { table: "selects", clean: (b) => { const o = {}; if (b.clip_id !== undefined) o.clip_id = isId(b.clip_id) ? b.clip_id : null; for (const k of ["scene_id", "person_id"]) if (b[k] !== undefined) o[k] = isId(b[k]) ? b[k] : null; if (b.kind !== undefined) o.kind = ["bite", "broll", "sound", "archival"].includes(b.kind) ? b.kind : "bite"; if (b.in_s !== undefined) o.in_s = num(b.in_s, 0, 1e6, 0); if (b.out_s !== undefined) o.out_s = num(b.out_s, 0, 1e6, 0); if (b.text !== undefined) o.text = clip(b.text, 2000); if (b.note !== undefined) o.note = clip(b.note, 600); if (b.rating !== undefined) o.rating = Math.round(num(b.rating, 1, 5, 3)); if (b.sort !== undefined) o.sort = Math.round(num(b.sort, 0, 1e6, 0)); return o; }, need: "clip_id" },
      cut: { table: "cuts", clean: (b) => { const o = {}; if (b.stage !== undefined) o.stage = CUT_STAGES.includes(b.stage) ? b.stage : "stringout"; if (b.version !== undefined) o.version = Math.round(num(b.version, 1, 999, 1)); if (b.date !== undefined) o.date = /^\d{4}-\d{2}-\d{2}$/.test(String(b.date || "")) ? b.date : null; if (b.intent !== undefined) o.intent = clip(b.intent, 1500); if (b.thesis_v !== undefined) o.thesis_v = b.thesis_v === "" || b.thesis_v == null ? null : Math.round(num(b.thesis_v, 1, 999, 1)); if (b.scene_order !== undefined) o.scene_order = (Array.isArray(b.scene_order) ? b.scene_order : []).filter(isId).slice(0, 300); if (b.runtime_s !== undefined) o.runtime_s = Math.round(num(b.runtime_s, 0, 1e6, 0)); if (b.link !== undefined) o.link = clip(b.link, 500); if (b.notes !== undefined) o.notes = clip(b.notes, 4000); if (b.status !== undefined) o.status = ["open", "screened", "superseded"].includes(b.status) ? b.status : "open"; return o; }, need: "stage" },
      note: { table: "screening_notes", clean: (b) => { const o = {}; if (b.cut_id !== undefined) o.cut_id = isId(b.cut_id) ? b.cut_id : null; if (b.at_s !== undefined) o.at_s = b.at_s === "" || b.at_s == null ? null : num(b.at_s, 0, 1e6, 0); if (b.text !== undefined) o.text = clip(b.text, 1500); if (b.who !== undefined) o.who = clip(b.who, 60); if (b.verdict !== undefined) o.verdict = ["", "accept", "reject", "park"].includes(b.verdict) ? b.verdict : ""; if (b.scene_id !== undefined) o.scene_id = isId(b.scene_id) ? b.scene_id : null; if (b.done !== undefined) o.done = Boolean(b.done); return o; }, need: "text" },
    });
    Object.assign(TABLES, {
      approval: { table: "approvals", clean: (b) => { const o = {}; if (b.kind !== undefined) o.kind = ["milestone", "cut", "change_order", "deliverable", "other"].includes(b.kind) ? b.kind : "other"; if (b.ref_id !== undefined) o.ref_id = clip(b.ref_id, 60); if (b.label !== undefined) o.label = clip(b.label, 200); if (b.detail !== undefined) o.detail = clip(b.detail, 3000); if (b.status !== undefined) { o.status = ["pending", "approved", "changes"].includes(b.status) ? b.status : "pending"; if (o.status === "pending") { o.signed_name = ""; o.signed_at = null; o.ip = ""; } } if (b.note !== undefined) o.note = clip(b.note, 1500); return o; }, need: "label" },
      review: { table: "review_versions", clean: (b) => { const o = {}; if (b.cut_id !== undefined) o.cut_id = isId(b.cut_id) ? b.cut_id : null; if (b.label !== undefined) o.label = clip(b.label, 120); if (b.link !== undefined) o.link = clip(b.link, 500); if (b.message !== undefined) o.message = clip(b.message, 2000); if (b.status !== undefined) o.status = ["open", "closed"].includes(b.status) ? b.status : "open"; if (b.client_visible !== undefined) o.client_visible = Boolean(b.client_visible); return o; }, need: "label" },
      rnote: { table: "review_notes", clean: (b) => { const o = {}; if (b.review_id !== undefined) o.review_id = isId(b.review_id) ? b.review_id : null; if (b.at_s !== undefined) o.at_s = b.at_s === "" || b.at_s == null ? null : num(b.at_s, 0, 1e6, 0); if (b.text !== undefined) o.text = clip(b.text, 1500); if (b.who !== undefined) o.who = clip(b.who, 80); o.side = "us"; if (b.resolved !== undefined) o.resolved = Boolean(b.resolved); return o; }, need: "text" },
      co: { table: "change_orders", clean: (b) => { const o = {}; if (b.title !== undefined) o.title = clip(b.title, 200); if (b.description !== undefined) o.description = clip(b.description, 4000); if (b.amount_cents !== undefined) o.amount_cents = Math.round(num(b.amount_cents, -1e9, 1e9, 0)); if (b.expires !== undefined) o.expires = /^\d{4}-\d{2}-\d{2}$/.test(String(b.expires || "")) ? b.expires : null; if (b.status !== undefined) o.status = ["draft", "sent", "accepted", "declined", "expired"].includes(b.status) ? b.status : "draft"; return o; }, need: "title" },
      payment: { table: "project_payments", clean: (b) => { const o = {}; if (b.label !== undefined) o.label = clip(b.label, 120); if (b.amount_cents !== undefined) o.amount_cents = Math.round(num(b.amount_cents, 0, 1e9, 0)); if (b.due !== undefined) o.due = /^\d{4}-\d{2}-\d{2}$/.test(String(b.due || "")) ? b.due : null; if (b.status !== undefined) { o.status = ["scheduled", "invoiced", "paid", "late", "waived"].includes(b.status) ? b.status : "scheduled"; if (o.status === "paid" && b.paid_at === undefined) o.paid_at = now().slice(0, 10); } if (b.paid_at !== undefined) o.paid_at = /^\d{4}-\d{2}-\d{2}$/.test(String(b.paid_at || "")) ? b.paid_at : null; for (const k of ["method", "note", "gates"]) if (b[k] !== undefined) o[k] = clip(b[k], 300); if (b.sort !== undefined) o.sort = Math.round(num(b.sort, 0, 1e6, 0)); return o; }, need: "label" },
      comm: { table: "comms", clean: (b) => { const o = {}; if (b.date !== undefined) o.date = /^\d{4}-\d{2}-\d{2}$/.test(String(b.date || "")) ? b.date : now().slice(0, 10); if (b.channel !== undefined) o.channel = ["call", "email", "text", "meeting", "portal", "other"].includes(b.channel) ? b.channel : "call"; if (b.who !== undefined) o.who = clip(b.who, 120); if (b.summary !== undefined) o.summary = clip(b.summary, 3000); if (b.decisions !== undefined) o.decisions = clip(b.decisions, 2000); if (b.client_visible !== undefined) o.client_visible = Boolean(b.client_visible); return o; }, need: "summary" },
      update: { table: "updates", clean: (b) => { const o = {}; if (b.week_of !== undefined) o.week_of = /^\d{4}-\d{2}-\d{2}$/.test(String(b.week_of || "")) ? b.week_of : now().slice(0, 10); if (b.body !== undefined) o.body = clip(b.body, 8000); if (b.published !== undefined) o.published_at = b.published ? now() : null; return o; }, need: "week_of" },
      sens: { table: "sensitivities", clean: (b) => { const o = {}; if (b.topic !== undefined) o.topic = clip(b.topic, 200); if (b.handling !== undefined) o.handling = ["public", "internal_only", "approve_before_use", "omit"].includes(b.handling) ? b.handling : "approve_before_use"; if (b.note !== undefined) o.note = clip(b.note, 1500); if (b.raised_by !== undefined) o.raised_by = clip(b.raised_by, 80); return o; }, need: "topic" },
    });
    Object.assign(TABLES, {
      clearance: { table: "clearance_items", clean: (b) => { const o = {}; if (b.kind !== undefined) o.kind = ["person", "archival", "music", "location", "trademark", "claim"].includes(b.kind) ? b.kind : "claim"; if (b.label !== undefined) o.label = clip(b.label, 200); for (const k of ["ref_id", "scene_id"]) if (b[k] !== undefined) o[k] = isId(b[k]) ? b[k] : null; if (b.segment !== undefined) o.segment = clip(b.segment, 60); if (b.status !== undefined) { o.status = ["red", "yellow", "green"].includes(b.status) ? b.status : "red"; o.reviewed_at = now(); } if (b.basis !== undefined) o.basis = ["none", "release", "license", "public_domain", "fair_use", "permission", "incidental", "removed"].includes(b.basis) ? b.basis : "none"; if (b.doc !== undefined) o.doc = clip(b.doc, 300); if (b.notes !== undefined) o.notes = clip(b.notes, 1500); if (b.reviewer !== undefined) o.reviewer = clip(b.reviewer, 80); return o; }, need: "label" },
      cue: { table: "music_cues", clean: (b) => { const o = {}; if (b.title !== undefined) o.title = clip(b.title, 200); for (const k of ["artist", "publisher"]) if (b[k] !== undefined) o[k] = clip(b[k], 200); if (b.source !== undefined) o.source = ["temp", "library", "composer", "licensed", "hymn", "pd"].includes(b.source) ? b.source : "temp"; if (b.usage !== undefined) o.usage = ["bg", "featured", "theme", "source"].includes(b.usage) ? b.usage : "bg"; if (b.scene_id !== undefined) o.scene_id = isId(b.scene_id) ? b.scene_id : null; for (const k of ["in_s", "out_s"]) if (b[k] !== undefined) o[k] = b[k] === "" || b[k] == null ? null : num(b[k], 0, 1e6, 0); for (const k of ["sync_status", "master_status"]) if (b[k] !== undefined) o[k] = ["none", "na", "requested", "quoted", "licensed"].includes(b[k]) ? b[k] : "none"; if (b.license_link !== undefined) o.license_link = clip(b.license_link, 500); if (b.fee_cents !== undefined) o.fee_cents = Math.round(num(b.fee_cents, 0, 1e9, 0)); if (b.notes !== undefined) o.notes = clip(b.notes, 1500); if (b.sort !== undefined) o.sort = Math.round(num(b.sort, 0, 1e6, 0)); return o; }, need: "title" },
      arch: { table: "archival_items", clean: (b) => { const o = {}; if (b.title !== undefined) o.title = clip(b.title, 200); if (b.kind !== undefined) o.kind = ["photo", "film", "document", "audio", "newspaper", "map", "other"].includes(b.kind) ? b.kind : "other"; for (const k of ["lender", "rights_holder"]) if (b[k] !== undefined) o[k] = clip(b[k], 200); if (b.basis !== undefined) o.basis = ["unknown", "license", "public_domain", "fair_use", "materials_release", "owned"].includes(b.basis) ? b.basis : "unknown"; if (b.reasoning !== undefined) o.reasoning = clip(b.reasoning, 2000); if (b.fee_cents !== undefined) o.fee_cents = Math.round(num(b.fee_cents, 0, 1e9, 0)); for (const k of ["release_id", "scene_id", "source_id"]) if (b[k] !== undefined) o[k] = isId(b[k]) ? b[k] : null; if (b.status !== undefined) o.status = ["wanted", "in_hand", "cleared", "rejected"].includes(b.status) ? b.status : "wanted"; if (b.notes !== undefined) o.notes = clip(b.notes, 1500); return o; }, need: "title" },
      legal: { table: "legal_items", clean: (b) => { const o = {}; if (b.kind !== undefined) o.kind = LEGAL_KINDS[b.kind] ? b.kind : "contract"; if (b.title !== undefined) o.title = clip(b.title, 200); if (b.party !== undefined) o.party = clip(b.party, 200); if (b.status !== undefined) o.status = clip(b.status, 20); for (const k of ["date", "expires"]) if (b[k] !== undefined) o[k] = /^\d{4}-\d{2}-\d{2}$/.test(String(b[k] || "")) ? b[k] : null; if (b.link !== undefined) o.link = clip(b.link, 500); for (const k of ["ref_id", "scene_id", "location_id"]) if (b[k] !== undefined) o[k] = isId(b[k]) ? b[k] : null; if (b.notes !== undefined) o.notes = clip(b.notes, 2000); if (b.data !== undefined && typeof b.data === "object") o.data = Object.fromEntries(Object.entries(b.data || {}).slice(0, 20).map(([k, v]) => [clip(k, 30), clip(v, 600)])); if (b.sort !== undefined) o.sort = Math.round(num(b.sort, 0, 1e6, 0)); return o; }, need: "title" },
    });
    Object.assign(TABLES, {
      deliverable: { table: "deliverables", clean: (b) => { const o = {}; if (b.name !== undefined) o.name = clip(b.name, 160); if (b.kind !== undefined) o.kind = DELIVERABLE_KINDS[b.kind] ? b.kind : "other"; if (b.spec !== undefined) o.spec = clip(b.spec, 1000); if (b.status !== undefined) { o.status = ["todo", "rendering", "qc", "delivered", "acknowledged"].includes(b.status) ? b.status : "todo"; if (o.status === "delivered") o.delivered_at = now(); } if (b.link !== undefined) o.link = clip(b.link, 600); if (b.size_bytes !== undefined) o.size_bytes = Math.round(num(b.size_bytes, 0, 1e14, 0)); if (b.checksum !== undefined) o.checksum = clip(b.checksum, 128); if (b.qc !== undefined && typeof b.qc === "object") o.qc = { checks: Object.fromEntries(QC_CHECKS.map(([k]) => [k, Boolean(b.qc?.checks?.[k])])), notes: clip(b.qc?.notes, 1500), by: clip(b.qc?.by, 80), at: clip(b.qc?.at, 10) }; if (b.client_visible !== undefined) o.client_visible = Boolean(b.client_visible); if (b.sort !== undefined) o.sort = Math.round(num(b.sort, 0, 1e6, 0)); return o; }, need: "name" },
      followup: { table: "followups", clean: (b) => { const o = {}; if (b.kind !== undefined) o.kind = ["testimonial", "referral", "anniversary", "purge_notice", "premiere_reminder", "custom"].includes(b.kind) ? b.kind : "custom"; if (b.label !== undefined) o.label = clip(b.label, 300); if (b.due !== undefined) o.due = /^\d{4}-\d{2}-\d{2}$/.test(String(b.due || "")) ? b.due : now().slice(0, 10); if (b.status !== undefined) { o.status = ["scheduled", "done", "skipped"].includes(b.status) ? b.status : "scheduled"; o.done_at = o.status === "scheduled" ? null : now(); } if (b.note !== undefined) o.note = clip(b.note, 1000); return o; }, need: "label" },
      timesheet: { table: "timesheets", clean: (b) => { const o = {}; if (b.staff_id !== undefined) o.staff_id = isId(b.staff_id) ? b.staff_id : null; if (b.shoot_id !== undefined) o.shoot_id = isId(b.shoot_id) ? b.shoot_id : null; if (b.date !== undefined) o.date = /^\d{4}-\d{2}-\d{2}$/.test(String(b.date || "")) ? b.date : now().slice(0, 10); for (const k of ["call_time", "wrap_time"]) if (b[k] !== undefined) o[k] = clip(b[k], 10); for (const k of ["hours", "ot_hours", "miles"]) if (b[k] !== undefined) o[k] = num(b[k], 0, 1000, 0); if (b.kit !== undefined) o.kit = Boolean(b.kit); if (b.per_diem_cents !== undefined) o.per_diem_cents = Math.round(num(b.per_diem_cents, 0, 1e6, 0)); if (b.notes !== undefined) o.notes = clip(b.notes, 400); if (b.approved !== undefined) o.approved = Boolean(b.approved); return o; }, need: "staff_id" },
      cinv: { table: "crew_invoices", clean: (b) => { const o = {}; if (b.status !== undefined) { o.status = ["draft", "sent", "approved", "paid"].includes(b.status) ? b.status : "draft"; if (o.status === "paid" && b.paid_at === undefined) o.paid_at = now().slice(0, 10); } if (b.paid_at !== undefined) o.paid_at = /^\d{4}-\d{2}-\d{2}$/.test(String(b.paid_at || "")) ? b.paid_at : null; if (b.method !== undefined) o.method = clip(b.method, 40); if (b.notes !== undefined) o.notes = clip(b.notes, 1000); if (b.amount_cents !== undefined) o.amount_cents = Math.round(num(b.amount_cents, 0, 1e9, 0)); if (b.number !== undefined) o.number = clip(b.number, 30); return o; }, need: "status" },
      vendor: { table: "vendors", clean: (b) => { const o = {}; if (b.name !== undefined) o.name = clip(b.name, 160); for (const k of ["service", "contact", "email", "phone"]) if (b[k] !== undefined) o[k] = clip(b[k], 160); for (const k of ["w9", "coi"]) if (b[k] !== undefined) o[k] = Boolean(b[k]); if (b.notes !== undefined) o.notes = clip(b.notes, 1000); return o; }, need: "name", global: true },
      po: { table: "purchase_orders", clean: (b) => { const o = {}; if (b.vendor_id !== undefined) o.vendor_id = isId(b.vendor_id) ? b.vendor_id : null; if (b.description !== undefined) o.description = clip(b.description, 600); if (b.amount_cents !== undefined) o.amount_cents = Math.round(num(b.amount_cents, 0, 1e9, 0)); if (b.date !== undefined) o.date = /^\d{4}-\d{2}-\d{2}$/.test(String(b.date || "")) ? b.date : null; if (b.status !== undefined) o.status = ["draft", "sent", "received", "paid"].includes(b.status) ? b.status : "draft"; if (b.link !== undefined) o.link = clip(b.link, 500); if (b.budget_line_id !== undefined) o.budget_line_id = isId(b.budget_line_id) ? b.budget_line_id : null; if (b.notes !== undefined) o.notes = clip(b.notes, 1000); return o; }, need: "description" },
      travel: { table: "travel", clean: (b) => { const o = {}; if (b.kind !== undefined) o.kind = ["mileage", "lodging", "meal", "trip", "other"].includes(b.kind) ? b.kind : "other"; if (b.date !== undefined) o.date = /^\d{4}-\d{2}-\d{2}$/.test(String(b.date || "")) ? b.date : null; if (b.who !== undefined) o.who = clip(b.who, 80); if (b.shoot_id !== undefined) o.shoot_id = isId(b.shoot_id) ? b.shoot_id : null; if (b.from_to !== undefined) o.from_to = clip(b.from_to, 200); if (b.miles !== undefined) o.miles = num(b.miles, 0, 10000, 0); if (b.amount_cents !== undefined) o.amount_cents = Math.round(num(b.amount_cents, 0, 1e8, 0)); if (b.notes !== undefined) o.notes = clip(b.notes, 400); return o; }, need: "kind" },
      report: { table: "daily_reports", clean: (b) => { const o = {}; if (b.shoot_id !== undefined) o.shoot_id = isId(b.shoot_id) ? b.shoot_id : null; if (b.date !== undefined) o.date = /^\d{4}-\d{2}-\d{2}$/.test(String(b.date || "")) ? b.date : null; for (const k of ["crew_present", "call_actual", "first_shot", "wrap_actual", "scenes_shot", "rolls", "camera_notes", "sound_notes", "issues", "weather", "meals", "next_day", "signed_by"]) if (b[k] !== undefined) o[k] = clip(b[k], 1500); if (b.setups !== undefined) o.setups = Math.round(num(b.setups, 0, 999, 0)); return o; }, need: "shoot_id" },
    });
    if (body.action === "deliverables-seed") {
      if (!isId(body.projectId)) return bad("Bad request");
      const { count } = await db.from("deliverables").select("id", { count: "exact", head: true }).eq("project_id", body.projectId);
      if (count) return bad("There's already a package — add lines instead");
      const rows = DEFAULT_DELIVERABLES.map(([kind, name, spec], i) => ({ project_id: body.projectId, kind, name, spec, sort: i }));
      const { data, error } = await db.from("deliverables").insert(rows).select("*"); if (error) return missing(error);
      return NextResponse.json({ rows: data });
    }
    if (body.action === "deliverable-sign") {
      if (!isId(body.id)) return bad("Bad request"); if (!r2Configured) return bad("R2 isn't configured", 500);
      const { data: d } = await db.from("deliverables").select("id, project_id").eq("id", body.id).maybeSingle(); if (!d) return bad("No such deliverable", 404);
      const safe = clip(body.filename, 120).replace(/[^\w.\- ]/g, "_") || "file";
      const key = `deliverables/${d.project_id}/${d.id}/${safe}`;
      return NextResponse.json({ key, url: await putUrl(key, clip(body.contentType, 80) || "application/octet-stream") });
    }
    if (body.action === "deliverable-done") {
      if (!isId(body.id) || !/^deliverables\/[0-9a-f-]{36}\/[0-9a-f-]{36}\/[^/]+$/.test(body.key || "")) return bad("Bad request");
      const { data, error } = await db.from("deliverables").update({ file_key: body.key, size_bytes: Math.round(Number(body.size_bytes) || 0), checksum: clip(body.checksum, 128), status: "qc" }).eq("id", body.id).select("*").single(); if (error) return missing(error);
      return NextResponse.json({ row: data });
    }
    if (body.action === "deliverable-url") {
      if (!isId(body.id)) return bad("Bad request");
      const { data: d } = await db.from("deliverables").select("file_key").eq("id", body.id).maybeSingle();
      return NextResponse.json({ url: d?.file_key ? await signedUrl(d.file_key, { download: d.file_key.split("/").pop() }) : "" });
    }
    // Mark the project delivered: stamps the date, sets retention (3y),
    // schedules the follow-ups, moves the phase.
    if (body.action === "project-deliver") {
      if (!isId(body.projectId)) return bad("Bad request");
      const d = /^\d{4}-\d{2}-\d{2}$/.test(String(body.date || "")) ? body.date : now().slice(0, 10);
      const ret = new Date(new Date(`${d}T12:00:00`).getTime() + 3 * 365 * 864e5).toLocaleDateString("en-CA");
      const { data: project, error } = await db.from("projects").update({ delivered_at: d, retention_until: ret, phase: "delivery", status: "delivered" }).eq("id", body.projectId).select("*").single(); if (error) return missing(error);
      const { data: have } = await db.from("followups").select("kind").eq("project_id", body.projectId);
      const seen = new Set((have || []).map((x) => x.kind));
      const rows = defaultFollowups(d, ret).filter((f) => !seen.has(f.kind)).map((f) => ({ project_id: body.projectId, ...f }));
      const { data: fu } = rows.length ? await db.from("followups").insert(rows).select("*") : { data: [] };
      return NextResponse.json({ project, followups: fu || [] });
    }
    // Build a crew invoice from approved, un-invoiced timesheets.
    if (body.action === "invoice-build") {
      if (!isId(body.projectId) || !isId(body.staff_id)) return bad("Bad request");
      const team = await projectTeam(db, body.projectId); const member = team.find((m) => m.id === body.staff_id); if (!member) return bad("Not on this project");
      const { data: sheets } = await db.from("timesheets").select("*").eq("project_id", body.projectId).eq("staff_id", body.staff_id).eq("approved", true).is("invoice_id", null).order("date", { ascending: true });
      if (!sheets?.length) return bad("No approved, un-invoiced days for them");
      const lines = invoiceLines(sheets, member); const amount_cents = lines.reduce((a, l) => a + l.cents, 0);
      const { count } = await db.from("crew_invoices").select("id", { count: "exact", head: true }).eq("project_id", body.projectId);
      const number = `${(await db.from("projects").select("code").eq("id", body.projectId).maybeSingle()).data?.code || "INV"}-${String((count || 0) + 1).padStart(3, "0")}`;
      const { data: inv, error } = await db.from("crew_invoices").insert({ project_id: body.projectId, staff_id: body.staff_id, number, period_from: sheets[0].date, period_to: sheets.at(-1).date, lines, amount_cents }).select("*").single(); if (error) return missing(error);
      await db.from("timesheets").update({ invoice_id: inv.id }).in("id", sheets.map((x) => x.id));
      return NextResponse.json({ row: inv, sheets: sheets.map((x) => ({ ...x, invoice_id: inv.id })) });
    }
    if (body.action === "po-add" && isId(body.projectId)) {
      const row = TABLES.po.clean(body); if (!row.description) return bad("What is it for?");
      const { data: last } = await db.from("purchase_orders").select("number").eq("project_id", body.projectId).order("number", { ascending: false }).limit(1);
      const { data, error } = await db.from("purchase_orders").insert({ project_id: body.projectId, number: (last?.[0]?.number || 0) + 1, ...row }).select("*").single(); if (error) return missing(error);
      return NextResponse.json({ row: data });
    }
    if (body.action === "report-upsert") {
      if (!isId(body.projectId) || !isId(body.shoot_id)) return bad("Bad request");
      const row = TABLES.report.clean(body);
      const { data, error } = await db.from("daily_reports").upsert({ project_id: body.projectId, ...row }, { onConflict: "shoot_id" }).select("*").single(); if (error) return missing(error);
      return NextResponse.json({ row: data });
    }
    if (body.action === "vendor-add") {
      const row = TABLES.vendor.clean(body); if (!row.name) return bad("Vendor name?");
      const { data, error } = await db.from("vendors").insert(row).select("*").single(); if (error) return missing(error);
      return NextResponse.json({ row: data });
    }
    // Seed the clearance pass from what's already in the project: every
    // interviewee, archival item, music cue and location gets a line.
    if (body.action === "clearance-seed") {
      if (!isId(body.projectId)) return bad("Bad request");
      const pid = body.projectId;
      const [{ data: have }, { data: people }, { data: arch }, { data: cues }, { data: locs }, { data: rels }] = await Promise.all([
        db.from("clearance_items").select("kind, ref_id").eq("project_id", pid), db.from("project_people").select("id, name, kind, status").eq("project_id", pid).eq("kind", "interview"),
        db.from("archival_items").select("id, title, basis, status").eq("project_id", pid), db.from("music_cues").select("id, title, source, sync_status, master_status").eq("project_id", pid),
        db.from("locations").select("id, name, status").eq("project_id", pid).neq("status", "idea"), db.from("releases").select("person_id, kind").eq("project_id", pid),
      ]);
      const seen = new Set((have || []).map((h) => `${h.kind}:${h.ref_id}`));
      const rows = [];
      for (const x of people || []) if (!seen.has(`person:${x.id}`)) { const rel = (rels || []).some((r) => r.person_id === x.id && ["appearance", "minor", "estate", "clergy", "verbal"].includes(r.kind)); rows.push({ project_id: pid, kind: "person", label: x.name, ref_id: x.id, status: rel ? "green" : "red", basis: rel ? "release" : "none", doc: rel ? "Signed release in the vault" : "" }); }
      for (const x of arch || []) if (!seen.has(`archival:${x.id}`)) rows.push({ project_id: pid, kind: "archival", label: x.title, ref_id: x.id, status: x.status === "cleared" ? "green" : x.basis === "unknown" ? "red" : "yellow", basis: x.basis === "unknown" ? "none" : x.basis === "materials_release" ? "release" : x.basis === "owned" ? "permission" : x.basis });
      for (const x of cues || []) if (!seen.has(`music:${x.id}`)) rows.push({ project_id: pid, kind: "music", label: x.title, ref_id: x.id, status: x.source === "temp" ? "red" : ["licensed", "na"].includes(x.sync_status) && ["licensed", "na"].includes(x.master_status) ? "green" : "yellow", basis: x.source === "pd" ? "public_domain" : x.source === "temp" ? "none" : "license" });
      for (const x of locs || []) if (!seen.has(`location:${x.id}`)) { const rel = (rels || []).some((r) => r.kind === "location" && r.shoot_id); rows.push({ project_id: pid, kind: "location", label: x.name, ref_id: x.id, status: x.status === "cleared" || x.status === "shot" ? "yellow" : "red", basis: "none", notes: "Location release or written permission?" }); }
      if (!rows.length) return NextResponse.json({ rows: [] });
      const { data, error } = await db.from("clearance_items").insert(rows).select("*"); if (error) return missing(error);
      return NextResponse.json({ rows: data });
    }
    // Change orders number themselves; a sent one gets an approval line for the portal.
    if (body.action === "co-add" && isId(body.projectId)) {
      const row = TABLES.co.clean(body); if (!row.title) return bad("Needs a title");
      const { data: last } = await db.from("change_orders").select("number").eq("project_id", body.projectId).order("number", { ascending: false }).limit(1);
      const { data, error } = await db.from("change_orders").insert({ project_id: body.projectId, number: (last?.[0]?.number || 0) + 1, ...row }).select("*").single(); if (error) return missing(error);
      return NextResponse.json({ row: data });
    }
    // Payment schedule from the contract total (30/30/20/20).
    if (body.action === "payments-seed") {
      if (!isId(body.projectId)) return bad("Bad request");
      const total = Math.max(0, Math.round(Number(body.contract_cents) || 0)); if (!total) return bad("Set the contract total first");
      const { count } = await db.from("project_payments").select("id", { count: "exact", head: true }).eq("project_id", body.projectId);
      if (count) return bad("There's already a schedule — edit it instead");
      const rows = DEFAULT_PAYMENTS.map(([label, pct, gates], i) => ({ project_id: body.projectId, label, amount_cents: Math.round(total * pct / 100), gates, sort: i }));
      rows[rows.length - 1].amount_cents = total - rows.slice(0, -1).reduce((a, r) => a + r.amount_cents, 0);
      await db.from("projects").update({ contract_cents: total }).eq("id", body.projectId);
      const { data, error } = await db.from("project_payments").insert(rows).select("*"); if (error) return missing(error);
      return NextResponse.json({ rows: data });
    }
    // Review video: presigned PUT to reviews/<pid>/<id>.mp4 (or a link).
    if (body.action === "review-sign") {
      if (!isId(body.id)) return bad("Bad request"); if (!r2Configured) return bad("R2 isn't configured", 500);
      const { data: r } = await db.from("review_versions").select("id, project_id").eq("id", body.id).maybeSingle(); if (!r) return bad("No such review", 404);
      const key = `reviews/${r.project_id}/${r.id}.mp4`;
      return NextResponse.json({ key, url: await putUrl(key, "video/mp4") });
    }
    if (body.action === "review-done") {
      if (!isId(body.id) || !/^reviews\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.mp4$/.test(body.key || "")) return bad("Bad request");
      const { data, error } = await db.from("review_versions").update({ video_key: body.key }).eq("id", body.id).select("*").single(); if (error) return missing(error);
      return NextResponse.json({ row: data, url: await signedUrl(body.key) });
    }
    if (body.action === "review-url") {
      if (!isId(body.id)) return bad("Bad request");
      const { data: r } = await db.from("review_versions").select("video_key").eq("id", body.id).maybeSingle();
      return NextResponse.json({ url: r?.video_key ? await signedUrl(r.video_key) : "" });
    }
    // Weekly update: drafted from the data, edited, published to the portal,
    // optionally emailed to the stakeholders who have an address.
    if (body.action === "update-draft") {
      if (!isId(body.projectId)) return bad("Bad request");
      const text = await draftUpdate(db, body.projectId);
      return NextResponse.json({ body: text });
    }
    if (body.action === "update-publish") {
      if (!isId(body.id)) return bad("Bad request");
      const { data: u } = await db.from("updates").select("*").eq("id", body.id).maybeSingle(); if (!u) return bad("No such update", 404);
      if (!u.body.trim()) return bad("Write it first");
      let emailed = "";
      if (body.email && resendConfigured) {
        const { data: project } = await db.from("projects").select("title").eq("id", u.project_id).maybeSingle();
        const { data: stake } = await db.from("project_stakeholders").select("name, email, portal_role, primary_contact").eq("project_id", u.project_id);
        const to = (stake || []).filter((x) => x.email && (x.primary_contact || x.portal_role !== "viewer")).map((x) => x.email);
        if (to.length) {
          const html = wrapHtml({ body: u.body, cta: { label: "Open your project", href: `${process.env.NEXT_PUBLIC_SITE_URL || "https://rothmediaco.com"}/portal/projects/${u.project_id}` }, signoff: "— Brandon" });
          await sendBatch(to.map((t) => ({ to: t, subject: `${project?.title || "Your film"} — update for the week of ${u.week_of}`, html, text: u.body })));
          emailed = to.join(", ");
        }
      }
      const { data, error } = await db.from("updates").update({ published_at: now(), emailed_to: emailed }).eq("id", u.id).select("*").single(); if (error) return missing(error);
      return NextResponse.json({ row: data, emailed });
    }
    // A bite with a person on it is also a quote on that person — the edit
    // room and the People tab stay one list.
    if (body.action === "select-add" && isId(body.projectId)) {
      const row = TABLES.select.clean(body); if (!row.clip_id) return bad("Needs a clip");
      const { data, error } = await db.from("selects").insert({ project_id: body.projectId, ...row }).select("*").single();
      if (error) return missing(error);
      let person = null;
      if (data.person_id && data.kind === "bite" && data.text) {
        const { data: pr } = await db.from("project_people").select("id, quotes").eq("id", data.person_id).maybeSingle();
        if (pr) {
          const { data: c } = await db.from("clips").select("filename").eq("id", data.clip_id).maybeSingle();
          const at = `${Math.floor(data.in_s / 60)}:${String(Math.floor(data.in_s % 60)).padStart(2, "0")}`;
          const quotes = [...(pr.quotes || []), { text: data.text, at, when: now().slice(0, 10), clip: c?.filename || "", select_id: data.id }].slice(-300);
          const { data: up } = await db.from("project_people").update({ quotes }).eq("id", pr.id).select("*").single();
          person = up || null;
        }
      }
      return NextResponse.json({ row: data, person });
    }
    if (body.action === "select-delete" && isId(body.id)) {
      const { data: sel } = await db.from("selects").select("id, person_id").eq("id", body.id).maybeSingle();
      if (sel?.person_id) { const { data: pr } = await db.from("project_people").select("id, quotes").eq("id", sel.person_id).maybeSingle(); if (pr) await db.from("project_people").update({ quotes: (pr.quotes || []).filter((q) => q.select_id !== sel.id) }).eq("id", pr.id); }
      const { error } = await db.from("selects").delete().eq("id", body.id); if (error) return missing(error); return NextResponse.json({ ok: true });
    }
    // Bulk clip log from the browser's folder read. Upsert by filename;
    // roll/day are matched from the roll naming convention when it's there.
    if (body.action === "clips-ingest") {
      if (!isId(body.projectId) || !Array.isArray(body.clips)) return bad("Bad request");
      const { data: rolls } = await db.from("rolls").select("id, roll_name, shoot_id, camera").eq("project_id", body.projectId);
      const { data: shoots } = await db.from("shoots").select("id, date").eq("project_id", body.projectId);
      const rows = body.clips.slice(0, 500).map((c) => {
        const o = TABLES.clip.clean(c); if (!o.filename) return null;
        const pn = parseName(o.filename);
        if (!o.camera && pn.camera) o.camera = pn.camera; if (!o.card && pn.card) o.card = pn.card;
        const roll = pn.roll && (rolls || []).find((r) => r.roll_name.toUpperCase() === pn.roll);
        if (roll) { o.roll_id = roll.id; if (roll.shoot_id) o.shoot_id = roll.shoot_id; }
        if (!o.shoot_id && pn.ymd) { const d = (shoots || []).find((x) => x.date === pn.ymd); if (d) o.shoot_id = d.id; }
        if (!o.shoot_id && isId(body.shoot_id)) o.shoot_id = body.shoot_id;
        return { project_id: body.projectId, ...o };
      }).filter(Boolean);
      if (!rows.length) return bad("No clips in that folder");
      const { data, error } = await db.from("clips").upsert(rows, { onConflict: "project_id,filename", ignoreDuplicates: false }).select("*");
      if (error) return missing(error);
      return NextResponse.json({ rows: data });
    }
    // Proxy + thumb: presigned PUT straight to R2, then record the key.
    if (body.action === "clip-proxy-sign") {
      if (!isId(body.id)) return bad("Bad request"); if (!r2Configured) return bad("R2 isn't configured", 500);
      const { data: c } = await db.from("clips").select("id, project_id").eq("id", body.id).maybeSingle(); if (!c) return bad("No such clip", 404);
      const isThumb = body.which === "thumb";
      const key = `proxies/${c.project_id}/${c.id}.${isThumb ? "jpg" : "mp4"}`;
      return NextResponse.json({ key, url: await putUrl(key, isThumb ? "image/jpeg" : "video/mp4") });
    }
    if (body.action === "clip-proxy-done") {
      if (!isId(body.id) || !PROXY_KEY_RE.test(body.key || "")) return bad("Bad request");
      const col = body.key.endsWith(".jpg") ? "thumb_key" : "proxy_key";
      const { data, error } = await db.from("clips").update({ [col]: body.key }).eq("id", body.id).select("*").single(); if (error) return missing(error);
      return NextResponse.json({ row: data, url: await signedUrl(body.key) });
    }
    if (body.action === "clip-urls") {
      if (!isId(body.id)) return bad("Bad request");
      const { data: c } = await db.from("clips").select("proxy_key, thumb_key").eq("id", body.id).maybeSingle(); if (!c) return bad("No such clip", 404);
      return NextResponse.json({ proxy_url: c.proxy_key ? await signedUrl(c.proxy_key) : "", thumb_url: c.thumb_key ? await signedUrl(c.thumb_key) : "" });
    }
    // Transcripts: SRT/VTT/plain from Resolve/Premiere, or AssemblyAI off the proxy.
    if (body.action === "transcript-get") {
      if (!isId(body.id)) return bad("Bad request");
      const { data, error } = await db.from("transcripts").select("*").eq("clip_id", body.id).maybeSingle(); if (error) return missing(error);
      return NextResponse.json({ transcript: data || null });
    }
    if (body.action === "transcript-upload") {
      if (!isId(body.id)) return bad("Bad request");
      const raw = String(body.body || "").slice(0, 2_000_000); if (!raw.trim()) return bad("Empty transcript");
      const parsed = /-->/.test(raw) ? parseSubs(raw) : parsePlain(raw);
      if (!parsed.words.length) return bad("Couldn't read that — SRT, VTT or plain text");
      const { data: c } = await db.from("clips").select("id, project_id").eq("id", body.id).maybeSingle(); if (!c) return bad("No such clip", 404);
      const { data, error } = await db.from("transcripts").upsert({ clip_id: c.id, project_id: c.project_id, source: /-->/.test(raw) ? "srt" : "text", ...parsed }, { onConflict: "clip_id" }).select("*").single(); if (error) return missing(error);
      await db.from("clips").update({ transcript_status: "done" }).eq("id", c.id);
      return NextResponse.json({ transcript: data });
    }
    if (body.action === "transcribe") {
      if (!isId(body.id)) return bad("Bad request");
      const key = process.env.ASSEMBLYAI_API_KEY; if (!key) return bad("Add ASSEMBLYAI_API_KEY in Vercel → Settings → Environment Variables, redeploy, then this button works. Or upload the SRT from Resolve.", 500);
      const { data: c } = await db.from("clips").select("id, proxy_key").eq("id", body.id).maybeSingle(); if (!c) return bad("No such clip", 404);
      if (!c.proxy_key) return bad("Upload a proxy first — the transcriber listens to it");
      const audio_url = await signedUrl(c.proxy_key, { expiresIn: 6 * 3600 });
      const r = await fetch("https://api.assemblyai.com/v2/transcript", { method: "POST", headers: { authorization: key, "content-type": "application/json" }, body: JSON.stringify({ audio_url, speaker_labels: true, punctuate: true, format_text: true }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.id) return bad(`AssemblyAI: ${j.error || r.status}`, 502);
      const { data, error } = await db.from("clips").update({ transcript_status: "queued", transcript_id: j.id }).eq("id", c.id).select("*").single(); if (error) return missing(error);
      return NextResponse.json({ row: data });
    }
    if (body.action === "transcript-poll") {
      if (!isId(body.id)) return bad("Bad request");
      const key = process.env.ASSEMBLYAI_API_KEY; if (!key) return bad("No ASSEMBLYAI_API_KEY", 500);
      const { data: c } = await db.from("clips").select("id, project_id, transcript_id, transcript_status").eq("id", body.id).maybeSingle(); if (!c?.transcript_id) return bad("Nothing queued");
      const r = await fetch(`https://api.assemblyai.com/v2/transcript/${c.transcript_id}`, { headers: { authorization: key } });
      const j = await r.json().catch(() => ({}));
      if (j.status === "completed") {
        const parsed = fromAssembly(j);
        const { data: t, error } = await db.from("transcripts").upsert({ clip_id: c.id, project_id: c.project_id, source: "assemblyai", ...parsed }, { onConflict: "clip_id" }).select("*").single(); if (error) return missing(error);
        const { data: row } = await db.from("clips").update({ transcript_status: "done" }).eq("id", c.id).select("*").single();
        return NextResponse.json({ row, transcript: t });
      }
      if (j.status === "error") { const { data: row } = await db.from("clips").update({ transcript_status: "error" }).eq("id", c.id).select("*").single(); return NextResponse.json({ row, error: j.error }); }
      const { data: row } = await db.from("clips").update({ transcript_status: "processing" }).eq("id", c.id).select("*").single();
      return NextResponse.json({ row });
    }
    const m3 = /^(chrono|source|question|event|clip|select|cut|note|approval|review|rnote|co|payment|comm|update|sens|clearance|cue|arch|legal|deliverable|followup|timesheet|cinv|vendor|po|travel|report)-(add|update|delete)$/.exec(body.action || "");
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

