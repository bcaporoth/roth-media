import { NextResponse } from "next/server";
import { isAdminRequest } from "../../../../lib/admin-guard";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { requestedDate, leadCategory } from "../../../../lib/lead-intel";
import { seedChecklist, checklistFromPlaybook } from "../../../../lib/shoot-guides";
import { loadPlaybook } from "../../../../lib/playbook";
import { cleanEmail, EMAIL_RE } from "../../../../lib/album-access";

export const dynamic = "force-dynamic";
const bad = (error, status = 422) => NextResponse.json({ error }, { status });

// "Book it": one tap on an Inbox lead → the client record (made if new), a
// calendar shoot (dated from what they asked for, when it parsed), a shoot
// day for business work, and the lead marked Booked. Idempotent-ish: an
// existing client is reused; a shoot already linked to this lead is reused.
export async function POST(request) {
  if (!(await isAdminRequest())) return bad("Not authorized", 403);
  const body = await request.json().catch(() => ({}));
  if (!/^[0-9a-f-]{36}$/.test(String(body.id || ""))) return bad("Bad request");
  const db = supabaseAdmin();
  const { data: sub } = await db.from("submissions").select("*").eq("id", body.id).maybeSingle();
  if (!sub) return bad("Lead not found", 404);

  const email = cleanEmail(sub.email);
  const name = String(sub.name || "").trim().slice(0, 80) || (EMAIL_RE.test(email) ? email.split("@")[0].replace(/[._]/g, " ") : "Client");
  const category = leadCategory(sub) || "other";
  const kind = ["wedding", "engagement", "family", "business", "event"].includes(category) ? category : "other";
  const asked = requestedDate(sub);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(body.date || "")) ? body.date : asked.date || null;

  // 1. Client
  let client = null;
  if (EMAIL_RE.test(email)) {
    ({ data: client } = await db.from("clients").select("id, name, email").eq("email", email).maybeSingle());
    if (!client) ({ data: client } = await db.from("clients").insert({ email, name, ...(sub.phone ? { phone: String(sub.phone).slice(0, 40) } : {}) }).select("id, name, email").single());
  } else {
    // No usable email: a placeholder address the rest of Studio already understands.
    const fake = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "client"}-${Math.random().toString(36).slice(2, 6)}@no-email.rothmediaco.invalid`;
    ({ data: client } = await db.from("clients").insert({ email: fake, name, ...(sub.phone ? { phone: String(sub.phone).slice(0, 40) } : {}) }).select("id, name, email").single());
  }
  if (!client) return bad("Couldn't make the client record", 500);

  // 2. Shoot (reuse one already linked to this lead)
  let { data: shoot } = await db.from("shoots").select("id").eq("submission_id", sub.id).maybeSingle();
  if (!shoot) {
    let checklist = [];
    try { const { lists } = await loadPlaybook(db); checklist = checklistFromPlaybook(lists, kind); } catch {}
    if (!checklist.length) checklist = seedChecklist(kind);
    const title = `${name} — ${kind === "other" ? "shoot" : kind.charAt(0).toUpperCase() + kind.slice(1)}`;
    const { data, error } = await db.from("shoots").insert({
      title, kind, status: "planned", client_name: name, client_email: client.email, client_phone: String(sub.phone || "").slice(0, 120),
      date, time_note: !date && asked.raw ? `asked for: ${asked.raw}`.slice(0, 120) : "", checklist, submission_id: sub.id,
      notes: asked.raw && !date ? `They asked for: ${asked.raw}` : "",
    }).select("id").single();
    if (error) return bad(error.message, 500);
    shoot = data;
  }

  // 3. Shoot day for business work (scripts live there)
  let day = null;
  if (kind === "business") {
    ({ data: day } = await db.from("shoot_days").select("id").eq("client_id", client.id).eq("shoot_id", shoot.id).maybeSingle());
    if (!day) {
      const { data, error } = await db.from("shoot_days").insert({ client_id: client.id, shoot_id: shoot.id, title: "Content day", date, start_time: "09:00" }).select("id").single();
      if (!error) day = data; // table may not exist yet — the rest still books
    }
  }

  // 4. Booked
  const stamp = new Date().toISOString();
  await db.from("submissions").update({ status: "booked", updated_at: stamp, read_at: sub.read_at || stamp, ...(sub.first_contacted_at ? {} : { first_contacted_at: stamp }) }).eq("id", sub.id)
    .then((r) => (r.error && /first_contacted_at/.test(r.error.message) ? db.from("submissions").update({ status: "booked", updated_at: stamp }).eq("id", sub.id) : r));

  return NextResponse.json({ ok: true, clientId: client.id, shootId: shoot.id, dayId: day?.id || null, date, kind, name });
}
