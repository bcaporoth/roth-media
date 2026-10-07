import { redirect, notFound } from "next/navigation";
import GalleryBeacon from "../../../../components/GalleryBeacon";
import { PortalPremiere } from "../../../../components/PortalViews";
import { designSkin } from "../../../../lib/design";
import { adminConfigured, supabaseAdmin, ADMIN_EMAIL } from "../../../../lib/supabase-admin";
import { createSupabaseServer, portalConfigured } from "../../../../lib/supabase";
import { r2Configured, signedUrl, photoKey, getDims } from "../../../../lib/r2";
import { guestLinkForGallery } from "../../../../lib/guest";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const base = { title: "Your Gallery", robots: { index: false } };
  try {
    const { id } = await params;
    if (!portalConfigured) return base;
    const supabase = await createSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const db =
      user?.email?.toLowerCase() === ADMIN_EMAIL && adminConfigured
        ? supabaseAdmin()
        : supabase;
    const { data: g } = await db
      .from("galleries")
      .select("title")
      .eq("id", id)
      .maybeSingle();
    return g ? { ...base, title: g.title } : base;
  } catch {
    return base;
  }
}

const dateFmt = (d) =>
  new Date(d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });

export default async function GalleryPage({ params }) {
  const { id } = await params;
  if (!portalConfigured || !r2Configured) redirect("/portal");

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/portal?next=${encodeURIComponent(`/portal/gallery/${id}`)}`);

  // Clients stay behind RLS (their own galleries only); the studio admin
  // can open any gallery via the service client.
  const isAdmin = user.email?.toLowerCase() === ADMIN_EMAIL;
  const db = isAdmin && adminConfigured ? supabaseAdmin() : supabase;
  const { data: gallery } = await db
    .from("galleries")
    .select("id, title, event_date, cover_filename, zip_key, share_token, design")
    .eq("id", id)
    .maybeSingle();
  if (!gallery) notFound();

  // `section` arrives with supabase/sections.sql — fall back to a flat
  // album until that migration has run.
  let { data: media, error: mediaError } = await db
    .from("media")
    .select("filename, kind, section")
    .eq("gallery_id", gallery.id)
    .order("position", { ascending: true });
  if (mediaError) {
    ({ data: media } = await db
      .from("media")
      .select("filename, kind")
      .eq("gallery_id", gallery.id)
      .order("position", { ascending: true }));
  }

  // Derived sizes (web/thumb + video posters) are always stored as .jpg;
  // originals keep their exact filename.
  const jpgName = (f) => f.replace(/\.[^.]+$/, "") + ".jpg";

  const dims = await getDims(gallery.id);
  const items = await Promise.all(
    (media || []).map(async (m) => {
      const thumb = photoKey(gallery.id, "thumb", jpgName(m.filename));
      const web =
        m.kind === "video"
          ? photoKey(gallery.id, "orig", m.filename)
          : photoKey(gallery.id, "web", jpgName(m.filename));
      const [thumbUrl, webUrl, downloadUrl] = await Promise.all([
        signedUrl(thumb).catch(() => null),
        signedUrl(web),
        signedUrl(photoKey(gallery.id, "orig", m.filename), {
          download: m.filename,
        }),
      ]);
      const [w, h] = dims[m.filename] || [];
      return { filename: m.filename, kind: m.kind, section: m.section || null, thumbUrl, webUrl, downloadUrl, w: w || null, h: h || null };
    })
  );

  const coverUrl = gallery.cover_filename
    ? await signedUrl(photoKey(gallery.id, "web", gallery.cover_filename)).catch(
        () => null
      )
    : null;

  // Small version of the cover under the full one: paints first, and stays
  // if the web-size file is missing (film posters only exist as thumbs).
  const coverThumbUrl = gallery.cover_filename
    ? await signedUrl(
        photoKey(gallery.id, "thumb", gallery.cover_filename)
      ).catch(() => null)
    : null;

  const zipUrl = gallery.zip_key
    ? await signedUrl(gallery.zip_key, {
        download: `${gallery.title.replace(/[^\w\s-]/g, "")}.zip`,
      }).catch(() => null)
    : null;

  // Film-only galleries: the chosen cover doubles as the film's poster,
  // so "Set cover" updates the tile below the hero too.
  const allVideos = items.length > 0 && items.every((i) => i.kind === "video");
  const videoPoster =
    allVideos && gallery.cover_filename
      ? await signedUrl(
          photoKey(gallery.id, "thumb", gallery.cover_filename)
        ).catch(() => null)
      : null;

  // The album's saved design (font pairing, mood, accent) follows it here,
  // so the signed-in view matches the public share page.
  const skin = designSkin(gallery.design);

  // guest_events is service-role only — clients read it through the admin client.
  const guestLink = adminConfigured ? await guestLinkForGallery(supabaseAdmin(), gallery.id) : null;

  return (
    <PortalPremiere
      skin={skin}
      email={user.email}
      isAdmin={isAdmin}
      gallery={gallery}
      eyebrow={gallery.event_date ? dateFmt(gallery.event_date) : "Your gallery"}
      items={items}
      coverUrl={coverUrl}
      coverThumbUrl={coverThumbUrl}
      zipUrl={zipUrl}
      videoPoster={videoPoster}
      guestLink={guestLink}
    >
      <GalleryBeacon galleryId={gallery.id} via="portal" />
    </PortalPremiere>
  );
}
