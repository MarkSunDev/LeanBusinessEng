"use client";

import { use, useState, useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import Link from "next/link";
import { speakText, preloadVoices } from "@/lib/tts";
import { useRouter } from "next/navigation";

// 预加载语音
if (typeof window !== "undefined") {
  preloadVoices();
}

export default function ArticleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const articleId = Number(id);
  const [expandedSentences, setExpandedSentences] = useState<Set<number>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const article = useLiveQuery(() => db.articles.get(articleId), [articleId]);
  const vocabularies = useLiveQuery(
    () => db.vocabularies.where("articleId").equals(articleId).toArray(),
    [articleId]
  );
  const patterns = useLiveQuery(
    () => db.sentencePatterns.where("articleId").equals(articleId).toArray(),
    [articleId]
  );

  const toggleSentence = useCallback((index: number) => {
    setExpandedSentences(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  }, []);

  const handleDelete = async () => {
    if (!articleId) return;

    setIsDeleting(true);
    try {
      // 删除相关的词汇
      await db.vocabularies.where("articleId").equals(articleId).delete();
      // 删除相关的句式
      await db.sentencePatterns.where("articleId").equals(articleId).delete();
      // 删除文章
      await db.articles.delete(articleId);

      router.push("/library");
    } catch (error) {
      console.error("删除失败:", error);
      alert("删除失败，请重试");
      setIsDeleting(false);
    }
  };

  if (article === undefined) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="inline-block w-6 h-6 border-2 border-[var(--primary)]/30 border-t-[var(--primary)] rounded-full animate-spin" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="text-center py-16 fade-in">
        <p className="text-3xl mb-3">😕</p>
        <p className="text-[var(--text-secondary)] mb-4">没有找到该内容</p>
        <Link href="/" className="btn-primary text-[13px]">
          返回主页
        </Link>
      </div>
    );
  }

  // 调试信息
  console.log("Article data:", {
    id: article.id,
    title: article.title,
    hasSentences: !!article.sentences,
    sentencesLength: article.sentences?.length || 0,
    sentences: article.sentences,
    hasStudyPlan: !!article.studyPlan,
  });

  return (
    <div className="max-w-4xl mx-auto fade-in">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-[13px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] mb-5 transition-colors"
      >
        ← 返回主页
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h2 className="text-[22px] font-bold text-[var(--text-primary)] mb-1">
            {article.title}
          </h2>
          <p className="text-[12px] text-[var(--text-tertiary)]">
            添加于 {new Date(article.createdAt).toLocaleDateString("zh-CN")}
          </p>
        </div>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="p-2 text-[var(--text-tertiary)] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="删除"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18"></path>
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
          </svg>
        </button>
      </div>

      {/* 删除确认对话框 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
              确认删除？
            </h3>
            <p className="text-[14px] text-[var(--text-secondary)] mb-4">
              删除后将无法恢复，包括该内容的所有词汇和句式。
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isDeleting ? "删除中..." : "确认删除"}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI 学习计划建议 */}
      {article.studyPlan && (
        <section className="mb-6">
          <div className="card p-5 bg-gradient-to-r from-[var(--primary-50)] to-[var(--bg-card)]">
            <h3 className="text-[14px] font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
              <span>📚</span>
              AI 学习计划建议
              <span className={`text-[11px] px-2 py-0.5 rounded-full ${
                article.studyPlan.difficulty === "简单" ? "bg-green-100 text-green-700" :
                article.studyPlan.difficulty === "困难" ? "bg-red-100 text-red-700" :
                "bg-yellow-100 text-yellow-700"
              }`}>
                {article.studyPlan.difficulty}
              </span>
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              <div className="text-center p-2 bg-white rounded-lg">
                <p className="text-[18px] font-bold text-[var(--primary)]">{article.studyPlan.suggestedDailyNewWords}</p>
                <p className="text-[11px] text-[var(--text-tertiary)]">每日新词</p>
              </div>
              <div className="text-center p-2 bg-white rounded-lg">
                <p className="text-[18px] font-bold text-[var(--primary)]">{article.studyPlan.suggestedDailyReviewTarget}</p>
                <p className="text-[11px] text-[var(--text-tertiary)]">每日复习</p>
              </div>
              <div className="text-center p-2 bg-white rounded-lg">
                <p className="text-[18px] font-bold text-[var(--primary)]">{article.studyPlan.suggestedDailyMinutes}</p>
                <p className="text-[11px] text-[var(--text-tertiary)]">每日分钟</p>
              </div>
              <div className="text-center p-2 bg-white rounded-lg">
                <p className="text-[18px] font-bold text-[var(--primary)]">{article.studyPlan.estimatedDaysToComplete}</p>
                <p className="text-[11px] text-[var(--text-tertiary)]">预计天数</p>
              </div>
            </div>
            {article.studyPlan.focusAreas && article.studyPlan.focusAreas.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <span className="text-[12px] text-[var(--text-secondary)]">学习重点：</span>
                {article.studyPlan.focusAreas.map((area, idx) => (
                  <span key={idx} className="text-[11px] px-2 py-0.5 bg-[var(--primary-100)] text-[var(--primary-dark)] rounded-full">
                    {area}
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* AI 解析内容 */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-[13px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
            AI 解析结果
          </h3>
          <div className="flex gap-2 ml-auto">
            <span className="inline-flex items-center gap-1 text-[11px] text-[var(--text-tertiary)]">
              <span className="w-3 h-3 rounded-sm bg-gradient-to-r from-[#FEF3C7] to-[#FDE68A]" />
              核心词汇
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] text-[var(--text-tertiary)]">
              <span className="w-3 h-3 rounded-sm bg-gradient-to-r from-[var(--primary-100)] to-[#A7F3D0]" />
              句式结构
            </span>
          </div>
        </div>

        {/* 句子列表 */}
        <div className="card p-6 space-y-4">
          {article.sentences && article.sentences.length > 0 ? (
            article.sentences.map((sentence, index) => (
              <div key={index} className="sentence-item border-b border-[var(--border-light)] last:border-0 pb-4 last:pb-0">
                <div
                  className="flex items-start gap-3 group cursor-pointer"
                  onClick={() => toggleSentence(index)}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      speakText(sentence.english);
                    }}
                    className="mt-0.5 p-2 rounded-full hover:bg-[var(--primary-50)] text-[var(--text-tertiary)] hover:text-[var(--primary)] transition-colors shrink-0"
                    title="朗读"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                      <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                    </svg>
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] text-[var(--text-primary)] leading-relaxed">
                      {sentence.english}
                    </p>
                    <div
                      className={`overflow-hidden transition-all duration-300 ${
                        expandedSentences.has(index) ? "max-h-40 opacity-100 mt-2" : "max-h-0 opacity-0"
                      }`}
                    >
                      <p className="text-[14px] text-[var(--text-secondary)] pl-3 border-l-2 border-[var(--primary)]">
                        {sentence.chinese}
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] text-[var(--text-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    {expandedSentences.has(index) ? "收起" : "点击展开翻译"}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div>
              <div
                className="parsed-content"
                dangerouslySetInnerHTML={{ __html: article.parsedHtml }}
              />
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-[13px] text-amber-800">
                  <span className="font-medium">💡 提示：</span>
                  {article.sentences === undefined
                    ? "此内容为旧版本添加，没有句子翻译。如需翻译功能，请删除后重新添加。"
                    : "AI 未能正确解析句子翻译。请检查 Prompt 设置或重新添加内容。"}
                </p>
                {article.sentences !== undefined && (
                  <p className="text-[12px] text-amber-700 mt-1">
                    sentences 数组存在但为空，长度: {article.sentences?.length || 0}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 核心词汇 */}
      {vocabularies && vocabularies.length > 0 && (
        <section className="mb-8">
          <h3 className="text-[13px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-3">
            核心词汇（{vocabularies.length}）
          </h3>
          <div className="grid gap-2.5">
            {vocabularies.map((v) => (
              <div key={v.id} className="card p-4">
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span className="text-[15px] font-semibold text-[var(--text-primary)]">
                    {v.word}
                  </span>
                  {v.phonetic && (
                    <span className="text-[13px] text-[var(--text-tertiary)]">
                      {v.phonetic}
                    </span>
                  )}
                  <MasteryBadge mastery={v.mastery} />
                  <button
                    onClick={() => speakText(v.word)}
                    className="p-1 rounded-full hover:bg-[var(--primary-50)] text-[var(--text-tertiary)] hover:text-[var(--primary)] transition-colors"
                    title="朗读"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                      <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                    </svg>
                  </button>
                </div>
                <p className="text-[14px] text-[var(--text-secondary)] mt-1.5">
                  {v.definition}
                </p>
                {/* 例句1 */}
                {v.exampleSentence && (
                  <div className="mt-2 pl-3 border-l-2 border-[var(--border)]">
                    <p className="text-[13px] text-[var(--text-tertiary)] italic">
                      {v.exampleSentence}
                    </p>
                    {v.exampleSentenceChinese && (
                      <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">
                        {v.exampleSentenceChinese}
                      </p>
                    )}
                    <button
                      onClick={() => speakText(v.exampleSentence)}
                      className="mt-1 text-[11px] text-[var(--primary)] hover:underline flex items-center gap-1"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                      </svg>
                      朗读例句
                    </button>
                  </div>
                )}
                {/* 例句2 */}
                {v.exampleSentence2 && (
                  <div className="mt-2 pl-3 border-l-2 border-[var(--border)]">
                    <p className="text-[13px] text-[var(--text-tertiary)] italic">
                      {v.exampleSentence2}
                    </p>
                    {v.exampleSentence2Chinese && (
                      <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">
                        {v.exampleSentence2Chinese}
                      </p>
                    )}
                    <button
                      onClick={() => speakText(v.exampleSentence2 || "")}
                      className="mt-1 text-[11px] text-[var(--primary)] hover:underline flex items-center gap-1"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                      </svg>
                      朗读例句
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 核心句式 */}
      {patterns && patterns.length > 0 && (
        <section className="mb-8">
          <h3 className="text-[13px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-3">
            核心句式（{patterns.length}）
          </h3>
          <div className="grid gap-2.5">
            {patterns.map((p) => (
              <div key={p.id} className="card p-4">
                <div className="flex items-baseline gap-3 flex-wrap">
                  <p className="text-[15px] font-medium text-[var(--primary-dark)]">
                    {p.pattern}
                  </p>
                  <MasteryBadge mastery={p.mastery} />
                  <button
                    onClick={() => speakText(p.pattern)}
                    className="p-1 rounded-full hover:bg-[var(--primary-50)] text-[var(--text-tertiary)] hover:text-[var(--primary)] transition-colors"
                    title="朗读"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                      <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                    </svg>
                  </button>
                </div>
                <p className="text-[14px] text-[var(--text-secondary)] mt-1.5">
                  {p.explanation}
                </p>
                {/* 例句1 */}
                {p.exampleSentence && (
                  <div className="mt-2 pl-3 border-l-2 border-[var(--border)]">
                    <p className="text-[13px] text-[var(--text-tertiary)] italic">
                      {p.exampleSentence}
                    </p>
                    {p.exampleSentenceChinese && (
                      <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">
                        {p.exampleSentenceChinese}
                      </p>
                    )}
                    <button
                      onClick={() => speakText(p.exampleSentence)}
                      className="mt-1 text-[11px] text-[var(--primary)] hover:underline flex items-center gap-1"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                      </svg>
                      朗读例句
                    </button>
                  </div>
                )}
                {/* 例句2 */}
                {p.exampleSentence2 && (
                  <div className="mt-2 pl-3 border-l-2 border-[var(--border)]">
                    <p className="text-[13px] text-[var(--text-tertiary)] italic">
                      {p.exampleSentence2}
                    </p>
                    {p.exampleSentence2Chinese && (
                      <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">
                        {p.exampleSentence2Chinese}
                      </p>
                    )}
                    <button
                      onClick={() => speakText(p.exampleSentence2 || "")}
                      className="mt-1 text-[11px] text-[var(--primary)] hover:underline flex items-center gap-1"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                      </svg>
                      朗读例句
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function MasteryBadge({ mastery }: { mastery: number }) {
  const level =
    mastery >= 80
      ? { label: "已掌握", color: "bg-[var(--success-50)] text-green-700" }
      : mastery >= 40
        ? { label: "学习中", color: "bg-[var(--warning-50)] text-amber-700" }
        : { label: "待学习", color: "bg-[var(--bg-elevated)] text-[var(--text-tertiary)]" };

  return (
    <span
      className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${level.color}`}
    >
      {level.label}
    </span>
  );
}
