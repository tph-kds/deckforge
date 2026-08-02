# DeckForge Web Slides Agent Skills

> 面向 AI Coding Agents 的现代化浏览器原生演示文稿技能仓库。

DeckForge 是一个**多智能体技能仓库**，用于指导 AI 编码助手构建直接运行在浏览器中的演示产品，而不仅仅是导出 PowerPoint 或静态 PDF。项目重点覆盖 **现代 WebUI**、**编辑工具栏**、**演讲者模式**、**模板系统**、**交互组件** 与 **发布流程**。

**语言:** [English](./README.md) · [Tiếng Việt](./README.vi.md) · [简体中文](./README.zh-CN.md)

## 项目预览

![DeckForge hero](./docs/images/hero-overview.png)

## 核心价值

- 构建**浏览器原生幻灯片**。
- 同时支持 **编辑模式** 与 **演示模式**。
- 强调**专业 UI/UX**，减少 AI 生成痕迹。
- 兼容多种 coding agent：Claude Code、Codex、Grok、Gemini、Cursor、Windsurf、Aider、OpenCode、Cline、Roo。
- 提供针对 accessibility、responsiveness、performance 与 interaction quality 的**质量门禁**。

## 工作流程

![How DeckForge works](./docs/images/how-it-works.png)

主要六个阶段：

1. 安装 skill
2. 规划受众、目标与内容结构
3. 选择模板、布局与主题
4. 在 Web 编辑器中修改内容
5. 通过演示运行时进行展示
6. 发布到 web / embed / export 目标

## 仓库架构

![DeckForge architecture](./docs/images/architecture.png)

仓库现已补充 `.agents/plugins/marketplace.json`，更适合 Claude / Codex 之外的多种 agent 插件发现方式。

## 模板展示

![Template showcase](./docs/images/template-showcase.png)

## 快速安装

```bash
npx skills@latest add tph-kds/deckforge --skill deckforge
```

安装全部 skill：

```bash
npx skills@latest add tph-kds/deckforge --skill '*' --agent claude-code --agent codex --agent cursor --agent opencode
```

## 关键文档

- [`AGENTS.md`](./AGENTS.md)
- [`INSTALL_WITH_SKILLS_CLI.md`](./INSTALL_WITH_SKILLS_CLI.md)
- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)
- [`docs/PRODUCT_DIRECTION.md`](./docs/PRODUCT_DIRECTION.md)

## License

MIT
