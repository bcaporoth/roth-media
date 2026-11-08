import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase-admin";
import { whoAmI, canOpen, loadDay, draftScript, outlineDay, draftDay, planItemsFor, sendDayEmail, aiConfigured } from "../../../lib/scripts-server";
import { cleanScriptPatch, cleanDayPatch, cleanBody, cleanStep, cleanLine, isUuid, KIND_LABEL, STATUS_LABEL, STYLE_LABEL, toTchart } from "../../../lib/scripts";
import { seedChecklist, checklistFromPlaybook } from "../../../lib/shoot-guides";
import { loadPlaybook } from "../../../lib/playbook";
import { baselineScripts } from "../../../lib/baseline-day";
import { resendConfigured, sendEmail } from "../../../lib/resend";
import { LEAD_ALERT_TO, leadAlertEmail } from "../../../lib/studio-emails";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // a Claude draft can take a minute

const bad = (error, status = 422) => NextResponse.json({ error }, { status });
const now = () => new Date().toISOString();
const clip = (v, n) => String(v ?? "").slice(0, n);

// Shoot days + scripts — ONE route for Brandon (Studio) and the client
// (portal). Every action checks who is asking and that the day is theirs.
//   day-create (both — a client only for themselves; theirs stays off
//               Brandon's Shoots calendar and emails him instead)
//   day-update (both)         day-delete (Brandon)
//   script-add (both)         script-save (both, rev-checked)
//   script-delete (Brandon; client only their own)   script-order (both)
//   script-note (both)        script-draft (Brandon — Claude writes it)
//   load (both) — the day + scripts, for refreshes
// The calendar entry behind a dated shoot day: create it once (with the
// Content Day prep lists from the playbook), then keep it in step.
async function syncShoot(db, day, next) {
  let shootId = day.shoot_id || null;
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
  return shootId;
}

