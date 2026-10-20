import { supabaseAdmin } from "./supabase-admin";

// Unread leads for the Inbox tab badge. Missing table (studio.sql not run
// yet) reads as zero rather than breaking the page.
export async function newLeadCount() {
  const db = supabaseAdmin();
  const [{ count, error }, notes] = await Promise.all([
    db.from("submissions")
      .select("id", { count: "exact", head: true })
      .eq("status", "new")
      .not("kind", "in", "(partner_lead,partner_month,call,intake_sent)")
      .is("read_at", null),
    // Client notes Brandon hasn't opened count too (0 until client-notes.sql has run).
    db.from("client_notes").select("id", { count: "exact", head: true }).eq("who", "client").is("seen_at", null).then((r) => (r.error ? 0 : r.count || 0), () => 0),
  ]);
  return (error ? 0 : count || 0) + notes;
}
