import { Syne, Manrope } from "next/font/google";
import "./globals.css";
import "./tchart.css";
import SiteBeacon from "../components/SiteBeacon";
import StudioReturn from "../components/StudioReturn";
import MetaPixel from "../components/MetaPixel";

const syne = Syne({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-display",
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-body",
});

// Phones: the page is laid out for the screen, never pinch-zoomed (zooming
// made the Studio look choppy and let the page pan sideways). Everything
// that needs to be bigger is bigger in the CSS instead.
export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata = {
  metadataBase: new URL("https://rothmediaco.com"),
  title: {
    default:
      "Roth Media — Video, Photos & Ads for Local Businesses | Waverly, Elmira, Corning & the Twin Tiers",
    template: "%s — Roth Media",
  },
  description:
    "Video, photos and ads for local businesses, based in Waverly, NY. Content shot at your place and made to sell, Facebook and Instagram ads run for you, and event coverage across the Twin Tiers: Sayre, Athens, Elmira, Corning, Ithaca, Owego, Towanda, and Binghamton. Custom quotes with three options.",
  keywords: [
    "videographer Elmira NY",
    "videographer Binghamton NY",
    "videographer Corning NY",
    "business video Waverly NY",
    "social media content Twin Tiers",
    "Facebook ads local business Elmira",
    "event videographer Elmira NY",
    "brand video Sayre PA",
    "content creator Corning NY",
    "photographer Waverly NY",
  ],
  openGraph: {
    title: "Roth Media — Video, Photos & Ads for Local Businesses, Twin Tiers NY & PA",
    description:
      "Content that converts, not just views. Video, photos and ads for local businesses in Waverly, Sayre, Athens, Elmira, Corning, Ithaca, and Binghamton.",
    type: "website",
    images: ["/og-card.png"],
  },
};

// Meta domain verification — paste the code from Business Settings →
// Brand Safety → Domains into the Vercel env as META_DOMAIN_VERIFICATION.
const META_DOMAIN_VERIFICATION = process.env.META_DOMAIN_VERIFICATION || "";

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${syne.variable} ${manrope.variable}`}>
      <head>{META_DOMAIN_VERIFICATION ? <meta name="facebook-domain-verification" content={META_DOMAIN_VERIFICATION} /> : null}</head>
      <body>
        {children}
        <SiteBeacon />
        <StudioReturn />
        <MetaPixel />
        {/* Vercel Web Analytics — enable "Web Analytics" on the Vercel project once; no package needed. */}
        <script dangerouslySetInnerHTML={{ __html: "window.va=window.va||function(){(window.vaq=window.vaq||[]).push(arguments);};" }} />
        <script defer src="/_vercel/insights/script.js"></script>
      </body>
    </html>
  );
}
