import test from "node:test";
import assert from "node:assert/strict";
import { createInitialData, newTask, expandRecurring, addDays, deleteTasks, deletionTargets, planBatchMove, validProject, conflicts, goalStats } from "../src/model.js";
import { parseBackup, serializeBackup, historyReducer } from "../src/backup.js";

const date = "2026-09-19";
const recurring = () => expandRecurring({ ...createInitialData(), tasks: [newTask({
  title: "每日学习", date, start: 540, repeat: "daily", seriesId: "learning",
})] }, date);

test("deleting a single recurrence survives reload and backup restore", () => {
  const data = recurring();
  const removed = data.tasks[3];
  const next = deleteTasks(data, [removed.id]);
  const restored = expandRecurring(parseBackup(serializeBackup(next)), date);
  assert.equal(restored.tasks.length, 29);
  assert.ok(!restored.tasks.some((t) => t.occurrenceDate === removed.occurrenceDate));
  assert.equal(data.tasks.length, 30);
  assert.deepEqual(data.recurrences[0].excludedDates, undefined);
});
test("following deletion uses the original occurrence, stops beyond the generated horizon", () => {
  const data = recurring();
  data.tasks[3] = { ...data.tasks[3], date: addDays(date, 10), start: 600 };
  const removed = data.tasks[3];
  assert.equal(deletionTargets(data, [removed.id], "following").length, 27);
  const next = deleteTasks(data, [removed.id], "following");
  assert.equal(next.tasks.length, 3);
  assert.equal(next.recurrences[0].endBefore, addDays(date, 3));
  assert.equal(expandRecurring(next, addDays(date, 40)).tasks.length, 3);
  assert.equal(expandRecurring(parseBackup(serializeBackup(next)), date).tasks.length, 3);
});
test("deleting all occurrences retains the stop rule and undo restores the full series", () => {
  const data = recurring();
  const next = deleteTasks(data, [data.tasks[0].id], "following");
  assert.equal(expandRecurring(next, addDays(date, 31)).tasks.length, 0);
  const changed = historyReducer({ data, past: [], future: [], revision: 0 }, { type: "change", update: next });
  const undone = historyReducer(changed, { type: "undo" });
  assert.deepEqual(undone.data, data);
  assert.equal(expandRecurring(undone.data, date).tasks.length, 30);
});
test("deletion blocks active focus, even when included by following scope", () => {
  const data = recurring();
  data.focusSession = { taskId: data.tasks[5].id, startedAt: 123 };
  assert.throws(() => deleteTasks(data, [data.tasks[0].id], "following"), /先结束计时/);
  assert.equal(deleteTasks(data, [data.tasks[0].id]).tasks.length, 29);
});
test("batch move preserves times, finds Inbox slots and keeps occurrence identity", () => {
  const data = recurring();
  const first = data.tasks[0];
  const inbox = newTask({ title: "待安排", duration: 60 });
  data.tasks.push(inbox);
  const targetDate = addDays(date, 35);
  const changes = planBatchMove(data, [first.id, inbox.id], targetDate);
  assert.equal(changes[0].after.start, first.start);
  assert.equal(changes[0].after.occurrenceDate, date);
  assert.equal(changes[1].after.start, 570);
  const next = { ...data, tasks: data.tasks.map((t) => changes.find((c) => c.after.id === t.id)?.after || t) };
  assert.equal(expandRecurring(next, date).tasks.length, data.tasks.length);
  assert.ok(changes.every((c) => !conflicts(c.after, next.tasks).length));
});
test("batch move refuses overlaps, deadlines and protected tasks atomically", () => {
  const a = newTask({ date, start: 540 });
  const b = newTask({ date: addDays(date, 1), start: 540 });
  const data = { ...createInitialData(), tasks: [a, b] };
  const before = JSON.stringify(data);
  assert.throws(() => planBatchMove(data, [a.id, b.id], addDays(date, 2)), /冲突/);
  assert.throws(() => planBatchMove(data, [a.id], b.date), /冲突/);
  assert.equal(JSON.stringify(data), before);
  for (const patch of [{ kind: "fixed" }, { done: true }, { deadline: date }]) {
    const d = { ...data, tasks: [{ ...a, ...patch }] };
    assert.throws(() => planBatchMove(d, [a.id], addDays(date, 2)));
  }
  assert.throws(() => planBatchMove(data, [a.id], "2026-02-31"), /有效/);
  assert.throws(() => planBatchMove(data, [], date), /选择任务/);
});
test("goal validation permits custom milestones; linked completion updates progress", () => {
  const project = { id: "goal", title: "作品集", goal: "完成两个案例", category: "design", weekly: 120, milestones: ["调研", "完成"] };
  assert.ok(validProject(project));
  for (const patch of [{ title: " " }, { weekly: 0 }, { weekly: NaN }, { milestones: [] }, { milestones: [""] }])
    assert.ok(!validProject({ ...project, ...patch }));
  const t = newTask({ projectId: project.id });
  const data = { ...createInitialData(), projects: [project], tasks: [t] };
  assert.equal(goalStats(data, project.id, date).rate, 0);
  assert.equal(goalStats({ ...data, tasks: [{ ...t, done: true, actual: 30 }] }, project.id, date).rate, 100);
});
test("backup validation rejects malformed recurrence suppression fields", () => {
  const data = recurring();
  for (const patch of [{ excludedDates: "bad" }, { excludedDates: ["2026-02-31"] }, { endBefore: false }]) {
    assert.throws(() => parseBackup(serializeBackup({ ...data, recurrences: [{ ...data.recurrences[0], ...patch }] })), /格式不完整/);
  }
});
