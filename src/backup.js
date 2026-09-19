import { categories, dayKey, validTask } from "./model.js";

export const RECOVERY_KEY = "flowday.recovery.v1";
export const MAX_BACKUP_BYTES = 5 * 1024 * 1024;
const object = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const text = (v) => typeof v === "string";
const nonnegative = (v) => Number.isFinite(v) && v >= 0;
const date = (v) => text(v) && /^\d{4}-\d{2}-\d{2}$/.test(v) &&
  !Number.isNaN(new Date(v + "T12:00:00").getTime()) &&
  dayKey(new Date(v + "T12:00:00")) === v;
const unique = (items) => new Set(items.map((v) => v.id)).size === items.length;
const task = (t) => object(t) && text(t.id) && t.id.length > 0 &&
  text(t.title) && Boolean(validTask(t)) && Object.hasOwn(categories, t.category) &&
  [1, 2, 3].includes(t.priority) && [1, 2, 3, 4, 5].includes(t.energy) &&
  ["fixed", "flex"].includes(t.kind) && typeof t.done === "boolean" &&
  nonnegative(t.actual) && (t.date === null || date(t.date)) &&
  (t.start === null || (Number.isFinite(t.start) && t.start >= 0 && t.start < 1440)) &&
  (t.deadline === "" || date(t.deadline)) && text(t.projectId) && text(t.notes) &&
  ["none", "daily"].includes(t.repeat) &&
  (t.seriesId === undefined || text(t.seriesId)) &&
  (t.occurrenceDate === undefined || date(t.occurrenceDate)) &&
  Array.isArray(t.tags) && t.tags.every(text) && Array.isArray(t.checklist) &&
  t.checklist.every((c) => object(c) && text(c.id) && text(c.text) && typeof c.done === "boolean") && unique(t.checklist);

export function parseBackup(raw) {
  let envelope;
  try { envelope = JSON.parse(raw); } catch { throw new Error("文件不是有效的 JSON 备份。"); }
  if (!object(envelope) || envelope.app !== "FlowDay" || envelope.backupVersion !== 1) {
    throw new Error("请选择 FlowDay 导出的第 1 版备份文件。");
  }
  const d = envelope.data;
  if (!object(d) || d.version !== 1 || !Array.isArray(d.tasks) ||
      !d.tasks.every(task) || !unique(d.tasks) || !Array.isArray(d.projects) ||
      !d.projects.every((p) => object(p) && text(p.id) && p.id.length > 0 && text(p.title) &&
        text(p.goal) && Object.hasOwn(categories, p.category) && nonnegative(p.weekly) &&
        Array.isArray(p.milestones) && p.milestones.every(text)) || !unique(d.projects) ||
      !object(d.energy) || !Object.entries(d.energy).every(([k, v]) => date(k) && [1,2,3,4,5].includes(v)) ||
      !object(d.reviews) || !Object.entries(d.reviews).every(([k, r]) => date(k) && object(r) &&
        [0,1,2,3,4,5].includes(r.mood) && text(r.obstacle) && text(r.reflection)) ||
      !Array.isArray(d.focusLogs) || !d.focusLogs.every((l) => object(l) && text(l.id) &&
        text(l.taskId) && date(l.date) && nonnegative(l.minutes)) || !unique(d.focusLogs) ||
      !Array.isArray(d.recurrences) || !d.recurrences.every((t) => task(t) &&
        t.repeat === "daily" && text(t.seriesId) && t.seriesId.length > 0 && date(t.date) && t.start !== null) ||
      new Set(d.recurrences.map((t) => t.seriesId)).size !== d.recurrences.length) {
    throw new Error("备份中的任务、日期或记录格式不完整，未修改当前数据。");
  }
  // Restore only user records, never old demo/seed migration flags or running timers.
  return { version: 1, tasks: d.tasks, projects: d.projects, energy: d.energy,
    reviews: d.reviews, focusLogs: d.focusLogs, recurrences: d.recurrences, focusSession: null };
}

export function serializeBackup(data) {
  return JSON.stringify({ app: "FlowDay", backupVersion: 1,
    exportedAt: new Date().toISOString(), data: { ...data, focusSession: null } }, null, 2);
}

export function historyReducer(state, action) {
  if (action.type === "undo" && state.past.length && !state.data.focusSession) {
    return { data: state.past.at(-1), past: state.past.slice(0, -1),
      future: [state.data, ...state.future], revision: state.revision + 1 };
  }
  if (action.type === "redo" && state.future.length && !state.data.focusSession) {
    return { data: state.future[0], past: [...state.past, state.data].slice(-30),
      future: state.future.slice(1), revision: state.revision + 1 };
  }
  if (action.type !== "change") return state;
  const data = typeof action.update === "function" ? action.update(state.data) : action.update;
  if (data === state.data) return state;
  // Timer boundaries clear history, so undo can never resurrect an old timer.
  const timerBoundary = data.focusSession !== state.data.focusSession;
  return { data, past: timerBoundary ? [] : [...state.past, state.data].slice(-30),
    future: [], revision: state.revision + (action.replace ? 1 : 0) };
}

export function replaceWithRecovery(storage, current, next, key) {
  // If either write fails, the caller must leave the visible workspace untouched.
  storage.setItem(RECOVERY_KEY, serializeBackup(current));
  storage.setItem(key, JSON.stringify(next));
}
