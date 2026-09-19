import React, { useRef, useState } from "react";
import { Download, Upload, RotateCcw } from "lucide-react";
import { Modal } from "./components";
import { useFlow } from "./store";
import { createInitialData, dayKey } from "./model";
import { MAX_BACKUP_BYTES, RECOVERY_KEY, parseBackup, serializeBackup } from "./backup";

function Counts({ data }) {
  return <div className="backup-counts">
    <span><strong>{data.tasks.length}</strong>任务</span>
    <span><strong>{data.projects.length}</strong>目标</span>
    <span><strong>{Object.keys(data.reviews).length}</strong>复盘</span>
    <span><strong>{data.focusLogs.length}</strong>专注记录</span>
  </div>;
}

export default function DataManager({ onClose }) {
  const { data, replaceData, toast } = useFlow();
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [clearText, setClearText] = useState("");
  const request = useRef(0);
  const locked = Boolean(data.focusSession);
  function exportData() {
    const url = URL.createObjectURL(new Blob([serializeBackup(data)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `FlowDay-备份-${dayKey()}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast("已生成备份文件，请妥善保存");
  }
  async function readFile(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const token = ++request.current;
    setPreview(null);
    setError("");
    setBusy(true);
    try {
      if (file.size > MAX_BACKUP_BYTES) throw new Error("备份文件不能超过 5 MB。");
      const next = parseBackup(await file.text());
      if (token === request.current) setPreview({ data: next, name: file.name });
    } catch (e) {
      if (token === request.current) setError(e.message);
    } finally {
      if (token === request.current) setBusy(false);
    }
  }
  function previewRecovery() {
    setError("");
    setPreview(null);
    try {
      const raw = localStorage.getItem(RECOVERY_KEY);
      if (!raw) throw new Error("还没有恢复快照。清空或恢复备份前会自动保存一份。");
      setPreview({ data: parseBackup(raw), name: "上次替换前的本地快照" });
    } catch (e) { setError(e.message); }
  }
  function apply(next, message) {
    try {
      replaceData(next);
      toast(message);
      onClose();
    } catch (e) { setError(e.message); }
  }
  return <Modal title="数据与备份" subtitle="给每次改变，留一条回来的路。" onClose={onClose}>
    <div className="backup-manager">
      <section>
        <h3>当前空间</h3>
        <Counts data={data} />
        <p className="muted">数据保存在当前浏览器。备份包含任务、目标、精力、复盘和专注记录；进行中的计时不会带入备份。</p>
        <button className="button" onClick={exportData}><Download size={16} />导出备份</button>
      </section>
      <section>
        <h3>恢复数据</h3>
        <p className="muted">先预览，再替换。替换前自动保留当前数据，可在此找回。</p>
        {locked && <p className="error">请先结束当前专注，再恢复或清空数据。</p>}
        <label className="backup-file">
          <span><Upload size={16} />选择 FlowDay 备份文件</span>
          <input type="file" accept=".json,application/json" onChange={readFile} disabled={locked || busy} />
        </label>
        <button className="button" disabled={locked || busy} onClick={previewRecovery}><RotateCcw size={16} />找回上次替换前的数据</button>
        {busy && <p role="status">正在检查备份…</p>}
        {preview && <div className="backup-preview">
          <h3>恢复预览</h3><p className="backup-filename">{preview.name}</p>
          <Counts data={preview.data} />
          <p>将替换当前 {data.tasks.length} 项任务及其他记录，不会合并。任务完成状态和重复设置会一同恢复。</p>
          <div className="backup-actions">
            <button className="button" onClick={() => setPreview(null)}>取消预览</button>
            <button className="button primary" disabled={locked} onClick={() => apply(preview.data, "已恢复备份；替换前的数据仍可找回")}>确认恢复并替换</button>
          </div>
        </div>}
      </section>
      <section>
        <h3>回到空白状态</h3>
        <p className="muted">清空所有任务、目标和记录。先自动保存恢复快照，再执行清空。请输入“清空”确认。</p>
        <div className="backup-actions">
          <input aria-label="清空确认" placeholder="输入：清空" value={clearText} onChange={(e) => setClearText(e.target.value)} />
          <button className="button danger" disabled={clearText !== "清空" || locked || busy} onClick={() => apply(createInitialData(), "已回到空白状态，可在数据与备份中找回")}>备份并清空</button>
        </div>
      </section>
      {error && <p className="error" role="alert">{error}</p>}
      <p className="muted">顶部撤销 / 重做保留本次打开期间最近 30 步；刷新或开始、结束专注后会清除操作历史。本地恢复快照只保留最近一次，请另行导出重要备份。</p>
    </div>
  </Modal>;
}
