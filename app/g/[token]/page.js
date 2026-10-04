import { notFound } from "next/navigation";
import { resolveShareToken } from "../../../lib/share-aliases";
import GalleryBeacon from "../../../components/GalleryBeacon";
import { SharedAlbum, SharedPremiereWait } from "../../../components/ShareViews";
import { designSkin } from "../../../lib/design";
import { REVIEW_URL } from "../../../lib/site";
import { adminConfigured, supabaseAdmin } from "../../../lib/supabase-admin";
import { r2Configured, signedUrl, photoKey, getDims } from "../../../lib/r2";
import { guestLinkForGallery } from "../../../lib/guest";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const base = {
    robots: { index: false },
    openGraph: {
      title: "Your gallery — Roth Media",
      description: "Watch, view, and download your photos and films from Roth Media.",
      images: [{ url: "https://rothmediaco.com/og-card.png", width: 1200, height: 630 }],
      siteName: "Roth Media",
    },
    twitter: { card: "summary_large_image" },
  };
  try {
    const { token } = await params.then((p) => ({ ...p, token: resolveShareToken(p.token) }));
    if (!adminConfigured || !/^[0-9a-f-]{36}$/.test(token)) return base;
    const db = supabaseAdmin();
    const { data: gallery } = await db
      .from("galleries")
      .select("title")
      .eq("share_token", token)
      .maybeSingle();
    if (!gallery) return base;
    // Layout template appends "— Roth Media" to <title>; og:title is verbatim.
    return {
      ...base,
      title: gallery.title,
      description: "Watch, view, and download your photos and films from Roth Media.",
      openGraph: { ...base.openGraph, title: `${gallery.title} — Roth Media` },
    };
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

// Public share-link gallery: anyone with the token URL can view and
// download — no login. Token is an unguessable uuid.
export default async function SharedGalleryPage({ params }) {
  const { token } = await params.then((p) => ({ ...p, token: resolveShareToken(p.token) }));
  if (!adminConfigured || !r2Configured) notFound();
  if (!/^[0-9a-f-]{36}$/.test(token)) notFound();

  const db = supabaseAdmin();
  const { data: gallery } = await db
    .from("galleries")
    .select("id, title, event_date, cover_filename, zip_key, premiere_enabled, reveal_at, design")
    .eq("share_token", token)
    .maybeSingle();
  if (!gallery) notFound();

  const skin = designSkin(gallery.design);
  const premiereActive = Boolean(gallery.premiere_enabled);
  const revealed =
    !gallery.reveal_at || new Date(gallery.reveal_at) <= new Date();

  // Pre-reveal premiere: no media leaves the server — guests get the
  // capture form + countdown only.
  if (premiereActive && !revealed) {
    const coverUrlEarly = gallery.cover_filename
      ? await signedUrl(photoKey(gallery.id, "web", gallery.cover_filename)).catch(
          () => null
        )
      : null;
    return (
      <SharedPremiereWait
        skin={skin}
        gallery={gallery}
        token={token}
        eyebrow={gallery.event_date ? dateFmt(gallery.event_date) : "A Roth Media premiere"}
        coverUrl={coverUrlEarly}
      />
    );
  }

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

  const zipUrl = gallery.zip_key
    ? await signedUrl(gallery.zip_key, {
        download: `${gallery.title.replace(/[^\w\s-]/g, "")}.zip`,
      }).catch(() => null)
    : null;

  const guestLink = await guestLinkForGallery(db, gallery.id);

  // Film-only galleries: the chosen cover doubles as the film's poster,
  // so "Set cover" updates the tile below the hero too.
  const allVideos = items.length > 0 && items.every((i) => i.kind === "video");
  const videoPoster =
    allVideos && gallery.cover_filename
      ? await signedUrl(
          photoKey(gallery.id, "thumb", gallery.cover_filename)
        ).catch(() => null)
      : null;

  return (
    <SharedAlbum
      skin={skin}
      gallery={gallery}
      token={token}
      eyebrow={gallery.event_date ? dateFmt(gallery.event_date) : "A Roth Media gallery"}
      items={items}
      coverUrl={coverUrl}
      zipUrl={zipUrl}
      guestLink={guestLink}
      videoPoster={videoPoster}
      premiereActive={premiereActive}
      reviewUrl={REVIEW_URL}
    >
      <GalleryBeacon galleryId={gallery.id} via="share" />
    </SharedAlbum>
  );
}
