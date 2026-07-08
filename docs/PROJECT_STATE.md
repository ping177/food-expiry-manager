# Project

食品过期管理

## Repo path

`/Users/wp/Projects/食品过期管理`

## Current version

v0.2.6 completed: Supabase Free Tier operations docs.

## Current status

Supabase Free 项目曾因 inactivity 自动暂停，已于 2026-07-07 手动 Resume。当前继续使用 Supabase Free，下一步完成恢复核验、备份说明和 Vercel 部署，再根据真实使用情况决定是否启用轻度保活。

## Latest completed

v0.2.6 已完成 Supabase Free Tier pause / resume、恢复 smoke、备份边界和未来轻度保活策略的 docs-only 收口。

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

## Last verified

2026-07-08: docs-only operations update; `git diff --check` passed. Code test/build not rerun because business code was not changed.

## Next Action

P0: complete Supabase Resume smoke, then deploy to Vercel and run phone HTTPS smoke test. P1: define executable backup / restore practice and decide whether light keepalive is needed after real usage.

## Blockers

暂无明确阻塞。

## Important Context

- Core model separates `products` from `inventory_batches`; same product can have multiple independent batches.
- Every inventory entry must result in an `expiry_date`.
- Supabase Anonymous Auth keeps the app open-and-use, but account recovery and cross-device continuity remain future work.
- Supabase Free may pause after inactivity; recovery window details must come from real email or Dashboard, not estimates.
- Vercel is the preferred first deployment target for phone HTTPS smoke testing; Netlify is a backup and GitHub Pages is not preferred for this stage.
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

Continue 食品过期管理 after v0.2.6 Supabase Free Tier operations docs. Read README and project docs, then confirm `docs/PROJECT_STATE.md` is current. Next recommended action is Supabase Resume smoke, then Vercel deployment plus phone HTTPS smoke test. Preserve `products` / `inventory_batches` separation, keep every same-barcode save as an independent batch, keep provider keys out of frontend code, keep `GO_UPC_API_KEY` only in Supabase Edge Function secrets, do not read or record secrets, and do not modify Supabase schema / RLS without explicit scope.
