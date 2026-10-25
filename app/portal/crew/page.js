import { redirect } from "next/navigation";
import PortalNav from "../../../components/PortalNav";
import { PortalLobby } from "../../../components/PortalViews";
import { whoIs } from "../../../lib/staff-server";
import { supabaseAdmin } from "../../../lib/supabase-admin";
import { listProjects } from "../../../lib/projects-server";
import CrewHome from "../../../components/CrewHome";

// A staff member's home: the projects they're on, nothing else.
export const dynamic = "force-dynamic";
export const metadata = { title: "My projects — Roth Media", robots: { index: false } };

export default async function CrewHomePage() {
  const me = await whoIs();
  if (!me) redirect("/portal?next=/portal/crew");
  if (me.role === "brandon") redirect("/portal/admin/projects");
  if (me.role !== "staff") redirect("/portal");
  const all = (await listProjects(supabaseAdmin()).catch(() => [])) || [];
  const mine = all.filter((p) => me.projectIds.includes(p.id));
  return (
    <>
      <PortalNav email={me.email} isStaff active="crew" />
      <PortalLobby title={`Hi ${me.staff.name.split(" ")[0]}.`} lede={mine.length ? "The projects you're on. Open one for the people, the story, the days and the journal." : "You're not on a project yet — Brandon adds you from the project page."}>
        <CrewHome projects={mine} />
      </PortalLobby>
    </>
  );
}
