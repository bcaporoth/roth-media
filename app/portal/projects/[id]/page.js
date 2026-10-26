import { notFound, redirect } from "next/navigation";
import PortalNav from "../../../../components/PortalNav";
import { PortalLobby } from "../../../../components/PortalViews";
import ClientProject from "../../../../components/ClientProject";
import { whoIs } from "../../../../lib/staff-server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { loadClientProject } from "../../../../lib/projects-server";

// The client's window onto a project: phase, milestones, the days they
// can see, what we need from them (tasks, sign-offs, change orders,
// payments), cuts to watch and note, the weekly update, and the brief.
// Never the journal, budget detail, people notes or story internals.
export const dynamic = "force-dynamic";
export const metadata = { title: "Your project — Roth Media", robots: { index: false } };

export default async function ClientProjectPage({ params }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const me = await whoIs();
  if (!me) redirect(`/portal?next=/portal/projects/${id}`);
  if (me.role === "brandon") redirect(`/portal/admin/projects/${id}`);
  if (me.role !== "client") notFound();
  const db = supabaseAdmin();
  const { data: owned } = await db.from("projects").select("id").eq("id", id).eq("client_id", me.clientId).maybeSingle();
  if (!owned) notFound();
  const data = await loadClientProject(db, id);
  if (!data) notFound();
  return (
    <>
      <PortalNav email={me.email} active="project" brand />
      <PortalLobby kicker="Your project" title={data.project.title} lede={data.project.logline || "Where the film is, what's next, and what we need from you."}>
        <ClientProject data={data} me={{ email: me.email, name: me.client?.name || "" }} />
      </PortalLobby>
    </>
  );
}
