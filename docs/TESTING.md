# 测试与验收

## 测试原则

- 首页排序、到期状态和库存操作都应以库存批次为测试单位。
- 同款商品的多个批次必须分别验证，防止误合并。
- 到期日计算应覆盖月、年、闰日和月末等边界情况。
- 库存数量不得小于 0。
- 当前测试不应依赖真实 `/Users/wp/Projects/_project-data/food-expiry-manager/`；若未来引入 filesystem persistence，应使用临时目录或注入路径验证。
- 自动化测试框架建立后，应把以下核心样例转为单元测试或端到端测试。

## 自动化测试

使用 Vitest。当前完整自动化验收结果为 26 个测试文件、234 个测试通过；其中
包含 v0.3.1 Archive / drawer、consumed 详情只读、历史 batch 删除边界、状态更新
0-row 防误报，以及既有 B1 三态详情、库存新增合并/新批次、库存消耗确认和当前
batch 删除确认边界。
核心测试文件包括：

- `src/lib/expiry.test.js`
- `src/lib/inventory.test.js`
- `src/lib/productLookup.test.js`
- `src/lib/auth.test.js`
- `src/components/AuthPanel.test.jsx`
- `src/App.test.jsx`
- `src/components/SidebarDrawer.test.jsx`
- `src/components/ArchivePage.test.jsx`
- `src/components/ArchiveBatchCard.test.jsx`
- `src/components/ArchiveBatchActions.test.jsx`
- `src/components/BatchDetail.test.jsx`：active / consumed 详情模式边界。
- `tests/supabase-keepalive.test.js`
- `src/lib/productImage.test.js`：用户图优先级、文件校验、user_id 路径、替换回滚、共享
  Storage remove primitive 和删除清理。

## v0.3.2 Product Deletion & Storage Cleanup 自动化覆盖

本地实现新增以下测试层次：

- `tests/product-deletion-rpc.test.js`：migration / canonical schema 合同，覆盖
  `ON DELETE RESTRICT`、`security invoker`、空 `search_path`、`auth.uid()`、Product
  行锁、active guard、历史状态白名单、返回合同和 `authenticated` 执行权限。
- `src/lib/productDeletion.test.js`：`blocked_active`、`not_found`、RPC 错误、DB 返回
  的锁定图片 URL、外部 / 错用户 / 错 Product URL、Storage 成功与失败、当前会话重试、
  owner + `status='active'` 预检查和 fail-closed 行为。
- `src/lib/productImage.test.js`：项目 origin、bucket marker、`user_id/product_id`
  路径校验，以及替换 / 删除 helper 只能识别自有对象。
- `tests/product-image-storage-policy.test.js`：tracked Storage owner-scoped `SELECT`
  policy migration / schema 合同，不授予 `anon` / `public` 读取权限。
- `src/components/ArchiveBatchActions.test.jsx`、`src/components/BatchDetail.test.jsx`
  和 `src/App.test.jsx`：保留历史 batch 删除、增加更危险的 Product 删除、active / loading /
  error 禁用提示、二次确认、RPC 接线、数据库和 active/archive 两路刷新。

v0.3.2 初始实现定向验证：

```bash
npm test -- --run src/components/ArchiveBatchActions.test.jsx \
  src/components/BatchDetail.test.jsx src/App.test.jsx \
  src/lib/productDeletion.test.js src/lib/productImage.test.js
```

初始结果：6 个测试文件 / 51 个测试通过（仅本地 fixtures 与 source contract，不访问
Supabase）。随后完整 `npm test` 通过 25 个测试文件 / 219 个测试，`npm run build` 与
`git diff --check` 也通过；这些本地检查不能替代远程 DB integration 或 Production 验收。

由于仓库没有可安全启动的本地 Supabase 项目配置，本地实现阶段没有连接远程或执行真实
数据库集成测试；不得用 Production 数据替代。Production migration 已由用户部署并完成
RPC / 权限 catalog 验证；接下来只需使用现有测试 Product 做下列事务 / Storage smoke。

### v0.3.2 必须覆盖的数据库 / Storage 场景

1. 只有 consumed batch 时，Product 删除返回 `deleted`，所有 consumed / discarded
   batches 与 Product 均消失，`deleted_batch_count` 准确。
2. Product 同时存在 consumed + active batch 时返回 `blocked_active`；Product、active
   和 consumed rows 均保留，Storage remove 不发生。
3. `active quantity = 0` 仍阻止 Product 删除。
4. 同一 Product 的多个历史 batches 全部删除；其他 Product 与其 batches 不受影响。
5. owned `user_image_url` 删除成功；外部 `image_url`、外部 `user_image_url`、错 user /
   错 Product path 均不触发 remove。
