import { notFound } from "next/navigation";
import { GuestUploadView } from "../../../components/ShareViews";
import { adminConfigured, supabaseAdmin } from "../../../lib/supabase-admin";
import { r2Configured } from "../../../lib/r2";
import { SLUG_RE, isOpen } from "../../../lib/guest";

export const dynamic = "force-dynamic";

async function load(slug) {
  if (!adminConfigured || !r2Configured || !SLUG_RE.test(slug)) return null;
  const { data } = await supabaseAdmin()
    .from("guest_events")
    .select("id, slug, title, event_date, upload_open_until")
    .eq("slug", slug)
    .maybeSingle();
  return data || null;
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const ev = await load(slug);
  return {
    title: ev ? `Share your photos — ${ev.title}` : "Share your photos",
    description: "Scan, pick from your camera roll, done. No app needed.",
    robots: { index: false },
  };
}

const fmt = (d) => new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "America/New_York" });

// Public guest upload page — the QR on the table points here.
export default async function GuestPage({ params }) {
  const { slug } = await params;
  const ev = await load(slug);
  if (!ev) notFound();
  return <GuestUploadView ev={ev} open={isOpen(ev)} closesAt={fmt(ev.upload_open_until)} />;
}
