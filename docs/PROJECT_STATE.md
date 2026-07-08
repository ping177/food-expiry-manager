# Project

食品过期管理

## Repo path

`/Users/wp/Projects/食品过期管理`

## Current version

v0.2.7 completed: permanent email auth and old anonymous data migration.

## Current status

v0.2.7 已完成并通过真实验收。永久邮箱 Magic Link 账号已成为正式账号体系；旧 anonymous 库存已迁移到邮箱账号；无业务数据 anonymous users 已清理。真实登录、刷新保持、同邮箱跨浏览器登录、退出后页面清空、重新登录恢复库存、RLS 隔离和数据库数量验收均已通过。当前仍为本地运行，尚未部署公网。

## Latest completed

v0.2.7 完成邮箱 Magic Link 配置、本地真实登录 smoke、永久账号建立、旧匿名库存迁移、迁移后 RLS 验收、匿名用户清理和删除后最终只读验收。迁移后正式账号拥有 8 个 products、12 个 batches，其中 active 9、consumed 3、active quantity 27；首页显示 9 个 active 批次是正确行为。

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
- v0.2.7｜永久邮箱账号与旧数据迁移

## Last verified

2026-07-08: v0.2.7 最终真实验收通过。自动化测试此前通过 12 files / 105 tests，生产构建通过，`git diff --check` 通过；本地 Magic Link、跨浏览器同邮箱、迁移数量、RLS 隔离和匿名用户删除后只读验收均通过。

## Next Action

P0: start v0.2.8 Vercel public deployment and phone HTTPS smoke. Configure production frontend env vars, production Site URL / Redirect URL, then verify Magic Link, same-email login, inventory recovery, camera scanning, Go-UPC fallback, add/edit/consume/filter flows on phone.

## Blockers

暂无明确阻塞。

## Important Context

- Core model separates `products` from `inventory_batches`; same product can have multiple independent batches.
- Every inventory entry must result in an `expiry_date`.
- App no longer creates new anonymous users when no session exists; email Magic Link is now the default login path.
- Existing anonymous sessions were only a migration bridge; current formal inventory owner is the permanent email account.
- Old anonymous business data was migrated by changing `products.user_id` and `inventory_batches.user_id` to the permanent account in a fail-closed SQL transaction; product IDs and batch `product_id` references were preserved.
- Supabase Free may pause after inactivity; recovery window details must come from real email or Dashboard, not estimates.
- Vercel is the next deployment target for v0.2.8; Cron / Supabase keepalive is not part of v0.2.8 and remains a later decision based on real usage.
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

Continue 食品过期管理 after v0.2.7 permanent email auth and old data migration closure. Read README and project docs, then begin v0.2.8 Vercel public deployment and phone HTTPS smoke. Preserve `products` / `inventory_batches` separation, keep every same-barcode save as an independent batch, keep email Magic Link as the formal account path, do not create new anonymous users, do not use service role keys in the frontend, keep `GO_UPC_API_KEY` only in Supabase Edge Function secrets, do not read or record secrets, and do not modify Supabase schema / RLS without explicit scope.
