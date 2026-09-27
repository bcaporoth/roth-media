import { redirect } from "next/navigation";
import { createSupabaseServer, portalConfigured } from "./supabase";
import { adminConfigured, ADMIN_EMAIL } from "./supabase-admin";

// Page guard: returns the signed-in owner or bounces to /portal.
export async function requireAdminPage() {
  if (!portalConfigured || !adminConfigured) redirect("/portal");
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.email?.toLowerCase() !== ADMIN_EMAIL) redirect("/portal");
  return user;
}

// API guard: true when the request comes from the signed-in owner.
export async function isAdminRequest() {
  if (!portalConfigured || !adminConfigured) return false;
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return Boolean(user && user.email?.toLowerCase() === ADMIN_EMAIL);
}
