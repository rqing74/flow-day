import React from "react";
import { useEffect, useState } from "react";
import {
  Home,
  CalendarDays,
  CheckSquare,
  Target,
  BookOpen,
  ChartNoAxesColumn,
  Plus,
  Sparkles,
  ChevronRight,
  Menu,
  Pause,
  Undo2,
  Redo2,
  Database,
} from "lucide-react";
import { useFlow } from "./store";
import { conflicts, validTask, expandRecurring } from "./model";
import { Modal, IconButton } from "./components";
import {
  QuickAdd,
  TaskEditor,
  ConflictDialog,
  Planner,
  Available,
} from "./dialogs";
import Today from "./pages/Today";
import Calendar from "./pages/Calendar";
import Tasks from "./pages/Tasks";
import { Goals, Review, Insights } from "./pages/Reflect";
import DataManager from "./DataManager";
const nav = [
  ["today", "今天", Home],
  ["calendar", "日历", CalendarDays],
  ["tasks", "任务", CheckSquare],
  ["goals", "目标", Target],
  ["review", "复盘", BookOpen],
  ["insights", "洞察", ChartNoAxesColumn],
];
export default function App() {
  const { data, setData, toast, stopFocus, undo, redo, canUndo, canRedo, revision } = useFlow();
  const [page, setPage] = useState(() => location.hash.slice(2) || "today"),
    [mobile, setMobile] = useState(false),
    [modal, setModal] = useState(null),
    [selected, setSelected] = useState(null),
    [conflict, setConflict] = useState(null),
    [tick, setTick] = useState(Date.now());
  const navigate = (k) => {
    location.hash = "/" + k;
    setPage(k);
    setMobile(false);
  };
  useEffect(() => {
    const handler = () => setPage(location.hash.slice(2) || "today");
    window.addEventListener("hashchange", handler);
    const key = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setModal("quick");
      }
    };
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("hashchange", handler);
      window.removeEventListener("keydown", key);
    };
  }, []);
  useEffect(() => {
    if (!data.focusSession) return;
    const id = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, [data.focusSession]);
  const onSelect = (id) => {
    setSelected(id);
    setModal("detail");
  };
  const commit = (candidate, changes = []) => {
    setData((s) => {
      let tasks = s.tasks.map(
        (t) => changes.find((c) => c.after.id === t.id)?.after || t,
      );
      tasks = tasks.some((t) => t.id === candidate.id)
        ? tasks.map((t) => (t.id === candidate.id ? candidate : t))
        : [...tasks, candidate];
      return expandRecurring({ ...s, tasks });
    });
    setConflict(null);
    setModal(null);
    toast("已保存到你的计划");
  };
  const save = (t) => {
    if (!validTask(t)) {
      toast("请检查任务名称、时长和时间");
      return;
    }
    if (conflicts(t, data.tasks).length) {
      setConflict(t);
      return;
    }
    commit(t);
  };
  const common = {
    onSelect,
    onSave: save,
    onQuick: () => setModal("quick"),
    navigate,
  };
  const activeTask = data.tasks.find((t) => t.id === selected);
  const elapsed = data.focusSession
    ? Math.max(0, Math.floor((tick - data.focusSession.startedAt) / 1000))
    : 0;
  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobile ? "open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">
            <i />
            <i />
            <i />
            <i />
          </div>
          <span>FlowDay</span>
        </div>
        <p className="brand-caption">更好的自己，从今天开始</p>
        <nav aria-label="主导航">
          {nav.map(([key, label, Icon]) => (
            <button
              key={key}
              aria-label={label}
              title={label}
              onClick={() => navigate(key)}
              className={page === key ? "active" : ""}
              aria-current={page === key ? "page" : undefined}
            >
              <Icon size={20} strokeWidth={1.7} />
              <span>{label}</span>
              {page === key && <i />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button className="ask-flow" onClick={() => setModal("planner")}>
            <Sparkles size={17} />
            <span>Ask Flow</span>
            <kbd>⌘ K</kbd>
          </button>
          <div className="profile">
            <div className="avatar">Q</div>
            <div>
              <strong>我的空间</strong>
              <small>专注生活，持续成长</small>
            </div>
            <span className="profile-dot" />
          </div>
        </div>
      </aside>
      {mobile && (
        <button
          aria-label="关闭导航"
          className="nav-scrim"
          onClick={() => setMobile(false)}
        />
      )}
      <div className="main-shell">
        <header className="topbar">
          <div>
            <IconButton label="打开导航" onClick={() => setMobile(!mobile)}>
              <Menu size={20} />
            </IconButton>
            <span>{nav.find((n) => n[0] === page)?.[1] || "今天"}</span>
            <ChevronRight size={14} />
            <small>你的每一天，都有可能</small>
          </div>
          <div className="workspace-actions">
            <IconButton label="撤销上一步" disabled={!canUndo} onClick={undo}><Undo2 size={17} /></IconButton>
            <IconButton label="重做上一步" disabled={!canRedo} onClick={redo}><Redo2 size={17} /></IconButton>
            <IconButton label="数据与备份" onClick={() => setModal("data")}><Database size={17} /></IconButton>
          <button className="button primary" onClick={() => setModal("quick")}>
            <Plus size={17} />
            快速添加
          </button>
          </div>
        </header>
        <main key={revision}>
          {page === "calendar" ? (
            <Calendar {...common} />
          ) : page === "tasks" ? (
            <Tasks {...common} />
          ) : page === "goals" ? (
            <Goals {...common} />
          ) : page === "review" ? (
            <Review />
          ) : page === "insights" ? (
            <Insights />
          ) : (
            <Today
              {...common}
              onPlanner={() => setModal("planner")}
              onAvailable={() => setModal("available")}
            />
          )}
        </main>
      </div>
      {data.focusSession && (
        <div className="focus-bar">
          <span className="focus-pulse" />
          <div>
            <strong>
              {data.tasks.find((t) => t.id === data.focusSession.taskId)
                ?.title || "自由专注"}
            </strong>
            <small>
              正在专注 · {String(Math.floor(elapsed / 60)).padStart(2, "0")}:
              {String(elapsed % 60).padStart(2, "0")}
            </small>
          </div>
          <button
            className="button"
            onClick={() => {
              stopFocus();
              toast("专注已结束，完整分钟已计入统计");
            }}
          >
            <Pause size={15} />
            结束
          </button>
        </div>
      )}
      {modal === "quick" && !conflict && (
        <QuickAdd onClose={() => setModal(null)} onSave={save} />
      )}
      {modal === "detail" && activeTask && !conflict && (
        <Modal title="任务详情" onClose={() => setModal(null)}>
          <TaskEditor
            task={activeTask}
            onSave={save}
            onClose={() => setModal(null)}
          />
        </Modal>
      )}
      {modal === "planner" && <Planner onClose={() => setModal(null)} />}
      {modal === "available" && <Available onClose={() => setModal(null)} />}
      {modal === "data" && <DataManager onClose={() => setModal(null)} />}
      {conflict && (
        <ConflictDialog
          candidate={conflict}
          onClose={() => setConflict(null)}
          onAccept={commit}
        />
      )}
    </div>
  );
}
