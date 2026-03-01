# Chimera · 职场英语学习助手

<p align="center">
  <img src="src/app/icon.png" width="80" alt="Chimera Logo" />
</p>

面向职场人士的 AI 驱动英语学习平台。从真实工作素材中提取核心词汇与句式，通过科学的间隔重复和主动造句测验，高效提升商务英语能力。

**在线体验：** 部署于 Vercel，打开即用
**零后端依赖：** 所有数据存储在浏览器本地（IndexedDB）

---

## 核心功能

### 📝 内容录入与 AI 解析
粘贴工作中的英语邮件、会议纪要、报告等内容，AI 自动：
- **智能标题生成**：AI 根据内容自动生成中文标题和标签（用户也可手动输入）
- **逐句翻译**：每个句子都有中文翻译，点击展开查看
- **高亮标注**：核心商务词汇（黄色底色）和句式结构（绿色底色+下划线）
- **双例句支持**：每个词汇和句式配备两个商务场景例句，含中文翻译
- **语音朗读**：集成 Web Speech API，清晰女声朗读句子和单词
- **批量添加**：支持一次性添加多篇内容，串行解析避免接口过载

### 🔄 间隔重复复习（SM-2 算法）
基于艾宾浩斯遗忘曲线的科学复习系统：
- **智能 scheduling**：自动计算最佳复习时间：1天 → 3天 → 7天 → 15天...
- **四级自评**：忘记了 / 有点难 / 记得 / 很简单
- **掌握程度追踪**：实时显示待学习 → 学习中 → 已掌握
- **每日独立**：新添加的内容从明天开始复习，不影响当天计划

### 💡 造句测验
主动回忆式测验，AI 实时评判：
- **情境化练习**：给定词汇或句式，用英语造句
- **AI 评判**：评估语法正确性、用词准确性和商务语境适用性
- **详细反馈**：中文反馈 + 改进建议 + 参考例句

### 📚 学习库
统一管理所有学习内容：
- **三栏分类**：全部内容 / 核心词汇 / 核心句式
- **搜索功能**：快速查找内容、词汇或句式
- **掌握状态**：直观显示每个项目的学习进度

### 📅 学习计划
可定制的学习目标与进度追踪：
- **AI 生成计划**：根据内容难度自动生成个性化学习计划
- **灵活调整**：每日新词 / 复习 / 时长 / 每周天数 — 滑块可调
- **学习热力图**：7 天学习记录可视化
- **连续天数**：🔥 Streak 统计激励持续学习
- **科学方法论**：艾宾浩斯遗忘曲线、SM-2、主动回忆、情境化学习

### ⚙️ 设置中心
灵活的 AI 配置与 Prompt 管理：
- **多模型支持**：OpenAI、Gemini、Claude 等任意兼容 API
- **自定义 Prompt**：可修改解析和评判 Prompt，支持一键恢复默认
- **连接测试**：内置 API 连通性测试
- **数据备份**：支持自动备份到本地文件夹，或手动导出/导入备份文件
- **本地存储**：所有配置仅存储在浏览器，安全零泄露

---

## 技术架构

```
Framework     Next.js 16 (App Router) + TypeScript
Styling       Tailwind CSS 4
Local DB      Dexie.js (IndexedDB) — 全部数据存储在浏览器
AI Engine     任意 OpenAI 兼容 API（用户在设置页面自行配置）
Algorithm     SM-2 间隔重复算法
Deployment    Vercel
```

## 项目结构

