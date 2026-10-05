// robots.txt — the public pages are open to search engines and to AI
// assistants' crawlers alike; client galleries, the portal, auth, and the
// API stay out. Naming the AI crawlers is deliberate: it says plainly that
// they are welcome to read the site and quote its prices and service area.
const PRIVATE = ["/portal", "/g/", "/api/", "/auth/", "/pay/", "/billing/", "/guest/", "/welcome/", "/unsubscribe"];

const AI_CRAWLERS = [
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot",
  "Applebot-Extended",
  "Bingbot",
  "DuckDuckBot",
  "Meta-ExternalAgent",
];

export default function robots() {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE },
      ...AI_CRAWLERS.map((userAgent) => ({ userAgent, allow: "/", disallow: PRIVATE })),
    ],
    sitemap: "https://rothmediaco.com/sitemap.xml",
    host: "https://rothmediaco.com",
  };
}
