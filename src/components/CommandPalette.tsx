import { useEffect, useMemo, useRef, useState } from "react";
import { IconX } from "./icons";

export interface PaletteAction {
  id: string;
  label: string;
  hint?: string;
  run: () => void;
}

export default function CommandPalette({ open, onClose, actions }: { open: boolean; onClose: () => void; actions: PaletteAction[] }) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQ("");
      setSel(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return actions;
    return actions.filter((a) => a.label.toLowerCase().includes(s) || a.hint?.toLowerCase().includes(s));
  }, [q, actions]);

  useEffect(() => setSel(0), [q]);

  if (!open) return null;

  const run = (a: PaletteAction) => {
    a.run();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[128] flex items-start justify-center bg-black/60 p-4 pt-[12vh] backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Палитра команд"
        className="anim-pop w-full max-w-lg overflow-hidden rounded-2xl border border-white/[0.1] bg-ink-900 shadow-[0_50px_110px_-30px_rgba(0,0,0,0.9)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3">
          <span className="font-display text-xs font-bold tracking-[0.2em] text-[var(--accent)] uppercase">Команды</span>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setSel((s) => Math.min(filtered.length - 1, s + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setSel((s) => Math.max(0, s - 1));
              } else if (e.key === "Enter" && filtered[sel]) {
                e.preventDefault();
                run(filtered[sel]);
              } else if (e.key === "Escape") {
                onClose();
              }
            }}
            placeholder="Начните вводить… например «поток» или «экспорт»"
            className="min-w-0 flex-1 bg-transparent text-sm text-sand-100 placeholder:text-sand-600 focus:outline-none"
          />
          <button onClick={onClose} aria-label="Закрыть палитру" className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-white/10 text-sand-500 transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]">
            <IconX className="h-3.5 w-3.5" />
          </button>
        </div>

        <ul className="scroll-slim max-h-[46vh] overflow-y-auto p-2">
          {filtered.length === 0 && <li className="px-3 py-6 text-center text-sm text-sand-500 italic">Ничего не нашлось</li>}
          {filtered.map((a, i) => (
            <li key={a.id}>
              <button
                onClick={() => run(a)}
                onMouseEnter={() => setSel(i)}
                className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                  i === sel ? "bg-[var(--accent)]/12 text-sand-100" : "text-sand-300"
                }`}
              >
                <span className="font-medium">{a.label}</span>
                {a.hint && <span className="text-[11px] text-sand-600">{a.hint}</span>}
              </button>
            </li>
          ))}
        </ul>

        <p className="border-t border-white/[0.06] px-4 py-2 text-[10px] text-sand-600">↑↓ — выбор · Enter — выполнить · Esc — закрыть</p>
      </div>
    </div>
  );
}