6. Storage remove 失败时，数据库删除已经成功且 UI 明确显示 cleanup pending；当前会话
   重试只调用 Storage remove，不重试 destructive RPC。
7. RPC / DB 错误或 0-row / stale response 不显示成功，也不触发 Storage remove。
8. 现有“删除历史批次”仍只删除当前 consumed / discarded batch，Product、图片、其他 batch 均保留。

### Production catalog preflight（只读）

部署 migration 前，在目标项目 SQL Editor 只读执行；不要把结果中的 UUID、邮箱或任何
凭据写入仓库：

```sql
select
  ccu.table_schema,
  ccu.table_name,
  ccu.column_name,
  rc.delete_rule
from information_schema.constraint_column_usage as ccu
join information_schema.referential_constraints as rc
  on rc.constraint_name = ccu.constraint_name
where ccu.table_schema = 'public'
  and ccu.table_name = 'products'
  and ccu.column_name = 'id';

select
  routine_schema,
  routine_name,
  routine_type,
  security_type,
  external_language,
  data_type
from information_schema.routines
where routine_schema = 'public'
  and routine_name = 'delete_product_with_history';

select
  grantee,
  privilege_type
from information_schema.routine_privileges
where routine_schema = 'public'
  and routine_name = 'delete_product_with_history'
order by grantee, privilege_type;

select schemaname, tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('products', 'inventory_batches')
order by tablename, policyname;
```

预期：`inventory_batches.product_id → products.id` 为 `RESTRICT`；RPC 为
`FUNCTION / INVOKER`；`authenticated` 拥有 EXECUTE，`anon` / `public` 不拥有；两表
仍有 owner-scoped SELECT / DELETE policy。该查询不读取业务行内容。

### Production migration preflight result（2026-08-20）

- PASS：`delete_product_with_history(uuid)` 已存在。
- PASS：函数为 `SECURITY INVOKER`，`search_path` 为空。
- PASS：`authenticated` 拥有 EXECUTE；`anon` / `PUBLIC` 无 EXECUTE。
- PASS：`postgres` / `service_role` 后台权限保留，无需调整。
- PASS：用户已完成 Production / iPhone PWA corrective revalidation：standalone 用户图片删除后
  Storage object 实际消失；删除整个 Product 后对应 Storage object 实际消失；Product 仍有
  active batch 时整 Product 删除被禁止。未由 Codex 执行 Product 删除业务数据操作。

### v0.3.2 Storage cleanup corrective regression（2026-08-20）

- 共享 cleanup primitive 已覆盖三态：没有 `user_image_url` 时不调用 Storage；真实
  Production public URL 严格解析为当前 `user_id/product_id/path` 后必须调用
  `remove([path])`；非空但无法安全验证的 URL 进入 `cleanup_pending` / warning，不静默成功。
- standalone “删除用户图片”、替换旧用户图片和 whole Product deletion 均复用同一
  resolver / `removeProductImagePath`；DB/UI pointer 已清除但 Storage error 时返回 partial
  success，并仅对已验证路径提供当前会话 retry；外部 `image_url` 不触发 Storage remove。
- 新增 `supabase/migrations/20260820130000_add_product_image_select_policy.sql`，补充
  authenticated owner-scoped `storage.objects` SELECT policy；用户已在 Production 验证
  `product-images` 的 owner-scoped INSERT / UPDATE / DELETE / SELECT policies，未修改 Product
  deletion RPC。用户已完成 standalone / whole Product 图片 cleanup 与 active guard 的
  Production / iPhone PWA 复验并 PASS。
- 定向验证：`src/lib/productImage.test.js`、`src/lib/productDeletion.test.js`、
  `src/App.test.jsx`、`tests/product-image-storage-policy.test.js` 共 4 个测试文件 / 43 个
  测试通过；完整 `npm test` 26 个测试文件 / 228 个测试通过，`npm run build` 与
  `git diff --check` 通过。未访问 Supabase 或 Production data。

### Production / iPhone PWA 最小人工验收

使用用户已有测试 Product；先确认它只有历史批次，若仍有 active batch，先按正常流程
处理并确认回到 Archive。完成一组后刷新 / 重新打开页面核对持久化：

1. 登录既有账号，打开 drawer → 已归档，进入测试 Product 的 consumed detail。
2. 确认“删除历史批次”和“删除整个商品”是两个独立操作；先只测试历史删除的取消路径，
   确认 Product 与图片仍保留。若要验证历史删除成功，使用另一个 consumed batch / 测试
   Product，避免先删掉唯一 Archive 入口后无法继续测试 whole-Product delete。
