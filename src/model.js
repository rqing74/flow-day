export const KEY = "flowday.v1";
export const categories = {
  course: "课程",
  study: "学习",
  design: "设计",
  health: "健康",
  personal: "个人",
};
export const uid = () => crypto.randomUUID();
export const dayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const addDays = (s, n) => {
  const d = new Date(s + "T12:00:00");
  d.setDate(d.getDate() + n);
  return dayKey(d);
};
export const monday = (s) =>
  addDays(s, -((new Date(s + "T12:00:00").getDay() + 6) % 7));
export const time = (m) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
export const minutes = (s) => {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + m;
};
export const duration = (n) =>
  n >= 60 ? `${Math.floor(n / 60)}h${n % 60 ? ` ${n % 60}m` : ""}` : `${n} min`;
export const labelDate = (s) =>
  new Date(s + "T12:00:00").toLocaleDateString("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "long",
  });
export function timelineBounds(tasks) {
  const scheduled = tasks.filter((t) => t.start !== null);
  return {
    from: Math.min(480, ...scheduled.map((t) => Math.floor(t.start / 60) * 60)),
    to: Math.max(
      1380,
      ...scheduled.map((t) => Math.ceil((t.start + t.duration) / 60) * 60),
    ),
  };
}
// Give visually adjacent short blocks separate lanes when their minimum heights overlap.
export function blockLanes(tasks, pixelsPerHour, minHeight) {
  const result = {},
    ordered = [...tasks].sort((a, b) => a.start - b.start);
  let group = [],
    ends = [],
    until = -1;
  const finish = () => {
    for (const row of group)
      result[row.id] = { lane: row.lane, lanes: ends.length };
    group = [];
    ends = [];
  };
  for (const t of ordered) {
    if (t.start >= until) finish();
    const end =
      t.start +
      Math.max(
        t.duration - (4 / pixelsPerHour) * 60,
        (minHeight / pixelsPerHour) * 60,
      );
    let lane = ends.findIndex((e) => e <= t.start);
    if (lane < 0) lane = ends.length;
    ends[lane] = end;
    group.push({ id: t.id, lane });
    until = Math.max(group.length === 1 ? -1 : until, end);
  }
  finish();
  return result;
}
export function newTask(fields = {}) {
  return {
    id: uid(),
    title: "新任务",
    category: "personal",
    priority: 2,
    duration: 30,
    energy: 2,
    kind: "flex",
    date: null,
    start: null,
    done: false,
    actual: 0,
    deadline: "",
    tags: [],
    checklist: [],
    projectId: "",
    notes: "",
    repeat: "none",
    ...fields,
  };
}
export function createInitialData() {
  return {version:1,tasks:[],projects:[],energy:{},reviews:{},focusLogs:[],focusSession:null,recurrences:[]};
}
export function restoreData(data) {
  if (data?.demo === true) return createInitialData();
  return expandRecurring(data);
}
export function expandRecurring(data, today = dayKey()) {
  const tasks = data.tasks.map((t) =>
      t.seriesId && !t.occurrenceDate && t.date
        ? { ...t, occurrenceDate: t.date }
        : t,
    ),
    seen = new Set(
      tasks
        .filter((t) => t.seriesId)
        .map((t) => t.seriesId + "|" + (t.occurrenceDate || t.date)),
    );
  // Keep recurrence templates separate from editable individual occurrences.
  const templates = new Map(
    (data.recurrences || []).map((t) => [t.seriesId, t]),
  );
  for (const t of tasks)
    if (
      t.repeat === "daily" &&
      t.seriesId &&
      t.date &&
      t.start !== null &&
      !templates.has(t.seriesId)
    )
      templates.set(t.seriesId, t);
  for (const [id, t] of templates)
    for (let i = 0; i < 30; i++) {
      const date = addDays(today, i);
      if (date < t.date || seen.has(id + "|" + date)) continue;
      let next = {
        ...t,
        id: uid(),
        date,
        occurrenceDate: date,
        done: false,
        actual: 0,
        checklist: t.checklist.map((c) => ({ ...c, done: false })),
      };
      if (conflicts(next, tasks).length) {
        const slot =
          t.kind === "flex" ? findSlot(next, tasks, date, t.start) : null;
        next = slot
          ? { ...next, ...slot }
          : {
              ...next,
              date: null,
              start: null,
              notes: `${date} 的重复任务与已有计划冲突，已放入 Inbox。 ${t.notes}`,
            };
      }
      tasks.push(next);
      seen.add(id + "|" + date);
    }
  return { ...data, tasks, recurrences: [...templates.values()] };
}
export function conflicts(task, tasks) {
  if (!task.date || task.start === null) return [];
  return tasks.filter(
    (t) =>
      t.id !== task.id &&
      t.date === task.date &&
      t.start !== null &&
      t.start < task.start + task.duration &&
      task.start < t.start + t.duration,
  );
}
export function validTask(t) {
  return (
    t.title.trim() &&
    Number.isFinite(t.duration) &&
    t.duration >= 5 &&
    t.duration <= 900 &&
    (!t.date ||
      (/^\d{4}-\d{2}-\d{2}$/.test(t.date) &&
        !Number.isNaN(new Date(t.date + "T12:00:00").getTime()) &&
        dayKey(new Date(t.date + "T12:00:00")) === t.date &&
        Number.isFinite(t.start) &&
        t.start >= 0 &&
        t.start + t.duration <= 1440))
  );
}
export function findSlot(task, tasks, date, earliest = 480) {
  if (task.deadline && date > task.deadline) return null;
  for (
    let start = Math.ceil(Math.max(480, earliest) / 15) * 15;
    start + task.duration <= 1380;
    start += 15
  )
    if (!conflicts({ ...task, date, start }, tasks).length)
      return { date, start };
  return null;
}
export function replan(tasks, date, earliest = 480) {
  const movable = tasks.filter(
    (t) => t.date === date && !t.done && t.kind === "flex",
  );
  const occupied = tasks.filter((t) => !movable.some((m) => m.id === t.id));
  const changes = [],
    unplaced = [];
  movable.sort(
    (a, b) =>
      b.priority - a.priority ||
      (a.deadline || "9999").localeCompare(b.deadline || "9999") ||
      a.start - b.start,
  );
  for (const t of movable) {
    let slot = null;
    for (let n = 0; n < 7 && !slot; n++)
      slot = findSlot(
        t,
        occupied,
        addDays(date, n),
        n === 0 ? Math.max(t.start ?? 480, earliest) : 480,
      );
    if (!slot) {
      unplaced.push(t);
      occupied.push(t);
      continue;
    }
    const next = { ...t, ...slot };
    occupied.push(next);
    if (next.date !== t.date || next.start !== t.start)
      changes.push({ before: t, after: next });
  }
  // If an unschedulable task had to retain its old block, never offer a conflicting move.
  const unsafe = changes.filter((c) => conflicts(c.after, occupied).length);
  if (unsafe.length)
    return {
      changes: [],
      unplaced: [...unplaced, ...unsafe.map((c) => c.before)],
    };
  return { changes, unplaced };
}
export function recommend(tasks, available, energy, today = dayKey()) {
  return tasks
    .filter(
      (t) =>
        !t.done &&
        t.kind !== "fixed" &&
        t.duration <= available &&
        t.energy <= energy &&
        (!t.date || t.date === today),
    )
    .map((t) => ({
      ...t,
      score:
        t.priority * 20 +
        (t.deadline
          ? t.deadline <= today
            ? 35
            : t.deadline <= addDays(today, 2)
              ? 20
              : 5
          : 0) +
        (t.duration / available) * 10,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);
}
const number = (s) =>
  ({
    一: 1,
    二: 2,
    两: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
    七: 7,
    八: 8,
    九: 9,
    十: 10,
    半: 0.5,
  })[s] ?? Number(s);
export function parseQuick(raw, today = dayKey()) {
  let date = raw.includes("后天")
    ? addDays(today, 2)
    : raw.includes("明天")
      ? addDays(today, 1)
      : today;
  const exactDate = raw.match(/\d{4}-\d{2}-\d{2}/);
  if (exactDate) date = exactDate[0];
  let preference = raw.includes("晚上")
    ? "晚上"
    : raw.includes("下午")
      ? "下午"
      : raw.includes("中午")
        ? "中午"
        : "上午";
  let start = { 上午: 540, 下午: 840, 晚上: 1140, 中午: 720 }[preference];
  const clock = raw.match(/(\d{1,2})[:：](\d{2})/),
    point = raw.match(/([一二两三四五六七八九十\d]+)点(半)?/);
  if (clock) start = Number(clock[1]) * 60 + Number(clock[2]);
  else if (point) start = number(point[1]) * 60 + (point[2] ? 30 : 0);
  if ((clock || point) && ["下午", "晚上"].includes(preference) && start < 720)
    start += 720;
  const hm = raw.match(/([一二两三四五六七八九十半\d.]+)\s*(?:个)?小时/),
    mm = raw.match(/(\d+)\s*分钟/);
  const length = hm
    ? number(hm[1]) * 60 + (raw.includes("小时半") ? 30 : 0)
    : mm
      ? Number(mm[1])
      : 30;
  const kind = /会议|课程|上课|考试|临时|讨论/.test(raw) ? "fixed" : "flex";
  const category = /健身|训练|运动/.test(raw)
    ? "health"
    : /设计|产品/.test(raw)
      ? "design"
      : /六级|单词|学习|听力/.test(raw)
        ? "study"
        : kind === "fixed"
          ? "course"
          : "personal";
  const title = raw
    .replace(
      /\d{4}-\d{2}-\d{2}|每天|今天|明天|后天|上午|下午|晚上|中午|早上|安排|进行/g,
      "",
    )
    .replace(
      /([一二两三四五六七八九十半\d.]+)\s*(个)?小时(半)?|\d+\s*分钟|\d{1,2}[:：]\d{2}|[一二两三四五六七八九十\d]+点半?/g,
      "",
    )
    .replace(/^\s*做/, "")
    .trim();
  return newTask({
    title: title || "新任务",
    date,
    start,
    duration: length,
    repeat: raw.includes("每天") ? "daily" : "none",
    kind,
    category,
    preference,
    energy: category === "design" ? 4 : 2,
  });
}
export function stats(data, date) {
  const tasks = data.tasks.filter((t) => t.date === date),
    done = tasks.filter((t) => t.done);
  return {
    tasks,
    done,
    planned: tasks.reduce((a, t) => a + t.duration, 0),
    actual: done.reduce((a, t) => a + t.actual, 0),
    rate: tasks.length ? Math.round((done.length / tasks.length) * 100) : 0,
    focus: data.focusLogs
      .filter((l) => l.date === date)
      .reduce((a, l) => a + l.minutes, 0),
  };
}
export function goalStats(data, projectId, date = dayKey()) {
  const list = data.tasks.filter(
      (t) => t.projectId === projectId && (!t.date || t.date <= date),
    ),
    done = list.filter((t) => t.done),
    weekStart = monday(date),
    weekEnd = addDays(weekStart, 7);
  return {
    total: list.length,
    done: done.length,
    rate: list.length ? Math.round((done.length / list.length) * 100) : 0,
    weekly: data.tasks
      .filter(
        (t) =>
          t.projectId === projectId &&
          t.done &&
          t.date >= weekStart &&
          t.date < weekEnd,
      )
      .reduce((a, t) => a + t.actual, 0),
  };
}
export function streak(data, category, today = dayKey()) {
  let n = 0,
    d = today;
  if (
    !data.tasks.some((t) => t.category === category && t.date === d && t.done)
  )
    d = addDays(d, -1);
  while (
    data.tasks.some((t) => t.category === category && t.date === d && t.done)
  ) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}
