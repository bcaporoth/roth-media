"use client";

import { track } from "../lib/track";

// A business-card button that counts its taps in Studio stats.
export default function CardLink({ href, event, external = false, className, children }) {
  return (
    <a
      className={className}
      href={href}
      onClick={() => track(event)}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {children}
    </a>
  );
}
