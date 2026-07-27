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
    default: "Roth Media — Video & Photography for Local Businesses",
    template: "%s — Roth Media",
  },
  description:
    "Short-form video and photography for local businesses. Content made to stop the scroll and bring customers through the door.",
  keywords: [
    "videographer for small business",
    "local business video",
    "short form video",
    "product photography",
    "brand photography",
    "content for local businesses",
  ],
  openGraph: {
    title: "Roth Media — Video & Photography for Local Businesses",
    description:
      "Short-form video and photography made to stop the scroll and bring customers through the door.",
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
