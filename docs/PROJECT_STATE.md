# Project

食品过期管理

## Repo path

`/Users/wp/Projects/食品过期管理`

## Current version

v0.2.8 completed: Vercel public deployment and phone HTTPS smoke.

## Current status

v0.2.8 已完成。Vercel Production 已部署并通过电脑端和手机端真实验收；生产 Magic Link 登录、session 保持、退出清空、手机 HTTPS 摄像头启动、真实猫罐头条码远程查询和新增真实库存持久化均已通过。迁移测试库存已由用户清空，永久邮箱账号保留，随后开始录入真实库存。

## Latest completed

v0.2.8 完成 GitHub 仓库连接 Vercel、Vite 静态前端部署、生产 Supabase Auth Site URL / Redirect URL 配置、电脑端和手机端 Magic Link smoke、手机 HTTPS 摄像头 smoke，以及真实条码远程查询后新增库存刷新持久化验收。清理迁移测试库存后只读验收为 products = 0、inventory_batches = 0。

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

## Last verified

2026-07-08: v0.2.8 生产部署与手机验收通过。电脑端和手机端 Production URL 可用，Magic Link 登录成功，session 刷新 / 重新打开保持，退出后库存立即清空，手机 HTTPS 摄像头可启动，真实条码远程查询成功并可保存库存；本轮文档收口后自动测试、生产构建和 `git diff --check` 通过。

## Next Action

P0: v0.2.9 Supabase light keepalive and operations strategy. First observe real production usage and pause risk, then decide whether to implement a no-side-effect health query. Do not default to Cron.

## Blockers

暂无明确阻塞。

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
- v0.2.9 is the next operations decision point for Supabase light keepalive; observe usage first and do not default to Cron.
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

Continue 食品过期管理 after v0.2.8 Vercel production deployment and phone HTTPS smoke. Read README and project docs, then plan v0.2.9 Supabase light keepalive / operations strategy by observing real production usage first. Preserve `products` / `inventory_batches` separation, keep every same-barcode save as an independent batch, keep email Magic Link as the formal account path, do not create new anonymous users, do not expose service role keys or Go-UPC keys in the frontend, keep `GO_UPC_API_KEY` only in Supabase Edge Function secrets, do not read or record secrets, and do not implement Cron by default.
