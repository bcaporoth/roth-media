// Giveaway settings — plain module so both server pages and client
// components can read it (a "use client" file can't export data to a
// server component).
export const PROMO = {
  prize: "a free Content Day",
  value: 1500,
  closesAt: "2026-09-14T23:59:59-04:00", // 11:59 PM ET, Sept 14 2026
  closesLabel: "Sunday, September 14",
  drawLabel: "Monday, September 15",
  tiktok: "https://www.tiktok.com/@coachcaporoth",
};
