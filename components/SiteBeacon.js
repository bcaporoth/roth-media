"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { beacon, readUtm } from "../lib/track";

// Sends one pageview per route change to /api/t. Skips the portal, and
// skips entirely on any device where the owner has opened Studio admin.
export default function SiteBeacon() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || /^\/(portal|auth)(\/|$)/.test(pathname)) return;
    beacon({
      type: "pageview",
      path: pathname,
      referrer: document.referrer,
      utm: readUtm(),
    });
  }, [pathname]);

  return null;
}
