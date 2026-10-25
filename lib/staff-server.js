import { createSupabaseServer, portalConfigured } from "./supabase";
import { adminConfigured, supabaseAdmin, ADMIN_EMAIL } from "./supabase-admin";

// Who's asking, across the three kinds of login: Brandon (everything), a
// staff member (the projects they're on), a client (their own portal).
// Staff and clients can't both be true — staff wins, and a staff email
// that's also a client is a setup mistake worth a glance.
const missing = (e) => /staff|project_members/i.test(e?.message || "") && /does not exist|schema cache/i.test(e.message);

export async function whoIs() {
  if (!portalConfigured || !adminConfigured) return null;
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return null;
  const email = user.email.toLowerCase();
  if (email === ADMIN_EMAIL) return { role: "brandon", email, user };
  const db = supabaseAdmin();
  const { data: staff, error } = await db.from("staff").select("id, name, title, active").eq("email", email).maybeSingle();
  if (!error && staff?.active) {
    const { data: m } = await db.from("project_members").select("project_id, role").eq("staff_id", staff.id);
    return { role: "staff", email, user, staff, projectIds: (m || []).map((x) => x.project_id), memberRoles: Object.fromEntries((m || []).map((x) => [x.project_id, x.role])) };
  }
  if (error && !missing(error)) throw new Error(error.message);
  const { data: client } = await db.from("clients").select("id, name").eq("email", email).maybeSingle();
  return client ? { role: "client", email, user, clientId: client.id, client } : { role: "none", email, user };
}

// May this person work on this project? Brandon always; staff when assigned.
export const canProject = (me, projectId) => Boolean(me && (me.role === "brandon" || (me.role === "staff" && me.projectIds?.includes(projectId))));

// The project a row belongs to, for permission checks on person / entry / release ids.
export async function projectOf(db, table, id) {
  const { data } = await db.from(table).select("project_id").eq("id", id).maybeSingle();
  return data?.project_id || null;
}

export async function listStaff(db) {
  const { data, error } = await db.from("staff").select("*").order("active", { ascending: false }).order("name", { ascending: true });
  if (error) { if (missing(error)) return null; throw new Error(error.message); }
  const { data: m } = await db.from("project_members").select("staff_id, project_id");
  return (data || []).map((s) => ({ ...s, projects: (m || []).filter((x) => x.staff_id === s.id).length }));
}

// The team on one project (for the project page), or null before staff.sql.
export async function projectTeam(db, projectId) {
  const { data, error } = await db.from("project_members").select("role, added_at, staff:staff_id(id, name, email, title, phone, active)").eq("project_id", projectId);
  if (error) { if (missing(error)) return null; throw new Error(error.message); }
  return (data || []).map((x) => ({ ...x.staff, member_role: x.role, added_at: x.added_at })).filter((x) => x.id);
}
