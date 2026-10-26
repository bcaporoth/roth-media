import { NextResponse } from "next/server";
import { whoIs } from "../../../../lib/staff-server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { DISCOVERY_FIELDS } from "../../../../lib/production";

// The client's side of the client machinery: tick a task, sign an approval,
// accept a change order, leave timecoded notes on a cut, answer discovery.
// Every action checks the project belongs to this client. Typed-name
// signatures keep name + email + IP + time; nothing here touches money
// beyond acknowledging a change order's price.
export const dynamic = "force-dynamic";
const bad = (msg, status = 422) => NextResponse.json({ error: msg }, { status });
const clip = (v, n) => String(v ?? "").trim().slice(0, n);
const isId = (v) => /^[0-9a-f-]{36}$/.test(String(v || ""));

export async function POST(request) {
  const me = await whoIs();
  if (!me || me.role !== "client") return bad("Not authorized", 403);
  const body = await request.json().catch(() => ({}));
  if (!isId(body.projectId)) return bad("Bad request");
  const db = supabaseAdmin();
  const { data: project } = await db.from("projects").select("id, discovery, discovery_locked_at").eq("id", body.projectId).eq("client_id", me.clientId).maybeSingle();
  if (!project) return bad("Not authorized", 403);
  const now = new Date().toISOString();
  const ip = clip(request.headers.get("x-forwarded-for") || "", 80);
  const who = clip(body.name || me.client?.name || me.email, 80);
  // Every row action must point at a row inside this project.
  const own = async (table, id) => { if (!isId(id)) return null; const { data } = await db.from(table).select("*").eq("id", id).eq("project_id", project.id).maybeSingle(); return data; };
  try {
    if (body.action === "task-done") {
      const t = await own("client_tasks", body.id); if (!t) return bad("No such task", 404);
      const { data } = await db.from("client_tasks").update({ done_at: body.done === false ? null : now, note: t.note ? t.note : `Marked done by ${who} from the portal` }).eq("id", t.id).select("*").single();
      return NextResponse.json({ task: data });
    }
    if (body.action === "approve") {
      const a = await own("approvals", body.id); if (!a) return bad("No such approval", 404);
      if (a.status !== "pending") return bad("Already answered");
      if (!clip(body.name, 80)) return bad("Type your full name to sign");
      const changes = body.decision === "changes";
      const { data } = await db.from("approvals").update({ status: changes ? "changes" : "approved", signed_name: clip(body.name, 80), signed_email: me.email, signed_at: now, ip, note: clip(body.note, 1500) }).eq("id", a.id).select("*").single();
      await db.from("comms").insert({ project_id: project.id, date: now.slice(0, 10), channel: "portal", who, summary: `${changes ? "Changes requested on" : "Approved"}: ${a.label}${body.note ? ` — ${clip(body.note, 300)}` : ""}`, client_visible: true }).then(() => {}, () => {});
      return NextResponse.json({ approval: data });
    }
    if (body.action === "co-answer") {
      const co = await own("change_orders", body.id); if (!co) return bad("No such change order", 404);
      if (co.status !== "sent") return bad("This one isn't open");
      if (co.expires && co.expires < now.slice(0, 10)) { await db.from("change_orders").update({ status: "expired" }).eq("id", co.id); return bad("This change order has expired — ask Brandon to reissue it"); }
      const accept = body.decision === "accept";
      if (accept && !clip(body.name, 80)) return bad("Type your full name to accept");
      const { data } = await db.from("change_orders").update({ status: accept ? "accepted" : "declined", accepted_name: accept ? clip(body.name, 80) : "", accepted_at: accept ? now : null, ip: accept ? ip : "" }).eq("id", co.id).select("*").single();
      if (accept && co.amount_cents) await db.from("project_payments").insert({ project_id: project.id, label: `CO-${String(co.number).padStart(3, "0")} ${co.title}`, amount_cents: co.amount_cents, status: "scheduled", gates: "Added by the accepted change order", sort: 900 + co.number }).then(() => {}, () => {});
      await db.from("comms").insert({ project_id: project.id, date: now.slice(0, 10), channel: "portal", who, summary: `Change order CO-${String(co.number).padStart(3, "0")} ${accept ? "accepted" : "declined"}: ${co.title}`, client_visible: true }).then(() => {}, () => {});
      return NextResponse.json({ co: data });
    }
    if (body.action === "review-note") {
      const r = await own("review_versions", body.reviewId); if (!r || !r.client_visible) return bad("No such cut", 404);
      if (r.status !== "open") return bad("Notes are closed on this cut");
      const text = clip(body.text, 1500); if (!text) return bad("Say something");
      const at_s = body.at_s === "" || body.at_s == null ? null : Math.max(0, Number(body.at_s) || 0);
      const { data, error } = await db.from("review_notes").insert({ project_id: project.id, review_id: r.id, at_s, text, who, side: "client" }).select("*").single();
      if (error) return bad(error.message, 500);
      return NextResponse.json({ note: data });
    }
    if (body.action === "discovery-save") {
      if (project.discovery_locked_at) return bad("The brief is locked — ask Brandon to reopen it");
      const answers = Object.fromEntries(DISCOVERY_FIELDS.map(([k]) => [k, clip(body.answers?.[k], 2000)]));
      const { data, error } = await db.from("projects").update({ discovery: answers }).eq("id", project.id).select("discovery").single();
      if (error) return bad(error.message, 500);
      return NextResponse.json({ discovery: data.discovery });
    }
    return bad("Unknown action");
  } catch (e) { return bad(e.message, 500); }
}
