import { redirect } from "next/navigation";
import AdminDashboard from "../../../components/AdminDashboard";
import PortalNav from "../../../components/PortalNav";
import StudioShell from "../../../components/StudioShell";
import StudioFooter from "../../../components/StudioFooter";
import { createSupabaseServer, portalConfigured } from "../../../lib/supabase";
import { adminConfigured, supabaseAdmin, ADMIN_EMAIL } from "../../../lib/supabase-admin";
import { r2Configured, signedUrl, photoKey } from "../../../lib/r2";
import { newLeadCount } from "../../../lib/studio-data";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Galleries — Studio",
  robots: { index: false },
};

export default async function AdminPage() {
  if (!portalConfigured || !adminConfigured) redirect("/portal");
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.email?.toLowerCase() !== ADMIN_EMAIL) redirect("/portal");

  const db = supabaseAdmin();
  const { data: galleries } = await db
    .from("galleries")
    .select(
      "id, title, media_count, share_token, cover_filename, design, created_at, event_date, clients!client_id(name, email)"
    )
    .order("created_at", { ascending: false });

  // Studio extras — both tolerate studio.sql not being run yet.
  const [{ data: reviews }, { data: readies }, { data: acts }, newCount] = await Promise.all([
    db.from("galleries").select("id, review_requested_at"),
    db.from("galleries").select("id, ready_sent_at"),
    db
      .from("gallery_activity")
      .select("gallery_id, action, created_at")
      .order("created_at", { ascending: false })
      .limit(20000),
    newLeadCount(),
  ]);
  const reviewedAt = new Map((reviews || []).map((r) => [r.id, r.review_requested_at]));
  const readyAt = new Map((readies || []).map((r) => [r.id, r.ready_sent_at]));
  const activity = new Map();
  for (const a of acts || []) {
    const cur = activity.get(a.gallery_id) || { views: 0, saves: 0, last: a.created_at };
    if (a.action === "view") cur.views++;
    else cur.saves++;
    activity.set(a.gallery_id, cur);
  }

  // Flatten for the client component + sign cover thumbnails.
  const items = await Promise.all(
    (galleries || []).map(async (g) => ({
      id: g.id,
      title: g.title,
      media_count: g.media_count || 0,
      share_token: g.share_token,
      cover_filename: g.cover_filename,
      design: g.design,
      created_at: g.created_at,
      event_date: g.event_date,
      clientName: g.clients?.name || "",
      clientEmail: g.clients?.email || "",
      reviewRequestedAt: reviewedAt.get(g.id) || null,
      readySentAt: readyAt.get(g.id) || null,
      activity: activity.get(g.id) || null,
      coverUrl:
        r2Configured && g.cover_filename
          ? await signedUrl(photoKey(g.id, "thumb", g.cover_filename)).catch(
              () => null
            )
          : null,
    }))
  );

  return (
    <>
      <PortalNav email={user.email} isAdmin active="admin" />

      <StudioShell active="galleries" newCount={newCount} kick="Studio" title="Galleries">
        <AdminDashboard galleries={items} />
      </StudioShell>
      <StudioFooter />
    </>
  );
}
