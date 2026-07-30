import Link from "next/link";
import BrandMark from "../../../../components/BrandMark";
import { redirect, notFound } from "next/navigation";
import PortalGallery from "../../../../components/PortalGallery";
import { createSupabaseServer, portalConfigured } from "../../../../lib/supabase";
import { r2Configured, signedUrl, photoKey } from "../../../../lib/r2";

export const dynamic = "force-dynamic";

export const metadata = {
  robots: { index: false },
};

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
  if (!user) redirect("/portal");

  // RLS guarantees clients can only fetch their own gallery.
  const { data: gallery } = await supabase
    .from("galleries")
    .select("id, title, event_date, cover_filename, zip_key, share_token")
    .eq("id", id)
    .maybeSingle();
  if (!gallery) notFound();

  const { data: media } = await supabase
    .from("media")
    .select("filename, kind")
    .eq("gallery_id", gallery.id)
    .order("position", { ascending: true });

  // Derived sizes (web/thumb + video posters) are always stored as .jpg;
  // originals keep their exact filename.
  const jpgName = (f) => f.replace(/\.[^.]+$/, "") + ".jpg";

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
      return { filename: m.filename, kind: m.kind, thumbUrl, webUrl, downloadUrl };
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
        expiresIn: 6 * 3600,
      }).catch(() => null)
    : null;

  return (
    <>
      <nav className="rm-nav" aria-label="Main navigation">
        <Link href="/" className="brand">
          <BrandMark />
          Roth <em>Media</em>
        </Link>
        <ul className="nav-links">
          <li>
            <Link href="/portal">← Your portal</Link>
          </li>
          {zipUrl && (
            <li>
              <a href={zipUrl}>Download all ↓</a>
            </li>
          )}
        </ul>
      </nav>

      <header className="hero pgal-hero">
        {coverUrl && (
          <div
            className="hero-bg"
            style={{ backgroundImage: `url(${coverUrl})` }}
          />
        )}
        <div className="hero-inner">
          <div className="hero-eyebrow">
            {gallery.event_date ? dateFmt(gallery.event_date) : "Your gallery"}
          </div>
          <h1>
            {gallery.title.split(" ").slice(0, -1).join(" ")}{" "}
            <em>{gallery.title.split(" ").slice(-1)}</em>
          </h1>
          <div className="hero-cta">
            <a href="#grid" className="hero-cta-primary">
              View gallery ↓
            </a>
            {zipUrl && (
              <a href={zipUrl} className="hero-cta-secondary">
                Download everything
              </a>
            )}
          </div>
          <p className="hero-trust">
            {items.length} {items.length === 1 ? "item" : "items"} · yours to
            keep, forever
          </p>
        </div>
      </header>

      {gallery.share_token && (
        <p className="pgal-share">
          Share this gallery with family &amp; friends — no login needed:{" "}
          <a href={`/g/${gallery.share_token}`}>
            rothmediaco.com/g/{gallery.share_token.slice(0, 8)}…
          </a>
        </p>
      )}

      <section id="grid" className="work pgal-work">
        <PortalGallery items={items} title={gallery.title} />
      </section>

      <footer className="rm-footer">
        <div className="foot-inner">
          <div className="brand">
            <BrandMark accent />
            Roth <em>Media</em>
          </div>
          <a href="tel:+18455494425">845-549-4425</a>
          <span>© {new Date().getFullYear()} Roth Media</span>
        </div>
      </footer>
    </>
  );
}
