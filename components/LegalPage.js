import { Children, cloneElement, isValidElement } from "react";
import "../app/theme/misc.css";
import SiteNav from "./SiteNav";
import SiteFooter from "./SiteFooter";
import Reveal from "./Reveal";
import { EMAIL } from "../lib/site";

const PHONE = "845-549-4425";

// The Cinema document page — legal pages, the welcome packet, the partner pages, unsubscribe.
//   <LegalPage kick title updated>…</LegalPage>      long-form copy in a calm reading column
//   toc    — builds an "On this page" list from the <h2>s (privacy, terms)
//   photo  — { src, alt }: a real photo behind the title
//   plain  — children lay themselves out (forms, reports) instead of the prose column
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export default function LegalPage({ kick, title, updated, children, toc = false, photo = null, plain = false }) {
  // Give each plain-text <h2> an id so the contents list can jump to it.
  const heads = [];
  const body = toc
    ? Children.map(children, (c) => {
        if (isValidElement(c) && c.type === "h2" && typeof c.props.children === "string") {
          const id = slug(c.props.children);
          heads.push([id, c.props.children]);
          return cloneElement(c, { id });
        }
        return c;
      })
    : children;
  const hasToc = toc && heads.length > 2;

  const head = (
    <>
      <p className="cx-kick">{kick}</p>
      <h1 className="cx-h1 cx-h1--long">{title}</h1>
      <p className="cx-lede">{updated ? `Last updated ${updated}. ` : ""}Questions? Email <a href={`mailto:${EMAIL}`}>{EMAIL}</a> or text {PHONE}.</p>
    </>
  );

  return (
    <>
      <SiteNav overHero={Boolean(photo)} />
      <main className={"cx-page cx-page--hero mx-page mx-doc" + (hasToc ? " mx-doc--toc" : "")}>
        <Reveal />
        {photo ? (
          <header className="cx-hero cx-hero--short mx-doc-hero mx-doc-head">
            <div className="cx-hero-media">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.src} alt={photo.alt} />
            </div>
            <div className="cx-hero-shade" />
            <div className="cx-wrap cx-wrap--mid cx-hero-body">{head}</div>
          </header>
        ) : (
          <header className="cx-hero cx-hero--plain mx-doc-head">
            <div className="cx-wrap cx-wrap--mid cx-hero-body">{head}</div>
          </header>
        )}

        <div className="mx-doc-body">
          <div className="cx-wrap cx-wrap--mid mx-doc-cols">
            {hasToc && (
              <nav className="mx-toc-side" aria-label="On this page">
                <p className="cx-kick">On this page</p>
                <ol>{heads.map(([id, t]) => <li key={id}><a href={`#${id}`}>{t}</a></li>)}</ol>
              </nav>
            )}
            <div>
              {hasToc && (
                <details className="mx-toc">
                  <summary>On this page</summary>
                  <ol>{heads.map(([id, t]) => <li key={id}><a href={`#${id}`}>{t}</a></li>)}</ol>
                </details>
              )}
              {plain ? <div className="mx-doc-plain">{body}</div> : <article className="cx-prose mx-prose">{body}</article>}
            </div>
          </div>
        </div>
      </main>
      <SiteFooter slim />
    </>
  );
}
