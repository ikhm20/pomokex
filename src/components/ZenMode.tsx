import { MODE_LABEL, type Pomodoro } from "../hooks/usePomodoro";
import { quoteFor } from "../lib/quotes";
import { fmtClock, fmtDuration, plural } from "../lib/time";
import { BREAK_TIPS } from "../lib/tips";
import { IconFlag, IconLock, IconPause, IconPlay, IconX, IconZap } from "./icons";

const R = 178;
const CIRC = 2 * Math.PI * R;

export default function ZenMode({ pomo, onExit }: { pomo: Pomodoro; onExit: () => void }) {
  const { mode, running, remaining, total, endAt, cyclePos, settings, flowActive, flowPending, distractions } = pomo;
  const progress = total > 0 ? Math.min(1, Math.max(0, 1 - remaining / total)) : 0;
  const strictLocked = settings.strict && running && mode === "focus";
  const tick = Math.floor(remaining / 6);
  const tip = tick % 2 === 0 ? BREAK_TIPS[tick % BREAK_TIPS.length] : quoteFor(tick);

  return (
    <div className={`mode-${mode} fixed inset-0 z-[100] overflow-hidden bg-ink-950 font-body text-sand-100`} role="dialog" aria-label="Дзен-режим" style={flowActive && pomo.focus.color ? ({ "--accent": pomo.focus.color } as React.CSSProperties) : undefined}>
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0" style={{ background: "var(--grad-base)" }} />
        <div className="absolute top-1/2 left-1/2 h-[90vmin] w-[90vmin] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--accent)] blur-[130px]" style={{ opacity: running ? 0.16 : 0.07, transition: "opacity 1.2s ease" }} />
        <div className="grain absolute inset-0 opacity-[0.05]" />
      </div>

      <button onClick={onExit} className="absolute top-5 right-5 z-10 flex items-center gap-2 rounded-full border border-white/10 bg-ink-900/70 px-4 py-2 text-xs font-semibold text-sand-400 transition-all hover:border-[var(--accent)] hover:text-[var(--accent)] active:scale-95">
        <IconX className="h-4 w-4" />
        Выйти
        <span className="text-sand-600">Esc</span>
      </button>

      <div className="relative flex h-full flex-col items-center justify-center px-6">
        <span key={`z-${mode}-${flowActive}`} className="anim-pop flex items-center gap-2 font-display text-xs font-bold tracking-[0.42em] text-[var(--accent)] uppercase">
          {flowActive && <IconZap className="h-4 w-4" />}
          {flowActive ? "Поток" : mode === "focus" ? pomo.focus.label : MODE_LABEL[mode]}
        </span>

        {/* flow offer */}
        {flowPending ? (
          <div className="anim-pop mt-8 max-w-md rounded-3xl border border-[var(--accent)]/40 bg-ink-900/90 p-8 text-center">
            <p className="flex items-center justify-center gap-2 font-display text-lg font-bold text-sand-100">
              <IconZap className="h-5 w-5 text-[var(--accent)]" />
              Ещё в деле?
            </p>
            <p className="mt-2 text-sm text-sand-400">+10 минут потока — перерыв подождёт.</p>
            <div className="mt-5 flex justify-center gap-2">
              <button onClick={pomo.startFlow} className="rounded-full bg-[var(--accent)] px-6 py-2.5 text-sm font-bold text-[var(--accent-ink)] shadow-[0_12px_36px_-12px_var(--accent)] transition-all hover:-translate-y-0.5 hover:brightness-110 active:scale-95">
                + 10 минут
              </button>
              <button onClick={pomo.declineFlow} className="rounded-full border border-white/10 px-6 py-2.5 text-sm font-semibold text-sand-400 transition-all hover:border-white/25 hover:text-sand-200 active:scale-95">
                На перерыв
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="relative mt-6 w-[min(88vw,560px)]">
              {running && <div className="absolute inset-16 rounded-full bg-[var(--accent)] blur-3xl" style={{ animation: "breathe 3.2s ease-in-out infinite" }} />}
              <div className="relative aspect-square">
                <svg viewBox="0 0 400 400" className="absolute inset-0 h-full w-full -rotate-90">
                  <g className="rotate-90" style={{ transformOrigin: "200px 200px" }}>
                    {Array.from({ length: 60 }).map((_, i) => {
                      const major = i % 5 === 0;
                      return (
                        <line key={i} x1="200" y1="22" x2="200" y2={major ? "36" : "29"} stroke="var(--tick)" strokeWidth={major ? 2 : 1} opacity={major ? 0.25 : 0.09} transform={`rotate(${i * 6} 200 200)`} />
                      );
                    })}
                  </g>
                  <circle cx="200" cy="200" r={R} fill="none" stroke="var(--tick)" strokeOpacity="0.07" strokeWidth="8" />
                  <circle
                    cx="200"
                    cy="200"
                    r={R}
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={CIRC}
                    strokeDashoffset={CIRC * progress}
                    style={{ transition: "stroke-dashoffset 0.45s linear", filter: "drop-shadow(0 0 12px color-mix(in srgb, var(--accent) 70%, transparent))" }}
                  />
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="font-display text-[clamp(4.2rem,20vw,9.5rem)] leading-none font-extrabold tracking-tight tabular-nums" aria-live="off">
                    {fmtDuration(remaining).split("").map((ch, i) =>
                      ch === ":" ? (
                        <span key={i} className={`inline-block w-[0.45em] text-center ${running ? "anim-colon" : ""}`}>
                          :
                        </span>
                      ) : (
                        <span key={i} className="inline-block w-[0.72em] text-center">
                          {ch}
                        </span>
                      )
                    )}
                  </div>
                  <p key={running && mode !== "focus" ? `z-tip-${tip}` : "z-static"} className="anim-fade-up mt-4 px-6 text-center text-sm text-sand-400" style={{ animationDuration: "0.5s" }}>
                    {running
                      ? mode === "focus"
                        ? endAt
                          ? `завершится в ${fmtClock(endAt)}`
                          : "идёт сессия…"
                        : tip
                      : remaining < total
                        ? "пауза — нажмите, чтобы продолжить"
                        : "готовы начать?"}
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={pomo.toggle}
              disabled={strictLocked}
              className="mt-8 flex h-14 w-56 items-center justify-center gap-2.5 rounded-full bg-[var(--accent)] font-display text-sm font-bold tracking-wide text-[var(--accent-ink)] shadow-[0_16px_50px_-12px_var(--accent)] transition-all duration-200 hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 active:scale-95 disabled:pointer-events-none disabled:opacity-70 sm:text-base"
            >
              {strictLocked ? (
                <>
                  <IconLock className="h-5 w-5" />
                  Строгий режим
                </>
              ) : running ? (
                <>
                  <IconPause className="h-5 w-5" />
                  Пауза
                </>
              ) : (
                <>
                  <IconPlay className="h-5 w-5" />
                  {remaining < total ? "Продолжить" : "Старт"}
                </>
              )}
            </button>

            {mode === "focus" && running && !strictLocked && (
              <button onClick={pomo.incrementDistraction} className="anim-fade-up mt-5 flex items-center gap-2 rounded-full border border-ember-500/35 bg-ember-500/10 px-5 py-2.5 text-sm font-semibold text-ember-300 transition-all duration-200 hover:-translate-y-0.5 hover:bg-ember-500/20 active:scale-95" title="Отметить отвлечение">
                <IconFlag className="h-4 w-4" />
                {distractions > 0 ? (
                  <>
                    Отвлёкся · <span className="font-display font-bold">{distractions}</span>
                  </>
                ) : (
                  "Отвлёкся? Отметь — таймер идёт"
                )}
              </button>
            )}

            {pomo.anchor && mode === "focus" && (
              <p className="mt-4 max-w-md truncate text-xs text-sand-500">
                ↳ продолжаем: <span className="font-semibold text-sand-300">{pomo.anchor}</span>
              </p>
            )}
          </>
        )}

        <div className="mt-7 flex items-center gap-2.5">
          {Array.from({ length: settings.cycles }).map((_, i) => (
            <span key={i} className={`h-2 w-2 rounded-full transition-colors duration-500 ${i < cyclePos ? "bg-[var(--accent)] shadow-[0_0_10px_var(--accent)]" : "border border-sand-600/70"}`} />
          ))}
          <span className="ml-2 text-xs text-sand-500">
            круг {Math.min(cyclePos + (mode === "focus" ? 1 : 0), settings.cycles)} из {settings.cycles} ·{" "}
            {Math.round(total / 60)} {plural(Math.round(total / 60), ["минута", "минуты", "минут"])}
          </span>
        </div>

        <p className="mt-6 text-[11px] text-sand-600">
          <span className="font-semibold text-sand-500">Пробел</span> старт/пауза ·{" "}
          <span className="font-semibold text-sand-500">Esc</span> выйти ·{" "}
          <span className="font-semibold text-sand-500">?</span> все клавиши
        </p>
      </div>
    </div>
  );
}
