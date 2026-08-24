# Life RPG（人生角色成长系统）

Life RPG 是一个纯本地、单人使用的人生成长网页应用。它把现实中的目标、任务、技能、属性、装备、成就与重要事件组织为一套可持续扩展的 RPG 成长系统。

数据层保证结构、持久化、奖励结算和导入导出可靠；界面为暗色「星夜面板」RPG 风格（移动端优先，详见 `docs/design/README.md`），不依赖后端、账号或 AI API。

## 已实现功能

- 角色卡：用户名称、职业、等级、当前/累计 EXP、人生阶段和主要目标。
- 人生属性五维：技术力、智力、创造力、执行力、健康；支持手动变化与历史趋势。
- 技能树：自定义分类、父子技能、等级、当前经验、升级经验和描述。
- 目标与任务：大/小目标层级、截止日期、状态、进度，以及任务筛选和完整 CRUD。
- 奖励结算：完成任务时一次性增加角色 EXP、属性、技能经验，并对指定 Boss 造成伤害。
- 成就与装备：手动成就、自动触发配置与可调用的规则评估接口，以及现实装备品质、描述和属性加成。
- 人生事件：记录日期、标题、描述、奖励和来源；完成任务或击败 Boss 时可自动写入事件。
- Boss 挑战：目标关联、最大/当前 HP、状态、截止日期、任务伤害和手动伤害。
- 人生地图：可扩展的父子阶段节点、时间范围、顺序和当前状态。
- 本地存档：业务数据保存到 IndexedDB，简单界面配置保存到 localStorage。
- 数据管理：导出 `life_rpg_save.json`，严格校验后整体导入，也可恢复初始示例数据。

## 技术栈

- React 19 + TypeScript（严格模式）
- Vite 8
- Tailwind CSS 4
- React Router（`HashRouter`，兼容纯静态托管）
- IndexedDB（通过 `idb` 封装）
- Vitest + Testing Library + fake-indexeddb
- Lucide React 图标

项目不接入后端服务器、数据库服务器、账号系统或 AI API。

## 项目结构

```text
Life-RPG/
├─ .github/workflows/       # GitHub Pages 自动构建与部署
├─ frontend/
│  ├─ public/
│  ├─ src/
│  │  ├─ components/        # 布局、基础 UI 与功能组件
│  │  ├─ data/              # 默认 JSON、IndexedDB 与本地配置
│  │  ├─ pages/             # 八个主要功能页面
│  │  ├─ store/             # React 数据上下文与业务动作
│  │  ├─ systems/           # 奖励结算、存档校验等纯逻辑
│  │  ├─ test/              # 测试环境配置
│  │  ├─ types/             # 全部领域模型与 Store 契约
│  │  └─ utils/             # 格式化、ID、下载等工具
│  ├─ package.json
│  └─ vite.config.ts
└─ README.md
```

核心业务逻辑集中在 `systems` 和 `store`，页面只负责展示和提交用户操作，便于后续独立优化前端视觉。

## 本地运行

要求 Node.js 24 或其他满足当前 Vite 要求的版本。

```powershell
cd frontend
npm install
npm run dev
```

终端会显示本地访问地址，通常为 `http://localhost:5173`。

## 检查与构建

```powershell
cd frontend

# 单元与组件测试
npm run test

# TypeScript 严格类型检查
npm run typecheck

# 静态检查
npm run lint

# 生产构建
npm run build

# 本地预览生产构建
npm run preview
```

生产文件生成在 `frontend/dist/`。构建使用相对资源路径，不需要服务器重写规则。

## 数据保存、导出与导入

### 本地保存

- 角色、属性、技能、目标、任务、成就、装备、事件、Boss 和地图节点保存在浏览器 IndexedDB。
- 侧栏折叠、任务筛选等简单设置保存在 localStorage。
- 页面刷新后会自动读取同一浏览器、同一站点来源下的存档。

### 导出

打开“数据管理”，选择“导出存档”，浏览器会下载：

```text
life_rpg_save.json
```

### 导入

在“数据管理”选择该 JSON 文件。系统会检查应用标识、结构版本、必需集合和关键字段；确认后整体替换当前存档。

> IndexedDB 按浏览器和站点来源隔离。本地开发地址、GitHub Pages 地址与 Codex Sites 地址各有独立存档。切换部署地址时，请先在旧地址导出，再在新地址导入。

## 部署到 GitHub Pages

仓库已包含 `.github/workflows/deploy-pages.yml`，会在 `main` 分支更新后执行测试、构建并部署 `frontend/dist`。

1. 将项目推送到 GitHub 仓库的 `main` 分支。
2. 打开仓库 `Settings → Pages`。
3. 在 `Build and deployment` 中将 `Source` 设为 `GitHub Actions`。
4. 打开 `Actions` 查看 `Deploy GitHub Pages` 工作流。
5. 部署成功后，从工作流或 Pages 设置页打开站点地址。

应用使用 `HashRouter` 和 Vite 的相对 `base`，因此可以部署在 `https://<用户名>.github.io/<仓库名>/` 子路径，不依赖额外的 404 回退。

GitHub Pages 自定义工作流说明：[GitHub 官方文档](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。

## Codex Sites 兼容说明

当前项目可生成无服务器依赖的静态产物，适合后续从本地项目交给 Sites 检查并部署。正式部署时，在 ChatGPT 桌面端或网页端的 Sites 中打开/选择该项目，并请求检查兼容性、保存版本和部署。

本仓库当前不预先写入 `.openai/hosting.json`：该文件用于把本地源码与已创建的 Sites 项目关联，通常在 Sites 实际预配项目时生成。详见 [OpenAI 官方 Sites 文档](https://learn.chatgpt.com/docs/sites)。

本项目的持久化仍是浏览器本地 IndexedDB；它不需要 Sites 的 D1/R2，也不会跨设备自动同步。

## 数据模型

领域模型位于 `frontend/src/types/models.ts`，主要包括：

- `Character`
- `StatsState` / `StatSnapshot`
- `SkillCategory` / `Skill`
- `Goal` / `Task` / `RewardBundle`
- `Achievement`
- `Equipment`
- `LifeEvent`
- `Boss`
- `TimelineNode`
- `SaveFile`

所有实体都使用稳定 ID 与 ISO 时间字段。存档包含 `schemaVersion`，后续可添加迁移逻辑而不破坏已有数据。

## 后续优化方向

- 将自动成就评估接口接入任务/事件流水，并扩展连续打卡与周期任务。
- 更细的属性/技能经验曲线与等级公式配置。
- 目标依赖、任务重复规则、日历视图与提醒。
- 更直观的技能树连线和可拖拽人生地图。
- 存档版本迁移、差异预览、撤销与历史快照。
- PWA 离线安装、可选加密备份和多设备手动同步。
