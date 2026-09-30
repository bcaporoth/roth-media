import Link from "next/link";
import PortalNav from "../../../../components/PortalNav";
import StudioShell from "../../../../components/StudioShell";
import StudioFooter from "../../../../components/StudioFooter";
import StudioCalendar from "../../../../components/StudioCalendar";
import { requireAdminPage } from "../../../../lib/admin-guard";
import { newLeadCount } from "../../../../lib/studio-data";
import { CALENDLY } from "../../../../lib/site";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Calendar — Studio",
  robots: { index: false },
};

export default async function CalendarPage() {
  const user = await requireAdminPage();
  const newCount = await newLeadCount();

  return (
    <>
      <PortalNav email={user.email} isAdmin active="admin" />
      <StudioShell active="calendar" newCount={newCount} kick="Studio" title="Calendar" wide>
        <div className="atoolbar scal-links">
          <Link className="abtn" href="/portal/admin/shoots">+ New shoot</Link>
          <a className="abtn abtn-ghost" href={CALENDLY} target="_blank" rel="noreferrer">Your booking link ↗</a>
        </div>
        <StudioCalendar />
      </StudioShell>
      <StudioFooter />
    </>
  );
}
