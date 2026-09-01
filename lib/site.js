// Contact + social identity — one place for the footer, the schema, and
// the promo page. Plain module so server pages can import it.
export const EMAIL = "brandon@rothventures.co";
export const SOCIAL = [
  { id: "tiktok", label: "TikTok", url: "https://www.tiktok.com/@coachcaporoth" },
  { id: "instagram", label: "Instagram", url: "https://www.instagram.com/caporoth" },
  { id: "facebook", label: "Facebook", url: "https://www.facebook.com/brandon.caporoth" },
];
export const SAME_AS = SOCIAL.map((s) => s.url);
