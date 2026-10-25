import Link from "next/link";
import BrandMark from "./BrandMark";

// The signed-in app bar — identical on every portal screen so the site
// behaves like an application: primary nav on the left, identity +
// Sign out always visible top-right, active page highlighted.
// On a phone (app/theme/portal.css) the tabs drop to a second row under
// the logo + Account + Sign out, so nothing overlaps at 375px.
// brand: the client has a brand palette — the home becomes their business
// home ("Home") and "Your brand" joins the tabs.

export default function PortalNav({ email, isAdmin = false, isStaff = false, active = "", extra = null, brand = false }) {
  const cls = (key) => (active === key ? "pnav-link is-active" : "pnav-link");
  const biz = brand && !isAdmin && !isStaff;
  return (
    <nav className="rm-nav portal-nav portal-appbar" aria-label="Portal navigation">
      <Link href={isAdmin ? "/portal/admin" : isStaff ? "/portal/crew" : "/portal"} className="brand">
        <span className="brand-chip"><BrandMark /></span>
        <span className="brand-text">Roth <em>Media</em></span>
      </Link>
      <ul className="nav-links" role="list">
        {isStaff ? (
          <li className="pnav-tab">
            <Link className={cls("crew")} href="/portal/crew" aria-current={active === "crew" ? "page" : undefined}>My projects</Link>
          </li>
        ) : (
          <li className="pnav-tab">
            <Link className={cls("galleries")} href={isAdmin ? "/portal?galleries=1" : "/portal"} aria-current={active === "galleries" ? "page" : undefined}>
              {biz ? "Home" : "Galleries"}
            </Link>
          </li>
        )}
        {biz && (
          <li className="pnav-tab">
            <Link className={cls("brand")} href="/portal/brand" title="Your logo, colors, customers and goals" aria-current={active === "brand" ? "page" : undefined}>
              Your brand
            </Link>
          </li>
        )}
        {biz && (
          <li className="pnav-tab">
            <Link className={cls("days")} href="/portal#days" title="The scripts we film from" aria-current={active === "days" ? "page" : undefined}>
              Shoot days
            </Link>
          </li>
        )}
        {!isAdmin && !isStaff && (
          <li className="pnav-tab">
            <Link className={cls("brief")} href="/portal/brief" title="Your shoot brief — the questions I plan the day from" aria-current={active === "brief" ? "page" : undefined}>
              Your brief
            </Link>
          </li>
        )}
        {isAdmin && (
          <li className="pnav-tab">
            <Link className={cls("admin")} href="/portal/admin/inbox">
              Studio
            </Link>
          </li>
        )}
        {extra}
        <li className="pnav-me">
          <Link
            className={"pnav-user" + (active === "account" ? " is-active" : "")}
            href="/portal/account"
            title="Your account & password"
          >
            <span className="pnav-user-email">{email}</span>
            <span className="pnav-user-short">Account</span>
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
  );
}
