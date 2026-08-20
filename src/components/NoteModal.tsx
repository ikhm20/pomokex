import { useEffect, useRef, useState } from "react";
import { plural } from "../lib/time";
import { IconCheck } from "./icons";

const MOODS = [
  { id: "easy", name: "Легко", emoji: "😊", cls: "border-mint-500/50 bg-mint-500/12 text-mint-400" },
  { id: "normal", name: "Норм", emoji: "🙂", cls: "border-lagoon-500/50 bg-lagoon-500/12 text-lagoon-400" },
  { id: "hard", name: "Тяжело", emoji: "💪", cls: "border-ember-500/50 bg-ember-500/12 text-ember-400" },
] as const;

interface Props {
  minutes: number;
  distractions: number;
  onSave: (note: string, mood: (typeof MOODS)[number]["id"] | null) => void;
  onSkip: () => void;
}

export default function NoteModal({ minutes, distractions, onSave, onSkip }: Props) {
  const [note, setNote] = useState("");
  const [mood, setMood] = useState<(typeof MOODS)[number]["id"] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  /* focus trap */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onSkip();
      if (e.key === "Tab" && boxRef.current) {
        const els = boxRef.current.querySelectorAll<HTMLElement>('input, button, [tabindex]:not([tabindex="-1"])');
        if (els.length === 0) return;
        const first = els[0];
        const last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onSkip]);

  return (
    <div className="fixed inset-0 z-[132] grid place-items-center bg-black/60 p-4 backdrop-blur-sm" onClick={onSkip}>
      <div
        ref={boxRef}
        className="anim-pop w-full max-w-sm rounded-2xl border border-white/[0.09] bg-ink-900 p-6 shadow-[0_40px_90px_-30px_rgba(0,0,0,0.85)]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Быстрая заметка"
      >
        <p className="font-display text-[10px] font-bold tracking-[0.3em] text-sand-500 uppercase">Помидор записан</p>
        <h3 className="mt-1 font-display text-lg font-bold text-sand-100">
          {minutes} {plural(minutes, ["минута", "минуты", "минут"])} фокуса
          {distractions > 0 && <span className="ml-2 text-xs font-semibold text-ember-400">· {distractions} {plural(distractions, ["отвлечение", "отвлечения", "отвлечений"])}</span>}
        </h3>

        <p className="mt-3 text-sm text-sand-400">Что удалось сделать?</p>
        <input
          ref={inputRef}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSave(note.trim(), mood);
          }}
          maxLength={140}
          placeholder="Например: дописал введение к диплому"
          className="mt-2 w-full rounded-xl border border-white/[0.08] bg-ink-950/70 px-3.5 py-2.5 text-sm text-sand-100 placeholder:text-sand-600 transition-colors focus:border-[var(--accent)] focus:outline-none"
        />

        <p className="mt-3 text-sm text-sand-400">Как шла сессия?</p>
        <div className="mt-2 flex gap-2">
          {MOODS.map((m) => (
            <button
              key={m.id}
              onClick={() => setMood(mood === m.id ? null : m.id)}
              aria-pressed={mood === m.id}
              className={`flex-1 rounded-xl border px-2 py-2 text-xs font-semibold transition-all active:scale-95 ${
                mood === m.id ? m.cls : "border-white/[0.08] text-sand-500 hover:border-white/25 hover:text-sand-300"
              }`}
            >
              <span className="mr-1">{m.emoji}</span>
              {m.name}
            </button>
          ))}
        </div>

        <div className="mt-5 flex gap-2">
          <button
            onClick={onSkip}
            className="flex-1 rounded-full border border-white/10 py-2.5 text-sm font-semibold text-sand-400 transition-colors hover:bg-white/[0.05] active:scale-95"
          >
            Пропустить
          </button>
          <button
            onClick={() => onSave(note.trim(), mood)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[var(--accent)] py-2.5 font-display text-sm font-bold text-[var(--accent-ink)] shadow-[0_10px_28px_-10px_var(--accent)] transition-all hover:brightness-110 active:scale-95"
          >
            <IconCheck className="h-4 w-4" />
            Сохранить
          </button>
        </div>
        <p className="mt-3 text-center text-[10px] text-sand-600">Enter — сохранить · Esc — пропустить</p>
      </div>
    </div>
  );
}
