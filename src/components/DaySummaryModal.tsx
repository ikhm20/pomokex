import type { SessionRec } from "../hooks/usePomodoro";
import { CATEGORIES } from "../lib/categories";
import { downloadWeeklyCard } from "../lib/png";
import { plural } from "../lib/time";
import type { TodayStats } from "./StatsPanel";
import { IconCheck, IconDownload, IconFlame, IconShare, IconTimer, IconX, IconZap } from "./icons";

interface Props {
  stats: TodayStats;
  history: SessionRec[];
  promise: number;
  goalMin: number;
  onClose: () => void;
  notify: (msg: string) => void;
}

export default function DaySummaryModal({ stats, history, promise, goalMin, onClose, notify }: Props) {
  const pct = Math.min(100, Math.round((stats.focusMin / Math.max(1, goalMin)) * 100));
  const reached = stats.focusMin >= goalMin && goalMin > 0;
  const catTotal = CATEGORIES.reduce((a, c) => a + stats.catMinutes[c.id], 0);
  const todayFocus = stats.log.filter((s) => s.mode === "focus" && !s.flow);
  const cleanCount = todayFocus.filter((s) => s.clean !== false).length;
  const cleanPct = todayFocus.length > 0 ? Math.round((cleanCount / todayFocus.length) * 100) : 0;
  const flowCount = stats.log.filter((s) => s.flow).length;
  const notes = stats.log.filter((s) => s.note);

  const shareText = [
    `Мой день в Помодоро — ${new Date().toLocaleDateString("ru-RU")}`,
    `${stats.pomodoros} ${plural(stats.pomodoros, ["помидор", "помидора", "помидоров"])} · ${stats.focusMin} мин фокуса · ${stats.breaks} ${plural(stats.breaks, ["перерыв", "перерыва", "перерывов"])}`,
    `Качество фокуса: ${cleanPct}% чистых сессий`,
    ...(notes.length > 0 ? ["", "Что сделано:", ...notes.slice(0, 5).map((s, i) => `${i + 1}. ${s.note}`)] : []),
  ].join("\n");

  const onShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: "Помодоро — итоги дня", text: shareText });
        return;
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
    }
    try {
      await navigator.clipboard.writeText(shareText);
      notify("Итоги скопированы — вставьте куда угодно");
    } catch {
      notify("Не удалось поделиться");
    }
  };

  const onCard = () => {
    downloadWeeklyCard(history, stats.pomodoros);
    notify("Карточка недели сохранена в загрузки");
  };

  const maxDay = Math.max(1, ...stats.last7.map((d) => d.minutes));

  return (
    <div className="fixed inset-0 z-[120] grid place-items-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="anim-pop relative w-full max-w-md overflow-hidden rounded-[26px] border border-white/[0.09] bg-ink-900 shadow-[0_50px_110px_-30px_rgba(0,0,0,0.9)]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Итоги дня"
      >
        <div aria-hidden className="absolute inset-x-0 top-0 h-[3px] bg-[var(--accent)] shadow-[0_0_18px_var(--accent)]" />
        <div aria-hidden className="pointer-events-none absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-[var(--accent)] blur-[90px]" style={{ opacity: 0.16 }} />

        <div className="scroll-slim relative max-h-[86vh] overflow-y-auto p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-display text-[10px] font-bold tracking-[0.34em] text-sand-500 uppercase">Итоги дня</p>
              <h3 className="mt-1 font-display text-xl font-bold text-sand-100 capitalize">
                {new Date().toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" })}
              </h3>
            </div>
            <button onClick={onClose} aria-label="Закрыть итоги" className="grid h-8 w-8 place-items-center rounded-full border border-white/10 text-sand-400 transition-all hover:border-[var(--accent)] hover:text-[var(--accent)] active:scale-90">
              <IconX className="h-4 w-4" />
            </button>
          </div>

          {/* hero number */}
          <div className="mt-5 flex items-end gap-3">
            <p className="font-display text-6xl leading-none font-extrabold text-[var(--accent)]">{stats.pomodoros}</p>
            <div className="pb-1.5">
              <p className="text-sm font-semibold text-sand-200">{plural(stats.pomodoros, ["помидор", "помидора", "помидоров"])}</p>
              {stats.streak > 0 && (
                <p className="flex items-center gap-1 text-xs text-ember-400">
                  <IconFlame className="h-3.5 w-3.5" /> серия {stats.streak} {plural(stats.streak, ["день", "дня", "дней"])}
                </p>
              )}
            </div>
          </div>

          {/* stat tiles */}
          <div className="mt-5 grid grid-cols-3 gap-2.5">
            <div className="rounded-2xl border border-white/[0.06] bg-ink-950/60 p-3 text-center">
              <IconTimer className="mx-auto h-4 w-4 text-sand-400" />
              <p className="mt-1.5 font-display text-lg font-bold text-sand-100">{stats.focusMin}</p>
              <p className="text-[10px] tracking-wide text-sand-500 uppercase">мин фокуса</p>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-ink-950/60 p-3 text-center">
              <IconCheck className="mx-auto h-4 w-4 text-mint-400" />
              <p className="mt-1.5 font-display text-lg font-bold text-sand-100">{cleanPct}%</p>
              <p className="text-[10px] tracking-wide text-sand-500 uppercase">чистота</p>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-ink-950/60 p-3 text-center">
              <IconZap className="mx-auto h-4 w-4 text-[var(--accent)]" />
              <p className="mt-1.5 font-display text-lg font-bold text-sand-100">{flowCount}</p>
              <p className="text-[10px] tracking-wide text-sand-500 uppercase">потоков</p>
            </div>
          </div>

          {/* goal progress */}
          <div className="mt-4 rounded-2xl border border-white/[0.06] bg-ink-950/60 p-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-sand-300">
                Цель дня — {stats.focusMin} из {goalMin} мин
              </span>
              {reached && (
                <span className="flex items-center gap-1 rounded-full bg-mint-500/15 px-2 py-0.5 font-semibold text-mint-400">
                  <IconCheck className="h-3 w-3" /> достигнута
                </span>
              )}
            </div>
            <div className="mt-2.5 h-2.5 overflow-hidden rounded-full bg-white/[0.06]">
              <div className={`h-full rounded-full ${reached ? "bg-mint-500" : "bg-[var(--accent)]"}`} style={{ width: `${pct}%`, transition: "width 0.9s cubic-bezier(0.22,1,0.36,1)" }} />
            </div>
            {promise > 0 && (
              <p className="mt-2.5 text-[11px] text-sand-500">
                Обещание: <span className="font-semibold text-sand-300">{Math.min(stats.pomodoros, promise)} из {promise}</span>{" "}
                {stats.pomodoros >= promise ? <span className="font-semibold text-mint-400">· сдержано!</span> : "помидоров"}
              </p>
            )}
          </div>

          {/* categories */}
          {catTotal > 0 && (
            <div className="mt-4">
              <div className="flex h-3 overflow-hidden rounded-full bg-white/[0.05]">
                {CATEGORIES.map((c) =>
                  stats.catMinutes[c.id] > 0 ? (
                    <div key={c.id} className="h-full" style={{ width: `${(stats.catMinutes[c.id] / catTotal) * 100}%`, background: c.hex }} />
                  ) : null
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                {CATEGORIES.filter((c) => stats.catMinutes[c.id] > 0).map((c) => (
                  <span key={c.id} className="flex items-center gap-1.5 text-[11px] text-sand-400">
                    <span className={`h-2 w-2 rounded-full ${c.dot}`} />
                    {c.name} · <span className="font-semibold text-sand-200">{Math.round((stats.catMinutes[c.id] / catTotal) * 100)}%</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* mini week chart */}
          <div className="mt-5">
            <p className="text-[10px] font-semibold tracking-[0.22em] text-sand-500 uppercase">Неделя в фокусе</p>
            <div className="mt-2.5 flex h-16 items-end gap-1.5">
              {stats.last7.map((d, i) => {
                const isToday = i === 6;
                return (
                  <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                    <div
                      className={`w-full rounded-t-md ${isToday ? "bg-[var(--accent)]" : "bg-white/[0.09]"}`}
                      style={{ height: `${Math.max(6, (d.minutes / maxDay) * 100)}%`, animation: `grow-y 0.5s ${i * 60}ms cubic-bezier(0.22,1,0.36,1) both`, transformOrigin: "bottom" }}
                      title={`${d.minutes} мин`}
                    />
                    <span className={`text-[9px] ${isToday ? "font-bold text-[var(--accent)]" : "text-sand-600"}`}>
                      {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"][new Date(d.date).getDay() === 0 ? 6 : new Date(d.date).getDay() - 1]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* what got done */}
          {notes.length > 0 && (
            <div className="mt-5">
              <p className="text-[10px] font-semibold tracking-[0.22em] text-sand-500 uppercase">Что сделано</p>
              <ul className="mt-2 space-y-1.5">
                {notes.map((s, i) => (
                  <li key={s.endedAt + i} className="flex items-start gap-2 rounded-xl bg-white/[0.03] px-3 py-2 text-xs text-sand-300">
                    <IconCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-mint-400" />
                    <span className="italic">«{s.note}»</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* actions */}
          <div className="mt-6 flex gap-2">
            <button onClick={onShare} className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[var(--accent)] py-2.5 font-display text-xs font-bold text-[var(--accent-ink)] shadow-[0_12px_30px_-10px_var(--accent)] transition-all hover:-translate-y-0.5 hover:brightness-110 active:scale-95">
              <IconShare className="h-4 w-4" />
              Поделиться итогами
            </button>
            <button onClick={onCard} className="flex items-center justify-center gap-2 rounded-full border border-white/10 px-4 py-2.5 text-xs font-semibold text-sand-300 transition-all hover:-translate-y-0.5 hover:border-[var(--accent)] hover:text-[var(--accent)] active:scale-95" title="Картинка недели для соцсетей">
              <IconDownload className="h-4 w-4" />
              PNG-карточка
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
