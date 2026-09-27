import QRCode from "qrcode";
import PortalNav from "../../../../components/PortalNav";
import StudioShell from "../../../../components/StudioShell";
import StudioFooter from "../../../../components/StudioFooter";
import CardQrTools from "../../../../components/CardQrTools";
import { requireAdminPage } from "../../../../lib/admin-guard";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { newLeadCount } from "../../../../lib/studio-data";
import { CARD_QR_URL } from "../../../../lib/site";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Card & QR — Studio",
  robots: { index: false },
};

export default async function CardAdminPage() {
  const user = await requireAdminPage();
  const db = supabaseAdmin();
  const monthAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
  const [newCount, scans30, scansAll, cardLeads] = await Promise.all([
    newLeadCount(),
    db.from("site_events").select("id", { count: "exact", head: true })
      .eq("type", "pageview").eq("utm_source", "qr").eq("path", "/card").gte("created_at", monthAgo),
    db.from("site_events").select("id", { count: "exact", head: true })
      .eq("type", "pageview").eq("utm_source", "qr").eq("path", "/card"),
    db.from("submissions").select("id", { count: "exact", head: true }).eq("kind", "card"),
  ]);
  const svg = await QRCode.toString(CARD_QR_URL, {
    type: "svg",
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#191612", light: "#ffffff" },
  });

  return (
    <>
      <PortalNav email={user.email} isAdmin active="admin" />
      <StudioShell active="card" newCount={newCount} kick="Studio" title="Card & QR">
        <div className="astats">
          <div className="astat">
            <strong>{scans30.count ?? 0}</strong>
            <span>Scans · 30 days</span>
          </div>
          <div className="astat">
            <strong>{scansAll.count ?? 0}</strong>
            <span>Scans · all time</span>
          </div>
          <div className="astat">
            <strong>{cardLeads.count ?? 0}</strong>
            <span>Leads from the card</span>
          </div>
        </div>
        <CardQrTools url={CARD_QR_URL} svg={svg} />
      </StudioShell>
      <StudioFooter />
    </>
  );
}
