import React from "react";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Lock } from "lucide-react";
import { useFlow } from "../store";
import {
  dayKey,
  addDays,
  monday,
  time,
  categories,
  conflicts,
  timelineBounds,
  blockLanes,
} from "../model";
import { PageHeading, IconButton, TaskBlock } from "../components";
export default function Calendar({ onSelect, onSave, onQuick }) {
  const { data, complete, toast } = useFlow();
  const [date, setDate] = useState(dayKey()),
    [view, setView] = useState("week");
  const [dragging, setDragging] = useState(false);
  const dates =
    view === "day"
      ? [date]
      : Array.from({ length: 7 }, (_, i) => addDays(monday(date), i));
  const bounds = timelineBounds(
    data.tasks.filter((t) => dates.includes(t.date)),
  );
  function shift(n) {
    if (view === "month") {
      const d = new Date(date + "T12:00:00");
      d.setDate(1);
      d.setMonth(d.getMonth() + n);
      setDate(dayKey(d));
    } else setDate(addDays(date, n * (view === "week" ? 7 : 1)));
  }
  const monthStart = date.slice(0, 8) + "01",
    monthDates = Array.from({ length: 42 }, (_, i) =>
      addDays(monday(monthStart), i),
    );
  function drop(e, d) {
    e.preventDefault();
    setDragging(false);
    const t = data.tasks.find(
      (x) => x.id === e.dataTransfer.getData("text/plain"),
    );
    if (!t) return;
    if (t.kind === "fixed" || t.done) {
      toast("固定或已完成的事件不能拖动");
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const start = Math.max(
      bounds.from,
      Math.min(
        bounds.to - t.duration,
        Math.round((((e.clientY - rect.top) / 64) * 60 + bounds.from) / 15) *
          15,
      ),
    );
    onSave({ ...t, date: d, start });
  }
  return (
    <>
      <PageHeading
        title="给一周，留出节奏。"
        subtitle="固定的安心放下，弹性的自由调整。"
        action={
          <button className="button" onClick={onQuick}>
            <Plus size={16} />
            新建日程
          </button>
        }
      />
      <section className="panel calendar-panel">
        <div className="calendar-toolbar">
          <div className="calendar-date">
            <h3>
              {new Date(date + "T12:00:00").toLocaleDateString("zh-CN", {
                year: "numeric",
                month: "long",
              })}
            </h3>
            <IconButton label="上一个周期" onClick={() => shift(-1)}>
              <ChevronLeft size={17} />
            </IconButton>
            <IconButton label="下一个周期" onClick={() => shift(1)}>
              <ChevronRight size={17} />
            </IconButton>
            <button className="button small" onClick={() => setDate(dayKey())}>
              今天
            </button>
          </div>
          <div className="segmented">
            {[
              ["day", "日"],
              ["week", "周"],
              ["month", "月"],
            ].map(([k, v]) => (
              <button
                key={k}
                onClick={() => setView(k)}
                className={view === k ? "active" : ""}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
        {view === "month" ? (
          <div className="month-grid">
            {["一", "二", "三", "四", "五", "六", "日"].map((d) => (
              <div className="month-weekday" key={d}>
                {d}
              </div>
            ))}
            {monthDates.map((d) => (
              <div
                key={d}
                className={`month-day ${d.slice(0, 7) !== date.slice(0, 7) ? "outside" : ""}`}
              >
                <button
                  className={d === dayKey() ? "today-date" : ""}
                  onClick={() => {
                    setDate(d);
                    setView("day");
                  }}
                >
                  {Number(d.slice(-2))}
                </button>
                {data.tasks
                  .filter((t) => t.date === d)
                  .sort((a, b) => a.start - b.start)
                  .slice(0, 3)
                  .map((t) => (
                    <button
                      key={t.id}
                      className={`month-event ${t.category}`}
                      onClick={() => onSelect(t.id)}
                    >
                      {time(t.start)} {t.title}
                    </button>
                  ))}
                {data.tasks.filter((t) => t.date === d).length > 3 && (
                  <button
                    className="more-events"
                    onClick={() => {
                      setDate(d);
                      setView("day");
                    }}
                  >
                    查看全部 {data.tasks.filter((t) => t.date === d).length} 项
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="calendar-scroll">
            <div
              className={`calendar-grid ${view === "day" ? "day-view" : ""}`}
              style={{ "--days": dates.length }}
            >
              <div className="calendar-day-head">
                <span>GMT+8</span>
                {dates.map((d) => (
                  <button
                    key={d}
                    onClick={() => {
                      setDate(d);
                      setView("day");
                    }}
                    className={d === dayKey() ? "is-today" : ""}
                  >
                    <small>
                      {new Date(d + "T12:00:00").toLocaleDateString("zh-CN", {
                        weekday: "short",
                      })}
                    </small>
                    <strong>{Number(d.slice(-2))}</strong>
                  </button>
                ))}
              </div>
              <div
                className="calendar-body"
                style={{ height: ((bounds.to - bounds.from) / 60) * 64 }}
              >
                <div className="hour-labels">
                  {Array.from(
                    { length: (bounds.to - bounds.from) / 60 + 1 },
                    (_, i) => (
                      <span key={i} style={{ top: i * 64 }}>
                        {time(bounds.from + i * 60)}
                      </span>
                    ),
                  )}
                </div>
                {dates.map((d) => (
                  <div
                    key={d}
                    data-date={d}
                    className={`calendar-column ${dragging ? "dragging" : ""}`}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => drop(e, d)}
                    onDragEnter={() => setDragging(true)}
                    onDragEnd={() => setDragging(false)}
                  >
                    <div className="calendar-lines" />
                    {data.tasks
                      .filter((t) => t.date === d)
                      .map((t) => {
                        const overlap = conflicts(t, data.tasks);
                        const lane = blockLanes(
                          data.tasks.filter((x) => x.date === d),
                          64,
                          30,
                        )[t.id];
                        return (
                          <TaskBlock
                            key={t.id}
                            compact
                            task={t}
                            onSelect={onSelect}
                            onComplete={complete}
                            style={{
                              position: "absolute",
                              top: ((t.start - bounds.from) / 60) * 64,
                              height: Math.max(30, (t.duration / 60) * 64 - 4),
                              left:
                                "calc(" +
                                (lane.lane / lane.lanes) * 100 +
                                "% + 5px)",
                              right:
                                "calc(" +
                                ((lane.lanes - lane.lane - 1) / lane.lanes) *
                                  100 +
                                "% + 5px)",
                              border: overlap.length
                                ? "1px solid #c78966"
                                : undefined,
                            }}
                          />
                        );
                      })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        <footer className="calendar-footer">
          <div>
            {Object.entries(categories).map(([k, v]) => (
              <span key={k}>
                <i className={k} />
                {v}
              </span>
            ))}
          </div>
          <small>
            <Lock size={12} />
            固定事件锁定 · 拖动弹性任务，15 分钟对齐
          </small>
        </footer>
      </section>
    </>
  );
}
