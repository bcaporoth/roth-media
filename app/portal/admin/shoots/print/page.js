import Link from "next/link";
import ShootPrepSheet from "../../../../../components/ShootPrepSheet";
import { requireAdminPage } from "../../../../../lib/admin-guard";
import { supabaseAdmin } from "../../../../../lib/supabase-admin";
import { GUIDES } from "../../../../../lib/shoot-guides";

export const dynamic = "force-dynamic";
export const metadata = { title: "Prep sheet — Studio", robots: { index: false } };

// /portal/admin/shoots/print?id=<shoot>  → that shoot's sheet (its own gear + shots + notes)
// /portal/admin/shoots/print?kind=wedding → the blank guide for a type
// ⌘P / Ctrl+P → Save as PDF. One letter page.
export default async function ShootPrintPage({ searchParams }) {
  await requireAdminPage();
  const q = await searchParams;
  const id = /^[0-9a-f-]{36}$/.test(String(q?.id || "")) ? q.id : "";
  const kind = GUIDES[q?.kind] ? q.kind : "wedding";
  let shoot = null;
  if (id) {
    const { data } = await supabaseAdmin().from("shoots").select("*").eq("id", id).maybeSingle();
    shoot = data || null;
  }
  return (
    <div className="sprint-page">
      <style>{`@media print { @page { size: letter; margin: 0.55in; } }`}</style>
      <nav className="sprint-bar no-print">
        <Link href="/portal/admin/shoots">← Shoots</Link>
        <span>Blank guides:</span>
        {Object.entries(GUIDES).filter(([k]) => k !== "other").map(([k, g]) => <Link key={k} href={`/portal/admin/shoots/print?kind=${k}`} className={!shoot && kind === k ? "is-on" : ""}>{g.label}</Link>)}
        <span className="sprint-bar-hint">⌘P / Ctrl+P → Save as PDF</span>
      </nav>
      {id && !shoot && <p className="sprint-missing no-print">That shoot isn’t here any more — showing the blank {GUIDES[kind].label} guide.</p>}
      <ShootPrepSheet shoot={shoot} kind={kind} />
    </div>
  );
}
