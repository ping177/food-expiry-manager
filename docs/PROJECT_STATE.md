# Project

食品过期管理

## Repo path

`/Users/wp/Projects/食品过期管理`

## Current version

v0.2.1 barcode API coverage evaluation completed; preparing v0.2.2 service-side barcode lookup integration.

## Current status

Mobile-first React/Vite food and pet food inventory app using Supabase Anonymous Auth, Postgres, RLS, barcode scanning, and Open Food Facts / Open Pet Food Facts lookup. Barcode API coverage evaluation is complete; next work waits on Go-UPC free API key approval before v0.2.2 service-side integration.

## Latest completed

v0.2 barcode scanning and product information autofill, local product reuse by barcode, independent inventory batches, real Supabase manual acceptance for repeated barcode batches, and v0.2.1 barcode API coverage evaluation.

## Latest commit

`eb1aee2 chore: fix local dev port`

## Working tree

Clean at verification time.

## Last verified

2026-06-25

## Next Action

等待 Go-UPC free API key；拿到 key 后进入 v0.2.2，通过服务端代理接入真实 barcode lookup。

## Blockers

Go-UPC free API key approval 未完成；商业 barcode API key 不能暴露在前端，需要服务端代理。

## Important Context

- Core model separates `products` from `inventory_batches`; same product can have multiple independent batches.
- Every inventory entry must result in an `expiry_date`.
- Supabase Anonymous Auth keeps the app open-and-use, but account recovery and cross-device continuity remain future work.
- v0.2.1 API coverage evaluation is complete.
- Go-UPC is the first candidate.
- Barcode Lookup is the second fallback.
- EAN-Search / EAN-Suche is the third `suggested_match` fallback.
- Product data APIs must not infer shelf life.

## Handoff Prompt

Continue 食品过期管理 by waiting for the Go-UPC free API key approval. Once available, enter v0.2.2 and implement real barcode lookup through a service-side proxy while preserving product/batch separation and keeping provider keys out of frontend code.