3. 为另一个测试 Product 保留一个 active batch（可为 quantity 0），从其 Archive detail
   观察 Product 删除按钮在检查期间禁用，并明确提示“仍有当前库存”；尝试不能提交。
4. 对无 active 的测试 Product 点击“删除整个商品”，阅读高风险二次确认，取消一次，
   再次打开后确认数据仍在。
5. 再确认删除；等待返回 Archive，测试 Product 的所有历史 cards 消失，其他 Product
   cards 不受影响，首页 active 列表仍正常。
6. 先对一个仍保留的测试 Product 单独执行“删除用户图片”：确认 DB/UI 的
   `user_image_url` 清除并正确回退后，直接在 Storage 确认同一对象已不存在；若
   Storage remove 失败，页面必须明确显示 cleanup pending 并可重试。再对无 active 的
   测试 Product 执行 whole Product deletion，重复确认其用户图片对象已清理；外部图片
   链接只验证回退显示，不应被当作 Storage 删除对象。
7. 刷新 / 关闭后重开 Archive 与库存，确认删除结果保持；再次点击已删除 Product 不得
   显示成功。
8. 不创建第二账号；cross-account smoke 继续 deferred，除非本次真实修改 RLS（本次
   不修改）。

## v0.3.3 Discarded Batch Archive Flow 自动化覆盖

- `src/lib/auth.test.js`：active query 继续只取 `status='active'`；Archive 使用
  `status in ('consumed', 'discarded')` 与 `updated_at DESC`。
- `src/lib/inventory.test.js`、`src/lib/inventoryFilters.test.js`：状态文案区分、双状态
  筛选和 active 隔离。
- `src/components/ArchivePage.test.jsx`、`src/components/ArchiveBatchCard.test.jsx`、
  `src/components/BatchDetail.test.jsx`：consumed / discarded 卡片和详情分别显示“已消耗 /
  已删除”。
- `src/App.test.jsx`：当前 active 删除只执行 owner-scoped `UPDATE status='discarded'` 并检查
  0-row；Archive 删除才对 consumed / discarded 执行 hard delete；其他 active batch 由
  batch id 条件保持隔离。
- Product deletion RPC、Storage cleanup、active guard 与现有 Archive / active 回归测试继续
  保持在完整测试中。
- v0.3.3 定向验证：8 个测试文件 / 95 个测试通过；完整 `npm test`：26 个测试文件 / 234 个
  测试通过；`npm run build` 与 `git diff --check` 通过。测试仅使用本地 fixtures 与 source
  contracts，不访问 Supabase 或 Production data。

### v0.3.3 Production / iPhone PWA 人工验收

完成发布后按以下顺序验收：

1. 在库存详情确认“删除当前库存批次”，检查确认文案说明会进入 Archive 并标记“已删除”。
2. 刷新库存，确认该 batch 不再出现；同商品其他 active batch 与 Product、图片均保留。
3. 打开 Archive，确认该 batch 与 consumed batch 同时出现，卡片状态分别为“已删除 / 已消耗”。
4. 用搜索和分类筛选分别命中两种状态；确认排序仍按最近归档更新时间优先。
5. 打开 discarded detail，确认只读、状态为“已删除”，可取消或确认“删除历史批次”。
6. 确认 discarded 与 consumed 历史 batch 均可 hard delete，Product、图片和其他 batch 不受影响。
7. 重复 v0.3.2 Product deletion / Storage cleanup smoke 的 active guard、历史清理和图片回退
   回归；不执行恢复、批量删除或独立“已删除”导航验收。

## v0.3.1 Archive & Navigation 自动化覆盖

- `src/lib/auth.test.js`：active query 默认只取 `status='active'`；v0.3.1 Archive 基线使用 `status='consumed'`、`updated_at DESC`，现由 v0.3.3 双状态查询覆盖。
- `src/lib/inventoryFilters.test.js`、`src/components/ArchivePage.test.jsx`：Archive 搜索 / 分类只作用历史数据，不带入 active 批次或临期时间窗口，并覆盖 loading、error、empty。
- `src/components/SidebarDrawer.test.jsx`：drawer 的库存 / 已归档入口、selected state、关闭控件、safe-area 和横向溢出保护；`src/App.test.jsx`：底部双 Tab + 独立 `+` 以及 App 接线。
- `src/components/ArchiveBatchCard.test.jsx`：图片、名称 / 品牌、分类、规格、原到期日和历史状态语义，不出现“剩余 0 件”或 active 到期 badge。
- `src/components/BatchDetail.test.jsx`：历史 detail 返回 Archive，隐藏 Product 编辑、图片和 active 库存操作。
- `src/components/ArchiveBatchActions.test.jsx`、`src/App.test.jsx`、`src/lib/inventory.test.js`：取消删除不写入、历史删除确认 / id + user + archived status 约束、0-row 失败、Product / Storage 不删除，以及 consume / mark-consumed 0-row 防误报。
- `npm test`：23 个测试文件 / 201 个测试通过；`npm run build` 成功；`git diff --check` 通过。上述测试均使用本地 fixtures / source guards，不访问真实 Supabase 或生产数据。

