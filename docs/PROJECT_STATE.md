# Project

食品过期管理

## Repo path

`/Users/wp/Projects/食品过期管理`

## Current version

v0.2.3 completed: manual category selection and home filtering.

## Current status

Mobile-first React/Vite food and pet food inventory app using Supabase Anonymous Auth, Postgres, RLS, barcode scanning, Go-UPC service-side lookup through Supabase Edge Function, and Open Food Facts / Open Pet Food Facts fallback. The home inventory list uses lightweight summary cards; tapping a batch opens a detail view where product information can be edited, current batch quantity can be corrected, and daily usage can be recorded with “消耗 1”. Product category is now user-selected from an internal list, and home supports combined expiry-window, category, and product/brand search filters.

## Latest completed

v0.2.3: category selection and home filtering. Add/edit product forms use the shared built-in category list and allow empty category. Third-party API category values are ignored and are not prefilled into the category selector; locally saved product category is still reused. Home filters combine expiry time window, category, and search while preserving expiry-date order and keeping consumed batches hidden. Home cards and detail expiry badges use the same expiry-window labels. The UI display name is now “库存保质期管理”.

## Last verified

2026-06-28: `npm test` passed with 10 test files and 76 tests. `npm run build` passed. `git diff --check` passed.

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
- Product data APIs must not infer shelf life.

## Handoff Prompt

Continue 食品过期管理 after v0.2.3 manual category selection and home filtering. Read README and project docs, then confirm `docs/PROJECT_STATE.md` is current. Preserve `products` / `inventory_batches` separation, keep every same-barcode save as an independent batch, keep provider keys out of frontend code, keep third-party category ignored unless a future product decision changes it, and do not modify Supabase schema / RLS without explicit scope.
