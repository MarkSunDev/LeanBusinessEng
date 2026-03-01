import { getAppSettings } from "@/lib/db";

/** 调用 AI 解析内容 */
export async function analyzeContent(content: string) {
  const settings = await getAppSettings();

  if (!settings.apiKey || !settings.apiBaseURL) {
    throw new Error("请先在设置中配置 API 地址和密钥");
  }

  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content,
      apiBaseURL: settings.apiBaseURL,
      apiKey: settings.apiKey,
      model: settings.model,
      systemPrompt: settings.analyzePrompt,
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `AI 解析失败 (HTTP ${res.status})`);
  }

  return res.json();
}

/** 调用 AI 评判测验 */
export async function evaluateAnswer(prompt: string, userAnswer: string) {
  const settings = await getAppSettings();

  if (!settings.apiKey || !settings.apiBaseURL) {
    throw new Error("请先在设置中配置 API 地址和密钥");
  }

  const res = await fetch("/api/evaluate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      userAnswer,
      apiBaseURL: settings.apiBaseURL,
      apiKey: settings.apiKey,
      model: settings.model,
      systemPrompt: settings.evaluatePrompt,
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `AI 评估失败 (HTTP ${res.status})`);
  }

  return res.json();
}
