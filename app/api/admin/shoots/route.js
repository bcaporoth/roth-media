import { NextResponse } from "next/server";
import { isAdminRequest } from "../../../../lib/admin-guard";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { geocode, drive } from "../../../../lib/geo";
import { GUIDES, GEAR_BASE, seedChecklist, GROUPS, checklistFromPlaybook } from "../../../../lib/shoot-guides";
import { loadPlaybook } from "../../../../lib/playbook";
import { computeDues, dueFromDate } from "../../../../lib/delivery";

export const dynamic = "force-dynamic";

const deny = () => NextResponse.json({ error: "Not authorized" }, { status: 403 });
const bad = (msg, status = 422) => NextResponse.json({ error: msg }, { status });
const KINDS = new Set(Object.keys(GUIDES));
const STATUSES = new Set(["planned", "confirmed", "done", "cancelled"]);
const clip = (v, n) => String(v ?? "").trim().slice(0, n);
const isId = (v) => /^[0-9a-f-]{36}$/.test(String(v || ""));

// Delivery clock columns come from supabase/studio-2.sql. Until that's been
// run they don't exist: nothing here may select or write them in a way that
// breaks the shoots that already work.
const DELIVERY_COLS = ["sneak_due", "final_due", "sneak_delivered_at", "final_delivered_at"];
const hasDelivery = (row) => Boolean(row) && "final_delivered_at" in row;
const missingColumn = (error) => /column .* does not exist|could not find the .* column|schema cache/i.test(error?.message || "");
const NEEDS_SQL = "Run supabase/studio-2.sql once to turn on the delivery clock";
const sameTime = (a, b) => (a && b ? new Date(a).getTime() === new Date(b).getTime() : !a && !b);

// Pull a place out of a lead's fields: "where", "venue", "location", "business name and location", "address".
function addressFromFields(fields) {
  const rows = Array.isArray(fields) ? fields : [];
  const hit = rows.find(([k]) => /venue|address|location|where/i.test(String(k)));
  return hit ? String(hit[1] || "").trim() : "";
}
function dateFromFields(fields) {
  const rows = Array.isArray(fields) ? fields : [];
  const hit = rows.find(([k]) => /date|when/i.test(String(k)));
  return hit ? String(hit[1] || "").trim() : "";
}

async function locate(address) {
  const g = await geocode(address);
  if (!g) return { place_label: "", lat: null, lng: null, miles: null, drive_min: null };
  const d = await drive(g);
  return { place_label: (g.approximate ? "≈ " : "") + g.label, lat: g.lat, lng: g.lng, miles: d.miles, drive_min: d.minutes };
}

function clean(body, existing = {}) {
  const out = {};
  if (body.title !== undefined) { out.title = clip(body.title, 120); if (!out.title) throw new Error("Give the shoot a title"); }
  if (body.kind !== undefined) out.kind = KINDS.has(body.kind) ? body.kind : "other";
  if (body.status !== undefined) out.status = STATUSES.has(body.status) ? body.status : "planned";
  for (const k of ["client_name", "client_email", "client_phone", "time_note", "address"]) if (body[k] !== undefined) out[k] = clip(body[k], k === "address" ? 240 : 120);
  if (body.date !== undefined) { const d = clip(body.date, 10); if (d && !/^\d{4}-\d{2}-\d{2}$/.test(d)) throw new Error("Bad date"); out.date = d || null; }
  if (body.start_time !== undefined) { const t = clip(body.start_time, 5); if (t && !/^\d{2}:\d{2}$/.test(t)) throw new Error("Bad time"); out.start_time = t; }
  if (body.notes !== undefined) out.notes = clip(body.notes, 8000);
  if (body.checklist !== undefined)
    out.checklist = (Array.isArray(body.checklist) ? body.checklist : []).slice(0, 300).map((c) => {
      const group = GROUPS.includes(c.group) ? c.group : "shots";
      const time = group === "flow" && /^\d{2}:\d{2}$/.test(String(c.time || "")) ? c.time : "";
      return { text: clip(c.text, 240), done: Boolean(c.done), group, ...(time ? { time } : {}) };
    }).filter((c) => c.text);
  if (body.gallery_id !== undefined) out.gallery_id = /^[0-9a-f-]{36}$/.test(String(body.gallery_id || "")) ? body.gallery_id : null;
  if (body.submission_id !== undefined) out.submission_id = /^[0-9a-f-]{36}$/.test(String(body.submission_id || "")) ? body.submission_id : null;
  return out;
}

