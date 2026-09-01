import { CITIES } from "../lib/cities";

const BASE = "https://rothmediaco.com";

export default function sitemap() {
  return [
    { url: `${BASE}/`, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/weddings`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE}/business`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE}/quote`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE}/promo`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.6 },
    ...CITIES.map((c) => ({ url: `${BASE}/${c.slug}`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 })),
    { url: `${BASE}/privacy`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE}/terms`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.2 },
  ];
}
