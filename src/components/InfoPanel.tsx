import { useEffect, useRef, useState } from "react";
import type { SessionRec } from "../hooks/usePomodoro";
import type { Task, TaskStatus } from "../hooks/useTasks";
import ActivityPanel from "./ActivityPanel";
import MonthCalendar from "./MonthCalendar";
import StatsPanel, { type TodayStats } from "./StatsPanel";
import TasksPanel from "./TasksPanel";
import { IconChevronDown, IconPin } from "./icons";

type Tab = "today" | "tasks" | "month" | "activity";

const ALL_TABS: { id: Tab; name: string }[] = [
  { id: "today", name: "Сегодня" },
  { id: "tasks", name: "Задачи" },
  { id: "month", name: "Месяц" },
  { id: "activity", name: "Активность" },
];

const TABS_KEY = "pomodoro.taborder.v1";

function loadTabOrder(): Tab[] {
  try {
    const raw = localStorage.getItem(TABS_KEY);
    if (raw) {
      const arr = JSON.parse(raw) as Tab[];
      const valid = ALL_TABS.map((t) => t.id).filter((id) => arr.includes(id));
      if (valid.length === ALL_TABS.length) return valid;
    }
  } catch {
    /* noop */
  }
  return ALL_TABS.map((t) => t.id);
}

interface Props {
  stats: TodayStats;
  goalMin: number;
  onGoalChange: (v: number) => void;
  weeklyGoal: number;
  onWeeklyGoalChange: (v: number) => void;
  promise: number;
  onPromiseChange: (v: number) => void;
  history: SessionRec[];
  tasks: Task[];
  archive: Task[];
  activeId: string | null;
  wipLimit: number;
  onAddTask: (title: string, estimate: number, opts: { deadline: number | null; recurring: boolean }) => void;
  onMoveTask: (id: string, status: TaskStatus, index?: number) => void;
  onPatchTask: (id: string, p: Partial<Task>) => void;
  onRemoveTask: (id: string) => void;
  onActiveTask: (id: string) => void;
  onAddCheck: (taskId: string, text: string) => void;
  onToggleCheck: (taskId: string, itemId: string) => void;
  onRemoveCheck: (taskId: string, itemId: string) => void;
  onArchiveTasks: () => void;
  onClearArchive: () => void;
  pinned: boolean;
  onTogglePin: () => void;
}

export default function InfoPanel(p: Props) {
  const [order, setOrder] = useState<Tab[]>(loadTabOrder);
  const [tab, setTab] = useState<Tab>(loadTabOrder()[0] ?? "today");
  const [collapsed, setCollapsed] = useState(false);
  const dragTab = useRef<Tab | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(TABS_KEY, JSON.stringify(order));
    } catch {
      /* noop */
    }
  }, [order]);

  const tabs = order.map((id) => ALL_TABS.find((t) => t.id === id)!);
  const idx = order.indexOf(tab);
  const openTasks = p.tasks.filter((t) => t.status !== "done").length;

  const onDropTab = (target: Tab) => {
    const from = dragTab.current;
    if (!from || from === target) return;
    setOrder((o) => {
      const next = o.filter((t) => t !== from);
      next.splice(next.indexOf(target) + (o.indexOf(from) < o.indexOf(target) ? 1 : 0), 0, from);
      return next;
    });
    dragTab.current = null;
  };

  return (
    <section
      data-card
      aria-label="Панель информации"
      className="anim-fade-up rounded-[26px] border border-white/[0.06] bg-ink-900/85 p-5 shadow-[0_30px_70px_-30px_rgba(0,0,0,0.7)] sm:p-6"
      style={{ animationDelay: "160ms" }}
    >
      <div className="flex items-center gap-2">
        {/* tabs */}
        <div role="tablist" aria-label="Разделы" className="relative min-w-0 flex-1 grid grid-cols-4 rounded-full border border-white/[0.07] bg-ink-950/70 p-1">
          <span
            aria-hidden
            className="absolute bottom-1 top-1 left-1 rounded-full bg-white/[0.08] ring-1 ring-white/[0.09] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{ width: "calc((100% - 0.5rem) / 4)", transform: `translateX(${Math.max(0, idx) * 100}%)` }}
          />
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              draggable
              onDragStart={() => (dragTab.current = t.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDropTab(t.id)}
              title="Клик — открыть, перетащить — поменять порядок"
              className={`relative z-10 flex cursor-grab items-center justify-center gap-1.5 rounded-full py-2 font-display text-[9px] font-bold tracking-[0.1em] uppercase transition-colors duration-300 active:cursor-grabbing sm:text-[10px] ${
                tab === t.id ? "text-sand-100" : "text-sand-500 hover:text-sand-300"
              }`}
            >
              {t.name}
              {t.id === "today" && p.stats.pomodoros > 0 && (
                <span className="rounded-full bg-[var(--accent)]/25 px-1.5 py-0.5 text-[9px] font-bold text-[var(--accent)]">{p.stats.pomodoros}</span>
              )}
              {t.id === "tasks" && openTasks > 0 && (
                <span className="rounded-full bg-white/[0.1] px-1.5 py-0.5 text-[9px] font-bold text-sand-300">{openTasks}</span>
              )}
            </button>
          ))}
        </div>

        <button
          onClick={p.onTogglePin}
          aria-pressed={p.pinned}
          aria-label={p.pinned ? "Открепить канбан" : "Закрепить канбан у таймера"}
          title={p.pinned ? "Открепить канбан" : "Закрепить канбан рядом с таймером"}
          className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border transition-all active:scale-90 ${
            p.pinned ? "border-[var(--accent)]/50 bg-[var(--accent)]/10 text-[var(--accent)]" : "border-white/10 text-sand-500 hover:border-[var(--accent)] hover:text-[var(--accent)]"
          }`}
        >
          <IconPin className="h-4 w-4" />
        </button>
        <button
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Развернуть панель" : "Свернуть панель"}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 text-sand-500 transition-all hover:border-[var(--accent)] hover:text-[var(--accent)] active:scale-90"
        >
          <IconChevronDown className={`h-4 w-4 transition-transform duration-300 ${collapsed ? "-rotate-90" : ""}`} />
        </button>
      </div>

      <div className={`grid transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${collapsed ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100"}`}>
        <div className="overflow-hidden">
          <div key={tab} className="anim-fade-up pt-5" style={{ animationDuration: "0.45s" }}>
            {tab === "today" && (
              <StatsPanel
                stats={p.stats}
                goalMin={p.goalMin}
                onGoalChange={p.onGoalChange}
                weeklyGoal={p.weeklyGoal}
                onWeeklyGoalChange={p.onWeeklyGoalChange}
                promise={p.promise}
                onPromiseChange={p.onPromiseChange}
                history={p.history}
              />
            )}
            {tab === "tasks" && (
              <TasksPanel
                tasks={p.tasks}
                archive={p.archive}
                activeId={p.activeId}
                wipLimit={p.wipLimit}
                onAdd={p.onAddTask}
                onMove={p.onMoveTask}
                onPatch={p.onPatchTask}
                onRemove={p.onRemoveTask}
                onActive={p.onActiveTask}
                onAddCheck={p.onAddCheck}
                onToggleCheck={p.onToggleCheck}
                onRemoveCheck={p.onRemoveCheck}
                onArchive={p.onArchiveTasks}
                onClearArchive={p.onClearArchive}
              />
            )}
            {tab === "month" && <MonthCalendar history={p.history} />}
            {tab === "activity" && <ActivityPanel history={p.history} />}
          </div>
        </div>
      </div>
    </section>
  );
}
