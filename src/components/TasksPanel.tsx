import { useMemo, useRef, useState } from "react";
import type { Task, TaskStatus } from "../hooks/useTasks";
import { plural, startOfDay } from "../lib/time";
import { IconArchive, IconCheck, IconGrip, IconPlus, IconRepeat, IconTarget, IconTomato, IconTrash, IconX } from "./icons";

const LANES: { id: TaskStatus; name: string; dot: string }[] = [
  { id: "todo", name: "Надо сделать", dot: "bg-sand-500" },
  { id: "doing", name: "В работе", dot: "bg-[var(--accent)]" },
  { id: "done", name: "Готово", dot: "bg-mint-500" },
];

function dueState(t: Task): "none" | "today" | "soon" | "over" {
  if (!t.deadline || t.status === "done") return "none";
  const today = startOfDay(Date.now());
  if (t.deadline < today) return "over";
  if (t.deadline === today) return "today";
  if (t.deadline <= today + 2 * 86_400_000) return "soon";
  return "none";
}

interface Props {
  tasks: Task[];
  archive: Task[];
  activeId: string | null;
  wipLimit: number;
  onAdd: (title: string, estimate: number, opts: { deadline: number | null; recurring: boolean }) => void;
  onMove: (id: string, status: TaskStatus, index?: number) => void;
  onPatch: (id: string, p: Partial<Task>) => void;
  onRemove: (id: string) => void;
  onActive: (id: string) => void;
  onAddCheck: (taskId: string, text: string) => void;
  onToggleCheck: (taskId: string, itemId: string) => void;
  onRemoveCheck: (taskId: string, itemId: string) => void;
  onArchive: () => void;
  onClearArchive: () => void;
}

