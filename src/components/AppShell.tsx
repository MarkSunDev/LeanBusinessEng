"use client";

import { useState } from "react";
import Image from "next/image";
import { Sidebar } from "./Sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* 移动端遮罩 */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 侧边栏 - 桌面端固定，移动端滑出 */}
      <div
        className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 md:relative md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 移动端顶部栏 */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] bg-white">
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-[var(--radius-sm)] hover:bg-[var(--bg-elevated)] transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <div className="w-7 h-7 rounded-[var(--radius-sm)] border border-[var(--border-light)] bg-white flex items-center justify-center overflow-hidden">
            <Image src="/icon.png" alt="Chimera Logo" width={22} height={22} />
          </div>
          <span className="text-[15px] font-bold text-[var(--text-primary)]">Chimera</span>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="px-4 py-6 md:px-8 md:py-8 max-w-5xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
