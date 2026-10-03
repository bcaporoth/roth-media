import { notFound } from "next/navigation";
import PortalNav from "../../../../../components/PortalNav";
import StudioShell from "../../../../../components/StudioShell";
import StudioFooter from "../../../../../components/StudioFooter";
import ClientProfile from "../../../../../components/ClientProfile";
import { requireAdminPage } from "../../../../../lib/admin-guard";
import { supabaseAdmin } from "../../../../../lib/supabase-admin";
import { newLeadCount } from "../../../../../lib/studio-data";
import { clientStage, clientType } from "../../../../../lib/intake";
import { resendConfigured } from "../../../../../lib/resend";

export const dynamic = "force-dynamic";

export const metadata = { title: "Client — Studio", robots: { index: false } };

// One client, everything the site knows about them: intake answers, call
// sheets, shoots, galleries, payments, messages. Joined by email.
export default async function ClientPage({ params }) {
  const user = await requireAdminPage();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const db = supabaseAdmin();
  let { data: client, error } = await db.from("clients").select("id, email, name, phone, notes, created_at").eq("id", id).maybeSingle();
  if (error) ({ data: client } = await db.from("clients").select("id, email, name, created_at").eq("id", id).maybeSingle());
  if (!client) notFound();
  const email = client.email.toLowerCase();

  const [{ data: subs }, { data: shoots }, { data: owned }, { data: payments }] = await Promise.all([
    db.from("submissions").select("id, created_at, updated_at, kind, name, email, phone, subject, summary, fields, notes, status, utm").eq("email", email).order("created_at", { ascending: false }),
    db.from("shoots").select("id, title, kind, status, date, start_time, address, place_label, notes").eq("client_email", email).order("date", { ascending: false, nullsFirst: false }).then((r) => r, () => ({ data: [] })),
    db.from("galleries").select("id, title, share_token, media_count, event_date, created_at").eq("client_id", client.id).order("created_at", { ascending: false }),
    db.from("payments").select("id, amount_cents, paid_on, note").eq("client_id", client.id).order("paid_on", { ascending: false }).then((r) => r, () => ({ data: [] })),
  ]);
  let shared = [];
  try {
    const { data: m } = await db.from("gallery_members").select("galleries(id, title, share_token, media_count, event_date, created_at)").eq("client_id", client.id);
    shared = (m || []).map((x) => x.galleries).filter(Boolean).map((g) => ({ ...g, shared: true }));
  } catch {}
  const galleries = [...(owned || []), ...shared];
  const all = subs || [];
  const data = {
    client: { ...client, phone: client.phone || "", notes: client.notes || "" },
    intakes: all.filter((s) => s.kind === "intake"),
    intakeSent: all.find((s) => s.kind === "intake_sent") || null,
    calls: all.filter((s) => s.kind === "call"),
    messages: all.filter((s) => !["intake", "intake_sent", "call"].includes(s.kind)),
    shoots: shoots || [],
    galleries,
    payments: payments || [],
    stage: clientStage({ subs: all, shoots: shoots || [], galleries }),
    type: clientType({ subs: all, shoots: shoots || [] }),
  };
  const newCount = await newLeadCount();
  return (
    <>
      <PortalNav email={user.email} isAdmin active="admin" />
      <StudioShell active="clients" newCount={newCount} kick="Studio · Clients" title={client.name || client.email}>
        <ClientProfile initial={data} emailReady={resendConfigured} />
      </StudioShell>
      <StudioFooter />
    </>
  );
}