### v0.3.1 iPhone PWA / Production 人工验收（已完成，1–9 全部通过）

人工 PASS：

- 左侧 drawer 可打开、关闭；“库存 / 已归档”切换和 selected state 正常。
- 底部导航仍严格为 `库存 | + | 我的`，没有新增 Archive Tab。
- Archive 历史批次可读取并在刷新 / 重开后保持；商品名 / 品牌搜索、分类筛选和历史展示语义正常，未出现 active 临期筛选。
- consumed detail 只读，没有商品编辑、图片编辑、新增库存或消耗库存等 active 写操作。
- 实际删除一个 consumed batch 后，该历史 batch 消失；同一 Product 仍存在的 active 库存、Product、图片和其他批次保持正常。
- active 库存页、既有导航、搜索 / 分类 / 临期筛选未发现回归。
- active batch `quantity=0` 后仍留在当前库存。
- 显式“标记为已消耗”后从 active 消失并进入 Archive。

本次不要求创建第二账号；cross-account smoke 继续 deferred。未执行 Supabase SQL、Auth、RLS、Storage 或 production data 操作。

## Project State Push Gate 自动化测试

运行 gate 集成测试：

```bash
npm test -- tests/project-state-push-gate.test.js
```

该测试使用临时 Git repository、bare remote、临时 Git identity 与临时
`GIT_CONFIG_GLOBAL`（并设置 `GIT_CONFIG_NOSYSTEM=1`），只使用本地文件路径，不访问
网络。覆盖 branch 的 `updated` / `verified-current` 分类、首次 push、force push、
branch / tag 删除、lightweight / annotated / non-commit tag、多 ref、tip 冲突、
remote OID 缺失、真实 bare remote 的 pre-push 接线、安装脚本首次安装/幂等/冲突拒绝，
以及含空格或非 ASCII 路径。

Gate 语法检查：

```bash
sh -n .githooks/pre-push
sh -n scripts/check-project-state-push.sh
sh -n scripts/install-git-hooks.sh
```

Gate 只检查最终 commit 的合法 trailer 是否与 branch 的 PROJECT_STATE tree diff 一致；
tag 只验证其 commit 的 trailer。`git push --no-verify` 能绕过本地 hook；gate 不验证
PROJECT_STATE 内容真实性，也不会自动 commit 或 push。

## v0.2.12-D 商品容量 / 规格自动化覆盖

- `src/lib/productSize.test.js`：数值 trim/转换、单位保存、空容量、单位差异与组合展示，以及默认 `g` 下的空值归一化。
- `src/lib/productEdit.test.js`：结构化规格与空值转两个 `null`、默认 `g`、单位修改保存，并保持商品名必填。
- `src/App.test.jsx`：无 barcode 商品复用查询同时匹配容量数值和单位。
- `src/lib/productLookup.test.js`：本地 product 与 Open Food Facts / Go-UPC 明确返回的容量会进入统一结构化商品结果。
- `src/components/AddBatchForm.test.jsx`、`BatchCard.test.jsx`、`BatchDetail.test.jsx` 与 `AddInventoryForm.test.jsx`：新增和编辑字段、移动端两列分组、数值与单位的单行组合布局，以及首页、详情、新增库存摘要的有/无规格展示。

## v0.2.12-C 自动化覆盖

- `src/components/BatchDetail.test.jsx`：删除入口只在 `inventory-operation`，不出现在默认详情查看模式。
- `src/components/InventoryOperationPanel.test.jsx`：删除必须进入独立确认状态，确认回调仅接收当前 batch id，取消路径保留为无写入状态。
- `src/lib/inventory.test.js`：取消操作返回空 payload；删除确认只产生当前 batch id。
- `src/App.test.jsx`：删除仅针对 `inventory_batches`，按 batch id 和当前 user id 限定，使用返回行识别 0 行删除，并在成功后清除选择、返回列表。
- Production smoke 已确认：删除当前历史 batch 后 Product、用户图片、Storage 对象和其他 batch 均保留；cross-account 不能删除该 batch 的场景继续 deferred，不作为 blocker。

## v0.2.12-B2 自动化覆盖

