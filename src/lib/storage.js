const METERS_KEY = "powercheck_meters";

function safeParse(raw, fallback) {
  if (!raw) return fallback;
  try { return JSON.parse(raw); } catch { return fallback; }
}

export function getMeters() {
  if (typeof window === "undefined") return [];
  return safeParse(localStorage.getItem(METERS_KEY), []);
}

export function saveMeters(meters) {
  if (typeof window === "undefined") return;
  localStorage.setItem(METERS_KEY, JSON.stringify(meters));
}

export function addMeter(meter) {
  const updated = [...getMeters(), meter];
  saveMeters(updated);
  return updated;
}

export function removeMeter(id) {
  const updated = getMeters().filter((m) => m.id !== id);
  saveMeters(updated);
  return updated;
}

export function updateMeterBill(id, bill) {
  const updated = getMeters().map((m) => {
    if (m.id !== id) return m;
    return {
      ...m,
      billHistory: [bill, ...m.billHistory].slice(0, 12),
      lastChecked: new Date().toISOString(),
    };
  });
  saveMeters(updated);
  return updated;
}

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}
