import PortalNav from "../../../../components/PortalNav";
import StudioShell from "../../../../components/StudioShell";
import StudioFooter from "../../../../components/StudioFooter";
import ClientsBoard from "../../../../components/ClientsBoard";
import { requireAdminPage } from "../../../../lib/admin-guard";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { newLeadCount } from "../../../../lib/studio-data";
import { resendConfigured } from "../../../../lib/resend";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Clients — Studio",
  robots: { index: false },
};

export default async function ClientsPage() {
  const user = await requireAdminPage();
  const db = supabaseAdmin();
  let { data: clients, error } = await db
    .from("clients")
    .select("id, email, name, phone, notes, created_at")
    .order("name", { ascending: true });
  if (error) ({ data: clients } = await db.from("clients").select("id, email, name, created_at").order("name"));
  const { data: galleries } = await db
    .from("galleries")
    .select("id, title, share_token, media_count, event_date, client_id, created_at")
    .order("created_at", { ascending: false });
  const byClient = {};
  for (const g of galleries || []) (byClient[g.client_id] ||= []).push(g);
  const accounts = {};
  try {
    const { data } = await db.auth.admin.listUsers({ page: 1, perPage: 200 });
    for (const u of data?.users || []) accounts[(u.email || "").toLowerCase()] = { lastSignIn: u.last_sign_in_at || null };
  } catch {}
  const initial = (clients || []).map((c) => ({
    ...c, phone: c.phone || "", notes: c.notes || "",
    galleries: byClient[c.id] || [],
    account: accounts[c.email.toLowerCase()] || null,
  }));
  const newCount = await newLeadCount();

  return (
    <>
      <PortalNav email={user.email} isAdmin active="admin" />
      <StudioShell active="clients" newCount={newCount} kick="Studio" title="Clients">
        <ClientsBoard initial={initial} emailReady={resendConfigured} />
      </StudioShell>
      <StudioFooter />
    </>
  );
}
