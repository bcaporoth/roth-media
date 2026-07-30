import Link from "next/link";
import BrandMark from "../../../components/BrandMark";
import { notFound } from "next/navigation";
import PortalGallery from "../../../components/PortalGallery";
import { adminConfigured, supabaseAdmin } from "../../../lib/supabase-admin";
import { r2Configured, signedUrl, photoKey } from "../../../lib/r2";

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

// Public share-link gallery: anyone with the token URL can view and
// download — no login. Token is an unguessable uuid.
export default async function SharedGalleryPage({ params }) {
  const { token } = await params;
  if (!adminConfigured || !r2Configured) notFound();
  if (!/^[0-9a-f-]{36}$/.test(token)) notFound();

  const db = supabaseAdmin();
  const { data: gallery } = await db
    .from("galleries")
    .select("id, title, event_date, cover_filename, zip_key")
    .eq("share_token", token)
    .maybeSingle();
  if (!gallery) notFound();

  const { data: media } = await db
    .from("media")
    .select("filename, kind")
    .eq("gallery_id", gallery.id)
    .order("position", { ascending: true });

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
          {zipUrl && (
            <li>
              <a href={zipUrl}>Download all ↓</a>
            </li>
          )}
          <li>
            <Link href="/quote">Book your own shoot</Link>
          </li>
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
            {gallery.event_date ? dateFmt(gallery.event_date) : "A Roth Media gallery"}
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
            {items.length} {items.length === 1 ? "item" : "items"} · filmed
            &amp; photographed by Roth Media
          </p>
        </div>
      </header>

      <section id="grid" className="work pgal-work">
        <PortalGallery items={items} title={gallery.title} />
      </section>

      <section className="contact" style={{ borderTop: "1px solid var(--line)" }}>
        <div className="kick">Loved these?</div>
        <h2>
          Book your own <em>shoot.</em>
        </h2>
        <p className="lead">
          Weddings, seniors, brands, events — get an instant quote in two
          minutes.
        </p>
        <Link href="/quote" className="hero-cta-primary" style={{ marginTop: "1rem" }}>
          Get my instant quote →
        </Link>
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
