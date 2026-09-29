"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { DESIGN_ACCENTS } from "../lib/design";
import { markAdminDevice } from "../lib/track";

// Shared frame for every Studio admin screen: the saved "Look" (light/dark
// + accent, same localStorage key as the galleries dashboard), the tab bar,
// and the flag that keeps the owner's own browsing out of the stats.

const LOOK_KEY = "rm-admin-look";

export const STUDIO_TABS = [
  { key: "inbox", label: "Inbox", href: "/portal/admin/inbox" },
  { key: "stats", label: "Stats", href: "/portal/admin/stats" },
  { key: "calendar", label: "Calendar", href: "/portal/admin/calendar" },
  { key: "galleries", label: "Galleries", href: "/portal/admin" },
  { key: "clients", label: "Clients", href: "/portal/admin/clients" },
  { key: "card", label: "Card & QR", href: "/portal/admin/card" },
  { key: "pay", label: "Payments", href: "/portal/admin/pay" },
];

export function StudioTabs({ active, newCount = 0 }) {
  const ref = useRef(null);
  useEffect(() => {
    markAdminDevice();
    // On a phone the tab row scrolls sideways — bring the current tab into view.
    const nav = ref.current;
    const on = nav?.querySelector(".stab.is-active");
    if (nav && on && nav.scrollWidth > nav.clientWidth) {
      const delta = on.getBoundingClientRect().left - nav.getBoundingClientRect().left;
      nav.scrollLeft += delta - (nav.clientWidth - on.offsetWidth) / 2;
    }
  }, []);
  return (
    <nav className="stabs" aria-label="Studio sections" ref={ref}>
      {STUDIO_TABS.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          className={"stab" + (active === t.key ? " is-active" : "")}
          aria-current={active === t.key ? "page" : undefined}
        >
          {t.label}
          {t.key === "inbox" && newCount > 0 && (
            <span className="stab-badge" aria-label={`${newCount} new`}>
              {newCount}
            </span>
          )}
        </Link>
      ))}
    </nav>
  );
}

export default function StudioShell({ active, newCount = 0, kick, title, children, wide = false }) {
  const [look, setLook] = useState({ mode: "light", accent: "clay" });

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(LOOK_KEY) || "null");
      if (saved)
        setLook({
          mode: saved.mode === "dark" ? "dark" : "light",
          accent: DESIGN_ACCENTS[saved.accent] ? saved.accent : "clay",
        });
    } catch {}
  }, []);

  const accent = DESIGN_ACCENTS[look.accent] || DESIGN_ACCENTS.clay;
  const style =
    look.accent !== "clay" ? { "--clay": accent.main, "--clay-soft": accent.soft } : undefined;

  return (
    <div className={"admin-shell" + (look.mode === "dark" ? " is-dark" : "")} style={style}>
      <main className={"admin-wrap" + (wide ? " admin-wrap-wide" : "")}>
        <StudioTabs active={active} newCount={newCount} />
        {kick && <div className="kick">{kick}</div>}
        {title && <h1>{title}</h1>}
        {children}
      </main>
    </div>
  );
}
