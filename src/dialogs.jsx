import React from "react";
import { useState, useEffect } from "react";
import {
  Sparkles,
  Clock,
  ArrowRight,
  Plus,
  Trash2,
  Play,
  Lock,
  AlertTriangle,
} from "lucide-react";
import { useFlow } from "./store";
import { Modal, IconButton, Empty } from "./components";
import {
  categories,
  parseQuick,
  dayKey,
  time,
  minutes,
  duration,
  validTask,
  conflicts,
  findSlot,
  replan,
  recommend,
  uid,
} from "./model";

export function TaskEditor({ task, onSave, onClose }) {
  const { data, complete, startFocus } = useFlow();
  const [draft, setDraft] = useState({ ...task }),
    [checkText, setCheckText] = useState(""),
    [error, setError] = useState(""),
    [tagsText, setTagsText] = useState(task.tags.join(", "));
  useEffect(() => {
    setDraft({ ...task });
    setTagsText(task.tags.join(", "));
    setError("");
  }, [task]);
  const patch = (p) => setDraft((s) => ({ ...s, ...p }));
  return (
    <form
      className="task-editor"
      onSubmit={(e) => {
        e.preventDefault();
        if (!validTask(draft)) {
          setError("请填写任务名称、5–900 分钟时长，并确保任务在当天结束。");
          return;
        }
        onSave({
          ...draft,
          tags: tagsText
            .split(/[,，]/)
            .map((s) => s.trim())
            .filter(Boolean),
        });
      }}
    >
      <div className="editor-state">
        <span className={`category-label ${draft.category}`}>
          {categories[draft.category]}
        </span>
        <span>{task.done ? "已完成" : task.date ? "已计划" : "待处理"}</span>
      </div>
      <label>
        任务名称
        <input
          required
          value={draft.title}
          onChange={(e) => patch({ title: e.target.value })}
        />
      </label>
      <div className="form-grid">
        <label>
          优先级
          <select
            value={draft.priority}
            onChange={(e) => patch({ priority: +e.target.value })}
          >
            <option value="3">高优先级</option>
            <option value="2">中优先级</option>
            <option value="1">低优先级</option>
          </select>
        </label>
        <label>
          预计时长（分钟）
          <input
            type="number"
            min="5"
            max="900"
            step="5"
            value={draft.duration}
            onChange={(e) => patch({ duration: +e.target.value })}
          />
        </label>
        <label>
          分类
          <select
            value={draft.category}
            onChange={(e) => patch({ category: e.target.value })}
          >
            {Object.entries(categories).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label>
          任务类型
          <select
            value={draft.kind}
            onChange={(e) => patch({ kind: e.target.value })}
          >
            <option value="flex">弹性 · 可以重排</option>
            <option value="fixed">固定 · 不自动移动</option>
          </select>
        </label>
        <label>
          截止日期
          <input
            type="date"
            value={draft.deadline}
            onChange={(e) => patch({ deadline: e.target.value })}
          />
        </label>
        <label>
          需要精力
          <select
            value={draft.energy}
            onChange={(e) => patch({ energy: +e.target.value })}
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n} / 5 {n <= 2 ? "轻松" : "投入"}
              </option>
            ))}
          </select>
        </label>
        <label>
          安排日期
          <input
            type="date"
            value={draft.date || ""}
            onChange={(e) =>
              patch({ date: e.target.value || null, start: draft.start ?? 540 })
            }
          />
        </label>
        <label>
          开始时间
          <input
            type="time"
            value={time(draft.start ?? 540)}
            onChange={(e) => patch({ start: minutes(e.target.value) })}
          />
        </label>
      </div>
      <label>
        关联项目
        <select
          value={draft.projectId}
          onChange={(e) => patch({ projectId: e.target.value })}
        >
          <option value="">未关联</option>
          {data.projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
      </label>
      <label>
        标签（用逗号分隔）
        <input
          value={tagsText}
          onChange={(e) => setTagsText(e.target.value)}
          placeholder="例如：CET-6，个人项目"
        />
      </label>
      <label>
        备注
        <textarea
          rows="3"
          value={draft.notes}
          onChange={(e) => patch({ notes: e.target.value })}
          placeholder="记录一点细节…"
        />
      </label>
      <div className="checklist">
        <span className="field-label">
          清单 · {draft.checklist.filter((c) => c.done).length}/
          {draft.checklist.length}
        </span>
        {draft.checklist.map((c) => (
          <div key={c.id}>
            <label>
              <input
                type="checkbox"
                checked={c.done}
                onChange={() =>
                  patch({
                    checklist: draft.checklist.map((x) =>
                      x.id === c.id ? { ...x, done: !x.done } : x,
                    ),
                  })
                }
              />
              <span>{c.text}</span>
            </label>
            <IconButton
              label={`移除 ${c.text}`}
              onClick={() =>
                patch({
                  checklist: draft.checklist.filter((x) => x.id !== c.id),
                })
              }
            >
              <Trash2 size={14} />
            </IconButton>
          </div>
        ))}
        <div>
          <input
            aria-label="新清单项"
            value={checkText}
            onChange={(e) => setCheckText(e.target.value)}
            placeholder="添加一个小步骤"
          />
          <IconButton
            label="添加清单项"
            onClick={() => {
              if (checkText.trim()) {
                patch({
                  checklist: [
                    ...draft.checklist,
                    { id: uid(), text: checkText.trim(), done: false },
                  ],
                });
                setCheckText("");
              }
            }}
          >
            <Plus size={16} />
          </IconButton>
        </div>
      </div>
      {draft.repeat === "daily" && (
        <p className="muted">每天重复 · 此处修改仅作用于这一次任务。</p>
      )}
      {task.done && (
        <label>
          实际完成时长（分钟）
          <input
            min="0"
            max="1440"
            type="number"
            value={draft.actual}
            onChange={(e) => patch({ actual: Math.max(0, +e.target.value) })}
          />
        </label>
      )}
      {error && <p className="error">{error}</p>}
      <footer className="editor-actions">
        <button className="button primary" type="submit">
          保存任务
        </button>
        {!task.date && (
          <button
            className="button"
            type="button"
            onClick={() => {
              const now = new Date();
              const slot = findSlot(
                draft,
                data.tasks,
                dayKey(),
                now.getHours() * 60 + now.getMinutes(),
              );
              if (slot) {
                patch(slot);
                setError("已找到空闲时间，保存后加入时间轴。");
              } else setError("今天没有完整空档，请选择其他日期。");
            }}
          >
            安排到时间轴
          </button>
        )}
        {task.date && !task.done && (
          <button
            className="button"
            type="button"
            onClick={() => {
              startFocus(task.id);
              onClose?.();
            }}
          >
            <Play size={14} />
            开始专注
          </button>
        )}
        <button
          type="button"
          className="text-button"
          onClick={() => {
            complete(task.id);
            onClose?.();
          }}
        >
          {task.done ? "恢复待办" : "标为完成"}
        </button>
      </footer>
    </form>
  );
}

