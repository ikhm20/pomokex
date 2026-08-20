import { useCallback, useEffect, useRef, useState } from "react";
import { playChime, playTick, unlockAudio, type Melody } from "../lib/audio";
import type { Mixer } from "../lib/ambient";
import { isCategoryId, type CategoryId } from "../lib/categories";

export type Mode = "focus" | "short" | "long";

export const MODES: Mode[] = ["focus", "short", "long"];

export const MODE_LABEL: Record<Mode, string> = {
  focus: "Фокус",
  short: "Короткий перерыв",
  long: "Длинный перерыв",
};

export interface CustomMode {
  id: string;
  name: string;
  minutes: number;
  color: string;
}

export interface Settings {
  durations: Record<Mode, number>;
  cycles: number;
  autoBreak: boolean;
  autoFocus: boolean;
  sound: boolean;
  volume: number;
  melody: Melody;
  strict: boolean;
  mixer: Mixer;
  category: CategoryId;
  notifications: boolean;
  theme: "dark" | "light";
  goalMin: number;
  flowMode: boolean;
  wipLimit: number;
  promisePerDay: number;
  customModes: CustomMode[];
  activeCustom: string | null;
  voice: boolean;
  weeklyGoalMin: number;
  compact: boolean;
  reducedMotion: boolean;
}

export interface SessionRec {
  mode: Mode;
  minutes: number;
  endedAt: number;
  taskTitle?: string | null;
  category?: CategoryId | null;
  distractions?: number;
  note?: string | null;
  clean?: boolean;
  flow?: boolean;
  mood?: "easy" | "normal" | "hard" | null;
}

const DEFAULT_SETTINGS: Settings = {
  durations: { focus: 25, short: 5, long: 15 },
  cycles: 4,
  autoBreak: true,
  autoFocus: false,
  sound: true,
  volume: 70,
  melody: "bell",
  strict: false,
  mixer: { rain: 0, cafe: 0, noise: 0, pink: 0 },
  category: "work",
  notifications: false,
  theme: "dark",
  goalMin: 120,
  flowMode: false,
  wipLimit: 3,
  promisePerDay: 0,
  customModes: [],
  activeCustom: null,
  voice: false,
  weeklyGoalMin: 0,
  compact: false,
  reducedMotion: false,
};

export const DEFAULT_CUSTOM_MODES: CustomMode[] = [
  { id: "reading", name: "Чтение", minutes: 20, color: "#5ba8ff" },
  { id: "code", name: "Код", minutes: 50, color: "#3ecf9a" },
  { id: "diploma", name: "Диплом", minutes: 45, color: "#c084fc" },
];

const SETTINGS_KEY = "pomodoro.settings.v1";
const HISTORY_KEY = "pomodoro.history.v1";
const CYCLE_KEY = "pomodoro.cycle.v1";
const TIMER_KEY = "pomodoro.timer.v1";

const clampInt = (v: unknown, min: number, max: number, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : fallback;
};

