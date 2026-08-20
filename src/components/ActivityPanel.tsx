import { useMemo } from "react";
import type { SessionRec } from "../hooks/usePomodoro";
import {
  BADGES,
  bestHour,
  bestStreak,
  chronotype,
  computeUnlocked,
  badgeDates,
  heatLevel,
  heatmapDays,
  hourWeekMatrix,
  nextBadgeProgress,
  weekStats,
  type HeatCell,
} from "../lib/insights";
import { fmtDay, plural } from "../lib/time";
import { IconFlame, IconLock, IconMoon, IconSun, IconTimer, IconTomato, IconTrophy } from "./icons";

const BADGE_ICON: Record<string, (p: { className?: string }) => React.ReactNode> = {
  first: (p) => <IconTomato {...p} />,
  ten: (p) => <IconTrophy {...p} />,
  early: (p) => <IconSun {...p} />,
  owl: (p) => <IconMoon {...p} />,
  q25: (p) => <IconTomato {...p} />,
  h100: (p) => <IconTrophy {...p} />,
  fire3: (p) => <IconFlame {...p} />,
  marathon: (p) => <IconTimer {...p} />,
};

const DeltaArrow = ({ up }: { up: boolean }) => (
  <svg viewBox="0 0 12 12" className={`h-2.5 w-2.5 ${up ? "" : "rotate-180"}`} fill="currentColor" aria-hidden>
    <path d="M6 2.5l4 5H2z" />
  </svg>
);

function todayStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export default function ActivityPanel({ history }: { history: SessionRec[] }) {
  const weeks = useMemo(() => {
    const cells = heatmapDays(history, 84);
    const firstDow = (new Date(cells[0].date).getDay() + 6) % 7;
    const padded: (HeatCell | null)[] = [...Array.from({ length: firstDow }, () => null), ...cells];
    const out: (HeatCell | null)[][] = [];
    for (let i = 0; i < padded.length; i += 7) out.push(padded.slice(i, i + 7));
    return out;
  }, [history]);

  const heatMax = useMemo(() => {
    const byDay = new Map<number, number>();
    history
      .filter((s) => s.mode === "focus")
      .forEach((s) => {
        const d = new Date(s.endedAt);
        d.setHours(0, 0, 0, 0);
        const k = d.getTime();
        byDay.set(k, (byDay.get(k) ?? 0) + s.minutes);
      });
    let m = 45;
    byDay.forEach((v) => (m = Math.max(m, v)));
    return m;
  }, [history]);

  const week = useMemo(() => weekStats(history), [history]);
  const peak = useMemo(() => bestHour(history), [history]);
  const chrono = useMemo(() => chronotype(history), [history]);
  const best = useMemo(() => bestStreak(history), [history]);
  const nextBadge = useMemo(() => nextBadgeProgress(history), [history]);
  const unlocked = useMemo(() => computeUnlocked(history), [history]);
  const matrix = useMemo(() => hourWeekMatrix(history), [history]);
  const earned = useMemo(() => badgeDates(history), [history]);
  const matrixMax = Math.max(15, ...matrix.flat());
  const totalFocus = useMemo(() => history.filter((s) => s.mode === "focus" && !s.flow).length, [history]);

  return (
    <div>
      {/* week over week */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl border border-white/[0.05] bg-ink-950/60 px-4 py-3.5">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.16em] text-sand-600 uppercase">Эта неделя</p>
          <p className="font-display text-xl font-bold text-sand-100">
            {week.current} <span className="text-xs font-medium text-sand-500">мин</span>
          </p>
        </div>
        <div>
          <p className="text-[10px] font-semibold tracking-[0.16em] text-sand-600 uppercase">Прошлая</p>
          <p className="font-display text-xl font-bold text-sand-400">
            {week.previous} <span className="text-xs font-medium text-sand-500">мин</span>
          </p>
        </div>
        {week.deltaPct !== null && (
          <span
            className={`ml-auto flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${
              week.deltaPct >= 0 ? "bg-mint-500/12 text-mint-400" : "bg-ember-500/12 text-ember-400"
            }`}
            title="Изменение минут фокуса относительно прошлой недели"
          >
            <DeltaArrow up={week.deltaPct >= 0} />
            {week.deltaPct >= 0 ? "+" : ""}
            {week.deltaPct}%
          </span>
        )}
      </div>

      {/* heatmap */}
      <div className="mt-5">
        <p className="text-[11px] font-semibold tracking-[0.18em] text-sand-500 uppercase">Последние 12 недель</p>
        <div className="scroll-slim mt-3 overflow-x-auto pb-1">
          <div className="flex gap-[3px]">
            <div className="mr-1 flex flex-col justify-between py-[1px] text-[9px] leading-none text-sand-600">
              <span>Пн</span>
              <span>Ср</span>
              <span>Пт</span>
              <span>Вс</span>
            </div>
            {weeks.map((col, wi) => (
              <div key={wi} className="flex flex-col gap-[3px]">
                {col.map((cell, di) =>
                  cell ? (
                    <div
                      key={cell.date}
                      title={`${fmtDay(cell.date)} — ${cell.minutes} ${plural(cell.minutes, ["минута", "минуты", "минут"])}`}
                      className="h-[11px] w-[11px] rounded-[3px] transition-transform duration-150 hover:scale-125"
                      style={{
                        background: `var(--hm-${heatLevel(cell.minutes, heatMax)})`,
                        outline: cell.date === todayStart() ? "1.5px solid var(--accent)" : "none",
                        outlineOffset: 1,
                      }}
                    />
                  ) : (
                    <div key={`e-${wi}-${di}`} className="h-[11px] w-[11px]" />
                  )
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between text-[10px] text-sand-600">
          <span>{totalFocus > 0 ? `${totalFocus} ${plural(totalFocus, ["помидор", "помидора", "помидоров"])} за всё время` : "Начните первый помидор"}</span>
          <span className="flex items-center gap-1">
            меньше
            {[0, 1, 2, 3, 4].map((l) => (
              <span key={l} className="h-2.5 w-2.5 rounded-[2px]" style={{ background: `var(--hm-${l})` }} />
            ))}
            больше
          </span>
        </div>
      </div>

      {/* hour × weekday matrix */}
      <div className="mt-5">
        <p className="text-[11px] font-semibold tracking-[0.18em] text-sand-500 uppercase">Когда вы в фокусе</p>
        <div className="mt-3 space-y-[3px]">
          {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((day, r) => (
            <div key={day} className="flex items-center gap-[3px]">
              <span className="w-6 shrink-0 text-[9px] font-semibold text-sand-600">{day}</span>
              {matrix[r].map((v, h) => (
                <div
                  key={h}
                  title={`${day} ${String(h).padStart(2, "0")}:00 — ${v} мин`}
                  className="h-[10px] flex-1 rounded-[2px] transition-transform duration-150 hover:scale-y-150"
                  style={{
                    background:
                      v > 0
                        ? `color-mix(in srgb, var(--accent) ${Math.round(15 + (v / matrixMax) * 85)}%, transparent)`
                        : "rgba(128,116,100,0.12)",
                  }}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="mt-1.5 flex justify-between pl-9 text-[9px] text-sand-600">
          <span>00</span>
          <span>06</span>
          <span>12</span>
          <span>18</span>
          <span>23</span>
        </div>
      </div>

      {/* chronotype, peak, streak record */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-sand-300">
          <IconTimer className="h-3.5 w-3.5 text-[var(--accent)]" />
          {peak !== null ? (
            <>
              Пик продуктивности:{" "}
              <span className="font-display font-bold text-sand-100">
                {String(peak).padStart(2, "0")}:00–{String((peak + 1) % 24).padStart(2, "0")}:00
              </span>
            </>
          ) : (
            "Пик продуктивности появится с первыми сессиями"
          )}
        </span>
        <span className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-sand-300" title="Определяется по доле фокуса до полудня">
          {chrono.kind === "lark" ? (
            <IconSun className="h-3.5 w-3.5 text-ember-400" />
          ) : chrono.kind === "owl" ? (
            <IconMoon className="h-3.5 w-3.5 text-lagoon-400" />
          ) : (
            <IconFlame className="h-3.5 w-3.5 text-sand-400" />
          )}
          {chrono.kind === "lark" ? (
            <>
              Вы жаворонок — <span className="font-display font-bold text-sand-100">{chrono.morningPct}%</span> фокуса до полудня
            </>
          ) : chrono.kind === "owl" ? (
            <>
              Вы сова — <span className="font-display font-bold text-sand-100">{100 - chrono.morningPct}%</span> фокуса после полудня
            </>
          ) : (
            "Хронотип: равномерный"
          )}
        </span>
        {best > 0 && (
          <span className="flex items-center gap-2 rounded-full border border-ember-500/25 bg-ember-500/10 px-3 py-1.5 text-xs font-medium text-ember-400" title="Лучшая серия дней подряд с фокусом">
            <IconFlame className="h-3.5 w-3.5" />
            рекорд серии — {best} {plural(best, ["день", "дня", "дней"])}
          </span>
        )}
      </div>

      {/* next badge progress */}
      {nextBadge && (
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-white/[0.05] bg-ink-950/60 px-4 py-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-ember-500/10 text-ember-400">
            <IconTrophy className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-sand-300">
              До «{nextBadge.name}» — {nextBadge.need - nextBadge.have}{" "}
              {plural(nextBadge.need - nextBadge.have, ["помидор", "помидора", "помидоров"])}
            </p>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full bg-[var(--accent)]/80"
                style={{ width: `${Math.min(100, (nextBadge.have / nextBadge.need) * 100)}%`, transition: "width 0.8s ease" }}
              />
            </div>
          </div>
        </div>
      )}

      {/* badges */}
      <div className="mt-5">
        <p className="text-[11px] font-semibold tracking-[0.18em] text-sand-500 uppercase">
          Достижения · {unlocked.size} из {BADGES.length}
        </p>
        <div className="mt-3 grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
          {BADGES.map((b) => {
            const got = unlocked.has(b.id);
            const Icon = BADGE_ICON[b.id] ?? BADGE_ICON.first;
            return (
              <div
                key={b.id}
                title={b.desc}
                className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 transition-all duration-300 ${
                  got
                    ? "border-[var(--accent)]/40 bg-[var(--accent)]/[0.07] shadow-[0_6px_18px_-12px_var(--accent)]"
                    : "border-white/[0.05] bg-ink-950/50 opacity-45 grayscale hover:opacity-60"
                }`}
              >
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${got ? "bg-[var(--accent)]/15 text-[var(--accent)]" : "bg-white/[0.06] text-sand-500"}`}>
                  {got ? <Icon className="h-4 w-4" /> : <IconLock className="h-3.5 w-3.5" />}
                </span>
                <div className="min-w-0">
                  <p className={`truncate text-xs font-bold ${got ? "text-sand-100" : "text-sand-400"}`}>{b.name}</p>
                  <p className="truncate text-[10px] text-sand-500">{got && earned[b.id] ? `получен ${fmtDay(earned[b.id])}` : b.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
