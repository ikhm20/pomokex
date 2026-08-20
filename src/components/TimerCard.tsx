import { useEffect, useRef } from "react";
import { MODE_LABEL, MODES, type Pomodoro } from "../hooks/usePomodoro";
import { CATEGORIES } from "../lib/categories";
import { quoteFor } from "../lib/quotes";
import { fmtClock, fmtDuration, plural } from "../lib/time";
import { BREAK_TIPS } from "../lib/tips";
import {
  IconBook,
  IconBriefcase,
  IconFlag,
  IconHeart,
  IconLock,
  IconPause,
  IconPlay,
  IconReset,
  IconSkip,
  IconZap,
} from "./icons";

const R = 178;
const CIRC = 2 * Math.PI * R;

/** Odometer digits — each digit rolls to its new value. */
function RollingDigits({ value, running }: { value: string; running: boolean }) {
  return (
    <div
      data-digits
      className="font-display text-[clamp(3.1rem,10.5vw,5.4rem)] leading-none font-extrabold tracking-tight text-sand-100 tabular-nums"
      aria-live="off"
    >
      {value.split("").map((ch, i) =>
        ch === ":" ? (
          <span key={i} className={`inline-block w-[0.45em] text-center ${running ? "anim-colon" : ""}`}>
            :
          </span>
        ) : (
          <span key={i} className="relative inline-block h-[1em] w-[0.72em] overflow-hidden text-center">
            <span
              className="absolute inset-x-0 top-0 flex flex-col items-center"
              style={{
                transform: `translateY(-${Number(ch)}em)`,
                transition: "transform 0.55s cubic-bezier(0.22,1,0.36,1)",
              }}
            >
              {["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
                <span key={d} className="block h-[1em] leading-none">
                  {d}
                </span>
              ))}
            </span>
          </span>
        )
      )}
    </div>
  );
}

