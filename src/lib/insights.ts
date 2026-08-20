import type { SessionRec } from "../hooks/usePomodoro";
import { startOfDay } from "./time";

const DAY = 86_400_000;

/* ---------------- streak ---------------- */
export function computeStreak(history: SessionRec[]): number {
  const days = new Set(history.filter((s) => s.mode === "focus").map((s) => startOfDay(s.endedAt)));
  let streak = 0;
  let cursor = startOfDay(Date.now());
  if (!days.has(cursor)) cursor -= DAY; // today doesn't burn the streak yet
  while (days.has(cursor)) {
    streak++;
    cursor -= DAY;
  }
  return streak;
}

export function bestStreak(history: SessionRec[]): number {
  const days = [...new Set(history.filter((s) => s.mode === "focus").map((s) => startOfDay(s.endedAt)))].sort(
    (a, b) => a - b
  );
  let best = 0;
  let run = 0;
  let prev: number | null = null;
  for (const d of days) {
    run = prev !== null && d - prev === DAY ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}

/* ---------------- heatmap ---------------- */
export interface HeatCell {
  date: number;
  minutes: number;
}

export function heatmapDays(history: SessionRec[], days = 84): HeatCell[] {
  const byDay = new Map<number, number>();
  history
    .filter((s) => s.mode === "focus")
    .forEach((s) => {
      const k = startOfDay(s.endedAt);
      byDay.set(k, (byDay.get(k) ?? 0) + s.minutes);
    });
  const start = startOfDay(Date.now()) - (days - 1) * DAY;
  return Array.from({ length: days }, (_, i) => {
    const date = start + i * DAY;
    return { date, minutes: byDay.get(date) ?? 0 };
  });
}

export function heatLevel(minutes: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (minutes <= 0) return 0;
  const r = minutes / Math.max(1, max);
  if (r <= 0.25) return 1;
  if (r <= 0.5) return 2;
  if (r <= 0.75) return 3;
  return 4;
}

/* ---------------- week over week ---------------- */
function mondayOf(t: number) {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime() - ((d.getDay() + 6) % 7) * DAY;
}

export function weekStats(history: SessionRec[]) {
  const thisMonday = mondayOf(Date.now());
  const lastMonday = thisMonday - 7 * DAY;
  let current = 0;
  let previous = 0;
  history
    .filter((s) => s.mode === "focus")
    .forEach((s) => {
      const m = mondayOf(s.endedAt);
      if (m === thisMonday) current += s.minutes;
      else if (m === lastMonday) previous += s.minutes;
    });
  const deltaPct =
    previous > 0 ? Math.round(((current - previous) / previous) * 100) : current > 0 ? 100 : null;
  return { current, previous, deltaPct };
}

/* ---------------- hour insights ---------------- */
export function bestHour(history: SessionRec[]): number | null {
  const byHour = Array.from({ length: 24 }, () => 0);
  history
    .filter((s) => s.mode === "focus")
    .forEach((s) => byHour[new Date(s.endedAt).getHours()] += s.minutes);
  let best = -1;
  let bestV = 0;
  byHour.forEach((v, h) => {
    if (v > bestV) {
      bestV = v;
      best = h;
    }
  });
  return best >= 0 ? best : null;
}

export function chronotype(history: SessionRec[]): { kind: "lark" | "owl" | "even"; morningPct: number } {
  const focus = history.filter((s) => s.mode === "focus");
  const total = focus.reduce((a, s) => a + s.minutes, 0);
  if (total < 120) return { kind: "even", morningPct: 50 };
  const morning = focus
    .filter((s) => {
      const h = new Date(s.endedAt).getHours();
      return h >= 5 && h < 12;
    })
    .reduce((a, s) => a + s.minutes, 0);
  const pct = Math.round((morning / total) * 100);
  return { kind: pct >= 60 ? "lark" : pct <= 40 ? "owl" : "even", morningPct: pct };
}

export function hourWeekMatrix(history: SessionRec[]): number[][] {
  const m: number[][] = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));
  history
    .filter((s) => s.mode === "focus")
    .forEach((s) => {
      const d = new Date(s.endedAt);
      m[(d.getDay() + 6) % 7][d.getHours()] += s.minutes;
    });
  return m;
}

