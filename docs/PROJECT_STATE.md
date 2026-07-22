# Project

食品过期管理

## Repo path

`/Users/wp/Projects/食品过期管理`

## Current version

v0.2.12-B1 implemented locally: Product Detail Action Refactor.

## Current status

v0.2.12-B1 商品详情操作重构已完成本地实现：详情页现在有查看、商品编辑和库存操作三个状态。商品编辑只更新 `products`；库存操作目前只展示当前库存与后续消耗确认位置。B1 自动化测试和生产构建通过，移动端视觉验收尚未完成。v0.2.11 图片上传的 Production 手机真机验收仍未完成。

## Latest completed

v0.2.12-B1 将 `BatchDetail` 拆分为 `view`、`product-edit` 和 `inventory-operation`。查看模式不再显示保存、消耗或输入控件；商品保存不再触及批次数量；库存操作暂不执行写入。

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
- v0.2.10｜Email OTP Authentication Flow
- v0.2.12-A｜首页 Mobile UX Polish
- v0.2.12-B1｜商品详情操作重构

## Last verified

2026-07-22: v0.2.12-B1 automated tests (15 files / 136 tests) and production build passed locally; mobile visual acceptance needs verification.

## Next Action

在 iPhone / Android PWA 完成 v0.2.12-A 底部导航和 v0.2.12-B1 商品详情三态 smoke；确认查看模式没有输入或消耗按钮、商品编辑不会触发库存更新。之后再设计 v0.2.12-B2 的消耗二次确认。

## Blockers

Production 手机真机图片上传验收尚未完成。

## Important Context

- Core model separates `products` from `inventory_batches`; same product can have multiple independent batches.
- Every inventory entry must result in an `expiry_date`.
- App no longer creates new anonymous users when no session exists; email OTP is now the default login path.
- Existing anonymous sessions were only a migration bridge; current formal inventory owner is the permanent email account.
- Old anonymous business data was migrated by changing `products.user_id` and `inventory_batches.user_id` to the permanent account in a fail-closed SQL transaction; product IDs and batch `product_id` references were preserved.
- Supabase Free may pause after inactivity; recovery window details must come from real email or Dashboard, not estimates.
- Vercel Production URL is https://food-expiry-manager-two.vercel.app/.
- Vercel frontend environment variables are limited to `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`; service role keys and Go-UPC API keys must not be exposed to the frontend.
- Supabase Production Site URL / Redirect URL are configured; local `localhost:5177` and `127.0.0.1:5177` redirects remain available for local testing.
- v0.2.10 keeps `detectSessionInUrl` unchanged for possible future Auth flows, but Email OTP no longer supplies `emailRedirectTo` or requires a URL callback. Supabase Auth + Resend SMTP and the hosted email template have been configured outside Git to send `{{ .Token }}`.
- v0.2.10 acceptance passed for local development, Production Web, and iPhone standalone Web App. iPhone Safari was not separately tested; it is non-blocking because the standalone scenario was the target regression.
- Migrated test inventory was cleared by the user in Supabase for the permanent email account only; the permanent Auth user was kept. Local pre-migration JSON backup remains outside Git.
- v0.2.9 uses a daily Vercel Cron scheduled as `17 4 * * *`; on Hobby it runs once during the UTC 04:00-04:59 window, not necessarily at 04:17.
- The Cron endpoint uses server-only `CRON_SECRET`; the anon RPC is intentionally public but only returns `true` and has no business-data access or write effects. No service role key is used.
- Browser access without Authorization returns 401 / `{"ok":false}`, which is the expected protected behavior.
- Production acceptance confirmed the first automatic keepalive chain: Vercel Cron → `/api/supabase-keepalive` → `CRON_SECRET` auth → 3 read-only `keepalive_ping()` RPC calls → Supabase API Logs with three `POST /rest/v1/rpc/keepalive_ping` 200 entries.
- Cron failure only affects that keepalive run and does not block normal App login, inventory, or barcode scanning.
- Documentation ownership: `README.md` is the entrypoint; `ROADMAP` is long-term route; `BACKLOG` is near-term priority; `BARCODE_API_EVALUATION` and `DATA_MODEL` remain dedicated specialist docs; `DECISIONS` records key decisions.
- v0.2.1 Go-UPC Edge Function integration is complete and deployed.
- Go-UPC API key must stay in Supabase Edge Function server-side secret `GO_UPC_API_KEY`; never expose it through Vite frontend env vars.
- Current external lookup order is local `products` → Go-UPC Edge Function → Open Food Facts universal → Open Pet Food Facts → normal Open Food Facts → manual entry.
- Barcode Lookup is a possible future fallback, not implemented.
- EAN-Search / EAN-Suche is a possible future `suggested_match` fallback, not implemented.
- Go-UPC category can be too generic for pet food, e.g. `Snack Foods`; third-party category is ignored by the frontend and is not saved or prefilled into the category selector.
- Saved product information is reused locally by barcode; users can edit saved product display fields from the inventory batch detail view.
- v0.2.12-B1 的 `BatchDetail` 有 `view`、`product-edit`、`inventory-operation` 三个状态。商品编辑只更新 `products`；当前库存操作模式不执行 quantity、status 或新增库存写入。
- B2 才会在库存操作模式接入带二次确认的批次消耗；届时只影响选中的 `inventory_batches`，并继续保持批次独立的 expiry date 和 status。
- Home filtering operates on active batches and combines expiry time window, category, and product/brand search while preserving the existing expiry-date ordering.
- v0.2.12-A 顶层页面只有“库存”和“我的”两个 Tab；居中的 `+` 是新增商品操作而非第三个 Tab。三个入口使用内置 SVG 图标，默认灰色、选中 Tab 使用现有绿色；新增商品、库存详情和编辑任务流不显示底部导航；固定导航和内容底部均保留 iPhone PWA 安全区。
- Home cards intentionally stay summary-only: product image/name, category, remaining quantity, expiry date, and expiry-window badge. Brand and barcode remain detail-level information.
- Product data APIs must not infer shelf life.
- Direct phone photo or album image upload is the next candidate; it likely needs Supabase Storage, compression, Storage RLS, upload / replace / delete, and orphan-file cleanup design.

## Handoff Prompt

Verify v0.2.12-A and B1 on iPhone and Android PWA: the bottom navigation must clear the Home Indicator, the center `+` must open the existing add flow, and the inventory page must have no duplicate add button. In product detail, view mode must show only “编辑商品” and “库存操作”; product-edit must not expose quantity; inventory-operation must not write inventory. Then plan B2 consumption confirmation.
