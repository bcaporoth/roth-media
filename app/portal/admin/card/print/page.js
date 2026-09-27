import QRCode from "qrcode";
import BrandMark from "../../../../../components/BrandMark";
import { requireAdminPage } from "../../../../../lib/admin-guard";
import { CARD_QR_URL, EMAIL, OWNER_NAME, PHONE } from "../../../../../lib/site";

export const dynamic = "force-dynamic";
export const metadata = { title: "Business card — print", robots: { index: false } };

// Standard US business card, 3.5 × 2 in, front + back as two pages.
// Print → Save as PDF gives a file any print shop (or Vistaprint) takes.
export default async function CardPrintPage() {
  await requireAdminPage();
  const qr = await QRCode.toString(CARD_QR_URL, {
    type: "svg",
    margin: 0,
    errorCorrectionLevel: "M",
    color: { dark: "#191612", light: "#00000000" },
  });

  return (
    <div className="bprint">
      <style>{`@media print { @page { size: 3.5in 2in; margin: 0; } }`}</style>
      <p className="bprint-note no-print">
        Standard 3.5 × 2 in business card — front, then back. Press ⌘P / Ctrl+P → &ldquo;Save as
        PDF&rdquo; for a print shop, or print on card stock (margins: none, scale: 100%).
      </p>

      <section className="bprint-card bprint-front">
        <div className="bprint-brand">
          <span className="bprint-mark"><BrandMark /></span>
          <span>Roth <em>Media</em></span>
        </div>
        <div className="bprint-who">
          <strong>{OWNER_NAME}</strong>
          <span>Videography &amp; Photography</span>
        </div>
        <div className="bprint-contact">
          <span>{PHONE}</span>
          <span>{EMAIL}</span>
          <span>rothmediaco.com</span>
        </div>
      </section>

      <section className="bprint-card bprint-back">
        <div className="bprint-qr" dangerouslySetInnerHTML={{ __html: qr }} />
        <div className="bprint-back-copy">
          <strong>Scan me</strong>
          <span>Save my contact, get an instant quote, or book a call.</span>
          <em>Weddings · Families · Local business</em>
          <span className="bprint-area">Twin Tiers NY/PA</span>
        </div>
      </section>
    </div>
  );
}
