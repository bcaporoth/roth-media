import { Syne, Manrope } from "next/font/google";
import "./globals.css";
import SiteBeacon from "../components/SiteBeacon";
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

export const metadata = {
  metadataBase: new URL("https://rothmediaco.com"),
  title: {
    default:
      "Roth Media — Photographer & Videographer | Waverly, Elmira, Corning & the Twin Tiers",
    template: "%s — Roth Media",
  },
  description:
    "Photographer and videographer based in Waverly, NY — wedding films and photography, brand video for local businesses, events, and portraits across the Twin Tiers: Sayre, Athens, Elmira, Corning, Ithaca, Owego, Towanda, and Binghamton. Real prices, instant quotes.",
  keywords: [
    "photographer Elmira NY",
    "wedding photographer Elmira NY",
    "photographer Binghamton NY",
    "videographer Binghamton NY",
    "wedding photographer Corning NY",
    "photographer Sayre PA",
    "videographer Elmira NY",
    "videographer Corning NY",
    "wedding videographer Twin Tiers",
    "brand video Waverly NY",
    "wedding photographer Sayre PA",
    "senior photos Athens PA",
    "photographer Waverly NY",
  ],
  openGraph: {
    title: "Roth Media — Photographer & Videographer, Twin Tiers NY & PA",
    description:
      "Wedding films and photography, brand video for local businesses, events, and portraits — Waverly, Sayre, Athens, Elmira, Corning, Ithaca, and Binghamton. Real prices, instant quotes.",
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
        <MetaPixel />
        {/* Vercel Web Analytics — enable "Web Analytics" on the Vercel project once; no package needed. */}
        <script dangerouslySetInnerHTML={{ __html: "window.va=window.va||function(){(window.vaq=window.vaq||[]).push(arguments);};" }} />
        <script defer src="/_vercel/insights/script.js"></script>
      </body>
    </html>
  );
}
