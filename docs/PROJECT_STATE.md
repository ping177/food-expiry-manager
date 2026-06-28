# Project

食品过期管理

## Repo path

`/Users/wp/Projects/食品过期管理`

## Current version

v0.2.5 completed: deployment readiness docs.

## Current status

已完成 v0.2.5 部署 readiness 检查；项目适合先部署到 Vercel 做手机 HTTPS smoke test。当前主要风险是 Anonymous Sign-in 的跨设备与 session 丢失问题，长期使用前建议补邮箱 / Magic Link 绑定。

## Latest completed

v0.2.5: deployment readiness docs. Documented Vercel as the preferred deployment platform, Netlify as backup, GitHub Pages as not preferred for this stage, public frontend env boundaries, Go-UPC secret boundaries, Anonymous Sign-in continuity risks, and post-deploy smoke testing.

## Last verified

2026-06-28: docs-only readiness update; `git diff --check` passed. Code test/build not rerun because business code was not changed.

## Next Action

P0: deploy to Vercel and run the phone HTTPS smoke test checklist. P1: design email / Magic Link binding or anonymous account upgrade before long-term daily use.

## Blockers

No current blocker.

## Important Context

- Core model separates `products` from `inventory_batches`; same product can have multiple independent batches.
- Every inventory entry must result in an `expiry_date`.
- Supabase Anonymous Auth keeps the app open-and-use, but account recovery and cross-device continuity remain future work.
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

Continue 食品过期管理 after v0.2.5 deployment readiness docs. Read README and project docs, then confirm `docs/PROJECT_STATE.md` is current. Next recommended action is Vercel deployment plus phone HTTPS smoke test. Preserve `products` / `inventory_batches` separation, keep every same-barcode save as an independent batch, keep provider keys out of frontend code, keep `GO_UPC_API_KEY` only in Supabase Edge Function secrets, and do not modify Supabase schema / RLS without explicit scope.
