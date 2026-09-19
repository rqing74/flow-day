import React, { useState } from "react";
import { useFlow } from "./store";
import { Modal } from "./components";
import { dayKey, time, planBatchMove, deletionTargets, deleteTasks } from "./model";

export default function BatchTasks({ ids, action, onClose, onDone }) {
  const { data, setData, toast } = useFlow();
  const [date, setDate] = useState(dayKey());
  const [scope, setScope] = useState("selected");
  const [projectId, setProjectId] = useState("");
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const chosen = data.tasks.filter((t) => ids.includes(t.id));
  const deleting = action === "delete" ? deletionTargets(data, ids, scope) : [];
  const hasRepeats = chosen.some((t) => t.seriesId);
  const focused = deleting.some((t) => t.id === data.focusSession?.taskId);
  function apply() {
    try {
      let next;
      if (action === "delete") next = deleteTasks(data, ids, scope);
      else if (action === "project") next = { ...data, tasks: data.tasks.map((t) => ids.includes(t.id) ? { ...t, projectId } : t) };
      else {
        if (!preview) return;
        const changes = planBatchMove(data, ids, date);
        const after = new Map(changes.map((c) => [c.after.id, c.after]));
        next = { ...data, tasks: data.tasks.map((t) => after.get(t.id) || t) };
      }
      setData(next);
      toast(action === "delete" ? `已删除 ${deleting.length} 项任务，可在顶部撤销` : "批量修改已保存，可在顶部撤销");
      onDone();
    } catch (e) { setError(e.message); setPreview(null); }
  }
  return <Modal title={{ move: "批量改期", delete: "删除任务", project: "关联目标" }[action]} subtitle={`已选择 ${chosen.length} 项任务`} onClose={onClose}>
    <div className="batch-dialog">
      {action === "move" && <>
        <p className="muted">已计划任务保留原时间；Inbox 任务从 09:00 起寻找空档。固定、已完成或正在专注的任务不能批量改期。重复任务仅修改所选课次。</p>
        <label>目标日期<input type="date" value={date} onChange={(e) => { setDate(e.target.value); setPreview(null); setError(""); }} /></label>
        <button className="button" onClick={() => {
          try { setPreview(planBatchMove(data, ids, date)); setError(""); }
          catch (e) { setError(e.message); setPreview(null); }
        }}>预览改期</button>
        {preview && <ul className="batch-preview">{preview.map(({ before, after }) => <li key={before.id}><strong>{before.title}</strong><span>{before.date ? `${before.date} ${time(before.start)}` : "Inbox"} → {after.date} {time(after.start)}–{time(after.start + after.duration)}</span></li>)}</ul>}
      </>}
      {action === "delete" && <>
        {hasRepeats && <label>重复任务删除范围<select value={scope} onChange={(e) => { setScope(e.target.value); setError(""); }}>
          <option value="selected">仅所选课次</option><option value="following">所选课次及以后，停止后续重复</option>
        </select></label>}
        <p>将删除 {deleting.length} 项任务。{hasRepeats && (scope === "following" ? "同一系列从所选最早课次起停止，包括尚未生成的未来任务。" : "其余重复课次保留，所选课次不会再次生成。")}</p>
        <ul className="batch-preview">{deleting.map((t) => <li key={t.id}><strong>{t.title}</strong><span>{t.date || "Inbox"}{t.occurrenceDate && t.occurrenceDate !== t.date ? ` · 原课次 ${t.occurrenceDate}` : ""}</span></li>)}</ul>
        <p className="muted">删除后可立即撤销；已记录的专注时长会保留。刷新后操作历史会清除，重要数据请先导出备份。</p>
      </>}
      {action === "project" && <>
        <label>关联目标<select value={projectId} onChange={(e) => setProjectId(e.target.value)}><option value="">不关联目标</option>{data.projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</select></label>
        <p className="muted">仅更新所选任务的目标关联。重复任务未来新生成的课次保持原有设置。</p>
      </>}
      {error && <p className="error" role="alert">{error}</p>}
      {focused && <p className="error">待删除范围包含正在专注的任务，请先结束计时。</p>}
      <footer className="modal-footer"><button className="button" onClick={onClose}>取消</button><button className={`button ${action === "delete" ? "danger" : "primary"}`} disabled={!chosen.length || (action === "move" && !preview) || (action === "delete" && deleting.some((t) => t.id === data.focusSession?.taskId))} onClick={apply}>{action === "delete" ? `确认删除 ${deleting.length} 项` : "确认应用"}</button></footer>
    </div>
  </Modal>;
}
