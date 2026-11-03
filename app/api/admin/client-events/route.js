import { NextResponse } from "next/server";
import { isAdminRequest } from "../../../../lib/admin-guard";
import { supabaseAdmin } from "../../../../lib/supabase-admin";

export const dynamic = "force-dynamic";

// Every client's calendar in one feed — the Studio month view lays these
// next to the shoots, so content gets planned before the date, not after.
export async function GET() {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  const since = new Date(); since.setDate(since.getDate() - 45);
  const { data, error } = await supabaseAdmin()
    .from("client_events")
    .select("id, client_id, date, time, title, note, idea, source, created_by, followup_at, clients!client_id(id, name, email)")
    .gte("date", since.toISOString().slice(0, 10))
    .order("date").order("time");
  if (error) return NextResponse.json({ error: /relation .*client_events/i.test(error.message) ? "Run supabase/client-events.sql once in Supabase first." : error.message }, { status: 500 });
  const events = (data || []).map((e) => ({ ...e, clientName: e.clients?.name || e.clients?.email || "Client", clients: undefined }));
  return NextResponse.json({ events });
}
