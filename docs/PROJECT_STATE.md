# Project

食品过期管理

## Repo path

`/Users/wp/Projects/食品过期管理`

## Current version

v0.2.4 completed: homepage inventory card UI refresh.

## Current status

已完成 v0.2.4 首页库存卡片优化；当前可用功能包括条码识别、批次库存、手动分类和首页筛选。下一步进入部署 readiness，评估公网部署、手机使用和 anonymous session 数据连续性风险。

## Latest completed

v0.2.4: homepage inventory card UI refresh. Home cards now use a denser mobile-first inventory layout with a stable left image/placeholder, product name as the main visual, category and remaining quantity pills, expiry date, and the shared expiry-window badge. Home cards no longer show brand or barcode; those remain available in detail views. This release only changes UI/display code and does not change Supabase schema / RLS, Go-UPC Edge Function, barcode lookup flow, or dependencies.

## Last verified

2026-06-28: `npm test -- src/components/BatchCard.test.jsx` passed with 6 tests. `npm test` passed with 10 test files and 79 tests. `npm run build` passed. `git diff --check` passed.

## Next Action

Decide the next version scope. Likely next candidates are category list tuning from real use, image upload/photo flow, or account recovery.

## Blockers

No current blocker.

## Important Context

- Core model separates `products` from `inventory_batches`; same product can have multiple independent batches.
- Every inventory entry must result in an `expiry_date`.
- Supabase Anonymous Auth keeps the app open-and-use, but account recovery and cross-device continuity remain future work.
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

Continue 食品过期管理 after v0.2.4 homepage inventory card UI refresh. Read README and project docs, then confirm `docs/PROJECT_STATE.md` is current. Preserve `products` / `inventory_batches` separation, keep every same-barcode save as an independent batch, keep provider keys out of frontend code, keep third-party category ignored unless a future product decision changes it, keep home cards summary-only with brand/barcode in detail views, and do not modify Supabase schema / RLS without explicit scope.
