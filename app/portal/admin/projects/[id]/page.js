import { notFound } from "next/navigation";
import PortalNav from "../../../../../components/PortalNav";
import StudioShell from "../../../../../components/StudioShell";
import StudioFooter from "../../../../../components/StudioFooter";
import ProjectBoard from "../../../../../components/ProjectBoard";
import { requireAdminPage } from "../../../../../lib/admin-guard";
import { supabaseAdmin } from "../../../../../lib/supabase-admin";
import { newLeadCount } from "../../../../../lib/studio-data";
import { loadProject } from "../../../../../lib/projects-server";
import { listStaff } from "../../../../../lib/staff-server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Project — Studio", robots: { index: false } };

export default async function ProjectPage({ params }) {
  const user = await requireAdminPage();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [newCount, data, staff] = await Promise.all([newLeadCount(), loadProject(supabaseAdmin(), id), listStaff(supabaseAdmin()).catch(() => null)]);
  if (!data || data.missing) notFound();
  return (
    <>
      <PortalNav email={user.email} isAdmin active="admin" />
      <StudioShell active="projects" newCount={newCount} kick="Project" title={data.project.title} wide>
        <ProjectBoard initial={data} staffList={staff || []} />
      </StudioShell>
      <StudioFooter />
    </>
  );
}
