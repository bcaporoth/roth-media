import { NextResponse } from "next/server";
import { whoIs, canProject, projectOf } from "../../../../lib/staff-server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { r2Configured, putSignature, signedUrl } from "../../../../lib/r2";
import { RELEASE_KINDS, TEXT_VERSION, releaseBody } from "../../../../lib/releases";
import { PROJECT_STATUSES, PERSON_STATUSES, PERSON_KINDS } from "../../../../lib/projects";
import { ARC_KEYS } from "../../../../lib/story-arc";

// Studio → Projects: the job above the dates. Projects, the people in them
// (cast + sources), story beats, archive to-gets, and the releases signed on
// the spot. Everything here is Brandon-only.
export const dynamic = "force-dynamic";

const deny = () => NextResponse.json({ error: "Not authorized" }, { status: 403 });
const bad = (msg, status = 422) => NextResponse.json({ error: msg }, { status });
const clip = (v, n) => String(v ?? "").trim().slice(0, n);
const isId = (v) => /^[0-9a-f-]{36}$/.test(String(v || ""));
const missing = (e) => bad(/projects|project_people|project_entries|releases/i.test(e.message) && /does not exist|schema cache/i.test(e.message) ? (/project_entries/i.test(e.message) ? "Run supabase/journal.sql once in the Supabase SQL editor first" : "Run supabase/projects.sql once in the Supabase SQL editor first") : e.message, 500);


function cleanProject(b) {
  const o = {};
  if (b.title !== undefined) { o.title = clip(b.title, 120); if (!o.title) throw new Error("Give the project a name"); }
  if (b.kind !== undefined) o.kind = clip(b.kind, 30) || "documentary";
  for (const k of ["client_name", "client_email"]) if (b[k] !== undefined) o[k] = clip(b[k], 120);
  if (b.status !== undefined) o.status = PROJECT_STATUSES.includes(b.status) ? b.status : "planning";
  if (b.logline !== undefined) o.logline = clip(b.logline, 400);
  if (b.notes !== undefined) o.notes = clip(b.notes, 8000);
  if (b.beats !== undefined) o.beats = (Array.isArray(b.beats) ? b.beats : []).slice(0, 80).map((x) => ({ text: clip(x?.text, 300), done: Boolean(x?.done), who: clip(x?.who, 120) })).filter((x) => x.text);
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
      return NextResponse.json({ release: { ...data, signature_url: await signedUrl(key).catch(() => "") } });
    }
    if (body.action === "release-text") {
      return NextResponse.json({ body: releaseBody(body.kind, { name: clip(body.name, 120) || "____________", project: clip(body.project, 160) || "the project", date: clip(body.date, 60) || "the agreed date", place: clip(body.place, 200) || "the agreed location", minor: clip(body.minor, 120) }), version: TEXT_VERSION });
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

