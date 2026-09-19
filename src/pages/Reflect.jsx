import React from "react";
import { useState } from "react";
import {
  GraduationCap,
  Monitor,
  Dumbbell,
  ArrowUpRight,
  Check,
  Flag,
  Sparkles,
  Flame,
} from "lucide-react";
import { useFlow } from "../store";
import {
  dayKey,
  addDays,
  categories,
  duration,
  goalStats,
  stats,
  streak,
} from "../model";
import { PageHeading, Progress, SectionTitle } from "../components";

export function Goals({ onSelect, navigate }) {
  const { data } = useFlow();
  const [selected, setSelected] = useState(data.projects[0].id);
  const p = data.projects.find((p) => p.id === selected),
    g = goalStats(data, p.id);
  const linked = data.tasks.filter(
    (t) => t.projectId === selected && (!t.date || t.date <= dayKey()),
  );
  return (
    <>
      <PageHeading
        title="把日常，走成远方。"
        subtitle="目标不必遥远。让今天的小事，连接你在意的方向。"
      />
      <div className="goal-cards">
        {data.projects.map((p, i) => {
          const g = goalStats(data, p.id),
            Icon = [GraduationCap, Monitor, Dumbbell][i];
          return (
            <button
              key={p.id}
              className={`panel goal-card ${p.category} ${selected === p.id ? "selected" : ""}`}
              onClick={() => setSelected(p.id)}
            >
              <div className="goal-card-head">
                <span>
                  <Icon size={25} />
                </span>
                <ArrowUpRight size={19} />
              </div>
              <h2>{p.title}</h2>
              <p>{p.goal}</p>
              <div className="goal-percent">
                <strong>
                  {g.rate}
                  <small>%</small>
                </strong>
                <span>
                  {g.done} / {g.total} 项已完成
                </span>
              </div>
              <Progress value={g.rate} />
              <div className="weekly-target">
                <span>本周投入</span>
                <strong>
                  {duration(g.weekly)} <small>/ {duration(p.weekly)}</small>
                </strong>
              </div>
            </button>
          );
        })}
      </div>
      <div className="two-columns goal-bottom">
        <section className="panel">
          <SectionTitle>{p.title} · 里程碑</SectionTitle>
          <p className="muted">按关联任务完成比例，自动跟踪阶段进展。</p>
          <div className="milestones">
            {p.milestones.map((m, i) => (
              <div key={m}>
                <span
                  className={g.rate >= ((i + 1) / 3) * 100 ? "achieved" : ""}
                >
                  {g.rate >= ((i + 1) / 3) * 100 ? <Check size={18} /> : i + 1}
                </span>
                <div>
                  <strong>{m}</strong>
                  <small>
                    {g.rate >= ((i + 1) / 3) * 100
                      ? "已达成"
                      : `完成 ${Math.round(((i + 1) / 3) * 100)}% 的项目任务后达成`}
                  </small>
                </div>
              </div>
            ))}
          </div>
          <div className="soft-note">
            <Flag size={18} />
            下一步：
            {linked.find((t) => !t.done)?.title ||
              "已完成当前任务，给自己一点鼓励。"}
          </div>
        </section>
        <section className="panel">
          <SectionTitle
            action={
              <button className="text-button" onClick={() => navigate("tasks")}>
                管理任务 <ArrowUpRight size={14} />
              </button>
            }
          >
            关联项目 · {p.title}
          </SectionTitle>
          <div className="linked-tasks">
            {linked
              .slice()
              .sort((a, b) => Number(a.done) - Number(b.done))
              .slice(0, 6)
              .map((t) => (
                <button key={t.id} onClick={() => onSelect(t.id)}>
                  <span className={`check ${t.done ? "checked" : ""}`}>
                    {t.done && <Check size={12} />}
                  </span>
                  <span>
                    {t.title}
                    <small>
                      {t.date || "待安排"} · {duration(t.duration)}
                    </small>
                  </span>
                  <ArrowUpRight size={15} />
                </button>
              ))}
          </div>
          <p className="muted">完成任务后，目标进度会自动更新。</p>
        </section>
      </div>
    </>
  );
}

