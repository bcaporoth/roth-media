// The story line: the hero's-journey beats as a curve across the film,
// each at its % mark with how high or low the story sits there (y: 0 = the
// peak, 1 = the floor). Brandon writes into each beat on the project page;
// `short`/`side` place the label on the chart; `example` is what that beat looks like in a church documentary, as a
// placeholder, so the shape is never a blank.
export const ARC_BEATS = [
  { key: "status_quo", short: "Status quo", side: "above", label: "Status quo", pct: 0, y: 0.86, tip: "The world before anything happens. Normal life, the way it's always been.", example: "Corning, a glass town with five Catholic parishes. Sunday looked the same for a hundred years — bells at eight, pews full, the same families in the same rows." },
  { key: "inciting", short: "Inciting incident", side: "below", label: "Inciting incident", pct: 12, y: 0.8, tip: "The thing that breaks normal. Usually outside the hero's control.", example: "The diocese letter: fewer priests, fewer people, parishes will merge. St. Patrick's closes first." },
  { key: "debate", short: "Decision", side: "above", label: "Debate → decision", pct: 22, y: 0.7, tip: "Should we fight this? Someone chooses to act — and commits.", example: "A parish council meeting that runs past midnight. Someone (THE KEEPER) says: not this one. They start the campaign / the capital drive / the fight." },
  { key: "rising", short: "Rising", side: "above", label: "Bumpy ride up", pct: 36, y: 0.48, tip: "Trying things. Small wins, small losses. Allies and obstacles appear.", example: "Fish fries, a restored roof, a young priest arrives, a few families come back — and a few more leave. The numbers barely move." },
  { key: "midpoint", short: "Midpoint", side: "below", label: "Midpoint", pct: 50, y: 0.24, tip: "A false high or a big reveal. The stakes get bigger; there's no going back.", example: "The bishop visits / a feast day fills the church for the first time in years. It feels won — but the debt / the shortage / the merger plan is still there." },
  { key: "falling", short: "Unravels", side: "below", label: "Bumpy ride down", pct: 60, y: 0.42, tip: "Things unravel. What worked stops working.", example: "The pastor is reassigned. Attendance slides again. The other churches' closures make the town assume St. Mary's is next." },
  { key: "catalyst", short: "Catalyst", side: "below", label: "Catalyst", pct: 68, y: 0.64, tip: "A new piece of information or event forces the final push.", example: "The deadline: a date by which the parish must prove it's viable — or a fire, a death, a decision from Rochester." },
  { key: "crisis", short: "Crisis", side: "below", label: "Dark night / crisis", pct: 80, y: 0.08, tip: "The lowest low dressed as the highest tension. Everything on the line.", example: "The night before the decision. The empty nave at 6am. THE WITNESS tells you what they thought was about to be lost." },
  { key: "clarity", short: "Last stand", side: "above", label: "Clarity → last stand", pct: 88, y: 0.3, tip: "The hero understands what it was really about and acts on it.", example: "It was never about the building. The final push — the whole town shows up, Catholic or not." },
  { key: "resolution", short: "Resolution", side: "below", label: "Resolution", pct: 95, y: 0.5, tip: "The outcome. Won, lost, or changed.", example: "The church stays open. What it cost. Who's gone." },
  { key: "new_world", short: "New world", side: "above", label: "New world", pct: 100, y: 0.58, tip: "Normal again — but different. Echo the opening image, changed.", example: "Sunday at eight. Bells. Full pews — different faces. A baptism. The inheritor's line." },
];
export const ARC_KEYS = ARC_BEATS.map((b) => b.key);
