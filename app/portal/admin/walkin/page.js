import QRCode from "qrcode";
import PortalNav from "../../../../components/PortalNav";
import StudioShell from "../../../../components/StudioShell";
import StudioFooter from "../../../../components/StudioFooter";
import CopyButton from "../../../../components/CopyButton";
import { requireAdminPage } from "../../../../lib/admin-guard";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { newLeadCount } from "../../../../lib/studio-data";
import { walkinUrl, WALKIN_GIFT } from "../../../../lib/walkin";
import "../../../theme/walkin.css";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Walk-in — Studio",
  robots: { index: false },
};

// Studio → More → Walk-in (lib/walkin.js). One code on the screen: hold the
// phone up, the owner scans it and taps "I walked in".
export default async function WalkinAdminPage() {
  const user = await requireAdminPage();
  const db = supabaseAdmin();
  const url = walkinUrl();
  const [newCount, walkins, svg] = await Promise.all([
    newLeadCount(),
    db.from("submissions").select("id", { count: "exact", head: true }).eq("kind", "walkin"),
    QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#191612", light: "#ffffff" } }),
  ]);
  const n = walkins.count ?? 0;

  return (
    <>
      <PortalNav email={user.email} isAdmin active="admin" />
      <StudioShell active="walkin" newCount={newCount} kick="Studio" title="Walk-in">
        <section className="wk-studio" aria-label="Walk-in QR code">
          <div className="wk-studio-code" dangerouslySetInnerHTML={{ __html: svg }} role="img" aria-label="Walk-in QR code" />
          <div className="wk-studio-side">
            <p className="inbox-hint">
              Show this to the owner. They scan it, type their name, business and email, and tap
              &ldquo;I walked in&rdquo;. They land signed in on their portal with an empty gallery,
              a ${WALKIN_GIFT} gift card for them and a ${WALKIN_GIFT} card to pass to a friend.
              They show up in Clients and the Inbox as a walk-in, ready for your upload.
            </p>
            <p className="inbox-hint"><strong>{n}</strong> walk-in{n === 1 ? "" : "s"} so far.</p>
            <div className="gcard-actions">
              <a className="abtn" href="/portal/admin/clients">Open Clients</a>
              <CopyButton className="achip" text={url} label="Copy link" done="Copied ✓" />
              <a className="abtn abtn-ghost" href={url} target="_blank" rel="noreferrer">Preview their page ↗</a>
            </div>
          </div>
        </section>
      </StudioShell>
      <StudioFooter />
    </>
  );
}