export function Review() {
  const { data, setData, toast } = useFlow();
  const [date, setDate] = useState(dayKey());
  const s = stats(data, date);
  const review = data.reviews[date] || {
    mood: 0,
    obstacle: "",
    reflection: "",
  };
  const patch = (p) =>
    setData((d) => ({
      ...d,
      reviews: {
        ...d.reviews,
        [date]: { ...review, ...p, updatedAt: new Date().toISOString() },
      },
    }));
  const suggestion =
    review.obstacle === "计划过多"
      ? "明天少安排一个弹性任务，给自己留出 30 分钟空白。"
      : review.obstacle === "疲劳"
        ? "把高精力任务放到上午，晚间留给轻量整理和休息。"
        : review.obstacle === "临时事情"
          ? "在下午留出 30 分钟缓冲，用来接住临时变化。"
          : s.rate < 70
            ? "先完成最重要的一件事，再决定是否增加安排。"
            : "保持今天的节奏，给下一个小目标留一点时间。";
  return (
    <>
      <PageHeading
        title="停下来，看见今天。"
        subtitle="不用给自己打分。记录一点感受，就已经很好。"
        action={
          <input
            aria-label="复盘日期"
            type="date"
            value={date}
            max={dayKey()}
            onChange={(e) => setDate(e.target.value)}
          />
        }
      />
      <div className="metric-grid">
        {[
          ["计划时长", duration(s.planned), "每个计划，都是一份期待"],
          ["实际完成", duration(s.actual), "完成任务记录的实际用时"],
          [
            "任务完成率",
            s.rate + "%",
            `${s.done.length} / ${s.tasks.length} 项任务`,
          ],
          ["专注时长", duration(s.focus), "专注计时与演示记录"],
        ].map(([l, v, h]) => (
          <div className="panel metric" key={l}>
            <span>{l}</span>
            <strong>{v}</strong>
            <small>{h}</small>
          </div>
        ))}
      </div>
      <div className="two-columns">
        <section className="panel reflection-form">
          <SectionTitle>今天，感觉怎么样？</SectionTitle>
          <div className="moods">
            {["疲惫", "低落", "平静", "不错", "很棒"].map((l, i) => (
              <button
                key={l}
                className={review.mood === i + 1 ? "active" : ""}
                onClick={() => patch({ mood: i + 1 })}
              >
                <span>{["😣", "🙁", "😐", "🙂", "😄"][i]}</span>
                {l}
              </button>
            ))}
          </div>
          <h3>今天最大的阻碍</h3>
          <div className="obstacles">
            {["手机干扰", "疲劳", "临时事情", "计划过多", "没有明显阻碍"].map(
              (l) => (
                <button
                  key={l}
                  className={review.obstacle === l ? "active" : ""}
                  onClick={() => patch({ obstacle: l })}
                >
                  {l}
                </button>
              ),
            )}
          </div>
          <label>
            留一句话给今天
            <textarea
              aria-label="反思文本"
              rows="5"
              placeholder="有什么让你开心？有什么可以做得轻松一点？"
              value={review.reflection}
              onChange={(e) => patch({ reflection: e.target.value })}
            />
          </label>
          <div className="modal-footer">
            <small className="muted">修改会自动保存</small>
            <button
              className="button primary"
              onClick={() => {
                patch({ reviewed: true });
                toast("复盘已保存，今天也辛苦了。");
              }}
            >
              {review.reviewed ? "已完成复盘" : "完成复盘"}
            </button>
          </div>
        </section>
        <div className="stack">
          <section className="panel">
            <SectionTitle>时间去了哪里</SectionTitle>
            {Object.entries(categories).map(([k, v]) => {
              const all = s.tasks.filter((t) => t.category === k),
                done = all.filter((t) => t.done);
              return (
                <div className="category-stat" key={k}>
                  <div>
                    <span>
                      <i className={`category-dot ${k}`} />
                      {v}
                    </span>
                    <span>
                      {duration(done.reduce((n, t) => n + t.actual, 0))}
                      <small>
                        {" "}
                        / {duration(all.reduce((n, t) => n + t.duration, 0))}
                      </small>
                    </span>
                  </div>
                  <Progress
                    value={all.length ? (done.length / all.length) * 100 : 0}
                  />
                </div>
              );
            })}
          </section>
          <section className="planner-card">
            <h3>
              <Sparkles size={20} />
              给明天的小建议
            </h3>
            <p>{suggestion}</p>
            <small>根据当天任务与复盘生成</small>
          </section>
        </div>
      </div>
    </>
  );
}