- `src/components/BatchDetail.test.jsx`：inventory-operation 展示当前数量、当前批次保质期、新增/消耗入口，以及数量为 0 时的显式 consumed 入口。
- `src/components/AddInventoryForm.test.jsx`：当前商品只读带入，表单只提供数量与保质期，不重复显示扫码或商品字段。
- `src/lib/inventory.test.js`：同商品同日期合并、不同日期创建新 batch、消耗默认 1、不能超过当前库存、数量归零不附带 status、取消不产生写入 payload、显式 consumed 只允许 quantity=0。

## v0.2.11 商品图片验收

- 自动化覆盖图片显示优先级、类型/10 MB 原文件限制、路径隔离、数据库更新失败删除新对象、替换旧图清理和删除用户图后的 API 回退。
- 远程 Storage migration 已执行；本次 Production Manual Validation 记录如下：
  - PASS：iPhone PWA 拍照上传。
  - PASS：iPhone PWA 从相册选择上传。
  - PASS：iPhone PWA 商品图片替换。
  - PASS：iPhone PWA 删除用户图片及 fallback。
  - PASS：删除 `user_image_url` 后，有外部图片时回退到 `image_url`；无外部图片时回到无图占位。
  - PASS：刷新 / 重开后图片状态保持正确。

### Production Manual Validation Status

已完成（PASS）：

- iPhone PWA 拍照上传。
- iPhone PWA 从相册选择上传。
- iPhone PWA 商品图片替换。
- iPhone PWA 删除用户图片、回退外部图片或无图占位，以及刷新 / 重开状态保持。

Deferred / not manually covered（不作为 blocker）：

- 双账号图片隔离 smoke：本次未执行；不额外创建测试账号。现有 owner-only / RLS 模型未发生变化。
- Android 图片流程：本次未执行；当前不是主要产品目标。

运行命令：

```bash
npm test
```

2026-06-23 v0.2 结果：

- 3 个测试文件通过。
- 32 个测试通过。
- 覆盖 `calculateExpiryDate`、`getExpiryStatus`、`decrementQuantity` 和
  `normalizeQuantity`。
- 覆盖 24 个月到期日计算、月末、闰日、跨年、状态边界和库存不小于 0。
- 覆盖连续输入 `20260630`、自动格式化、粘贴 ISO 日期、不完整日期和无效日期。
- 使用 mock fetch 覆盖 Open Food Facts universal 查询成功、Open Pet Food
  Facts fallback、两个 endpoint 均未找到、网络错误、HTTP 错误和 JSON 解析
  错误。
- 覆盖 universal HTTP 500 或 JSON 解析失败后仍能从宠物食品库查到商品。
- 覆盖混合 HTTP error + not found 时优先返回 `not_found`。
- 覆盖三个 endpoint 全部 HTTP 500、全部网络失败和全部解析失败。
- 覆盖商品名缺失时返回 `partial_found`，并保留 barcode、品牌、图片、分类
  和来源。
- 覆盖手动输入 barcode 规范化后进入与扫码相同的查询函数。
- 覆盖本地 product 命中时直接返回且不调用外部查询。
- 覆盖本地无匹配 product 时才调用外部查询。
- 覆盖本地 partial product 仍直接复用、不调用外部查询。
- 覆盖 Go-UPC Edge Function 命中时直接返回 `go_upc` 商品信息且不继续请求
  开放商品库。
- 覆盖 Go-UPC 未命中、服务配置错误或 Edge Function 不可达时继续走 Open
  Food Facts / Open Pet Food Facts fallback。
- 覆盖 Go-UPC `partial_found` 时继续寻找完整开放商品库结果，找不到完整结果
  时保留 Go-UPC partial 信息。

生产构建验证：

```bash
npm run build
```

结果：Vite 生产构建成功。

## v0.2.9 Keepalive 自动化与生产验收

自动化覆盖：

- 无 Authorization 和错误 credential 返回 401，且不调用 Supabase。
- 正确 credential 且 3 次 RPC 全部成功时返回 200，并确认实际调用 3 次。
- 第 1、2、3 次分别失败时均立即返回非 2xx。
- Supabase 请求抛出异常时返回 502。
- 响应和日志不包含 credential、anon key 或 Supabase URL。
- endpoint 只调用 `keepalive_ping()`，不进入商品、库存或条码业务逻辑。

Production 验收结果：passed。

- Supabase migration 已部署，函数只返回固定 boolean。
- Vercel Cron 已注册，Path 为 `/api/supabase-keepalive`，Schedule 为
  `17 4 * * *`；Hobby 按 UTC 04:00-04:59 窗口执行一次理解，不声称精确
  04:17 触发。
- `CRON_SECRET` 已配置在 Vercel Production 服务端环境变量中，未记录实际值。
- 浏览器直接访问 endpoint 返回 `{"ok":false}`，Vercel Logs 对应 Chrome 请求为
  401，属于正常保护行为。
