# AGENTS.md

本文件定义 Codex 和其他开发代理在本项目中的工作规则。

## 开发流程

1. 修改前先阅读项目结构和相关文件，确认现有实现与工作区状态。
2. 每次开发前先向用户说明实施计划。
3. 只修改当前任务直接相关的文件，不修改无关内容。
4. 保持方案最小、清晰、可维护，并遵循项目现有代码风格。
5. 安装或升级依赖前必须先获得用户确认。
6. 重大编辑后展示 diff 或清楚概述变更。
7. 避免破坏性 Git 命令；删除文件前必须获得用户确认。
8. 不暴露密钥、环境变量值或其他敏感信息。

## Start-of-task context

开始任务前，先读取可用的相关项目上下文：

- `README.md`
- `docs/PROJECT_STATE.md`
- `docs/BACKLOG.md`
- `docs/DEVLOG.md`
- `docs/DECISIONS.md`
- `docs/TESTING.md` if present

如果文件不存在，明确说明 missing。不要编造项目状态。

## 产品与范围

1. 不要擅自扩大需求范围。
2. 不要删除或破坏用户数据；涉及迁移时必须优先设计可回滚、可验证的方案。
3. 涉及产品或架构决策时，更新 `docs/DECISIONS.md`。
4. 遇到不属于当前版本但值得保留的事项时，写入 `docs/BACKLOG.md`。
5. 涉及版本范围变化时，更新 `docs/ROADMAP.md`。

## 数据模型

1. `products` 和 `inventory_batches` 必须保持分离。
2. 同款商品的不同库存批次不得自动合并。
3. 涉及数据模型、字段、约束或关系变化时，必须更新 `docs/DATA_MODEL.md`。
4. 数据模型变更应考虑已有数据的兼容性，禁止直接丢弃用户数据。

## Documentation mapping

When relevant, update the right documentation:

- `docs/DEVLOG.md` for completed work and verification notes
- `docs/BACKLOG.md` for scope, priority, or future task changes
- `docs/DECISIONS.md` for product, architecture, API, or workflow decisions
- `docs/PROJECT_STATE.md` for the current dashboard-facing state
- `docs/TESTING.md` for test strategy or smoke checklist changes, if present

Do not duplicate large amounts of content across docs. Keep `PROJECT_STATE.md` concise and dashboard-oriented.

## Local dev ports

For local web projects:

- keep dev ports explicit and stable
- use `strictPort: true` for Vite projects
- local APIs should prefer `127.0.0.1`
- do not silently change dev ports

If a project dev port changes, mention that `project-command-center/config/projects.json` may also need updating.

## Secrets and safety

Never read, print, or commit secrets:

- `.env`
- `.env.local`
- API keys
- tokens
- private credentials

Do not put commercial API keys in frontend code. Do not commit `node_modules`, `dist`, build output, or local environment files.

## 完成标准

1. 完成功能后更新 `docs/DEVLOG.md`。
2. 完成后必须运行与变更相匹配的测试。
3. 如果测试无法运行，必须记录原因、未验证风险和建议的后续验证方式。
4. 检查文档、实现和版本范围是否一致。

## Project State Maintenance

1. 每次 meaningful change 后，必须检查 `docs/PROJECT_STATE.md` 是否仍准确。
2. 如果 current version or phase、current status、latest completed work、next recommended action、blockers、important context、handoff prompt、ports / environment assumptions、deployment or verification status 发生变化，必须同步更新 `docs/PROJECT_STATE.md`。
3. 不要因为 trivial formatting-only changes 更新 `PROJECT_STATE.md`，除非项目状态确实发生变化。
4. `PROJECT_STATE.md` 应保持 project-command-center 可读取的稳定 headings：
   - Current version
   - Current status
   - Latest completed
   - Next Action
   - Blockers
   - Important Context
   - Handoff Prompt
5. Git branch、latest commit、working tree 由 project-command-center 实时 Git 扫描读取，`PROJECT_STATE.md` 不应作为这些字段的权威来源。
6. 不确定的信息不要编造，写 `Needs verification`。
7. 更新项目状态时不得读取、打印或记录 secrets、`.env`、API key、access token 或其他敏感信息。

## Git workflow

Do not commit or push unless the user explicitly asks.

Before finishing a task, run or request the appropriate status checks:

- `git branch --show-current`
- `git status --short`
- `git log --oneline -5` when useful

If on a non-main branch, clearly state the current branch and whether it has an upstream.

## Verification

Run the smallest relevant verification for the type of change:

- Vite / React code changes: `npm run build`
- Node syntax-sensitive files: `node --check` where applicable
- Python changes: `python -m py_compile` or the project test command where applicable
- docs-only changes: `git diff --check` is enough unless docs tooling exists

Do not run unnecessary heavy checks for docs-only changes.

## Final response format

At the end of each task, report:

- modified files
- whether business code changed
- whether external project files changed
- whether secrets were read or printed
- verification run and result
- git status summary
- whether `PROJECT_STATE.md` was updated or why it was not needed
- whether commit is recommended
- next suggested action
