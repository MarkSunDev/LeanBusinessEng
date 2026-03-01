"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { db, getStreakDays } from "@/lib/db";
import { useState, useEffect } from "react";

const navItems = [
  { href: "/", label: "学习主页", icon: "🏠" },
  { href: "/articles/new", label: "添加内容", icon: "📝" },
  { href: "/review", label: "每日复习", icon: "🔄" },
  { href: "/quiz", label: "练习测验", icon: "💡" },
  { href: "/plan", label: "学习计划", icon: "📅" },
  { href: "/settings", label: "设置", icon: "⚙️" },
];

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const [streak, setStreak] = useState(0);

  const todayReviewCount = useLiveQuery(async () => {
    const now = new Date();
    const vocabCount = await db.vocabularies
      .where("nextReviewAt")
      .belowOrEqual(now)
      .count();
    const patternCount = await db.sentencePatterns
      .where("nextReviewAt")
      .belowOrEqual(now)
      .count();
    return vocabCount + patternCount;
  });

  useEffect(() => {
    getStreakDays().then(setStreak);
  }, []);

  return (
    <aside className="w-[240px] shrink-0 bg-white border-r border-[var(--border)] flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[var(--border-light)]">
        <Link href="/" onClick={onClose} className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-[var(--radius-md)] bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] flex items-center justify-center text-white text-lg font-bold">
            L
          </div>
          <div>
            <h1 className="text-[15px] font-bold text-[var(--text-primary)] leading-tight">
              LeanBizEng
            </h1>
            <p className="text-[11px] text-[var(--text-tertiary)] leading-tight">
              职场英语学习助手
            </p>
          </div>
        </Link>
      </div>

      {/* 连续学习 */}
      {streak > 0 && (
        <div className="mx-4 mt-4 px-3 py-2.5 bg-[var(--accent-50)] rounded-[var(--radius-md)] flex items-center gap-2">
          <span className="streak-flame text-lg">🔥</span>
          <div>
            <p className="text-[12px] font-semibold text-[var(--accent)]">
              连续学习 {streak} 天
            </p>
            <p className="text-[11px] text-[var(--text-tertiary)]">继续保持!</p>
          </div>
        </div>
      )}

      {/* 导航 */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          const showBadge =
            item.href === "/review" && (todayReviewCount ?? 0) > 0;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)] text-[14px] transition-all duration-200 group ${
                isActive
                  ? "bg-[var(--primary-50)] text-[var(--primary-dark)] font-medium"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
              }`}
            >
              <span className="text-[18px] transition-transform duration-200 group-hover:scale-110">
                {item.icon}
              </span>
              <span className="flex-1">{item.label}</span>
              {showBadge && (
                <span className="min-w-[20px] h-5 px-1.5 bg-[var(--accent)] text-white text-[11px] font-semibold rounded-full flex items-center justify-center">
                  {todayReviewCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* 底部 */}
      <div className="px-5 py-4 border-t border-[var(--border-light)]">
        <p className="text-[11px] text-[var(--text-tertiary)]">
          v1.0 · 本地模式 · 数据存储于浏览器
        </p>
      </div>
    </aside>
  );
}
