// The top of every client portal page (2026-11-08, Brandon: "the header
// should remain consistent"): the same kicker + their name on every page
// (Home, Calendar, Shop, Brief, Brand), then the page's own name smaller
// underneath. who = lib/portal-who.js portalWho().
export default function PortalTop({ who, page = "", lede = null }) {
  return (
    <header className="cx-wrap pt-head pt-top">
      <p className="cx-kick">{who.kick}</p>
      {page ? <p className="cx-h1 cx-h1--long pt-top-name">{who.title}</p> : <h1 className="cx-h1 cx-h1--long">{who.title}</h1>}
      {page && <h1 className="pt-top-page">{page}</h1>}
      {lede && <p className="cx-lede">{lede}</p>}
    </header>
  );
}
