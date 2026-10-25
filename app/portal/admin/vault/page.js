import PortalNav from "../../../../components/PortalNav";
import StudioShell from "../../../../components/StudioShell";
import StudioFooter from "../../../../components/StudioFooter";
import VaultList from "../../../../components/VaultList";
import { requireAdminPage } from "../../../../lib/admin-guard";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { newLeadCount } from "../../../../lib/studio-data";
import { listReleases } from "../../../../lib/projects-server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Vault — Studio", robots: { index: false } };

// Studio → More → Vault: every signed release, newest first — the name, the
// kind, the signature, and the exact words they agreed to. Print any one.
export default async function VaultPage() {
  const user = await requireAdminPage();
  const [newCount, releases] = await Promise.all([newLeadCount(), listReleases(supabaseAdmin()).catch(() => null)]);
  return (
    <>
      <PortalNav email={user.email} isAdmin active="admin" />
      <StudioShell active="vault" newCount={newCount} kick="Studio" title="Vault" wide>
        <VaultList initial={releases} />
      </StudioShell>
      <StudioFooter />
    </>
  );
}
