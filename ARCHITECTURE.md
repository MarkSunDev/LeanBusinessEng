# LeanBizEng 业务架构文档

## 目录
1. [项目概述](#项目概述)
2. [核心目标](#核心目标)
3. [功能模块详解](#功能模块详解)
4. [核心学习逻辑](#核心学习逻辑)
5. [数据流与状态管理](#数据流与状态管理)
6. [AI 交互设计](#ai-交互设计)
7. [技术实现要点](#技术实现要点)

---

## 项目概述

LeanBizEng 是一款面向职场人士的英语学习工具，其核心理念是**情境化学习**——从用户真实的工作场景（邮件、会议纪要、报告等）中提取学习素材，通过科学的记忆算法帮助用户高效掌握商务英语。

### 目标用户
- 在英语环境中工作的中国职场人士
- 需要提升商务英语沟通能力
- 希望利用碎片时间进行系统化学习

### 产品定位
- **不是**传统的背单词应用
- **不是**英语课程或教材
- **是**个人化的英语学习助手，将工作素材转化为学习资源

---

## 核心目标

### 1. 降低学习门槛
- 无需寻找学习材料，直接复制工作中的英语内容
- 中文优先的界面和解释，消除理解障碍
- 零配置部署，打开即用

### 2. 科学高效记忆
- 基于艾宾浩斯遗忘曲线的复习 scheduling
- SM-2 算法动态调整复习间隔
- 主动回忆（造句）而非被动识别（选择）

### 3. 情境化学习
- 从真实工作场景中提取词汇和句式
- 保留原始上下文，建立语义连接
- 双例句系统展示不同使用场景

### 4. 渐进式掌握
- 掌握程度可视化（0-100%）
- 四级自评反馈学习效果
- 连续学习天数激励持续投入

---

## 功能模块详解

### 1. 内容录入与 AI 解析

#### 用户流程
```
输入标题和英语原文
    ↓
点击"开始解析"
    ↓
AI 分两步处理：
  步骤1：解析句子、词汇、句式
  步骤2（可选）：生成学习计划
    ↓
保存到本地数据库
```

#### AI 解析内容
| 字段 | 说明 | 用途 |
|------|------|------|
| `sentences` | 逐句拆分，含中英文 | 句子级翻译学习 |
| `vocabularies` | 核心词汇，含2个例句 | 单词学习和测验 |
| `patterns` | 核心句式，含2个例句 | 句式学习和测验 |
| `studyPlan` | 学习计划建议 | 学习目标设定 |

#### 双例句系统
每个词汇和句式配备两个例句：
- **例句1**：来自原文或类似场景
- **例句2**：不同场景展示用法多样性
- 都配有中文翻译，支持语音朗读

---

### 2. 学习库（Library）

#### 功能
- **三栏分类**：全部内容 / 核心词汇 / 核心句式
- **搜索**：全文检索内容、词汇、句式
- **状态展示**：掌握程度徽章（待学习/学习中/已掌握）
- **快速预览**：文章卡片展示句子、词汇、句式概览

#### 数据结构
```typescript
// 文章
Article {
  id: number
  title: string
  content: string          // 原始内容
  parsedHtml: string       // AI 解析后的 HTML
  sentences: Sentence[]    // 句子数组
  studyPlan: StudyPlan     // 学习计划
}

// 句子
Sentence {
  index: number
  english: string
  chinese: string
}
```

---

### 3. 每日复习（Review）

#### 核心机制
基于 **SM-2 间隔重复算法**：

```
首次学习 → 1天后复习
    ↓
记得 → 3天后
    ↓
记得 → 7天后
    ↓
记得 → 15天后
    ↓
记得 → 30天后 → 60天 → 120天...
```

#### 四级自评
| 评级 | 含义 | 影响 |
|------|------|------|
| 忘记了 | 完全没印象 | 间隔重置为1天，掌握度-15% |
| 有点难 | 勉强想起 | 间隔缩短，掌握度小幅增加 |
| 记得 | 顺利回忆 | 间隔正常延长，掌握度+20% |
| 很简单 | 非常熟悉 | 间隔大幅延长，掌握度+25% |

#### 每日复习队列生成
```typescript
// 查询条件：nextReviewAt <= 当前时间
const dueItems = await db.vocabularies
  .where("nextReviewAt")
  .belowOrEqual(new Date())
  .toArray()
```

#### 新内容处理
- 新添加的内容 `nextReviewAt` 设置为**明天零点**
- 确保新内容不会立即出现在当天复习队列
- 给用户时间先学习，明天再开始复习

---

### 4. 造句测验（Quiz）

#### 测验流程
```
随机选择待复习的词汇或句式
    ↓
显示提示（英文 + 中文释义）
    ↓
用户输入英语造句
    ↓
AI 评判（语法、用词、语境）
    ↓
显示反馈（正确与否 + 改进建议 + 参考例句）
```

#### AI 评判维度
1. **语法正确性**：句子结构是否正确
2. **用词准确性**：目标词汇/句式使用是否正确
3. **语境适用性**：是否符合商务场景
4. **改进建议**：更好的表达方式

#### 主动回忆的优势
- 比选择题更难，记忆效果更强
- 强迫大脑主动构建语言输出
- 发现知识盲点（以为自己会，实际写不出）

---

### 5. 学习计划（Plan）

#### AI 生成计划
根据内容分析自动生成：
- **难度评估**：简单 / 中等 / 困难
- **建议每日新词**：5-15个
- **建议每日复习**：15-30个
- **预计完成天数**：基于内容总量
- **学习重点**：商务邮件、会议英语等标签

#### 用户自定义
- 每日新词目标
- 每日复习目标
- 每日学习时长
- 每周学习天数

#### 进度追踪
- **热力图**：7天学习记录可视化
- **连续天数**：Streak 激励
- **每日统计**：新学/复习/测验数量

---

## 核心学习逻辑

### 1. 学习闭环

```
        ┌─────────────────────────────────────┐
        │                                     │
        ↓                                     │
   ┌─────────┐    ┌─────────┐    ┌─────────┐ │
   │  录入   │ → │  AI解析  │ → │  学习库  │ │
   │  内容   │    │  高亮   │    │  管理   │ │
   └─────────┘    └─────────┘    └────┬────┘ │
                                      │       │
                                      ↓       │
   ┌─────────┐    ┌─────────┐    ┌─────────┐ │
   │  掌握   │ ← │  间隔   │ ← │  每日   │ │
   │  100%   │    │  重复   │    │  复习   │ │
   └─────────┘    └─────────┘    └────┬────┘ │
                                      │       │
                                      ↓       │
                               ┌─────────┐    │
                               │  造句   │────┘
                               │  测验   │
                               └─────────┘
```

### 2. 掌握程度计算

```typescript
// 掌握度更新逻辑
const masteryDelta = quality >= 3
  ? Math.min(20, quality * 5)  // 记得/很简单：+15~20%
  : -15;                        // 忘记了：-15%

newMastery = Math.max(0, Math.min(100, oldMastery + masteryDelta));
```

| 掌握度 | 状态 | 颜色 |
|--------|------|------|
| 0-39 | 待学习 | 灰色 |
| 40-79 | 学习中 | 黄色 |
| 80-100 | 已掌握 | 绿色 |

### 3. 间隔重复算法（SM-2）

```typescript
function calculateNextReview(
  quality: number,      // 0-5 自评质量
  repetitions: number, // 连续正确次数
  interval: number,    // 当前间隔（天）
  easeFactor: number   // 简易度因子（默认2.5）
) {
  let newInterval: number;
  let newRepetitions: number;
  let newEaseFactor: number;

  if (quality < 3) {
    // 回答错误，重置
    newRepetitions = 0;
    newInterval = 1;
  } else {
    // 回答正确
    newRepetitions = repetitions + 1;

    if (newRepetitions === 1) {
      newInterval = 1;
    } else if (newRepetitions === 2) {
      newInterval = 3;
    } else {
      newInterval = Math.round(interval * easeFactor);
    }
  }

  // 调整简易度因子
  newEaseFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  newEaseFactor = Math.max(1.3, newEaseFactor);

  const nextReviewAt = new Date();
  nextReviewAt.setDate(nextReviewAt.getDate() + newInterval);

  return {
    interval: newInterval,
    repetitions: newRepetitions,
    easeFactor: newEaseFactor,
    nextReviewAt,
  };
}
```

---

## 数据流与状态管理

### 1. 本地存储架构

使用 **Dexie.js**（IndexedDB 封装）：

```
IndexedDB: LeanBusinessEngDB
├── articles (文章)
├── vocabularies (词汇)
├── sentencePatterns (句式)
├── quizRecords (测验记录)
├── studyPlans (学习计划设置)
├── dailyLogs (每日学习日志)
└── appSettings (应用设置)
```

### 2. 数据流

```
用户操作
   ↓
React State (useState)
   ↓
Dexie.js (IndexedDB)
   ↓
本地持久化存储
```

### 3. 实时同步

使用 `dexie-react-hooks` 实现实时查询：

```typescript
const vocabularies = useLiveQuery(
  () => db.vocabularies.where("articleId").equals(articleId).toArray(),
  [articleId]
);
// 数据变化时自动重新渲染
```

---

## AI 交互设计

### 1. 分步处理策略

为避免 AI 返回不完整数据，将功能拆分为两步：

**步骤 1：内容解析**
```typescript
// 解析句子、词汇、句式
const parseResult = await analyzeContent(content);
// 返回：{ sentences, vocabularies, patterns, parsedHtml }
```

**步骤 2：生成学习计划（可选）**
```typescript
// 基于解析结果生成学习计划
const studyPlan = await generateStudyPlan(content, vocabCount, patternCount);
// 返回：{ difficulty, suggestedDailyNewWords, ... }
```

### 2. 超时与重试机制

```typescript
// 60秒超时
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 60000);

// 自动重试（最多1次）
if (retryCount > 0) {
  await new Promise(resolve => setTimeout(resolve, 1000));
  return analyzeContent(content, retryCount - 1);
}
```

### 3. Prompt 工程

**内容解析 Prompt 要点**：
- 全英文（Gemini 理解更好）
- 提供完整 JSON 示例
- 强调必填字段
- 明确字段格式要求

**学习计划 Prompt 要点**：
- 单独步骤，不依赖解析步骤
- 基于内容统计生成建议
- 返回结构化数据

---

## 技术实现要点

### 1. 语音朗读（TTS）

```typescript
// 选择优质女声
const preferredVoices = [
  "Samantha", "Victoria", "Karen",  // macOS
  "Google US English",               // Google
  "Microsoft Zira", "Microsoft Jenny" // Windows
];

const utterance = new SpeechSynthesisUtterance(text);
utterance.voice = selectFemaleVoice();
utterance.rate = 0.85;  // 稍慢，更清晰
utterance.pitch = 1.05; // 更自然
```

### 2. 响应式设计

```typescript
// AppShell.tsx
<aside className="hidden md:block w-[240px]"> {/* 桌面端侧边栏 */}
<main className="flex-1 min-w-0 p-4 md:p-6"> {/* 自适应主内容区 */}
```

### 3. 动画与过渡

```css
/* 淡入动画 */
@keyframes fade-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

/* 进度条动画 */
.progress-animated {
  animation: progress-fill 0.8s ease-out;
}
```

### 4. 错误处理

```typescript
try {
  const data = await analyzeContent(content);
} catch (error) {
  if (error.name === "AbortError") {
    showError("请求超时，请重试");
  } else {
    showError(error.message);
  }
  showRetryButton();
}
```

---

## 总结

LeanBizEng 的核心价值在于：

1. **工作即学习**：将日常工作内容转化为学习素材
2. **科学记忆**：基于经过验证的 SM-2 间隔重复算法
3. **主动输出**：造句测验而非被动选择，强化记忆
4. **渐进掌握**：可视化掌握程度，激励持续学习
5. **隐私安全**：所有数据本地存储，API 密钥仅存浏览器

通过 AI 辅助内容解析、科学的复习 scheduling、以及情境化的学习方式，帮助职场人士高效提升商务英语能力。
