import PortalNav from "../../../../components/PortalNav";
import StudioShell from "../../../../components/StudioShell";
import StudioFooter from "../../../../components/StudioFooter";
import ProjectsList from "../../../../components/ProjectsList";
import { requireAdminPage } from "../../../../lib/admin-guard";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { newLeadCount } from "../../../../lib/studio-data";
import { listProjects } from "../../../../lib/projects-server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Projects — Studio", robots: { index: false } };

// Studio → Projects: the jobs above the dates — a documentary, a wedding
// with its engagement session — each holding its shoot days, people, story
// beats and signed releases.
export default async function ProjectsPage() {
  const user = await requireAdminPage();
  const [newCount, projects] = await Promise.all([newLeadCount(), listProjects(supabaseAdmin()).catch(() => null)]);
  return (
    <>
      <PortalNav email={user.email} isAdmin active="admin" />
      <StudioShell active="projects" newCount={newCount} kick="Studio" title="Projects" wide>
        <ProjectsList initial={projects} />
      </StudioShell>
      <StudioFooter />
    </>
  );
}