- Supabase API Logs 确认首次自动保活产生连续 3 条相邻
  `POST /rest/v1/rpc/keepalive_ping`，status 均为 200。
- RPC 不读取或修改 `products`、`inventory_batches`、Auth 或其他业务数据，不使用
  service role key。
- Production App smoke 已确认页面正常打开、session / 邮箱登录正常、库存正常读取。

## v0.2.10 Email OTP 自动化与验收

本地自动化覆盖：OTP 发送保留 `shouldCreateUser: true` 且不传递
`emailRedirectTo`、8 位验证码格式校验、`verifyOtp({ email, token, type: 'email' })`
参数和 session 返回、SDK returned/rejected error 的通用提示、两阶段 UI、发送冷却不
阻止验证码提交，以及既有 session / logout / user switching / inventory loading 行为。

本地真实验收：passed。

- 在 `http://127.0.0.1:5177/` 完成 OTP 发送、8 位验证码验证、session 恢复、退出
  清理和同邮箱库存恢复。

Production Web 验收：passed。

- 已部署 OTP UI，邮件发送和验证码登录正常。

iPhone 主屏幕 standalone Web App 验收：passed。

- 已完成“输入邮箱 → 收验证码 → 输入 OTP → 登录”的闭环；确认不再依赖 Magic Link
  跳转 Safari。
- iPhone Safari 未单独测试；不阻塞本版本，因为 standalone Web App 是本次修复的核心
  场景。

## v0.2.7 Auth 自动化测试

覆盖范围：

- Source guard：生产 `src/App.jsx` 不包含 `signInAnonymously()`，并注册 /
  清理 Supabase auth listener。
- Component render test：无 session 登录面板显示邮箱 Magic Link UI，不提供
  “以访客身份继续”。
- anonymous session 基于 Supabase user/session 匿名属性识别，而不是只靠是否有
  email 猜测。
- 永久邮箱账号显示脱敏邮箱状态。
- Magic Link 使用输入邮箱、`window.location.origin` 对应 origin，并设置
  `shouldCreateUser: true`。
- Magic Link 成功、失败和发送中按钮 disabled 状态。
- Fake timer test：Magic Link cooldown 从 60 秒开始，1 秒后显示 59 秒，结束后
  回到 0，并清理 interval；失败发送不进入 cooldown。
- 退出登录调用 Supabase `signOut()`，失败时显示通用错误。
- Mocked Auth state-machine test：`getSession()` 和 listener 返回同一 user ID
  时只触发一次库存加载；同一 user 的 token refresh 只更新 session，不重复加载。
- Mocked Auth state-machine test：`null -> user A`、`user A -> null`、
  `user A -> user B`、anonymous A -> email B 都按 user ID 变化触发账号状态清理。
- Mocked stale-request test：A 的库存请求 pending、切换到 B、B 先返回、A 后返回时，
  A 的结果和错误都不会覆盖 B 的当前状态。

当前测试仍使用 mock Supabase，不发真实 Magic Link，不访问真实网络，不执行真实 SQL。

## v0.2.7 Magic Link 本地 smoke

已完成并通过：

1. 使用无 session 浏览器访问 `http://127.0.0.1:5177`，确认显示邮箱登录界面。
2. 输入真实邮箱并发送 Magic Link，确认按钮进入发送中并启动 60 秒 cooldown。
3. 确认成功提示不会透露邮箱是否已注册。
4. 点击邮件中的 Magic Link 后回到发起登录的本地 origin。
5. 确认 session 恢复，刷新后仍保持邮箱账号登录。
6. 点击退出登录后库存立即不可见，并回到邮箱登录界面。
7. 再次使用同一邮箱登录，确认仍是同一永久账号。
8. 无痕窗口或另一浏览器使用同一邮箱登录，确认可访问同一账号数据。
9. 已有 anonymous session 访问时，确认仍能看到其自己的库存，并显示访客风险提示。

Supabase 默认邮件服务可能因短时间发送频率限制出现临时发送失败。遇到该情况时，
等待限额恢复后只重新发送一次，并使用最新邮件链接登录；这不会影响已存在的
数据库数据。

## v0.2.7 数据迁移验收

已完成并通过：

- 旧用户迁移前为 8 个 `products`、12 个 `inventory_batches`。
- 旧用户迁移前为 9 个 active batches、3 个 consumed batches。
- 旧用户迁移前 active 总数量为 27。
- 新永久账号迁移前 `products` 和 `inventory_batches` 均为 0。
- 迁移后旧 user ID 在业务表中为 0。
- 迁移后新永久账号仍为 8 / 12 / 9 / 3 / 27。
- 所有 batch 的 `product_id` 仍引用有效 product。
- product 和 batch owner mismatch 为 0。
- 新永久账号可访问全部迁移数据。
- 其他 anonymous user 仍无法读取正式账号数据。
- 备份和精确 ID 回滚材料已确认可用，且未进入 Git。

