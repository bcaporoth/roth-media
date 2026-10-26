import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase-admin";
import { signItemPhotos } from "../../../lib/r2";
import { GROUPS, groupOf } from "../../../lib/shoot-guides";

// The crew page's API: anyone with the shoot's crew token (the QR code) can
// read the day and tick items. No login — the token is the key, like a
// gallery share link. Ticks are read-modify-write on the one item so two
// phones ticking different things don't clobber each other.
export const dynamic = "force-dynamic";
const bad = (msg, status = 422) => NextResponse.json({ error: msg }, { status });
const isTok = (v) => /^[0-9a-f-]{36}$/.test(String(v || ""));

const pick = (s) => ({ id: s.id, title: s.title, kind: s.kind, date: s.date, start_time: s.start_time, time_note: s.time_note, address: s.address, lat: s.lat, lng: s.lng, client_name: s.client_name, notes: s.notes, status: s.status, updated_at: s.updated_at });

async function load(db, token) {
  const { data, error } = await db.from("shoots").select("*").eq("crew_token", token).maybeSingle();
  if (error) throw new Error(/crew_token/.test(error.message) ? "Run supabase/crew.sql first" : error.message);
  return data;
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  if (!isTok(body.token)) return bad("Bad link", 404);
  const db = supabaseAdmin();
  try {
    const s = await load(db, body.token);
    if (!s || s.status === "cancelled") return bad("That day isn't shared", 404);
    let checklist = Array.isArray(s.checklist) ? s.checklist : [];
    if (body.action === "tick") {
      const group = GROUPS.includes(body.group) ? body.group : "shots";
      const text = String(body.text || "").slice(0, 600);
      const i = checklist.findIndex((c) => groupOf(c) === group && c.text === text);
      if (i < 0) return bad("That item's gone — reload");
      checklist = checklist.map((c, j) => (j === i ? { ...c, done: Boolean(body.done) } : c));
      const { error } = await db.from("shoots").update({ checklist, updated_at: new Date().toISOString() }).eq("id", s.id);
      if (error) throw new Error(error.message);
    } else if (body.action === "confirm") {
      // A crew member taps "Got it" on the call sheet.
      const cs = s.callsheet || {};
      const name = String(body.name || "").slice(0, 80);
      const crew = (cs.crew || []).map((x) => (x.staff_id === body.staffId ? { ...x, confirmed_at: new Date().toISOString() } : x));
      const extra = body.staffId && !crew.some((x) => x.staff_id === body.staffId) ? [{ staff_id: body.staffId, confirmed_at: new Date().toISOString(), on: true }] : [];
      const acks = [...(cs.acks || []).filter((a) => a.name !== name), ...(name ? [{ name, at: new Date().toISOString() }] : [])].slice(-40);
      const { error } = await db.from("shoots").update({ callsheet: { ...cs, crew: [...crew, ...extra], acks } }).eq("id", s.id);
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true });
    } else if (body.action !== "load") return bad("Unknown action", 400);
    return NextResponse.json({ shoot: pick(s), checklist: await signItemPhotos(checklist) });
  } catch (e) {
    return bad(e.message, 500);
  }
}
