import { notFound } from "next/navigation";
import PortalNav from "../../../../../../../components/PortalNav";
import StudioShell from "../../../../../../../components/StudioShell";
import StudioFooter from "../../../../../../../components/StudioFooter";
import ShootDay from "../../../../../../../components/ShootDay";
import { requireAdminPage } from "../../../../../../../lib/admin-guard";
import { supabaseAdmin } from "../../../../../../../lib/supabase-admin";
import { newLeadCount } from "../../../../../../../lib/studio-data";
import { loadDay, aiConfigured } from "../../../../../../../lib/scripts-server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Shoot day — Studio", robots: { index: false } };

// Studio → Clients → profile → one shoot day. The owner opens the same day
// from their portal (/portal/days/<id>); both edit the same scripts.
export default async function AdminShootDayPage({ params }) {
  const user = await requireAdminPage();
  const { id, dayId } = await params;
  let day = null;
  let err = "";
  try { day = await loadDay(supabaseAdmin(), dayId); } catch (e) { err = e.message; }
  if (!day && !err) notFound();
  const newCount = await newLeadCount();
  return (
    <>
      <PortalNav email={user.email} isAdmin active="admin" />
      <StudioShell active="clients" newCount={newCount} kick={`Studio · Clients · ${day?.client?.name || ""}`} title="Shoot day" wide>
        {err
          ? <p className="sm-sqlhint">{/shoot_days|scripts/.test(err) ? <>Shoot days aren&apos;t set up yet — run <code>supabase/shoot-days.sql</code> once in the Supabase SQL editor.</> : err}</p>
          : <ShootDay initial={day} role="brandon" aiReady={aiConfigured} backHref={`/portal/admin/clients/${id}`} backLabel={day.client?.name || "Client"} />}
      </StudioShell>
      <StudioFooter />
    </>
  );
}
