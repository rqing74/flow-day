import React from "react";
import { useState } from "react";
import {
  Search,
  Plus,
  Check,
  Inbox,
  CalendarDays,
  CheckCircle2,
  SlidersHorizontal,
} from "lucide-react";
import { useFlow } from "../store";
import { categories, duration, dayKey } from "../model";
import { PageHeading, Empty } from "../components";
import { TaskEditor } from "../dialogs";
import BatchTasks from "../BatchTasks";
export default function Tasks({ onSave, onQuick }) {
  const { data, complete } = useFlow();
  const [tab, setTab] = useState("inbox"),
    [query, setQuery] = useState(""),
    [selected, setSelected] = useState(null),
    [category, setCategory] = useState("all");
  const [batch, setBatch] = useState(false);
  const [checked, setChecked] = useState([]);
  const [action, setAction] = useState(null);
  const groups = {
    inbox: data.tasks.filter((t) => !t.done && !t.date),
    planned: data.tasks.filter((t) => !t.done && t.date),
    done: data.tasks.filter((t) => t.done),
  };
  const list = groups[tab]
    .filter(
      (t) =>
        t.title.toLowerCase().includes(query.toLowerCase()) &&
        (category === "all" || t.category === category),
    )
    .sort(
      (a, b) =>
        b.priority - a.priority || (a.date || "").localeCompare(b.date || ""),
    );
  const active = data.tasks.find((t) => t.id === selected);
  const picked = checked.filter((id) => list.some((t) => t.id === id));
  return (
    <>
      <PageHeading
        title="把想法，变成下一步。"
        subtitle="先收集，再安排。一次只专注一件事。"
        action={
          <button className="button primary" onClick={onQuick}>
            <Plus size={16} />
            新建任务
          </button>
        }
      />
      <div className="tasks-layout">
        <section className="panel task-list-panel">
          <div className="task-tabs">
            {[
              ["inbox", "Inbox / 待处理", Inbox],
              ["planned", "已计划", CalendarDays],
              ["done", "已完成", CheckCircle2],
            ].map(([k, label, Icon]) => (
              <button
                key={k}
                className={tab === k ? "active" : ""}
                onClick={() => { setTab(k); setChecked([]); }}
              >
                <Icon size={16} />
                {label}
                <span>{groups[k].length}</span>
              </button>
            ))}
          </div>
          <div className="task-filters">
            <div className="search-field">
              <Search size={16} />
              <input
                aria-label="搜索任务"
                placeholder="搜索任务…"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setChecked([]); }}
              />
            </div>
            <select
              aria-label="分类筛选"
              value={category}
              onChange={(e) => { setCategory(e.target.value); setChecked([]); }}
            >
              <option value="all">全部分类</option>
              {Object.entries(categories).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div className="batch-toolbar">
            <button className="button small" onClick={() => { setBatch(!batch); setChecked([]); }}>{batch ? "退出多选" : "批量管理"}</button>
            {batch && <>
              <label><input type="checkbox" aria-label="全选当前列表" checked={list.length > 0 && picked.length === list.length} disabled={!list.length} onChange={(e) => setChecked(e.target.checked ? list.map((t) => t.id) : [])} />全选当前列表</label>
              <span>已选 {picked.length} 项</span>
              <button className="button small" disabled={!picked.length} onClick={() => setAction("move")}>批量改期</button>
              <button className="button small" disabled={!picked.length} onClick={() => setAction("project")}>关联目标</button>
              <button className="button small danger" disabled={!picked.length} onClick={() => setAction("delete")}>删除所选</button>
            </>}
          </div>
          <div className="list-label">
            <span>
              {tab === "inbox"
                ? "给想法一个落脚点"
                : tab === "planned"
                  ? "每一个计划，都有自己的时间"
                  : "每一步都算数"}
            </span>
            <span>{list.length} 项任务</span>
          </div>
          {list.length ? (
            list.map((t) => (
              <div
                key={t.id}
                className={`task-row ${t.id === selected ? "selected" : ""}`}
              >
                {batch ? <input type="checkbox" className="batch-check" aria-label={`选择 ${t.title} ${t.date || "Inbox"}`} checked={picked.includes(t.id)} onChange={(e) => setChecked((old) => e.target.checked ? [...old, t.id] : old.filter((id) => id !== t.id))} /> : <button
                  className={`check ${t.done ? "checked" : ""}`}
                  aria-label={`${t.done ? "取消完成" : "完成"} ${t.title}`}
                  onClick={() => complete(t.id)}
                >
                  {t.done && <Check size={13} />}
                </button>}
                <button
                  className="task-row-content"
                  onClick={() => setSelected(t.id)}
                >
                  <strong className={t.done ? "strike" : ""}>{t.title}</strong>
                  <span>
                    <i className={`category-dot ${t.category}`} />
                    {categories[t.category]}
                    <b>·</b>
                    {duration(t.duration)}
                    {t.date && (
                      <>
                        <b>·</b>
                        {t.date === dayKey() ? "今天" : t.date}
                      </>
                    )}
                    {t.deadline && (
                      <small
                        className={
                          t.deadline < dayKey() && !t.done ? "overdue" : ""
                        }
                      >
                        截止 {t.deadline}
                      </small>
                    )}
                  </span>
                </button>
                <span className={`priority p${t.priority}`}>
                  {["", "低", "中", "高"][t.priority]}
                </span>
              </div>
            ))
          ) : (
            <Empty onAdd={onQuick}>这里暂时没有任务。</Empty>
          )}
          <button className="add-task-row" onClick={onQuick}>
            <Plus size={16} />
            添加任务
          </button>
        </section>
        <aside className="panel task-detail-panel">
          <div className="section-title">
            <h3>任务详情</h3>
            <SlidersHorizontal size={16} />
          </div>
          {active ? (
            <TaskEditor
              key={`${active.id}-${active.done}`}
              task={active}
              onSave={onSave}
            />
          ) : (
            <div className="detail-empty">
              <div>
                <CheckCircle2 size={35} />
              </div>
              <h3>每一步，都值得认真对待</h3>
              <p>
                选择一个任务，查看详情、
                <br />
                拆分步骤，或安排到时间轴。
              </p>
            </div>
          )}
        </aside>
      </div>
      {action && <BatchTasks ids={picked} action={action} onClose={() => setAction(null)} onDone={() => { setAction(null); setChecked([]); setBatch(false); setSelected(null); }} />}
    </>
  );
}
