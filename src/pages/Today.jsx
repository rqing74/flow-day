import React from "react";
import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckSquare,
  Zap,
  Sparkles,
  Sun,
  GraduationCap,
  Monitor,
  Dumbbell,
} from "lucide-react";
import { useFlow } from "../store";
import {
  dayKey,
  addDays,
  monday,
  stats,
  duration,
  goalStats,
  labelDate,
  timelineBounds,
  blockLanes,
} from "../model";
import {
  TaskBlock,
  SectionTitle,
  Progress,
  IconButton,
  Empty,
  LinkButton,
} from "../components";
export default function Today({
  onSelect,
  onQuick,
  onPlanner,
  onAvailable,
  navigate,
}) {
  const { data, setData, complete } = useFlow();
  const [date, setDate] = useState(dayKey()),
    [filter, setFilter] = useState("all");
  const s = stats(data, date);
  const start = monday(date),
    energy = data.energy[date] || 0;
  const list = s.tasks
    .filter(
      (t) =>
        filter === "all" ||
        (filter === "remaining" && !t.done) ||
        (filter === "fixed" && t.kind === "fixed"),
    )
    .sort((a, b) => a.start - b.start);
  const bounds = timelineBounds(s.tasks);
  const lanes = blockLanes(list, 44, 40);
  const now = new Date(),
    current = now.getHours() * 60 + now.getMinutes();
  return (
    <div className="today-layout">
      <div className="today-main">
        <div className="today-greeting">
          <div>
            <h1>今天，留一点从容。</h1>
            <p>每一小步，都在靠近想去的地方。</p>
          </div>
          <p className="quote">
            生活不是被填满的日程，
            <br />
            而是有呼吸的节奏。
          </p>
        </div>
        <div className="week-strip">
          <div className="section-title">
            <h3>
              {new Date(date + "T12:00:00").getFullYear()} 年{" "}
              {new Date(date + "T12:00:00").getMonth() + 1} 月
            </h3>
            <button className="text-button" onClick={() => setDate(dayKey())}>
              回到今天
            </button>
          </div>
          <div className="week-days">
            <IconButton
              label="上一周"
              onClick={() => setDate(addDays(date, -7))}
            >
              <ChevronLeft size={18} />
            </IconButton>
            {Array.from({ length: 7 }, (_, i) => addDays(start, i)).map(
              (d, i) => (
                <button
                  key={d}
                  className={d === date ? "selected" : ""}
                  onClick={() => setDate(d)}
                >
                  <small>{["一", "二", "三", "四", "五", "六", "日"][i]}</small>
                  <strong>{Number(d.slice(-2))}</strong>
                  <i
                    className={
                      data.tasks.some((t) => t.date === d) ? "has-tasks" : ""
                    }
                  />
                </button>
              ),
            )}
            <IconButton
              label="下一周"
              onClick={() => setDate(addDays(date, 7))}
            >
              <ChevronRight size={18} />
            </IconButton>
          </div>
        </div>
        <section className="panel timeline-panel">
          <SectionTitle
            action={
              <select
                aria-label="时间轴筛选"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">全部日程</option>
                <option value="remaining">未完成</option>
                <option value="fixed">固定事件</option>
              </select>
            }
          >
            {date === dayKey() ? "今日时间轴" : labelDate(date)}
          </SectionTitle>
          <div
            className="daily-timeline"
            style={{ height: ((bounds.to - bounds.from) / 60) * 44 + 28 }}
          >
            {Array.from(
              { length: (bounds.to - bounds.from) / 60 + 1 },
              (_, i) => (
                <div className="time-rule" key={i} style={{ top: i * 44 }}>
                  <span>
                    {String(i + bounds.from / 60).padStart(2, "0")}:00
                  </span>
                  <i />
                </div>
              ),
            )}
            {list.map((t) => (
              <TaskBlock
                key={t.id}
                task={t}
                onSelect={onSelect}
                onComplete={complete}
                drag={false}
                style={{
                  position: "absolute",
                  left:
                    "calc(76px + (100% - 76px) * " +
                    lanes[t.id].lane / lanes[t.id].lanes +
                    ")",
                  right:
                    "calc((100% - 76px) * " +
                    (lanes[t.id].lanes - lanes[t.id].lane - 1) /
                      lanes[t.id].lanes +
                    ")",
                  top: ((t.start - bounds.from) / 60) * 44,
                  height: Math.max(40, (t.duration / 60) * 44 - 5),
                }}
              />
            ))}
            {date === dayKey() &&
              current >= bounds.from &&
              current <= bounds.to && (
                <div
                  className="now-line"
                  style={{ top: ((current - bounds.from) / 60) * 44 }}
                >
                  <b />
                  <span>现在</span>
                </div>
              )}
            {!list.length && (
              <Empty onAdd={onQuick}>这一天还没有安排，慢慢来。</Empty>
            )}
          </div>
        </section>
      </div>
      <aside className="today-aside">
        <section className="panel status-panel">
          <SectionTitle>今日状态</SectionTitle>
          <div className="status-body">
            <div>
              <div className="donut" style={{ "--value": s.rate }}>
                <strong>
                  {s.rate}
                  <small>%</small>
                </strong>
              </div>
              <p>今日计划完成</p>
            </div>
            <div className="status-values">
              <div>
                <Clock size={17} />
                <span>专注时间</span>
                <b>{duration(s.focus)}</b>
              </div>
              <div>
                <CheckSquare size={17} />
                <span>待完成事项</span>
                <b>
                  {s.tasks.length - s.done.length}
                  <small> 项</small>
                </b>
              </div>
              <div className="energy-label">
                <Zap size={17} />
                <span>今日精力</span>
              </div>
              <div className="energy-dots">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    aria-label={`精力 ${n}`}
                    className={energy >= n ? "filled" : ""}
                    onClick={() =>
                      setData((s) => ({
                        ...s,
                        energy: { ...s.energy, [date]: n },
                      }))
                    }
                  />
                ))}
              </div>
              <small>
                {energy === 0 ? '尚未记录今日精力' : energy >= 4
                  ? "状态不错，继续保持！"
                  : energy <= 2
                    ? "放慢一点，也没关系。"
                    : "跟随自己的节奏。"}
              </small>
            </div>
          </div>
        </section>
        <button className="panel available-card" onClick={onAvailable}>
          <span className="clock-mark">
            <Clock size={27} />
          </span>
          <span>
            <strong>我现在有 45 分钟</strong>
            <small>专注一件小事，也能带来大改变。</small>
          </span>
          <ChevronRight size={19} />
        </button>
        <section className="planner-card">
          <h3>
            <Sun size={24} />
            给计划一点弹性
          </h3>
          <p>
            计划不必一成不变。
            <br />
            重新安排，在变化中保持平衡。
          </p>
          <button onClick={onPlanner}>
            <Sparkles size={19} />
            <strong>AI 重新安排</strong>
            <ChevronRight size={17} />
          </button>
        </section>
        <section className="panel weekly-goals">
          <SectionTitle
            action={
              <LinkButton onClick={() => navigate("goals")}>
                查看全部
              </LinkButton>
            }
          >
            本周目标
          </SectionTitle>
          {!data.projects.length && <p className="muted">还没有目标，慢慢开始。</p>}
          {data.projects.map((p, i) => {
            const g = goalStats(data, p.id, date),
              Icon = [GraduationCap, Monitor, Dumbbell][i % 3];
            return (
              <button
                key={p.id}
                onClick={() => navigate("goals")}
                className="mini-goal"
              >
                <Icon size={20} />
                <div>
                  <div>
                    <strong>{p.title}</strong>
                    <small>{p.weekly ? Math.round((g.weekly / p.weekly) * 100) : 0}%</small>
                  </div>
                  <Progress value={p.weekly ? Math.round((g.weekly / p.weekly) * 100) : 0} />
                  <span>
                    本周完成 {duration(g.weekly)} / {duration(p.weekly)}
                  </span>
                </div>
              </button>
            );
          })}
        </section>
        <p className="local-note">
          <span />
          已自动保存在此浏览器
        </p>
      </aside>
    </div>
  );
}
