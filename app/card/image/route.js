import { ImageResponse } from "next/og";
import QRCode from "qrcode";
import { CARD_QR_URL, OWNER_NAME, PHONE } from "../../../lib/site";

export const runtime = "nodejs";

// The business card as ONE picture, made to be saved into a phone's Photos
// (components/SaveCardButton.js). 2026-11-18, Brandon: people who scan his QR
// should be able to "go back into their phone and find my business card".
// A photo can't hold a link, so the phone number and the website are printed
// big and plain (phones let you tap text inside a photo) and the QR opens /card.
// Facts only on purpose: no slogans, no praise.
export async function GET() {
  const qr = await QRCode.toDataURL(CARD_QR_URL.replace("src=qr", "src=photo"), {
    width: 720,
    margin: 2,
    errorCorrectionLevel: "M",
    color: { dark: "#141416", light: "#ffffff" },
  });
  const ink = "#f4f4f2";
  const soft = "#a9a9ad";

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(180deg, #1d1d20 0%, #121214 100%)", color: ink, padding: "96px 80px 88px", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <svg width="54" height="70" viewBox="0 0 100 130">
            <path fillRule="evenodd" fill={ink} d="M16 122 V8 H56 a38 40 0 0 1 16.5 76 L97 122 H68 L47.5 84 H38 V122 Z M38 26 L74 50 L38 74 Z" />
          </svg>
          <div style={{ display: "flex", fontSize: 46, letterSpacing: 1 }}>Roth Media</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ display: "flex", fontSize: 104, fontWeight: 700, letterSpacing: -2 }}>{OWNER_NAME}</div>
          <div style={{ display: "flex", fontSize: 36, color: soft, marginTop: 14 }}>Video and photo · Waverly, NY</div>
          <div style={{ display: "flex", width: 120, height: 3, background: "#4fb06c", borderRadius: 3, margin: "44px 0 40px" }} />
          <div style={{ display: "flex", fontSize: 76, fontWeight: 700 }}>{PHONE}</div>
          <div style={{ display: "flex", fontSize: 64, marginTop: 20 }}>rothmediaco.com</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ display: "flex", padding: 14, background: "#ffffff", borderRadius: 28 }}>
            {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
            <img src={qr} width={340} height={340} />
          </div>
          <div style={{ display: "flex", fontSize: 32, color: soft, marginTop: 22 }}>Scan to open</div>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1350,
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
        "Content-Disposition": 'inline; filename="roth-media-card.png"',
      },
    }
  );
}