export async function GET() {
  if (!(await isAdminRequest())) return deny();
  const db = supabaseAdmin();
  const [{ data: shoots, error }, { data: leads }, { data: galleries }, playbook] = await Promise.all([
    db.from("shoots").select("*").order("date", { ascending: true, nullsFirst: false }),
    db.from("submissions").select("id, created_at, kind, name, email, phone, summary, fields, status").in("status", ["new", "contacted", "booked"]).not("kind", "in", "(partner,partner_lead,partner_month,call,intake_sent)").order("created_at", { ascending: false }).limit(60),
    db.from("galleries").select("id, title").order("created_at", { ascending: false }),
    loadPlaybook(db),
  ]);
  if (error) return bad(/relation .* does not exist/i.test(error.message) ? "Run supabase/shoots.sql first" : error.message, 500);
  // Is the delivery clock switched on (studio-2.sql run)? Rows carry the
  // columns when it is; with no rows yet, ask the table directly.
  let deliveryReady = (shoots || []).length ? hasDelivery(shoots[0]) : null;
  if (deliveryReady === null) {
    const probe = await db.from("shoots").select("final_delivered_at").limit(1);
    deliveryReady = !probe.error;
  }
  return NextResponse.json({
    shoots: shoots || [],
    delivery: { ready: deliveryReady },
    leads: (leads || []).map((l) => ({ ...l, address: addressFromFields(l.fields), when: dateFromFields(l.fields), fields: undefined })),
    galleries: galleries || [],
    guides: { ...GUIDES, __base: GEAR_BASE },
    playbook: playbook.lists,
  });
}