function Trend({ values, color = "#627c77", suffix = "", labels }) {
  const max = Math.max(...values, 1);
  return (
    <div className="trend">
      <div className="chart-scale">
        <span>
          {Math.ceil(max)}
          {suffix}
        </span>
        <span>
          {Math.round(max / 2)}
          {suffix}
        </span>
        <span>0</span>
      </div>
      <div className="chart-drawing">
        <svg
          viewBox="0 0 560 155"
          role="img"
          aria-label={values
            .map((v, i) => `${labels[i]} ${v}${suffix}`)
            .join("，")}
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient
              id={`gradient-${color.slice(1)}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0" stopColor={color} stopOpacity=".16" />
              <stop offset="1" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          {[15, 75, 135].map((y) => (
            <line
              key={y}
              x1="0"
              y1={y}
              x2="560"
              y2={y}
              stroke="#eaece8"
              strokeDasharray="3 5"
            />
          ))}
          <path
            d={`M 0 145 ${values.map((v, i) => `L ${(i / (values.length - 1)) * 560} ${135 - (v / max) * 110}`).join(" ")} L 560 145 Z`}
            fill={`url(#gradient-${color.slice(1)})`}
          />
          <polyline
            points={values
              .map(
                (v, i) =>
                  `${(i / (values.length - 1)) * 560},${135 - (v / max) * 110}`,
              )
              .join(" ")}
            fill="none"
            stroke={color}
            strokeWidth="2.5"
          />
          {values.map((v, i) => (
            <circle
              key={i}
              cx={(i / (values.length - 1)) * 560}
              cy={135 - (v / max) * 110}
              r="3.5"
              fill="white"
              stroke={color}
              strokeWidth="2"
            >
              <title>
                {labels[i]}：{v}
                {suffix}
              </title>
            </circle>
          ))}
        </svg>
        <div className="chart-labels">
          {labels.map((l, i) =>
            labels.length <= 7 || i % 2 === 0 || i === labels.length - 1 ? (
              <span key={i}>{l}</span>
            ) : null,
          )}
        </div>
      </div>
    </div>
  );
}
export function Insights() {
  const { data } = useFlow();
  const [range, setRange] = useState(7);
  const dates = Array.from({ length: range }, (_, i) =>
      addDays(dayKey(), i - range + 1),
    ),
    daily = dates.map((d) => stats(data, d));
  const totalFocus = daily.reduce((a, s) => a + s.focus, 0),
    allTasks = daily.flatMap((s) => s.tasks),
    rate = allTasks.length
      ? Math.round(
          (allTasks.filter((t) => t.done).length / allTasks.length) * 100,
        )
      : 0;
  const dist = Object.entries(categories).map(([k, v]) => ({
      key: k,
      title: v,
      value: allTasks
        .filter((t) => t.category === k && t.done)
        .reduce((n, t) => n + t.actual, 0),
    })),
    total = dist.reduce((s, x) => s + x.value, 0);
  let cursor = 0;
  const colors = {
    course: "#a4b5c6",
    study: "#b4a8c7",
    design: "#9e98b4",
    health: "#9fb9ab",
    personal: "#d7bc97",
  };
  const gradient = dist
    .map((x) => {
      const start = cursor;
      cursor += total ? (x.value / total) * 100 : 0;
      return `${colors[x.key]} ${start}% ${cursor}%`;
    })
    .join(",");
  const peak = daily.reduce(
    (best, x, i) => (x.focus > daily[best].focus ? i : best),
    0,
  );
  return (
    <>
      <PageHeading
        title="在日常里，发现自己的节奏。"
        subtitle="让数据帮你理解自己，而不是催促自己。"
        action={
          <div className="segmented">
            {[7, 14].map((n) => (
              <button
                key={n}
                className={range === n ? "active" : ""}
                onClick={() => setRange(n)}
              >
                近 {n} 天
              </button>
            ))}
          </div>
        }
      />
      <div className="metric-grid">
        <div className="panel metric">
          <span>累计专注</span>
          <strong>{duration(totalFocus)}</strong>
          <small>近 {range} 天的专注记录</small>
        </div>
        <div className="panel metric">
          <span>任务完成率</span>
          <strong>{rate}%</strong>
          <small>
            {allTasks.filter((t) => t.done).length} 项小事，认真完成
          </small>
        </div>
        <div className="panel metric">
          <span>运动连续天数</span>
          <strong>
            {streak(data, "health")} <small>天</small>
          </strong>
          <small>按每日已完成的运动任务统计</small>
        </div>
        <div className="panel metric">
          <span>平均精力</span>
          <strong>
            {(
              dates.reduce((n, d) => n + (data.energy[d] || 0), 0) /
              Math.max(1, dates.filter((d) => data.energy[d]).length)
            ).toFixed(1)}{" "}
            <small>/ 5</small>
          </strong>
          <small>只计算已记录的日期</small>
        </div>
      </div>
      <div className="two-columns charts">
        <section className="panel">
          <SectionTitle>
            专注时长趋势 <small>分钟</small>
          </SectionTitle>
          <Trend
            values={daily.map((s) => s.focus)}
            labels={dates.map((d) => d.slice(5))}
          />
        </section>
        <section className="panel">
          <SectionTitle>任务完成率趋势</SectionTitle>
          <Trend
            color="#9b8daf"
            values={daily.map((s) => s.rate)}
            suffix="%"
            labels={dates.map((d) => d.slice(5))}
          />
        </section>
      </div>
      <div className="two-columns">
        <section className="panel">
          <SectionTitle>精力热力图</SectionTitle>
          <p className="muted">过去 28 天，听听身体的声音。</p>
          <div className="heatmap">
            {Array.from({ length: 28 }, (_, i) =>
              addDays(dayKey(), i - 27),
            ).map((d) => (
              <div
                key={d}
                title={`${d}：${data.energy[d] || "未记录"}`}
                style={{
                  background: data.energy[d]
                    ? `rgba(83,120,103,${data.energy[d] / 6})`
                    : "#f0f1ed",
                }}
              >
                <small>{Number(d.slice(-2))}</small>
              </div>
            ))}
          </div>
          <div className="heatmap-legend">
            <span>未记录</span>
            {[0, 1, 2, 3, 4, 5].map((n) => (
              <i
                key={n}
                style={{
                  background: n ? `rgba(83,120,103,${n / 6})` : "#f0f1ed",
                }}
              />
            ))}
            <span>精力充沛</span>
          </div>
          <div className="habit-row">
            <Flame size={19} />
            <span>学习连续 {streak(data, "study")} 天</span>
            <span>运动连续 {streak(data, "health")} 天</span>
          </div>
        </section>
        <section className="panel">
          <SectionTitle>时间分类分布</SectionTitle>
          <div className="distribution">
            <div
              className="donut distribution-donut"
              style={{
                background: total ? `conic-gradient(${gradient})` : "#eee",
              }}
            >
              <strong>
                {duration(total)}
                <small>实际完成</small>
              </strong>
            </div>
            <div>
              {dist.map((x) => (
                <div className="distribution-label" key={x.key}>
                  <span>
                    <i style={{ background: colors[x.key] }} />
                    {x.title}
                  </span>
                  <strong>
                    {total ? Math.round((x.value / total) * 100) : 0}%
                  </strong>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
      <section className="insight-note">
        <Sparkles size={22} />
        <div>
          <h3>关于你的节奏，我们发现…</h3>
          <p>
            这 {range} 天里，你完成了 {rate}% 的计划。
            {totalFocus
              ? `${dates[peak].slice(5)} 是最专注的一天，投入了 ${duration(daily[peak].focus)}。`
              : "还没有专注记录，可以从一次短暂的专注开始。"}
            {rate < 75
              ? "下一周可以减少一点计划量，把空白也留进日程。"
              : "继续保持这个节奏，也记得给自己一点休息。"}
          </p>
          <small>根据本地记录自动生成 · 当前包含演示数据</small>
        </div>
      </section>
    </>
  );
}
