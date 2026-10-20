import { notFound } from "next/navigation";
import Link from "next/link";
import DayPrintSheet from "../../../../../../../../components/DayPrintSheet";
import { requireAdminPage } from "../../../../../../../../lib/admin-guard";
import { supabaseAdmin } from "../../../../../../../../lib/supabase-admin";
import { loadDay } from "../../../../../../../../lib/scripts-server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Shoot day — print", robots: { index: false } };

export default async function AdminDayPrintPage({ params }) {
  await requireAdminPage();
  const { id, dayId } = await params;
  const day = await loadDay(supabaseAdmin(), dayId).catch(() => null);
  if (!day) notFound();
  return (
    <div className="sprint-page">
      <nav className="sprint-bar no-print">
        <Link href={`/portal/admin/clients/${id}/days/${dayId}`}>← Back to the day</Link>
        <span className="sprint-bar-hint">⌘P / Ctrl+P → Save as PDF</span>
      </nav>
      <DayPrintSheet day={day} />
    </div>
  );
}