function sanitizeSettings(p: Partial<Settings> | null | undefined): Settings {
  const s = p ?? {};
  const d = (s.durations ?? {}) as Partial<Record<Mode, number>>;
  const melody: Melody = s.melody === "soft" || s.melody === "digital" ? s.melody : "bell";
  const legacyAmbient = (s as Record<string, unknown>).ambient;
  const mx = (s.mixer ?? {}) as Partial<Record<keyof Mixer, number>>;
  const mixer: Mixer = {
    rain: clampInt(mx.rain, 0, 100, legacyAmbient === "rain" ? 100 : 0),
    cafe: clampInt(mx.cafe, 0, 100, legacyAmbient === "cafe" ? 100 : 0),
    noise: clampInt(mx.noise, 0, 100, legacyAmbient === "noise" ? 100 : 0),
    pink: clampInt(mx.pink, 0, 100, legacyAmbient === "pink" ? 100 : 0),
  };
  const category: CategoryId = isCategoryId(s.category) ? s.category : "work";
  const customModes: CustomMode[] = Array.isArray(s.customModes)
    ? s.customModes
        .filter((m): m is CustomMode => !!m && typeof m === "object" && typeof (m as CustomMode).name === "string")
        .slice(0, 6)
        .map((m) => ({
          id: String(m.id ?? Math.random().toString(36).slice(2, 8)),
          name: String(m.name).slice(0, 24),
          minutes: clampInt(m.minutes, 1, 120, 25),
          color: typeof m.color === "string" && /^#[0-9a-fA-F]{6}$/.test(m.color) ? m.color : "#ff6b4a",
        }))
    : [];
  const activeCustom =
    typeof s.activeCustom === "string" && customModes.some((m) => m.id === s.activeCustom) ? s.activeCustom : null;
  return {
    durations: {
      focus: clampInt(d.focus, 1, 120, DEFAULT_SETTINGS.durations.focus),
      short: clampInt(d.short, 1, 45, DEFAULT_SETTINGS.durations.short),
      long: clampInt(d.long, 1, 60, DEFAULT_SETTINGS.durations.long),
    },
    cycles: clampInt(s.cycles, 2, 8, DEFAULT_SETTINGS.cycles),
    autoBreak: s.autoBreak !== false,
    autoFocus: s.autoFocus === true,
    sound: s.sound !== false,
    volume: clampInt(s.volume, 0, 100, DEFAULT_SETTINGS.volume),
    melody,
    strict: s.strict === true,
    mixer,
    category,
    notifications: s.notifications === true,
    theme: s.theme === "light" ? "light" : "dark",
    goalMin: clampInt(s.goalMin, 15, 600, DEFAULT_SETTINGS.goalMin),
    flowMode: s.flowMode === true,
    wipLimit: clampInt(s.wipLimit, 1, 8, 3),
    promisePerDay: clampInt(s.promisePerDay, 0, 20, 0),
    customModes,
    activeCustom,
    voice: s.voice === true,
    weeklyGoalMin: clampInt(s.weeklyGoalMin, 0, 3000, 0),
    compact: s.compact === true,
    reducedMotion: s.reducedMotion === true,
  };
}

function sanitizeRec(r: unknown): SessionRec | null {
  if (!r || typeof r !== "object") return null;
  const o = r as Record<string, unknown>;
  const mode = o.mode as Mode;
  if (mode !== "focus" && mode !== "short" && mode !== "long") return null;
  const minutes = Number(o.minutes);
  const endedAt = Number(o.endedAt);
  if (!Number.isFinite(minutes) || !Number.isFinite(endedAt) || minutes <= 0) return null;
  return {
    mode,
    minutes: Math.round(minutes),
    endedAt,
    taskTitle: typeof o.taskTitle === "string" ? o.taskTitle : null,
    category: isCategoryId(o.category) ? o.category : null,
    distractions: Number.isFinite(Number(o.distractions)) ? Math.max(0, Math.round(Number(o.distractions))) : 0,
    note: typeof o.note === "string" ? o.note : null,
    clean: o.clean === false ? false : true,
    flow: o.flow === true,
    mood: o.mood === "easy" || o.mood === "normal" || o.mood === "hard" ? o.mood : null,
  };
}

/** Effective focus duration/label/color, honoring the active custom mode. */
export function focusConf(s: Settings): { minutes: number; label: string; color: string | null } {
  if (s.activeCustom) {
    const cm = s.customModes.find((m) => m.id === s.activeCustom);
    if (cm) return { minutes: cm.minutes, label: cm.name, color: cm.color };
  }
  return { minutes: s.durations.focus, label: "Фокус", color: null };
}

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return sanitizeSettings(JSON.parse(raw) as Partial<Settings>);
  } catch {
    /* corrupted settings — fall back to defaults */
  }
  return DEFAULT_SETTINGS;
}

function loadHistory(): SessionRec[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(sanitizeRec).filter((r): r is SessionRec => r !== null);
    }
  } catch {
    /* corrupted history — start fresh */
  }
  return [];
}