/* ---------------- focus score ---------------- */
export function focusScore(history: SessionRec[]) {
  let score = 0;
  history
    .filter((s) => s.mode === "focus" && !s.flow)
    .forEach((s) => {
      score += Math.max(1, s.minutes + (s.clean !== false ? 5 : 0) - (s.distractions ?? 0) * 2);
    });
  const levelSize = 200;
  const level = Math.floor(score / levelSize) + 1;
  const intoLevel = score - (level - 1) * levelSize;
  return { score, level, intoLevel, levelSize };
}

/* ---------------- badges ---------------- */
export interface Badge {
  id: string;
  name: string;
  desc: string;
}

export const BADGES: Badge[] = [
  { id: "first", name: "Первый помидор", desc: "Завершите первую фокус-сессию" },
  { id: "ten", name: "Десяточка", desc: "10 помидоров за один день" },
  { id: "early", name: "Ранняя пташка", desc: "Фокус между 5:00 и 8:00" },
  { id: "owl", name: "Ночная сова", desc: "Фокус после 22:00" },
  { id: "q25", name: "Четверть сотни", desc: "25 помидоров за всё время" },
  { id: "h100", name: "Сотня", desc: "100 помидоров за всё время" },
  { id: "fire3", name: "Три дня в огне", desc: "Серия из 3 дней подряд" },
  { id: "marathon", name: "Марафонец", desc: "Сессия фокуса от 60 минут" },
];

export function computeUnlocked(history: SessionRec[]): Set<string> {
  const focus = history.filter((s) => s.mode === "focus");
  const unlocked = new Set<string>();
  if (focus.length >= 1) unlocked.add("first");
  if (focus.length >= 25) unlocked.add("q25");
  if (focus.length >= 100) unlocked.add("h100");
  if (bestStreak(history) >= 3) unlocked.add("fire3");
  if (focus.some((s) => s.minutes >= 60)) unlocked.add("marathon");
  const perDay = new Map<number, number>();
  focus.forEach((s) => {
    const k = startOfDay(s.endedAt);
    perDay.set(k, (perDay.get(k) ?? 0) + 1);
    const h = new Date(s.endedAt).getHours();
    if (h >= 5 && h < 8) unlocked.add("early");
    if (h >= 22 || h < 4) unlocked.add("owl");
  });
  perDay.forEach((n) => {
    if (n >= 10) unlocked.add("ten");
  });
  return unlocked;
}

export function nextBadgeProgress(history: SessionRec[]): { name: string; have: number; need: number } | null {
  const focus = history.filter((s) => s.mode === "focus");
  const targets: { name: string; have: number; need: number }[] = [];
  if (focus.length < 1) targets.push({ name: "Первый помидор", have: focus.length, need: 1 });
  if (focus.length < 25) targets.push({ name: "Четверть сотни", have: focus.length, need: 25 });
  if (focus.length < 100) targets.push({ name: "Сотня", have: focus.length, need: 100 });
  const best = bestStreak(history);
  if (best < 3) targets.push({ name: "Три дня в огне", have: best, need: 3 });
  if (targets.length === 0) return null;
  targets.sort((a, b) => b.have / b.need - a.have / a.need);
  return targets[0];
}

export function badgeDates(history: SessionRec[]): Record<string, number> {
  const dates: Record<string, number> = {};
  const focus: SessionRec[] = [];
  const perDay = new Map<number, number>();
  let run = 0;
  let streakBest = 0;
  let prevDay: number | null = null;
  const mark = (id: string, t: number) => {
    if (!(id in dates)) dates[id] = t;
  };
  for (const s of history) {
    if (s.mode !== "focus") continue;
    focus.push(s);
    const d = startOfDay(s.endedAt);
    perDay.set(d, (perDay.get(d) ?? 0) + 1);
    if (prevDay !== d) {
      run = prevDay !== null && d - prevDay === DAY ? run + 1 : 1;
      streakBest = Math.max(streakBest, run);
      prevDay = d;
    }
    mark("first", s.endedAt);
    if (focus.length >= 25) mark("q25", s.endedAt);
    if (focus.length >= 100) mark("h100", s.endedAt);
    if ((perDay.get(d) ?? 0) >= 10) mark("ten", s.endedAt);
    if (streakBest >= 3) mark("fire3", s.endedAt);
    if (s.minutes >= 60) mark("marathon", s.endedAt);
    const h = new Date(s.endedAt).getHours();
    if (h >= 5 && h < 8) mark("early", s.endedAt);
    if (h >= 22 || h < 4) mark("owl", s.endedAt);
  }
  return dates;
}