export function QuickAdd({ onClose, onSave, initial = "" }) {
  const [raw, setRaw] = useState(initial),
    [mode, setMode] = useState("schedule");
  const parsed = parseQuick(raw),
    [override, setOverride] = useState({});
  const t = { ...parsed, ...override };
  return (
    <Modal
      title="把想到的，轻轻放进计划"
      subtitle="用一句话添加任务，FlowDay 帮你整理时间。"
      onClose={onClose}
      wide
    >
      <div className="quick-input">
        <Sparkles size={21} />
        <textarea
          aria-label="自然语言任务"
          autoFocus
          rows="2"
          value={raw}
          onChange={(e) => {
            setRaw(e.target.value);
            setOverride({});
          }}
          placeholder="明天下午做两小时产品设计"
        />
      </div>
      <div className="example-list">
        {[
          "明天下午做两小时产品设计",
          "每天晚上安排两小时健身",
          "今天15:00临时讨论60分钟",
        ].map((s) => (
          <button
            key={s}
            onClick={() => {
              setRaw(s);
              setOverride({});
            }}
          >
            {s}
          </button>
        ))}
      </div>
      <div className="segmented">
        <button
          className={mode === "schedule" ? "active" : ""}
          onClick={() => setMode("schedule")}
        >
          添加到日程
        </button>
        <button
          className={mode === "inbox" ? "active" : ""}
          onClick={() => setMode("inbox")}
        >
          先放进 Inbox
        </button>
      </div>
      {raw.trim() && (
        <div className="parse-preview">
          <div className="section-title">
            <h3>已识别</h3>
            <span className="muted">本地规则解析 · 可修改</span>
          </div>
          <strong>{t.title}</strong>
          <div className="form-grid">
            <label>
              日期
              <input
                type="date"
                value={t.date}
                onChange={(e) =>
                  setOverride({ ...override, date: e.target.value })
                }
              />
            </label>
            <label>
              时间偏好 · {t.preference}
              <input
                type="time"
                value={time(t.start)}
                onChange={(e) =>
                  setOverride({ ...override, start: minutes(e.target.value) })
                }
              />
            </label>
            <label>
              时长（分钟）
              <input
                type="number"
                min="5"
                max="900"
                value={t.duration}
                onChange={(e) =>
                  setOverride({ ...override, duration: +e.target.value })
                }
              />
            </label>
            <label>
              类型
              <select
                value={t.kind}
                onChange={(e) =>
                  setOverride({ ...override, kind: e.target.value })
                }
              >
                <option value="flex">弹性任务</option>
                <option value="fixed">固定事件</option>
              </select>
            </label>
          </div>
          <div className="parse-chips">
            <span>{categories[t.category]}</span>
            <span>
              {t.repeat === "daily" ? "每天重复 · 预排未来 30 天" : "不重复"}
            </span>
            <span>中优先级</span>
          </div>
        </div>
      )}
      <footer className="modal-footer">
        <span>⌘ / Ctrl K 随时打开</span>
        <button
          className="button primary"
          disabled={!raw.trim() || !validTask(t)}
          onClick={() =>
            onSave({
              ...t,
              ...(mode === "inbox"
                ? { date: null, start: null, repeat: "none" }
                : {}),
              seriesId:
                t.repeat === "daily" && mode === "schedule" ? uid() : undefined,
            })
          }
        >
          <Plus size={16} />
          添加{mode === "inbox" ? "到 Inbox" : "到计划"}
        </button>
      </footer>
    </Modal>
  );
}

