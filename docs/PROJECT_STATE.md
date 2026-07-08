# Project

食品过期管理

## Repo path

`/Users/wp/Projects/食品过期管理`

## Current version

v0.2.7 Phase 1 implemented with review fixes: permanent email auth code, tests, and migration runbook.

## Current status

已完成永久邮箱 Magic Link 登录的本地代码、review fixes 与文档实施：无 session 时不再静默创建 anonymous user；已有 anonymous session 继续兼容并显示访客风险；同一 user 的 auth refresh 不重复加载库存；旧数据迁移 runbook 已准备。仍待 Supabase Dashboard 配置、真实 Magic Link smoke 和旧匿名数据迁移，v0.2.7 尚未完成。

## Latest completed

v0.2.7 Phase 1 已完成 Auth 状态机、邮箱登录 UI、退出登录、用户切换清理、库存加载去重 / stale guard、mocked Auth 行为测试、fake timer cooldown 测试和 fail-closed 数据迁移 runbook。

## Deployment

Status: unknown
Public URL: none
Provider: none
Notes: 暂无人工维护的公网部署信息。

## Version Index

- v0.1 — 手动录入 MVP
- v0.2 — 扫码与商品信息
- v0.2.1 — Go-UPC 条码接入
- v0.2.2 — 批次详情编辑
- v0.2.3 — 分类与筛选
- v0.2.4 — 首页库存卡片
- v0.2.5 — 部署准备文档
- v0.2.6 — Supabase Free Tier 运维风险说明
- v0.2.7 — 永久邮箱登录与旧匿名数据安全迁移

## Last verified

2026-07-08: v0.2.7 Phase 1 review fixes; `npm test` passed with 12 files / 105 tests, `npm run build` passed, `git diff --check` passed.

## Next Action

P0: configure Supabase Email Magic Link redirect allow list for local origins, run real local Magic Link smoke, create the new permanent email account, then back up and migrate the old anonymous business data using `docs/OPERATOR_GUIDE.md`. Vercel redirect and deployment move to v0.2.8.

## Blockers

暂无明确阻塞。

## Important Context

- Core model separates `products` from `inventory_batches`; same product can have multiple independent batches.
- Every inventory entry must result in an `expiry_date`.
- App no longer creates new anonymous users when no session exists; email Magic Link is now the default login path.
- Existing anonymous sessions remain readable for compatibility, but users are warned that visitor data may be unrecoverable after clearing browser data or switching devices.
- Old anonymous business data should be migrated by changing `products.user_id` and `inventory_batches.user_id` to the new permanent account in a fail-closed SQL transaction; do not modify `product_id`.
- Supabase Free may pause after inactivity; recovery window details must come from real email or Dashboard, not estimates.
- Vercel is still the preferred first deployment target, but v0.2.7 must finish local Email Auth smoke and data migration before deployment work resumes.
- Documentation ownership: `README.md` is the entrypoint; `ROADMAP` is long-term route; `BACKLOG` is near-term priority; `BARCODE_API_EVALUATION` and `DATA_MODEL` remain dedicated specialist docs; `DECISIONS` records key decisions.
- v0.2.1 Go-UPC Edge Function integration is complete and deployed.
- Go-UPC API key must stay in Supabase Edge Function server-side secret `GO_UPC_API_KEY`; never expose it through Vite frontend env vars.
- Current external lookup order is local `products` → Go-UPC Edge Function → Open Food Facts universal → Open Pet Food Facts → normal Open Food Facts → manual entry.
- Barcode Lookup is a possible future fallback, not implemented.
- EAN-Search / EAN-Suche is a possible future `suggested_match` fallback, not implemented.
- Go-UPC category can be too generic for pet food, e.g. `Snack Foods`; third-party category is ignored by the frontend and is not saved or prefilled into the category selector.
- Saved product information is reused locally by barcode; users can now edit saved product display fields from the inventory batch detail view.
- Product editing updates `products` only. Quantity correction and “消耗 1” in detail update the selected `inventory_batches` row only. `inventory_batches` remain separate and keep their own expiry date and status.
- Home filtering operates on active batches and combines expiry time window, category, and product/brand search while preserving the existing expiry-date ordering.
- Home cards intentionally stay summary-only: product image/name, category, remaining quantity, expiry date, and expiry-window badge. Brand and barcode remain detail-level information.
- Product data APIs must not infer shelf life.

## Handoff Prompt

Continue 食品过期管理 v0.2.7 after Phase 1 email auth implementation. Read README and project docs, then verify tests/build for the current working tree. Next recommended action is Supabase Dashboard Email Magic Link local redirect setup, real Magic Link smoke, creating a permanent email account, and then using `docs/OPERATOR_GUIDE.md` to back up and migrate old anonymous data. Preserve `products` / `inventory_batches` separation, keep every same-barcode save as an independent batch, do not create new anonymous users, do not use service role keys in the frontend, keep `GO_UPC_API_KEY` only in Supabase Edge Function secrets, do not read or record secrets, and do not modify Supabase schema / RLS without explicit scope.
