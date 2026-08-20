# Project

食品过期管理

## Repo path

`/Users/wp/Projects/食品过期管理`

## Current version

v0.3.2 — Product Deletion & Storage Cleanup.

## Current status

v0.3.1 已完成并关闭。当前 v0.3.2 初始 Product deletion RPC migration 与 Storage cleanup corrective migration 均已部署并验证；本地共享 Storage cleanup 修复已完成，前端 Production 发布确认与 Production / iPhone PWA 复验仍待执行。Archive 详情仍保留历史 batch 删除，Product 删除继续由数据库 RPC 权威执行，并对 standalone 图片删除与 Product deletion 共用严格自有路径 cleanup / retry。完整本地测试、build 与 diff check 已通过；版本尚未 completed / closed。Category Navigation 继续顺延。

## Latest completed

完成并关闭 v0.3.1 Archive & Navigation Foundation：新增移动端侧边栏“库存 / 已归档”、独立 consumed 查询与历史卡片、只读 consumed 详情、历史 batch 二次确认删除，以及 consume / mark-consumed 的 0-row 防误报。保留现有底部双 Tab 与独立 `+`，未迁移分类。随后完成 v0.3.2 初始 RPC migration 与 Storage cleanup corrective migration 部署验证，以及本地共享 Storage cleanup corrective fix：standalone 图片删除与 Product deletion 共用 tri-state owned-path resolver / remove primitive，Storage 失败和不可验证路径均显式进入 pending / warning；Production / iPhone PWA 两条图片流程 manual acceptance 待执行。

## Deployment

Status: public_deployed
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
- v0.2.12-B2｜库存操作
- v0.2.12-C｜删除库存批次
- v0.2.12-D｜商品容量 / 规格
- v0.3.1｜Archive & Navigation Foundation（已完成）
- v0.3.2｜Product Deletion & Storage Cleanup（RPC 与 Storage corrective migration 已部署；Production / iPhone PWA manual acceptance 待执行）

## Last verified

2026-08-20: v0.3.2 Storage corrective fix 定向验证 4 files / 43 tests，完整 `npm test` 26 files / 228 tests，`npm run build` 与 `git diff --check` 均通过；初始 RPC migration 与 Storage corrective migration 已由用户部署并验证，`product-images` 已有 authenticated owner-scoped INSERT / UPDATE / DELETE / SELECT policies。前端 Production 发布确认与 standalone / Product deletion 两条图片 cleanup 流程 Production / iPhone PWA manual acceptance 待执行。此前 v0.3.1 Production / iPhone PWA 1–9 均 PASS。No further Supabase operation was performed by Codex.

## Next Action

下一步确认本轮前端修复进入 Production 后，重新完成 standalone “删除用户图片”与 whole Product deletion 的 Production / iPhone PWA Storage cleanup / retry 验收；通过后再将版本标记 completed / closed。Category Navigation 继续顺延。

## Blockers

Storage corrective migration 已部署并验证；前端 Production 发布确认与两条真实图片 cleanup 流程重新验收仍未完成，因此 v0.3.2 不能关闭。

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
- v0.2.12-B1 的 `BatchDetail` 有 `view`、`product-edit`、`inventory-operation` 三个状态；B2 已在 inventory-operation 接入新增库存和消耗确认。
- B2 新增库存只影响既有 `product_id` 对应的 `inventory_batches`：同日期 active 批次只更新 quantity，不同日期插入新 batch；消耗只更新选中 batch 的 quantity 或显式 status。
- C 删除只作用当前 `inventory_batches`；确认请求按 batch id 与当前 user id 限定，成功后返回首页并刷新 active batches。不得删除 `products`、`user_image_url`、Storage 图片或其他 batch。
- Home filtering operates on active batches and combines expiry time window, category, and product/brand search while preserving the existing expiry-date ordering.
- v0.2.12-A 顶层页面只有“库存”和“我的”两个 Tab；居中的 `+` 是新增商品操作而非第三个 Tab。三个入口使用内置 SVG 图标，默认灰色、选中 Tab 使用现有绿色；新增商品、库存详情和编辑任务流不显示底部导航；固定导航和内容底部均保留 iPhone PWA 安全区。
- Home cards intentionally stay summary-only: product image/name, category, remaining quantity, expiry date, and expiry-window badge. Brand and barcode remain detail-level information.
- v0.2.12-D 在首页摘要中为有值商品增加规格标签；规格属于 product，不属于 batch。无 barcode 复用必须同时匹配名称、品牌和规格。
- Product data APIs must not infer shelf life.
- v0.2.11 商品图片上传已在 Production iPhone PWA 完成拍照、相册选择、替换、删除用户图片及 fallback、刷新 / 重开状态保持验收；双账号图片隔离和 Android 图片流程未手动覆盖，均为 deferred / not manually covered，不作为 blocker。
- v0.3.1 Archive 只查询 `status='consumed'`，active 首页继续只查询 `status='active'`；Archive 与 active 使用独立数据、loading、error、搜索和分类状态。
- v0.3.1 已归档入口位于库存标题区 hamburger 打开的左侧 drawer；drawer 只包含“库存”和“已归档”，底部导航仍严格为“库存 | + | 我的”。分类迁移到 sidebar、恢复 consumed、批量删除和分页均 deferred。
- v0.3.1 删除历史 batch 只按 batch id、当前 user id 和 `status='consumed'` 约束，成功后停留 Archive；Product、`user_image_url`、Storage object 和其他 batch 保留。
- v0.3.1 Production / iPhone PWA closeout 已完成；1–9 项人工验收全部 PASS。
- v0.3.2 Product 删除由已部署并验证的 `delete_product_with_history(uuid)` RPC 权威执行：Product 行锁 + `active` guard + consumed/discarded 历史清理 + Product 删除同事务完成；不使用 FK CASCADE。客户端预检查仅用于 UI，不能替代 RPC。
- v0.3.2 DB-first 后 Storage cleanup 失败是可见的 partial success；仅当前会话提供同一自有对象路径 retry，不自动重试 destructive RPC，不尝试删除外部 `image_url`。
- v0.3.2 corrective fix 已让 standalone 图片删除与 Product deletion 共用 tri-state owned-path resolver / Storage remove primitive：无 `user_image_url` 不需清理；可验证自有 Production URL 必须调用 remove；无法验证的非空 URL 显示 warning / cleanup pending，不静默成功。`product-images` 的 authenticated owner-scoped INSERT / UPDATE / DELETE / SELECT policies 已由用户在 Production 验证。

## Handoff Prompt

Confirm the pushed frontend is live, then complete v0.3.2 acceptance for standalone user-image deletion and whole Product deletion: validate actual owned-object remove / retry, invalid-path warning, active guard, atomic historical deletion, Product isolation, external-image safety, Archive history deletion regression, and iPhone PWA persistence. Do not close the version before manual acceptance passes; keep Category Navigation deferred.
