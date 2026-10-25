import { notFound } from "next/navigation";
import { adminConfigured, supabaseAdmin } from "../../../lib/supabase-admin";
import { signItemPhotos } from "../../../lib/r2";
import CrewDay from "../../../components/CrewDay";

// /crew/<token> — the second shooter's phone. No login: the QR code on the
// shoot (Studio → Shoots → ··· → Crew link) is the key. Same list Brandon
// ticks, live for both.
export const dynamic = "force-dynamic";
export const metadata = { title: "Shoot day — Roth Media", robots: { index: false } };

export default async function CrewPage({ params }) {
  const { token } = await params;
  if (!adminConfigured || !/^[0-9a-f-]{36}$/.test(token)) notFound();
  const db = supabaseAdmin();
  const { data: s, error } = await db.from("shoots").select("*").eq("crew_token", token).maybeSingle();
  if (error || !s || s.status === "cancelled") notFound();
  const checklist = await signItemPhotos(Array.isArray(s.checklist) ? s.checklist : []);
  const shoot = { id: s.id, title: s.title, kind: s.kind, date: s.date, start_time: s.start_time, time_note: s.time_note, address: s.address, lat: s.lat, lng: s.lng, client_name: s.client_name, notes: s.notes, status: s.status };
  return (
    <main className="crew-page">
      <CrewDay token={token} initial={{ shoot, checklist }} />
    </main>
  );
}
