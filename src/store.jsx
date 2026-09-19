import React from "react";
import { createContext, useContext, useEffect, useState } from "react";
import { KEY, seed, expandRecurring, dayKey, uid } from "./model";
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
    )
      return expandRecurring(s);
  } catch {}
  return seed();
}
export function Provider({ children }) {
  const [data, setData] = useState(load),
    [toast, setToast] = useState(""),
    [storageError, setStorageError] = useState(false);
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
