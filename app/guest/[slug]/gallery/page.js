import Link from "next/link";
import { notFound } from "next/navigation";
import BrandMark from "../../../../components/BrandMark";
import { adminConfigured, supabaseAdmin } from "../../../../lib/supabase-admin";
import { r2Configured, signedUrl } from "../../../../lib/r2";
import { SLUG_RE } from "../../../../lib/guest";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your guests' photos", robots: { index: false } };

const when = (d) => new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });

// Couple's private view of everything guests shared. Needs ?k=<view_token>.
export default async function GuestGalleryPage({ params, searchParams }) {
  const { slug } = await params;
  const sp = await searchParams;
  const key = String(sp?.k || "");
  if (!adminConfigured || !r2Configured || !SLUG_RE.test(slug) || !/^[0-9a-f-]{36}$/.test(key)) notFound();
  const db = supabaseAdmin();
  const { data: ev } = await db
    .from("guest_events").select("id, slug, title, event_date, upload_open_until, view_token")
    .eq("slug", slug).maybeSingle();
  if (!ev || ev.view_token !== key) notFound();
  const { data: rows } = await db
    .from("guest_uploads")
    .select("id, guest_name, kind, filename, key, web_key, content_type, bytes, width, height, created_at")
    .eq("event_id", ev.id)
    .order("created_at", { ascending: true });

  const items = await Promise.all(
    (rows || []).map(async (r) => ({
      ...r,
      viewUrl: await signedUrl(r.kind === "photo" && r.web_key ? r.web_key : r.key).catch(() => null),
      downloadUrl: await signedUrl(r.key, { download: r.filename }).catch(() => null),
    }))
  );
  const messages = items.filter((i) => i.kind === "message");
  const media = items.filter((i) => i.kind !== "message");
  const guests = new Set(items.map((i) => i.guest_name).filter(Boolean)).size;
  const stillOpen = new Date(ev.upload_open_until) > new Date();

  return (
    <main className="guest-wrap guest-gal">
      <Link href="/" className="brand guest-brand">
        <span className="brand-chip"><BrandMark /></span>
        <span className="brand-text">Roth <em>Media</em></span>
      </Link>
      <div className="kick">From your guests</div>
      <h1>{ev.title}</h1>
      <p className="lead">
        {items.length} {items.length === 1 ? "upload" : "uploads"} from {guests} {guests === 1 ? "guest" : "guests"}
        {messages.length ? ` · ${messages.length} video ${messages.length === 1 ? "message" : "messages"}` : ""}
        {stillOpen ? " · still coming in" : ""}. Tap anything to download the original.
      </p>

      {messages.length > 0 && (
        <section className="guest-sec">
          <h2>Video messages</h2>
          <div className="guest-msgs">
            {messages.map((m) => (
              <figure key={m.id} className="guest-msg">
                <video src={m.viewUrl} controls playsInline preload="metadata" />
                <figcaption>{m.guest_name || "A guest"} <span>· {when(m.created_at)} · <a href={m.downloadUrl}>Download</a></span></figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      <section className="guest-sec">
        <h2>Photos &amp; videos</h2>
        {media.length === 0 && <p className="portal-empty">Nothing yet — the QR signs are working on it.</p>}
        <div className="guest-grid">
          {media.map((m) => (
            <a key={m.id} href={m.downloadUrl} className="guest-cell" title={`${m.guest_name || "A guest"} · ${when(m.created_at)}`}>
              {m.kind === "video" ? (
                <video src={m.viewUrl} muted playsInline preload="metadata" />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={m.viewUrl} alt="" loading="lazy" />
              )}
              <span className="guest-cell-name">{m.guest_name || "A guest"}{m.kind === "video" ? " · ▶" : ""}</span>
            </a>
          ))}
        </div>
      </section>
      <p className="guest-foot">Filmed by <Link href="/">Roth Media</Link>. Keep this link private — anyone with it can see everything here.</p>
    </main>
  );
}
