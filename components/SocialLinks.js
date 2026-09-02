import { SOCIAL, REVIEW_URL } from "../lib/site";

// Footer social row — plain links, opens in a new tab. The Google review
// link rides along once REVIEW_URL is set.
export default function SocialLinks() {
  return (
    <span className="foot-social" aria-label="Social links">
      {SOCIAL.map((s) => (
        <a key={s.id} href={s.url} target="_blank" rel="noopener noreferrer">{s.label}</a>
      ))}
      {REVIEW_URL && (
        <a href={REVIEW_URL} target="_blank" rel="noopener noreferrer">
          ★ Review us
        </a>
      )}
    </span>
  );
}
