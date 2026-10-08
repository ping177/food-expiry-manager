# Project

食品过期管理

## Repo path

`/Users/wp/Projects/食品过期管理`

## Current version

v0.3.5 — Mobile Gesture Navigation

## Current status

v0.3.5 Final Gesture Usability Fix 本地实现完成，automated verification PASS，最终聚焦review无blocker；等待Production iPhone PWA重新验收。用户此前确认318cfe6的卡片/分类tap与swipe、Product Edit/Add/Add Inventory退出保护、危险确认保护及纵向滚动PASS；其左边缘限制、Detail上下空白和Add起滑不足的三项UX findings保留。本次A/B/C修复未获新Production人工PASS，未completed / closed。

## Latest completed

完成A/B/C定向修复：删除应用24px边缘排除；main作为完整页面监听面，主列表复用原open controller，任务页仅转发给原Detail/Add组件controller并移除子section重复绑定；允许label非编辑文字起滑，实际编辑/扫码/picker/保存/删除继续排除。保持mode Back、Protected Exit、busy/confirmation、click suppression及全部其他阈值。定向13 files / 152 tests、完整29 files / 329 tests与build PASS。

## Deployment

Status: public_deployed
Public URL: https://food-expiry-manager-two.vercel.app/
Provider: Vercel
Notes: Vercel uses Vite, root directory `.`, build command `npm run build`, output directory `dist`. 已确认 implementation commit `989ee41f343e47c36e1ea987f3d8b65517345766` 的 GitHub Vercel check 与 Production deployment status 均 success；用户 Production iPhone PWA 人工验收 PASS。Production 桌面浏览器未单独验收。此记录对应 v0.3.4 implementation 部署；docs-only closeout push 不代表新的人工验收。v0.3.5 原 implementation commit `a811b11e7671557962be2bd056506e50efa95705` 的 Vercel check 与 Production deployment status 已确认 success；普通起滑位置手势体验 FAIL，指定非交互起点三项 PASS。修复commit `318cfe6a991bdc798fed1fccd282933c08e176f7` 的Vercel check与Production deployment已确认success；用户已确认卡片/分类tap与swipe、三类表单退出保护、危险确认保护及纵向滚动PASS，A/B/C可用性仍需修复。本轮Final Gesture Usability Fix最终review无blocker，用户已授权独立fix commit及正常push；其部署结果按新commit确认，本记录不预报部署成功。旧部署及部分功能PASS不代表本轮新修复验收PASS。

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
- v0.3.2｜Product Deletion & Storage Cleanup（已完成并关闭）
- v0.3.3｜Discarded Batch Archive Flow（已完成并关闭）
- v0.3.4｜Category Navigation（completed / closed；local 与 Production iPhone PWA 验收 PASS，Production desktop 未单独验收）

- v0.3.5｜Mobile Gesture Navigation（A/B/C体验修复本地完成，automated verification PASS；awaiting Production iPhone PWA复验，未 closed）

## Last verified

2026-10-08：A/B/C修复定向152、完整329 tests、build、diff/语法/范围及治理检查PASS；build保留>500 kB chunk警告。新增11项回归并先观察失败；接线测试改为从生产路径的main触发，不模拟已移除的section绑定。318cfe6已部署且上述六组功能由用户确认PASS；最终release review仅调整治理文档，业务代码/测试未变，沿用152/329/build证据；新修复Production/iPhone PWA/Safari人工验收未执行。Node不证明iOS系统边缘仲裁、真实DOM命中、label默认聚焦/软键盘/文本选择。

## Next Action

在本次A/B/C修复的Production部署可用后，按docs/TESTING.md由用户iPhone PWA复验左边缘起滑、Active/Archive Detail顶部与底部空白、Add标题/label/底部覆盖，同时回归内部mode、Protected Exit、重要控件、click suppression与既有PASS；等待真实PASS / FAIL，不关闭v0.3.5。

## Blockers

暂无明确阻塞。

## Important Context

- v0.3.5 使用 touch-only Pointer Events，局部 pan-y / pinch-zoom，不接管系统 Back、不使用 browser history。首版卡片/分类起滑受限导致普通位置验收 FAIL；318cfe6已允许卡片/分类/展示图片且相关真机PASS；本地A/B/C修复移除边缘限制、将监听面移至main并允许label文字，继续保护实际编辑/危险控件和局部尾随click；dirty 退出拒绝保留草稿与待上传图片，确认操作/提交期间禁用 swipe。

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
- v0.3.1 的 Archive 基线只查询 `status='consumed'`；v0.3.3 已扩展为同时查询 `consumed / discarded`，active 首页继续只查询 `status='active'`；Archive 与 active 使用独立数据、loading、error、搜索和分类状态。
- 已归档入口位于库存标题区 hamburger 打开的左侧 drawer；v0.3.4 在“库存”下显示“全部”与 PRODUCT_CATEGORIES，分类只作用 Active，Archive 保留自身 category select。底部导航仍为“库存 | + | 我的”；恢复 consumed、批量删除和分页仍 deferred。
- v0.3.3 当前库存删除按 batch id、当前 user id 和 `status='active'` 限定，只更新为 `discarded`；Archive 历史删除按 batch id、当前 user id 和 `status in ('consumed', 'discarded')` hard delete，Product、`user_image_url`、Storage object 和其他 batch 保留。
- v0.3.1 Production / iPhone PWA closeout 已完成；1–9 项人工验收全部 PASS。
- v0.3.2 Product 删除由已部署并验证的 `delete_product_with_history(uuid)` RPC 权威执行：Product 行锁 + `active` guard + consumed/discarded 历史清理 + Product 删除同事务完成；不使用 FK CASCADE。客户端预检查仅用于 UI，不能替代 RPC。
- v0.3.2 DB-first 后 Storage cleanup 失败是可见的 partial success；仅当前会话提供同一自有对象路径 retry，不自动重试 destructive RPC，不尝试删除外部 `image_url`。
- v0.3.2 corrective fix 已让 standalone 图片删除与 Product deletion 共用 tri-state owned-path resolver / Storage remove primitive；用户已在 Production / iPhone PWA 验证自有 Storage object 实际删除和 active guard，均 PASS。`product-images` 的 authenticated owner-scoped INSERT / UPDATE / DELETE / SELECT policies 已由用户在 Production 验证。
- v0.3.3 不新增 migration；复用现有 `status` 约束、v0.3.2 Product deletion RPC 与 Storage cleanup contract。

## Handoff Prompt

Continue v0.3.5 Final Gesture Usability Fix awaiting Production iPhone PWA reacceptance. User previously confirmed six groups of PASS on 318cfe6, but left-edge and Detail/Add visible-region coverage findings remained; preserve that history. Local A/B/C fix removed the application edge exclusion, moved the event surface to main, forwards task events to the existing child controller and clears it on unmount without duplicate section binding, and allows non-editor label text. Final focused review found no blocker: Sidebar open disables main open; internal mode/protected exits and Bottom Navigation exclusions remain; click suppression is unchanged. Targeted152/full329/build evidence is retained because code/tests did not change during release review. User authorized an independent fix commit and normal origin/main push on 2026-10-08; query its Vercel deployment by the new commit. Real iOS edge arbitration, hit areas, label focus/keyboard/selection and prior PASS regression require reacceptance. Do not close v0.3.5 before user PASS.
