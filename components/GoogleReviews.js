// "On Google" — the real reviews, on the pages where someone is deciding.
// Same words everywhere (lib/reviews.js); the kind just picks the order.

import { GOOGLE_RATING, REVIEWS_URL, reviewsFor } from "../lib/reviews";

export default function GoogleReviews({ kind = "", title = `${GOOGLE_RATING} on Google.`, kick = "On Google", max = 3, rule = true }) {
  const items = reviewsFor(kind, max);
  return (
    <section className={"cx-section cx-reviews" + (rule ? " cx-section--rule" : "")} id="reviews" aria-label="Google reviews">
      <div className="cx-wrap">
        <div className="cx-title cx-reveal">
          <p className="cx-kick">{kick}</p>
          <h2 className="cx-h2">{title}</h2>
        </div>
        <ul className="cx-reviews-list">
          {items.map((r) => (
            <li key={r.id} className="cx-card cx-reveal">
              <span className="cx-stars" aria-label="5 out of 5 stars">★★★★★</span>
              <blockquote>“{r.quote}”</blockquote>
              <cite>{r.name} · {r.who}</cite>
            </li>
          ))}
        </ul>
        <p className="cx-fine cx-reveal"><a className="cx-link cx-link--caps" href={REVIEWS_URL} target="_blank" rel="noopener noreferrer">Read them on Google ↗</a></p>
      </div>
    </section>
  );
}
