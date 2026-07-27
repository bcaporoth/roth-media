import { Archivo, Space_Grotesk } from "next/font/google";
import "./globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-display",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-body",
});

export const metadata = {
  metadataBase: new URL("https://rothmediaco.com"),
  title: {
    default:
      "Roth Media — Video & Photography for Local Businesses | Waverly, Elmira & Corning NY",
    template: "%s — Roth Media",
  },
  description:
    "Short-form video, brand content, and photography for local businesses in the Twin Tiers — Waverly, Athens, Sayre, Elmira, and Corning. Brand video from $450, photography from $350.",
  keywords: [
    "videographer Elmira NY",
    "videographer Corning NY",
    "video for local business Twin Tiers",
    "brand photography Waverly NY",
    "product photography Elmira",
    "short form video Sayre PA",
    "commercial photographer Athens PA",
  ],
  openGraph: {
    title: "Roth Media — Video & Photography for Local Businesses",
    description:
      "Short-form video and photography made to stop the scroll and bring customers through the door. Serving the Twin Tiers: Waverly, Athens, Sayre, Elmira & Corning.",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${archivo.variable} ${spaceGrotesk.variable}`}>
      <body>{children}</body>
    </html>
  );
}
