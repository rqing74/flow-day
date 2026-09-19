import React, { useState } from "react";
import { Modal } from "./components";
import { categories, uid, validProject } from "./model";
import { useFlow } from "./store";

export default function GoalEditor({ project, onClose, onSaved }) {
  const { setData, toast } = useFlow();
  const [draft, setDraft] = useState(() => project || {
    id: uid(), title: "", goal: "", category: "study", weekly: 180, milestones: [],
  });
  const [milestones, setMilestones] = useState(draft.milestones.join("\n"));
  const [error, setError] = useState("");
  const patch = (fields) => setDraft((p) => ({ ...p, ...fields }));
  function save(e) {
    e.preventDefault();
    const next = { ...draft, title: draft.title.trim(), goal: draft.goal.trim(),
      milestones: milestones.split("\n").map((s) => s.trim()).filter(Boolean) };
    if (!validProject(next)) {
      setError("请填写名称、1–10080 分钟的每周投入，以及 1–12 个里程碑。");
      return;
    }
    setData((s) => ({ ...s, projects: s.projects.some((p) => p.id === next.id)
      ? s.projects.map((p) => p.id === next.id ? next : p) : [...s.projects, next] }));
    toast(project ? "目标已更新，可在顶部撤销" : "目标已创建，可以去任务页关联任务");
    onSaved(next.id);
  }
  return <Modal title={project ? "编辑目标" : "创建目标"} subtitle="把在意的方向，拆成可完成的小步。" onClose={onClose}>
    <form className="task-editor" onSubmit={save}>
      <label>目标名称<input required maxLength={100} value={draft.title} onChange={(e) => patch({ title: e.target.value })} placeholder="例如：完成产品设计作品集" /></label>
      <label>目标描述<textarea rows={2} value={draft.goal} onChange={(e) => patch({ goal: e.target.value })} placeholder="你希望达到什么状态？" /></label>
      <div className="form-grid">
        <label>目标分类<select value={draft.category} onChange={(e) => patch({ category: e.target.value })}>
          {Object.entries(categories).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select></label>
        <label>每周投入（分钟）<input type="number" min={1} max={10080} step={1} required value={draft.weekly} onChange={(e) => patch({ weekly: Number(e.target.value) })} /></label>
      </div>
      <label>里程碑（每行一个）<textarea required rows={4} value={milestones} onChange={(e) => setMilestones(e.target.value)} placeholder={'明确方向\n完成初稿\n整理与发布'} /></label>
      <p className="muted">保存后可在任务详情或批量管理中关联目标。里程碑按关联任务的完成比例等分计算。</p>
      {error && <p role="alert" className="error">{error}</p>}
      <footer className="modal-footer"><button type="button" className="button" onClick={onClose}>取消</button><button type="submit" className="button primary">保存目标</button></footer>
    </form>
  </Modal>;
}
