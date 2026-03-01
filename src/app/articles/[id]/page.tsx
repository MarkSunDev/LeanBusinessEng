"use client";

import { use } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import Link from "next/link";

export default function ArticleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const articleId = Number(id);

  const article = useLiveQuery(() => db.articles.get(articleId), [articleId]);
  const vocabularies = useLiveQuery(
    () => db.vocabularies.where("articleId").equals(articleId).toArray(),
    [articleId]
  );
  const patterns = useLiveQuery(
    () => db.sentencePatterns.where("articleId").equals(articleId).toArray(),
    [articleId]
  );

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

  return (
    <div className="max-w-4xl mx-auto fade-in">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-[13px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] mb-5 transition-colors"
      >
        ← 返回主页
      </Link>

      <h2 className="text-[22px] font-bold text-[var(--text-primary)] mb-1">
        {article.title}
      </h2>
      <p className="text-[12px] text-[var(--text-tertiary)] mb-6">
        添加于 {new Date(article.createdAt).toLocaleDateString("zh-CN")}
      </p>

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
        <div
          className="parsed-content card p-6"
          dangerouslySetInnerHTML={{ __html: article.parsedHtml }}
        />
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
                </div>
                <p className="text-[14px] text-[var(--text-secondary)] mt-1.5">
                  {v.definition}
                </p>
                {v.exampleSentence && (
                  <p className="text-[13px] text-[var(--text-tertiary)] mt-2 italic pl-3 border-l-2 border-[var(--border)]">
                    {v.exampleSentence}
                  </p>
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
                </div>
                <p className="text-[14px] text-[var(--text-secondary)] mt-1.5">
                  {p.explanation}
                </p>
                {p.exampleSentence && (
                  <p className="text-[13px] text-[var(--text-tertiary)] mt-2 italic pl-3 border-l-2 border-[var(--border)]">
                    {p.exampleSentence}
                  </p>
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
