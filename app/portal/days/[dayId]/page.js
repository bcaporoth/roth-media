import "../../../theme/misc.css";
import { redirect, notFound } from "next/navigation";
import PortalNav from "../../../../components/PortalNav";
import { PortalFrame } from "../../../../components/PortalViews";
import ShootDay from "../../../../components/ShootDay";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { whoAmI, canOpen, loadDay } from "../../../../lib/scripts-server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Shoot day", robots: { index: false } };

// The owner's side of a shoot day: the same running order and scripts
// Brandon sees in Studio, editable. Brandon landing here is sent to Studio.
export default async function PortalShootDayPage({ params }) {
  const { dayId } = await params;
  const me = await whoAmI();
  if (!me) redirect("/portal");
  let day = null;
  try { day = await loadDay(supabaseAdmin(), dayId); } catch { day = null; }
  if (!day || !canOpen(me, day)) notFound();
  if (me.role === "brandon") redirect(`/portal/admin/clients/${day.client_id}/days/${day.id}`);
  const nav = <PortalNav email={me.email} active="days" brand />;
  return (
    <PortalFrame nav={nav} className="pt-day mx-page">
      <section className="cx-section cx-section--tight">
        <div className="cx-wrap">
          <ShootDay initial={day} role="client" backHref="/portal" backLabel="Your portal" printHref={`/portal/days/${dayId}/print`} />
        </div>
      </section>
    </PortalFrame>
  );
}