export function ConflictDialog({ candidate, onClose, onAccept }) {
  const { data } = useFlow();
  const overlaps = conflicts(candidate, data.tasks);
  const slot = findSlot(
    candidate,
    data.tasks,
    candidate.date,
    candidate.start + 15,
  );
  const planned = replan(
    [...data.tasks.filter((t) => t.id !== candidate.id), candidate],
    candidate.date,
    480,
  );
  const fixedOverlap = overlaps.some((t) => t.kind === "fixed" || t.done);
  return (
    <Modal
      title="这段时间有一点拥挤"
      subtitle="先确认调整，再让计划继续流动。"
      onClose={onClose}
    >
      <div className="conflict-banner">
        <AlertTriangle size={20} />
        <div>
          <strong>{candidate.title}</strong>
          <p>
            {candidate.date} · {time(candidate.start)}–
            {time(candidate.start + candidate.duration)}
          </p>
        </div>
      </div>
      <h4>与以下任务重叠</h4>
      {overlaps.map((t) => (
        <div className="suggestion-row" key={t.id}>
          <span>
            {t.title}
            <small>
              {t.kind === "fixed" ? "固定事件" : "弹性任务"} · {time(t.start)}–
              {time(t.start + t.duration)}
            </small>
          </span>
          <Lock size={15} />
        </div>
      ))}
      {candidate.kind === "flex" && slot && (
        <button
          className="suggestion-option"
          onClick={() => onAccept({ ...candidate, ...slot }, [])}
        >
          <Clock size={18} />
          <span>
            把新任务安排在空闲时间
            <small>
              {time(slot.start)} – {time(slot.start + candidate.duration)}
            </small>
          </span>
          <ArrowRight size={18} />
        </button>
      )}
      {candidate.kind === "fixed" &&
        !fixedOverlap &&
        !planned.unplaced.length &&
        planned.changes.length > 0 && (
          <>
            <h4>建议保留固定事件，调整弹性任务</h4>
            {planned.changes.map((c) => (
              <div className="suggestion-row" key={c.after.id}>
                <span>
                  {c.after.title}
                  <small>
                    {c.before.date} {time(c.before.start)} → {c.after.date}{" "}
                    {time(c.after.start)}
                  </small>
                </span>
              </div>
            ))}
            <button
              className="button primary full"
              onClick={() => onAccept(candidate, planned.changes)}
            >
              接受调整并保存
            </button>
          </>
        )}
      {(fixedOverlap || planned.unplaced.length > 0) && (
        <p className="muted">
          固定或已完成事件不会自动移动；找不到空档的任务需要手动调整。
        </p>
      )}
      <button
        className="text-button"
        onClick={() =>
          onAccept(
            { ...candidate, date: null, start: null, repeat: "none" },
            [],
          )
        }
      >
        暂存 Inbox，稍后安排
      </button>
    </Modal>
  );
}

