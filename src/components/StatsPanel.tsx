import { useEffect, useMemo, useRef, useState } from "react";
import type { SessionRec } from "../hooks/usePomodoro";
import { avgPrev7, computeStreak, focusScore, nextBadgeProgress, purityByDay } from "../lib/insights";
import { quoteFor } from "../lib/quotes";
import { fmtClock, plural, startOfDay } from "../lib/time";
import { IconCheck, IconFlame, IconLeaf, IconMug, IconTimer, IconTomato, IconTrophy, IconZap } from "./icons";

function useCountUp(value: number, dur = 550) {
  const [disp, setDisp] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    const from = prev.current;
    const to = value;
    prev.current = value;
    if (from === to) return;
    let raf = 0;
    const t0 = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      setDisp(Math.round(from + (to - from) * e));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, dur]);
  return disp;
}

function useConfetti(fire: boolean) {
  useEffect(() => {
    if (!fire) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = document.createElement("canvas");
    canvas.style.cssText = "position:fixed;inset:0;z-index:90;pointer-events:none;width:100vw;height:100vh";
    canvas.width = window.innerWidth * devicePixelRatio;
    canvas.height = window.innerHeight * devicePixelRatio;
    document.body.appendChild(canvas);
    const ctx = canvas.getContext("2d")!;
    ctx.scale(devicePixelRatio, devicePixelRatio);
    const colors = ["#ff6b4a", "#3ecf9a", "#5ba8ff", "#f2eadf", "#ffa184"];
    const parts = Array.from({ length: 90 }, () => ({
      x: window.innerWidth / 2 + (Math.random() - 0.5) * 260,
      y: window.innerHeight / 3,
      vx: (Math.random() - 0.5) * 9,
      vy: -6 - Math.random() * 7,
      s: 4 + Math.random() * 5,
      r: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      c: colors[(Math.random() * colors.length) | 0],
    }));
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const el = (t - t0) / 1000;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      parts.forEach((p) => {
        p.x += p.vx;
        p.vy += 0.32;
        p.y += p.vy;
        p.r += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.globalAlpha = Math.max(0, 1 - el / 1.6);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6);
        ctx.restore();
      });
      if (el < 1.6) raf = requestAnimationFrame(tick);
      else canvas.remove();
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      canvas.remove();
    };
  }, [fire]);
}

import { CATEGORIES, type CategoryId } from "../lib/categories";

export interface TodayStats {
  pomodoros: number;
  focusMin: number;
  breaks: number;
  byHour: number[];
  best: number;
  streak: number;
  catMinutes: Record<CategoryId, number>;
  last7: { date: number; minutes: number }[];
  peakHour: number | null;
  avgPrev: number;
  weekTotal: number;
  hardCount: number;
  hardMin: number;
  allPomodoros: number;
  allMinutes: number;
  log: SessionRec[];
}

