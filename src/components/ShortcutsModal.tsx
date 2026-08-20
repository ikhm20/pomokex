import { IconX } from "./icons";

const ROWS: [string, string][] = [
  ["Пробел", "старт / пауза"],
  ["R", "сбросить таймер"],
  ["S", "пропустить сессию"],
  ["F", "дзен-режим"],
  ["Ctrl K", "палитра команд"],
  ["← → ↑ ↓", "навигация по карточкам канбана"],
  ["Enter", "выполнить / вернуть задачу канбана"],
  ["Esc", "закрыть окно / выйти из дзена"],
  ["?", "эта справка"],
];

export default function ShortcutsModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[125] grid place-items-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="anim-pop w-full max-w-sm rounded-2xl border border-white/[0.08] bg-ink-900 p-6 shadow-[0_40px_90px_-30px_rgba(0,0,0,0.8)]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Горячие клавиши"
      >
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-display text-base font-bold text-sand-100">Горячие клавиши</h3>
          <button onClick={onClose} aria-label="Закрыть справку" className="grid h-8 w-8 place-items-center rounded-full border border-white/10 text-sand-400 transition-all hover:border-[var(--accent)] hover:text-[var(--accent)] active:scale-90">
            <IconX className="h-4 w-4" />
          </button>
        </div>

        <ul className="mt-4 space-y-1">
          {ROWS.map(([key, desc]) => (
            <li key={key} className="flex items-center justify-between gap-4 rounded-xl px-3 py-2 transition-colors hover:bg-white/[0.04]">
              <span className="text-sm text-sand-300">{desc}</span>
              <kbd className="rounded-md border border-white/10 bg-white/[0.05] px-2 py-1 font-body text-[11px] font-semibold text-sand-200">{key}</kbd>
            </li>
          ))}
        </ul>

        <p className="mt-4 text-[11px] leading-relaxed text-sand-600">
          Клавиши привязаны к физическим кнопкам — работают в любой раскладке. В строгом режиме управление таймером
          блокируется до конца фокуса.
        </p>
      </div>
    </div>
  );
}
