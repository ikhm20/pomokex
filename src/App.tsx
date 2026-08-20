import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CommandPalette, { type PaletteAction } from "./components/CommandPalette";
import DaySummaryModal from "./components/DaySummaryModal";
import InfoPanel from "./components/InfoPanel";
import LevelUpModal from "./components/LevelUpModal";
import NoteModal from "./components/NoteModal";
import PiPTimer from "./components/PiPTimer";
import SettingsDrawer from "./components/SettingsDrawer";
import ShortcutsModal from "./components/ShortcutsModal";
import { computeToday } from "./components/StatsPanel";
import TasksPanel from "./components/TasksPanel";
import TimerCard from "./components/TimerCard";
import ZenMode from "./components/ZenMode";
import { IconDownload, IconExpand, IconPicture, IconPin, IconSliders, IconTomato, IconTrophy, IconZap } from "./components/icons";
import { MODE_LABEL, usePomodoro, type SessionRec } from "./hooks/usePomodoro";
import { useTasks } from "./hooks/useTasks";
import { previewMixer, startMixer, stopMixer } from "./lib/ambient";
import { playChime, setMasterVolume, unlockAudio } from "./lib/audio";
import { focusScore } from "./lib/insights";
import { sessionsToCSV, sessionsToICS } from "./lib/insights";
import { fmtDay, fmtDuration } from "./lib/time";

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="rounded-md border border-white/10 bg-white/[0.05] px-1.5 py-0.5 font-body text-[11px] font-semibold text-sand-400">
      {children}
    </kbd>
  );
}

const ACCENT_HEX: Record<string, string> = { focus: "#ff6b4a", short: "#3ecf9a", long: "#5ba8ff" };

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const headerBtn =
  "grid h-9 w-9 place-items-center rounded-full border border-white/[0.08] bg-ink-900/70 text-sand-400 transition-all hover:-translate-y-0.5 hover:border-[var(--accent)] hover:text-[var(--accent)] active:scale-90";