export async function POST(request) {
  const me = await whoAmI();
  if (!me) return bad("Sign in first", 401);
  const body = await request.json().catch(() => ({}));
  const db = supabaseAdmin();

  try {
    if (body.action === "day-create") {
      // 2026-11-08: clients can start a shoot day too, from their calendar.
      const byClient = me.role === "client";
      if (byClient) body.clientId = me.clientId;
      else if (me.role !== "brandon") return bad("Not authorized", 403);
      if (!isUuid(body.clientId)) return bad("Bad client");
      const { data: client } = await db.from("clients").select("id").eq("id", body.clientId).maybeSingle();
      if (!client) return bad("Client not found", 404);
      const patch = cleanDayPatch({ title: body.title || "Shoot day", date: body.date, start_time: body.start_time || "09:00", end_time: body.end_time, location: body.location });
      // Started from a shoot that's already on the calendar → tie the day to it, no second entry.
      const shootId = isUuid(body.shootId) ? body.shootId : null;
      const { data, error } = await db.from("shoot_days").insert({ client_id: client.id, ...patch, ...(shootId ? { shoot_id: shootId } : {}) }).select("id").single();
      if (error) throw new Error(/shoot_days/.test(error.message) ? "Run supabase/shoot-days.sql once in the Supabase SQL editor first." : error.message);
      // Their first shoot day + a brand page = the baseline day: the Pinned
      // Three and the B-roll basics, started from their answers (lib/baseline-day.js).
      try {
        const { count } = await db.from("shoot_days").select("id", { count: "exact", head: true }).eq("client_id", client.id);
        if (count === 1) {
          const { data: pal } = await db.from("brand_palettes").select("data").eq("client_id", client.id).maybeSingle();
          if (pal) {
            const rows = baselineScripts(pal.data || {}).map((sc, i) => ({ day_id: data.id, client_id: client.id, position: i, status: "draft", created_by: me.role, updated_by: me.role, ...sc }));
            await db.from("scripts").insert(rows);
            if (!body.title || body.title === "Shoot day") await db.from("shoot_days").update({ title: "Baseline day" }).eq("id", data.id);
          }
        }
      } catch {}
      // A client started it: tell Brandon, and leave his Shoots calendar alone
      // until he sets the time (his first date edit puts it on there).
      if (byClient) {
        if (resendConfigured) {
          try {
            const { data: who } = await db.from("clients").select("name, email, phone").eq("id", client.id).maybeSingle();
            const when = patch.date ? new Date(patch.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }) : "no date yet";
            await sendEmail({ to: LEAD_ALERT_TO, ...leadAlertEmail({ kind: "shoot day", name: who?.name || who?.email, email: who?.email, phone: who?.phone, subject: `${who?.name || who?.email} started a shoot day — ${when}`, summary: "They started it from their calendar. Open it to write the scripts together.", fields: [["Day", patch.title || "Shoot day"], ["Date", when], ["Open it", `rothmediaco.com/portal/admin/clients/${client.id}/days/${data.id}`]] }) });
          } catch {}
        }
        return NextResponse.json({ ok: true, id: data.id });
      }
      // Dated from the start → it's on the Shoots calendar right away.
      if (patch.date && !shootId) {
        const { data: who } = await db.from("clients").select("name, email").eq("id", client.id).maybeSingle();
        await syncShoot(db, { id: data.id, shoot_id: null, client: who || {} }, { ...patch });
      }
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
      const next = { ...day, ...allowed };
      const shootId = me.role === "brandon" && next.date ? await syncShoot(db, day, next) : day.shoot_id || null;
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
      // Outline first (quick), saved at once as draft scripts; the page then
      // asks for each script's full text one request at a time (script-draft).
      const { scripts, dayNotes } = await outlineDay(db, { client: day.client, theme: body.theme, counts: body.counts, existing: day.scripts, day });
      let position = day.scripts.reduce((n, s) => Math.max(n, s.position + 1), 0);
      // Every script is a T-chart now (2026-11-08); the outline's kind becomes its style.
      const rows = scripts.map((sc) => ({ day_id: day.id, client_id: day.client_id, position: position++, ...cleanScriptPatch({ ...sc, kind: "tchart", body: toTchart(sc.kind, sc.body) }), created_by: "brandon", updated_by: "brandon" }));
      const { data: inserted, error } = await db.from("scripts").insert(rows).select("id");
      if (error) throw new Error(error.message);
      if (dayNotes && !day.notes) await db.from("shoot_days").update({ notes: dayNotes, updated_at: now() }).eq("id", day.id);
      return NextResponse.json({ ok: true, added: rows.length, newIds: (inserted || []).map((r) => r.id), day: await loadDay(db, day.id) });
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
      const rows = items.map((it) => ({ day_id: day.id, client_id: day.client_id, position: position++, ...cleanScriptPatch({ ...it.script, kind: "tchart", body: toTchart(it.script.kind, it.script.body) }), created_by: "brandon", updated_by: "brandon" }));
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
      const kind = KIND_LABEL[body.kind] ? body.kind : "tchart";
      const position = day.scripts.reduce((n, s) => Math.max(n, s.position + 1), 0);
      const patch = cleanScriptPatch({ title: body.title || "", kind, minutes: body.minutes ?? (kind === "recipe" || kind === "manual" ? 45 : kind === "photos" ? 30 : 20), body: body.body || {} });
      const { data, error } = await db.from("scripts").insert({ day_id: day.id, client_id: day.client_id, position, ...patch, created_by: me.role, updated_by: me.role }).select("*").single();
      if (error && /scripts_kind_check/.test(error.message)) return bad(`The database doesn't allow “${KIND_LABEL[kind]}” yet — run supabase/scripts-cards.sql in the Supabase SQL editor.`, 500);
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true, script: data });
    }

    const script = isUuid(body.scriptId) ? day.scripts.find((s) => s.id === body.scriptId) : null;
    if (["script-save", "script-delete", "script-note", "script-draft"].includes(body.action) && !script) return bad("Script not found", 404);

    // Film mode: tick a step, or move the status — no rev needed, nothing else changes.
    if (body.action === "script-tick") {
      if (!script) return bad("Script not found", 404);
      const b = cleanBody(script.body);
      const done = Boolean(body.done);
      if (body.question !== undefined) {
        const q = Number(body.question);
        if (!Number.isInteger(q) || !b.questions[q]) return bad("Bad question");
        b.questions[q] = { ...b.questions[q], done };
      } else if (body.scene !== undefined) {
        const sc = Number(body.scene), ln = Number(body.line);
        if (!Number.isInteger(sc) || !b.scenes[sc] || !Number.isInteger(ln) || !b.scenes[sc].lines[ln]) return bad("Bad line");
        b.scenes[sc].lines[ln] = { ...b.scenes[sc].lines[ln], done };
      } else {
        const i = Number(body.step);
        if (!Number.isInteger(i) || !b.steps[i]) return bad("Bad step");
        b.steps[i] = cleanStep({ ...b.steps[i], done });
      }
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
      b.scenes = b.scenes.map((sc) => ({ ...sc, lines: sc.lines.map((l) => cleanLine({ ...l, done: false })) }));
      b.questions = b.questions.map((q) => ({ ...q, done: false }));
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
      const isT = script.kind === "tchart";
      const cur = cleanBody(script.body);
      const style = isT ? (STYLE_LABEL[cur.style] && cur.style !== "questions" ? cur.style : "reel") : script.kind;
      const { title, body: drafted } = await draftScript(db, {
        client: day.client, kind: style, title: body.title ?? script.title, idea: body.idea, current: script.body, thread: script.thread,
      });
      // T-chart: Claude writes it as steps, laid out here as said | seen lines;
      // the style and any interview questions they already had are kept.
      const next = isT ? { ...toTchart(style, drafted), style: cur.style || style, questions: cur.questions } : cleanBody(drafted);
      const { data, error } = await db.from("scripts").update({ title: title || script.title, body: next, rev: script.rev + 1, updated_by: "brandon", updated_at: now() }).eq("id", script.id).select("*").single();
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true, script: data });
    }

    return bad("Unknown action", 400);
  } catch (err) {
    return bad(err.message || "Something went wrong", 500);
  }
}