export function Planner({ onClose }) {
  const { data, applyChanges, toast } = useFlow();
  const [date, setDate] = useState(dayKey());
  const now = new Date();
  const earliest =
    date === dayKey()
      ? Math.ceil((now.getHours() * 60 + now.getMinutes()) / 15) * 15
      : 480;
  const proposal = replan(data.tasks, date, earliest);
  return (
    <Modal
      title="给计划一点弹性"
      subtitle="AI 重新安排 · 本地演示算法，无需联网"
      onClose={onClose}
    >
      <label>
        调整哪一天
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </label>
      <p className="planner-note">
        <Lock size={16} />
        固定事件与已完成任务保持原位。按优先级、截止日期寻找未来 7
        天的完整空档。
      </p>
      {proposal.changes.length ? (
        proposal.changes.map((c) => (
          <div className="suggestion-row" key={c.after.id}>
            <span>
              {c.after.title}
              <small>
                {c.before.date} {time(c.before.start)} → {c.after.date}{" "}
                {time(c.after.start)}
              </small>
            </span>
            <ArrowRight size={17} />
          </div>
        ))
      ) : (
        <Empty>目前没有可应用的调整。</Empty>
      )}
      {proposal.unplaced.length > 0 && (
        <p className="error">
          以下任务没有合适空档，保持原安排：
          {proposal.unplaced.map((t) => t.title).join("、")}
          。请调整时长或截止日期。
        </p>
      )}
      <footer className="modal-footer">
        <span>预览不会修改你的日程</span>
        <button
          className="button primary"
          disabled={!proposal.changes.length}
          onClick={() => {
            applyChanges(proposal.changes);
            toast(`已重新安排 ${proposal.changes.length} 项任务`);
            onClose();
          }}
        >
          接受调整
        </button>
      </footer>
    </Modal>
  );
}
export function Available({ onClose }) {
  const { data, startFocus } = useFlow();
  const [length, setLength] = useState(45);
  const energy = data.energy[dayKey()] || 3;
  const list = recommend(data.tasks, length, energy);
  return (
    <Modal
      title="这段空闲，刚好做点喜欢的"
      subtitle={`当前精力 ${energy}/5 · 根据时长、优先级和截止日期推荐`}
      onClose={onClose}
    >
      <label>
        我现在有多少分钟？
        <input
          type="number"
          min="5"
          max="240"
          value={length}
          onChange={(e) => setLength(+e.target.value)}
        />
      </label>
      {list.length ? (
        list.map((t) => (
          <div className="suggestion-row" key={t.id}>
            <span>
              <strong>{t.title}</strong>
              <small>
                {duration(t.duration)} · {["", "低", "中", "高"][t.priority]}
                优先级 · {t.deadline ? `${t.deadline} 截止` : "无截止日期"}
              </small>
            </span>
            <button
              className="button"
              onClick={() => {
                startFocus(t.id);
                onClose();
              }}
            >
              <Play size={14} />
              专注
            </button>
          </div>
        ))
      ) : (
        <Empty>暂无符合精力和时长的任务，可以安心休息。</Empty>
      )}
    </Modal>
  );
}
