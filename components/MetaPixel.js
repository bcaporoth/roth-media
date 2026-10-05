"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";
import { PIXEL_ID, pixelPageView } from "../lib/meta-pixel";
import { isAdminDevice } from "../lib/track";

// Loads the Meta Pixel once NEXT_PUBLIC_META_PIXEL_ID is set, and sends a
// PageView per route change. Skips the client portal and the owner's own
// device, same as SiteBeacon.
export default function MetaPixel() {
  const pathname = usePathname();
  const skip = !PIXEL_ID || !pathname || /^\/(portal|auth|g|guest)(\/|$)/.test(pathname);

  useEffect(() => {
    if (skip || isAdminDevice()) return;
    pixelPageView();
  }, [pathname, skip]);

  if (!PIXEL_ID) return null;
  return (
    <Script id="meta-pixel" strategy="afterInteractive">
      {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${PIXEL_ID}');`}
    </Script>
  );
}
