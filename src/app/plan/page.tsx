"use client";

import { useState, useEffect } from "react";
import { db, getStudyPlan, getStreakDays } from "@/lib/db";
import type { StudyPlan, DailyLog } from "@/types";

export default function PlanPage() {
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [streak, setStreak] = useState(0);
  const [weekLogs, setWeekLogs] = useState<DailyLog[]>([]);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // 表单状态
  const [dailyNewWords, setDailyNewWords] = useState(10);
  const [dailyReviewTarget, setDailyReviewTarget] = useState(20);
  const [dailyMinutes, setDailyMinutes] = useState(30);
  const [weeklyDays, setWeeklyDays] = useState(5);

  useEffect(() => {
    async function load() {
      const p = await getStudyPlan();
      setPlan(p);
      setDailyNewWords(p.dailyNewWords);
      setDailyReviewTarget(p.dailyReviewTarget);
      setDailyMinutes(p.dailyMinutes);
      setWeeklyDays(p.weeklyDays);

      const s = await getStreakDays();
      setStreak(s);

      // 最近7天的学习记录
      const logs = await db.dailyLogs.orderBy("date").reverse().limit(7).toArray();
      setWeekLogs(logs.reverse());
    }
    load();
  }, []);

  async function handleSave() {
    if (!plan) return;
    setSaving(true);
    await db.studyPlans.update(plan.id!, {
      dailyNewWords,
      dailyReviewTarget,
      dailyMinutes,
      weeklyDays,
      updatedAt: new Date(),
    });
    setPlan({
      ...plan,
      dailyNewWords,
      dailyReviewTarget,
      dailyMinutes,
      weeklyDays,
    });
    setEditing(false);
    setSaving(false);
  }

  if (!plan) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="inline-block w-6 h-6 border-2 border-[var(--primary)]/30 border-t-[var(--primary)] rounded-full animate-spin" />
      </div>
    );
  }

  // 计算本周统计
  const weekTotal = weekLogs.reduce(
    (acc, log) => ({
      words: acc.words + log.newWordsLearned + log.wordsReviewed,
      patterns: acc.patterns + log.newPatternsLearned + log.patternsReviewed,
      quiz: acc.quiz + log.quizCompleted,
      correct: acc.correct + log.quizCorrect,
      days: acc.days + (log.goalMet ? 1 : 0),
    }),
    { words: 0, patterns: 0, quiz: 0, correct: 0, days: 0 }
  );

  return (
    <div className="max-w-3xl mx-auto fade-in space-y-6">
      <div>
        <h2 className="text-[22px] font-bold text-[var(--text-primary)]">
          学习计划
        </h2>
        <p className="text-[14px] text-[var(--text-secondary)] mt-1">
          基于艾宾浩斯遗忘曲线和间隔重复原理，科学规划你的学习节奏
        </p>
      </div>

      {/* 连续学习 & 本周概览 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-[var(--radius-lg)] bg-[var(--accent-50)] flex items-center justify-center">
            <span className="streak-flame text-3xl">🔥</span>
          </div>
          <div>
            <p className="text-[28px] font-bold text-[var(--accent)]">{streak}</p>
            <p className="text-[13px] text-[var(--text-tertiary)]">连续学习天数</p>
          </div>
        </div>

        <div className="card p-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-[var(--radius-lg)] bg-[var(--primary-50)] flex items-center justify-center text-3xl">
            📈
          </div>
          <div>
            <p className="text-[28px] font-bold text-[var(--primary)]">
              {weekTotal.words}
            </p>
            <p className="text-[13px] text-[var(--text-tertiary)]">本周学习词汇量</p>
          </div>
        </div>
      </div>

      {/* 每周学习热力图 */}
      <div className="card p-5">
        <h3 className="text-[14px] font-semibold text-[var(--text-primary)] mb-4">
          📅 最近 7 天学习记录
        </h3>
        <div className="grid grid-cols-7 gap-2">
          {getLast7Days().map((dateStr) => {
            const log = weekLogs.find((l) => l.date === dateStr);
            const hasActivity = log && (log.newWordsLearned + log.wordsReviewed + log.quizCompleted) > 0;
            const dayLabel = new Date(dateStr + "T00:00:00").toLocaleDateString("zh-CN", { weekday: "short" });
            const dayNum = new Date(dateStr + "T00:00:00").getDate();
            const isToday = dateStr === new Date().toISOString().slice(0, 10);

            return (
              <div
                key={dateStr}
                className={`text-center p-3 rounded-[var(--radius-md)] transition-all ${
                  isToday
                    ? "ring-2 ring-[var(--primary)] ring-offset-2"
                    : ""
                } ${
                  hasActivity
                    ? "bg-[var(--primary-50)]"
                    : "bg-[var(--bg-elevated)]"
                }`}
              >
                <p className="text-[11px] text-[var(--text-tertiary)]">{dayLabel}</p>
                <p className={`text-[16px] font-semibold mt-0.5 ${
                  hasActivity ? "text-[var(--primary)]" : "text-[var(--text-tertiary)]"
                }`}>
                  {dayNum}
                </p>
                {hasActivity && (
                  <p className="text-[10px] text-[var(--primary)] mt-0.5">
                    {(log!.newWordsLearned + log!.wordsReviewed)} 词
                  </p>
                )}
                {!hasActivity && (
                  <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">—</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 学习目标设定 */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[14px] font-semibold text-[var(--text-primary)]">
            🎯 学习目标设定
          </h3>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="btn-secondary !py-1.5 !px-3 !text-[12px]"
            >
              编辑
            </button>
          )}
        </div>

        {!editing ? (
          <div className="grid grid-cols-2 gap-4">
            <GoalDisplay
              label="每日新词"
              value={`${plan.dailyNewWords} 个`}
              icon="📝"
            />
            <GoalDisplay
              label="每日复习"
              value={`${plan.dailyReviewTarget} 个`}
              icon="🔄"
            />
            <GoalDisplay
              label="每日时长"
              value={`${plan.dailyMinutes} 分钟`}
              icon="⏱️"
            />
            <GoalDisplay
              label="每周天数"
              value={`${plan.weeklyDays} 天`}
              icon="📅"
            />
          </div>
        ) : (
          <div className="space-y-4">
            <GoalInput
              label="每日新词目标"
              description="每天学习多少个新词汇（建议 5-15 个）"
              value={dailyNewWords}
              onChange={setDailyNewWords}
              min={1}
              max={50}
            />
            <GoalInput
              label="每日复习目标"
              description="每天复习多少个已学词汇（建议 15-30 个）"
              value={dailyReviewTarget}
              onChange={setDailyReviewTarget}
              min={5}
              max={100}
            />
            <GoalInput
              label="每日学习时长（分钟）"
              description="每天计划花多少时间学习（建议 20-45 分钟）"
              value={dailyMinutes}
              onChange={setDailyMinutes}
              min={10}
              max={120}
            />
            <GoalInput
              label="每周学习天数"
              description="一周中有几天用于学习（建议 5 天，保留休息日）"
              value={weeklyDays}
              onChange={setWeeklyDays}
              min={1}
              max={7}
            />

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary"
              >
                {saving ? "保存中..." : "保存设置"}
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setDailyNewWords(plan.dailyNewWords);
                  setDailyReviewTarget(plan.dailyReviewTarget);
                  setDailyMinutes(plan.dailyMinutes);
                  setWeeklyDays(plan.weeklyDays);
                }}
                className="btn-secondary"
              >
                取消
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 学习方法论 */}
      <div className="card p-5">
        <h3 className="text-[14px] font-semibold text-[var(--text-primary)] mb-4">
          🧠 科学学习方法
        </h3>
        <div className="space-y-4">
          <MethodCard
            title="艾宾浩斯遗忘曲线"
            description="系统会根据你对每个词汇的掌握程度，自动安排最佳复习时间。刚学的内容会在 1 天、3 天、7 天、15 天后提醒复习，逐步加深记忆。"
            icon="📉"
          />
          <MethodCard
            title="间隔重复 (SM-2)"
            description="采用经过验证的 SM-2 算法，根据你每次复习的表现动态调整下次复习间隔。回答 &quot;很简单&quot; 的词汇间隔会拉长，&quot;忘记了&quot; 的会很快再次出现。"
            icon="🔁"
          />
          <MethodCard
            title="主动回忆 + 造句"
            description="测验模式要求你用目标词汇/句式造句，而不是被动选择。主动输出比被动识别更能加深记忆，这是语言习得最有效的方式之一。"
            icon="✍️"
          />
          <MethodCard
            title="情境化学习"
            description="你录入的都是真实工作场景中的英语内容，这种与实际场景紧密结合的学习方式，比孤立背单词的效果好 3-5 倍。"
            icon="💼"
          />
        </div>
      </div>
    </div>
  );
}

function GoalDisplay({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: string;
}) {
  return (
    <div className="flex items-center gap-3 p-3 bg-[var(--bg-elevated)] rounded-[var(--radius-md)]">
      <span className="text-xl">{icon}</span>
      <div>
        <p className="text-[12px] text-[var(--text-tertiary)]">{label}</p>
        <p className="text-[15px] font-semibold text-[var(--text-primary)]">
          {value}
        </p>
      </div>
    </div>
  );
}

function GoalInput({
  label,
  description,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  description: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
}) {
  return (
    <div>
      <label className="block text-[13px] font-medium text-[var(--text-primary)] mb-0.5">
        {label}
      </label>
      <p className="text-[12px] text-[var(--text-tertiary)] mb-2">{description}</p>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 accent-[var(--primary)]"
        />
        <span className="text-[15px] font-semibold text-[var(--primary)] w-12 text-right">
          {value}
        </span>
      </div>
    </div>
  );
}

function MethodCard({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <div className="flex gap-3 p-3 bg-[var(--bg-elevated)] rounded-[var(--radius-md)]">
      <span className="text-xl shrink-0 mt-0.5">{icon}</span>
      <div>
        <p className="text-[13px] font-semibold text-[var(--text-primary)] mb-0.5">
          {title}
        </p>
        <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}

function getLast7Days(): string[] {
  const days: string[] = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}
