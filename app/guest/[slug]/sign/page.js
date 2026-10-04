import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { adminConfigured, supabaseAdmin } from "../../../../lib/supabase-admin";
import { SLUG_RE } from "../../../../lib/guest";
import { GuestSignView } from "../../../../components/ShareViews";

export const dynamic = "force-dynamic";
export const metadata = { title: "Print your QR sign", robots: { index: false } };

// Printable table card: 4x6 by default, ?big=1 for a full letter page.
export default async function GuestSignPage({ params, searchParams }) {
  const { slug } = await params;
  const sp = await searchParams;
  if (!adminConfigured || !SLUG_RE.test(slug)) notFound();
  const { data: ev } = await supabaseAdmin()
    .from("guest_events").select("slug, title").eq("slug", slug).maybeSingle();
  if (!ev) notFound();
  const url = `https://rothmediaco.com/guest/${ev.slug}`;
  const qr = await QRCode.toDataURL(url, { margin: 1, width: 900, color: { dark: "#191612", light: "#ffffff" } });
  const big = sp?.big === "1";
  return <GuestSignView ev={ev} qr={qr} url={url} big={big} />;
}
