import PortalNav from "../../../../components/PortalNav";
import StudioShell from "../../../../components/StudioShell";
import StudioFooter from "../../../../components/StudioFooter";
import FollowUps from "../../../../components/FollowUps";
import { requireAdminPage } from "../../../../lib/admin-guard";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { newLeadCount } from "../../../../lib/studio-data";
import { loadPeople, loadWords, loadPicks } from "../../../../lib/nurture-server";
import "../../../theme/nurture.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Follow-ups — Command Center", robots: { index: false } };

// Command Center → Inbox → Follow-ups (lib/nurture.js): who is on which set
// of emails, what is due or past due, and the words. Nothing sends by itself.
export default async function FollowUpsPage() {
  const user = await requireAdminPage();
  const db = supabaseAdmin();
  const [newCount, people, words, picks] = await Promise.all([
    newLeadCount(),
    loadPeople(db).catch(() => []),
    loadWords(db).catch(() => null),
    loadPicks(db).catch(() => []),
  ]);
  return (
    <>
      <PortalNav email={user.email} isAdmin active="admin" />
      <StudioShell active="followups" newCount={newCount} kick="Command Center" title="Follow-ups">
        <FollowUps initialPeople={people} initialWords={words} picks={picks} />
      </StudioShell>
      <StudioFooter />
    </>
  );
}