export default function TasksPanel(p: Props) {
  const [title, setTitle] = useState("");
  const [estimate, setEstimate] = useState(1);
  const [deadline, setDeadline] = useState("");
  const [recurring, setRecurring] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overLane, setOverLane] = useState<TaskStatus | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [showArchive, setShowArchive] = useState(false);
  const [wipWarn, setWipWarn] = useState(false);
  const [focusId, setFocusId] = useState<string | null>(null);
  const wipWarnTimer = useRef<number | null>(null);

  const byLane = useMemo(
    () => ({
      todo: p.tasks.filter((t) => t.status === "todo"),
      doing: p.tasks.filter((t) => t.status === "doing"),
      done: p.tasks.filter((t) => t.status === "done"),
    }),
    [p.tasks]
  );

  const doingFull = byLane.doing.length >= p.wipLimit;

  const flashWip = () => {
    setWipWarn(true);
    if (wipWarnTimer.current) window.clearTimeout(wipWarnTimer.current);
    wipWarnTimer.current = window.setTimeout(() => setWipWarn(false), 1600);
  };

  const tryMove = (id: string, status: TaskStatus, index?: number) => {
    const t = p.tasks.find((x) => x.id === id);
    if (!t) return;
    if (status === "doing" && t.status !== "doing" && doingFull) {
      flashWip();
      return;
    }
    p.onMove(id, status, index);
  };

  const submit = () => {
    if (!title.trim()) return;
    p.onAdd(title, estimate, {
      deadline: deadline ? startOfDay(new Date(deadline + "T00:00:00").getTime()) : null,
      recurring,
    });
    setTitle("");
    setEstimate(1);
    setDeadline("");
    setRecurring(false);
  };

  /* keyboard navigation between cards */
  const onKeyDown = (e: React.KeyboardEvent) => {
    const t = e.target as HTMLElement;
    if (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable) return;
    if (!focusId) {
      const first = p.tasks[0];
      if (first && ["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft"].includes(e.key)) {
        e.preventDefault();
        setFocusId(first.id);
      }
      return;
    }
    const task = p.tasks.find((x) => x.id === focusId);
    if (!task) return;
    const lane = byLane[task.status];
    const idx = lane.findIndex((x) => x.id === focusId);

    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      const next = e.key === "ArrowDown" ? lane[idx + 1] : lane[idx - 1];
      if (next) {
        setFocusId(next.id);
        (document.querySelector(`[data-card-id="${next.id}"]`) as HTMLElement | null)?.focus();
      }
    } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      const laneIds: TaskStatus[] = ["todo", "doing", "done"];
      const li = laneIds.indexOf(task.status);
      const target = laneIds[li + (e.key === "ArrowRight" ? 1 : -1)];
      if (!target) return;
      tryMove(focusId, target);
      window.setTimeout(() => (document.querySelector(`[data-card-id="${focusId}"]`) as HTMLElement | null)?.focus(), 30);
    } else if (e.key === "Enter") {
      e.preventDefault();
      tryMove(focusId, task.status === "done" ? "todo" : "done");
    }
  };

  return (
    <div onKeyDown={onKeyDown}>
      {/* add form */}
      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Новая задача…"
          maxLength={120}
          className="min-w-0 flex-1 rounded-xl border border-white/[0.08] bg-ink-950/70 px-3.5 py-2.5 text-sm text-sand-100 placeholder:text-sand-600 transition-colors focus:border-[var(--accent)] focus:outline-none"
        />
        <div className="flex items-center gap-1 rounded-xl border border-white/[0.08] bg-ink-950/70 px-1.5 py-1" title="Оценка в помидорах">
          <button type="button" aria-label="Меньше помидоров" onClick={() => setEstimate((v) => Math.max(1, v - 1))} className="grid h-6 w-6 place-items-center rounded-lg text-sand-400 transition-colors hover:text-[var(--accent)] active:scale-90 disabled:opacity-30" disabled={estimate <= 1}>
            −
          </button>
          <span className="flex items-center gap-1 px-1 font-display text-xs font-bold text-sand-200 tabular-nums">
            <IconTomato className="h-4 w-4" />
            {estimate}
          </span>
          <button type="button" aria-label="Больше помидоров" onClick={() => setEstimate((v) => Math.min(8, v + 1))} className="grid h-6 w-6 place-items-center rounded-lg text-sand-400 transition-colors hover:text-[var(--accent)] active:scale-90 disabled:opacity-30" disabled={estimate >= 8}>
            +
          </button>
        </div>
        <button type="submit" aria-label="Добавить задачу" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--accent)] text-[var(--accent-ink)] shadow-[0_8px_24px_-8px_var(--accent)] transition-all hover:-translate-y-0.5 hover:brightness-110 active:scale-90">
          <IconPlus className="h-5 w-5" />
        </button>
        <div className="flex w-full items-center gap-2">
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            aria-label="Дедлайн задачи"
            className="rounded-lg border border-white/[0.08] bg-ink-950/70 px-2 py-1.5 text-[11px] text-sand-300 transition-colors focus:border-[var(--accent)] focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setRecurring((r) => !r)}
            aria-pressed={recurring}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-all active:scale-95 ${
              recurring ? "border-[var(--accent)]/50 bg-[var(--accent)]/10 text-[var(--accent)]" : "border-white/[0.08] text-sand-500 hover:text-sand-300"
            }`}
            title="Ежедневная задача возвращается в очередь каждое утро"
          >
            <IconRepeat className="h-3.5 w-3.5" />
            ежедневно
          </button>
        </div>
      </form>

      {wipWarn && (
        <p className="anim-pop mt-2 rounded-xl border border-ember-500/35 bg-ember-500/10 px-3 py-2 text-center text-[11px] font-semibold text-ember-400">
          WIP-лимит: не больше {p.wipLimit} {plural(p.wipLimit, ["задачи", "задач", "задач"])} в работе
        </p>
      )}

      {/* lanes */}
      <div className="mt-3 grid gap-2.5 sm:grid-cols-3">
        {LANES.map((lane) => {
          const items = byLane[lane.id];
          const isOver = overLane === lane.id;
          const wipBlocked = lane.id === "doing" && doingFull && dragId && !items.some((t) => t.id === dragId);
          return (
            <div
              key={lane.id}
              onDragOver={(e) => {
                e.preventDefault();
                setOverLane(lane.id);
              }}
              onDragLeave={() => setOverLane((o) => (o === lane.id ? null : o))}
              onDrop={(e) => {
                e.preventDefault();
                if (dragId) tryMove(dragId, lane.id, overIndex ?? undefined);
                setDragId(null);
                setOverLane(null);
                setOverIndex(null);
              }}
              className={`rounded-2xl border p-2 transition-all duration-200 ${
                isOver && !wipBlocked ? "border-[var(--accent)]/60 bg-[var(--accent)]/[0.05]" : "border-white/[0.05] bg-ink-950/40"
              } ${wipBlocked ? "border-ember-500/40 opacity-70" : ""}`}
            >
              <p className="flex items-center gap-1.5 px-1 pb-1.5 text-[10px] font-bold tracking-[0.14em] text-sand-500 uppercase">
                <span className={`h-1.5 w-1.5 rounded-full ${lane.dot}`} />
                {lane.name}
                <span className="text-sand-600">
                  {lane.id === "doing" ? `${items.length}/${p.wipLimit}` : items.length}
                </span>
                {lane.id === "done" && items.length > 0 && (
                  <button
                    onClick={p.onArchive}
                    title="Убрать готовые задачи старше дня в архив"
                    className="ml-auto grid h-5 w-5 place-items-center rounded-md text-sand-600 transition-colors hover:text-[var(--accent)] active:scale-90"
                    aria-label="Архивировать готовые"
                  >
                    <IconArchive className="h-3.5 w-3.5" />
                  </button>
                )}
              </p>
              <div className="min-h-[42px] space-y-1.5">
                {items.length === 0 && (
                  <p className="px-2 py-3 text-center text-[11px] text-sand-600 italic">
                    {lane.id === "todo" ? "пусто" : lane.id === "doing" ? "возьмите задачу в работу" : "здесь появятся победы"}
                  </p>
                )}
                {items.map((t, i) => (
                  <TaskCard
                    key={t.id}
                    t={t}
                    active={t.id === p.activeId}
                    focused={t.id === focusId}
                    dragging={dragId === t.id}
                    onDragStart={(e) => {
                      setDragId(t.id);
                      setFocusId(t.id);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragEnd={() => {
                      setDragId(null);
                      setOverLane(null);
                      setOverIndex(null);
                    }}
                    onDragOverCard={(e) => {
                      e.preventDefault();
                      const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      setOverIndex(e.clientY < r.top + r.height / 2 ? i : i + 1);
                    }}
                    onFocusCard={() => setFocusId(t.id)}
                    onActive={() => p.onActive(t.id)}
                    onRemove={() => p.onRemove(t.id)}
                    onMoveTo={(st) => tryMove(t.id, st)}
                    onAddCheck={(text) => p.onAddCheck(t.id, text)}
                    onToggleCheck={(itemId) => p.onToggleCheck(t.id, itemId)}
                    onRemoveCheck={(itemId) => p.onRemoveCheck(t.id, itemId)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-2.5 text-[10px] leading-relaxed text-sand-600">
        Перетаскивайте карточки между колонками (и внутри них) · стрелки ← → ↑ ↓ и Enter — с клавиатуры · помидоры
        активной задачи считаются сами.
      </p>

      {/* archive */}
      {p.archive.length > 0 && (
        <div className="mt-3">
          <button
            onClick={() => setShowArchive((s) => !s)}
            className="flex items-center gap-1.5 text-[11px] font-semibold text-sand-500 transition-colors hover:text-sand-300"
          >
            <IconArchive className="h-3.5 w-3.5" />
            Архив · {p.archive.length} {showArchive ? "▲" : "▼"}
          </button>
          {showArchive && (
            <div className="anim-fade-up mt-2 rounded-2xl border border-white/[0.05] bg-ink-950/40 p-2.5" style={{ animationDuration: "0.4s" }}>
              <ul className="scroll-slim max-h-36 space-y-1 overflow-y-auto pr-1">
                {p.archive.map((t) => (
                  <li key={t.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-sand-500">
                    <IconCheck className="h-3 w-3 text-mint-500" />
                    <span className="truncate line-through decoration-sand-600/60">{t.title}</span>
                    <span className="ml-auto shrink-0 tabular-nums">
                      {t.actual}/{t.estimate}
                    </span>
                  </li>
                ))}
              </ul>
              <button
                onClick={p.onClearArchive}
                className="mt-2 flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1 text-[10px] font-semibold text-sand-500 transition-all hover:border-ember-500 hover:text-ember-400 active:scale-95"
              >
                <IconTrash className="h-3 w-3" />
                Очистить архив
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TaskCard({
  t,
  active,
  focused,
  dragging,
  onDragStart,
  onDragEnd,
  onDragOverCard,
  onFocusCard,
  onActive,
  onRemove,
  onMoveTo,
  onAddCheck,
  onToggleCheck,
  onRemoveCheck,
}: {
  t: Task;
  active: boolean;
  focused: boolean;
  dragging: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onDragOverCard: (e: React.DragEvent) => void;
  onFocusCard: () => void;
  onActive: () => void;
  onRemove: () => void;
  onMoveTo: (st: TaskStatus) => void;
  onAddCheck: (text: string) => void;
  onToggleCheck: (itemId: string) => void;
  onRemoveCheck: (itemId: string) => void;
}) {
  const ds = dueState(t);
  const [checkOpen, setCheckOpen] = useState(false);
  const [checkText, setCheckText] = useState("");
  const doneChecks = t.checklist.filter((c) => c.done).length;

  return (
    <div
      data-card-id={t.id}
      tabIndex={0}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOverCard}
      onFocus={onFocusCard}
      className={`group cursor-grab rounded-xl border bg-ink-900/90 p-2.5 outline-none transition-all duration-200 active:cursor-grabbing ${
        dragging ? "opacity-40" : ""
      } ${
        active
          ? "border-[var(--accent)]/50 shadow-[0_8px_24px_-14px_var(--accent)]"
          : focused
            ? "border-[var(--accent)]/70"
            : "border-white/[0.06] hover:border-white/[0.16]"
      }`}
    >
      <div className="flex items-start gap-1.5">
        <span className="mt-0.5 text-sand-600 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden>
          <IconGrip className="h-3.5 w-3.5" />
        </span>
        <button
          onClick={onActive}
          aria-label={active ? "Текущая задача" : "Сделать текущей задачей"}
          title={active ? "Идёт работа над этой задачей" : "Работать над этой задачей"}
          className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border transition-all active:scale-90 ${
            active
              ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)]"
              : "border-sand-600/70 text-sand-500 hover:border-[var(--accent)] hover:text-[var(--accent)]"
          }`}
        >
          <IconTarget className="h-3 w-3" />
        </button>
        <p className={`min-w-0 flex-1 break-words text-xs font-medium leading-snug ${t.status === "done" ? "text-sand-600 line-through" : "text-sand-200"}`}>
          {t.title}
        </p>
        <button
          onClick={onRemove}
          aria-label={`Удалить задачу «${t.title}»`}
          className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-sand-600 opacity-0 transition-all hover:bg-ember-500/10 hover:text-ember-400 focus-visible:opacity-100 group-hover:opacity-100 active:scale-90"
        >
          <IconX className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* meta row */}
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 pl-7">
        <span className={`text-[10px] tabular-nums ${t.actual > t.estimate ? "font-bold text-ember-400" : "text-sand-500"}`}>
          {t.actual}/{t.estimate} <IconTomato className="inline h-3 w-3" />
        </span>
        {t.recurring && (
          <span className="flex items-center gap-0.5 rounded-full bg-lagoon-500/12 px-1.5 py-0.5 text-[9px] font-semibold text-lagoon-400" title="Возвращается в очередь каждое утро">
            <IconRepeat className="h-2.5 w-2.5" />
            daily
          </span>
        )}
        {ds === "today" && (
          <span className="rounded-full bg-ember-500/15 px-1.5 py-0.5 text-[9px] font-bold text-ember-400">горит сегодня</span>
        )}
        {ds === "soon" && (
          <span className="rounded-full bg-white/[0.07] px-1.5 py-0.5 text-[9px] font-semibold text-sand-400">
            {new Date(t.deadline!).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
          </span>
        )}
        {ds === "over" && (
          <span className="rounded-full bg-ember-600/25 px-1.5 py-0.5 text-[9px] font-bold text-ember-300" style={{ animation: "ping-soft 2.4s infinite" }}>
            просрочено
          </span>
        )}
        {/* move buttons */}
        <span className="ml-auto flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          {t.status !== "todo" && (
            <button onClick={() => onMoveTo(t.status === "done" ? "doing" : "todo")} title="Назад" className="grid h-5 w-5 place-items-center rounded-md border border-white/10 text-sand-500 hover:text-sand-200 active:scale-90">
              ←
            </button>
          )}
          {t.status !== "done" && (
            <button onClick={() => onMoveTo(t.status === "todo" ? "doing" : "done")} title="Вперёд" className="grid h-5 w-5 place-items-center rounded-md border border-white/10 text-sand-500 hover:text-sand-200 active:scale-90">
              →
            </button>
          )}
        </span>
      </div>

      {/* checklist */}
      {t.checklist.length > 0 && (
        <div className="mt-1.5 pl-7">
          <button onClick={() => setCheckOpen((o) => !o)} className="text-[10px] font-semibold text-sand-500 transition-colors hover:text-sand-300">
            чек-лист {doneChecks}/{t.checklist.length} {checkOpen ? "▲" : "▼"}
          </button>
          {checkOpen && (
            <ul className="mt-1 space-y-0.5">
              {t.checklist.map((c) => (
                <li key={c.id} className="group/c flex items-center gap-1.5">
                  <button
                    onClick={() => onToggleCheck(c.id)}
                    aria-label={c.done ? "Снять отметку" : "Отметить пункт"}
                    className={`grid h-4 w-4 shrink-0 place-items-center rounded border transition-all active:scale-75 ${
                      c.done ? "border-mint-500 bg-mint-500 text-ink-950" : "border-sand-600/70 text-transparent hover:border-mint-400"
                    }`}
                  >
                    <IconCheck className="h-2.5 w-2.5" />
                  </button>
                  <span className={`min-w-0 flex-1 truncate text-[11px] ${c.done ? "text-sand-600 line-through" : "text-sand-300"}`}>{c.text}</span>
                  <button onClick={() => onRemoveCheck(c.id)} aria-label="Удалить пункт" className="text-sand-600 opacity-0 transition-opacity hover:text-ember-400 group-hover/c:opacity-100">
                    <IconX className="h-3 w-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <form
        className="mt-1.5 pl-7"
        onSubmit={(e) => {
          e.preventDefault();
          if (checkText.trim()) {
            onAddCheck(checkText);
            setCheckText("");
            setCheckOpen(true);
          }
        }}
      >
        <input
          value={checkText}
          onChange={(e) => setCheckText(e.target.value)}
          placeholder="+ пункт чек-листа"
          maxLength={100}
          className="w-full rounded-md border border-transparent bg-transparent px-1 py-0.5 text-[10px] text-sand-300 placeholder:text-sand-600/70 transition-colors focus:border-white/[0.12] focus:bg-ink-950/60 focus:outline-none"
        />
      </form>
    </div>
  );
}
