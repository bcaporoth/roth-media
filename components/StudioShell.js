"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { DESIGN_ACCENTS } from "../lib/design";
import { markAdminDevice } from "../lib/track";
// Every Studio screen's extra styles — imported here once, for all of them.
import "../app/portal/admin/studio.css";

// Shared frame for every Studio admin screen: the saved "Look" (light/dark
// + accent, kept per device in localStorage), the tab bar, the sub-links for
// the section you're in, and the flag that keeps the owner's own browsing out
// of the stats.

// "-2": the Oct 2026 refresh made dark the default, so an old saved "light" from
// before the refresh no longer applies. Picking Light again in Look is remembered.
const LOOK_KEY = "rm-admin-look-2";

// Seven tabs that fit a phone. A tab with `subs` shows them as a second row
// while you're inside it. `key` in a sub is the `active` name its page passes
// to StudioShell — every page keeps the URL and the `active` it always had.
export const STUDIO_TABS = [
  { key: "today", label: "Today", href: "/portal/admin/today" },
  { key: "inbox", label: "Inbox", href: "/portal/admin/inbox" },
  { key: "clients", label: "Clients", href: "/portal/admin/clients" },
  {
    key: "shoots",
    label: "Shoots",
    href: "/portal/admin/shoots",
    subs: [
      { key: "shoots", label: "List", href: "/portal/admin/shoots" },
      { key: "calendar", label: "Month", href: "/portal/admin/calendar" },
      { key: "playbook", label: "Playbook", href: "/portal/admin/playbook" },
    ],
  },
  { key: "galleries", label: "Galleries", href: "/portal/admin" },
  {
    key: "money",
    label: "Money",
    href: "/portal/admin/pay",
    subs: [
      { key: "pay", label: "Payments", href: "/portal/admin/pay" },
      { key: "partners", label: "Partners", href: "/portal/admin/partners" },
    ],
  },
  {
    key: "more",
    label: "More",
    href: "/portal/admin/stats",
    subs: [
      { key: "stats", label: "Stats", href: "/portal/admin/stats" },
      { key: "card", label: "Card & QR", href: "/portal/admin/card" },
      { key: "look", label: "✦ Look", look: true },
    ],
  },
];

// Which tab a page's `active` name belongs to ("pay" → Money, "stats" → More…).
export function tabFor(active) {
  return STUDIO_TABS.find((t) => t.key === active || (t.subs || []).some((s) => s.key === active)) || null;
}

export function StudioTabs({ active, newCount = 0, lookOpen = false, onLook = null }) {
  const ref = useRef(null);
  const tab = tabFor(active);
  useEffect(() => {
    markAdminDevice();
    // If the row ever has to scroll sideways, bring the current tab into view.
    const nav = ref.current;
    const on = nav?.querySelector(".stab.is-active");
    if (nav && on && nav.scrollWidth > nav.clientWidth) {
      const delta = on.getBoundingClientRect().left - nav.getBoundingClientRect().left;
      nav.scrollLeft += delta - (nav.clientWidth - on.offsetWidth) / 2;
    }
  }, []);
  const subs = (tab?.subs || []).filter((s) => !s.look || onLook);
  return (
    <>
      <nav className={"stabs stabs-7" + (subs.length ? " has-subs" : "")} aria-label="Studio sections" ref={ref}>
        {STUDIO_TABS.map((t) => (
          <Link
            key={t.key}
            href={t.href}
            className={"stab" + (tab?.key === t.key ? " is-active" : "")}
            aria-current={tab?.key === t.key ? (t.key === active ? "page" : "true") : undefined}
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
      {subs.length > 0 && (
        <nav className="ssubs" aria-label={`${tab.label} pages`}>
          {subs.map((s) =>
            s.look ? (
              <button
                key={s.key}
                type="button"
                className={"ssub ssub-look" + (lookOpen ? " is-active" : "")}
                aria-expanded={lookOpen}
                onClick={onLook}
              >
                {s.label}
              </button>
            ) : (
              <Link
                key={s.key}
                href={s.href}
                className={"ssub" + (s.key === active ? " is-active" : "")}
                aria-current={s.key === active ? "page" : undefined}
              >
                {s.label}
              </Link>
            )
          )}
        </nav>
      )}
    </>
  );
}

// Light/dark + accent picker. Saved on this device only; clients never see it.
function LookPanel({ look, onChange }) {
  return (
    <div className="alook-panel">
      <div className="design-group">
        <strong>Mood</strong>
        <div className="design-modes">
          {["light", "dark"].map((m) => (
            <button
              key={m}
              type="button"
              className={"design-mode" + (look.mode === m ? " is-on" : "")}
              aria-pressed={look.mode === m}
              onClick={() => onChange({ mode: m })}
            >
              <span
                className="design-mode-chip"
                style={{
                  background: m === "dark" ? "#191612" : "#f4efe6",
                  borderColor: m === "dark" ? "#b4a894" : "#6b6358",
                }}
              />
              {m === "dark" ? "Dark" : "Light"}
            </button>
          ))}
        </div>
      </div>
      <div className="design-group">
        <strong>Accent</strong>
        <div className="design-accents">
          {Object.entries(DESIGN_ACCENTS).map(([key, a]) => (
            <button
              key={key}
              type="button"
              title={a.label}
              aria-label={`Accent: ${a.label}`}
              aria-pressed={look.accent === key}
              className={"design-accent" + (look.accent === key ? " is-on" : "")}
              style={{ background: a.main }}
              onClick={() => onChange({ accent: key })}
            />
          ))}
        </div>
      </div>
      <p className="alook-hint">Just for you — saved on this device, clients never see it.</p>
    </div>
  );
}

export default function StudioShell({ active, newCount = 0, kick, title, children, wide = false }) {
  const [look, setLook] = useState({ mode: "dark", accent: "clay" }); // dark by default, to match the site; Look → Light switches back
  const [lookOpen, setLookOpen] = useState(false);

  // Restore the saved look after mount (avoids an SSR hydration mismatch).
  // "#look" on any More page opens the picker straight away.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(LOOK_KEY) || "null");
      if (saved)
        setLook({
          mode: saved.mode === "dark" ? "dark" : "light",
          accent: DESIGN_ACCENTS[saved.accent] ? saved.accent : "clay",
        });
    } catch {}
    try {
      if (window.location.hash === "#look") setLookOpen(true);
    } catch {}
  }, []);

  function setLookPart(part) {
    setLook((l) => {
      const next = { ...l, ...part };
      try {
        localStorage.setItem(LOOK_KEY, JSON.stringify(next));
      } catch {
        /* private mode — the look just lasts for this visit */
      }
      return next;
    });
  }

  const accent = DESIGN_ACCENTS[look.accent] || DESIGN_ACCENTS.clay;
  const style =
    look.accent !== "clay" ? { "--clay": accent.main, "--clay-soft": accent.soft } : undefined;

  return (
    <div className={"admin-shell" + (look.mode === "dark" ? " is-dark" : "")} style={style}>
      <main className={"admin-wrap" + (wide ? " admin-wrap-wide" : "")}>
        <StudioTabs active={active} newCount={newCount} lookOpen={lookOpen} onLook={() => setLookOpen((v) => !v)} />
        {lookOpen && <LookPanel look={look} onChange={setLookPart} />}
        {kick && <div className="kick">{kick}</div>}
        {title && <h1>{title}</h1>}
        {children}
      </main>
    </div>
  );
}