export default function TimerCard(p: Pomodoro & { nextTaskTitle?: string | null }) {
  const { mode, running, remaining, total, endAt, cyclePos, settings, distractions, flowPending, flowActive, focus } = p;
  const progress = total > 0 ? Math.min(1, Math.max(0, 1 - remaining / total)) : 0;
  const tick = Math.floor(remaining / 6);
  const tip = tick % 2 === 0 ? BREAK_TIPS[tick % BREAK_TIPS.length] : quoteFor(tick);
  const tabIdx = MODES.indexOf(mode);
  const focusLabel = mode === "focus" ? focus.label : MODE_LABEL[mode];
  const nextFocusMin = settings.activeCustom
    ? settings.customModes.find((m) => m.id === settings.activeCustom)?.minutes ?? settings.durations.focus
    : settings.durations.focus;

  const strictLocked = settings.strict && running && mode === "focus";

  const status = running
    ? mode === "focus"
      ? "Идёт фокус"
      : "Идёт перерыв"
    : remaining < total
      ? "Пауза"
      : "Готово";

  const subLine = running
    ? mode === "focus"
      ? endAt
        ? `завершится в ${fmtClock(endAt)}`
        : ""
      : tip
    : remaining < total
      ? "нажмите «Старт», чтобы продолжить"
      : `${Math.round(total / 60)} ${plural(Math.round(total / 60), ["минута", "минуты", "минут"])} ${
          mode === "focus" ? "фокуса" : "перерыва"
        }`;

  const primaryLabel = running ? "Пауза" : remaining < total ? "Продолжить" : "Старт";

  /* flow offer auto-dismisses if user starts something else */
  const flowTimeout = useRef<number | null>(null);
  useEffect(() => {
    if (flowPending) {
      flowTimeout.current = window.setTimeout(() => p.declineFlow(), 20000);
      return () => {
        if (flowTimeout.current) window.clearTimeout(flowTimeout.current);
      };
    }
  }, [flowPending, p]);

  return (
    <section
      data-card
      aria-label="Таймер"
      className="anim-fade-up relative overflow-hidden rounded-[28px] border border-white/[0.06] bg-ink-900/85 px-5 py-6 shadow-[0_40px_90px_-30px_rgba(0,0,0,0.75)] sm:px-8 sm:py-8"
      style={
        {
          animationDelay: "60ms",
          ...(focus.color ? { "--accent": focus.color, "--accent-ink": "#160f0a" } : {}),
        } as React.CSSProperties
      }
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 50% 0%, color-mix(in srgb, var(--accent) 7%, transparent), transparent 55%)",
        }}
      />

      <div className="relative">
        {/* mode tabs */}
        <div role="tablist" aria-label="Режим таймера" className="relative mx-auto grid w-full max-w-md grid-cols-3 rounded-full border border-white/[0.07] bg-ink-950/70 p-1">
          <span
            aria-hidden
            className="absolute bottom-1 top-1 left-1 rounded-full bg-[var(--accent)] shadow-[0_4px_18px_-4px_var(--accent)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{ width: "calc((100% - 0.5rem) / 3)", transform: `translateX(${tabIdx * 100}%)` }}
          />
          {MODES.map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={m === mode}
              onClick={() => p.switchMode(m)}
              className={`relative z-10 rounded-full py-2 font-display text-[10px] font-bold tracking-[0.14em] uppercase transition-colors duration-300 sm:text-[11px] ${
                m === mode ? "text-[var(--accent-ink)]" : "text-sand-400 hover:text-sand-100"
              }`}
            >
              {m === "short" ? "Перерыв" : m === "long" ? "Длинный" : "Фокус"}
            </button>
          ))}
        </div>

        {/* focus category */}
        <div className="mx-auto mt-3 flex w-full max-w-md flex-wrap items-center justify-center gap-2" role="group" aria-label="Категория фокуса">
          {CATEGORIES.map((c) => {
            const Icon = c.id === "work" ? IconBriefcase : c.id === "study" ? IconBook : IconHeart;
            const on = settings.category === c.id;
            return (
              <button
                key={c.id}
                onClick={() => p.updateSettings({ category: c.id })}
                aria-pressed={on}
                title={`Категория: ${c.name}`}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-all duration-200 active:scale-95 ${
                  on ? c.chipOn : "border-white/10 text-sand-500 hover:-translate-y-0.5 hover:border-white/25 hover:text-sand-300"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {c.name}
              </button>
            );
          })}
          {settings.customModes.map((cm) => {
            const on = settings.activeCustom === cm.id;
            return (
              <button
                key={cm.id}
                onClick={() => p.updateSettings({ activeCustom: on ? null : cm.id })}
                aria-pressed={on}
                title={`${cm.name} · ${cm.minutes} мин`}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-all duration-200 active:scale-95 ${
                  on ? "text-ink-950" : "border-white/10 text-sand-500 hover:-translate-y-0.5 hover:border-white/25 hover:text-sand-300"
                }`}
                style={on ? { background: cm.color, borderColor: cm.color } : undefined}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: on ? "#17120e" : cm.color }} />
                {cm.name}
              </button>
            );
          })}
        </div>

        {/* quick focus duration */}
        <div className="mx-auto mt-3 flex w-full max-w-md items-center justify-center gap-1.5" role="group" aria-label="Быстрый выбор длительности фокуса">
          <span className="text-[10px] font-semibold tracking-wider text-sand-600 uppercase">Фокус:</span>
          {[15, 25, 45, 60].map((m) => {
            const cur = Math.round(total / 60);
            const ready = mode === "focus" && !running && remaining === total && !flowActive;
            const on = mode === "focus" && !flowActive && cur === m;
            return (
              <button
                key={m}
                onClick={() =>
                  p.updateSettings(
                    settings.activeCustom
                      ? { customModes: settings.customModes.map((cm) => (cm.id === settings.activeCustom ? { ...cm, minutes: m } : cm)) }
                      : { durations: { ...settings.durations, focus: m } }
                  )
                }
                disabled={mode === "focus" && !ready}
                aria-pressed={on}
                title={ready ? `Сделать фокус ${m} минут` : "Доступно, когда таймер не идёт"}
                className={`rounded-full border px-2.5 py-1 text-[10px] font-bold tabular-nums transition-all duration-200 active:scale-95 disabled:pointer-events-none disabled:opacity-35 ${
                  on ? "border-[var(--accent)]/50 bg-[var(--accent)]/10 text-[var(--accent)]" : "border-white/[0.07] text-sand-500 hover:border-white/25 hover:text-sand-200"
                }`}
              >
                {m}′
              </button>
            );
          })}
        </div>

        {/* ring + digits */}
        <div data-timer-shell className="relative mx-auto mt-7 w-[min(82vw,390px)] sm:mt-9">
          <div className="absolute -inset-5 rounded-full border border-dashed border-white/[0.07] sm:-inset-7" style={{ animation: "spin-slow 80s linear infinite" }} />
          {running && (
            <div className="absolute inset-10 rounded-full bg-[var(--accent)] blur-3xl" style={{ animation: "breathe 3.2s ease-in-out infinite" }} />
          )}

          <div className="relative aspect-square">
            <svg viewBox="0 0 400 400" className="absolute inset-0 h-full w-full -rotate-90">
              <g className="rotate-90" style={{ transformOrigin: "200px 200px" }}>
                {Array.from({ length: 60 }).map((_, i) => {
                  const major = i % 5 === 0;
                  return (
                    <line
                      key={i}
                      x1="200"
                      y1="24"
                      x2="200"
                      y2={major ? "36" : "30"}
                      stroke="var(--tick)"
                      strokeWidth={major ? 2 : 1}
                      opacity={major ? 0.28 : 0.1}
                      transform={`rotate(${i * 6} 200 200)`}
                    />
                  );
                })}
              </g>
              <circle cx="200" cy="200" r={R} fill="none" stroke="var(--tick)" strokeOpacity="0.07" strokeWidth="10" />
              <circle
                cx="200"
                cy="200"
                r={R}
                fill="none"
                stroke="var(--accent)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={CIRC}
                strokeDashoffset={CIRC * progress}
                style={{
                  transition: "stroke-dashoffset 0.45s linear",
                  filter: "drop-shadow(0 0 8px color-mix(in srgb, var(--accent) 65%, transparent))",
                }}
              />
              {/* seconds hand + cycle milestone nodes */}
              <g className="rotate-90" style={{ transformOrigin: "200px 200px" }}>
                <line
                  x1="200"
                  y1="200"
                  x2="200"
                  y2="118"
                  stroke="var(--accent)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  opacity={running ? 0.9 : 0.18}
                  transform={`rotate(${progress * 360} 200 200)`}
                  style={{ transition: "transform 0.45s linear, opacity 0.4s" }}
                />
                {Array.from({ length: settings.cycles }).map((_, i) => (
                  <circle
                    key={i}
                    cx="200"
                    cy={200 - R}
                    r="6"
                    fill={i < cyclePos ? "var(--accent)" : "rgba(23,18,14,0.9)"}
                    stroke={i < cyclePos ? "var(--accent)" : "rgba(242,234,223,0.25)"}
                    strokeWidth="1.5"
                    transform={`rotate(${(i / settings.cycles) * 360} 200 200)`}
                    style={{ transition: "fill 0.5s" }}
                  />
                ))}
              </g>
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span
                key={`label-${mode}-${flowActive}`}
                className="anim-pop flex items-center gap-1.5 font-display text-[10px] font-bold tracking-[0.34em] text-[var(--accent)] uppercase sm:text-xs"
              >
                {flowActive && <IconZap className="h-3.5 w-3.5" />}
                {flowActive ? "Поток" : focusLabel}
              </span>

              <div key={`digits-${mode}`} className="anim-pop mt-2" style={{ animationDelay: "60ms" }}>
                <RollingDigits value={fmtDuration(remaining)} running={running} />
              </div>

              <span className="mt-3 flex items-center gap-2 text-sm text-sand-400">
                <span className="relative flex h-2 w-2">
                  {running && (
                    <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--accent)]" style={{ animation: "ping-soft 1.6s cubic-bezier(0,0,0.2,1) infinite" }} />
                  )}
                  <span
                    className={`relative inline-flex h-2 w-2 rounded-full ${
                      running ? "bg-[var(--accent)]" : remaining < total ? "bg-sand-500" : "border border-sand-500"
                    }`}
                  />
                </span>
                {status}
                {subLine && (
                  <span
                    key={running && mode !== "focus" ? `tip-${subLine}` : "static"}
                    className="anim-fade-up text-sand-600"
                    style={{ animationDuration: "0.5s" }}
                  >
                    · {subLine}
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* flow mode offer */}
        {flowPending && (
          <div className="anim-pop mx-auto mt-6 max-w-md rounded-2xl border border-[var(--accent)]/40 bg-[var(--accent)]/[0.07] p-4 text-center">
            <p className="flex items-center justify-center gap-2 font-display text-sm font-bold text-sand-100">
              <IconZap className="h-4 w-4 text-[var(--accent)]" />
              Ещё в деле?
            </p>
            <p className="mt-1 text-xs text-sand-400">Продлите фокус на 10 минут — перерыв никуда не денется.</p>
            <div className="mt-3 flex justify-center gap-2">
              <button
                onClick={p.startFlow}
                className="rounded-full bg-[var(--accent)] px-4 py-2 text-xs font-bold text-[var(--accent-ink)] shadow-[0_10px_28px_-10px_var(--accent)] transition-all hover:-translate-y-0.5 hover:brightness-110 active:scale-95"
              >
                + 10 минут потока
              </button>
              <button
                onClick={p.declineFlow}
                className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-sand-400 transition-all hover:border-white/25 hover:text-sand-200 active:scale-95"
              >
                На перерыв
              </button>
            </div>
          </div>
        )}

        {/* controls */}
        <div className={`${flowPending ? "hidden" : ""} mt-7 flex items-center justify-center gap-3 sm:mt-9 sm:gap-4`}>
          <button
            onClick={p.reset}
            disabled={strictLocked}
            aria-label="Сбросить таймер"
            title={strictLocked ? "Строгий режим: сброс заблокирован" : "Сброс (R)"}
            className="group grid h-12 w-12 place-items-center rounded-full border border-white/10 text-sand-400 transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--accent)] hover:text-[var(--accent)] active:scale-90 disabled:pointer-events-none disabled:opacity-30"
          >
            <IconReset className="h-5 w-5 transition-transform duration-300 group-hover:-rotate-45" />
          </button>

          <button
            onClick={p.toggle}
            disabled={strictLocked}
            title={strictLocked ? "В строгом режиме пауза запрещена" : "Пробел"}
            className="group flex h-14 w-44 items-center justify-center gap-2.5 rounded-full bg-[var(--accent)] font-display text-sm font-bold tracking-wide text-[var(--accent-ink)] shadow-[0_14px_40px_-10px_var(--accent)] transition-all duration-200 hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 active:scale-95 disabled:pointer-events-none disabled:opacity-70 sm:w-52 sm:text-base"
          >
            {strictLocked ? (
              <>
                <IconLock className="h-5 w-5" />
                Строгий режим
              </>
            ) : (
              <>
                {running ? (
                  <IconPause className="h-5 w-5 transition-transform group-active:scale-75" />
                ) : (
                  <IconPlay className="h-5 w-5 transition-transform group-hover:scale-110 group-active:scale-90" />
                )}
                {primaryLabel}
              </>
            )}
          </button>

          <button
            onClick={p.skip}
            disabled={strictLocked}
            aria-label="Пропустить и перейти к следующей сессии"
            title={strictLocked ? "Строгий режим: пропуск заблокирован" : "Пропустить (S)"}
            className="group grid h-12 w-12 place-items-center rounded-full border border-white/10 text-sand-400 transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--accent)] hover:text-[var(--accent)] active:scale-90 disabled:pointer-events-none disabled:opacity-30"
          >
            <IconSkip className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-0.5" />
          </button>
        </div>

        {/* distraction counter */}
        {mode === "focus" && running && !strictLocked && (
          <div className="mt-3 flex justify-center">
            <button
              onClick={p.incrementDistraction}
              className="anim-fade-up flex items-center gap-2 rounded-full border border-ember-500/35 bg-ember-500/10 px-4 py-2 text-xs font-semibold text-ember-300 transition-all duration-200 hover:-translate-y-0.5 hover:bg-ember-500/20 active:scale-95"
              title="Отметить отвлечение — телефон, мысли, чайник…"
            >
              <IconFlag className="h-3.5 w-3.5" />
              {distractions > 0 ? (
                <>
                  Отвлёкся · <span className="font-display font-bold">{distractions}</span>
                </>
              ) : (
                "Отвлёкся? Отметь — таймер идёт"
              )}
            </button>
          </div>
        )}

        {/* contextual quick actions */}
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          {mode === "focus" && !strictLocked && !flowPending && (running || remaining < total) && (
            <>
              <button
                onClick={() => p.extend(5)}
                className="rounded-full border border-white/10 px-3.5 py-1.5 text-[11px] font-semibold text-sand-400 transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--accent)] hover:text-[var(--accent)] active:scale-95"
                title="Добавить 5 минут к текущему фокусу"
              >
                + 5 мин
              </button>
              <button
                onClick={p.finishEarly}
                className="rounded-full border border-white/10 px-3.5 py-1.5 text-[11px] font-semibold text-sand-400 transition-all duration-200 hover:-translate-y-0.5 hover:border-mint-500 hover:text-mint-400 active:scale-95"
                title="Остановить и записать фактические минуты"
              >
                Завершить досрочно
              </button>
            </>
          )}
          {mode !== "focus" && !flowPending && (
            <button
              onClick={p.skipBreak}
              className="rounded-full border border-white/10 px-3.5 py-1.5 text-[11px] font-semibold text-sand-400 transition-all duration-200 hover:-translate-y-0.5 hover:border-mint-500 hover:text-mint-400 active:scale-95"
              title="Пропустить перерыв и сразу начать фокус"
            >
              Пропустить перерыв
            </button>
          )}
        </div>

        {/* anchor note */}
        {mode === "focus" && p.anchor && (
          <p className="anim-fade-up mx-auto mt-3 max-w-md truncate rounded-xl bg-white/[0.03] px-3 py-2 text-center text-xs text-sand-400">
            ↳ продолжаем: <span className="font-semibold text-sand-200">{p.anchor}</span>
          </p>
        )}

        {/* next up — during breaks */}
        {(mode === "short" || mode === "long") && (
          <div className="anim-fade-up mx-auto mt-5 max-w-md rounded-2xl border border-white/[0.05] bg-ink-950/60 px-4 py-3 text-center">
            <p className="text-[10px] font-semibold tracking-[0.22em] text-sand-600 uppercase">Дальше</p>
            <p className="mt-1 text-sm text-sand-300">
              {focus.label} · {nextFocusMin} {plural(nextFocusMin, ["минута", "минуты", "минут"])}
              {p.nextTaskTitle ? (
                <>
                  {" "}
                  · <span className="font-semibold text-[var(--accent)]">«{p.nextTaskTitle}»</span>
                </>
              ) : (
                <span className="text-sand-500"> · добавьте задачу на вкладке «Задачи»</span>
              )}
            </p>
            <input
              value={p.anchor ?? ""}
              onChange={(e) => p.setAnchor(e.target.value.slice(0, 80) || null)}
              placeholder="Якорь: вернусь и продолжу с…"
              aria-label="Заметка-якорь для следующего фокуса"
              className="mt-2.5 w-full rounded-xl border border-white/[0.07] bg-ink-950/70 px-3 py-2 text-center text-xs text-sand-200 placeholder:text-sand-600 transition-colors focus:border-[var(--accent)] focus:outline-none"
            />
          </div>
        )}

        {/* cycle dots */}
        <div className="mt-6 flex flex-col items-center gap-2">
          <div className="flex items-center gap-2.5">
            {Array.from({ length: settings.cycles }).map((_, i) => (
              <span
                key={`${i}-${i < cyclePos}`}
                className={`h-2.5 w-2.5 rounded-full transition-colors duration-500 ${
                  i < cyclePos ? "anim-pop bg-[var(--accent)] shadow-[0_0_10px_var(--accent)]" : "border border-sand-600/70"
                }`}
              />
            ))}
          </div>
          <p className="text-xs tracking-wide text-sand-500">
            {mode === "focus"
              ? `Круг ${Math.min(cyclePos + 1, settings.cycles)} из ${settings.cycles} · затем длинный перерыв`
              : cyclePos === 0 && mode === "long"
                ? "Круг завершён — время восстановиться"
                : `${settings.cycles - cyclePos} ${plural(settings.cycles - cyclePos, ["круг", "круга", "кругов"])} до длинного перерыва`}
          </p>
        </div>
      </div>
    </section>
  );
}
