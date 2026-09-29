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
  const membersByGallery = {};
  const memberOf = {};
  try {
    const { data: members } = await db.from("gallery_members").select("gallery_id, client_id, clients(id, name, email)");
    for (const m of members || []) {
      (membersByGallery[m.gallery_id] ||= []).push({ id: m.client_id, name: m.clients?.name || "", email: m.clients?.email || "" });
      (memberOf[m.client_id] ||= []).push(m.gallery_id);
    }
  } catch {}
  const withMembers = (g) => ({ ...g, members: membersByGallery[g.id] || [] });
  const byId = {};
  for (const g of galleries || []) byId[g.id] = g;
  const byClient = {};
  for (const g of galleries || []) (byClient[g.client_id] ||= []).push(withMembers(g));
  for (const [cid, gids] of Object.entries(memberOf))
    for (const gid of gids) if (byId[gid]) (byClient[cid] ||= []).push({ ...withMembers(byId[gid]), shared: true });
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
