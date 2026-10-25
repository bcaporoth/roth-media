import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import DayPrintSheet from "../../../../../components/DayPrintSheet";
import { supabaseAdmin } from "../../../../../lib/supabase-admin";
import { whoAmI, canOpen, loadDay } from "../../../../../lib/scripts-server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Shoot day — print", robots: { index: false } };

export default async function PortalDayPrintPage({ params }) {
  const { dayId } = await params;
  const me = await whoAmI();
  if (!me) redirect("/portal");
  const day = await loadDay(supabaseAdmin(), dayId).catch(() => null);
  if (!day || !canOpen(me, day)) notFound();
  return (
    <div className="sprint-page">
      <nav className="sprint-bar no-print">
        <Link href={`/portal/days/${dayId}`}>← Back to the day</Link>
        <span className="sprint-bar-hint">⌘P / Ctrl+P → Save as PDF</span>
      </nav>
      <DayPrintSheet day={day} tips />
    </div>
  );
}
