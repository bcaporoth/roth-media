import { notFound } from "next/navigation";
import PortalNav from "../../../../../../components/PortalNav";
import StudioShell from "../../../../../../components/StudioShell";
import StudioFooter from "../../../../../../components/StudioFooter";
import ContentPlanEditor from "../../../../../../components/ContentPlanEditor";
import { requireAdminPage } from "../../../../../../lib/admin-guard";
import { supabaseAdmin } from "../../../../../../lib/supabase-admin";
import { newLeadCount } from "../../../../../../lib/studio-data";
import { ensureBrand } from "../../../../../../lib/brand-server";
import { aiConfigured, loadPlanState } from "../../../../../../lib/content-plan-server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Content plan — Studio", robots: { index: false } };

// Studio → Clients → profile → Content plan. Opening it opens a brand
// palette for them if they don't have one yet (the plan is stored on it),
// which also gives them the business portal home.
export default async function ClientPlanPage({ params }) {
  const user = await requireAdminPage();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const db = supabaseAdmin();
  const { data: client } = await db.from("clients").select("id, name, email").eq("id", id).maybeSingle();
  if (!client) notFound();
  let state = null;
  let setupError = "";
  try {
    await ensureBrand(db, client);
    state = await loadPlanState(db, client.id);
  } catch (err) {
    setupError = err.message || "Couldn't open the plan";
  }
  const newCount = await newLeadCount();
  return (
    <>
      <PortalNav email={user.email} isAdmin active="admin" />
      <StudioShell active="clients" newCount={newCount} kick={`Studio · Clients · ${client.name || client.email}`} title="Content plan">
        {setupError
          ? <p className="sm-sqlhint">{setupError}</p>
          : <ContentPlanEditor client={{ id: client.id, name: client.name }} initial={state || {}} aiReady={aiConfigured} />}
      </StudioShell>
      <StudioFooter />
    </>
  );
}
