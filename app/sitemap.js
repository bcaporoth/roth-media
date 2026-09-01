const BASE = "https://rothmediaco.com";

export default function sitemap() {
  return [
    { url: `${BASE}/`, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/quote`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE}/promo`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.6 },
  ];
}
