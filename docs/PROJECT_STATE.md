# Project

食品过期管理

## Repo path

`/Users/wp/Projects/食品过期管理`

## Current version

v0.2.1 Go-UPC Edge Function integration completed.

## Current status

Mobile-first React/Vite food and pet food inventory app using Supabase Anonymous Auth, Postgres, RLS, barcode scanning, Go-UPC service-side lookup through Supabase Edge Function, and Open Food Facts / Open Pet Food Facts fallback. Go-UPC is deployed and has passed real manual acceptance. Documentation ownership is now lightweight: `ROADMAP` for long-term route, `BACKLOG` for near-term execution, and dedicated docs for data model and barcode API evaluation.

## Latest completed

v0.2.1 Go-UPC Edge Function integration, deployment, and real manual acceptance. Real barcode `4255634604636` successfully prefilled product name, brand, and image; second lookup reused local `products`; same barcode with different expiry dates created independent `inventory_batches`.

## Last verified

2026-06-26: Go-UPC online Edge Function manual acceptance passed. Automated verification from the implementation record: `npm test`, `npm run build`, and `git diff --check` passed on 2026-06-25. Current docs-only verification: `git diff --check` passed.

## Next Action

Decide whether to start v0.2.2: product information editing and category correction. Before implementation, clarify how API-provided category should be treated as reference-only and how product edits should update all batches sharing the same `product`.

## Blockers

No blocker for v0.2.1. v0.2.2 needs product/design decisions for category confirmation and product edit UX. Current-session automated verification is still Needs verification.

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
- Go-UPC category can be too generic for pet food, e.g. `Snack Foods`; third-party category should be treated as reference-only until v0.2.2 resolves category correction.
- Saved product information is reused locally by barcode; incorrect first-save product data currently persists until product editing exists.
- Product data APIs must not infer shelf life.

## Handoff Prompt

Continue 食品过期管理 after v0.2.1 Go-UPC Edge Function integration and P1 lightweight documentation ownership cleanup. Read README and project docs, then confirm `docs/PROJECT_STATE.md` is current. Next likely work is v0.2.2: product information editing and category correction. Preserve `products` / `inventory_batches` separation, keep every same-barcode save as an independent batch, keep provider keys out of frontend code, and treat third-party category as reference-only unless the user confirms the intended behavior.
