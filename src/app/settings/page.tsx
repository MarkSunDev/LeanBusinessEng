"use client";

import { useState, useEffect } from "react";
import { db, getAppSettings } from "@/lib/db";
import {
  DEFAULT_ANALYZE_PROMPT,
  DEFAULT_EVALUATE_PROMPT,
  DEFAULT_MODEL,
  DEFAULT_BASE_URL,
} from "@/lib/prompts";
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

  useEffect(() => {
    getAppSettings().then((s) => {
      setSettings(s);
      setApiBaseURL(s.apiBaseURL);
      setApiKey(s.apiKey);
      setModel(s.model);
      setAnalyzePrompt(s.analyzePrompt);
      setEvaluatePrompt(s.evaluatePrompt);
    });
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
