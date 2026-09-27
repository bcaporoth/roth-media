import PortalNav from "../../../../components/PortalNav";
import StudioShell from "../../../../components/StudioShell";
import StudioFooter from "../../../../components/StudioFooter";
import CalendarEmbed from "../../../../components/CalendarEmbed";
import { requireAdminPage } from "../../../../lib/admin-guard";
import { newLeadCount } from "../../../../lib/studio-data";
import { GOOGLE_CALENDARS, CALENDLY } from "../../../../lib/site";

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
          <a className="abtn" href="https://calendar.google.com/calendar/r/eventedit" target="_blank" rel="noreferrer">
            + New event
          </a>
          <a className="abtn abtn-ghost" href="https://calendar.google.com/calendar/r" target="_blank" rel="noreferrer">
            Open Google Calendar ↗
          </a>
          <a className="abtn abtn-ghost" href="https://calendly.com/app/scheduled_events/user/me" target="_blank" rel="noreferrer">
            Calendly bookings ↗
          </a>
          <a className="abtn abtn-ghost" href={CALENDLY} target="_blank" rel="noreferrer">
            Your booking link ↗
          </a>
        </div>
        <CalendarEmbed calendars={GOOGLE_CALENDARS} />
        <p className="inbox-hint scal-note">
          Blank or asking you to sign in? Sign into Google in this browser with {GOOGLE_CALENDARS.join(" or ")}.
          Calendly calls land here automatically as long as Calendly is connected to one of these calendars.
        </p>
      </StudioShell>
      <StudioFooter />
    </>
  );
}