export function computeToday(history: SessionRec[]): TodayStats {
  const dayStart = startOfDay(Date.now());
  const today = history.filter((s) => s.endedAt >= dayStart);
  const focus = today.filter((s) => s.mode === "focus");
  const focusMin = focus.reduce((a, s) => a + s.minutes, 0);
  const byHour = Array.from({ length: 24 }, () => 0);
  focus.forEach((s) => byHour[new Date(s.endedAt).getHours()] += s.minutes);

  const perDay = new Map<string, number>();
  history
    .filter((s) => s.mode === "focus")
    .forEach((s) => {
      const k = new Date(s.endedAt).toDateString();
      perDay.set(k, (perDay.get(k) ?? 0) + s.minutes);
    });
  let best = 0;
  perDay.forEach((v) => (best = Math.max(best, v)));

  const catMinutes: Record<CategoryId, number> = { work: 0, study: 0, personal: 0 };
  focus.forEach((s) => {
    if (s.category) catMinutes[s.category] += s.minutes;
  });

  const hard = focus.filter((s) => s.mood === "hard");
  const DAY = 86_400_000;
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const date = dayStart - (6 - i) * DAY;
    return {
      date,
      minutes: focus.filter((s) => startOfDay(s.endedAt) === date).reduce((a, s) => a + s.minutes, 0),
    };
  });

  const hourTotals = Array.from({ length: 24 }, () => 0);
  history.filter((s) => s.mode === "focus").forEach((s) => (hourTotals[new Date(s.endedAt).getHours()] += s.minutes));
  let peakHour: number | null = null;
  let peakV = 0;
  hourTotals.forEach((v, h) => {
    if (v > peakV) {
      peakV = v;
      peakHour = h;
    }
  });

  const allFocus = history.filter((s) => s.mode === "focus");
  return {
    pomodoros: focus.filter((s) => !s.flow).length,
    focusMin,
    breaks: today.length - focus.length,
    byHour,
    best,
    streak: computeStreak(history),
    catMinutes,
    last7,
    peakHour,
    avgPrev: avgPrev7(history),
    weekTotal: last7.reduce((a, d) => a + d.minutes, 0),
    hardCount: hard.length,
    hardMin: hard.reduce((a, s) => a + s.minutes, 0),
    allPomodoros: allFocus.filter((s) => !s.flow).length,
    allMinutes: allFocus.reduce((a, s) => a + s.minutes, 0),
    log: [...today].reverse(),
  };
}

const MODE_DOT: Record<SessionRec["mode"], string> = {
  focus: "bg-ember-500",
  short: "bg-mint-500",
  long: "bg-lagoon-500",
};
const MODE_NAME: Record<SessionRec["mode"], string> = {
  focus: "Фокус",
  short: "Короткий перерыв",
  long: "Длинный перерыв",
};

interface Props {
  stats: TodayStats;
  goalMin: number;
  onGoalChange: (v: number) => void;
  weeklyGoal: number;
  onWeeklyGoalChange: (v: number) => void;
  promise: number;
  onPromiseChange: (v: number) => void;
  history: SessionRec[];
}

