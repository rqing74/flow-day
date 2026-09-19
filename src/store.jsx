import React from "react";
import { createContext, useContext, useEffect, useState, useReducer } from "react";
import { KEY, createInitialData, restoreData, expandRecurring, dayKey, uid } from "./model";
import { historyReducer, replaceWithRecovery } from "./backup";
const Context = createContext(null);
function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (
      s?.version === 1 &&
      Array.isArray(s.tasks) &&
      Array.isArray(s.projects) &&
      s.energy &&
      s.reviews &&
      Array.isArray(s.focusLogs)
    ) {
      if (s.courseSeedVersion === 1) {
        localStorage.setItem(
          "flowday.backup-before-course-reset.v1",
          JSON.stringify(s),
        );
        return createInitialData();
      }
      if (s.demo === true) {
        localStorage.setItem('flowday.backup-before-reset.v1', JSON.stringify(s));
      }
      return restoreData(s);
    }
  } catch {}
  return createInitialData();
}
export function Provider({ children }) {
  const [history, dispatch] = useReducer(historyReducer, null, () => ({
    data: load(), past: [], future: [], revision: 0,
  }));
  const { data, revision } = history;
  const setData = (update) => dispatch({ type: "change", update });
  const [toast, setToast] = useState(""),
    [storageError, setStorageError] = useState(false);
  const replaceData = (next) => {
    if (data.focusSession) throw new Error("请先结束当前专注，再恢复或清空数据。");
    try {
      replaceWithRecovery(localStorage, data, next, KEY);
    } catch {
      throw new Error("无法保存恢复快照，已停止操作。请先导出备份并检查浏览器存储空间。");
    }
    dispatch({ type: "change", update: next, replace: true });
  };
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [data]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(timer);
  }, [toast]);
  const updateTask = (id, patch) =>
    setData((s) => ({
      ...s,
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    }));
  const complete = (id) =>
    setData((s) => ({
      ...s,
      tasks: s.tasks.map((t) =>
        t.id === id
          ? { ...t, done: !t.done, actual: t.done ? 0 : t.duration }
          : t,
      ),
    }));
  const addTasks = (tasks) =>
    setData((s) => expandRecurring({ ...s, tasks: [...s.tasks, ...tasks] }));
  const applyChanges = (changes) =>
    setData((s) => ({
      ...s,
      tasks: s.tasks.map(
        (t) => changes.find((c) => c.after.id === t.id)?.after || t,
      ),
    }));
  const startFocus = (id) => {
    if (data.focusSession) {
      setToast("已有专注正在进行，请先结束当前专注");
      return;
    }
    setData((s) => ({
      ...s,
      focusSession: { taskId: id, startedAt: Date.now() },
    }));
    setToast("专注已开始，离开页面也会继续计时");
  };
  const stopFocus = () =>
    setData((s) => {
      if (!s.focusSession) return s;
      const elapsed = Math.floor(
        (Date.now() - s.focusSession.startedAt) / 60000,
      );
      return {
        ...s,
        focusSession: null,
        focusLogs:
          elapsed > 0
            ? [
                ...s.focusLogs,
                {
                  id: uid(),
                  taskId: s.focusSession.taskId,
                  date: dayKey(),
                  minutes: elapsed,
                  source: "timer",
                },
              ]
            : s.focusLogs,
      };
    });
  return (
    <Context.Provider
      value={{
        data,
        revision,
        canUndo: history.past.length > 0 && !data.focusSession,
        canRedo: history.future.length > 0 && !data.focusSession,
        undo: () => dispatch({ type: "undo" }),
        redo: () => dispatch({ type: "redo" }),
        replaceData,
        setData,
        updateTask,
        complete,
        addTasks,
        applyChanges,
        toast: setToast,
        startFocus,
        stopFocus,
      }}
    >
      {children}
      {storageError && (
        <div className="storage-warning" role="alert">
          浏览器存储不可用。当前修改未保存，请不要刷新。
        </div>
      )}
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </Context.Provider>
  );
}
export const useFlow = () => useContext(Context);
