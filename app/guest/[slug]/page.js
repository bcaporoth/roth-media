import Link from "next/link";
import { notFound } from "next/navigation";
import BrandMark from "../../../components/BrandMark";
import GuestUpload from "../../../components/GuestUpload";
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
  return (
    <main className="guest-wrap">
      <Link href="/" className="brand guest-brand">
        <span className="brand-chip"><BrandMark /></span>
        <span className="brand-text">Roth <em>Media</em></span>
      </Link>
      <div className="kick">Guest photos</div>
      <h1>{ev.title}</h1>
      <p className="lead">Got a great shot today? Send it straight to the couple — pick from your camera roll, no app, no account. Photos, videos, or a quick message for them.</p>
      <GuestUpload slug={ev.slug} title={ev.title} open={isOpen(ev)} closesAt={fmt(ev.upload_open_until)} />
      <p className="guest-foot">Filmed by <Link href="/">Roth Media</Link> · <Link href="/privacy">Privacy</Link></p>
    </main>
  );
}