export default function StatsPanel({
  stats,
  goalMin,
  onGoalChange,
  weeklyGoal,
  onWeeklyGoalChange,
  promise,
  onPromiseChange,
  history,
}: Props) {
  const pomodoros = useCountUp(stats.pomodoros);
  const focusMin = useCountUp(stats.focusMin);
  const breaks = useCountUp(stats.breaks);
  const pct = Math.min(100, Math.round((stats.focusMin / Math.max(1, goalMin)) * 100));
  const wasReached = useRef(stats.focusMin >= goalMin);
  const reached = stats.focusMin >= goalMin && goalMin > 0;
  const [celebrate, setCelebrate] = useState(false);
  useEffect(() => {
    if (reached && !wasReached.current) setCelebrate(true);
    wasReached.current = reached;
  }, [reached]);
  useConfetti(celebrate);
  const maxHour = Math.max(1, ...stats.byHour);
  const catTotal = CATEGORIES.reduce((a, c) => a + stats.catMinutes[c.id], 0);
  const purity = useMemo(() => purityByDay(history, 10), [history]);
  const score = useMemo(() => focusScore(history), [history]);
  const scorePct = Math.min(100, Math.round((score.intoLevel / score.levelSize) * 100));
  const nextBadge = useMemo(() => nextBadgeProgress(history), [history]);
  const delta = stats.focusMin - stats.avgPrev;

  const bigThree = useMemo(
    () =>
      [
        { icon: <IconTomato className="h-5 w-5" />, value: pomodoros, label: plural(pomodoros, ["помидор", "помидора", "помидоров"]), tint: "text-ember-400 bg-ember-500/10" },
        { icon: <IconTimer className="h-5 w-5" />, value: focusMin, label: plural(focusMin, ["минута фокуса", "минуты фокуса", "минут фокуса"]), tint: "text-sand-200 bg-white/[0.06]" },
        { icon: <IconMug className="h-5 w-5" />, value: breaks, label: plural(breaks, ["перерыв", "перерыва", "перерывов"]), tint: "text-mint-400 bg-mint-500/10" },
      ] as const,
    [pomodoros, focusMin, breaks]
  );

  return (
    <div>
      {/* streak & record chips */}
      <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
        {stats.streak > 0 && (
          <span className="flex items-center gap-1.5 rounded-full border border-ember-500/25 bg-ember-500/10 px-2.5 py-1 text-[11px] font-semibold text-ember-400" title="Дни подряд с завершёнными фокус-сессиями">
            <IconFlame className="h-3.5 w-3.5" />
            {stats.streak} {plural(stats.streak, ["день", "дня", "дней"])}
          </span>
        )}
        {stats.best > 0 && (
          <span className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium text-sand-400" title="Ваш лучший день по минутам фокуса">
            <IconTrophy className="h-3.5 w-3.5 text-ember-400" />
            рекорд {stats.best} мин
          </span>
        )}
      </div>

      {/* today vs weekly average */}
      {stats.avgPrev > 0 && (
        <div className="mb-3 flex items-center justify-center gap-1.5 text-[11px] text-sand-500">
          <span>против среднего за неделю</span>
          <span className={`flex items-center gap-0.5 font-display font-bold ${delta >= 0 ? "text-mint-400" : "text-ember-400"}`}>
            <svg viewBox="0 0 12 12" className={`h-2.5 w-2.5 ${delta >= 0 ? "" : "rotate-180"}`} fill="currentColor" aria-hidden>
              <path d="M6 2.5l4 5H2z" />
            </svg>
            {delta >= 0 ? "+" : ""}
            {delta} мин
          </span>
        </div>
      )}

      {/* headline numbers */}
      <div className="grid grid-cols-3 gap-3">
        {bigThree.map((s) => (
          <div key={s.label} className="rounded-2xl border border-white/[0.05] bg-ink-950/60 px-3 py-4 text-center transition-colors duration-300 hover:border-white/[0.12]">
            <span className={`mx-auto grid h-9 w-9 place-items-center rounded-xl ${s.tint}`}>{s.icon}</span>
            <p className="mt-2.5 font-display text-2xl font-bold text-sand-100 sm:text-3xl">{s.value}</p>
            <p className="mt-0.5 text-[11px] font-medium tracking-wide text-sand-500 uppercase">{s.label}</p>
          </div>
        ))}
      </div>

      {/* daily promise */}
      <div className="mt-4 rounded-2xl border border-white/[0.05] bg-ink-950/60 p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-sand-300">
            <IconTomato className="h-4 w-4" />
            Обещание дня
          </p>
          <div className="flex items-center gap-1.5">
            <button aria-label="Уменьшить обещание" onClick={() => onPromiseChange(Math.max(0, promise - 1))} className="grid h-7 w-7 place-items-center rounded-lg border border-white/10 text-sand-400 transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] active:scale-90">
              −
            </button>
            <span className="w-14 text-center font-display text-xs font-bold text-sand-200">{promise === 0 ? "выкл" : `${promise} шт`}</span>
            <button aria-label="Увеличить обещание" onClick={() => onPromiseChange(Math.min(20, promise + 1))} className="grid h-7 w-7 place-items-center rounded-lg border border-white/10 text-sand-400 transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] active:scale-90">
              +
            </button>
          </div>
        </div>
        {promise > 0 ? (
          <>
            <div className="mt-3 flex items-center gap-1.5">
              {Array.from({ length: promise }).map((_, i) => (
                <span key={`${i}-${i < stats.pomodoros}`} className={`h-3 flex-1 rounded-full transition-all duration-500 ${i < stats.pomodoros ? "bg-[var(--accent)] shadow-[0_0_8px_-2px_var(--accent)]" : "bg-white/[0.07]"}`} />
              ))}
            </div>
            <p className="mt-2 text-xs text-sand-500">
              <span className="font-semibold text-sand-300">{Math.min(stats.pomodoros, promise)}</span> из {promise} обещанных
              {stats.pomodoros >= promise && <span className="ml-1 font-semibold text-mint-400">· сдержано!</span>}
            </p>
          </>
        ) : (
          <p className="mt-2 text-xs text-sand-600">Загадайте число помидоров на день — прогресс появится здесь.</p>
        )}
      </div>

      {/* daily goal */}
      <div className="mt-3 rounded-2xl border border-white/[0.05] bg-ink-950/60 p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-sand-300">
            <IconLeaf className="h-4 w-4 text-mint-400" />
            Цель дня
            {reached && (
              <span className="anim-pop flex items-center gap-1 rounded-full bg-mint-500/15 px-2 py-0.5 text-[11px] font-semibold text-mint-400">
                <IconCheck className="h-3 w-3" /> достигнута
              </span>
            )}
          </p>
          <div className="flex items-center gap-1.5">
            <button aria-label="Уменьшить цель дня" onClick={() => onGoalChange(Math.max(15, goalMin - 15))} className="grid h-7 w-7 place-items-center rounded-lg border border-white/10 text-sand-400 transition-colors hover:border-mint-500 hover:text-mint-400 active:scale-90">
              −
            </button>
            <span className="w-20 text-center font-display text-xs font-bold text-sand-200">{goalMin} мин</span>
            <button aria-label="Увеличить цель дня" onClick={() => onGoalChange(Math.min(600, goalMin + 15))} className="grid h-7 w-7 place-items-center rounded-lg border border-white/10 text-sand-400 transition-colors hover:border-mint-500 hover:text-mint-400 active:scale-90">
              +
            </button>
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className={`h-full rounded-full ${reached ? "bg-mint-500" : "bg-[var(--accent)]"}`}
            style={{ width: `${pct}%`, transition: "width 0.8s cubic-bezier(0.22,1,0.36,1), background-color 0.5s" }}
          />
        </div>
        <p className="mt-2 text-xs text-sand-500">
          <span className="font-semibold text-sand-300">{stats.focusMin}</span> из {goalMin} минут фокуса ·{" "}
          <span className={reached ? "font-semibold text-mint-400" : "text-sand-400"}>{pct}%</span>
        </p>
      </div>

      {/* weekly goal */}
      <div className="mt-3 rounded-2xl border border-white/[0.05] bg-ink-950/60 p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-sand-300">
            <IconTimer className="h-4 w-4 text-lagoon-400" />
            Цель недели
          </p>
          <div className="flex items-center gap-1.5">
            <button aria-label="Уменьшить цель недели" onClick={() => onWeeklyGoalChange(Math.max(0, weeklyGoal - 30))} className="grid h-7 w-7 place-items-center rounded-lg border border-white/10 text-sand-400 transition-colors hover:border-lagoon-500 hover:text-lagoon-400 active:scale-90">
              −
            </button>
            <span className="w-24 text-center font-display text-xs font-bold text-sand-200">{weeklyGoal === 0 ? "выкл" : `${weeklyGoal} мин`}</span>
            <button aria-label="Увеличить цель недели" onClick={() => onWeeklyGoalChange(Math.min(3000, weeklyGoal + 30))} className="grid h-7 w-7 place-items-center rounded-lg border border-white/10 text-sand-400 transition-colors hover:border-lagoon-500 hover:text-lagoon-400 active:scale-90">
              +
            </button>
          </div>
        </div>
        {weeklyGoal > 0 ? (
          <>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className={`h-full rounded-full ${stats.weekTotal >= weeklyGoal ? "bg-mint-500" : "bg-lagoon-500"}`}
                style={{ width: `${Math.min(100, (stats.weekTotal / weeklyGoal) * 100)}%`, transition: "width 0.8s cubic-bezier(0.22,1,0.36,1), background-color 0.5s" }}
              />
            </div>
            <p className="mt-2 text-xs text-sand-500">
              <span className="font-semibold text-sand-300">{stats.weekTotal}</span> из {weeklyGoal} минут за 7 дней
              {stats.weekTotal >= weeklyGoal && <span className="ml-1 font-semibold text-mint-400">· цель взята!</span>}
            </p>
          </>
        ) : (
          <p className="mt-2 text-xs text-sand-600">Задайте недельную цель — прогресс появится здесь.</p>
        )}
      </div>

      {/* category breakdown */}
      {catTotal > 0 && (
        <div className="mt-4">
          <div className="flex h-2.5 overflow-hidden rounded-full bg-white/[0.05]">
            {CATEGORIES.map((c) =>
              stats.catMinutes[c.id] > 0 ? (
                <div key={c.id} title={`${c.name} — ${stats.catMinutes[c.id]} мин`} className="h-full transition-all duration-700" style={{ width: `${(stats.catMinutes[c.id] / catTotal) * 100}%`, background: c.hex }} />
              ) : null
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {CATEGORIES.filter((c) => stats.catMinutes[c.id] > 0).map((c) => (
              <span key={c.id} className="flex items-center gap-1.5 text-[11px] text-sand-400">
                <span className={`h-2 w-2 rounded-full ${c.dot}`} />
                {c.name} · <span className="font-semibold text-sand-200">{stats.catMinutes[c.id]} мин</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* focus by hour */}
      <div className="mt-5">
        <p className="text-[11px] font-semibold tracking-[0.18em] text-sand-500 uppercase">Фокус по часам</p>
        <div className="mt-3 flex h-20 items-end gap-[3px]" role="img" aria-label="Минуты фокуса по часам за сегодня">
          {stats.byHour.map((v, h) => (
            <div
              key={h}
              title={`${String(h).padStart(2, "0")}:00 — ${v} мин`}
              className={`flex-1 rounded-t-[3px] ${v > 0 ? "bg-[var(--accent)]/85 hover:bg-[var(--accent)]" : "bg-white/[0.05]"} transition-colors`}
              style={{
                height: v > 0 ? `${Math.max(8, (v / maxHour) * 100)}%` : "3px",
                animation: `grow-y 0.6s ${h * 18}ms cubic-bezier(0.22,1,0.36,1) both`,
                transformOrigin: "bottom",
              }}
            />
          ))}
        </div>
        <div className="mt-1.5 flex justify-between text-[10px] text-sand-600">
          <span>00</span>
          <span>06</span>
          <span>12</span>
          <span>18</span>
          <span>23</span>
        </div>
      </div>

      {/* focus quality */}
      <div className="mt-5">
        <p className="text-[11px] font-semibold tracking-[0.18em] text-sand-500 uppercase">Качество фокуса · 10 дней</p>
        <div className="mt-3 flex items-end gap-[5px]">
          {purity.map((d) => (
            <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-[9px] font-semibold text-sand-400 tabular-nums">{d.pct === null ? "—" : `${d.pct}%`}</span>
              <div
                className={`w-full rounded-t-[4px] ${d.pct === null ? "bg-white/[0.05]" : d.pct >= 70 ? "bg-mint-500/80" : d.pct >= 40 ? "bg-[var(--accent)]/70" : "bg-ember-500/70"}`}
                style={{ height: `${d.pct === null ? 4 : Math.max(12, d.pct * 0.4)}px`, transition: "height 0.6s ease" }}
                title={`${new Date(d.day).toLocaleDateString("ru-RU")} — ${d.pct === null ? "нет сессий" : `чистых ${d.pct}%`}`}
              />
              <span className="text-[9px] text-sand-600">{new Date(d.day).getDate()}</span>
            </div>
          ))}
        </div>
        {stats.hardCount > 0 && (
          <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-sand-500">
            <span className="h-1.5 w-1.5 rounded-full bg-ember-400" />
            Тяжёлые часы: <span className="font-semibold text-sand-300">{stats.hardMin} мин</span> в {stats.hardCount}{" "}
            {plural(stats.hardCount, ["сессии", "сессиях", "сессиях"])} — вы работали через силу
          </p>
        )}
      </div>

      {/* focus score */}
      <div className="mt-5 rounded-2xl border border-white/[0.05] bg-ink-950/60 p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-sand-300">
            <IconZap className="h-4 w-4 text-ember-400" />
            Фокус-скор
          </p>
          <p className="font-display text-xs font-bold text-sand-200">
            уровень {score.level} · {score.score} очков
          </p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.06]">
          <div className="h-full rounded-full bg-ember-500/85" style={{ width: `${scorePct}%`, transition: "width 0.8s cubic-bezier(0.22,1,0.36,1)" }} />
        </div>
        <p className="mt-2 text-xs text-sand-500">
          {Math.max(0, score.levelSize - score.intoLevel)} очков до уровня {score.level + 1} · завершённые без отвлечений
          сессии весят больше
        </p>
      </div>

      {/* next badge */}
      {nextBadge && (
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-white/[0.05] bg-ink-950/60 px-4 py-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-ember-500/10 text-ember-400">
            <IconTrophy className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-sand-300">
              До «{nextBadge.name}» — {nextBadge.need - nextBadge.have} {plural(nextBadge.need - nextBadge.have, ["помидор", "помидора", "помидоров"])}
            </p>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
              <div className="h-full rounded-full bg-[var(--accent)]/80" style={{ width: `${Math.min(100, (nextBadge.have / nextBadge.need) * 100)}%`, transition: "width 0.8s ease" }} />
            </div>
          </div>
        </div>
      )}

      {/* session log */}
      <div className="mt-5">
        <p className="text-[11px] font-semibold tracking-[0.18em] text-sand-500 uppercase">Журнал сессий</p>
        {stats.log.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-white/[0.09] px-4 py-5 text-center text-sm text-sand-500 italic">
            Сегодня сессий пока нет — первый помидор ждёт вас.
          </p>
        ) : (
          <ul className="scroll-slim mt-2 max-h-44 space-y-1 overflow-y-auto pr-1">
            {stats.log.map((s, i) => (
              <li key={s.endedAt + "-" + i} className="anim-fade-up flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-white/[0.04]" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
                <span className={`h-2 w-2 shrink-0 rounded-full ${MODE_DOT[s.mode]}`} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-sand-200">{MODE_NAME[s.mode]}</span>
                    <span className="text-sand-500">· {s.minutes} мин</span>
                    {s.flow && <span className="flex items-center gap-0.5 text-[10px] font-bold text-[var(--accent)]"><IconZap className="h-2.5 w-2.5" />поток</span>}
                    {s.mode === "focus" && !s.flow && s.clean !== false && (s.distractions ?? 0) === 0 && (
                      <span className="flex items-center gap-0.5 text-[10px] font-bold text-mint-400">
                        <IconCheck className="h-2.5 w-2.5" /> чисто
                      </span>
                    )}
                    {s.mode === "focus" && (s.distractions ?? 0) > 0 && (
                      <span className="text-[10px] font-semibold text-ember-400/80">
                        {s.distractions} {plural(s.distractions ?? 0, ["отвлечение", "отвлечения", "отвлечений"])}
                      </span>
                    )}
                    <span className="ml-auto text-xs text-sand-500 tabular-nums">{fmtClock(s.endedAt)}</span>
                  </p>
                  {s.note && <p className="mt-0.5 truncate text-xs text-sand-500 italic">«{s.note}»</p>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* all-time */}
      {stats.allPomodoros > 0 && (
        <p className="mt-4 border-t border-white/[0.05] pt-3 text-center text-[11px] tracking-wide text-sand-600">
          За всё время: <span className="font-semibold text-sand-400">{stats.allPomodoros}</span>{" "}
          {plural(stats.allPomodoros, ["помидор", "помидора", "помидоров"])} ·{" "}
          <span className="font-semibold text-sand-400">{Math.floor(stats.allMinutes / 60)}</span> ч{" "}
          <span className="font-semibold text-sand-400">{stats.allMinutes % 60}</span> мин фокуса
        </p>
      )}

      {/* quote of the day */}
      <figure className="mt-5 rounded-xl border border-white/[0.05] bg-ink-950/60 px-4 py-3.5 text-center">
        <blockquote className="text-[13px] leading-relaxed text-sand-300 italic">
          «{quoteFor(Math.floor(startOfDay(Date.now()) / 86_400_000))}»
        </blockquote>
        <figcaption className="mt-1.5 text-[10px] font-semibold tracking-[0.22em] text-sand-600 uppercase">Мысль дня</figcaption>
      </figure>
    </div>
  );
}