export async function POST(request) {
  if (!(await isAdminRequest())) return deny();
  const body = await request.json().catch(() => ({}));
  const db = supabaseAdmin();

  try {
    if (body.action === "create") {
      const row = clean(body);
      if (!row.title) return bad("Give the shoot a title");
      if (!row.checklist?.length) {
        const { lists } = await loadPlaybook(db);
        row.checklist = checklistFromPlaybook(lists, row.kind || "other");
        if (!row.checklist.length) row.checklist = seedChecklist(row.kind || "other");
      }
      if (row.address) Object.assign(row, await locate(row.address));
      const { data, error } = await db.from("shoots").insert(row).select("*").single();
      if (error) return bad(error.message, 500);
      return NextResponse.json({ shoot: data });
    }

    if (body.action === "update") {
      const { id } = body;
      if (!id) return bad("Bad request");
      const row = clean(body);
      row.updated_at = new Date().toISOString();
      const clockFields = ["status", "date", "kind", "start_time", "time_note"].some((k) => row[k] !== undefined) || body.final_due !== undefined;
      let cur = null;
      if (row.address !== undefined || clockFields) {
        const res = await db.from("shoots").select("*").eq("id", id).maybeSingle();
        cur = res.data || null;
      }
      if (row.address !== undefined) {
        if (!cur || cur.address !== row.address) Object.assign(row, row.address ? await locate(row.address) : { place_label: "", lat: null, lng: null, miles: null, drive_min: null });
      }
      // Delivery clock — only when the columns exist.
      if (clockFields && hasDelivery(cur)) {
        const next = { ...cur, ...row };
        if (body.final_due !== undefined) {
          // Brandon moved the due date by hand ("" puts it back on the promise).
          row.final_due = dueFromDate(body.final_due) || (next.status === "done" || cur.final_due ? computeDues(next).final_due : null);
        }
        const becameDone = row.status === "done" && cur.status !== "done";
        const basisChanged = ["date", "kind", "start_time", "time_note"].some((k) => row[k] !== undefined && row[k] !== cur[k]);
        if (becameDone || (basisChanged && (cur.sneak_due || cur.final_due || next.status === "done"))) {
          const fresh = computeDues(next);
          // Only replace a due date that was never set, or is still the one
          // worked out automatically — a date he moved by hand stays put.
          const auto = cur.date ? computeDues(cur) : null;
          if (!cur.sneak_due || !auto || sameTime(cur.sneak_due, auto.sneak_due)) row.sneak_due = fresh.sneak_due;
          if (row.final_due === undefined && (!cur.final_due || !auto || sameTime(cur.final_due, auto.final_due))) row.final_due = fresh.final_due;
        }
      } else if (body.final_due !== undefined && cur && !hasDelivery(cur)) {
        return NextResponse.json({ error: NEEDS_SQL, needsMigration: true }, { status: 409 });
      }
      let { data, error } = await db.from("shoots").update(row).eq("id", id).select("*").single();
      if (error && missingColumn(error) && DELIVERY_COLS.some((k) => k in row)) {
        // Columns vanished between the read and the write — save the rest.
        for (const k of DELIVERY_COLS) delete row[k];
        ({ data, error } = await db.from("shoots").update(row).eq("id", id).select("*").single());
      }
      if (error) return bad(error.message, 500);
      return NextResponse.json({ shoot: data });
    }

    // One tap: "Sneak peek sent" / "Delivered" (and undo).
    if (body.action === "deliver") {
      const { id } = body;
      if (!isId(id)) return bad("Bad request");
      const which = body.which === "sneak" ? "sneak" : body.which === "final" ? "final" : "";
      if (!which) return bad("Bad request");
      const { data: cur } = await db.from("shoots").select("*").eq("id", id).maybeSingle();
      if (!cur) return bad("That shoot isn't here any more", 404);
      if (!hasDelivery(cur)) return NextResponse.json({ error: NEEDS_SQL, needsMigration: true }, { status: 409 });
      const now = new Date().toISOString();
      const row = { [`${which}_delivered_at`]: body.undo ? null : now, updated_at: now };
      // Keep the due dates on file the first time the clock is touched.
      if (!cur.sneak_due || !cur.final_due) {
        const dues = computeDues(cur);
        if (!cur.sneak_due && dues.sneak_due) row.sneak_due = dues.sneak_due;
        if (!cur.final_due) row.final_due = dues.final_due;
      }
      const { data, error } = await db.from("shoots").update(row).eq("id", id).select("*").single();
      if (error) return missingColumn(error) ? NextResponse.json({ error: NEEDS_SQL, needsMigration: true }, { status: 409 }) : bad(error.message, 500);
      return NextResponse.json({ shoot: data });
    }

    // Clear a backlog of old shoots that went out long ago: stamps "delivered"
    // on exactly the ids sent, and only where it isn't stamped already.
    if (body.action === "deliver_bulk") {
      const ids = (Array.isArray(body.ids) ? body.ids : []).filter(isId).slice(0, 300);
      if (!ids.length) return bad("Bad request");
      const now = new Date().toISOString();
      const { data, error } = await db.from("shoots").update({ final_delivered_at: now, updated_at: now }).in("id", ids).is("final_delivered_at", null).select("*");
      if (error) return missingColumn(error) ? NextResponse.json({ error: NEEDS_SQL, needsMigration: true }, { status: 409 }) : bad(error.message, 500);
      return NextResponse.json({ shoots: data || [] });
    }

    if (body.action === "relocate") {
      const { id } = body;
      const { data: cur } = await db.from("shoots").select("address").eq("id", id).maybeSingle();
      if (!cur?.address) return bad("No address on this shoot");
      const loc = await locate(cur.address);
      if (!loc.lat) return bad("Couldn't find that address — try adding the town and state");
      const { data, error } = await db.from("shoots").update({ ...loc, updated_at: new Date().toISOString() }).eq("id", id).select("*").single();
      if (error) return bad(error.message, 500);
      return NextResponse.json({ shoot: data });
    }

    if (body.action === "delete") {
      const { error } = await db.from("shoots").delete().eq("id", body.id);
      if (error) return bad(error.message, 500);
      return NextResponse.json({ ok: true });
    }
  } catch (err) {
    return bad(err.message);
  }
  return bad("Unknown action", 400);
}
