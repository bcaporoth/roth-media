import { notFound } from "next/navigation";
import { GuestGalleryView } from "../../../../components/ShareViews";
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
  const stillOpen = new Date(ev.upload_open_until) > new Date();

  return <GuestGalleryView ev={ev} items={items} stillOpen={stillOpen} when={when} />;
}
