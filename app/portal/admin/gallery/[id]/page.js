import { notFound } from "next/navigation";
import PortalNav from "../../../../../components/PortalNav";
import StudioShell from "../../../../../components/StudioShell";
import StudioFooter from "../../../../../components/StudioFooter";
import GalleryPage from "../../../../../components/GalleryPage";
import { requireAdminPage } from "../../../../../lib/admin-guard";
import { supabaseAdmin } from "../../../../../lib/supabase-admin";
import { r2Configured, signedUrl, photoKey } from "../../../../../lib/r2";
import { newLeadCount } from "../../../../../lib/studio-data";

export const dynamic = "force-dynamic";
export const metadata = { title: "Gallery — Studio", robots: { index: false } };

// Studio → one gallery's own page. The dashboard card is a glance; this is
// where you actually work on it: rename, albums, cover, design, sending.
export default async function AdminGalleryPage({ params, searchParams }) {
  const user = await requireAdminPage();
  const { id } = await params;
  const sp = (await searchParams) || {};
  const db = supabaseAdmin();

  const { data: g } = await db
    .from("galleries")
    .select("id, title, media_count, share_token, cover_filename, design, created_at, event_date, client_id, clients!client_id(name, email)")
    .eq("id", id)
    .maybeSingle();
  if (!g) notFound();

  const [{ data: extra }, { data: acts }, newCount] = await Promise.all([
    db.from("galleries").select("ready_sent_at, review_requested_at, ready_scheduled_at, ready_scheduled_note").eq("id", id).maybeSingle(),
    db.from("gallery_activity").select("action, created_at").eq("gallery_id", id).order("created_at", { ascending: false }).limit(5000),
    newLeadCount(),
  ]);
  let activity = null;
  for (const a of acts || []) {
    activity = activity || { views: 0, saves: 0, last: a.created_at };
    if (a.action === "view") activity.views++;
    else activity.saves++;
  }

  const gallery = {
    id: g.id,
    title: g.title,
    media_count: g.media_count || 0,
    share_token: g.share_token,
    cover_filename: g.cover_filename,
    design: g.design,
    created_at: g.created_at,
    event_date: g.event_date,
    clientId: g.client_id,
    clientName: g.clients?.name || "",
    clientEmail: g.clients?.email || "",
    reviewRequestedAt: extra?.review_requested_at || null,
    readySentAt: extra?.ready_sent_at || null,
    readyScheduledAt: extra?.ready_scheduled_at || null,
    readyScheduledNote: extra?.ready_scheduled_note || "",
    activity,
    coverUrl: r2Configured && g.cover_filename ? await signedUrl(photoKey(g.id, "thumb", g.cover_filename)).catch(() => null) : null,
  };

  return (
    <>
      <PortalNav email={user.email} isAdmin active="admin" />
      <StudioShell active="galleries" newCount={newCount} kick="Studio · Galleries" title={gallery.title}>
        <GalleryPage gallery={gallery} tab={typeof sp.tab === "string" ? sp.tab : "photos"} />
      </StudioShell>
      <StudioFooter />
    </>
  );
}
