import test from "node:test";
import assert from "node:assert/strict";
import { createInitialData, newTask, expandRecurring, KEY } from "../src/model.js";
import { parseBackup, serializeBackup, historyReducer, replaceWithRecovery, RECOVERY_KEY } from "../src/backup.js";

const initial = () => ({ data: createInitialData(), past: [], future: [], revision: 0 });
test("undo/redo restores a whole edit; branching drops the redo stack", () => {
  const a = initial();
  const t = newTask({ title: "一次新增" });
  const b = historyReducer(a, { type: "change", update: (s) => ({ ...s, tasks: [t] }) });
  const c = historyReducer(b, { type: "undo" });
  assert.deepEqual(c.data, a.data);
  assert.deepEqual(historyReducer(c, { type: "redo" }).data, b.data);
  const d = historyReducer(c, { type: "change", update: (s) => ({ ...s, energy: { "2026-09-19": 3 } }) });
  assert.equal(d.future.length, 0);
  assert.equal(historyReducer(d, { type: "redo" }), d);
});
test("history is bounded and timer boundaries cannot resurrect sessions", () => {
  let s = initial();
  for (let i = 0; i < 40; i++) s = historyReducer(s, { type: "change", update: (d) => ({ ...d, tasks: [newTask()] }) });
  assert.equal(s.past.length, 30);
  s = historyReducer(s, { type: "change", update: (d) => ({ ...d, focusSession: { taskId: d.tasks[0].id, startedAt: Date.now() } }) });
  assert.equal(s.past.length, 0);
  assert.equal(historyReducer(s, { type: "undo" }), s);
  s = historyReducer(s, { type: "change", update: (d) => ({ ...d, focusSession: null }) });
  assert.equal(s.past.length, 0);
});
test("backup roundtrip preserves records and recurrence edits, omits timers and old seed flags", () => {
  const t = newTask({ date: "2026-09-19", start: 540, repeat: "daily", seriesId: "series", tags: ["中文"], checklist: [{ id: "step", text: "步骤", done: true }] });
  const data = expandRecurring({ ...createInitialData(), tasks: [t] }, "2026-09-19");
  data.tasks[0] = { ...data.tasks[0], date: "2026-09-20", start: 600, done: true, actual: 25 };
  data.focusSession = { taskId: t.id, startedAt: 123 };
  data.courseSeedVersion = 1;
  const restored = parseBackup(serializeBackup(data));
  assert.deepEqual(restored.tasks, data.tasks);
  assert.deepEqual(restored.recurrences, data.recurrences);
  assert.equal(restored.focusSession, null);
  assert.equal(restored.courseSeedVersion, undefined);
  assert.equal(expandRecurring(restored, "2026-09-19").tasks.length, data.tasks.length);
});
test("malformed and unsupported backups cannot be restored", () => {
  assert.throws(() => parseBackup("bad json"), /JSON/);
  assert.throws(() => parseBackup('{"app":"FlowDay","backupVersion":2}'), /第 1 版/);
  const malformed = [
    { ...newTask(), tags: null },
    { ...newTask(), date: "2026-02-31", start: 540 },
    { ...newTask(), checklist: [null] },
    { ...newTask(), title: {} },
    { ...newTask(), actual: "bad" },
  ];
  for (const t of malformed) assert.throws(() => parseBackup(serializeBackup({ ...createInitialData(), tasks: [t] })), /格式不完整/);
  const t = newTask();
  assert.throws(() => parseBackup(serializeBackup({ ...createInitialData(), tasks: [t, t] })), /格式不完整/);
  assert.throws(() => parseBackup(serializeBackup({ ...createInitialData(), reviews: { "2026-09-19": null } })), /格式不完整/);
});
test("replacement saves recovery first; storage failures preserve the current workspace", () => {
  const before = { ...createInitialData(), tasks: [newTask({ title: "保留我" })] };
  const after = createInitialData();
  const values = new Map([[KEY, JSON.stringify(before)]]);
  const storage = { setItem: (k, v) => values.set(k, v) };
  replaceWithRecovery(storage, before, after, KEY);
  assert.deepEqual(parseBackup(values.get(RECOVERY_KEY)), before);
  assert.deepEqual(JSON.parse(values.get(KEY)), after);
  values.set(KEY, JSON.stringify(before));
  for (const failKey of [KEY, RECOVERY_KEY]) {
    const failing = { setItem: (k, v) => { if (k === failKey) throw new Error("full"); values.set(k, v); } };
    assert.throws(() => replaceWithRecovery(failing, before, after, KEY), /full/);
    assert.deepEqual(JSON.parse(values.get(KEY)), before);
  }
});
