// Wedding-film campaign settings — "still need a videographer this year?
// / lock next year's date now". Edit here; the /weddings/open-dates page and
// the homepage read from it. There are no campaign codes any more: the page
// shows whatever site-wide deal is live (lib/deals.js) or the plain price.

export const CAMPAIGN = {
  // 2027-at-this-year's-prices holds through this date.
  endsAt: "2026-12-31T23:59:59-05:00",
  endsLabel: "December 31",

  // This year — the dates still open. Keep it honest and short; scarcity
  // only works when it's true. Remove a date the moment it books.
  openDates2026: [
    "Sat Oct 17",
    "Sat Oct 24",
    "Sat Nov 7",
    "Sat Nov 14",
    "Sat Dec 5",
  ],

  areaLine: "Waverly · Sayre · Elmira · Corning · Ithaca · Binghamton · Towanda — travel included within an hour of Corning, Waverly, Sayre, or Athens.",
};
