"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { db, getOrCreateTodayLog, isAIConfigured } from "@/lib/db";
import { analyzeContent } from "@/lib/ai";
import Link from "next/link";

export default function NewArticlePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notConfigured, setNotConfigured] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    // 检查是否已配置 AI
    const configured = await isAIConfigured();
    if (!configured) {
      setNotConfigured(true);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await analyzeContent(content);

      console.log("Frontend received data:", {
        hasParsedHtml: !!data.parsedHtml,
        sentencesCount: data.sentences?.length || 0,
        vocabulariesCount: data.vocabularies?.length || 0,
        patternsCount: data.patterns?.length || 0,
        hasStudyPlan: !!data.studyPlan,
        sentences: data.sentences,
      });

      const now = new Date();

      const articleId = await db.articles.add({
        title: title.trim(),
        content: content.trim(),
        parsedHtml: data.parsedHtml,
        sentences: data.sentences || [],
        studyPlan: data.studyPlan || null,
        createdAt: now,
        updatedAt: now,
      });

      let newWordCount = 0;
      let newPatternCount = 0;

      if (data.vocabularies?.length) {
        const vocabRecords = data.vocabularies.map(
          (v: { word: string; definition: string; phonetic: string; exampleSentence: string }) => ({
            articleId,
            word: v.word,
            definition: v.definition,
            phonetic: v.phonetic || "",
            exampleSentence: v.exampleSentence || "",
            nextReviewAt: now,
            interval: 0,
            easeFactor: 2.5,
            repetitions: 0,
            mastery: 0,
            createdAt: now,
          })
        );
        await db.vocabularies.bulkAdd(vocabRecords);
        newWordCount = vocabRecords.length;
      }

      if (data.patterns?.length) {
        const patternRecords = data.patterns.map(
          (p: { pattern: string; explanation: string; exampleSentence: string }) => ({
            articleId,
            pattern: p.pattern,
            explanation: p.explanation,
            exampleSentence: p.exampleSentence || "",
            nextReviewAt: now,
            interval: 0,
            easeFactor: 2.5,
            repetitions: 0,
            mastery: 0,
            createdAt: now,
          })
        );
        await db.sentencePatterns.bulkAdd(patternRecords);
        newPatternCount = patternRecords.length;
      }

      // 更新今日学习记录
      const log = await getOrCreateTodayLog();
      await db.dailyLogs.update(log.id!, {
        newWordsLearned: log.newWordsLearned + newWordCount,
        newPatternsLearned: log.newPatternsLearned + newPatternCount,
      });

      router.push(`/articles/${articleId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "发生了未知错误");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto fade-in">
      <h2 className="text-[22px] font-bold text-[var(--text-primary)] mb-1">
        添加学习内容
      </h2>
      <p className="text-[14px] text-[var(--text-secondary)] mb-6">
        粘贴工作中的英语邮件、会议纪要、报告等内容，AI 将自动解析核心词汇和句式
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-[13px] font-medium text-[var(--text-primary)] mb-1.5">
            标题
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例如：Q4季度总结会议纪要、客户合作邮件"
            className="input"
            required
          />
        </div>

        <div>
          <label className="block text-[13px] font-medium text-[var(--text-primary)] mb-1.5">
            英语原文
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={"在这里粘贴英语内容...\n\n例如：\nWe need to leverage our core competencies to drive synergy across departments and ensure alignment with our strategic objectives for the upcoming fiscal year."}
            rows={14}
            className="input resize-y !leading-relaxed"
            required
          />
          <p className="text-[12px] text-[var(--text-tertiary)] mt-1.5">
            支持单句、多句或整篇文章，AI 会自动识别关键词汇和句式结构
          </p>
        </div>

        {notConfigured && (
          <div className="p-4 bg-[var(--warning-50)] border border-amber-200 rounded-[var(--radius-md)] text-[13px]">
            <p className="font-medium text-amber-800 mb-1">⚠️ 尚未配置 AI 服务</p>
            <p className="text-amber-700 mb-2">
              需要先配置 API 地址和密钥才能使用 AI 解析功能。
            </p>
            <Link href="/settings" className="text-[var(--primary)] font-medium hover:underline">
              前往设置 →
            </Link>
          </div>
        )}

        {error && (
          <div className="p-3.5 bg-[var(--error-50)] border border-red-200 rounded-[var(--radius-md)] text-[13px] text-red-700 flex items-start gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={loading || !title.trim() || !content.trim()}
            className="btn-primary"
          >
            {loading ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                AI 正在解析...
              </>
            ) : (
              "保存并解析"
            )}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="btn-secondary"
          >
            取消
          </button>
        </div>
      </form>
    </div>
  );
}
