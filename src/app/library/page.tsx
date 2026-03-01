"use client";

import { useState, useEffect, useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import Link from "next/link";
import type { Article, Vocabulary, SentencePattern } from "@/types";
import { speakText, preloadVoices } from "@/lib/tts";

type TabType = "all" | "vocabularies" | "patterns";

export default function LibraryPage() {
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSentences, setExpandedSentences] = useState<Set<number>>(new Set());

  const articles = useLiveQuery(() =>
    db.articles.orderBy("createdAt").reverse().toArray()
  );
  const vocabularies = useLiveQuery(() =>
    db.vocabularies.toArray()
  );
  const patterns = useLiveQuery(() =>
    db.sentencePatterns.toArray()
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

  // 过滤功能
  const filteredArticles = articles?.filter(article =>
    article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredVocabularies = vocabularies?.filter(v =>
    v.word.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.definition.includes(searchQuery)
  );

  const filteredPatterns = patterns?.filter(p =>
    p.pattern.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.explanation.includes(searchQuery)
  );

  const totalCount = (articles?.length || 0) + (vocabularies?.length || 0) + (patterns?.length || 0);

  return (
    <div className="max-w-4xl mx-auto fade-in space-y-6">
      {/* 页面标题 */}
      <div>
        <h2 className="text-[22px] font-bold text-[var(--text-primary)]">
          学习库
        </h2>
        <p className="text-[14px] text-[var(--text-secondary)] mt-1">
          管理你的全部学习内容、核心词汇和句式
        </p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={() => setActiveTab("all")}
          className={`card p-4 text-left transition-all ${activeTab === "all" ? "ring-2 ring-[var(--primary)]" : ""}`}
        >
          <p className="text-[12px] text-[var(--text-tertiary)]">全部内容</p>
          <p className="text-[24px] font-bold text-[var(--text-primary)] mt-1">{totalCount}</p>
        </button>
        <button
          onClick={() => setActiveTab("vocabularies")}
          className={`card p-4 text-left transition-all ${activeTab === "vocabularies" ? "ring-2 ring-[var(--primary)]" : ""}`}
        >
          <p className="text-[12px] text-[var(--text-tertiary)]">核心词汇</p>
          <p className="text-[24px] font-bold text-[var(--primary)] mt-1">{vocabularies?.length || 0}</p>
        </button>
        <button
          onClick={() => setActiveTab("patterns")}
          className={`card p-4 text-left transition-all ${activeTab === "patterns" ? "ring-2 ring-[var(--primary)]" : ""}`}
        >
          <p className="text-[12px] text-[var(--text-tertiary)]">核心句式</p>
          <p className="text-[24px] font-bold text-[var(--accent)] mt-1">{patterns?.length || 0}</p>
        </button>
      </div>

      {/* 搜索栏 */}
      <div className="relative">
        <input
          type="text"
          placeholder="搜索内容、词汇或句式..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input pl-10"
        />
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]"
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8"></circle>
          <path d="m21 21-4.3-4.3"></path>
        </svg>
      </div>

      {/* Tab 切换 */}
      <div className="flex gap-2 border-b border-[var(--border)]">
        <button
          onClick={() => setActiveTab("all")}
          className={`px-4 py-2 text-[14px] font-medium transition-colors relative ${
            activeTab === "all"
              ? "text-[var(--primary)]"
              : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
          }`}
        >
          全部内容
          {activeTab === "all" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--primary)] rounded-t-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("vocabularies")}
          className={`px-4 py-2 text-[14px] font-medium transition-colors relative ${
            activeTab === "vocabularies"
              ? "text-[var(--primary)]"
              : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
          }`}
        >
          核心词汇
          {activeTab === "vocabularies" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--primary)] rounded-t-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("patterns")}
          className={`px-4 py-2 text-[14px] font-medium transition-colors relative ${
            activeTab === "patterns"
              ? "text-[var(--primary)]"
              : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
          }`}
        >
          核心句式
          {activeTab === "patterns" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--primary)] rounded-t-full" />
          )}
        </button>
      </div>

      {/* 内容列表 */}
      <div className="space-y-4">
        {/* 全部内容 - 按文章分组 */}
        {(activeTab === "all" || activeTab === "vocabularies" || activeTab === "patterns") && activeTab === "all" && (
          <>
            {filteredArticles && filteredArticles.length > 0 ? (
              filteredArticles.map((article) => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  vocabularies={vocabularies?.filter(v => v.articleId === article.id) || []}
                  patterns={patterns?.filter(p => p.articleId === article.id) || []}
                  expandedSentences={expandedSentences}
                  toggleSentence={toggleSentence}
                />
              ))
            ) : searchQuery ? (
              <EmptyState message="没有找到匹配的内容" />
            ) : (
              <EmptyState
                message="还没有学习内容"
                action={
                  <Link href="/articles/new" className="btn-primary text-[13px]">
                    添加第一篇内容
                  </Link>
                }
              />
            )}
          </>
        )}

        {/* 核心词汇列表 */}
        {activeTab === "vocabularies" && (
          <>
            {filteredVocabularies && filteredVocabularies.length > 0 ? (
              <div className="grid gap-2.5">
                {filteredVocabularies.map((v) => (
                  <VocabularyCard key={v.id} vocabulary={v} />
                ))}
              </div>
            ) : searchQuery ? (
              <EmptyState message="没有找到匹配的词汇" />
            ) : (
              <EmptyState message="还没有核心词汇" />
            )}
          </>
        )}

        {/* 核心句式列表 */}
        {activeTab === "patterns" && (
          <>
            {filteredPatterns && filteredPatterns.length > 0 ? (
              <div className="grid gap-2.5">
                {filteredPatterns.map((p) => (
                  <PatternCard key={p.id} pattern={p} />
                ))}
              </div>
            ) : searchQuery ? (
              <EmptyState message="没有找到匹配的句式" />
            ) : (
              <EmptyState message="还没有核心句式" />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// 文章卡片组件
function ArticleCard({
  article,
  vocabularies,
  patterns,
  expandedSentences,
  toggleSentence
}: {
  article: Article;
  vocabularies: Vocabulary[];
  patterns: SentencePattern[];
  expandedSentences: Set<number>;
  toggleSentence: (index: number) => void;
}) {
  return (
    <div className="card p-5">
      <Link href={`/articles/${article.id}`}>
        <h3 className="text-[16px] font-semibold text-[var(--text-primary)] hover:text-[var(--primary)] transition-colors">
          {article.title}
        </h3>
      </Link>
      <p className="text-[12px] text-[var(--text-tertiary)] mt-1">
        添加于 {new Date(article.createdAt).toLocaleDateString("zh-CN")} ·
        {vocabularies.length} 个词汇 · {patterns.length} 个句式
      </p>

      {/* 句子列表 */}
      {article.sentences && article.sentences.length > 0 && (
        <div className="mt-4 space-y-3">
          {article.sentences.slice(0, 3).map((sentence, index) => (
            <div key={index} className="sentence-item">
              <div
                className="flex items-start gap-2 group cursor-pointer"
                onClick={() => toggleSentence(index)}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    speakText(sentence.english);
                  }}
                  className="mt-0.5 p-1 rounded-full hover:bg-[var(--primary-50)] text-[var(--text-tertiary)] hover:text-[var(--primary)] transition-colors"
                  title="朗读"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                  </svg>
                </button>
                <div className="flex-1">
                  <p className="text-[14px] text-[var(--text-primary)] leading-relaxed">
                    {sentence.english}
                  </p>
                  <div
                    className={`overflow-hidden transition-all duration-300 ${
                      expandedSentences.has(index) ? "max-h-40 opacity-100 mt-1.5" : "max-h-0 opacity-0"
                    }`}
                  >
                    <p className="text-[13px] text-[var(--text-secondary)] pl-3 border-l-2 border-[var(--primary)]">
                      {sentence.chinese}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {article.sentences.length > 3 && (
            <Link
              href={`/articles/${article.id}`}
              className="text-[13px] text-[var(--primary)] hover:underline"
            >
              查看全部 {article.sentences.length} 个句子 →
            </Link>
          )}
        </div>
      )}

      {/* 词汇和句式预览 */}
      <div className="mt-4 flex flex-wrap gap-2">
        {vocabularies.slice(0, 3).map((v) => (
          <span
            key={v.id}
            className="text-[11px] px-2 py-1 bg-[#FEF3C7] text-amber-800 rounded-full"
          >
            {v.word}
          </span>
        ))}
        {patterns.slice(0, 2).map((p) => (
          <span
            key={p.id}
            className="text-[11px] px-2 py-1 bg-[var(--primary-100)] text-[var(--primary-dark)] rounded-full"
          >
            {p.pattern.length > 20 ? p.pattern.slice(0, 20) + "..." : p.pattern}
          </span>
        ))}
      </div>
    </div>
  );
}

// 词汇卡片组件
function VocabularyCard({ vocabulary }: { vocabulary: Vocabulary }) {
  return (
    <div className="card p-4">
      <div className="flex items-baseline gap-3 flex-wrap">
        <span className="text-[16px] font-semibold text-[var(--text-primary)]">
          {vocabulary.word}
        </span>
        {vocabulary.phonetic && (
          <span className="text-[13px] text-[var(--text-tertiary)]">
            {vocabulary.phonetic}
          </span>
        )}
        <MasteryBadge mastery={vocabulary.mastery} />
        <button
          onClick={() => speakText(vocabulary.word)}
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
        {vocabulary.definition}
      </p>
      {vocabulary.exampleSentence && (
        <div className="mt-2 pl-3 border-l-2 border-[var(--border)]">
          <p className="text-[13px] text-[var(--text-tertiary)] italic">
            {vocabulary.exampleSentence}
          </p>
          <button
            onClick={() => speakText(vocabulary.exampleSentence)}
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
  );
}

// 句式卡片组件
function PatternCard({ pattern }: { pattern: SentencePattern }) {
  return (
    <div className="card p-4">
      <div className="flex items-baseline gap-3 flex-wrap">
        <p className="text-[16px] font-medium text-[var(--primary-dark)]">
          {pattern.pattern}
        </p>
        <MasteryBadge mastery={pattern.mastery} />
        <button
          onClick={() => speakText(pattern.pattern)}
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
        {pattern.explanation}
      </p>
      {pattern.exampleSentence && (
        <div className="mt-2 pl-3 border-l-2 border-[var(--border)]">
          <p className="text-[13px] text-[var(--text-tertiary)] italic">
            {pattern.exampleSentence}
          </p>
          <button
            onClick={() => speakText(pattern.exampleSentence)}
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
  );
}

// 掌握程度徽章
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

// 空状态组件
function EmptyState({ message, action }: { message: string; action?: React.ReactNode }) {
  return (
    <div className="card text-center py-12 border-dashed">
      <p className="text-3xl mb-3">📚</p>
      <p className="text-[14px] text-[var(--text-secondary)] mb-1">
        {message}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
