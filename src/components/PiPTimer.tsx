import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MODE_LABEL, type Pomodoro } from "../hooks/usePomodoro";
import { fmtDuration } from "../lib/time";
import { IconPause, IconPlay, IconX } from "./icons";

/** Mini timer: Document Picture-in-Picture when available, draggable widget otherwise. */
export default function PiPTimer({ pomo, onClose }: { pomo: Pomodoro; onClose: () => void }) {
  const [pipWin, setPipWin] = useState<Window | null>(null);
  const dragRef = useRef<{ dx: number; dy: number } | null>(null);
  const posRef = useRef<{ x: number; y: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dpp = (window as unknown as {
      documentPictureInPicture?: { requestWindow: (o: { width: number; height: number }) => Promise<Window> };
    }).documentPictureInPicture;
    if (!dpp) return;
    let cancelled = false;
    dpp
      .requestWindow({ width: 380, height: 150 })
      .then((w) => {
        if (cancelled) {
          w.close();
          return;
        }
        [...document.head.querySelectorAll('link[rel="stylesheet"], link[rel="preconnect"], style')].forEach((n) =>
          w.document.head.appendChild(n.cloneNode(true))
        );
        w.document.body.style.margin = "0";
        w.document.body.style.background = "#17120e";
        w.addEventListener("pagehide", () => {
          if (!cancelled) onClose();
        });
        setPipWin(w);
      })
      .catch(() => {
        /* fall back to widget */
      });
    return () => {
      cancelled = true;
    };
  }, [onClose]);

  const content = (
    <div className={`mode-${pomo.mode} flex h-full min-h-0 items-center gap-4 p-4 font-body`}>
      <svg viewBox="0 0 64 64" className="h-16 w-16 shrink-0 -rotate-90">
        <circle cx="32" cy="32" r="27" fill="none" stroke="rgba(242,234,223,0.1)" strokeWidth="5" />
        <circle
          cx="32"
          cy="32"
          r="27"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={2 * Math.PI * 27}
          strokeDashoffset={2 * Math.PI * 27 * (pomo.total > 0 ? pomo.remaining / pomo.total : 1)}
          style={{ transition: "stroke-dashoffset 0.45s linear" }}
        />
      </svg>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[10px] font-bold tracking-[0.22em] uppercase" style={{ color: "var(--accent)" }}>
          {pomo.mode === "focus" ? pomo.focus.label : MODE_LABEL[pomo.mode]}
        </p>
        <p className="font-display text-3xl font-extrabold tabular-nums" style={{ color: "#f2eadf" }}>
          {fmtDuration(pomo.remaining)}
        </p>
      </div>
      <button
        onClick={pomo.toggle}
        aria-label={pomo.running ? "Пауза" : "Старт"}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full transition-transform active:scale-90"
        style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
      >
        {pomo.running ? <IconPause className="h-5 w-5" /> : <IconPlay className="h-5 w-5" />}
      </button>
      <button
        onClick={() => {
          pipWin?.close();
          onClose();
        }}
        aria-label="Закрыть мини-таймер"
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/15 text-sand-400 transition-colors hover:text-sand-100"
      >
        <IconX className="h-4 w-4" />
      </button>
    </div>
  );

  if (pipWin) return createPortal(content, pipWin.document.body);

  return (
    <div
      ref={cardRef}
      className="fixed right-6 bottom-6 z-[140] w-[330px] cursor-move rounded-2xl border border-white/[0.1] bg-ink-900/95 shadow-[0_30px_70px_-20px_rgba(0,0,0,0.85)] backdrop-blur"
      style={posRef.current ? { left: posRef.current.x, top: posRef.current.y, right: "auto", bottom: "auto" } : undefined}
      onPointerDown={(e) => {
        const el = cardRef.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        dragRef.current = { dx: e.clientX - r.left, dy: e.clientY - r.top };
        el.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!dragRef.current || !cardRef.current) return;
        const x = Math.min(window.innerWidth - 340, Math.max(6, e.clientX - dragRef.current.dx));
        const y = Math.min(window.innerHeight - 100, Math.max(6, e.clientY - dragRef.current.dy));
        posRef.current = { x, y };
        cardRef.current.style.left = `${x}px`;
        cardRef.current.style.top = `${y}px`;
        cardRef.current.style.right = "auto";
        cardRef.current.style.bottom = "auto";
      }}
      onPointerUp={() => (dragRef.current = null)}
      title="Мини-таймер (в этом браузере нет PiP — перетаскивайте)"
    >
      {content}
    </div>
  );
}
