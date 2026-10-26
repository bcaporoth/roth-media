// Weather + sun for a shoot day, from Open-Meteo (free, no key). Cached on
// the shoot row by the caller; refetch when older than 6 hours or the date
// is within 2 days.
export async function fetchWeather(lat, lng, date) {
  if (!lat || !lng || !date) return null;
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,cloud_cover_mean,sunrise,sunset,weather_code&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=America%2FNew_York&start_date=${date}&end_date=${date}`;
  try {
    const res = await fetch(url, { next: { revalidate: 0 } });
    if (!res.ok) return null;
    const j = await res.json();
    const d = j?.daily; if (!d?.time?.length) return null;
    const i = 0;
    return {
      fetched_at: new Date().toISOString(), hi: Math.round(d.temperature_2m_max[i]), lo: Math.round(d.temperature_2m_min[i]),
      precip: d.precipitation_probability_max?.[i] ?? null, wind: Math.round(d.wind_speed_10m_max?.[i] ?? 0), gusts: Math.round(d.wind_gusts_10m_max?.[i] ?? 0),
      cloud: d.cloud_cover_mean?.[i] ?? null, sunrise: (d.sunrise?.[i] || "").slice(11, 16), sunset: (d.sunset?.[i] || "").slice(11, 16), code: d.weather_code?.[i] ?? null,
    };
  } catch { return null; }
}
export const WMO = (c) => c == null ? "" : c === 0 ? "Clear" : c <= 2 ? "Partly cloudy" : c === 3 ? "Overcast" : c <= 49 ? "Fog" : c <= 59 ? "Drizzle" : c <= 69 ? "Rain" : c <= 79 ? "Snow" : c <= 84 ? "Showers" : c <= 94 ? "Snow showers" : "Thunderstorms";
export const stale = (w) => !w?.fetched_at || Date.now() - new Date(w.fetched_at).getTime() > 6 * 3600 * 1000;
// Drone go / no-go: wind under 20 mph sustained, gusts under 25, no precip over 40%.
export const droneGo = (w) => w && w.wind != null ? (w.wind < 20 && w.gusts < 25 && (w.precip ?? 0) < 40 ? "go" : "no-go") : "";
