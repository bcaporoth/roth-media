import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase-admin";
import { whoAmI, canOpen, loadDay, draftScript, draftDay, planItemsFor, sendDayEmail, aiConfigured } from "../../../lib/scripts-server";
import { cleanScriptPatch, cleanDayPatch, cleanBody, cleanStep, isUuid, KIND_LABEL, STATUS_LABEL } from "../../../lib/scripts";
import { seedChecklist, checklistFromPlaybook } from "../../../lib/shoot-guides";
import { loadPlaybook } from "../../../lib/playbook";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // a Claude draft can take a minute

const bad = (error, status = 422) => NextResponse.json({ error }, { status });
const now = () => new Date().toISOString();
const clip = (v, n) => String(v ?? "").slice(0, n);

// Shoot days + scripts — ONE route for Brandon (Studio) and the client
// (portal). Every action checks who is asking and that the day is theirs.
//   day-create (Brandon)      day-update (both)      day-delete (Brandon)
//   script-add (both)         script-save (both, rev-checked)
//   script-delete (Brandon; client only their own)   script-order (both)
//   script-note (both)        script-draft (Brandon — Claude writes it)
//   load (both) — the day + scripts, for refreshes
export async function POST(request) {
  const me = await whoAmI();
  if (!me) return bad("Sign in first", 401);
  const body = await request.json().catch(() => ({}));
  const db = supabaseAdmin();

  try {
    if (body.action === "day-create") {
      if (me.role !== "brandon") return bad("Not authorized", 403);
      if (!isUuid(body.clientId)) return bad("Bad client");
      const { data: client } = await db.from("clients").select("id").eq("id", body.clientId).maybeSingle();
      if (!client) return bad("Client not found", 404);
      const patch = cleanDayPatch({ title: body.title || "Shoot day", date: body.date, start_time: body.start_time || "09:00", end_time: body.end_time, location: body.location });
      const { data, error } = await db.from("shoot_days").insert({ client_id: client.id, ...patch }).select("id").single();
      if (error) throw new Error(/shoot_days/.test(error.message) ? "Run supabase/shoot-days.sql once in the Supabase SQL editor first." : error.message);
      return NextResponse.json({ ok: true, id: data.id });
    }

    // Everything else needs a day this person may open.
    const day = await loadDay(db, body.dayId);
    if (!day || !canOpen(me, day)) return bad("Not found", 404);

    if (body.action === "load") return NextResponse.json({ ok: true, day });

    if (body.action === "day-update") {
      const patch = cleanDayPatch(body.patch || {});
      // Clients can change notes and nothing else about the day.
      const allowed = me.role === "brandon" ? patch : (patch.notes !== undefined ? { notes: patch.notes } : {});
      if (!Object.keys(allowed).length) return bad("Nothing to change");
      const { error } = await db.from("shoot_days").update({ ...allowed, updated_at: now() }).eq("id", day.id);
      if (error) throw new Error(error.message);
      // A dated day lives on the Shoots calendar too (prep sheet, night-before
      // email, drive time). Made once, then kept in step with the day.
      let shootId = day.shoot_id || null;
      const next = { ...day, ...allowed };
      if (me.role === "brandon" && next.date) {
        try {
          const row = { title: next.title, kind: "business", client_name: day.client?.name || "", client_email: day.client?.email || "", date: next.date, start_time: next.start_time || "", address: next.location || "" };
          if (shootId) await db.from("shoots").update(row).eq("id", shootId);
          else {
            let checklist = [];
            try { const { lists } = await loadPlaybook(db); checklist = checklistFromPlaybook(lists, "business"); } catch {}
            if (!checklist.length) checklist = seedChecklist("business");
            const { data: sh } = await db.from("shoots").insert({ ...row, status: "planned", checklist }).select("id").single();
            if (sh) { shootId = sh.id; await db.from("shoot_days").update({ shoot_id: sh.id }).eq("id", day.id); }
          }
        } catch {}
      }
      return NextResponse.json({ ok: true, shootId });
    }

    if (body.action === "day-delete") {
      if (me.role !== "brandon") return bad("Not authorized", 403);
      const { error } = await db.from("shoot_days").delete().eq("id", day.id);
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true });
    }

    // Brandon: Claude writes the whole day in one go — N scripts, ordered, plus day notes.
    if (body.action === "day-draft") {
      if (me.role !== "brandon") return bad("Not authorized", 403);
      if (!aiConfigured) return bad("Claude isn't set up on this server (ANTHROPIC_API_KEY).", 503);
      const { scripts, dayNotes } = await draftDay(db, { client: day.client, theme: body.theme, counts: body.counts, existing: day.scripts, day });
      let position = day.scripts.reduce((n, s) => Math.max(n, s.position + 1), 0);
      const rows = scripts.map((sc) => ({ day_id: day.id, client_id: day.client_id, position: position++, ...cleanScriptPatch(sc), created_by: "brandon", updated_by: "brandon" }));
      const { error } = await db.from("scripts").insert(rows);
      if (error) throw new Error(error.message);
      if (dayNotes && !day.notes) await db.from("shoot_days").update({ notes: dayNotes, updated_at: now() }).eq("id", day.id);
      return NextResponse.json({ ok: true, added: rows.length, day: await loadDay(db, day.id) });
    }

    // Brandon: the content plan's items, ready to drop in as scripts.
    if (body.action === "plan-items") {
      if (me.role !== "brandon") return bad("Not authorized", 403);
      return NextResponse.json({ ok: true, items: await planItemsFor(db, day.client_id) });
    }
    if (body.action === "plan-import") {
      if (me.role !== "brandon") return bad("Not authorized", 403);
      const want = new Set(Array.isArray(body.itemIds) ? body.itemIds.map(String) : []);
      const items = (await planItemsFor(db, day.client_id)).filter((it) => want.has(String(it.id)));
      if (!items.length) return bad("Pick at least one item");
      let position = day.scripts.reduce((n, s) => Math.max(n, s.position + 1), 0);
      const rows = items.map((it) => ({ day_id: day.id, client_id: day.client_id, position: position++, ...cleanScriptPatch(it.script), created_by: "brandon", updated_by: "brandon" }));
      const { error } = await db.from("scripts").insert(rows);
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true, added: rows.length, day: await loadDay(db, day.id) });
    }

    if (body.action === "day-send") {
      if (me.role !== "brandon") return bad("Not authorized", 403);
      const r = await sendDayEmail({ day, note: body.note });
      return NextResponse.json({ ok: true, ...r });
    }

    if (body.action === "script-add") {
      const kind = KIND_LABEL[body.kind] ? body.kind : "reel";
      const position = day.scripts.reduce((n, s) => Math.max(n, s.position + 1), 0);
      const patch = cleanScriptPatch({ title: body.title || "", kind, minutes: body.minutes ?? (kind === "recipe" || kind === "manual" ? 45 : kind === "photos" ? 30 : 20), body: body.body || {} });
      const { data, error } = await db.from("scripts").insert({ day_id: day.id, client_id: day.client_id, position, ...patch, created_by: me.role, updated_by: me.role }).select("*").single();
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true, script: data });
    }

    const script = isUuid(body.scriptId) ? day.scripts.find((s) => s.id === body.scriptId) : null;
    if (["script-save", "script-delete", "script-note", "script-draft"].includes(body.action) && !script) return bad("Script not found", 404);

    // Film mode: tick a step, or move the status — no rev needed, nothing else changes.
    if (body.action === "script-tick") {
      if (!script) return bad("Script not found", 404);
      const i = Number(body.step);
      const b = cleanBody(script.body);
      if (!Number.isInteger(i) || !b.steps[i]) return bad("Bad step");
      b.steps[i] = cleanStep({ ...b.steps[i], done: Boolean(body.done) });
      const { data, error } = await db.from("scripts").update({ body: b, rev: script.rev + 1, updated_by: me.role, updated_at: now() }).eq("id", script.id).select("*").single();
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true, script: data });
    }
    if (body.action === "script-status") {
      if (!script) return bad("Script not found", 404);
      if (!STATUS_LABEL[body.status]) return bad("Unknown status");
      const { data, error } = await db.from("scripts").update({ status: body.status, rev: script.rev + 1, updated_by: me.role, updated_at: now() }).eq("id", script.id).select("*").single();
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true, script: data });
    }
    if (body.action === "script-duplicate") {
      if (!script) return bad("Script not found", 404);
      const position = day.scripts.reduce((n, s) => Math.max(n, s.position + 1), 0);
      const b = cleanBody(script.body); b.steps = b.steps.map((st) => ({ ...st, done: false }));
      const { data, error } = await db.from("scripts").insert({ day_id: day.id, client_id: day.client_id, position, kind: script.kind, title: `${script.title || KIND_LABEL[script.kind]} (copy)`.slice(0, 140), status: "draft", minutes: script.minutes, body: b, created_by: me.role, updated_by: me.role }).select("*").single();
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true, script: data });
    }

    if (body.action === "script-save") {
      // Two people, one script: a save built on an older rev is refused and
      // the newer copy comes back so the editor can show it.
      if (Number(body.rev) !== script.rev) return NextResponse.json({ error: "stale", script }, { status: 409 });
      const patch = cleanScriptPatch(body.patch || {});
      if (!Object.keys(patch).length) return bad("Nothing to save");
      const { data, error } = await db.from("scripts").update({ ...patch, rev: script.rev + 1, updated_by: me.role, updated_at: now() }).eq("id", script.id).eq("rev", script.rev).select("*").maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) { const fresh = (await loadDay(db, day.id)).scripts.find((s) => s.id === script.id); return NextResponse.json({ error: "stale", script: fresh }, { status: 409 }); }
      return NextResponse.json({ ok: true, script: data });
    }

    if (body.action === "script-delete") {
      if (me.role !== "brandon" && script.created_by !== "client") return bad("Only Brandon can remove this one — leave a note on it instead.", 403);
      const { error } = await db.from("scripts").delete().eq("id", script.id);
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true });
    }

    if (body.action === "script-order") {
      const order = (Array.isArray(body.order) ? body.order : []).filter(isUuid);
      const ids = new Set(day.scripts.map((s) => s.id));
      if (!order.length || order.some((id) => !ids.has(id))) return bad("Bad order");
      const rest = day.scripts.map((s) => s.id).filter((id) => !order.includes(id));
      const all = [...order, ...rest];
      const results = await Promise.all(all.map((id, position) => db.from("scripts").update({ position }).eq("id", id)));
      const failed = results.find((r) => r.error);
      if (failed) throw new Error(failed.error.message);
      return NextResponse.json({ ok: true });
    }

    if (body.action === "script-note") {
      const text = clip(body.text, 2000).trim();
      if (!text) return bad("Write something first");
      const thread = [...(Array.isArray(script.thread) ? script.thread : []), { who: me.role, text, at: now() }].slice(-200);
      const { error } = await db.from("scripts").update({ thread, updated_at: now() }).eq("id", script.id);
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true, thread });
    }

    if (body.action === "script-draft") {
      if (me.role !== "brandon") return bad("Not authorized", 403);
      if (!aiConfigured) return bad("Claude isn't set up on this server (ANTHROPIC_API_KEY).", 503);
      const { title, body: drafted } = await draftScript(db, {
        client: day.client, kind: script.kind, title: body.title ?? script.title, idea: body.idea, current: script.body, thread: script.thread,
      });
      const { data, error } = await db.from("scripts").update({ title: title || script.title, body: cleanBody(drafted), rev: script.rev + 1, updated_by: "brandon", updated_at: now() }).eq("id", script.id).select("*").single();
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true, script: data });
    }

    return bad("Unknown action", 400);
  } catch (err) {
    return bad(err.message || "Something went wrong", 500);
  }
}