/* ---------------- month calendar ---------------- */
export interface DayCell {
  date: number;
  inMonth: boolean;
  pomodoros: number;
  focusMin: number;
  sessions: SessionRec[];
}

export function monthCalendar(history: SessionRec[], year: number, month: number): DayCell[] {
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7; // Monday first
  const start = startOfDay(first.getTime()) - lead * DAY;
  const cells: DayCell[] = [];
  for (let i = 0; i < 42; i++) {
    const date = start + i * DAY;
    const sessions = history.filter((s) => startOfDay(s.endedAt) === date);
    const focus = sessions.filter((s) => s.mode === "focus");
    cells.push({
      date,
      inMonth: new Date(date).getMonth() === month,
      pomodoros: focus.filter((s) => !s.flow).length,
      focusMin: focus.reduce((a, s) => a + s.minutes, 0),
      sessions,
    });
  }
  return cells;
}

/* ---------------- purity ---------------- */
export function purityByDay(history: SessionRec[], days = 10): { day: number; pct: number | null }[] {
  const out: { day: number; pct: number | null }[] = [];
  const today = startOfDay(Date.now());
  for (let i = days - 1; i >= 0; i--) {
    const day = today - i * DAY;
    const focus = history.filter((s) => s.mode === "focus" && !s.flow && startOfDay(s.endedAt) === day);
    if (focus.length === 0) out.push({ day, pct: null });
    else {
      const clean = focus.filter((s) => s.clean !== false && (s.distractions ?? 0) === 0).length;
      out.push({ day, pct: Math.round((clean / focus.length) * 100) });
    }
  }
  return out;
}

export function avgPrev7(history: SessionRec[]): number {
  const today = startOfDay(Date.now());
  const start = today - 7 * DAY;
  const mins = history
    .filter((s) => s.mode === "focus" && s.endedAt >= start && s.endedAt < today)
    .reduce((a, s) => a + s.minutes, 0);
  return Math.round(mins / 7);
}

/* ---------------- exports ---------------- */
const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;

export function sessionsToCSV(history: SessionRec[]): string {
  const head = "date;time;mode;minutes;category;distractions;clean;flow;note";
  const rows = history.map((s) => {
    const d = new Date(s.endedAt);
    return [
      d.toLocaleDateString("ru-RU"),
      d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
      s.mode === "focus" ? "Фокус" : s.mode === "short" ? "Короткий перерыв" : "Длинный перерыв",
      s.minutes,
      s.category === "work" ? "Работа" : s.category === "study" ? "Учёба" : s.category === "personal" ? "Личное" : "",
      s.distractions ?? 0,
      s.clean === false ? "нет" : "да",
      s.flow ? "да" : "нет",
      esc(s.note ?? ""),
    ].join(";");
  });
  return "\uFEFF" + [head, ...rows].join("\n");
}

export function sessionsToICS(history: SessionRec[]): string {
  const stamp = (t: number) => new Date(t).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Pomodoro//RU", "CALSCALE:GREGORIAN"];
  history
    .filter((s) => s.mode === "focus")
    .forEach((s, i) => {
      const end = s.endedAt;
      const start = end - s.minutes * 60_000;
      lines.push(
        "BEGIN:VEVENT",
        `UID:pomodoro-${end}-${i}@local`,
        `DTSTAMP:${stamp(Date.now())}`,
        `DTSTART:${stamp(start)}`,
        `DTEND:${stamp(end)}`,
        `SUMMARY:Фокус · ${s.minutes} мин${s.category ? " · " + (s.category === "work" ? "Работа" : s.category === "study" ? "Учёба" : "Личное") : ""}`,
        s.note ? `DESCRIPTION:${s.note.replace(/([,;])/g, "\\$1")}` : "DESCRIPTION:Помодоро-сессия",
        "END:VEVENT"
      );
    });
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
