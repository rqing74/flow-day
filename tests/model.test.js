import test from "node:test";
import assert from "node:assert/strict";
import {
  newTask,
  parseQuick,
  addDays,
  monday,
  conflicts,
  replan,
  findSlot,
  recommend,
  seed,
  expandRecurring,
  goalStats,
  stats,
  validTask,
  streak,
  blockLanes,
  timelineBounds,
} from "../src/model.js";
const date = "2026-09-19";
test("short adjacent blocks receive separate visual lanes", () => {
  const a = newTask({ date, start: 480, duration: 25 }),
    b = newTask({ date, start: 510, duration: 90 });
  const lanes = blockLanes([a, b], 44, 40);
  assert.equal(lanes[a.id].lanes, 2);
  assert.notEqual(lanes[a.id].lane, lanes[b.id].lane);
});
test("timeline expands to include early and late tasks", () => {
  assert.deepEqual(
    timelineBounds([
      newTask({ start: 360, duration: 30 }),
      newTask({ start: 1410, duration: 30 }),
    ]),
    { from: 360, to: 1440 },
  );
});
test("invalid date cannot be saved", () => {
  assert.equal(
    Boolean(validTask(newTask({ date: "2026-02-31", start: 540 }))),
    false,
  );
  assert.equal(
    Boolean(validTask(newTask({ date: "2026-99-01", start: 540 }))),
    false,
  );
});
test("natural language parses tomorrow, afternoon, Chinese duration and title", () => {
  const t = parseQuick("明天下午做两小时产品设计", date);
  assert.equal(t.date, "2026-09-20");
  assert.equal(t.start, 840);
  assert.equal(t.duration, 120);
  assert.equal(t.title, "产品设计");
  assert.equal(t.category, "design");
});
test("daily evening exercise recognizes recurrence", () => {
  const t = parseQuick("每天晚上安排两小时健身", date);
  assert.equal(t.repeat, "daily");
  assert.equal(t.start, 1140);
  assert.equal(t.duration, 120);
  assert.equal(t.title, "健身");
});
test("temporary meeting recognizes fixed event and exact clock", () => {
  const t = parseQuick("今天15:00临时讨论60分钟", date);
  assert.equal(t.kind, "fixed");
  assert.equal(t.start, 900);
  assert.equal(t.duration, 60);
});
test("dates cross month and year boundaries without UTC drift", () => {
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(monday(date), "2026-09-14");
});
test("adjacent events do not conflict; overlaps do", () => {
  const a = newTask({ date, start: 600, duration: 60 }),
    b = newTask({ date, start: 660, duration: 30 });
  assert.equal(conflicts(a, [b]).length, 0);
  assert.equal(conflicts({ ...a, duration: 61 }, [b]).length, 1);
});
test("replanning protects fixed and complete blocks and returns no overlaps", () => {
  const fixed = newTask({ date, start: 900, duration: 120, kind: "fixed" }),
    done = newTask({ date, start: 720, duration: 60, done: true }),
    flex = newTask({ date, start: 840, duration: 120, priority: 3 }),
    late = newTask({ date, start: 1020, duration: 60 });
  const original = [fixed, done, flex, late];
  const result = replan(original, date);
  assert.ok(result.changes.length);
  assert.equal(result.unplaced.length, 0);
  assert.ok(
    result.changes.every(
      (c) => c.before.id !== fixed.id && c.before.id !== done.id,
    ),
  );
  const next = original.map(
    (t) => result.changes.find((c) => c.after.id === t.id)?.after || t,
  );
  assert.ok(next.every((t) => conflicts(t, next).length === 0));
});
test("full day with deadline produces unplaced result, never silently discards", () => {
  const busy = newTask({ date, start: 480, duration: 900, kind: "fixed" }),
    t = newTask({ date, start: 540, duration: 60, deadline: date });
  const r = replan([busy, t], date);
  assert.equal(r.unplaced.length, 1);
  assert.equal(r.changes.length, 0);
});
test("findSlot obeys day end and deadline", () => {
  assert.equal(findSlot(newTask({ duration: 120 }), [], date, 1320), null);
  assert.equal(findSlot(newTask({ deadline: "2026-09-18" }), [], date), null);
});
test("recommendation respects energy, duration, priority and deadline", () => {
  const high = newTask({
      priority: 3,
      duration: 25,
      energy: 2,
      deadline: date,
    }),
    low = newTask({ priority: 1, duration: 20, energy: 1 }),
    hard = newTask({ duration: 20, energy: 5 }),
    long = newTask({ duration: 60, energy: 1 }),
    done = newTask({ done: true, duration: 20 });
  const r = recommend([low, hard, long, done, high], 45, 3, date);
  assert.equal(r.length, 2);
  assert.equal(r[0].id, high.id);
});
test("recurrence materializes 30 days and remains idempotent", () => {
  const t = newTask({
    date,
    start: 1140,
    duration: 60,
    repeat: "daily",
    seriesId: "x",
  });
  const a = expandRecurring({ tasks: [t] }, date),
    b = expandRecurring(a, date);
  assert.equal(a.tasks.length, 30);
  assert.equal(b.tasks.length, 30);
  assert.equal(new Set(a.tasks.map((t) => t.id)).size, 30);
});
test("moving one recurrence does not regenerate it or change future defaults", () => {
  const t = newTask({
    date,
    start: 1140,
    duration: 60,
    repeat: "daily",
    seriesId: "moving",
  });
  const initial = expandRecurring({ tasks: [t] }, date);
  const changed = {
    ...initial,
    tasks: initial.tasks.map((x) =>
      x.id === t.id ? { ...x, date: addDays(date, 1), start: 480 } : x,
    ),
  };
  const reloaded = expandRecurring(changed, date);
  assert.equal(reloaded.tasks.length, 30);
  assert.equal(
    reloaded.tasks.filter((x) => x.occurrenceDate === date).length,
    1,
  );
  const nextDay = expandRecurring(reloaded, addDays(date, 1));
  assert.equal(
    nextDay.tasks.find((x) => x.occurrenceDate === addDays(date, 30)).start,
    1140,
  );
});
test("recurrence seeks another free slot without overlapping fixed events", () => {
  const t = newTask({
      date,
      start: 1140,
      duration: 60,
      repeat: "daily",
      seriesId: "x",
    }),
    busy = newTask({
      date: addDays(date, 1),
      start: 1140,
      duration: 60,
      kind: "fixed",
    });
  const expanded = expandRecurring({ tasks: [t, busy] }, date);
  const next = expanded.tasks.find(
    (x) => x.seriesId === "x" && x.date === busy.date,
  );
  assert.equal(next.start, 1200);
  assert.equal(conflicts(next, expanded.tasks).length, 0);
});
test("impossible recurring fixed block goes to Inbox once with occurrence date", () => {
  const t = newTask({
      date,
      start: 1140,
      duration: 60,
      repeat: "daily",
      seriesId: "x",
      kind: "fixed",
    }),
    busy = newTask({
      date: addDays(date, 1),
      start: 1140,
      duration: 60,
      kind: "fixed",
    });
  const a = expandRecurring({ tasks: [t, busy] }, date);
  const blocked = a.tasks.find(
    (x) => x.seriesId === "x" && x.occurrenceDate === busy.date,
  );
  assert.equal(blocked.date, null);
  assert.equal(expandRecurring(a, date).tasks.length, a.tasks.length);
});
test("completing project task updates goal and review from the same data", () => {
  const t = newTask({ date, start: 540, duration: 45, projectId: "p" }),
    data = { tasks: [t], focusLogs: [] };
  assert.equal(goalStats(data, "p", date).rate, 0);
  const next = { ...data, tasks: [{ ...t, done: true, actual: 40 }] };
  assert.equal(goalStats(next, "p", date).rate, 100);
  assert.equal(goalStats(next, "p", date).weekly, 40);
  assert.equal(stats(next, date).actual, 40);
  assert.equal(stats(next, date).rate, 100);
});
test("streak counts consecutive recorded completed days", () => {
  const data = {
    tasks: [0, 1, 2, 4].map((n) =>
      newTask({ date: addDays(date, -n), category: "health", done: true }),
    ),
  };
  assert.equal(streak(data, "health", date), 3);
});
test("task validation rejects empty title, nonfinite and cross-midnight blocks", () => {
  assert.equal(Boolean(validTask(newTask({ title: "" }))), false);
  assert.equal(Boolean(validTask(newTask({ duration: NaN }))), false);
  assert.equal(
    Boolean(validTask(newTask({ date, start: 1380, duration: 90 }))),
    false,
  );
});
test("seed data has six today events and consistent persisted shapes", () => {
  const d = seed(date);
  assert.equal(d.tasks.filter((t) => t.date === date).length, 6);
  assert.equal(stats(d, date).rate, 33);
  assert.equal(stats(d, date).focus, 45);
  assert.ok(d.tasks.every(validTask));
});
