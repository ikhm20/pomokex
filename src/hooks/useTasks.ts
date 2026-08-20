import { useCallback, useEffect, useRef, useState } from "react";
import { startOfDay } from "../lib/time";

export type TaskStatus = "todo" | "doing" | "done";

export interface CheckItem {
  id: string;
  text: string;
  done: boolean;
}

export interface Task {
  id: string;
  title: string;
  estimate: number;
  actual: number;
  status: TaskStatus;
  deadline: number | null; // epoch ms, local day
  recurring: boolean; // daily tasks return to "todo" each morning
  checklist: CheckItem[];
  createdAt: number;
}

interface Blob {
  list: Task[];
  archive: Task[];
  activeId: string | null;
  lastReset: number;
}

const KEY = "pomodoro.tasks.v2";
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const isStatus = (v: unknown): v is TaskStatus => v === "todo" || v === "doing" || v === "done";

function normalizeTask(t: Partial<Task> & { title?: unknown }): Task {
  const legacy = (t as { done?: boolean }).done;
  return {
    id: String(t.id ?? uid()),
    title: String(t.title ?? "").slice(0, 120),
    estimate: Math.min(12, Math.max(1, Number(t.estimate) || 1)),
    actual: Math.max(0, Number(t.actual) || 0),
    status: isStatus(t.status) ? t.status : legacy ? "done" : "todo",
    deadline: Number.isFinite(Number(t.deadline)) && Number(t.deadline) > 0 ? Number(t.deadline) : null,
    recurring: t.recurring === true,
    checklist: Array.isArray(t.checklist)
      ? t.checklist
          .filter((c) => c && typeof c.text === "string")
          .map((c) => ({ id: String(c.id ?? uid()), text: String(c.text).slice(0, 100), done: c.done === true }))
      : [],
    createdAt: Number(t.createdAt) || Date.now(),
  };
}

function load(): Blob {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const d = JSON.parse(raw) as Partial<Blob>;
      const list = Array.isArray(d.list)
        ? d.list.filter((t) => !!t && typeof t.title === "string").map((t) => normalizeTask(t))
        : [];
      const archive = Array.isArray(d.archive)
        ? d.archive.filter((t) => !!t && typeof t.title === "string").map((t) => normalizeTask(t))
        : [];
      const activeId = typeof d.activeId === "string" && list.some((t) => t.id === d.activeId) ? d.activeId : null;

      // morning reset for daily tasks
      const today = startOfDay(Date.now());
      const lastReset = Number(d.lastReset) || 0;
      let nextList = list;
      if (lastReset < today) {
        nextList = list.map((t) =>
          t.recurring && t.status === "done" ? { ...t, status: "todo" as TaskStatus, actual: 0 } : t
        );
      }
      return { list: nextList, archive, activeId, lastReset: today };
    }
  } catch {
    /* corrupted — start clean */
  }
  return { list: [], archive: [], activeId: null, lastReset: startOfDay(Date.now()) };
}

export function useTasks() {
  const [blob, setBlob] = useState<Blob>(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(blob));
    } catch { /* storage unavailable */ }
  }, [blob]);

  const activeRef = useRef(blob.activeId);
  useEffect(() => {
    activeRef.current = blob.activeId;
  }, [blob.activeId]);

  const addTask = useCallback((title: string, estimate: number, opts?: { deadline?: number | null; recurring?: boolean }) => {
    const t: Task = {
      id: uid(),
      title: title.trim().slice(0, 120),
      estimate: Math.min(12, Math.max(1, estimate)),
      actual: 0,
      status: "todo",
      deadline: opts?.deadline ?? null,
      recurring: opts?.recurring === true,
      checklist: [],
      createdAt: Date.now(),
    };
    if (!t.title) return;
    setBlob((b) => ({ ...b, list: [...b.list, t], activeId: b.activeId ?? t.id }));
  }, []);

  /** Move between lanes; optional index for in-lane ordering. */
  const move = useCallback((id: string, status: TaskStatus, index?: number) => {
    setBlob((b) => {
      const t = b.list.find((x) => x.id === id);
      if (!t) return b;
      const rest = b.list.filter((x) => x.id !== id);
      const moved = { ...t, status };
      if (index === undefined) return { ...b, list: [...rest, moved] };
      const lane = rest.filter((x) => x.status === status);
      const others = rest.filter((x) => x.status !== status);
      const pos = Math.max(0, Math.min(lane.length, index));
      lane.splice(pos, 0, moved);
      return { ...b, list: [...others, ...lane] };
    });
  }, []);

  const patch = useCallback((id: string, p: Partial<Task>) => {
    setBlob((b) => ({ ...b, list: b.list.map((t) => (t.id === id ? { ...t, ...p } : t)) }));
  }, []);

  const removeTask = useCallback((id: string) => {
    setBlob((b) => ({
      ...b,
      list: b.list.filter((t) => t.id !== id),
      activeId: b.activeId === id ? null : b.activeId,
    }));
  }, []);

  const setActive = useCallback((id: string | null) => {
    setBlob((b) => ({ ...b, activeId: id }));
  }, []);

  const addCheck = useCallback((taskId: string, text: string) => {
    const item: CheckItem = { id: uid(), text: text.trim().slice(0, 100), done: false };
    if (!item.text) return;
    setBlob((b) => ({
      ...b,
      list: b.list.map((t) => (t.id === taskId ? { ...t, checklist: [...t.checklist, item] } : t)),
    }));
  }, []);

  const toggleCheck = useCallback((taskId: string, itemId: string) => {
    setBlob((b) => ({
      ...b,
      list: b.list.map((t) =>
        t.id === taskId
          ? { ...t, checklist: t.checklist.map((c) => (c.id === itemId ? { ...c, done: !c.done } : c)) }
          : t
      ),
    }));
  }, []);

  const removeCheck = useCallback((taskId: string, itemId: string) => {
    setBlob((b) => ({
      ...b,
      list: b.list.map((t) =>
        t.id === taskId ? { ...t, checklist: t.checklist.filter((c) => c.id !== itemId) } : t
      ),
    }));
  }, []);

  /** Done tasks older than today go to the archive. */
  const archiveDone = useCallback(() => {
    const today = startOfDay(Date.now());
    setBlob((b) => {
      const toArchive = b.list.filter((t) => t.status === "done" && t.createdAt < today);
      if (toArchive.length === 0) return b;
      return {
        ...b,
        list: b.list.filter((t) => !toArchive.includes(t)),
        archive: [...b.archive, ...toArchive],
        activeId: toArchive.some((t) => t.id === b.activeId) ? null : b.activeId,
      };
    });
  }, []);

  const clearArchive = useCallback(() => setBlob((b) => ({ ...b, archive: [] })), []);

  const onFocusDone = useCallback(() => {
    const id = activeRef.current;
    if (!id) return;
    setBlob((b) => ({
      ...b,
      list: b.list.map((t) => (t.id === id && t.status !== "done" ? { ...t, actual: t.actual + 1 } : t)),
    }));
  }, []);

  const replaceAll = useCallback((list: Task[], activeId: string | null) => {
    setBlob((b) => ({
      ...b,
      list: list.map(normalizeTask),
      activeId: activeId && list.some((t) => t.id === activeId) ? activeId : null,
    }));
  }, []);

  return {
    tasks: blob.list,
    archive: blob.archive,
    activeId: blob.activeId,
    addTask,
    move,
    patch,
    removeTask,
    setActive,
    addCheck,
    toggleCheck,
    removeCheck,
    archiveDone,
    clearArchive,
    onFocusDone,
    replaceAll,
  };
}
