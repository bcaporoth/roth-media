// Project colors (2026-11-17, Brandon: "enable colors for our projects, so on
// my calendar I know if it's a big project or small project").
//
// Stored as one submissions row (kind "project_colors", utm = { colors:
// { <project id>: <palette key> } }) — no table change, same pattern as
// lib/free-days.js. A shoot filed under a colored project takes that color on
// the Studio calendar; everything else keeps its shoot-type color.

const KEY = "studio:project-colors";
export const PROJECT_COLORS = [
  { key: "red", label: "Red", hex: "#c0504a" },
  { key: "orange", label: "Orange", hex: "#c9772f" },
  { key: "gold", label: "Gold", hex: "#b8962e" },
  { key: "green", label: "Green", hex: "#3f8f63" },
  { key: "teal", label: "Teal", hex: "#2f8f96" },
  { key: "blue", label: "Blue", hex: "#3f6fc0" },
  { key: "purple", label: "Purple", hex: "#7a59b8" },
  { key: "pink", label: "Pink", hex: "#b8558f" },
];
export const projectHex = (key) => (PROJECT_COLORS.find((c) => c.key === key) || {}).hex || "";

export async function loadProjectColors(db) {
  const { data } = await db.from("submissions").select("id, utm").eq("kind", "project_colors").eq("email", KEY).order("created_at", { ascending: true }).limit(5);
  const row = (data || [])[0];
  const colors = {};
  for (const [id, k] of Object.entries(row?.utm?.colors && typeof row.utm.colors === "object" ? row.utm.colors : {})) if (projectHex(k)) colors[id] = k;
  return { id: row?.id || null, colors, extras: (data || []).slice(1).map((r) => r.id) };
}

// color "" takes the color off.
export async function saveProjectColor(db, projectId, color) {
  const cur = await loadProjectColors(db);
  const colors = { ...cur.colors };
  if (projectHex(color)) colors[projectId] = color; else delete colors[projectId];
  if (cur.id) {
    const { error } = await db.from("submissions").update({ utm: { colors } }).eq("id", cur.id);
    if (error) throw new Error(error.message);
    if (cur.extras.length) await db.from("submissions").delete().in("id", cur.extras);
  } else {
    const { error } = await db.from("submissions").insert({ kind: "project_colors", email: KEY, subject: "Studio: project colors", summary: "Calendar colors for projects", utm: { colors }, status: "archived", fields: [], source_path: "/portal/admin/calendar" });
    if (error) throw new Error(error.message);
  }
  return colors;
}
