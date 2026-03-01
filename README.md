# LeanBizEng · 职场英语学习助手

面向职场人士的 AI 驱动英语学习平台。从真实工作素材中提取核心词汇与句式，通过科学的间隔重复和主动造句测验，高效提升商务英语能力。

## 核心功能

### 📝 内容录入与 AI 解析
粘贴工作中的英语邮件、会议纪要、报告等内容，AI 自动：
- **高亮标注**核心商务词汇（黄色底色）和句式结构（绿色底色+下划线）
- 提取词汇的**中文释义**、音标和例句
- 提取句式的中文说明和商务场景用法

### 🔄 间隔重复复习（SM-2 算法）
基于艾宾浩斯遗忘曲线的科学复习系统：
- 自动计算最佳复习时间：1天 → 3天 → 7天 → 15天...
- 四级自评：忘记了 / 有点难 / 记得 / 很简单
- 掌握程度实时追踪（待学习 → 学习中 → 已掌握）

### 💡 造句测验
主动回忆式测验，AI 实时评判：
- 给定词汇或句式，用英语造句
- AI 评估语法正确性、用词准确性和商务语境适用性
- 中文反馈 + 改进建议 + 参考例句

### 📅 学习计划
可定制的学习目标与进度追踪：
- 每日新词 / 复习 / 时长 / 每周天数 — 可调节
- 7 天学习热力图
- 连续学习天数统计（🔥 Streak）
- 科学学习方法论说明

## 技术架构

```
Framework     Next.js 16 (App Router) + TypeScript
Styling       Tailwind CSS 4
Local DB      Dexie.js (IndexedDB) — 全部数据存储在浏览器
AI Engine     OpenAI 兼容 API (Gemini 2.5 Flash)
Algorithm     SM-2 间隔重复算法
```

## 项目结构

```
src/
├── app/
│   ├── layout.tsx              # 根布局（中文 metadata）
│   ├── globals.css             # 设计系统（配色/圆角/阴影/动画）
│   ├── page.tsx                # 学习主页（今日进度/统计/最近内容）
│   ├── api/
│   │   ├── analyze/route.ts    # AI 内容解析（中文释义输出）
│   │   └── evaluate/route.ts   # AI 测验评判（中文反馈输出）
│   ├── articles/
│   │   ├── new/page.tsx        # 添加内容
│   │   └── [id]/page.tsx       # 内容详情（高亮+词汇+句式）
│   ├── review/page.tsx         # 每日复习（翻卡片+自评）
│   ├── quiz/page.tsx           # 练习测验（造句+AI评判）
│   └── plan/page.tsx           # 学习计划（目标+热力图+方法论）
├── components/
│   ├── AppShell.tsx            # 响应式外壳（桌面+移动端）
│   └── Sidebar.tsx             # 侧边栏导航（含待复习徽章+连续天数）
├── lib/
│   ├── db.ts                   # IndexedDB 数据库 + 工具函数
│   └── spaced-repetition.ts    # SM-2 算法实现
└── types/
    └── index.ts                # 数据类型定义
```

## 设计理念

| 原则 | 实现 |
|------|------|
| 中文优先的交互 | 所有界面文案、AI 释义和反馈均为中文 |
| 情境化学习 | 从真实工作素材中学习，不是孤立背单词 |
| 科学记忆 | SM-2 间隔重复 + 艾宾浩斯遗忘曲线 |
| 主动回忆 | 造句测验而非选择题，加深记忆 |
| 渐进式掌握 | mastery 0→100 追踪每个词汇的掌握程度 |

## 快速开始

```bash
# 安装依赖
npm install

# 配置 API（编辑 .env.local）
OPENAI_API_KEY=your-key
OPENAI_BASE_URL=https://your-api-endpoint/v1

# 启动开发服务器
npm run dev
```

打开 http://localhost:3000 开始使用。

## 使用流程

```
添加内容 → AI解析高亮 → 每日复习(30分钟) → 造句测验 → 查看学习计划
   ↑                                                          |
   └──────────── 持续录入工作中的新素材 ←──────────────────────┘
```

## 后续规划

- [x] Phase 1: 本地浏览器 MVP（IndexedDB + AI API）
- [ ] Phase 2: 部署至 Vercel + 持久化数据库
- [ ] Phase 3: 用户认证与多设备同步
- [ ] Phase 4: 邮件/Slack/文档导入
- [ ] Phase 5: 团队功能与学习数据分析

## License

MIT
