import React from "react";
import { useEffect, useRef } from "react";
import { X, Check, Lock, ArrowUpRight, ChevronRight } from "lucide-react";
import { categories, time, duration } from "./model";
export function IconButton({ label, children, ...props }) {
  return (
    <button
      type="button"
      className="icon-button"
      aria-label={label}
      title={label}
      {...props}
    >
      {children}
    </button>
  );
}
export function Modal({ title, subtitle, onClose, children, wide = false }) {
  const ref = useRef();
  useEffect(() => {
    const previous = document.activeElement;
    ref.current?.focus();
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const key = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const els = [
          ...ref.current.querySelectorAll(
            'button,input,select,textarea,[tabindex="0"]',
          ),
        ].filter((x) => !x.disabled);
        const first = els[0],
          last = els.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      document.body.style.overflow = old;
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className={`modal ${wide ? "wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={ref}
      >
        <header>
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <IconButton label="关闭" onClick={onClose}>
            <X size={20} />
          </IconButton>
        </header>
        {children}
      </section>
    </div>
  );
}
export function Progress({ value }) {
  return (
    <div
      className="progress"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
    >
      <span style={{ width: `${Math.min(100, value)}%` }} />
    </div>
  );
}
export function Empty({ children = "给这一天留一点空白。", onAdd }) {
  return (
    <div className="empty">
      <span>◌</span>
      <p>{children}</p>
      {onAdd && (
        <button className="button" onClick={onAdd}>
          添加第一项任务 <ArrowUpRight size={15} />
        </button>
      )}
    </div>
  );
}
export function TaskBlock({
  task,
  onSelect,
  onComplete,
  style = {},
  compact = false,
  drag = true,
}) {
  return (
    <div
      title={`${task.title} · ${time(task.start)}–${time(task.start + task.duration)}`}
      className={`task-block ${task.category} ${task.done ? "is-done" : ""} ${compact ? "compact" : ""} ${task.duration <= 45 ? "short" : ""}`}
      style={style}
      draggable={drag && task.kind !== "fixed" && !task.done}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", task.id);
        e.dataTransfer.effectAllowed = "move";
      }}
    >
      <button
        className={`check ${task.done ? "checked" : ""}`}
        aria-label={`${task.done ? "取消完成" : "完成"} ${task.title}`}
        onClick={(e) => {
          e.stopPropagation();
          onComplete(task.id);
        }}
      >
        {task.done && <Check size={13} />}
      </button>
      <button className="task-block-content" onClick={() => onSelect(task.id)}>
        <strong>{task.title}</strong>
        <span>
          {compact
            ? `${time(task.start)} · ${duration(task.duration)}`
            : task.notes || categories[task.category]}
        </span>
      </button>
      {!compact && (
        <div className="block-meta">
          <span className="tag">
            {task.done ? (
              "已完成"
            ) : task.kind === "fixed" ? (
              <>
                <Lock size={10} />
                固定
              </>
            ) : (
              "弹性"
            )}
          </span>
          <span>
            {time(task.start)} – {time(task.start + task.duration)}
          </span>
        </div>
      )}
    </div>
  );
}
export function PageHeading({ title, subtitle, action }) {
  return (
    <div className="page-heading">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {action}
    </div>
  );
}
export function SectionTitle({ children, action }) {
  return (
    <div className="section-title">
      <h3>{children}</h3>
      {action}
    </div>
  );
}
export function LinkButton({ children, onClick }) {
  return (
    <button className="text-button" onClick={onClick}>
      {children}
      <ChevronRight size={15} />
    </button>
  );
}
