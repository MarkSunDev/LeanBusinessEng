import { getAppSettings } from "@/lib/db";
import { DEFAULT_STUDY_PLAN_PROMPT } from "@/lib/prompts";

const DEFAULT_TIMEOUT = 60000; // 60秒超时

/** 带超时的 fetch */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout = DEFAULT_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("请求超时，请重试");
    }
    throw error;
  }
}

/** 调用 AI 解析内容（带超时） */
export async function analyzeContent(content: string, retryCount = 0): Promise<{
  parsedHtml: string;
  sentences: Array<{ index: number; english: string; chinese: string }>;
  vocabularies: Array<{
    word: string;
    definition: string;
    phonetic: string;
    exampleSentence: string;
    exampleSentenceChinese?: string;
    exampleSentence2?: string;
    exampleSentence2Chinese?: string;
  }>;
  patterns: Array<{
    pattern: string;
    explanation: string;
    exampleSentence: string;
    exampleSentenceChinese?: string;
    exampleSentence2?: string;
    exampleSentence2Chinese?: string;
  }>;
}> {
  const settings = await getAppSettings();

  if (!settings.apiKey || !settings.apiBaseURL) {
    throw new Error("请先在设置中配置 API 地址和密钥");
  }

  try {
    const res = await fetchWithTimeout("/api/analyze", {
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

    const data = await res.json();

    // 验证 sentences 是否存在且不为空
    if (!data.sentences || data.sentences.length === 0) {
      throw new Error("AI 未能正确解析句子，请重试");
    }

    return data;
  } catch (error) {
    if (retryCount > 0) {
      console.log(`Retrying... attempts left: ${retryCount}`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return analyzeContent(content, retryCount - 1);
    }
    throw error;
  }
}

/** 调用 AI 生成学习计划（单独步骤） */
export async function generateStudyPlan(content: string, vocabulariesCount: number, patternsCount: number): Promise<{
  suggestedDailyNewWords: number;
  suggestedDailyReviewTarget: number;
  suggestedDailyMinutes: number;
  estimatedDaysToComplete: number;
  difficulty: "简单" | "中等" | "困难";
  focusAreas: string[];
}> {
  const settings = await getAppSettings();

  if (!settings.apiKey || !settings.apiBaseURL) {
    throw new Error("请先在设置中配置 API 地址和密钥");
  }

  const promptContent = `Content: ${content}\n\nVocabularies count: ${vocabulariesCount}\nPatterns count: ${patternsCount}`;

  const res = await fetchWithTimeout("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: promptContent,
      apiBaseURL: settings.apiBaseURL,
      apiKey: settings.apiKey,
      model: settings.model,
      systemPrompt: DEFAULT_STUDY_PLAN_PROMPT,
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `生成学习计划失败 (HTTP ${res.status})`);
  }

  return res.json();
}

/** 调用 AI 评判测验（带超时） */
export async function evaluateAnswer(prompt: string, userAnswer: string, retryCount = 0): Promise<{
  isCorrect: boolean;
  message: string;
}> {
  const settings = await getAppSettings();

  if (!settings.apiKey || !settings.apiBaseURL) {
    throw new Error("请先在设置中配置 API 地址和密钥");
  }

  try {
    const res = await fetchWithTimeout("/api/evaluate", {
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
  } catch (error) {
    if (retryCount > 0) {
      console.log(`Retrying evaluation... attempts left: ${retryCount}`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return evaluateAnswer(prompt, userAnswer, retryCount - 1);
    }
    throw error;
  }
}
