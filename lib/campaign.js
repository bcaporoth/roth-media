// Wedding-film campaign settings — "still need a videographer this year?
// / lock next year's date now". Edit here; the /weddings/open-dates page,
// the ad copy, and the quote flow read from it. The codes are applied on the
// site by lib/deals.js (biggest deal wins — the launch special beats them
// through October).

export const CAMPAIGN = {
  active: true,
  // Paused through the launch special (33% beats these codes) — opens Nov 1.
  startsAt: "2026-11-01T00:00:00-04:00",
  startsLabel: "November 1",
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
  thisYear: {
    code: "LASTMINUTE25",
    percent: 25,
    blurb: "Any open 2026 date, 25% off Wedding Videography. Book it online and the date's yours tonight.",
  },

  // Next year — reserve 2027 at 2026 pricing plus a code.
  nextYear: {
    code: "EARLY2027",
    percent: 15,
    blurb: "Reserve any 2027 date before December 31 at this year's prices, 15% off. The 30% retainer holds it; balance isn't due until two weeks before.",
  },

  areaLine: "Waverly · Sayre · Elmira · Corning · Ithaca · Binghamton · Towanda — travel included within an hour of Corning, Waverly, Sayre, or Athens.",
};
