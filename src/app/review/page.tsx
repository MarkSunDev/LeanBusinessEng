"use client";

import { useState, useEffect, useCallback } from "react";
import { db, getOrCreateTodayLog } from "@/lib/db";
import { calculateNextReview } from "@/lib/spaced-repetition";
import type { Vocabulary, SentencePattern } from "@/types";
import Link from "next/link";

type ReviewItem =
  | { type: "vocabulary"; data: Vocabulary }
  | { type: "pattern"; data: SentencePattern };

export default function ReviewPage() {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);

  useEffect(() => {
    async function loadReviewItems() {
      const now = new Date();
      const dueVocab = await db.vocabularies
        .where("nextReviewAt")
        .belowOrEqual(now)
        .toArray();
      const duePatterns = await db.sentencePatterns
        .where("nextReviewAt")
        .belowOrEqual(now)
        .toArray();

      const all: ReviewItem[] = [
        ...dueVocab.map((v) => ({ type: "vocabulary" as const, data: v })),
        ...duePatterns.map((p) => ({ type: "pattern" as const, data: p })),
      ];

      // 打乱顺序
      for (let i = all.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [all[i], all[j]] = [all[j], all[i]];
      }

      setItems(all);
      setLoading(false);
    }
    loadReviewItems();
  }, []);

  const handleRate = useCallback(
    async (quality: number) => {
      const item = items[currentIndex];
      const d = item.data;
      const result = calculateNextReview(
        quality,
        d.repetitions,
        d.interval,
        d.easeFactor
      );

      // 更新掌握度
      const masteryDelta = quality >= 3 ? Math.min(20, quality * 5) : -15;
      const newMastery = Math.max(0, Math.min(100, d.mastery + masteryDelta));

      if (item.type === "vocabulary") {
        await db.vocabularies.update(d.id!, { ...result, mastery: newMastery });
      } else {
        await db.sentencePatterns.update(d.id!, { ...result, mastery: newMastery });
      }

      // 更新今日记录
      const log = await getOrCreateTodayLog();
      if (item.type === "vocabulary") {
        await db.dailyLogs.update(log.id!, {
          wordsReviewed: log.wordsReviewed + 1,
        });
      } else {
        await db.dailyLogs.update(log.id!, {
          patternsReviewed: log.patternsReviewed + 1,
        });
      }

      setReviewedCount((c) => c + 1);

      if (currentIndex + 1 >= items.length) {
        setCompleted(true);
      } else {
        setCurrentIndex((i) => i + 1);
        setShowAnswer(false);
      }
    },
    [items, currentIndex]
  );

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
        <p className="text-4xl mb-4">🎉</p>
        <h2 className="text-[20px] font-bold text-[var(--text-primary)] mb-2">
          全部完成！
        </h2>
        <p className="text-[14px] text-[var(--text-secondary)] mb-6">
          目前没有待复习的内容，继续添加新素材或明天再来
        </p>
        <Link href="/" className="btn-primary">
          返回主页
        </Link>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="max-w-md mx-auto text-center py-16 fade-in">
        <p className="text-4xl mb-4">✅</p>
        <h2 className="text-[20px] font-bold text-[var(--text-primary)] mb-2">
          复习完成！
        </h2>
        <p className="text-[14px] text-[var(--text-secondary)] mb-6">
          本次复习了 {reviewedCount} 个项目，做得不错！
        </p>
        <div className="flex justify-center gap-3">
          <Link href="/" className="btn-primary">
            返回主页
          </Link>
          <Link href="/quiz" className="btn-secondary">
            去做测验
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
          每日复习
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

      {/* 卡片 */}
      <div className="card p-8 text-center min-h-[320px] flex flex-col justify-center">
        <span className="text-[12px] text-[var(--text-tertiary)] uppercase tracking-wider mb-5">
          {isVocab ? "📝 词汇" : "📐 句式"}
        </span>

        <p className="text-[26px] font-bold text-[var(--text-primary)] mb-2">
          {isVocab
            ? (current.data as Vocabulary).word
            : (current.data as SentencePattern).pattern}
        </p>

        {isVocab && (current.data as Vocabulary).phonetic && (
          <p className="text-[14px] text-[var(--text-tertiary)] mb-6">
            {(current.data as Vocabulary).phonetic}
          </p>
        )}

        {!showAnswer ? (
          <button
            onClick={() => setShowAnswer(true)}
            className="btn-primary mx-auto mt-4"
          >
            显示答案
          </button>
        ) : (
          <div className="mt-4 fade-in">
            <div className="mb-6 text-left bg-[var(--bg-elevated)] rounded-[var(--radius-md)] p-5">
              {isVocab ? (
                <>
                  <p className="text-[15px] text-[var(--text-primary)] font-medium">
                    {(current.data as Vocabulary).definition}
                  </p>
                  {(current.data as Vocabulary).exampleSentence && (
                    <p className="text-[13px] text-[var(--text-tertiary)] mt-3 italic pl-3 border-l-2 border-[var(--border)]">
                      {(current.data as Vocabulary).exampleSentence}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p className="text-[15px] text-[var(--text-primary)] font-medium">
                    {(current.data as SentencePattern).explanation}
                  </p>
                  {(current.data as SentencePattern).exampleSentence && (
                    <p className="text-[13px] text-[var(--text-tertiary)] mt-3 italic pl-3 border-l-2 border-[var(--border)]">
                      {(current.data as SentencePattern).exampleSentence}
                    </p>
                  )}
                </>
              )}
            </div>

            <p className="text-[12px] text-[var(--text-tertiary)] mb-3">
              你对这个知识点的掌握程度如何？
            </p>
            <div className="flex justify-center gap-2">
              <RateButton quality={1} label="忘记了" color="error" onClick={handleRate} />
              <RateButton quality={3} label="有点难" color="warning" onClick={handleRate} />
              <RateButton quality={4} label="记得" color="primary" onClick={handleRate} />
              <RateButton quality={5} label="很简单" color="success" onClick={handleRate} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function RateButton({
  quality,
  label,
  color,
  onClick,
}: {
  quality: number;
  label: string;
  color: string;
  onClick: (q: number) => void;
}) {
  const colorMap: Record<string, string> = {
    error: "bg-[var(--error-50)] text-red-700 hover:bg-red-100",
    warning: "bg-[var(--warning-50)] text-amber-700 hover:bg-amber-100",
    primary: "bg-[var(--primary-50)] text-[var(--primary-dark)] hover:bg-teal-100",
    success: "bg-[var(--success-50)] text-green-700 hover:bg-green-100",
  };

  return (
    <button
      onClick={() => onClick(quality)}
      className={`px-4 py-2.5 rounded-[var(--radius-md)] text-[13px] font-medium transition-all duration-200 hover:scale-105 ${colorMap[color]}`}
    >
      {label}
    </button>
  );
}
