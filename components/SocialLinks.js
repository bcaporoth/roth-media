import { SOCIAL } from "../lib/site";

// Footer social row — plain links, opens in a new tab.
export default function SocialLinks() {
  return (
    <span className="foot-social" aria-label="Social links">
      {SOCIAL.map((s) => (
        <a key={s.id} href={s.url} target="_blank" rel="noopener noreferrer">{s.label}</a>
      ))}
    </span>
  );
}
