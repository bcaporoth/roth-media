import PortalNav from "../../../../components/PortalNav";
import StudioShell from "../../../../components/StudioShell";
import StudioFooter from "../../../../components/StudioFooter";
import StaffBoard from "../../../../components/StaffBoard";
import { requireAdminPage } from "../../../../lib/admin-guard";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { newLeadCount } from "../../../../lib/studio-data";
import { listStaff } from "../../../../lib/staff-server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Staff — Studio", robots: { index: false } };

export default async function StaffPage() {
  const user = await requireAdminPage();
  const [newCount, staff] = await Promise.all([newLeadCount(), listStaff(supabaseAdmin()).catch(() => null)]);
  return (
    <>
      <PortalNav email={user.email} isAdmin active="admin" />
      <StudioShell active="staff" newCount={newCount} kick="Studio" title="Staff" wide>
        <StaffBoard initial={staff} />
      </StudioShell>
      <StudioFooter />
    </>
  );
}
