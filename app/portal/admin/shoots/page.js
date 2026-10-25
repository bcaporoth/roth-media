import PortalNav from "../../../../components/PortalNav";
import StudioShell from "../../../../components/StudioShell";
import StudioFooter from "../../../../components/StudioFooter";
import ShootsBoard from "../../../../components/ShootsBoard";
import { requireAdminPage } from "../../../../lib/admin-guard";
import { newLeadCount } from "../../../../lib/studio-data";

export const dynamic = "force-dynamic";
export const metadata = { title: "Shoots — Studio", robots: { index: false } };

export default async function ShootsPage() {
  const user = await requireAdminPage();
  const newCount = await newLeadCount();
  return (
    <>
      <PortalNav email={user.email} isAdmin active="admin" />
      <StudioShell active="shoots" newCount={newCount} kick="Studio" title="Shoots" wide>
        <ShootsBoard />
      </StudioShell>
      <StudioFooter />
    </>
  );
}