```
src/
├── app/
│   ├── layout.tsx                # 根布局（中文 metadata）
│   ├── globals.css               # 设计系统（配色/圆角/阴影/动画）
│   ├── page.tsx                  # 学习主页（今日进度/统计/最近内容）
│   ├── favicon.ico               # 网站图标
│   ├── icon.png                  # PWA 图标 (192x192)
│   ├── apple-icon.png            # iOS 图标 (180x180)
│   ├── api/
│   │   ├── analyze/route.ts      # AI 内容解析
│   │   └── evaluate/route.ts     # AI 测验评判
│   ├── articles/
│   │   ├── new/page.tsx          # 添加内容（分步流程）
│   │   ├── batch/page.tsx        # 批量添加内容
│   │   └── [id]/page.tsx         # 内容详情（句子+词汇+句式）
│   ├── library/
│   │   └── page.tsx              # 学习库（内容管理）
│   ├── review/page.tsx           # 每日复习（翻卡片+自评）
│   ├── quiz/page.tsx             # 练习测验（造句+AI评判）
│   ├── plan/page.tsx             # 学习计划（目标+热力图+方法论）
│   ├── settings/page.tsx         # 设置（API配置+Prompt管理）
│   └── about/page.tsx            # 关于（版本信息+功能特色+版本历史）
├── components/
│   ├── AppShell.tsx              # 响应式外壳（桌面+移动端）
│   └── Sidebar.tsx               # 侧边栏导航（含待复习徽章+连续天数）
├── lib/
│   ├── ai.ts                     # AI 调用封装（含超时和重试）
│   ├── db.ts                     # IndexedDB 数据库 + 工具函数
│   ├── prompts.ts                # 默认 Prompt 常量
│   ├── tts.ts                    # 语音朗读（女声选择）
│   ├── backup.ts                 # 数据备份与导入功能
│   └── spaced-repetition.ts      # SM-2 算法实现
└── types/
    └── index.ts                  # 数据类型定义
```

## 数据模型

| 表 | 用途 | 关键字段 |
|----|------|---------|
| `articles` | 录入的英语内容 | title, content, parsedHtml, sentences, studyPlan |
| `vocabularies` | AI 提取的核心词汇 | word, definition, phonetic, exampleSentence, exampleSentence2, mastery, nextReviewAt |
| `sentencePatterns` | AI 提取的句式结构 | pattern, explanation, exampleSentence, exampleSentence2, mastery, nextReviewAt |
| `quizRecords` | 测验历史记录 | prompt, userAnswer, isCorrect, aiFeedback |
| `studyPlans` | 学习目标设定 | dailyNewWords, dailyReviewTarget, dailyMinutes |
| `dailyLogs` | 每日学习数据 | newWordsLearned, wordsReviewed, quizCompleted |
| `appSettings` | AI 配置与 Prompt | apiBaseURL, apiKey, model, analyzePrompt, evaluatePrompt |

## 设计理念

| 原则 | 实现 |
|------|------|
| 中文优先的交互 | 所有界面文案、AI 释义和反馈均为中文 |
| 情境化学习 | 从真实工作素材中学习，而非孤立背单词 |
| 科学记忆 | SM-2 间隔重复 + 艾宾浩斯遗忘曲线 |
| 主动回忆 | 造句测验而非选择题，加深记忆 |
| 渐进式掌握 | mastery 0→100 追踪每个词汇的掌握程度 |
| 安全零泄露 | API 密钥仅存浏览器本地，代码仓库无任何敏感信息 |

---

## 快速开始

### 本地开发

```bash
# 克隆项目
git clone https://github.com/MarkSunDev/LeanBusinessEng.git
cd LeanBusinessEng

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

打开 http://localhost:3000 → 进入**设置页面** → 配置 API 地址和密钥 → 开始使用。

### 部署到 Vercel

1. Fork 或导入本仓库到 Vercel
2. Framework Preset 选择 **Next.js**
3. 无需配置环境变量（API 密钥由用户在浏览器中配置）
4. 部署完成后，用户首次打开会看到配置引导

---

## 使用流程

```
首次使用 → 设置页面配置 API → 添加内容 → AI 解析高亮
                                  ↓
              查看学习计划 ← 造句测验 ← 每日复习 (30分钟)
                  |                                ↑
                  └──── 持续录入工作中的新素材 ──────┘
```

---

## 后续规划

- [x] Phase 1: 本地浏览器 MVP（IndexedDB + AI API）
- [x] Phase 1.5: 设置中心（API 配置 + Prompt 自定义）
- [x] Phase 1.6: 部署至 Vercel
- [x] Phase 1.7: 句子翻译 + 分步 AI + 双例句 + 重试机制
- [x] Phase 1.8: 批量添加 + AI 生成标题标签 + 数据备份功能
- [ ] Phase 2: 持久化数据库（Supabase / PostgreSQL）
- [ ] Phase 3: 用户认证与多设备同步
- [ ] Phase 4: 邮件/Slack/文档导入
- [ ] Phase 5: 团队功能与学习数据分析

## License

MIT
