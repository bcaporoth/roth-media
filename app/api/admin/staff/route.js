import { NextResponse } from "next/server";
import { isAdminRequest } from "../../../../lib/admin-guard";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { findAuthUser, accountView } from "../../../../lib/auth-users";

// Studio → Staff: the people who work with Brandon. Add them, give them a
// password (same login page as clients — /portal — but they land on
// /portal/crew and see only the projects they're on), put them on projects.
export const dynamic = "force-dynamic";
const deny = () => NextResponse.json({ error: "Not authorized" }, { status: 403 });
const bad = (msg, status = 422) => NextResponse.json({ error: msg }, { status });
const clip = (v, n) => String(v ?? "").trim().slice(0, n);
const isId = (v) => /^[0-9a-f-]{36}$/.test(String(v || ""));
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const missing = (e) => bad(/staff|project_members/i.test(e.message) && /does not exist|schema cache/i.test(e.message) ? "Run supabase/staff.sql once in the Supabase SQL editor first" : e.message, 500);
function tempPassword() {
  const a = "abcdefghjkmnpqrstuvwxyz23456789";
  const r = (n) => Array.from(crypto.getRandomValues(new Uint32Array(n)), (x) => a[x % a.length]).join("");
  return `crew-${r(4)}-${r(4)}`;
}

export async function POST(request) {
  if (!(await isAdminRequest())) return deny();
  const body = await request.json().catch(() => ({}));
  const db = supabaseAdmin();
  try {
    if (body.action === "add") {
      const email = clip(body.email, 160).toLowerCase();
      if (!EMAIL_RE.test(email)) return bad("Their email is the login — add a real one");
      const name = clip(body.name, 120);
      if (!name) return bad("Give them a name");
      const { data, error } = await db.from("staff").insert({ email, name, title: clip(body.title, 80), phone: clip(body.phone, 40) }).select("*").single();
      if (error) return /duplicate|unique/i.test(error.message) ? bad("Someone with that email is already on staff") : missing(error);
      return NextResponse.json({ staff: { ...data, projects: 0 } });
    }
    if (body.action === "update") {
      if (!isId(body.id)) return bad("Bad request");
      const patch = {};
      for (const k of ["name", "title", "phone", "notes"]) if (body[k] !== undefined) patch[k] = clip(body[k], k === "notes" ? 2000 : 120);
      if (body.active !== undefined) patch.active = Boolean(body.active);
      const { data, error } = await db.from("staff").update(patch).eq("id", body.id).select("*").single();
      if (error) return missing(error);
      return NextResponse.json({ staff: data });
    }
    if (body.action === "remove") {
      if (!isId(body.id)) return bad("Bad request");
      const { error } = await db.from("staff").delete().eq("id", body.id);
      if (error) return missing(error);
      return NextResponse.json({ ok: true });
    }
    // Same as a client's login: email + password, confirmed, works on day one.
    if (body.action === "set-password") {
      if (!isId(body.id)) return bad("Bad request");
      const { data: s } = await db.from("staff").select("email, name").eq("id", body.id).maybeSingle();
      if (!s) return bad("Not on staff", 404);
      const password = String(body.password || "").trim() || tempPassword();
      if (password.length < 8) return bad("Password needs 8+ characters");
      if (password.length > 72) return bad("Keep it under 72 characters");
      const existing = await findAuthUser(db, s.email);
      const user_metadata = { ...(existing?.user_metadata || {}), password_set: true, staff: true };
      const { data, error } = existing
        ? await db.auth.admin.updateUserById(existing.id, { password, email_confirm: true, user_metadata })
        : await db.auth.admin.createUser({ email: s.email, password, email_confirm: true, user_metadata });
      if (error) return bad(error.message, 500);
      return NextResponse.json({ ok: true, password, account: accountView(data?.user || existing) });
    }
    if (body.action === "assign") {
      if (!isId(body.projectId) || !isId(body.staffId)) return bad("Bad request");
      const role = body.role === "lead" ? "lead" : "crew";
      const { error } = await db.from("project_members").upsert({ project_id: body.projectId, staff_id: body.staffId, role }, { onConflict: "project_id,staff_id" });
      if (error) return missing(error);
      return NextResponse.json({ ok: true });
    }
    if (body.action === "unassign") {
      if (!isId(body.projectId) || !isId(body.staffId)) return bad("Bad request");
      const { error } = await db.from("project_members").delete().eq("project_id", body.projectId).eq("staff_id", body.staffId);
      if (error) return missing(error);
      return NextResponse.json({ ok: true });
    }
  } catch (e) {
    return bad(e.message);
  }
  return bad("Unknown action", 400);
}
