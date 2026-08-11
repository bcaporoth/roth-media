import Link from "next/link";
import BrandMark from "./BrandMark";

// The signed-in app bar — identical on every portal screen so the site
// behaves like an application: primary nav on the left, identity +
// Sign out always visible top-right, active page highlighted.

export default function PortalNav({ email, isAdmin = false, active = "", extra = null }) {
  const cls = (key) => (active === key ? "pnav-link is-active" : "pnav-link");
  return (
    <nav className="rm-nav portal-nav portal-appbar" aria-label="Portal navigation">
      <Link href="/portal" className="brand">
        <span className="brand-chip"><BrandMark /></span>
        <span className="brand-text">Roth <em>Media</em></span>
      </Link>
      <ul className="nav-links">
        <li>
          <Link className={cls("galleries")} href="/portal">
            Galleries
          </Link>
        </li>
        {isAdmin && (
          <li>
            <Link className={cls("admin")} href="/portal/admin">
              Studio admin
            </Link>
          </li>
        )}
        {extra}
        <li>
          <Link
            className={"pnav-user" + (active === "account" ? " is-active" : "")}
            href="/portal/account"
            title="Your account & password"
          >
            <span className="pnav-user-email">{email}</span>
            <span className="pnav-user-short">Account</span>
          </Link>
        </li>
        <li>
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
