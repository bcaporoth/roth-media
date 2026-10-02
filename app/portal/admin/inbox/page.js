import PortalNav from "../../../../components/PortalNav";
import StudioShell from "../../../../components/StudioShell";
import StudioFooter from "../../../../components/StudioFooter";
import InboxBoard from "../../../../components/InboxBoard";
import { requireAdminPage } from "../../../../lib/admin-guard";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { newLeadCount } from "../../../../lib/studio-data";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Inbox — Studio",
  robots: { index: false },
};

export default async function InboxPage() {
  const user = await requireAdminPage();
  const { data, error } = await supabaseAdmin()
    .from("submissions")
    .select(
      "id, created_at, kind, name, email, phone, subject, summary, fields, status, notes, read_at, source_path, utm"
    )
    .not("kind", "in", "(partner_lead,partner_month)") // partner leads live in Studio → Partners
    .order("created_at", { ascending: false })
    .limit(500);
  const newCount = await newLeadCount();

  return (
    <>
      <PortalNav email={user.email} isAdmin active="admin" />
      <StudioShell active="inbox" newCount={newCount} kick="Studio" title="Inbox">
        {error ? (
          <p className="portal-empty">
            The inbox table isn&apos;t set up yet — run <code>supabase/studio.sql</code> in the
            Supabase SQL editor once, then refresh.
          </p>
        ) : (
          <InboxBoard initial={data || []} />
        )}
      </StudioShell>
      <StudioFooter />
    </>
  );
}
