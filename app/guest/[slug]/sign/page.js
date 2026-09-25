import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { adminConfigured, supabaseAdmin } from "../../../../lib/supabase-admin";
import { SLUG_RE } from "../../../../lib/guest";

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
  return (
    <div className={"gsign" + (big ? " gsign-big" : "")}>
      <div className="gsign-card">
        <div className="gsign-kick">Got a great shot?</div>
        <h1 className="gsign-title">Share your photos<br />with {ev.title.replace(/ wedding$/i, "")}</h1>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qr} alt={`QR code for ${url}`} className="gsign-qr" />
        <p className="gsign-how">Scan with your camera · pick from your camera roll · done.<br />No app. Videos and 60-second messages welcome.</p>
        <p className="gsign-url">{url.replace("https://", "")}</p>
        <p className="gsign-credit">Photos &amp; film by Roth Media</p>
      </div>
      <p className="gsign-print no-print">
        Print this page — it&apos;s sized 4×6. <a href={`/guest/${ev.slug}/sign?big=1`}>Full-page version</a> · Press ⌘P / Ctrl+P.
      </p>
    </div>
  );
}
