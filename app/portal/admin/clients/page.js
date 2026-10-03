import PortalNav from "../../../../components/PortalNav";
import StudioShell from "../../../../components/StudioShell";
import StudioFooter from "../../../../components/StudioFooter";
import ClientsBoard from "../../../../components/ClientsBoard";
import { requireAdminPage } from "../../../../lib/admin-guard";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { newLeadCount } from "../../../../lib/studio-data";
import { resendConfigured } from "../../../../lib/resend";
import { clientStage, clientType, INQUIRY_KINDS } from "../../../../lib/intake";

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
  // Pipeline position per client: intakes/calls/bookings (submissions) + shoots, joined by email.
  const subsBy = {};
  const shootsBy = {};
  try {
    const { data: subs } = await db.from("submissions").select("kind, status, created_at, email, name, phone, utm").not("kind", "in", "(partner,partner_lead,partner_month)").order("created_at", { ascending: false }).limit(2000);
    for (const s of subs || []) (subsBy[(s.email || "").toLowerCase()] ||= []).push(s);
  } catch {}
  try {
    const { data: shoots } = await db.from("shoots").select("kind, status, client_email");
    for (const s of shoots || []) (shootsBy[(s.client_email || "").toLowerCase()] ||= []).push(s);
  } catch {}
  // People who reached out (quote/contact/card/booking/intake) but aren't on the roster yet.
  const onRoster = new Set((clients || []).map((c) => c.email.toLowerCase()));
  const leads = [];
  const seen = new Set();
  for (const [email, subs] of Object.entries(subsBy)) {
    if (!email || onRoster.has(email) || seen.has(email) || email === "brandon@rothventures.co") continue;
    const inq = subs.find((s) => [...INQUIRY_KINDS, "intake"].includes(s.kind));
    if (!inq) continue;
    seen.add(email);
    leads.push({ id: null, email, name: inq.name || "", phone: inq.phone || "", notes: "", galleries: [], account: null, lead: true, created_at: inq.created_at, stage: clientStage({ subs, shoots: shootsBy[email] || [], galleries: [] }), type: clientType({ subs, shoots: shootsBy[email] || [] }), lastTouch: subs[0]?.created_at || null });
  }
  const initial = [...leads, ...(clients || [])].map((c) => {
    if (c.lead) return c;
    const key = c.email.toLowerCase();
    const subs = subsBy[key] || [];
    const shoots = shootsBy[key] || [];
    const galleries = byClient[c.id] || [];
    return {
      ...c, phone: c.phone || "", notes: c.notes || "",
      galleries,
      account: accounts[key] || null,
      stage: clientStage({ subs, shoots, galleries }),
      type: clientType({ subs, shoots }),
      lastTouch: subs[0]?.created_at || null,
    };
  }).sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email));
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
