"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db, getStreakDays, getOrCreateTodayLog, getStudyPlan, isAIConfigured } from "@/lib/db";
import Link from "next/link";
import { useState, useEffect } from "react";
import type { StudyPlan, DailyLog } from "@/types";

export default function Dashboard() {
  const [streak, setStreak] = useState(0);
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [todayLog, setTodayLog] = useState<DailyLog | null>(null);
  const [aiConfigured, setAiConfigured] = useState(true);

  const articles = useLiveQuery(() => db.articles.count());
  const vocabularies = useLiveQuery(() => db.vocabularies.count());
  const patterns = useLiveQuery(() => db.sentencePatterns.count());
  const todayReviewVocab = useLiveQuery(() =>
    db.vocabularies.where("nextReviewAt").belowOrEqual(new Date()).count()
  );
  const todayReviewPatterns = useLiveQuery(() =>
    db.sentencePatterns.where("nextReviewAt").belowOrEqual(new Date()).count()
  );
  const recentArticles = useLiveQuery(() =>
    db.articles.orderBy("createdAt").reverse().limit(5).toArray()
  );

  useEffect(() => {
    getStreakDays().then(setStreak);
    getStudyPlan().then(setPlan);
    getOrCreateTodayLog().then(setTodayLog);
    isAIConfigured().then(setAiConfigured);
  }, []);

  const totalReview = (todayReviewVocab ?? 0) + (todayReviewPatterns ?? 0);
  const todayProgress = todayLog && plan
    ? Math.min(
        100,
        Math.round(
          (((todayLog.wordsReviewed + todayLog.newWordsLearned) /
            Math.max(1, plan.dailyNewWords + plan.dailyReviewTarget)) *
            100)
        )
      )
    : 0;

  return (
    <div className="space-y-6 fade-in">
      {/* 欢迎区 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[22px] font-bold text-[var(--text-primary)]">
            {getGreeting()}
          </h2>
          <p className="text-[14px] text-[var(--text-secondary)] mt-1">
            {totalReview > 0
              ? `你有 ${totalReview} 个待复习项目`
              : "今天没有待复习的内容，去添加新素材吧"}
          </p>
        </div>
        {streak > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-50)] rounded-[var(--radius-lg)]">
            <span className="streak-flame text-2xl">🔥</span>
            <div className="text-right">
              <p className="text-[20px] font-bold text-[var(--accent)]">{streak}</p>
              <p className="text-[11px] text-[var(--text-tertiary)]">连续天数</p>
            </div>
          </div>
        )}
      </div>

      {/* 未配置提示 */}
      {!aiConfigured && (
        <div className="card p-5 border-[var(--accent)]/30 bg-[var(--accent-50)]">
          <div className="flex items-start gap-3">
            <span className="text-2xl shrink-0">🔧</span>
            <div>
              <h3 className="text-[14px] font-semibold text-[var(--text-primary)] mb-1">
                首次使用，请先配置 AI 服务
              </h3>
              <p className="text-[13px] text-[var(--text-secondary)] mb-3">
                本应用需要连接 AI 服务来解析英语内容和评判测验。你需要配置 API 地址和密钥。
              </p>
              <Link href="/settings" className="btn-primary !text-[13px] !py-2">
                前往设置
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* 今日进度 */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[14px] font-semibold text-[var(--text-primary)]">
            📊 今日学习进度
          </h3>
          <span className="text-[13px] font-medium text-[var(--primary)]">
            {todayProgress}%
          </span>
        </div>
        <div className="w-full h-2.5 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[var(--primary)] to-[var(--primary-light)] rounded-full progress-animated transition-all duration-500"
            style={{ width: `${todayProgress}%` }}
          />
        </div>
        <div className="flex gap-4 mt-3 text-[12px] text-[var(--text-tertiary)]">
          <span>新学 {todayLog?.newWordsLearned ?? 0} 词</span>
          <span>·</span>
          <span>复习 {todayLog?.wordsReviewed ?? 0} 词</span>
          <span>·</span>
          <span>测验 {todayLog?.quizCompleted ?? 0} 题</span>
        </div>
      </div>

      {/* 快捷操作 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Link href="/articles/new" className="card p-4 text-center hover:border-[var(--primary)] group">
          <span className="text-2xl block mb-2 transition-transform duration-200 group-hover:scale-110">📝</span>
          <p className="text-[13px] font-medium text-[var(--text-primary)]">添加内容</p>
          <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">录入新素材</p>
        </Link>

        <Link
          href="/review"
          className={`card p-4 text-center group ${
            totalReview > 0 ? "border-[var(--accent)]/30 bg-[var(--accent-50)]" : ""
          } hover:border-[var(--accent)]`}
        >
          <span className="text-2xl block mb-2 transition-transform duration-200 group-hover:scale-110">🔄</span>
          <p className="text-[13px] font-medium text-[var(--text-primary)]">每日复习</p>
          <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
            {totalReview > 0 ? `${totalReview} 项待复习` : "全部完成"}
          </p>
        </Link>

        <Link href="/quiz" className="card p-4 text-center hover:border-[var(--primary)] group">
          <span className="text-2xl block mb-2 transition-transform duration-200 group-hover:scale-110">💡</span>
          <p className="text-[13px] font-medium text-[var(--text-primary)]">练习测验</p>
          <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">造句练习</p>
        </Link>

        <Link href="/plan" className="card p-4 text-center hover:border-[var(--primary)] group">
          <span className="text-2xl block mb-2 transition-transform duration-200 group-hover:scale-110">📅</span>
          <p className="text-[13px] font-medium text-[var(--text-primary)]">学习计划</p>
          <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">目标设定</p>
        </Link>
      </div>

      {/* 数据统计 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4">
          <p className="text-[12px] text-[var(--text-tertiary)]">内容素材</p>
          <p className="text-[24px] font-bold text-[var(--text-primary)] mt-1">{articles ?? 0}</p>
        </div>
        <div className="card p-4">
          <p className="text-[12px] text-[var(--text-tertiary)]">词汇积累</p>
          <p className="text-[24px] font-bold text-[var(--text-primary)] mt-1">{vocabularies ?? 0}</p>
        </div>
        <div className="card p-4">
          <p className="text-[12px] text-[var(--text-tertiary)]">句式掌握</p>
          <p className="text-[24px] font-bold text-[var(--text-primary)] mt-1">{patterns ?? 0}</p>
        </div>
      </div>

      {/* 最近内容 */}
      <div>
        <h3 className="text-[15px] font-semibold text-[var(--text-primary)] mb-3">
          最近添加的内容
        </h3>
        {recentArticles && recentArticles.length > 0 ? (
          <div className="space-y-2">
            {recentArticles.map((article) => (
              <Link
                key={article.id}
                href={`/articles/${article.id}`}
                className="card block p-4 hover:border-[var(--primary)]/30"
              >
                <h4 className="text-[14px] font-medium text-[var(--text-primary)]">
                  {article.title}
                </h4>
                <p className="text-[13px] text-[var(--text-tertiary)] mt-1 line-clamp-2">
                  {article.content.slice(0, 120)}
                  {article.content.length > 120 ? "..." : ""}
                </p>
                <p className="text-[11px] text-[var(--text-tertiary)] mt-2">
                  {new Date(article.createdAt).toLocaleDateString("zh-CN")}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="card text-center py-12 border-dashed">
            <p className="text-3xl mb-3">📚</p>
            <p className="text-[14px] text-[var(--text-secondary)] mb-1">
              还没有学习内容
            </p>
            <p className="text-[13px] text-[var(--text-tertiary)] mb-4">
              复制工作中的英语邮件、会议纪要、或任何商务文本开始学习
            </p>
            <Link href="/articles/new" className="btn-primary text-[13px]">
              添加第一篇内容
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return "夜深了，注意休息 🌙";
  if (hour < 12) return "早上好 ☀️";
  if (hour < 14) return "中午好 🌤️";
  if (hour < 18) return "下午好 ☕";
  return "晚上好 🌆";
}
