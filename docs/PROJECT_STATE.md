# Project

食品过期管理

## Repo path

`/Users/wp/Projects/食品过期管理`

## Current version

v0.2.9 acceptance in progress: Supabase light keepalive and operations.

## Current status

v0.2.9 本地实现与自动化验证已完成，等待 Production migration、服务端配置、手动 401/200 验收和首次自动 Cron 200。v0.2.8 生产站点及核心手机流程保持已验收状态。

## Latest completed

v0.2.9 已新增固定返回 `true` 的无副作用 `keepalive_ping()` migration、受服务端 `CRON_SECRET` 保护的 `/api/supabase-keepalive`、每日一次 Vercel Cron 配置和 endpoint 自动化测试；尚未完成生产验收。

## Deployment

Status: deployed
Public URL: https://food-expiry-manager-two.vercel.app/
Provider: Vercel
Notes: Vercel uses Vite, root directory `.`, build command `npm run build`, output directory `dist`.

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
- v0.2.8｜Vercel 公网部署与手机验收
- v0.2.9｜Supabase 轻度保活与运维策略

## Last verified

2026-07-09: v0.2.9 本地实现与验证完成；Production migration、手动 endpoint 验收及首次自动 Cron 尚待执行。

## Next Action

P0: 部署 v0.2.9 migration 和 Production 配置，完成 endpoint 手动 401/200、Runtime Logs、首次自动 Cron 200、无业务数据变化及最小 App smoke。

## Blockers

等待 Production 配置与首次自动 Cron 执行窗口。

## Important Context

- Core model separates `products` from `inventory_batches`; same product can have multiple independent batches.
- Every inventory entry must result in an `expiry_date`.
- App no longer creates new anonymous users when no session exists; email Magic Link is now the default login path.
- Existing anonymous sessions were only a migration bridge; current formal inventory owner is the permanent email account.
- Old anonymous business data was migrated by changing `products.user_id` and `inventory_batches.user_id` to the permanent account in a fail-closed SQL transaction; product IDs and batch `product_id` references were preserved.
- Supabase Free may pause after inactivity; recovery window details must come from real email or Dashboard, not estimates.
- Vercel Production URL is https://food-expiry-manager-two.vercel.app/.
- Vercel frontend environment variables are limited to `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`; service role keys and Go-UPC API keys must not be exposed to the frontend.
- Supabase Production Site URL / Redirect URL are configured; local `localhost:5177` and `127.0.0.1:5177` redirects remain available for local testing.
- Migrated test inventory was cleared by the user in Supabase for the permanent email account only; the permanent Auth user was kept. Local pre-migration JSON backup remains outside Git.
- v0.2.9 uses a daily Vercel Cron scheduled as `17 4 * * *`; on Hobby it runs once during the UTC 04:00-04:59 window, not necessarily at 04:17.
- The Cron endpoint uses server-only `CRON_SECRET`; the anon RPC is intentionally public but only returns `true` and has no business-data access or write effects.
- v0.2.9 remains in acceptance until the first automatic Cron returns 200 with three successful RPC calls.
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
- Direct phone photo or album image upload is a later candidate after Supabase operations / keepalive strategy; it likely needs Supabase Storage, compression, Storage RLS, upload / replace / delete, and orphan-file cleanup design.

## Handoff Prompt

Continue v0.2.9 Production acceptance. Apply the tracked `keepalive_ping()` migration, configure the server-only Cron credential without recording its value, deploy from Git, verify unauthenticated 401 and authorized 200 with three successful RPC calls, then confirm the first automatic Hobby Cron within UTC 04:00-04:59. Verify no business-data change and run the minimal App smoke before marking v0.2.9 complete.
