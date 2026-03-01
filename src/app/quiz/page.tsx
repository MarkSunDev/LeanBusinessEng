"use client";

import { useState, useEffect } from "react";
import { db, getOrCreateTodayLog } from "@/lib/db";
import { calculateNextReview } from "@/lib/spaced-repetition";
import { evaluateAnswer } from "@/lib/ai";
import type { Vocabulary, SentencePattern } from "@/types";
import Link from "next/link";

type QuizItem =
  | { type: "vocabulary"; data: Vocabulary }
  | { type: "pattern"; data: SentencePattern };

export default function QuizPage() {
  const [items, setItems] = useState<QuizItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [feedback, setFeedback] = useState<{
    isCorrect: boolean;
    message: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    async function loadQuizItems() {
      const allVocab = await db.vocabularies.toArray();
      const allPatterns = await db.sentencePatterns.toArray();

      const all: QuizItem[] = [
        ...allVocab.map((v) => ({ type: "vocabulary" as const, data: v })),
        ...allPatterns.map((p) => ({ type: "pattern" as const, data: p })),
      ];

      // 打乱并取最多10个
      for (let i = all.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [all[i], all[j]] = [all[j], all[i]];
      }

      setItems(all.slice(0, 10));
      setLoading(false);
    }
    loadQuizItems();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userAnswer.trim() || submitting) return;

    setSubmitting(true);
    const item = items[currentIndex];
    const isVocab = item.type === "vocabulary";

    const prompt = isVocab
      ? `目标词汇是 "${(item.data as Vocabulary).word}"（释义：${(item.data as Vocabulary).definition}）。学生写的句子是："${userAnswer}"。请评估该句子是否正确使用了这个词汇。`
      : `目标句式是 "${(item.data as SentencePattern).pattern}"（说明：${(item.data as SentencePattern).explanation}）。学生写的句子是："${userAnswer}"。请评估该句子是否正确使用了这个句式。`;

    try {
      const data = await evaluateAnswer(prompt, userAnswer);
      setFeedback(data);

      // 保存测验记录
      await db.quizRecords.add({
        type: item.type,
        itemId: item.data.id!,
        prompt: isVocab
          ? (item.data as Vocabulary).word
          : (item.data as SentencePattern).pattern,
        userAnswer,
        isCorrect: data.isCorrect,
        aiFeedback: data.message,
        createdAt: new Date(),
      });

      // 更新间隔重复
      const quality = data.isCorrect ? 4 : 1;
      const result = calculateNextReview(
        quality,
        item.data.repetitions,
        item.data.interval,
        item.data.easeFactor
      );

      const masteryDelta = data.isCorrect ? 15 : -10;
      const newMastery = Math.max(
        0,
        Math.min(100, item.data.mastery + masteryDelta)
      );

      if (isVocab) {
        await db.vocabularies.update(item.data.id!, { ...result, mastery: newMastery });
      } else {
        await db.sentencePatterns.update(item.data.id!, { ...result, mastery: newMastery });
      }

      // 更新今日记录
      const log = await getOrCreateTodayLog();
      await db.dailyLogs.update(log.id!, {
        quizCompleted: log.quizCompleted + 1,
        quizCorrect: log.quizCorrect + (data.isCorrect ? 1 : 0),
      });

      setScore((s) => ({
        correct: s.correct + (data.isCorrect ? 1 : 0),
        total: s.total + 1,
      }));
    } catch (err) {
      setFeedback({
        isCorrect: false,
        message:
          err instanceof Error ? err.message : "评估失败，请检查设置。",
      });
    } finally {
      setSubmitting(false);
    }
  }

  function handleNext() {
    if (currentIndex + 1 >= items.length) {
      setCompleted(true);
    } else {
      setCurrentIndex((i) => i + 1);
      setUserAnswer("");
      setFeedback(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="inline-block w-6 h-6 border-2 border-[var(--primary)]/30 border-t-[var(--primary)] rounded-full animate-spin" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-md mx-auto text-center py-16 fade-in">
        <p className="text-4xl mb-4">📝</p>
        <h2 className="text-[20px] font-bold text-[var(--text-primary)] mb-2">
          暂无测验内容
        </h2>
        <p className="text-[14px] text-[var(--text-secondary)] mb-6">
          先添加一些学习内容，然后回来做测验
        </p>
        <Link href="/articles/new" className="btn-primary">
          添加内容
        </Link>
      </div>
    );
  }

  if (completed) {
    const pct = Math.round((score.correct / score.total) * 100);
    return (
      <div className="max-w-md mx-auto text-center py-16 fade-in">
        <p className="text-4xl mb-4">
          {pct >= 80 ? "🎉" : pct >= 50 ? "💪" : "📚"}
        </p>
        <h2 className="text-[20px] font-bold text-[var(--text-primary)] mb-2">
          测验完成！
        </h2>
        <div className="card p-6 my-6 inline-block">
          <p className="text-[36px] font-bold text-[var(--primary)]">
            {score.correct} / {score.total}
          </p>
          <p className="text-[14px] text-[var(--text-tertiary)] mt-1">
            正确率 {pct}%
          </p>
        </div>
        <div className="flex justify-center gap-3">
          <Link href="/" className="btn-primary">
            返回主页
          </Link>
          <Link href="/review" className="btn-secondary">
            去复习
          </Link>
        </div>
      </div>
    );
  }

  const current = items[currentIndex];
  const isVocab = current.type === "vocabulary";

  return (
    <div className="max-w-2xl mx-auto fade-in">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-[22px] font-bold text-[var(--text-primary)]">
          练习测验
        </h2>
        <span className="text-[13px] text-[var(--text-tertiary)] bg-[var(--bg-elevated)] px-3 py-1 rounded-full">
          {currentIndex + 1} / {items.length}
        </span>
      </div>

      {/* 进度条 */}
      <div className="w-full h-1.5 bg-[var(--bg-elevated)] rounded-full mb-8 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[var(--primary)] to-[var(--primary-light)] rounded-full transition-all duration-500"
          style={{ width: `${((currentIndex + 1) / items.length) * 100}%` }}
        />
      </div>

      {/* 题目卡片 */}
      <div className="card p-6 mb-4">
        <span className="text-[12px] text-[var(--text-tertiary)] uppercase tracking-wider">
          {isVocab ? "用这个词汇造一个句子" : "用这个句式写一个句子"}
        </span>

        <p className="text-[22px] font-bold text-[var(--text-primary)] mt-3 mb-2">
          {isVocab
            ? (current.data as Vocabulary).word
            : (current.data as SentencePattern).pattern}
        </p>

        <p className="text-[14px] text-[var(--text-secondary)]">
          {isVocab
            ? (current.data as Vocabulary).definition
            : (current.data as SentencePattern).explanation}
        </p>
      </div>

      {/* 作答区域 */}
      {!feedback ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            placeholder="在这里输入你的英语句子..."
            rows={3}
            className="input resize-y !leading-relaxed"
            required
            autoFocus
          />
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting || !userAnswer.trim()}
              className="btn-primary"
            >
              {submitting ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  AI 评估中...
                </>
              ) : (
                "提交答案"
              )}
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="btn-secondary"
            >
              跳过
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-4 fade-in">
          {/* 评估结果 */}
          <div
            className={`p-5 rounded-[var(--radius-lg)] border ${
              feedback.isCorrect
                ? "bg-[var(--success-50)] border-green-200"
                : "bg-[var(--error-50)] border-red-200"
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{feedback.isCorrect ? "✅" : "❌"}</span>
              <span
                className={`text-[14px] font-semibold ${
                  feedback.isCorrect ? "text-green-700" : "text-red-700"
                }`}
              >
                {feedback.isCorrect ? "回答正确！" : "还需改进"}
              </span>
            </div>
            <p className="text-[14px] text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed">
              {feedback.message}
            </p>
          </div>

          {/* 你的回答 */}
          <div className="card p-4">
            <p className="text-[12px] text-[var(--text-tertiary)] mb-1">你的回答</p>
            <p className="text-[14px] text-[var(--text-primary)]">{userAnswer}</p>
          </div>

          <button onClick={handleNext} className="btn-primary">
            {currentIndex + 1 >= items.length ? "完成测验" : "下一题"}
          </button>
        </div>
      )}
    </div>
  );
}
