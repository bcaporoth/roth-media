import { Syne, Manrope } from "next/font/google";
import "./globals.css";

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
      "Roth Media — Videography & Photography | Waverly, Elmira & Corning NY",
    template: "%s — Roth Media",
  },
  description:
    "Cinematic videography and candid photography for the Twin Tiers — Waverly, Athens, Sayre, Elmira, and Corning. Weddings, brands, seniors, and events. Real prices, instant quotes.",
  keywords: [
    "videographer Elmira NY",
    "videographer Corning NY",
    "wedding videographer Twin Tiers",
    "brand video Waverly NY",
    "wedding photographer Sayre PA",
    "senior photos Athens PA",
    "photographer Waverly NY",
  ],
  openGraph: {
    title: "Roth Media — Videography & Photography",
    description:
      "Cinematic video and candid photography for the Twin Tiers. Real prices, instant quotes.",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${syne.variable} ${manrope.variable}`}>
      <body>{children}</body>
    </html>
  );
}