页面登录后恢复 9 个 active 批次是正确行为；数据库总计仍为 12 个批次，其中
active 9、consumed 3。

## v0.2.7 最终人工 / Supabase 验收矩阵

结果：passed。

- 首次 Magic Link 登录成功。
- 刷新后 session 保持。
- 跨浏览器使用同一邮箱登录后确认为同一账号。
- 退出后页面缓存立即清空。
- 同邮箱重新登录后库存恢复。
- 登录后首页恢复 9 个 active 批次。
- 数据库总计 12 个 batches，其中 active 9、consumed 3。
- 数据库总计 8 个 products。
- active quantity 为 27。
- anonymous session 无法读取已迁移库存。
- 清理前完成 anonymous users 与业务数据只读检查。
- 三个无业务数据 anonymous users 已删除。
- 删除后 Auth 和业务数据最终只读验收通过。
- invalid product refs = 0。
- owner mismatches = 0。

## v0.2.7 验证结果汇总

- 自动测试：12 files / 105 tests passed。
- Production build：passed。
- `git diff --check`：passed。
- 真实人工 / Supabase smoke：passed。

## v0.2.8 生产部署与手机 smoke

结果：passed。

- Vercel Production URL `https://food-expiry-manager-two.vercel.app/` 可正常打开。
- 无 session 时显示邮箱登录 UI，不自动创建 anonymous user。
- 电脑端 Magic Link 登录成功。
- 手机端 Magic Link 登录成功。
- 刷新和重新打开后 session 保持。
- 退出后库存立即清空。
- 手机 HTTPS 环境下摄像头可以启动。
- 手机扫描此前未录入的真实猫罐头条码后，生产远程查询成功并自动填写商品信息。
- 第三方数据此次没有返回图片，但不阻塞部署。
- 新增真实商品数据刷新后仍然存在。
- 页面无明显报错。

## v0.2.8 测试库存清理验收

已完成：

- 原迁移过来的测试库存已由用户在 Supabase 中主动清空。
- 清空只删除永久邮箱账号名下的 `products` 和 `inventory_batches`。
- 永久邮箱 Auth 用户保留。
- 清理后只读验收：`products = 0`、`inventory_batches = 0`。
- 随后开始录入真实库存。
- 桌面迁移前 JSON 备份继续保留在仓库外。

## Supabase Resume Smoke

Supabase Free 项目从 Paused 恢复到 Active 后，先做这组最小真实 smoke。
测试完成后清理测试数据。

1. App 可以启动，页面无白屏。
2. 原 anonymous session 能否继续访问。
3. 原有商品可读取。
4. 原有库存批次可读取。
5. 新增测试商品或测试批次成功。
6. 编辑商品信息成功。
7. 修改库存数量成功。
8. “消耗 1”成功。
9. 编辑到期日期成功。
10. 分类筛选成功。
11. 搜索成功。
12. 同商品多批次仍互不影响。
13. Edge Function 条码查询成功，或明确记录外部查询不可用。
14. 另一浏览器 / 新匿名用户看不到原用户数据。

## Full Regression

- 单次 Supabase Resume 后通常先执行恢复 smoke。
- 只有代码、schema、RLS、Edge Function 或部署配置发生变化时，才需要完整
  自动化 regression。
- docs-only 更新通常只需要 `git diff --check` 和范围 / 敏感信息检查，不需要重新
  运行完整业务测试。

## 手机端仍待验证

- 暂无 v0.2.8 阻塞项。
- 未来如新增 PWA、通知、导出、图片上传或其他手机能力，需要单独补充验收清单。

## v0.2.1 Go-UPC 手动验收清单

1. 确认线上或本地 Supabase Edge Function 已设置服务端 secret
   `GO_UPC_API_KEY`，且未创建 `VITE_GO_UPC_API_KEY`。
2. 使用已保存过的 barcode 查询，确认直接命中本地 `products`，不调用 Edge
   Function，不消耗 Go-UPC 免费额度。
3. 使用 Go-UPC 能命中的真实猫罐头 barcode 查询，确认预填商品名、品牌、图片
   和分类，来源保存为 `go_upc`。
4. 使用 Go-UPC 未命中的 barcode 查询，确认继续进入 Open Food Facts /
   Open Pet Food Facts fallback。
5. 暂时移除或不设置 `GO_UPC_API_KEY` 后查询，确认页面不崩溃、不暴露 secret
   细节，并仍允许手动添加。
