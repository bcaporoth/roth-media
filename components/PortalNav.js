import Link from "next/link";
import BrandMark from "./BrandMark";

// The signed-in app bar — identical on every portal screen so the site
// behaves like an application: primary nav on the left, identity +
// Sign out always visible top-right, active page highlighted.
// On a phone (app/theme/portal.css) the tabs drop to a second row under
// the logo + Account + Sign out, so nothing overlaps at 375px.
// brand: the client has a brand palette — the home becomes their business
// home ("Home") and "Your brand" joins the tabs.

// Phone tab-bar icons (2026-11-09): 22px line drawings in the text color.
const ICONS = {
  home: <path d="M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-4.5v-5.5h-5V21H5a1 1 0 0 1-1-1z" />,
  photos: <><rect x="3.5" y="5" width="17" height="14" rx="2.5" /><circle cx="9" cy="10" r="1.6" /><path d="m4 17 5-4.5 3.5 3 3-2.5 4.5 4" /></>,
  brand: <><path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.2 0 1.8-.9 1.4-1.9-.5-1.2.3-2.4 1.6-2.4H17a3.5 3.5 0 0 0 3.5-3.5c0-5.2-3.8-9.2-8.5-9.2z" /><circle cx="7.8" cy="11" r="1.1" /><circle cx="10.5" cy="7.6" r="1.1" /><circle cx="14.8" cy="7.8" r="1.1" /></>,
  days: <><rect x="3.5" y="9" width="17" height="11" rx="2" /><path d="m3.8 9 15.6-4.2.6 2.3L4.4 11.3zM8.2 7.8l2.6 2.6M13 6.5l2.6 2.6" /></>,
  brief: <><rect x="5" y="4.5" width="14" height="16" rx="2" /><path d="M9 4.5V3.5h6v1M8.5 10h7M8.5 13.5h7M8.5 17h4" /></>,
  shop: <><path d="M5.5 8h13l-1 12h-11z" /><path d="M9 10V7a3 3 0 0 1 6 0v3" /></>,
  calendar: <><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>,
  studio: <><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></>,
  crew: <path d="M3.5 7a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" />,
};
const Ico = ({ name }) => (
  <svg className="pnav-ico" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {ICONS[name]}
  </svg>
);

export default function PortalNav({ email, isAdmin = false, isStaff = false, active = "", extra = null, brand = false }) {
  const cls = (key) => (active === key ? "pnav-link is-active" : "pnav-link");
  const biz = brand && !isAdmin && !isStaff;
  // One list of tabs, shown twice: in the top bar (desktop) and, on a phone,
  // as an app-style bar along the bottom with icons (app/theme/portal.css).
  const tabs = [
    isStaff
      ? { key: "crew", href: "/portal/crew", full: "My projects", short: "Projects", icon: "crew" }
      : { key: "galleries", href: isAdmin ? "/portal?galleries=1" : "/portal", full: biz ? "Home" : "Galleries", short: biz ? "Home" : "Galleries", icon: biz ? "home" : "photos" },
    biz && { key: "brand", href: "/portal/brand", full: "Your brand", short: "Brand", icon: "brand", title: "Your logo, colors, customers and goals" },
    biz && { key: "days", href: "/portal#days", full: "Shoot days", short: "Shoots", icon: "days", title: "The scripts we film from" },
    !isAdmin && !isStaff && !biz && { key: "brief", href: "/portal/brief", full: "Your brief", short: "Brief", icon: "brief", title: "Your shoot brief — the questions I plan the day from" },
    !isAdmin && !isStaff && { key: "shop", href: "/portal/shop", full: "Shop", short: "Shop", icon: "shop", title: "Packages and extras you can book — your cart, pay, or ask" },
    !isAdmin && !isStaff && { key: "calendar", href: "/portal/calendar", full: "Your calendar", short: "Calendar", icon: "calendar", title: "What's coming up at your business — I plan content around it" },
    isAdmin && { key: "admin", href: "/portal/admin/inbox", full: "Studio", short: "Studio", icon: "studio" },
  ].filter(Boolean);
  return (
    <>
    <nav className="rm-nav portal-nav portal-appbar" aria-label="Portal navigation">
      <Link href={isAdmin ? "/portal/admin" : isStaff ? "/portal/crew" : "/portal"} className="brand">
        <span className="brand-chip"><BrandMark /></span>
        <span className="brand-text">Roth <em>Media</em></span>
      </Link>
      <ul className="nav-links" role="list">
        {tabs.map((t) => (
          <li key={t.key} className="pnav-tab">
            <Link className={cls(t.key)} href={t.href} title={t.title} aria-current={active === t.key ? "page" : undefined}>
              {t.full}
            </Link>
          </li>
        ))}
        {extra}
        <li className="pnav-me">
          <Link
            className={"pnav-user" + (active === "account" ? " is-active" : "")}
            href="/portal/account"
            title="Settings: your details, password, card, addresses"
          >
            <span className="pnav-user-email">{email}</span>
            <span className="pnav-user-short">Settings</span>
          </Link>
        </li>
        <li className="pnav-me">
          <form action="/auth/signout" method="post">
            <button type="submit" className="portal-signout">
              Sign out
            </button>
          </form>
        </li>
      </ul>
    </nav>
    <nav className="pnav-bottom" aria-label="Pages">
      {tabs.map((t) => (
        <Link key={t.key} className={"pnav-bt" + (active === t.key ? " is-active" : "")} href={t.href} aria-current={active === t.key ? "page" : undefined}>
          <span className="pnav-bt-ico"><Ico name={t.icon} /></span>
          <span className="pnav-bt-label">{t.short}</span>
        </Link>
      ))}
    </nav>
    </>
  );
}
