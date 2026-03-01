"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { db, getOrCreateTodayLog, isAIConfigured } from "@/lib/db";
import { analyzeContent } from "@/lib/ai";
import Link from "next/link";

interface BatchItem {
  id: number;
  title: string;
  content: string;
  status: "pending" | "parsing" | "completed" | "error";
  error?: string;
  result?: {
    articleId?: number;
    title?: string;
    tags?: string[];
    vocabCount: number;
    patternCount: number;
  };
}

export default function BatchAddPage() {
  const router = useRouter();
  const [items, setItems] = useState<BatchItem[]>([]);
  const [inputText, setInputText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [notConfigured, setNotConfigured] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });

  // 解析输入文本为多个条目
  const parseInput = useCallback(() => {
    if (!inputText.trim()) return;

    const lines = inputText.split("\n").map((l) => l.trim()).filter(Boolean);
    const newItems: BatchItem[] = [];
    let currentTitle = "";
    let currentContent: string[] = [];
    let itemId = 0;

    for (const line of lines) {
      // 如果行以 # 开头，认为是标题
      if (line.startsWith("#")) {
        // 保存之前的内容
        if (currentContent.length > 0) {
          newItems.push({
            id: itemId++,
            title: currentTitle || `内容 ${itemId}`,
            content: currentContent.join("\n"),
            status: "pending",
          });
          currentContent = [];
        }
        currentTitle = line.replace(/^#+\s*/, "").trim();
      } else {
        currentContent.push(line);
      }
    }

    // 保存最后一个
    if (currentContent.length > 0) {
      newItems.push({
        id: itemId++,
        title: currentTitle || `内容 ${itemId}`,
        content: currentContent.join("\n"),
        status: "pending",
      });
    }

    setItems(newItems);
    setProgress({ completed: 0, total: newItems.length });
  }, [inputText]);

  // 处理单个条目
  async function processItem(item: BatchItem): Promise<void> {
    try {
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: "parsing" } : i))
      );

      const data = await analyzeContent(item.content, 1);
      const now = new Date();

      const articleId = await db.articles.add({
        title: item.title || data.title || "未命名内容",
        content: item.content,
        parsedHtml: data.parsedHtml,
        sentences: data.sentences,
        studyPlan: undefined,
        createdAt: now,
        updatedAt: now,
      });

      let vocabCount = 0;
      let patternCount = 0;

      if (data.vocabularies?.length) {
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);

        const vocabRecords = data.vocabularies.map((v) => ({
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
        vocabCount = vocabRecords.length;
      }

      if (data.patterns?.length) {
        const patternTomorrow = new Date(now);
        patternTomorrow.setDate(patternTomorrow.getDate() + 1);
        patternTomorrow.setHours(0, 0, 0, 0);

        const patternRecords = data.patterns.map((p) => ({
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
        patternCount = patternRecords.length;
      }

      // 更新今日学习记录
      const log = await getOrCreateTodayLog();
      await db.dailyLogs.update(log.id!, {
        newWordsLearned: log.newWordsLearned + vocabCount,
        newPatternsLearned: log.newPatternsLearned + patternCount,
      });

      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? {
                ...i,
                status: "completed",
                result: {
                  articleId: articleId as number,
                  title: item.title || data.title,
                  tags: data.tags,
                  vocabCount,
                  patternCount,
                },
              }
            : i
        )
      );

      setProgress((prev) => ({ ...prev, completed: prev.completed + 1 }));
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "解析失败";
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, status: "error", error: errorMsg } : i
        )
      );
      setProgress((prev) => ({ ...prev, completed: prev.completed + 1 }));
    }
  }

  // 开始批量处理
  async function startBatchProcess() {
    const configured = await isAIConfigured();
    if (!configured) {
      setNotConfigured(true);
      return;
    }

    if (items.length === 0) return;

    setIsProcessing(true);
    setNotConfigured(false);

    // 串行处理，避免同时请求过多
    for (const item of items) {
      if (item.status === "pending") {
        await processItem(item);
      }
    }

    setIsProcessing(false);
  }

  // 移除单个条目
  function removeItem(id: number) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  // 清空所有
  function clearAll() {
    if (confirm("确定要清空所有待处理的条目吗？")) {
      setItems([]);
      setProgress({ completed: 0, total: 0 });
    }
  }

  const pendingCount = items.filter((i) => i.status === "pending").length;
  const completedCount = items.filter((i) => i.status === "completed").length;
  const errorCount = items.filter((i) => i.status === "error").length;

  return (
    <div className="max-w-4xl mx-auto fade-in">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-[22px] font-bold text-[var(--text-primary)]">
          批量添加内容
        </h2>
        <Link href="/articles/new" className="text-[13px] text-[var(--primary)] hover:underline">
          单个添加 →
        </Link>
      </div>
      <p className="text-[14px] text-[var(--text-secondary)] mb-6">
        一次性添加多篇内容，AI 会依次解析。使用 # 开头表示标题
      </p>

      {/* 输入区域 */}
      {items.length === 0 && (
        <div className="card p-5 mb-6">
          <label className="block text-[13px] font-medium text-[var(--text-primary)] mb-2">
            批量输入格式说明
          </label>
          <div className="text-[12px] text-[var(--text-secondary)] mb-4 p-3 bg-[var(--bg-elevated)] rounded-lg">
            <p className="mb-1">
              <code className="bg-[var(--bg-secondary)] px-1.5 py-0.5 rounded"># 标题</code> - 表示新内容的标题
            </p>
            <p>没有 # 开头的行会被合并到上一个标题的内容中</p>
          </div>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`# 第一篇文章标题
这里是第一篇文章的英语内容...
可以有多行

# 第二篇文章标题
这里是第二篇文章的英语内容...`}
            rows={16}
            className="input resize-y !leading-relaxed"
          />
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={parseInput}
              disabled={!inputText.trim()}
              className="btn-primary"
            >
              解析输入
            </button>
            <button
              onClick={() => setInputText("")}
              disabled={!inputText}
              className="btn-secondary"
            >
              清空
            </button>
          </div>
        </div>
      )}

      {/* 待处理列表 */}
      {items.length > 0 && (
        <div className="space-y-4">
          {/* 统计和操作栏 */}
          <div className="flex items-center justify-between p-4 bg-[var(--bg-elevated)] rounded-lg">
            <div className="flex items-center gap-4 text-[13px]">
              <span className="text-[var(--text-secondary)]">
                总计: <strong className="text-[var(--text-primary)]">{items.length}</strong>
              </span>
              <span className="text-amber-600">
                待处理: <strong>{pendingCount}</strong>
              </span>
              <span className="text-green-600">
                已完成: <strong>{completedCount}</strong>
              </span>
              {errorCount > 0 && (
                <span className="text-red-600">
                  失败: <strong>{errorCount}</strong>
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {!isProcessing && pendingCount > 0 && (
                <button onClick={startBatchProcess} className="btn-primary text-[13px]">
                  开始批量解析
                </button>
              )}
              {isProcessing && (
                <span className="text-[13px] text-[var(--text-secondary)]">
                  处理中... ({progress.completed}/{progress.total})
                </span>
              )}
              {!isProcessing && (
                <button onClick={clearAll} className="btn-secondary text-[13px]">
                  清空
                </button>
              )}
            </div>
          </div>

          {/* 进度条 */}
          {isProcessing && (
            <div className="w-full h-2 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--primary)] transition-all duration-300"
                style={{ width: `${(progress.completed / progress.total) * 100}%` }}
              />
            </div>
          )}

          {/* 条目列表 */}
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className={`card p-4 border-l-4 ${
                  item.status === "completed"
                    ? "border-l-green-500"
                    : item.status === "error"
                    ? "border-l-red-500"
                    : item.status === "parsing"
                    ? "border-l-amber-500"
                    : "border-l-[var(--border)]"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-[14px] font-medium text-[var(--text-primary)] truncate">
                        {item.title}
                      </h3>
                      {item.status === "completed" && (
                        <span className="text-[11px] px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                          ✓ 完成
                        </span>
                      )}
                      {item.status === "error" && (
                        <span className="text-[11px] px-2 py-0.5 bg-red-100 text-red-700 rounded-full">
                          ✗ 失败
                        </span>
                      )}
                      {item.status === "parsing" && (
                        <span className="text-[11px] px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full flex items-center gap-1">
                          <span className="w-3 h-3 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
                          解析中
                        </span>
                      )}
                      {item.status === "pending" && (
                        <span className="text-[11px] px-2 py-0.5 bg-[var(--bg-elevated)] text-[var(--text-tertiary)] rounded-full">
                          待处理
                        </span>
                      )}
                    </div>

                    {/* 内容预览 */}
                    <p className="text-[12px] text-[var(--text-tertiary)] line-clamp-2">
                      {item.content.slice(0, 100)}
                      {item.content.length > 100 ? "..." : ""}
                    </p>

                    {/* 结果信息 */}
                    {item.result && (
                      <div className="mt-2 flex items-center gap-3 text-[12px]">
                        {item.result.tags && item.result.tags.length > 0 && (
                          <div className="flex gap-1">
                            {item.result.tags.map((tag, idx) => (
                              <span
                                key={idx}
                                className="px-1.5 py-0.5 bg-[var(--primary-50)] text-[var(--primary-dark)] rounded"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                        <span className="text-[var(--text-secondary)]">
                          {item.result.vocabCount} 词汇 · {item.result.patternCount} 句式
                        </span>
                      </div>
                    )}

                    {/* 错误信息 */}
                    {item.error && (
                      <p className="mt-2 text-[12px] text-red-600">{item.error}</p>
                    )}
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex items-center gap-2">
                    {item.result?.articleId && (
                      <Link
                        href={`/articles/${item.result.articleId}`}
                        className="text-[12px] text-[var(--primary)] hover:underline"
                      >
                        查看
                      </Link>
                    )}
                    {item.status === "error" && (
                      <button
                        onClick={() => processItem(item)}
                        disabled={isProcessing}
                        className="text-[12px] text-[var(--primary)] hover:underline"
                      >
                        重试
                      </button>
                    )}
                    {!isProcessing && (
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-[12px] text-[var(--text-tertiary)] hover:text-red-500"
                      >
                        删除
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 完成后的操作 */}
          {completedCount === items.length && items.length > 0 && (
            <div className="flex items-center justify-center gap-4 pt-4">
              <Link href="/library" className="btn-primary">
                前往学习库
              </Link>
              <button
                onClick={() => {
                  setItems([]);
                  setInputText("");
                  setProgress({ completed: 0, total: 0 });
                }}
                className="btn-secondary"
              >
                继续添加
              </button>
            </div>
          )}
        </div>
      )}

      {notConfigured && (
        <div className="mt-6 p-4 bg-[var(--warning-50)] border border-amber-200 rounded-[var(--radius-md)] text-[13px]">
          <p className="font-medium text-amber-800 mb-1">⚠️ 尚未配置 AI 服务</p>
          <p className="text-amber-700 mb-2">
            需要先配置 API 地址和密钥才能使用 AI 解析功能。
          </p>
          <Link href="/settings" className="text-[var(--primary)] font-medium hover:underline">
            前往设置 →
          </Link>
        </div>
      )}
    </div>
  );
}
