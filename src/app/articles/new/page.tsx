"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { db, getOrCreateTodayLog, isAIConfigured } from "@/lib/db";
import { analyzeContent, generateStudyPlan } from "@/lib/ai";
import Link from "next/link";

type Step = "input" | "parsing" | "parsed" | "generating-plan" | "completed";

export default function NewArticlePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [step, setStep] = useState<Step>("input");
  const [error, setError] = useState("");
  const [notConfigured, setNotConfigured] = useState(false);

  // 解析结果缓存
  const [parsedData, setParsedData] = useState<{
    parsedHtml: string;
    sentences: Array<{ index: number; english: string; chinese: string }>;
    vocabularies: Array<any>;
    patterns: Array<any>;
  } | null>(null);

  async function handleParse(retryCount = 0) {
    if (!title.trim() || !content.trim()) return;

    const configured = await isAIConfigured();
    if (!configured) {
      setNotConfigured(true);
      return;
    }

    setStep("parsing");
    setError("");

    try {
      const data = await analyzeContent(content, retryCount);

      console.log("Parse successful:", {
        sentencesCount: data.sentences?.length || 0,
        vocabulariesCount: data.vocabularies?.length || 0,
        patternsCount: data.patterns?.length || 0,
      });

      setParsedData(data);
      setStep("parsed");
    } catch (err) {
      const message = err instanceof Error ? err.message : "解析失败";
      setError(message);
      setStep("input");
    }
  }

  async function handleGeneratePlan() {
    if (!parsedData) return;

    setStep("generating-plan");
    setError("");

    try {
      const studyPlan = await generateStudyPlan(
        content,
        parsedData.vocabularies.length,
        parsedData.patterns.length
      );

      await saveArticle(studyPlan);
    } catch (err) {
      const message = err instanceof Error ? err.message : "生成学习计划失败";
      setError(message);
      setStep("parsed"); // 回到已解析状态，允许用户选择跳过
    }
  }

  async function saveArticle(studyPlan?: any) {
    if (!parsedData) return;

    const now = new Date();

    const articleId = await db.articles.add({
      title: title.trim(),
      content: content.trim(),
      parsedHtml: parsedData.parsedHtml,
      sentences: parsedData.sentences,
      studyPlan: studyPlan || null,
      createdAt: now,
      updatedAt: now,
    });

    let newWordCount = 0;
    let newPatternCount = 0;

    if (parsedData.vocabularies?.length) {
      // 新内容的复习时间从明天开始，不影响今天的复习计划
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const vocabRecords = parsedData.vocabularies.map((v) => ({
        articleId: articleId as number,
        word: v.word,
        definition: v.definition,
        phonetic: v.phonetic || "",
        exampleSentence: v.exampleSentence || "",
        exampleSentenceChinese: v.exampleSentenceChinese || "",
        exampleSentence2: v.exampleSentence2 || "",
        exampleSentence2Chinese: v.exampleSentence2Chinese || "",
        nextReviewAt: tomorrow,
        interval: 0,
        easeFactor: 2.5,
        repetitions: 0,
        mastery: 0,
        createdAt: now,
      }));
      await db.vocabularies.bulkAdd(vocabRecords);
      newWordCount = vocabRecords.length;
    }

    if (parsedData.patterns?.length) {
      // 新内容的复习时间从明天开始，不影响今天的复习计划
      const patternTomorrow = new Date(now);
      patternTomorrow.setDate(patternTomorrow.getDate() + 1);
      patternTomorrow.setHours(0, 0, 0, 0);

      const patternRecords = parsedData.patterns.map((p) => ({
        articleId: articleId as number,
        pattern: p.pattern,
        explanation: p.explanation,
        exampleSentence: p.exampleSentence || "",
        exampleSentenceChinese: p.exampleSentenceChinese || "",
        exampleSentence2: p.exampleSentence2 || "",
        exampleSentence2Chinese: p.exampleSentence2Chinese || "",
        nextReviewAt: patternTomorrow,
        interval: 0,
        easeFactor: 2.5,
        repetitions: 0,
        mastery: 0,
        createdAt: now,
      }));
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
  }

  // 输入步骤
  if (step === "input" || step === "parsing") {
    return (
      <div className="max-w-3xl mx-auto fade-in">
        <h2 className="text-[22px] font-bold text-[var(--text-primary)] mb-1">
          添加学习内容
        </h2>
        <p className="text-[14px] text-[var(--text-secondary)] mb-6">
          粘贴工作中的英语邮件、会议纪要、报告等内容，AI 将自动解析核心词汇和句式
        </p>

        <form onSubmit={(e) => { e.preventDefault(); handleParse(); }} className="space-y-5">
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
              disabled={step === "parsing"}
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
              disabled={step === "parsing"}
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
            <div className="p-3.5 bg-[var(--error-50)] border border-red-200 rounded-[var(--radius-md)] text-[13px] text-red-700">
              <div className="flex items-start gap-2">
                <span>⚠️</span>
                <div className="flex-1">
                  <p>{error}</p>
                  <button
                    type="button"
                    onClick={() => handleParse(1)}
                    className="mt-2 text-[var(--primary)] font-medium hover:underline"
                  >
                    点击重试
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={step === "parsing" || !title.trim() || !content.trim()}
              className="btn-primary"
            >
              {step === "parsing" ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  AI 正在解析...（最多60秒）
                </>
              ) : (
                "开始解析"
              )}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              disabled={step === "parsing"}
              className="btn-secondary"
            >
              取消
            </button>
          </div>
        </form>
      </div>
    );
  }

  // 已解析步骤 - 显示解析结果并询问是否生成学习计划
  if (step === "parsed" || step === "generating-plan") {
    return (
      <div className="max-w-3xl mx-auto fade-in">
        <h2 className="text-[22px] font-bold text-[var(--text-primary)] mb-1">
          解析完成
        </h2>
        <p className="text-[14px] text-[var(--text-secondary)] mb-6">
          AI 已成功解析内容，你可以选择生成学习计划或直接保存
        </p>

        {/* 解析结果预览 */}
        <div className="card p-5 mb-6">
          <h3 className="text-[14px] font-semibold text-[var(--text-primary)] mb-3">
            📊 解析结果
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-[var(--bg-elevated)] rounded-lg">
              <p className="text-[20px] font-bold text-[var(--primary)]">{parsedData?.sentences.length || 0}</p>
              <p className="text-[12px] text-[var(--text-tertiary)]">句子</p>
            </div>
            <div className="text-center p-3 bg-[var(--bg-elevated)] rounded-lg">
              <p className="text-[20px] font-bold text-[var(--primary)]">{parsedData?.vocabularies.length || 0}</p>
              <p className="text-[12px] text-[var(--text-tertiary)]">核心词汇</p>
            </div>
            <div className="text-center p-3 bg-[var(--bg-elevated)] rounded-lg">
              <p className="text-[20px] font-bold text-[var(--primary)]">{parsedData?.patterns.length || 0}</p>
              <p className="text-[12px] text-[var(--text-tertiary)]">核心句式</p>
            </div>
          </div>
        </div>

        {/* 句子预览 */}
        {parsedData?.sentences && parsedData.sentences.length > 0 && (
          <div className="card p-5 mb-6">
            <h3 className="text-[14px] font-semibold text-[var(--text-primary)] mb-3">
              📝 句子预览
            </h3>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {parsedData.sentences.slice(0, 5).map((sentence, index) => (
                <div key={index} className="border-l-2 border-[var(--primary)] pl-3">
                  <p className="text-[14px] text-[var(--text-primary)]">{sentence.english}</p>
                  <p className="text-[13px] text-[var(--text-secondary)]">{sentence.chinese}</p>
                </div>
              ))}
              {parsedData.sentences.length > 5 && (
                <p className="text-[12px] text-[var(--text-tertiary)] text-center">
                  还有 {parsedData.sentences.length - 5} 个句子...
                </p>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="p-3.5 bg-[var(--error-50)] border border-red-200 rounded-[var(--radius-md)] text-[13px] text-red-700 mb-4">
            <div className="flex items-start gap-2">
              <span>⚠️</span>
              <div className="flex-1">
                <p>{error}</p>
                <button
                  type="button"
                  onClick={handleGeneratePlan}
                  className="mt-2 text-[var(--primary)] font-medium hover:underline"
                >
                  点击重试生成计划
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={handleGeneratePlan}
            disabled={step === "generating-plan"}
            className="btn-primary"
          >
            {step === "generating-plan" ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                生成学习计划...
              </>
            ) : (
              "生成学习计划并保存"
            )}
          </button>
          <button
            onClick={() => saveArticle()}
            disabled={step === "generating-plan"}
            className="btn-secondary"
          >
            跳过，直接保存
          </button>
        </div>
      </div>
    );
  }

  return null;
}
