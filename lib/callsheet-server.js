import { timing } from "./sun";
import { fetchWeather, stale } from "./weather";
import { groupOf } from "./shoot-guides";

// Everything a call sheet needs, composed from the shoot + its project:
// location (scouted record or the address), who's on camera that day,
// the crew with their calls, the scenes, the kit list, the weather, the
// hospital, and the production phone. One function, used by the public
// /call page, the admin editor and the night-before email.
export async function loadCallSheet(db, shoot) {
  const s = shoot;
  const cs = s.callsheet || {};
  const project = s.project_id ? (await db.from("projects").select("id, title, code, production_phone, client_name").eq("id", s.project_id).maybeSingle()).data : null;
  const soft = (q) => q.then((r) => (r.error ? { data: [] } : r), () => ({ data: [] }));
  const [{ data: locs }, { data: people }, { data: members }, { data: scenes }] = project ? await Promise.all([
    soft(db.from("locations").select("*").eq("project_id", project.id)),
    soft(db.from("project_people").select("id, name, role, phone, shoot_id, kind").eq("project_id", project.id)),
    soft(db.from("project_members").select("position, staff:staff_id(id, name, phone, email, title, emergency, dietary)").eq("project_id", project.id)),
    soft(db.from("scenes").select("id, number, title, act, kind, purpose, location_id, est_seconds").eq("project_id", project.id).order("sort", { ascending: true })),
  ]) : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }];
  const location = (locs || []).find((l) => l.id === s.location_id) || (locs || []).find((l) => l.address && s.address && l.address.toLowerCase() === s.address.toLowerCase()) || null;
  const t = timing(s);
  // Weather: cached on the shoot, refreshed when stale.
  let weather = s.weather || null;
  const lat = s.lat || location?.lat, lng = s.lng || location?.lng;
  if (s.date && lat && lng && stale(weather)) {
    const w = await fetchWeather(lat, lng, s.date);
    if (w) { weather = w; await db.from("shoots").update({ weather: w }).eq("id", s.id).then(() => {}, () => {}); }
  }
  const crewAll = (members || []).map((m) => ({ ...m.staff, position: m.position || m.staff?.title || "Crew" })).filter((x) => x?.id);
  const crew = crewAll.map((c) => { const row = (cs.crew || []).find((x) => x.staff_id === c.id) || {}; return { ...c, call: row.call || cs.general_call || t.start || "", note: row.note || "", confirmed_at: row.confirmed_at || null, on: row.on !== false }; }).filter((c) => c.on);
  const cast = (people || []).filter((p) => p.kind === "interview" && p.shoot_id === s.id).map((p) => { const row = (cs.cast || []).find((x) => x.person_id === p.id) || {}; return { ...p, call: row.call || "", note: row.note || "" }; });
  const dayScenes = (scenes || []).filter((sc) => (s.scene_ids || []).includes(sc.id));
  const list = (Array.isArray(s.checklist) ? s.checklist : []).map((c) => ({ ...c, group: groupOf(c) }));
  const flow = [...list.filter((c) => c.group === "flow" && c.time).sort((a, b) => a.time.localeCompare(b.time)), ...list.filter((c) => c.group === "flow" && !c.time)];
  return {
    shoot: { id: s.id, title: s.title, date: s.date, kind: s.kind, address: s.address, lat, lng, status: s.status, notes: s.notes, crew_token: s.crew_token },
    project: project ? { id: project.id, title: project.title, code: project.code, client_name: project.client_name } : null,
    production_phone: project?.production_phone || cs.production_phone || "",
    version: cs.version || 0, issued_at: cs.issued_at || null,
    general_call: cs.general_call || t.start || "", wrap_est: cs.wrap_est || "", first_shot: cs.first_shot || "",
    sunrise: weather?.sunrise || "", sunset: weather?.sunset || t.sunset || "", golden: t.golden || "",
    weather, location, hospital: location?.hospital || cs.hospital || "", parking: location?.parking || cs.parking || "",
    crew, cast, scenes: dayScenes, flow, gear: list.filter((c) => c.group === "gear"), shots: list.filter((c) => c.group === "shots"),
    meals: cs.meals || "", notes: cs.notes || "", advance: cs.advance || "", walkie: cs.walkie || "", safety: cs.safety || "",
  };
}
