import { useMemo, useState } from "react";
import type { SessionRec } from "../hooks/usePomodoro";
import { CAT_BY_ID } from "../lib/categories";
import { monthCalendar } from "../lib/insights";
import { fmtClock, fmtDay, plural, startOfDay } from "../lib/time";
import { IconCheck, IconTomato, IconX } from "./icons";

const MONTH_NAMES = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
const DOW = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

const MODE_NAME: Record<SessionRec["mode"], string> = {
  focus: "Фокус",
  short: "Короткий перерыв",
  long: "Длинный перерыв",
};

export default function MonthCalendar({ history }: { history: SessionRec[] }) {
  const now = new Date();
  const [view, setView] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [selected, setSelected] = useState<number | null>(null);

  const cells = useMemo(() => monthCalendar(history, view.y, view.m), [history, view]);
  const todayStart = startOfDay(Date.now());
  const maxMin = Math.max(1, ...cells.map((c) => c.focusMin));

  const shift = (d: number) => {
    const dt = new Date(view.y, view.m + d, 1);
    setView({ y: dt.getFullYear(), m: dt.getMonth() });
    setSelected(null);
  };

  const sel = selected !== null ? cells.find((c) => c.date === selected) ?? null : null;

  return (
    <div>
      <div className="flex items-center justify-between">
        <button onClick={() => shift(-1)} aria-label="Предыдущий месяц" className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-sand-400 transition-all hover:border-[var(--accent)] hover:text-[var(--accent)] active:scale-90">
          ←
        </button>
        <p className="font-display text-sm font-bold tracking-wide text-sand-100">
          {MONTH_NAMES[view.m]} {view.y}
        </p>
        <button onClick={() => shift(1)} aria-label="Следующий месяц" className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-sand-400 transition-all hover:border-[var(--accent)] hover:text-[var(--accent)] active:scale-90">
          →
        </button>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1">
        {DOW.map((d) => (
          <p key={d} className="text-center text-[10px] font-semibold tracking-wider text-sand-600 uppercase">
            {d}
          </p>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((c) => {
          const isToday = c.date === todayStart;
          const isSel = c.date === selected;
          const alpha = c.focusMin > 0 ? 0.18 + (c.focusMin / maxMin) * 0.72 : 0;
          return (
            <button
              key={c.date}
              onClick={() => setSelected(isSel ? null : c.date)}
              aria-label={`${fmtDay(c.date)} — ${c.pomodoros} помидоров, ${c.focusMin} минут фокуса`}
              className={`relative aspect-square rounded-xl border text-xs font-semibold transition-all duration-200 active:scale-90 ${
                c.inMonth ? "text-sand-200" : "text-sand-600/50"
              } ${isSel ? "border-[var(--accent)] shadow-[0_0_14px_-4px_var(--accent)]" : "border-white/[0.05] hover:border-white/[0.18]"} ${
                isToday ? "ring-1 ring-[var(--accent)]/60" : ""
              }`}
              style={{ background: `color-mix(in srgb, var(--accent) ${Math.round(alpha * 100)}%, transparent)` }}
            >
              {new Date(c.date).getDate()}
              {c.pomodoros > 0 && (
                <span className="absolute bottom-1 left-1/2 flex -translate-x-1/2 items-center gap-[2px]">
                  {Array.from({ length: Math.min(4, c.pomodoros) }).map((_, i) => (
                    <span key={i} className="h-1 w-1 rounded-full bg-[var(--accent)]" />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {sel ? (
        <div className="anim-fade-up mt-4 rounded-2xl border border-white/[0.05] bg-ink-950/60 p-4" style={{ animationDuration: "0.4s" }}>
          <div className="flex items-center justify-between gap-2">
            <p className="font-display text-xs font-bold tracking-wide text-sand-100 capitalize">{fmtDay(sel.date)}</p>
            <button onClick={() => setSelected(null)} aria-label="Закрыть детали дня" className="grid h-6 w-6 place-items-center rounded-md text-sand-500 transition-colors hover:text-sand-200 active:scale-90">
              <IconX className="h-3.5 w-3.5" />
            </button>
          </div>

          {sel.sessions.length === 0 ? (
            <p className="mt-3 text-sm text-sand-500 italic">В этот день сессий не было.</p>
          ) : (
            <>
              <p className="mt-1 text-xs text-sand-400">
                {sel.pomodoros > 0 && (
                  <>
                    <span className="font-semibold text-sand-200">{sel.pomodoros}</span>{" "}
                    {plural(sel.pomodoros, ["помидор", "помидора", "помидоров"])} ·{" "}
                  </>
                )}
                <span className="font-semibold text-sand-200">{sel.focusMin}</span>{" "}
                {plural(sel.focusMin, ["минута", "минуты", "минут"])} фокуса
              </p>
              <ul className="scroll-slim mt-3 max-h-44 space-y-1.5 overflow-y-auto pr-1">
                {sel.sessions.map((s, i) => (
                  <li key={s.endedAt + i} className="rounded-lg bg-white/[0.03] px-2.5 py-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: s.category ? CAT_BY_ID[s.category].hex : "rgba(181,166,145,0.4)" }} />
                      <span className="font-semibold text-sand-200">{MODE_NAME[s.mode]}</span>
                      {s.category && <span className="text-sand-500">· {CAT_BY_ID[s.category].name}</span>}
                      <span className="ml-auto text-sand-500 tabular-nums">
                        {fmtClock(s.endedAt)} · {s.minutes} мин
                      </span>
                    </div>
                    {s.mode === "focus" && (s.note || (s.distractions ?? 0) > 0 || s.clean === false) && (
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 pl-4 text-[11px] text-sand-500">
                        {s.note && <span className="text-sand-300 italic">«{s.note}»</span>}
                        {(s.distractions ?? 0) > 0 && <span>{s.distractions} {plural(s.distractions ?? 0, ["отвлечение", "отвлечения", "отвлечений"])}</span>}
                        {s.clean === false && <span>с паузами</span>}
                        {s.clean !== false && (s.distractions ?? 0) === 0 && s.note && (
                          <span className="flex items-center gap-1 text-mint-400">
                            <IconCheck className="h-3 w-3" /> чисто
                          </span>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      ) : (
        <p className="mt-3 flex items-center gap-2 text-[11px] text-sand-600">
          <IconTomato className="h-3.5 w-3.5" />
          Кликните по дню, чтобы увидеть сессии, категории и заметки.
        </p>
      )}
    </div>
  );
}
