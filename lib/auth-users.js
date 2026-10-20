// A client's login (Supabase auth user), looked up by email. The admin API
// pages; rosters this size fit in a page or two.
export async function findAuthUser(db, email) {
  const want = String(email || "").trim().toLowerCase();
  if (!want) return null;
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    const hit = (data?.users || []).find((u) => (u.email || "").toLowerCase() === want);
    if (hit) return hit;
    if ((data?.users || []).length < 200) break;
  }
  return null;
}

// What Studio shows about a login: null (none yet) or when it was made / last used.
export const accountView = (u) => (u ? { lastSignIn: u.last_sign_in_at || null, created: u.created_at } : null);
