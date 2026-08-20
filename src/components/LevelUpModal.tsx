import { useEffect } from "react";
import { burstConfetti } from "../lib/confetti";
import { IconTrophy } from "./icons";

export default function LevelUpModal({ level, score, onClose }: { level: number; score: number; onClose: () => void }) {
  useEffect(() => {
    burstConfetti();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[135] grid place-items-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="anim-pop relative w-full max-w-sm overflow-hidden rounded-[26px] border border-[var(--accent)]/40 bg-ink-900 p-8 text-center shadow-[0_0_80px_-20px_var(--accent)]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Новый уровень"
      >
        <div aria-hidden className="absolute inset-x-0 top-0 h-[3px] bg-[var(--accent)] shadow-[0_0_18px_var(--accent)]" />
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[var(--accent)]/15 text-[var(--accent)] shadow-[0_10px_30px_-12px_var(--accent)]">
          <IconTrophy className="h-8 w-8" />
        </span>
        <p className="mt-4 font-display text-[10px] font-bold tracking-[0.34em] text-sand-500 uppercase">Фокус-скор</p>
        <h3 className="mt-1 font-display text-3xl font-extrabold text-sand-100">Уровень {level}</h3>
        <p className="mt-2 text-sm text-sand-400">{score} очков в копилке. Чистые сессии без отвлечений весят больше — так держать!</p>
        <button onClick={onClose} className="mt-6 w-full rounded-full bg-[var(--accent)] py-2.5 font-display text-sm font-bold text-[var(--accent-ink)] transition-all hover:brightness-110 active:scale-95">
          Продолжить
        </button>
      </div>
    </div>
  );
}
