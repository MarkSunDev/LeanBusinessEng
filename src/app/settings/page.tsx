"use client";

import { useState, useEffect, useRef } from "react";
import { db, getAppSettings } from "@/lib/db";
import {
  DEFAULT_ANALYZE_PROMPT,
  DEFAULT_EVALUATE_PROMPT,
  DEFAULT_MODEL,
  DEFAULT_BASE_URL,
} from "@/lib/prompts";
import {
  isFileSystemAccessSupported,
  selectBackupDirectory,
  getBackupDirectoryName,
  clearBackupSettings,
  performBackup,
  exportAllData,
  downloadBackupFile,
  importFromFile,
  initBackupState,
  getAutoSync,
  setAutoSync,
} from "@/lib/backup";
import type { AppSettings } from "@/types";

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  // 表单状态
  const [apiBaseURL, setApiBaseURL] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [analyzePrompt, setAnalyzePrompt] = useState("");
  const [evaluatePrompt, setEvaluatePrompt] = useState("");
  const [showKey, setShowKey] = useState(false);

  // 备份状态
  const [backupDirName, setBackupDirName] = useState<string | null>(null);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupMessage, setBackupMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [autoSync, setAutoSyncState] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getAppSettings().then((s) => {
      setSettings(s);
      setApiBaseURL(s.apiBaseURL);
      setApiKey(s.apiKey);
      setModel(s.model);
      setAnalyzePrompt(s.analyzePrompt);
      setEvaluatePrompt(s.evaluatePrompt);
    });

    // 初始化备份状态
    initBackupState();
    setBackupDirName(getBackupDirectoryName());
    setAutoSyncState(getAutoSync());
  }, []);

  async function handleSave() {
    if (!settings) return;
    setSaving(true);
    setSaved(false);
    setTestResult(null);

    await db.appSettings.update(settings.id!, {
      apiBaseURL: apiBaseURL.trim(),
      apiKey: apiKey.trim(),
      model: model.trim(),
      analyzePrompt,
      evaluatePrompt,
      updatedAt: new Date(),
    });

    setSettings({
      ...settings,
      apiBaseURL: apiBaseURL.trim(),
      apiKey: apiKey.trim(),
      model: model.trim(),
      analyzePrompt,
      evaluatePrompt,
    });

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: "We need to align our strategy.",
          apiBaseURL: apiBaseURL.trim(),
          apiKey: apiKey.trim(),
          model: model.trim(),
          systemPrompt: analyzePrompt,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.vocabularies?.length > 0) {
          setTestResult({ ok: true, message: "连接成功！AI 解析正常工作。" });
        } else {
          setTestResult({ ok: true, message: "连接成功，但 AI 未返回预期内容，请检查 Prompt。" });
        }
      } else {
        const data = await res.json().catch(() => ({}));
        setTestResult({
          ok: false,
          message: data.error || `请求失败 (HTTP ${res.status})，请检查 API 地址和密钥。`,
        });
      }
    } catch {
      setTestResult({ ok: false, message: "网络错误，请检查 API 地址是否可访问。" });
    } finally {
      setTesting(false);
    }
  }

  function handleResetPrompts() {
    setAnalyzePrompt(DEFAULT_ANALYZE_PROMPT);
    setEvaluatePrompt(DEFAULT_EVALUATE_PROMPT);
  }

  // 备份相关函数
  async function handleSelectBackupDir() {
    setBackupMessage(null);
    try {
      const success = await selectBackupDirectory();
      if (success) {
        setBackupDirName(getBackupDirectoryName());
        setBackupMessage({ type: "success", text: "备份目录已设置，初始备份已完成" });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "设置备份目录失败";
      setBackupMessage({ type: "error", text: message });
    }
  }

  function handleClearBackup() {
    clearBackupSettings();
    setBackupDirName(null);
    setBackupMessage({ type: "success", text: "备份设置已清除" });
  }

  async function handleManualBackup() {
    setIsBackingUp(true);
    setBackupMessage(null);
    try {
      const success = await performBackup();
      if (success) {
        setBackupMessage({ type: "success", text: "备份成功完成" });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "备份失败";
      setBackupMessage({ type: "error", text: message });
    } finally {
      setIsBackingUp(false);
    }
  }

  async function handleDownloadBackup() {
    setBackupMessage(null);
    try {
      const data = await exportAllData();
      downloadBackupFile(data);
      setBackupMessage({ type: "success", text: "备份文件已下载" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "导出失败";
      setBackupMessage({ type: "error", text: message });
    }
  }

  async function handleImportFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setBackupMessage(null);

    const result = await importFromFile(file);

    if (result.success) {
      setBackupMessage({
        type: "success",
        text: `导入成功：${result.stats?.articles || 0} 篇文章，${result.stats?.vocabularies || 0} 个词汇，${result.stats?.patterns || 0} 个句式`
      });
    } else {
      setBackupMessage({ type: "error", text: result.message });
    }

    setIsImporting(false);
    // 清空 input 以便可以再次选择同一文件
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleAutoSyncChange(enabled: boolean) {
    setAutoSyncState(enabled);
    setAutoSync(enabled);
  }

  if (!settings) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="inline-block w-6 h-6 border-2 border-[var(--primary)]/30 border-t-[var(--primary)] rounded-full animate-spin" />
      </div>
    );
  }

  const isConfigured = apiKey.trim() && apiBaseURL.trim();

  return (
    <div className="max-w-3xl mx-auto fade-in space-y-6">
      <div>
        <h2 className="text-[22px] font-bold text-[var(--text-primary)]">设置</h2>
        <p className="text-[14px] text-[var(--text-secondary)] mt-1">
          配置 AI 服务连接和自定义 Prompt
        </p>
      </div>

      {/* API 连接配置 */}
      <div className="card p-5">
        <h3 className="text-[15px] font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
          🔌 API 连接配置
          {isConfigured ? (
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[var(--success-50)] text-green-700">
              已配置
            </span>
          ) : (
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[var(--warning-50)] text-amber-700">
              未配置
            </span>
          )}
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-[var(--text-primary)] mb-1">
              API 地址 (Base URL)
            </label>
            <input
              type="url"
              value={apiBaseURL}
              onChange={(e) => setApiBaseURL(e.target.value)}
              placeholder={DEFAULT_BASE_URL}
              className="input"
            />
            <p className="text-[12px] text-[var(--text-tertiary)] mt-1">
              支持 OpenAI 官方地址或任何兼容的代理地址
            </p>
          </div>

          <div>
            <label className="block text-[13px] font-medium text-[var(--text-primary)] mb-1">
              API 密钥 (API Key)
            </label>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="input !pr-20"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[12px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] px-2 py-1 rounded transition-colors"
              >
                {showKey ? "隐藏" : "显示"}
              </button>
            </div>
            <p className="text-[12px] text-[var(--text-tertiary)] mt-1">
              密钥仅存储在你的浏览器本地，不会上传到任何服务器
            </p>
          </div>

          <div>
            <label className="block text-[13px] font-medium text-[var(--text-primary)] mb-1">
              模型名称
            </label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={DEFAULT_MODEL}
              className="input"
            />
            <p className="text-[12px] text-[var(--text-tertiary)] mt-1">
              常用模型：gpt-4o、gpt-4o-mini、gemini-2.5-flash、claude-sonnet-4-6 等
            </p>
          </div>

          {/* 测试连接 */}
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handleTest}
              disabled={testing || !isConfigured}
              className="btn-secondary"
            >
              {testing ? (
                <>
                  <span className="inline-block w-3.5 h-3.5 border-2 border-[var(--text-tertiary)]/30 border-t-[var(--text-tertiary)] rounded-full animate-spin" />
                  测试中...
                </>
              ) : (
                "测试连接"
              )}
            </button>
            {testResult && (
              <span
                className={`text-[13px] ${
                  testResult.ok ? "text-green-600" : "text-red-600"
                }`}
              >
                {testResult.ok ? "✅" : "❌"} {testResult.message}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 数据备份 */}
      <div className="card p-5">
        <h3 className="text-[15px] font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
          💾 数据备份
          {backupDirName && (
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[var(--success-50)] text-green-700">
              已启用
            </span>
          )}
        </h3>

        <p className="text-[13px] text-[var(--text-secondary)] mb-4">
          将学习数据备份到本地文件夹，防止浏览器缓存清除导致数据丢失。
          支持 macOS 12+ 和 Windows 10/11 的 Chrome/Edge 浏览器。
        </p>

        {!isFileSystemAccessSupported() && (
          <div className="p-3.5 bg-[var(--warning-50)] border border-amber-200 rounded-[var(--radius-md)] text-[13px] text-amber-700 mb-4">
            ⚠️ 您的浏览器不支持自动备份功能。请使用 Chrome、Edge 或 Safari 16+ 以获得最佳体验。
          </div>
        )}

        <div className="space-y-4">
          {/* 备份目录状态 */}
          <div className="flex items-center justify-between p-3 bg-[var(--bg-elevated)] rounded-lg">
            <div>
              <p className="text-[13px] font-medium text-[var(--text-primary)]">
                备份目录
              </p>
              <p className="text-[12px] text-[var(--text-tertiary)]">
                {backupDirName || "未设置"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {backupDirName ? (
                <>
                  <button
                    onClick={handleManualBackup}
                    disabled={isBackingUp}
                    className="btn-secondary text-[12px]"
                  >
                    {isBackingUp ? "备份中..." : "立即备份"}
                  </button>
                  <button
                    onClick={handleClearBackup}
                    className="text-[12px] text-[var(--text-tertiary)] hover:text-red-500 px-2"
                  >
                    清除
                  </button>
                </>
              ) : (
                <button
                  onClick={handleSelectBackupDir}
                  disabled={!isFileSystemAccessSupported()}
                  className="btn-primary text-[12px]"
                >
                  选择文件夹
                </button>
              )}
            </div>
          </div>

          {/* 自动同步开关 */}
          {backupDirName && (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-medium text-[var(--text-primary)]">
                  自动同步
                </p>
                <p className="text-[12px] text-[var(--text-tertiary)]">
                  数据变更后自动备份到本地
                </p>
              </div>
              <button
                onClick={() => handleAutoSyncChange(!autoSync)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  autoSync ? "bg-[var(--primary)]" : "bg-[var(--bg-elevated)]"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    autoSync ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          )}

          {/* 手动导出/导入 */}
          <div className="border-t border-[var(--border)] pt-4">
            <p className="text-[13px] font-medium text-[var(--text-primary)] mb-3">
              手动备份
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleDownloadBackup}
                className="btn-secondary text-[12px]"
              >
                下载备份文件
              </button>
              <label className="btn-secondary text-[12px] cursor-pointer">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleImportFile}
                  disabled={isImporting}
                  className="hidden"
                />
                {isImporting ? "导入中..." : "从文件导入"}
              </label>
            </div>
          </div>

          {/* 消息提示 */}
          {backupMessage && (
            <div
              className={`p-3 rounded-[var(--radius-md)] text-[13px] ${
                backupMessage.type === "success"
                  ? "bg-[var(--success-50)] text-green-700 border border-green-200"
                  : "bg-[var(--error-50)] text-red-700 border border-red-200"
              }`}
            >
              {backupMessage.type === "success" ? "✅" : "❌"} {backupMessage.text}
            </div>
          )}
        </div>
      </div>

      {/* Prompt 配置 */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[15px] font-semibold text-[var(--text-primary)] flex items-center gap-2">
            ✨ Prompt 配置
          </h3>
          <button
            onClick={handleResetPrompts}
            className="text-[12px] text-[var(--text-tertiary)] hover:text-[var(--accent)] transition-colors"
          >
            恢复默认
          </button>
        </div>

        <p className="text-[13px] text-[var(--text-secondary)] mb-4">
          自定义 AI 的行为方式。修改 Prompt 可以调整解析风格、反馈语气等。
        </p>

        <div className="space-y-5">
          <div>
            <label className="block text-[13px] font-medium text-[var(--text-primary)] mb-1">
              内容解析 Prompt
            </label>
            <p className="text-[12px] text-[var(--text-tertiary)] mb-2">
              当你添加新内容时，AI 使用此 Prompt 来解析词汇和句式
            </p>
            <textarea
              value={analyzePrompt}
              onChange={(e) => setAnalyzePrompt(e.target.value)}
              rows={12}
              className="input resize-y !text-[13px] !leading-relaxed font-mono"
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-[var(--text-primary)] mb-1">
              测验评判 Prompt
            </label>
            <p className="text-[12px] text-[var(--text-tertiary)] mb-2">
              测验时，AI 使用此 Prompt 来评判你的造句是否正确
            </p>
            <textarea
              value={evaluatePrompt}
              onChange={(e) => setEvaluatePrompt(e.target.value)}
              rows={10}
              className="input resize-y !text-[13px] !leading-relaxed font-mono"
            />
          </div>
        </div>
      </div>

      {/* 保存按钮 - 固定在底部 */}
      <div className="sticky bottom-4 flex items-center gap-3 p-4 bg-white/80 backdrop-blur-sm rounded-[var(--radius-lg)] border border-[var(--border)] shadow-lg">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary"
        >
          {saving ? "保存中..." : "保存所有设置"}
        </button>
        {saved && (
          <span className="text-[13px] text-green-600 flex items-center gap-1">
            ✅ 已保存
          </span>
        )}
        <div className="flex-1" />
        <p className="text-[11px] text-[var(--text-tertiary)]">
          所有数据仅存储在你的浏览器中
        </p>
      </div>
    </div>
  );
}
