"use client";

// The "Add-ons you're interested in" question as tap-to-pick cards (2026-11-08,
// Brandon: "an add-on section with clickables"). Pulls the live menu from
// lib/packages.js (no hidden or per-package variants), shows each one's price
// and what you get, and a running total. Saved as one plain line —
// "Second promo video ($400); Rush delivery ($250)" — so the call sheet and
// Studio read it like any other answer. Nothing is charged here.

import { ADDONS, money } from "../lib/packages";

const NOT_SURE = "Not sure yet";
const priceText = (a) => (a.price === 0 ? `Free${a.was ? ` (was ${money(a.was)})` : ""}` : `${money(a.price)}${a.monthly ? ` + ${money(a.monthly)}/mo` : ""}`);
const line = (a) => `${a.name} (${a.price === 0 ? "free" : money(a.price)}${a.monthly ? `, then ${money(a.monthly)}/mo` : ""})`;

export function addonsList(category) {
  return (ADDONS[category] || []).filter((a) => !a.hidden && !a.alt);
}

// Which add-ons a saved answer names (by name, so older typed answers that
// happen to match still light up).
function pickedFrom(value, list) {
  const v = String(value || "");
  return { ids: list.filter((a) => v.includes(a.name)).map((a) => a.id), unsure: v.includes(NOT_SURE) };
}

export default function AddonPicker({ category, value = "", onChange, id }) {
  const list = addonsList(category);
  const { ids, unsure } = pickedFrom(value, list);
  const save = (nextIds, nextUnsure) => {
    const parts = list.filter((a) => nextIds.includes(a.id)).map(line);
    if (nextUnsure) parts.push(NOT_SURE);
    onChange(parts.join("; "));
  };
  const toggle = (aid) => save(ids.includes(aid) ? ids.filter((x) => x !== aid) : [...ids, aid], false);
  const chosen = list.filter((a) => ids.includes(a.id));
  const total = chosen.reduce((n, a) => n + (a.price || 0), 0);
  const monthly = chosen.reduce((n, a) => n + (a.monthly || 0), 0);

  return (
    <div className="addon-pick" id={id}>
      <ul className="addon-grid">
        {list.map((a) => {
          const on = ids.includes(a.id);
          return (
            <li key={a.id}>
              <button type="button" className={"addon-card" + (on ? " is-on" : "")} aria-pressed={on} onClick={() => toggle(a.id)}>
                <span className="addon-top">
                  <strong>{a.name}</strong>
                  <span className="addon-price">{priceText(a)}</span>
                </span>
                <span className="addon-get">{a.get}</span>
                <span className="addon-tick" aria-hidden="true">{on ? "✓ Added" : "+ Add"}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="addon-foot">
        <button type="button" className={"cx-pill" + (unsure ? " is-on" : "")} aria-pressed={unsure} onClick={() => save([], !unsure)}>{NOT_SURE}</button>
        {chosen.length > 0 && (
          <p className="addon-total" role="status">
            {chosen.length} picked · adds about <strong>{money(total)}</strong>{monthly ? ` + ${money(monthly)}/mo` : ""}
          </p>
        )}
      </div>
    </div>
  );
}
