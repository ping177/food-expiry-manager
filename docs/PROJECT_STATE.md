# Project

食品过期管理

## Repo path

`/Users/wp/Projects/食品过期管理`

## Current version

v0.2.2 first step completed: saved product information editing.

## Current status

Mobile-first React/Vite food and pet food inventory app using Supabase Anonymous Auth, Postgres, RLS, barcode scanning, Go-UPC service-side lookup through Supabase Edge Function, and Open Food Facts / Open Pet Food Facts fallback. Go-UPC is deployed and has passed real manual acceptance. The home inventory list now uses lightweight summary cards; tapping a batch opens a detail view where product information can be edited, current batch quantity can be corrected, and daily usage can be recorded with “消耗 1”.

## Latest completed

v0.2.2 first step: saved product information editing moved into a batch detail view. Home cards are now scan-friendly summaries with no edit button stack. The detail view shows product, barcode, expiry status, remaining days, and inventory quantity; editing updates product fields and the selected batch's current quantity through separate update calls, “消耗 1” decrements only the selected batch, barcode stays read-only, and shared product edits synchronize across batches.

## Last verified

2026-06-28: `npm test` passed with 6 test files and 49 tests. `npm run build` passed. `git diff --check` passed.

## Next Action

Continue v0.2.2 with the remaining category correction decision: clarify whether API-provided category should be treated as reference-only during save, require user confirmation, or be filtered by a small local category rule.

## Blockers

No blocker for saved product editing. Remaining v0.2.2 category correction needs product/design decisions before implementation.

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
- Saved product information is reused locally by barcode; users can now edit saved product display fields from the inventory batch detail view.
- Product editing updates `products` only. Quantity correction and “消耗 1” in detail update the selected `inventory_batches` row only. `inventory_batches` remain separate and keep their own expiry date and status.
- Product data APIs must not infer shelf life.

## Handoff Prompt

Continue 食品过期管理 after v0.2.2 first step: saved product information editing through a batch detail view. Read README and project docs, then confirm `docs/PROJECT_STATE.md` is current. Next likely work is the remaining v0.2.2 category correction decision and implementation. Preserve `products` / `inventory_batches` separation, keep every same-barcode save as an independent batch, keep provider keys out of frontend code, and treat third-party category as reference-only unless the user confirms the intended behavior.
