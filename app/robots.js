export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/portal", "/g/", "/api/", "/auth/"],
      },
    ],
    sitemap: "https://rothmediaco.com/sitemap.xml",
  };
}