export default function App() {
  const tasksApi = useTasks();
  const [noteRec, setNoteRec] = useState<SessionRec | null>(null);
  const pomo = usePomodoro({
    onFocusComplete: (rec) => {
      tasksApi.onFocusDone();
      if (!rec.flow) setNoteRec(rec);
    },
  });
  const { settings, updateSettings } = pomo;

  const stats = useMemo(() => computeToday(pomo.history), [pomo.history]);
  const score = useMemo(() => focusScore(pomo.history), [pomo.history]);
  const untilNext = Math.max(1, Math.ceil(pomo.remaining / 60));

  const [zen, setZen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showKeys, setShowKeys] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [showClear, setShowClear] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [pipOpen, setPipOpen] = useState(false);
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const [flash, setFlash] = useState(0);
  const [floats, setFloats] = useState<{ id: number; text: string }[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [notifDenied, setNotifDenied] = useState(false);
  const [installEvt, setInstallEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [pinned, setPinned] = useState(() => {
    try {
      return localStorage.getItem("pomodoro.pinned") === "1";
    } catch {
      return false;
    }
  });
  const toastTimer = useRef<number | null>(null);

  const togglePin = useCallback(() => {
    setPinned((v) => {
      const nv = !v;
      try {
        localStorage.setItem("pomodoro.pinned", nv ? "1" : "0");
      } catch {
        /* noop */
      }
      return nv;
    });
  }, []);

  const notify = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3200);
  }, []);

  /* restored timer toast */
  useEffect(() => {
    if (pomo.restoredMsg) {
      notify(pomo.restoredMsg);
      pomo.clearRestoredMsg();
    }
  }, [pomo.restoredMsg, notify, pomo]);

  /* PWA install prompt */
  useEffect(() => {
    const onBip = (e: Event) => {
      e.preventDefault();
      setInstallEvt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  const onInstall = useCallback(async () => {
    if (!installEvt) return;
    await installEvt.prompt();
    const choice = await installEvt.userChoice;
    if (choice.outcome === "accepted") notify("Приложение устанавливается…");
    setInstallEvt(null);
  }, [installEvt, notify]);

  /* live tab title */
  useEffect(() => {
    document.title = pomo.running
      ? `${fmtDuration(pomo.remaining)} · ${pomo.mode === "focus" ? pomo.focus.label : MODE_LABEL[pomo.mode]} — Помодоро`
      : "Помодоро — таймер фокуса";
  }, [pomo.running, pomo.remaining, pomo.mode, pomo.focus.label]);

  /* live favicon progress ring */
  useEffect(() => {
    const link = document.getElementById("favicon") as HTMLLinkElement | null;
    if (!link) return;
    const total = Math.max(1, pomo.total);
    const frac = Math.min(1, Math.max(0, pomo.running || pomo.remaining < total ? 1 - pomo.remaining / total : 0));
    const C = 131.9;
    const color = pomo.focus.color ?? ACCENT_HEX[pomo.mode];
    link.href = `data:image/svg+xml,${encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' rx='14' fill='#17120e'/><circle cx='32' cy='32' r='21' fill='none' stroke='#3a2f26' stroke-width='7'/><circle cx='32' cy='32' r='21' fill='none' stroke='${color}' stroke-width='7' stroke-linecap='round' stroke-dasharray='${C}' stroke-dashoffset='${(C * (1 - frac)).toFixed(1)}' transform='rotate(-90 32 32)'/></svg>`
    )}`;
  }, [pomo.remaining, pomo.mode, pomo.running, pomo.total, pomo.focus.color]);

  /* theme + density + motion */
  useEffect(() => {
    document.documentElement.classList.toggle("theme-light", settings.theme === "light");
    document.documentElement.classList.toggle("compact", settings.compact);
    document.documentElement.classList.toggle("reduce-motion", settings.reducedMotion);
  }, [settings.theme, settings.compact, settings.reducedMotion]);

  /* master volume */
  useEffect(() => {
    setMasterVolume(settings.volume / 100);
  }, [settings.volume]);

  /* ambience mixer follows the running timer */
  useEffect(() => {
    if (pomo.running) startMixer(settings.mixer);
    else stopMixer();
    return () => stopMixer();
  }, [pomo.running, settings.mixer]);

  /* level-up celebration */
  const levelRef = useRef(score.level);
  useEffect(() => {
    if (score.level > levelRef.current) setLevelUp(score.level);
    levelRef.current = score.level;
  }, [score.level]);

  /* floating rewards on completed focus */
  const lastRecRef = useRef(0);
  useEffect(() => {
    const h = pomo.history;
    if (h.length === 0) return;
    const last = h[h.length - 1];
    if (last.endedAt <= lastRecRef.current) return;
    lastRecRef.current = last.endedAt;
    if (last.mode === "focus" && !last.flow) {
      const pts = Math.max(1, last.minutes + (last.clean !== false ? 5 : 0) - (last.distractions ?? 0) * 2);
      const id = last.endedAt;
      setFloats((f) => [...f, { id, text: `+${pts} очков` }, { id: id + 1, text: "+1 помидор" }]);
      window.setTimeout(() => setFloats((f) => f.filter((x) => x.id !== id && x.id !== id + 1)), 1800);
    }
  }, [pomo.history]);

  /* mode-change flash */
  const prevModeRef = useRef(pomo.mode);
  useEffect(() => {
    if (prevModeRef.current !== pomo.mode) {
      prevModeRef.current = pomo.mode;
      setFlash((f) => f + 1);
    }
  }, [pomo.mode]);

  /* keyboard shortcuts */
  const strictLocked = settings.strict && pomo.running && pomo.mode === "focus";
  const uiRef = useRef({ strictLocked, showClear, drawerOpen, showKeys, showSummary, paletteOpen });
  useEffect(() => {
    uiRef.current = { strictLocked, showClear, drawerOpen, showKeys, showSummary, paletteOpen };
  }, [strictLocked, showClear, drawerOpen, showKeys, showSummary, paletteOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if ((e.ctrlKey || e.metaKey) && e.code === "KeyK") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
        return;
      }
      if (e.code === "Escape") {
        if (uiRef.current.paletteOpen) setPaletteOpen(false);
        else if (uiRef.current.showKeys) setShowKeys(false);
        else if (uiRef.current.showClear) setShowClear(false);
        else if (uiRef.current.showSummary) setShowSummary(false);
        else if (uiRef.current.drawerOpen) setDrawerOpen(false);
        else setZen(false);
        return;
      }
      if (e.key === "?") {
        e.preventDefault();
        setShowKeys(true);
        return;
      }
      if (e.code === "KeyF") {
        setZen((z) => !z);
        return;
      }
      if (uiRef.current.strictLocked) return;
      if (e.code === "Space") {
        e.preventDefault();
        pomo.toggle();
      } else if (e.code === "KeyR") pomo.reset();
      else if (e.code === "KeyS") pomo.skip();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pomo.toggle, pomo.reset, pomo.skip]);

  /* sound handlers */
  const onMelodyTest = useCallback(() => {
    unlockAudio();
    playChime("focus", settings.melody);
  }, [settings.melody]);

  const onMixerPreview = useCallback(() => {
    unlockAudio();
    previewMixer(settings.mixer);
  }, [settings.mixer]);

  /* notifications */
  const onToggleNotifications = useCallback(
    async (v: boolean) => {
      if (!v) {
        updateSettings({ notifications: false });
        return;
      }
      if (typeof Notification === "undefined") {
        setNotifDenied(true);
        return;
      }
      const perm = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
      if (perm === "granted") {
        updateSettings({ notifications: true });
        setNotifDenied(false);
        notify("Уведомления включены");
      } else {
        setNotifDenied(true);
      }
    },
    [updateSettings, notify]
  );

  /* exports */
  const onExport = useCallback(() => {
    const data = {
      app: "pomodoro",
      version: 2,
      exportedAt: new Date().toISOString(),
      settings,
      history: pomo.history,
      tasks: tasksApi.tasks,
      archive: tasksApi.archive,
      activeTaskId: tasksApi.activeId,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pomodoro-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify("Файл с данными экспортирован");
  }, [settings, pomo.history, tasksApi.tasks, tasksApi.archive, tasksApi.activeId, notify]);

  const downloadText = useCallback((name: string, text: string, type: string) => {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const onExportCSV = useCallback(() => {
    if (pomo.history.length === 0) {
      notify("Пока нечего экспортировать — завершите первую сессию");
      return;
    }
    downloadText(`pomodoro-${new Date().toISOString().slice(0, 10)}.csv`, sessionsToCSV(pomo.history), "text/csv;charset=utf-8");
    notify("CSV выгружен");
  }, [pomo.history, downloadText, notify]);

  const onExportICS = useCallback(() => {
    if (pomo.history.filter((s) => s.mode === "focus").length === 0) {
      notify("Пока нет фокус-сессий для календаря");
      return;
    }
    downloadText(`pomodoro-${new Date().toISOString().slice(0, 10)}.ics`, sessionsToICS(pomo.history), "text/calendar;charset=utf-8");
    notify("ICS выгружен — импортируйте в свой календарь");
  }, [pomo.history, downloadText, notify]);

  const onImportFile = useCallback(
    (file: File) => {
      file
        .text()
        .then((text) => {
          try {
            const d = JSON.parse(text) as Record<string, unknown>;
            if (!d || typeof d !== "object" || (!Array.isArray(d.history) && typeof d.settings !== "object")) {
              throw new Error("bad shape");
            }
            pomo.applyImport({
              settings: (d.settings as never) ?? undefined,
              history: Array.isArray(d.history) ? (d.history as never) : undefined,
            });
            if (Array.isArray(d.tasks)) {
              tasksApi.replaceAll(d.tasks as never, (d.activeTaskId as string | null) ?? null);
            }
            notify("Данные импортированы");
          } catch {
            notify("Не удалось прочитать файл — это не наш JSON");
          }
        })
        .catch(() => notify("Не удалось прочитать файл"));
    },
    [pomo.applyImport, tasksApi, notify]
  );

  const confirmClear = useCallback(() => {
    pomo.clearHistory();
    setShowClear(false);
    notify("История очищена");
  }, [pomo, notify]);

  const activeTask = tasksApi.tasks.find((t) => t.id === tasksApi.activeId) ?? null;
  const nextTaskTitle = activeTask && activeTask.status !== "done" ? activeTask.title : null;

  const paletteActions = useMemo<PaletteAction[]>(
    () => [
      { id: "toggle", label: pomo.running ? "Пауза" : "Старт", hint: "Пробел", run: pomo.toggle },
      { id: "reset", label: "Сбросить таймер", hint: "R", run: pomo.reset },
      { id: "skip", label: "Пропустить сессию", hint: "S", run: pomo.skip },
      { id: "early", label: "Завершить фокус досрочно", run: pomo.finishEarly },
      { id: "ext5", label: "Добавить 5 минут к фокусу", run: () => pomo.extend(5) },
      { id: "skipbreak", label: "Пропустить перерыв", run: pomo.skipBreak },
      { id: "zen", label: "Дзен-режим", hint: "F", run: () => setZen(true) },
      { id: "pip", label: "Мини-таймер поверх окон", run: () => setPipOpen(true) },
      { id: "drawer", label: "Открыть настройки", run: () => setDrawerOpen(true) },
      { id: "summary", label: "Итоги дня", run: () => setShowSummary(true) },
      { id: "m-focus", label: "Режим: Фокус", run: () => pomo.switchMode("focus") },
      { id: "m-short", label: "Режим: Короткий перерыв", run: () => pomo.switchMode("short") },
      { id: "m-long", label: "Режим: Длинный перерыв", run: () => pomo.switchMode("long") },
      ...[15, 25, 45, 60].map((m) => ({
        id: `dur-${m}`,
        label: `Длительность фокуса: ${m} минут`,
        run: () => updateSettings({ durations: { ...settings.durations, focus: m } }),
      })),
      {
        id: "theme",
        label: settings.theme === "dark" ? "Включить светлую тему" : "Включить тёмную тему",
        run: () => updateSettings({ theme: settings.theme === "dark" ? "light" : "dark" }),
      },
      {
        id: "strict",
        label: settings.strict ? "Выключить строгий режим" : "Включить строгий режим",
        run: () => updateSettings({ strict: !settings.strict }),
      },
      {
        id: "flow",
        label: settings.flowMode ? "Выключить режим «поток»" : "Включить режим «поток»",
        run: () => updateSettings({ flowMode: !settings.flowMode }),
      },
      { id: "csv", label: "Экспорт CSV", run: onExportCSV },
      { id: "ics", label: "Экспорт в календарь (ICS)", run: onExportICS },
    ],
    [pomo, settings.durations, settings.theme, settings.strict, settings.flowMode, updateSettings, onExportCSV, onExportICS]
  );

  return (
    <div className={`mode-${pomo.mode} relative min-h-screen overflow-x-clip font-body text-sand-100`}>
      {/* ambient layers */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0" style={{ background: "var(--grad-base)" }} />
        <div className="absolute -top-[22%] -left-[14%] h-[72vh] w-[72vh] rounded-full bg-ember-500/[0.13] blur-[110px] transition-opacity duration-1000" style={{ opacity: pomo.mode === "focus" ? 1 : 0.25, animation: "drift-a 26s ease-in-out infinite" }} />
        <div className="absolute top-[24%] -right-[16%] h-[66vh] w-[66vh] rounded-full bg-mint-500/[0.11] blur-[110px] transition-opacity duration-1000" style={{ opacity: pomo.mode === "short" ? 1 : 0.2, animation: "drift-b 31s ease-in-out infinite" }} />
        <div className="absolute -bottom-[26%] left-[16%] h-[70vh] w-[70vh] rounded-full bg-lagoon-500/[0.12] blur-[110px] transition-opacity duration-1000" style={{ opacity: pomo.mode === "long" ? 1 : 0.2, animation: "drift-a 36s ease-in-out infinite" }} />
        <div className="grain absolute inset-0 opacity-[0.05]" />
      </div>

      {/* accent hairline */}
      <div aria-hidden className="fixed inset-x-0 top-0 z-50 h-[3px] bg-[var(--accent)] shadow-[0_0_18px_var(--accent)]" />

      {/* session progress bar (whole page width) */}
      <div aria-hidden className="fixed inset-x-0 top-[3px] z-50 h-[2px] bg-white/[0.05]">
        <div
          className="h-full bg-[var(--accent)] shadow-[0_0_10px_var(--accent)]"
          style={{
            width: `${Math.min(100, Math.max(0, (1 - pomo.remaining / Math.max(1, pomo.total)) * 100))}%`,
            transition: "width 0.45s linear",
            opacity: pomo.running || pomo.remaining < pomo.total ? 1 : 0,
          }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <header className="anim-fade-up flex items-center justify-between gap-4 py-5 sm:py-7">
          <div className="flex items-center gap-3">
            <span
              className="grid h-11 w-11 place-items-center rounded-2xl border border-white/[0.08] bg-ink-900/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-transform duration-300 hover:-rotate-6 hover:scale-105"
              style={pomo.running ? { animation: "breathe 3.2s ease-in-out infinite" } : undefined}
            >
              <IconTomato className="h-7 w-7" />
            </span>
            <div>
              <h1 className="font-display text-lg leading-none font-bold tracking-wide text-sand-100 sm:text-xl">Помодоро</h1>
              <p className="mt-1 text-[10px] font-semibold tracking-[0.32em] text-sand-500 uppercase">фокус · перерыв · снова</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowSummary(true)} aria-label="Итоги дня" title="Итоги дня" className={headerBtn}>
              <IconTrophy className="h-4 w-4" />
            </button>
            {installEvt && (
              <button onClick={onInstall} aria-label="Установить приложение" title="Установить приложение" className={headerBtn}>
                <IconDownload className="h-4 w-4" />
              </button>
            )}
            <button onClick={() => setDrawerOpen(true)} aria-label="Открыть настройки" title="Настройки" className={headerBtn}>
              <IconSliders className="h-4 w-4" />
            </button>
            <button onClick={() => setZen(true)} aria-label="Открыть дзен-режим" title="Дзен-режим (F)" className={headerBtn}>
              <IconExpand className="h-4 w-4" />
            </button>
            <button onClick={() => setPipOpen(true)} aria-label="Мини-таймер поверх окон" title="Мини-таймер поверх окон" className={headerBtn}>
              <IconPicture className="h-4 w-4" />
            </button>
            <button onClick={() => setShowKeys(true)} aria-label="Горячие клавиши" title="Горячие клавиши (?)" className={`${headerBtn} font-display text-sm font-bold`}>
              ?
            </button>
            {pomo.running && (
              <span className="anim-pop hidden items-center gap-2 rounded-full border border-[var(--accent)]/40 bg-[var(--accent)]/10 px-3.5 py-1.5 text-xs font-semibold text-[var(--accent)] md:flex" title="Сколько осталось до следующей смены режима">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" style={{ animation: "ping-soft 1.6s infinite" }} />
                {pomo.mode === "focus" ? "до перерыва" : "до фокуса"} {untilNext} мин
              </span>
            )}
            <span className="hidden items-center gap-1.5 rounded-full border border-white/[0.08] bg-ink-900/70 px-3 py-1.5 text-[11px] font-semibold text-sand-400 lg:flex" title={`Фокус-скор: ${score.score} очков, до следующего уровня ${Math.max(0, score.levelSize - score.intoLevel)}`}>
              <IconZap className="h-3.5 w-3.5 text-ember-400" />
              ур. {score.level}
            </span>
            <span className="hidden items-center gap-2 rounded-full border border-white/[0.08] bg-ink-900/70 px-3.5 py-1.5 text-xs font-medium text-sand-400 sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
              {fmtDay(Date.now())}
            </span>
          </div>
        </header>

        <main
          className={`grid items-start gap-6 pb-4 ${
            pinned ? "xl:grid-cols-[minmax(0,5.4fr)_minmax(0,3.4fr)_minmax(0,3.8fr)]" : "lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]"
          }`}
        >
          <TimerCard {...pomo} nextTaskTitle={nextTaskTitle} />
          {pinned && (
            <section data-card aria-label="Закреплённый канбан" className="anim-fade-up rounded-[26px] border border-white/[0.06] bg-ink-900/85 p-5 shadow-[0_30px_70px_-30px_rgba(0,0,0,0.7)]" style={{ animationDelay: "120ms" }}>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display text-[11px] font-bold tracking-[0.24em] text-sand-300 uppercase">Канбан</h2>
                <button onClick={togglePin} aria-label="Открепить канбан" title="Открепить канбан" className="grid h-7 w-7 place-items-center rounded-lg border border-[var(--accent)]/45 text-[var(--accent)] transition-all hover:bg-[var(--accent)]/10 active:scale-90">
                  <IconPin className="h-3.5 w-3.5" />
                </button>
              </div>
              <TasksPanel
                tasks={tasksApi.tasks}
                archive={tasksApi.archive}
                activeId={tasksApi.activeId}
                wipLimit={settings.wipLimit}
                onAdd={tasksApi.addTask}
                onMove={tasksApi.move}
                onPatch={tasksApi.patch}
                onRemove={tasksApi.removeTask}
                onActive={tasksApi.setActive}
                onAddCheck={tasksApi.addCheck}
                onToggleCheck={tasksApi.toggleCheck}
                onRemoveCheck={tasksApi.removeCheck}
                onArchive={tasksApi.archiveDone}
                onClearArchive={tasksApi.clearArchive}
              />
            </section>
          )}
          <InfoPanel
            stats={stats}
            goalMin={settings.goalMin}
            onGoalChange={(v) => updateSettings({ goalMin: v })}
            weeklyGoal={settings.weeklyGoalMin}
            onWeeklyGoalChange={(v) => updateSettings({ weeklyGoalMin: v })}
            promise={settings.promisePerDay}
            onPromiseChange={(v) => updateSettings({ promisePerDay: v })}
            history={pomo.history}
            tasks={tasksApi.tasks}
            archive={tasksApi.archive}
            activeId={tasksApi.activeId}
            wipLimit={settings.wipLimit}
            onAddTask={tasksApi.addTask}
            onMoveTask={tasksApi.move}
            onPatchTask={tasksApi.patch}
            onRemoveTask={tasksApi.removeTask}
            onActiveTask={tasksApi.setActive}
            onAddCheck={tasksApi.addCheck}
            onToggleCheck={tasksApi.toggleCheck}
            onRemoveCheck={tasksApi.removeCheck}
            onArchiveTasks={tasksApi.archiveDone}
            onClearArchive={tasksApi.clearArchive}
            pinned={pinned}
            onTogglePin={togglePin}
          />
        </main>

        <footer className="anim-fade-up mt-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-white/[0.06] py-5 text-xs text-sand-600" style={{ animationDelay: "280ms" }}>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Kbd>Пробел</Kbd> старт / пауза
            <span className="text-sand-600/60">·</span>
            <Kbd>R</Kbd> сброс
            <span className="text-sand-600/60">·</span>
            <Kbd>S</Kbd> пропуск
            <span className="text-sand-600/60">·</span>
            <Kbd>F</Kbd> дзен
            <span className="text-sand-600/60">·</span>
            <Kbd>Ctrl K</Kbd> команды
            <span className="text-sand-600/60">·</span>
            <Kbd>?</Kbd> справка
          </p>
          <p>
            Работает офлайн · данные не покидают ваш браузер (<span className="text-sand-400">localStorage</span>).
          </p>
        </footer>
      </div>

      <SettingsDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        settings={settings}
        onChange={updateSettings}
        onExport={onExport}
        onExportCSV={onExportCSV}
        onExportICS={onExportICS}
        onImportFile={onImportFile}
        onClearRequest={() => setShowClear(true)}
        onToggleNotifications={onToggleNotifications}
        notifDenied={notifDenied}
        onMelodyTest={onMelodyTest}
        onMixerPreview={onMixerPreview}
      />

      {zen && <ZenMode pomo={pomo} onExit={() => setZen(false)} />}
      {showKeys && <ShortcutsModal onClose={() => setShowKeys(false)} />}
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} actions={paletteActions} />
      {pipOpen && <PiPTimer pomo={pomo} onClose={() => setPipOpen(false)} />}
      {levelUp !== null && <LevelUpModal level={levelUp} score={score.score} onClose={() => setLevelUp(null)} />}

      {showSummary && (
        <DaySummaryModal stats={stats} history={pomo.history} promise={settings.promisePerDay} goalMin={settings.goalMin} onClose={() => setShowSummary(false)} notify={notify} />
      )}

      {noteRec && (
        <NoteModal
          minutes={noteRec.minutes}
          distractions={noteRec.distractions ?? 0}
          onSave={(note, mood) => {
            pomo.attachNote(note, mood);
            setNoteRec(null);
            notify("Заметка сохранена в журнал");
          }}
          onSkip={() => setNoteRec(null)}
        />
      )}

      {showClear && (
        <div className="fixed inset-0 z-[120] grid place-items-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setShowClear(false)}>
          <div className="anim-pop w-full max-w-sm rounded-2xl border border-white/[0.08] bg-ink-900 p-6 shadow-[0_40px_90px_-30px_rgba(0,0,0,0.8)]" onClick={(e) => e.stopPropagation()} role="alertdialog" aria-label="Подтверждение очистки истории">
            <h3 className="font-display text-base font-bold text-sand-100">Очистить историю?</h3>
            <p className="mt-2 text-sm leading-relaxed text-sand-400">Все сессии, статистика, рекорд и стрик будут удалены безвозвратно. Настройки и задачи останутся.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setShowClear(false)} className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-sand-300 transition-colors hover:bg-white/[0.05]">
                Отмена
              </button>
              <button onClick={confirmClear} className="rounded-full bg-ember-500 px-4 py-2 text-sm font-bold text-white transition-all hover:brightness-110 active:scale-95">
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* floating rewards */}
      <div aria-hidden className="pointer-events-none fixed left-1/2 top-[24%] z-[115] flex -translate-x-1/2 flex-col items-center gap-1">
        {floats.map((f) => (
          <span key={f.id} className="anim-float-up font-display text-lg font-bold text-[var(--accent)] drop-shadow-[0_2px_14px_rgba(0,0,0,0.6)]">
            {f.text}
          </span>
        ))}
      </div>

      {/* mode-change flash */}
      {flash > 0 && <div key={flash} aria-hidden className="anim-flash pointer-events-none fixed inset-0 z-[96]" style={{ background: "var(--accent)" }} />}

      {toast && (
        <div className="anim-pop fixed bottom-6 left-1/2 z-[130] -translate-x-1/2 rounded-full border border-white/[0.08] bg-ink-900/95 px-5 py-2.5 text-sm font-medium text-sand-200 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.8)]">
          {toast}
        </div>
      )}
    </div>
  );
}
