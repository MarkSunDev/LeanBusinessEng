/** 句子翻译 */
export interface Sentence {
  index: number;
  english: string;
  chinese: string;
}

/** AI 生成的学习计划建议 */
export interface ArticleStudyPlan {
  suggestedDailyNewWords: number;
  suggestedDailyReviewTarget: number;
  suggestedDailyMinutes: number;
  estimatedDaysToComplete: number;
  difficulty: "简单" | "中等" | "困难";
  focusAreas: string[];
}

/** 文章/句子录入 */
export interface Article {
  id?: number;
  title: string;
  content: string;
  /** AI 解析后的 HTML（含高亮标注和句子翻译） */
  parsedHtml: string;
  /** 句子翻译数组 */
  sentences?: Sentence[];
  /** AI 生成的学习计划建议 */
  studyPlan?: ArticleStudyPlan;
  createdAt: Date;
  updatedAt: Date;
}

/** 核心词汇 */
export interface Vocabulary {
  id?: number;
  articleId: number;
  word: string;
  /** 中文释义 */
  definition: string;
  /** 音标 */
  phonetic: string;
  exampleSentence: string;
  /** 间隔重复相关 */
  nextReviewAt: Date;
  /** 复习间隔（天） */
  interval: number;
  /** 简易记忆因子 */
  easeFactor: number;
  /** 连续正确次数 */
  repetitions: number;
  /** 掌握程度 0-100 */
  mastery: number;
  createdAt: Date;
}

/** 核心句式 */
export interface SentencePattern {
  id?: number;
  articleId: number;
  pattern: string;
  /** 中文解释 */
  explanation: string;
  exampleSentence: string;
  nextReviewAt: Date;
  interval: number;
  easeFactor: number;
  repetitions: number;
  mastery: number;
  createdAt: Date;
}

/** 测验记录 */
export interface QuizRecord {
  id?: number;
  type: "vocabulary" | "pattern";
  itemId: number;
  prompt: string;
  userAnswer: string;
  isCorrect: boolean;
  aiFeedback: string;
  createdAt: Date;
}

/** 学习计划 */
export interface StudyPlan {
  id?: number;
  /** 每日新学词汇目标 */
  dailyNewWords: number;
  /** 每日复习目标 */
  dailyReviewTarget: number;
  /** 每日学习时间（分钟） */
  dailyMinutes: number;
  /** 每周学习天数 */
  weeklyDays: number;
  /** 学习提醒时间 HH:mm */
  reminderTime: string;
  createdAt: Date;
  updatedAt: Date;
}

/** AI 与应用设置 */
export interface AppSettings {
  id?: number;
  /** API 基础地址 */
  apiBaseURL: string;
  /** API 密钥 */
  apiKey: string;
  /** 模型名称 */
  model: string;
  /** 内容解析 System Prompt */
  analyzePrompt: string;
  /** 测验评判 System Prompt */
  evaluatePrompt: string;
  updatedAt: Date;
}

/** 每日学习记录 */
export interface DailyLog {
  id?: number;
  /** 日期 YYYY-MM-DD */
  date: string;
  /** 新学词汇数 */
  newWordsLearned: number;
  /** 复习词汇数 */
  wordsReviewed: number;
  /** 新学句式数 */
  newPatternsLearned: number;
  /** 复习句式数 */
  patternsReviewed: number;
  /** 测验完成数 */
  quizCompleted: number;
  /** 测验正确数 */
  quizCorrect: number;
  /** 学习时长（分钟） */
  minutesSpent: number;
  /** 是否达标 */
  goalMet: boolean;
}
