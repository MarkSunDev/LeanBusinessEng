import Dexie, { type EntityTable } from "dexie";
import type {
  Article,
  Vocabulary,
  SentencePattern,
  QuizRecord,
  StudyPlan,
  DailyLog,
  AppSettings,
} from "@/types";
import {
  DEFAULT_ANALYZE_PROMPT,
  DEFAULT_EVALUATE_PROMPT,
  DEFAULT_MODEL,
  DEFAULT_BASE_URL,
} from "@/lib/prompts";

const db = new Dexie("LeanBusinessEngDB") as Dexie & {
  articles: EntityTable<Article, "id">;
  vocabularies: EntityTable<Vocabulary, "id">;
  sentencePatterns: EntityTable<SentencePattern, "id">;
  quizRecords: EntityTable<QuizRecord, "id">;
  studyPlans: EntityTable<StudyPlan, "id">;
  dailyLogs: EntityTable<DailyLog, "id">;
  appSettings: EntityTable<AppSettings, "id">;
};

db.version(3).stores({
  articles: "++id, title, createdAt",
  vocabularies: "++id, articleId, word, nextReviewAt, mastery",
  sentencePatterns: "++id, articleId, pattern, nextReviewAt, mastery",
  quizRecords: "++id, type, itemId, createdAt",
  studyPlans: "++id",
  dailyLogs: "++id, &date",
  appSettings: "++id",
});

export { db };

/** 获取今日日期字符串 YYYY-MM-DD */
export function getTodayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

/** 获取或创建今日学习记录 */
export async function getOrCreateTodayLog(): Promise<DailyLog> {
  const today = getTodayStr();
  let log = await db.dailyLogs.where("date").equals(today).first();
  if (!log) {
    const id = await db.dailyLogs.add({
      date: today,
      newWordsLearned: 0,
      wordsReviewed: 0,
      newPatternsLearned: 0,
      patternsReviewed: 0,
      quizCompleted: 0,
      quizCorrect: 0,
      minutesSpent: 0,
      goalMet: false,
    });
    log = await db.dailyLogs.get(id);
  }
  return log!;
}

/** 获取连续学习天数 */
export async function getStreakDays(): Promise<number> {
  const logs = await db.dailyLogs.orderBy("date").reverse().toArray();
  if (logs.length === 0) return 0;

  let streak = 0;
  const today = new Date();

  for (let i = 0; i < logs.length; i++) {
    const expected = new Date(today);
    expected.setDate(expected.getDate() - i);
    const expectedStr = expected.toISOString().slice(0, 10);

    if (logs[i].date === expectedStr && logs[i].goalMet) {
      streak++;
    } else if (i === 0 && logs[i].date === expectedStr) {
      // 今天有记录但还没达标，继续检查昨天
      continue;
    } else {
      break;
    }
  }

  return streak;
}

/** 获取默认学习计划 */
export async function getStudyPlan(): Promise<StudyPlan> {
  const plan = await db.studyPlans.orderBy("id").last();
  if (plan) return plan;

  // 默认计划
  const defaultPlan: StudyPlan = {
    dailyNewWords: 10,
    dailyReviewTarget: 20,
    dailyMinutes: 30,
    weeklyDays: 5,
    reminderTime: "09:00",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const id = await db.studyPlans.add(defaultPlan);
  return { ...defaultPlan, id };
}

/** 获取应用设置（AI 配置 + Prompt） */
export async function getAppSettings(): Promise<AppSettings> {
  const settings = await db.appSettings.orderBy("id").last();
  if (settings) return settings;

  // 首次使用，创建默认配置（apiKey 为空，需用户填写）
  const defaultSettings: AppSettings = {
    apiBaseURL: DEFAULT_BASE_URL,
    apiKey: "",
    model: DEFAULT_MODEL,
    analyzePrompt: DEFAULT_ANALYZE_PROMPT,
    evaluatePrompt: DEFAULT_EVALUATE_PROMPT,
    updatedAt: new Date(),
  };
  const id = await db.appSettings.add(defaultSettings);
  return { ...defaultSettings, id };
}

/** 检查 AI 是否已配置 */
export async function isAIConfigured(): Promise<boolean> {
  const settings = await getAppSettings();
  return !!(settings.apiKey && settings.apiBaseURL);
}
