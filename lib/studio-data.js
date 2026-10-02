import { supabaseAdmin } from "./supabase-admin";

// Unread leads for the Inbox tab badge. Missing table (studio.sql not run
// yet) reads as zero rather than breaking the page.
export async function newLeadCount() {
  const { count, error } = await supabaseAdmin()
    .from("submissions")
    .select("id", { count: "exact", head: true })
    .eq("status", "new")
    .not("kind", "in", "(partner_lead,partner_month)")
    .is("read_at", null);
  return error ? 0 : count || 0;
}
