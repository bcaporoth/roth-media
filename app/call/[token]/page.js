import { notFound } from "next/navigation";
import { adminConfigured, supabaseAdmin } from "../../../lib/supabase-admin";
import { loadCallSheet } from "../../../lib/callsheet-server";
import CallSheet from "../../../components/CallSheet";

// /call/<crew token> — the call sheet, on everyone's phone, no login. Same
// token as the crew ticklist (/crew/<token>); the crew page links here.
export const dynamic = "force-dynamic";
export const metadata = { title: "Call sheet — Roth Media", robots: { index: false } };

export default async function CallPage({ params, searchParams }) {
  const { token } = await params;
  const sp = await searchParams;
  if (!adminConfigured || !/^[0-9a-f-]{36}$/.test(token)) notFound();
  const db = supabaseAdmin();
  const { data: s, error } = await db.from("shoots").select("*").eq("crew_token", token).maybeSingle();
  if (error || !s || s.status === "cancelled") notFound();
  const sheet = await loadCallSheet(db, s);
  return <main className="crew-page call-page"><CallSheet sheet={sheet} token={token} print={sp?.print === "1"} /></main>;
}
