import "../../theme/misc.css";
import { redirect } from "next/navigation";
import PortalNav from "../../../components/PortalNav";
import { PortalFrame } from "../../../components/PortalViews";
import ClientCalendar from "../../../components/ClientCalendar";
import { createSupabaseServer, portalConfigured } from "../../../lib/supabase";
import { adminConfigured, supabaseAdmin, ADMIN_EMAIL } from "../../../lib/supabase-admin";
import { emailHasBrand } from "../../../lib/brand-server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your calendar", robots: { index: false } };

// The client's own calendar: what's coming up for their business, so
// content gets planned around it. Brandon sees it on their Studio profile.
export default async function CalendarPage() {
  if (!portalConfigured) redirect("/portal");
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/portal?next=/portal/calendar");
  const email = user.email.toLowerCase();
  let client = null; let hasBrand = false;
  if (adminConfigured) {
    const db = supabaseAdmin();
    [{ data: client }, hasBrand] = await Promise.all([
      db.from("clients").select("id, name").eq("email", email).maybeSingle(),
      email === ADMIN_EMAIL ? false : emailHasBrand(db, email),
    ]);
  }
  const nav = <PortalNav email={user.email} isAdmin={email === ADMIN_EMAIL} active="calendar" brand={hasBrand} />;
  return (
    <PortalFrame nav={nav} className="pt-brief mx-page">
      <header className="cx-wrap cx-wrap--narrow pt-head">
        <p className="cx-kick">Your calendar</p>
        <h1 className="cx-h1 cx-h1--long">What&apos;s coming up?</h1>
        <p className="cx-lede">Drop in anything happening at the business — a sale, a launch, an event, a busy week, a slow one. I plan the content around it and reach out ahead of the dates that matter. Tap a day, add a line. That&apos;s it.</p>
      </header>
      <section className="cx-section cx-section--tight">
        <div className="cx-wrap pt-ccal-wrap">
          {!client ? <p className="inbox-hint">Your account isn&apos;t linked to a client profile yet — text Brandon at 845-549-4425 and he&apos;ll switch it on.</p> : <ClientCalendar mode="client" clientName={client.name || ""} />}
        </div>
      </section>
    </PortalFrame>
  );
}
