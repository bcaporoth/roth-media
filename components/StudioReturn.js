"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { isAdminDevice } from "../lib/track";

// Brandon's way back: a floating "← Studio" pill on every page outside Studio,
// shown only on a device that has opened Studio (StudioShell marks it), so
// clients never see it. It returns to the exact Studio page he last had open.
const LAST_KEY = "rm-last-studio";

export default function StudioReturn() {
  const pathname = usePathname() || "";
  const [href, setHref] = useState(null);

  useEffect(() => {
    const inStudio = pathname.startsWith("/portal/admin");
    if (inStudio) {
      try {
        localStorage.setItem(LAST_KEY, pathname + window.location.search);
      } catch {}
      setHref(null);
      return;
    }
    if (!isAdminDevice()) return setHref(null);
    let last = "/portal/admin";
    try {
      const saved = localStorage.getItem(LAST_KEY);
      if (saved && saved.startsWith("/portal/admin")) last = saved;
    } catch {}
    setHref(last);
  }, [pathname]);

  if (!href) return null;
  return (
    <a className="studio-return" href={href} aria-label="Back to Studio">
      <span aria-hidden="true">←</span> Studio
    </a>
  );
}