function loadCycle(cycles: number): number {
  try {
    const n = Number(localStorage.getItem(CYCLE_KEY));
    if (Number.isFinite(n) && n >= 0 && n < cycles) return Math.floor(n);
  } catch {
    /* noop */
  }
  return 0;
}

interface BootState {
  settings: Settings;
  history: SessionRec[];
  cycle: number;
  mode: Mode;
  running: boolean;
  endAt: number | null;
  remaining: number;
  restoredMsg: string | null;
  missed: SessionRec | null;
  flowActive: boolean;
}

function loadBoot(): BootState {
  const settings = loadSettings();
  let history = loadHistory();
  let cycle = loadCycle(settings.cycles);
  let mode: Mode = "focus";
  let running = false;
  let endAt: number | null = null;
  let remaining = focusConf(settings).minutes * 60;
  let restoredMsg: string | null = null;
  let missed: SessionRec | null = null;
  let flowActive = false;

  try {
    const raw = localStorage.getItem(TIMER_KEY);
    if (raw) {
      const t = JSON.parse(raw) as Record<string, unknown>;
      const m = t.mode as Mode;
      if (m === "focus" || m === "short" || m === "long") mode = m;
      flowActive = t.flowActive === true;
      const total = flowActive ? 600 : (mode === "focus" ? focusConf(settings).minutes : settings.durations[mode]) * 60;

      if (t.running === true && typeof t.endAt === "number" && Number.isFinite(t.endAt)) {
        const left = Math.round((t.endAt - Date.now()) / 1000);
        if (left > 0) {
          running = true;
          endAt = t.endAt;
          remaining = Math.min(total, left);
          restoredMsg = "Таймер восстановлен — продолжаем с того же места";
        } else {
          const minutes = Math.max(1, Math.round(total / 60));
          missed = { mode, minutes, endedAt: t.endAt, category: settings.category };
          history = [...history, missed];
          let next: Mode;
          if (mode === "focus") {
            cycle += 1;
            next = cycle >= settings.cycles ? "long" : "short";
            restoredMsg = "Пока вас не было, завершился помидор";
          } else {
            if (mode === "long") cycle = 0;
            next = "focus";
            restoredMsg = "Пока вас не было, завершился перерыв";
          }
          mode = next;
          remaining = settings.durations[next] * 60;
          endAt = null;
        }
      } else if (typeof t.remaining === "number" && Number.isFinite(t.remaining)) {
        remaining = Math.min(total, Math.max(1, Math.round(t.remaining)));
      }
    }
  } catch {
    /* corrupted timer blob — start clean */
  }

  return { settings, history, cycle, mode, running, endAt, remaining, restoredMsg, missed, flowActive };
}

export interface Pomodoro {
  mode: Mode;
  running: boolean;
  remaining: number;
  total: number;
  endAt: number | null;
  cyclePos: number;
  settings: Settings;
  history: SessionRec[];
  restoredMsg: string | null;
  distractions: number;
  flowPending: boolean;
  flowActive: boolean;
  focus: { label: string; color: string | null };
  anchor: string | null;
  setAnchor: (v: string | null) => void;
  extend: (minutes: number) => void;
  finishEarly: () => void;
  skipBreak: () => void;
  toggle: () => void;
  reset: () => void;
  skip: () => void;
  switchMode: (m: Mode) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  clearHistory: () => void;
  clearRestoredMsg: () => void;
  incrementDistraction: () => void;
  attachNote: (note: string, mood?: "easy" | "normal" | "hard" | null) => void;
  startFlow: () => void;
  declineFlow: () => void;
  applyImport: (data: { settings?: Partial<Settings>; history?: SessionRec[] }) => void;
}

