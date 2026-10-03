import PortalNav from "../../../../components/PortalNav";
import StudioShell from "../../../../components/StudioShell";
import StudioFooter from "../../../../components/StudioFooter";
import PlaybookBoard from "../../../../components/PlaybookBoard";
import { requireAdminPage } from "../../../../lib/admin-guard";
import { newLeadCount } from "../../../../lib/studio-data";

export const dynamic = "force-dynamic";
export const metadata = { title: "Playbook — Studio", robots: { index: false } };

export default async function PlaybookPage() {
  const user = await requireAdminPage();
  const newCount = await newLeadCount();
  return (
    <>
      <PortalNav email={user.email} isAdmin active="admin" />
      <StudioShell active="playbook" newCount={newCount} kick="Studio" title="Playbook" wide>
        <p className="inbox-hint">Your reusable lists: gear, shot lists, the flow of the day, poses and prompts. Lists marked “auto” get copied onto every new shoot of that type; any list can be pulled into a shoot by hand.</p>
        <PlaybookBoard />
      </StudioShell>
      <StudioFooter />
    </>
  );
}
