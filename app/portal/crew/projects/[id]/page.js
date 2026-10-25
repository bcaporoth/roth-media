import { notFound, redirect } from "next/navigation";
import PortalNav from "../../../../../components/PortalNav";
import ProjectBoard from "../../../../../components/ProjectBoard";
import { whoIs, canProject } from "../../../../../lib/staff-server";
import { supabaseAdmin } from "../../../../../lib/supabase-admin";
import { loadProject } from "../../../../../lib/projects-server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Project — Roth Media", robots: { index: false } };

// The same project page Brandon uses, for a staff member on that project.
export default async function CrewProjectPage({ params }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const me = await whoIs();
  if (!me) redirect(`/portal?next=/portal/crew/projects/${id}`);
  if (me.role === "brandon") redirect(`/portal/admin/projects/${id}`);
  if (!canProject(me, id)) notFound();
  const data = await loadProject(supabaseAdmin(), id);
  if (!data || data.missing) notFound();
  return (
    <>
      <PortalNav email={me.email} isStaff active="crew" />
      <main className="crew-project">
        <header className="crew-project-head"><span className="kick-sm">Project</span><h1>{data.project.title}</h1></header>
        <ProjectBoard initial={data} role="staff" />
      </main>
    </>
  );
}