export function usePomodoro(opts?: { onFocusComplete?: (rec: SessionRec) => void }): Pomodoro {
  const [boot] = useState(loadBoot);

  const [settings, setSettings] = useState<Settings>(boot.settings);
  const [history, setHistory] = useState<SessionRec[]>(boot.history);
  const [mode, setMode] = useState<Mode>(boot.mode);
  const [cyclePos, setCyclePos] = useState(boot.cycle);
  const [running, setRunning] = useState(boot.running);
  const [remaining, setRemaining] = useState(boot.remaining);
  const [endAt, setEndAt] = useState<number | null>(boot.endAt);
  const [restoredMsg, setRestoredMsg] = useState<string | null>(boot.restoredMsg);
  const [distractions, setDistractions] = useState(0);
  const [flowPending, setFlowPending] = useState(false);
  const [flowActive, setFlowActive] = useState(boot.flowActive);
  const [anchor, setAnchor] = useState<string | null>(null);
  const wasPausedRef = useRef(false);
  const skipFlagRef = useRef(false);

  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const cbRef = useRef(opts?.onFocusComplete);
  useEffect(() => {
    cbRef.current = opts?.onFocusComplete;
  }, [opts]);

  const focusCfg = focusConf(settings);
  const durFor = useCallback(
    (m: Mode) => (m === "focus" ? focusCfg.minutes : settings.durations[m]),
    [focusCfg.minutes, settings.durations]
  );

  const booted = useRef(false);
  const totalRef = useRef(boot.remaining);
  useEffect(() => {
    totalRef.current = durFor(mode) * 60;
    if (!booted.current) {
      booted.current = true;
      return;
    }
    if (!running) {
      setRemaining(totalRef.current);
      setEndAt(null);
    }
  }, [durFor, mode, running]);

  const remainingRef = useRef(remaining);
  useEffect(() => {
    remainingRef.current = remaining;
  }, [remaining]);

  const endAtRef = useRef(endAt);
  useEffect(() => {
    endAtRef.current = endAt;
  }, [endAt]);

  const modeRef = useRef(mode);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  const cycleRef = useRef(cyclePos);
  useEffect(() => {
    cycleRef.current = cyclePos;
  }, [cyclePos]);

  const runningRef = useRef(running);
  useEffect(() => {
    runningRef.current = running;
  }, [running]);

  const distractionsRef = useRef(0);
  useEffect(() => {
    distractionsRef.current = distractions;
  }, [distractions]);

  const flowActiveRef = useRef(boot.flowActive);

  const missedRef = useRef(boot.missed);
  useEffect(() => {
    if (missedRef.current && missedRef.current.mode === "focus") {
      cbRef.current?.(missedRef.current);
    }
    missedRef.current = null;
  }, []);

  const switchMode = useCallback((m: Mode, autoStart = false) => {
    setMode(m);
    setRunning(autoStart);
    setFlowPending(false);
    setFlowActive(false);
    flowActiveRef.current = false;
    const secs = (m === "focus" ? focusConf(settingsRef.current).minutes : settingsRef.current.durations[m]) * 60;
    totalRef.current = secs;
    setRemaining(secs);
    setEndAt(autoStart ? Date.now() + secs * 1000 : null);
    if (m !== "focus") {
      wasPausedRef.current = false;
      skipFlagRef.current = false;
      setDistractions(0);
    }
  }, []);

  const finishSession = useCallback(() => {
    const s = settingsRef.current;
    const m = modeRef.current;
    const isFlow = m === "focus" && flowActiveRef.current;
    const minutes = isFlow ? 10 : Math.max(1, Math.round(totalRef.current / 60));
    const rec: SessionRec = {
      mode: m,
      minutes,
      endedAt: Date.now(),
      category: s.category,
      distractions: m === "focus" ? distractionsRef.current : 0,
      clean: m === "focus" ? !wasPausedRef.current && !skipFlagRef.current : true,
      note: null,
      flow: isFlow,
    };
    flowActiveRef.current = false;
    setFlowActive(false);
    setHistory((h) => [...h, rec]);

    if (s.sound) playChime(m === "focus" ? "focus" : "break", s.melody);

    if (s.voice && typeof speechSynthesis !== "undefined") {
      try {
        const u = new SpeechSynthesisUtterance(
          m === "focus" ? "Помидор завершён. Время перерыва." : "Перерыв окончен. Возвращаемся в фокус."
        );
        u.lang = "ru-RU";
        speechSynthesis.speak(u);
      } catch {
        /* voice is a garnish */
      }
    }

    if (s.notifications && typeof Notification !== "undefined" && Notification.permission === "granted") {
      try {
        if (m === "focus") {
          const pos = cycleRef.current + 1;
          const next = pos >= s.cycles ? "long" : "short";
          new Notification("Помидор завершён", {
            body: `Отличная работа! Впереди ${next === "long" ? "длинный" : "короткий"} перерыв — ${s.durations[next]} мин.`,
            silent: true,
          });
        } else {
          new Notification("Перерыв окончен", { body: `Пора в фокус — ${s.durations.focus} мин.`, silent: true });
        }
      } catch {
        /* best-effort */
      }
    }

    if (m === "focus") {
      setAnchor(null);
      if (!isFlow) {
        cbRef.current?.(rec);
        const pos = cycleRef.current + 1;
        setCyclePos(pos);
        if (s.flowMode) {
          setFlowPending(true);
          setRemaining(0);
          setEndAt(null);
          setRunning(false);
          return;
        }
        switchMode(pos >= s.cycles ? "long" : "short", s.autoBreak);
      } else {
        switchMode(cycleRef.current >= s.cycles ? "long" : "short", s.autoBreak);
      }
      return;
    }

    const pos = m === "long" ? 0 : cycleRef.current;
    setCyclePos(pos);
    switchMode("focus", s.autoFocus);
  }, [switchMode]);

  const finishRef = useRef(finishSession);
  useEffect(() => {
    finishRef.current = finishSession;
  }, [finishSession]);

  /* the one true interval — timestamp-based, immune to throttled tabs */
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      const end = endAtRef.current;
      if (end == null) return;
      const left = Math.round((end - Date.now()) / 1000);
      if (left <= 0) {
        setRemaining(0);
        setEndAt(null);
        setRunning(false);
        finishRef.current();
      } else {
        setRemaining(left);
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [running]);

  const toggle = useCallback(() => {
    unlockAudio();
    const s = settingsRef.current;
    if (runningRef.current) {
      remainingRef.current = Math.max(1, Math.round(((endAtRef.current ?? Date.now()) - Date.now()) / 1000));
      setRemaining(remainingRef.current);
      setEndAt(null);
      setRunning(false);
      if (modeRef.current === "focus") wasPausedRef.current = true;
      if (s.sound) playTick("pause");
    } else {
      setEndAt(Date.now() + remainingRef.current * 1000);
      setRunning(true);
      if (s.sound) playTick("start");
    }
  }, []);

  const reset = useCallback(() => {
    setRunning(false);
    setFlowPending(false);
    setFlowActive(false);
    flowActiveRef.current = false;
    setRemaining(totalRef.current);
    setEndAt(null);
  }, []);

  const skip = useCallback(() => {
    skipFlagRef.current = true;
    finishRef.current();
  }, []);

  const extend = useCallback((minutes: number) => {
    if (modeRef.current !== "focus") return;
    const add = minutes * 60;
    if (runningRef.current && endAtRef.current != null) {
      const newEnd = endAtRef.current + add * 1000;
      endAtRef.current = newEnd;
      setEndAt(newEnd);
      setRemaining((r) => r + add);
    } else {
      remainingRef.current += add;
      setRemaining(remainingRef.current);
    }
  }, []);

  const finishEarly = useCallback(() => {
    if (modeRef.current !== "focus") return;
    const s = settingsRef.current;
    const leftSec =
      runningRef.current && endAtRef.current != null
        ? Math.max(0, Math.round((endAtRef.current - Date.now()) / 1000))
        : remainingRef.current;
    const elapsedSec = Math.max(0, totalRef.current - leftSec);
    if (elapsedSec < 30) return;
    const wasFlow = flowActiveRef.current;
    const rec: SessionRec = {
      mode: "focus",
      minutes: Math.max(1, Math.round(elapsedSec / 60)),
      endedAt: Date.now(),
      category: s.category,
      distractions: distractionsRef.current,
      clean: false,
      note: null,
      flow: wasFlow,
    };
    flowActiveRef.current = false;
    setFlowActive(false);
    setHistory((h) => [...h, rec]);
    if (s.sound) playChime("focus", s.melody);
    setAnchor(null);
    if (!wasFlow) {
      cbRef.current?.(rec);
      const pos = cycleRef.current + 1;
      setCyclePos(pos);
      switchMode(pos >= s.cycles ? "long" : "short", s.autoBreak);
    } else {
      switchMode(cycleRef.current >= s.cycles ? "long" : "short", s.autoBreak);
    }
  }, [switchMode]);

  const skipBreak = useCallback(() => {
    if (modeRef.current === "focus") return;
    setFlowPending(false);
    setFlowActive(false);
    flowActiveRef.current = false;
    switchMode("focus", true);
  }, [switchMode]);

  const incrementDistraction = useCallback(() => {
    setDistractions((d) => d + 1);
    if (settingsRef.current.sound) playTick("drip");
    try {
      navigator.vibrate?.(35);
    } catch {
      /* no haptics */
    }
  }, []);

  const attachNote = useCallback((note: string, mood?: "easy" | "normal" | "hard" | null) => {
    setHistory((h) => {
      const idx = [...h].reverse().findIndex((s) => s.mode === "focus");
      if (idx === -1) return h;
      const real = h.length - 1 - idx;
      const copy = [...h];
      copy[real] = { ...copy[real], note, mood: mood ?? null };
      return copy;
    });
  }, []);

  const startFlow = useCallback(() => {
    setFlowPending(false);
    setFlowActive(true);
    flowActiveRef.current = true;
    setMode("focus");
    setRunning(true);
    setRemaining(600);
    setEndAt(Date.now() + 600000);
    setDistractions(0);
    wasPausedRef.current = false;
    skipFlagRef.current = false;
    if (settingsRef.current.sound) playTick("start");
  }, []);

  const declineFlow = useCallback(() => {
    setFlowActive(false);
    flowActiveRef.current = false;
    const s = settingsRef.current;
    switchMode(cycleRef.current >= s.cycles ? "long" : "short", s.autoBreak);
  }, [switchMode]);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((s) => ({ ...s, ...patch }));
  }, []);

  const clearHistory = useCallback(() => setHistory([]), []);
  const clearRestoredMsg = useCallback(() => setRestoredMsg(null), []);

  const applyImport = useCallback((data: { settings?: Partial<Settings>; history?: SessionRec[] }) => {
    if (data.settings && typeof data.settings === "object") {
      setSettings((prev) => sanitizeSettings({ ...prev, ...data.settings }));
    }
    if (Array.isArray(data.history)) {
      setHistory(data.history.map(sanitizeRec).filter((r): r is SessionRec => r !== null));
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch { /* storage unavailable */ }
  }, [settings]);

  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-4000)));
    } catch { /* storage unavailable */ }
  }, [history]);

  useEffect(() => {
    try {
      localStorage.setItem(CYCLE_KEY, String(cyclePos));
    } catch { /* storage unavailable */ }
  }, [cyclePos]);

  useEffect(() => {
    try {
      localStorage.setItem(TIMER_KEY, JSON.stringify({ mode, running, endAt, remaining, flowActive, savedAt: Date.now() }));
    } catch { /* storage unavailable */ }
  }, [mode, running, endAt, remaining, flowActive]);

  const total = flowActive ? 600 : durFor(mode) * 60;

  return {
    mode,
    running,
    remaining,
    total,
    endAt,
    cyclePos,
    settings,
    history,
    restoredMsg,
    distractions,
    flowPending,
    flowActive,
    focus: { label: focusCfg.label, color: focusCfg.color },
    anchor,
    setAnchor,
    extend,
    finishEarly,
    skipBreak,
    toggle,
    reset,
    skip,
    switchMode,
    updateSettings,
    clearHistory,
    clearRestoredMsg,
    incrementDistraction,
    attachNote,
    startFlow,
    declineFlow,
    applyImport,
  };
}
