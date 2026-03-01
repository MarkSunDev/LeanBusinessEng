"use client";

import { useState } from "react";
import Image from "next/image";

interface VersionHistory {
  version: string;
  date: string;
  changes: string[];
}

const versionHistory: VersionHistory[] = [
  {
    version: "1.1.0",
    date: "2026-03-02",
    changes: [
      "新增批量添加内容功能，支持串行解析多篇内容",
      "AI 解析时自动生成标题和标签",
      "添加数据备份功能，支持自动同步到本地文件夹",
      "优化添加内容流程，解析后直接保存",
      "修复学习库搜索栏重叠问题",
    ],
  },
  {
    version: "1.0.0",
    date: "2026-02-20",
    changes: [
      "初始版本发布",
      "AI 内容解析与核心词汇提取",
      "间隔重复复习系统（SM-2 算法）",
      "造句测验与 AI 评判",
      "学习库管理",
      "学习计划与进度追踪",
      "语音朗读功能",
    ],
  },
];

const slogans = [
  "从工作中学习，在学习中成长",
  "让每一封邮件都成为进步的机会",
  "职场英语，情境化学习",
  "科学记忆，高效掌握",
  "你的个人英语学习助手",
];

export default function AboutPage() {
  const [showHistory, setShowHistory] = useState(false);
  const randomSlogan = slogans[Math.floor(Math.random() * slogans.length)];

  return (
    <div className="max-w-2xl mx-auto fade-in">
      {/* 头部 */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 mx-auto mb-4 rounded-[var(--radius-lg)] border border-[var(--border-light)] bg-white flex items-center justify-center overflow-hidden">
          <Image src="/icon.png" alt="Chimera Logo" width={64} height={64} />
        </div>
        <h1 className="text-[24px] font-bold text-[var(--text-primary)] mb-2">
          Chimera
        </h1>
        <p className="text-[16px] text-[var(--text-secondary)] italic">
          "{randomSlogan}"
        </p>
      </div>

      {/* 版本信息 */}
      <div className="card p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[18px] font-semibold text-[var(--text-primary)]">
            版本信息
          </h2>
          <span className="text-[14px] px-3 py-1 bg-[var(--primary-50)] text-[var(--primary-dark)] rounded-full font-medium">
            v1.1.0
          </span>
        </div>

        <div className="space-y-3 text-[14px]">
          <div className="flex justify-between">
            <span className="text-[var(--text-secondary)]">当前版本</span>
            <span className="text-[var(--text-primary)] font-medium">v1.1.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-secondary)]">发布日期</span>
            <span className="text-[var(--text-primary)]">2026年3月2日</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-secondary)]">运行模式</span>
            <span className="text-[var(--text-primary)]">本地浏览器模式</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-secondary)]">数据存储</span>
            <span className="text-[var(--text-primary)]">IndexedDB（浏览器本地）</span>
          </div>
        </div>
      </div>

      {/* 功能特色 */}
      <div className="card p-6 mb-6">
        <h2 className="text-[18px] font-semibold text-[var(--text-primary)] mb-4">
          核心功能
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-[var(--bg-elevated)] rounded-lg">
            <div className="text-2xl mb-2">📝</div>
            <h3 className="text-[14px] font-medium text-[var(--text-primary)] mb-1">
              AI 内容解析
            </h3>
            <p className="text-[12px] text-[var(--text-secondary)]">
              自动提取核心词汇和句式
            </p>
          </div>
          <div className="p-4 bg-[var(--bg-elevated)] rounded-lg">
            <div className="text-2xl mb-2">🔄</div>
            <h3 className="text-[14px] font-medium text-[var(--text-primary)] mb-1">
              间隔重复
            </h3>
            <p className="text-[12px] text-[var(--text-secondary)]">
              基于 SM-2 算法的科学复习
            </p>
          </div>
          <div className="p-4 bg-[var(--bg-elevated)] rounded-lg">
            <div className="text-2xl mb-2">💡</div>
            <h3 className="text-[14px] font-medium text-[var(--text-primary)] mb-1">
              造句测验
            </h3>
            <p className="text-[12px] text-[var(--text-secondary)]">
              AI 实时评判造句质量
            </p>
          </div>
          <div className="p-4 bg-[var(--bg-elevated)] rounded-lg">
            <div className="text-2xl mb-2">💾</div>
            <h3 className="text-[14px] font-medium text-[var(--text-primary)] mb-1">
              数据备份
            </h3>
            <p className="text-[12px] text-[var(--text-secondary)]">
              本地文件夹自动同步
            </p>
          </div>
        </div>
      </div>

      {/* 版本历史 */}
      <div className="card p-6">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="w-full flex items-center justify-between"
        >
          <h2 className="text-[18px] font-semibold text-[var(--text-primary)]">
            版本历史
          </h2>
          <span className="text-[var(--text-tertiary)]">
            {showHistory ? "▼" : "▶"}
          </span>
        </button>

        {showHistory && (
          <div className="mt-4 space-y-4">
            {versionHistory.map((version) => (
              <div
                key={version.version}
                className="border-l-2 border-[var(--primary)] pl-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[14px] font-semibold text-[var(--text-primary)]">
                    v{version.version}
                  </span>
                  <span className="text-[12px] text-[var(--text-tertiary)]">
                    {version.date}
                  </span>
                </div>
                <ul className="space-y-1">
                  {version.changes.map((change, index) => (
                    <li
                      key={index}
                      className="text-[13px] text-[var(--text-secondary)] flex items-start gap-2"
                    >
                      <span className="text-[var(--primary)] mt-1">•</span>
                      {change}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 底部信息 */}
      <div className="text-center mt-8 text-[12px] text-[var(--text-tertiary)]">
        <p>Made with ❤️ for English learners</p>
        <p className="mt-1">© 2026 Chimera</p>
      </div>
    </div>
  );
}
