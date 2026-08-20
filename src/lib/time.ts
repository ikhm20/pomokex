export const pad = (n: number) => String(n).padStart(2, "0");

/** seconds → "MM:SS" */
export function fmtDuration(totalSec: number) {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${pad(m)}:${pad(s)}`;
}

/** epoch ms → "14:32" */
export function fmtClock(t: number) {
  return new Date(t).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

/** epoch ms → "пт, 9 янв." */
export function fmtDay(t: number) {
  return new Date(t).toLocaleDateString("ru-RU", { weekday: "short", month: "short", day: "numeric" });
}

/** start of the local day containing t */
export function startOfDay(t: number) {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Russian plurals: plural(3, ["помидор","помидора","помидоров"]) */
export function plural(n: number, forms: [string, string, string]) {
  const abs = Math.abs(n) % 100;
  const d = abs % 10;
  if (abs > 10 && abs < 20) return forms[2];
  if (d > 1 && d < 5) return forms[1];
  if (d === 1) return forms[0];
  return forms[2];
}