6. 模拟 Go-UPC 429 或 5xx，确认提示服务暂时不可用或由后续 fallback 接管，
   手动填写路径仍可用。
7. 对同一 barcode 连续保存两个不同到期日批次，确认首页显示两个独立
   `inventory_batches`，数量不合并。
8. 刷新页面后再次输入同 barcode，确认优先命中本地 `products`。

## v0.2 已完成的真实验收

- 第一次输入外部 API 查不到的 barcode，手动补商品名后成功保存。
- 第二次输入同 barcode 时优先命中 Supabase 本地 `products` 并预填商品信息。
- 同 barcode 连续保存两个不同到期日批次，首页显示为两个独立批次，不合并数量。
- 刷新页面后两个批次仍然存在。
- 真实猫罐头 barcode 验证了开放商品库存在覆盖不足；该问题不阻塞本地复用闭环，
  后续由 v0.2.1 国内条码 API 增强处理。

## v0.1 手动验收清单

### 测试样例 1：根据生产日期计算到期日

- 添加商品：猫罐头 A
- 添加库存批次：数量 12，生产日期 `2026-06-01`，保质期 24 个月
- 预期：系统自动计算到期日为 `2028-06-01`
- 自动化覆盖：已覆盖纯函数计算

### 测试样例 2：同款商品的不同批次不合并

- 添加商品：猫罐头 A
- 再添加另一个库存批次：数量 6，保质期至 `2026-12-01`
- 预期：同款商品下出现两个不同库存批次，不合并为 18 罐
- 自动化覆盖：批次独立性由数据库模型和前端写入路径保证，仍需手动验收

### 测试样例 3：快捷减少 1

- 对其中一个库存批次点击“减少 1”
- 预期：该批次数量减少 1，另一个批次数量不变
- 自动化覆盖：已覆盖扣减纯函数；数据库批次隔离仍需手动验收

### 测试样例 4：手动修改数量

- 手动修改某个库存批次数量
- 预期：保存后该批次数量正确更新
- 自动化覆盖：已覆盖数量校验；持久化仍需手动验收

### 测试样例 5：数量归零并标记已消耗

- 将某个库存批次数量减少到 0
- 预期：可以标记为已消耗，首页默认不再展示为 active 库存
- 自动化覆盖：仍需真实 Supabase 手动验收

### 测试样例 6：已过期状态

- 添加一个已经过期的库存批次
- 预期：首页显示“已过期”
- 自动化覆盖：已覆盖状态纯函数

### 测试样例 7：7 天内到期状态

- 添加一个在当前日期之后 7 天内到期的库存批次
- 预期：首页显示“7 天内到期”
- 自动化覆盖：已覆盖状态纯函数及 7 天边界

## 后续建议补充的边界测试

- 在生产日期和“保质期至”字段连续输入 `20260630`，确认无需移动光标。
- 确认输入完成后显示 `2026-06-30`。
- 输入 `20260230`，确认无法保存并显示有效日期提示。
- 恰好今天到期。
- 恰好 7 天后和 30 天后到期。
- 生产日期为月末，保质期单位为月。
- 闰年 `2 月 29 日` 加一年。
- 数量为 1 时减少 1，确认不会产生负数。
- 已消耗批次仍可在历史记录中查询。

## v0.2 手动验收清单

1. 点击“扫码添加”，允许摄像头权限，确认出现预览和扫码状态。
2. 扫到条形码后确认摄像头立即停止，并开始查询商品信息。
3. 取消扫码，确认摄像头指示灯关闭。
4. 拒绝摄像头权限，确认出现友好提示且仍可手动输入条形码。
5. 手动输入有效 barcode，确认可查询并预填名称、品牌、图片和分类。
6. 第一次手动补全并保存商品后，再次输入相同 barcode，确认直接显示本地商品
   信息；可断网复测以确认没有依赖外部 API。
7. 查询到缺少商品名的记录，确认显示 partial 提示，其他字段保留，补名称后
   可以保存。
8. 输入查不到的 barcode，确认提示“未找到商品信息，请手动填写”且能继续保存。
9. 模拟首个 endpoint HTTP 或解析异常、后续 endpoint 查到商品，确认仍显示
   查询成功。
10. 模拟离线查询，确认网络错误不阻塞手动添加。
11. 模拟所有 endpoint 均 HTTP 或返回解析异常，确认提示服务暂时不可用且仍
    可手动添加。
12. 补充数量和保质期后保存，确认首页出现新的批次。
13. 对同一 barcode 连续添加两次，确认首页出现两个独立批次而不是合并数量。
14. 刷新页面，确认两个批次仍然存在。
