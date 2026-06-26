# 开发日志

记录已完成的项目工作，按日期倒序维护。

## 2026-06-26

### P1 文档引用关系整理

- 明确 README 只作为项目入口，不复制专项评估正文。
- 明确 `docs/ROADMAP.md` 维护长期版本路线，`docs/BACKLOG.md` 维护近期执行优先级。
- 保留 `docs/BARCODE_API_EVALUATION.md` 和 `docs/DATA_MODEL.md` 作为专项文档。
- 收紧 `docs/PROJECT_STATE.md` 为 project-command-center 使用的人工状态摘要，不维护
  Git branch、latest commit 或 working tree 快照字段。

### v0.2.1 Go-UPC 线上验收与 v0.2.2 候选记录

- Go-UPC 线上 Edge Function 手动验收通过。
- 真实测试 barcode `4255634604636` 成功预填商品名、品牌和图片。
- 保存后第二次输入同 barcode 成功命中本地 `products` 并复用商品信息。
- 同 barcode 不同到期日成功创建独立 `inventory_batches`，未合并批次。
- 验收发现 Go-UPC 返回的 category 被自动保存为 `Snack Foods`，对宠物食品不
  准确；已记录为 v0.2.2 分类校正候选：第三方 API category 只作为参考，泛化
  分类不应直接自动保存，或需要用户确认。
- 验收发现保存后当前无法编辑 product 信息；已记录为 v0.2.2 商品信息编辑候选：
  允许编辑商品名、品牌、分类和图片链接，修改 `products` 后影响所有同 barcode
  的库存批次展示。
- 本次只更新文档，不修改代码逻辑，不 commit / push。

## 2026-06-25

### v0.2.1 Go-UPC Edge Function 接入

- 新增 Supabase Edge Function `lookup-barcode-product`，从服务端 secret
  `GO_UPC_API_KEY` 读取 Go-UPC API key，并使用 `Authorization: Bearer`
  请求 Go-UPC。
- Edge Function 对前端保持 `found`、`partial_found`、`not_found`、
  `network_error`、`http_error`、`parse_error` 兼容状态。
- Edge Function 内部日志区分 secret 缺失、401、429 和供应商 5xx，但不记录
  API key、Authorization header 或供应商鉴权信息。
- 前端保持本地 `products` 优先；本地未命中后进入统一外部查询编排：
  Go-UPC Edge Function → Open Food Facts universal → Open Pet Food Facts →
  普通 Open Food Facts。
- `App.jsx` 只负责本地商品查询和保存链路；外部 fallback 编排集中在
  `src/lib/productLookup.js`。
- 保存逻辑保持不变：带 barcode 保存时写入或复用 `products`，每次保存仍创建
  独立 `inventory_batches`。
- 本轮未修改 `supabase/schema.sql`，未新增前端 `VITE_GO_UPC_API_KEY`，未接
  Barcode Lookup / EAN-Search，未实现 `suggested_match`。
- `npm test`：3 个测试文件、37 个测试全部通过。
- `npm run build`：生产构建成功。
- `git diff --check`：通过。

## 2026-06-24

### v0.2.1 API 覆盖率评估方向修正

- 根据用户新增的 7 个德国 / 欧洲进口猫罐头样本，将 v0.2.1 方向从“国内商品
  条码 API 增强”调整为“商品条码 API 增强：优先覆盖德国进口猫罐头”。
- 记录探数 API 对此前 3 个猫罐头样本 0/3 命中，暂不作为优先接入供应商。
- 记录 Go-UPC 当前精确命中 5/7、准确图片 5/7，是 v0.2.1 第一候选。
- 记录 Barcode Lookup 当前精确命中 4/7、有图片 4/7、准确图片 3/7，适合作为
  第二 fallback。
- 记录 EAN-Search / EAN-Suche 当前精确命中 3/7，图片覆盖 0/7，更适合作为
  `suggested_match` / 名称品牌兜底。
- 记录未来推荐查询顺序：Supabase 本地 `products` → Go-UPC → Barcode Lookup
  → EAN-Search / EAN-Suche → Open Food Facts universal → Open Pet Food Facts
  → 普通 Open Food Facts → 手动填写。
- 记录未来状态建议：`exact_found`、`partial_found`、`suggested_match` 和
  `not_found`；其中 `suggested_match` 必须用户确认后才能保存为当前 barcode
  商品。

## 2026-06-23

### v0.2.1 商品条码 API 评估准备

- 新增 `docs/BARCODE_API_EVALUATION.md`，记录 v0.2 覆盖率问题、候选服务、
  评估维度、真实 barcode 测试模板、安全要求和未来接入架构。
- 将 v0.2.1 拆分为覆盖率评估、供应商与字段映射确定、Edge Function 代理、
  前端接入和真实 barcode 回归测试五个阶段。
- 明确当前只做评估准备，不正式接入 API、不申请或写入 API key。
- 明确商业 API key 不进入 Vite 前端，未来由 Supabase Edge Function 的服务端
  secret 管理。
- 明确 v0.2.1 不以电商爬虫为第一方案，也不包含图片上传、拍照或 AI 图片识别。

### v0.2 扫码和商品信息自动填充

- 以 `7585fb2 feat: complete v0.1 food expiry management MVP` 为开发基线。
- 新增 `@zxing/browser`，实现摄像头条形码识别。
- 扫码成功、取消和组件卸载时停止摄像头。
- 摄像头不支持、权限拒绝、无设备或被占用时显示可操作提示，并保留手动路径。
- 新增手动输入条形码，并与扫码结果共用同一查询流程。
- 新增 Open Food Facts 查询封装，统一处理 found、not_found 和 error。
- 查询成功后预填 barcode、商品名、品牌、图片 URL、分类和来源。
- 查询失败或字段缺失时允许用户继续手动填写。
- 有 barcode 时优先复用并更新同一用户的商品主数据；每次保存始终新建独立
  `inventory_batch`。
- Open Food Facts 不提供或推断保质期。
- 当前 schema 已具备 v0.2 商品字段和唯一索引，因此未新增 migration，也未改
  RLS。
- `npm test`：3 个测试文件、22 个测试全部通过。
- ZXing 仅在打开扫码界面时延迟加载，避免增加首页初始脚本体积。

### v0.2 商品查询兼容性修复

- 将商品查询改为优先请求 Open Food Facts universal endpoint，并携带
  `product_type=all`。
- universal lookup 正常未找到时，fallback 到 Open Pet Food Facts，改善宠物
  食品覆盖。
- 明确区分 `not_found`、`network_error`、`http_error` 和 `parse_error`，
  不再把 HTTP 或 JSON 解析异常统一显示为网络问题。
- 两个商品库都只用于信息预填，不推断保质期；所有失败状态仍允许手动填写。
- 商品字段缺失时返回可编辑的空字段，不让添加页面崩溃。
- 查询改为 endpoint 数组顺序尝试：Open Food Facts universal、Open Pet Food
  Facts、普通 Open Food Facts。
- 第一个 endpoint 返回未找到、HTTP 异常、解析异常或不完整商品时不会提前停止。
- 新增 `partial_found`：找到商品记录但缺少商品名时，保留 barcode、品牌、
  图片、分类和来源，允许用户补全商品名后保存。
- 最终结果按“完整商品 > partial 商品 > 明确未找到 > 服务层错误”汇总，避免
  单个 endpoint 异常被过早显示为服务不可用。
- 条形码查询新增 Supabase 本地优先策略：先按当前用户和 barcode 查询
  `products`，命中后直接预填本地资料，不请求外部 endpoint。
- 只有本地明确无匹配商品时才进入开放商品数据库查询；本地查询失败时不会误判
  为本地无商品。
- 保存时继续按 barcode 写入或复用 `products`，每次添加始终单独插入新的
  `inventory_batches`。

### v0.2 手动验收与范围收尾

- 真实 Supabase 验收确认：第一次手动补全并保存商品后，第二次输入同 barcode
  可优先命中本地 `products` 并自动预填。
- 同 barcode 保存两个不同到期日批次后，首页显示两个独立批次，数量互不合并；
  刷新后数据仍存在。
- 真实猫罐头测试表明 Open Food Facts / Open Pet Food Facts 覆盖率不足，
  商品条码 API 增强移至 v0.2.1，不继续扩大 v0.2。
- 图片 URL 字段弱化为可选图片链接，并明确通常由扫码自动填入、可以留空。
- 图片上传、拍照、Supabase Storage、图片压缩和 Storage RLS 均留待后续版本。

### 日期连续输入优化

- 将生产日期和“保质期至”从浏览器原生分段日期输入改为连续数字输入。
- 支持直接键入 `20260630`，自动格式化为 `2026-06-30`。
- 限制为 8 位日期数字，避免年份可输入过多位。
- 支持粘贴 `YYYY-MM-DD`，并严格拒绝 `20260230` 等无效日期。
- 日期规范化逻辑保持独立，后续扫码或 OCR 可复用，不影响数据库 ISO 日期格式。
- `npm test`：2 个测试文件、18 个测试全部通过。
- `npm run build`：生产构建成功。

### v0.1 最小可用闭环

- 初始化 Git 仓库，未创建 commit。
- 创建 React、Vite、Tailwind CSS 应用骨架。
- 接入 Supabase 客户端和环境变量缺失提示。
- 实现无 session 时自动 Anonymous Sign-in，不显示强制登录页。
- 新增 `supabase/schema.sql`，包含两张核心表、索引、约束、更新时间触发器和
  RLS 策略。
- 实现按商品名和品牌复用 `products`，每次库存录入始终新建
  `inventory_batches`。
- 实现两种保质期录入方式，统一保存 `expiry_date`。
- 实现 active 批次首页、到期日排序和四种到期状态。
- 实现快捷减少 1、手动修改数量和标记 consumed。
- 新增 Vitest 测试，覆盖日期、到期状态和数量逻辑。

### v0.1 验证

- `npm test`：2 个测试文件、14 个测试全部通过。
- `npm run build`：生产构建成功。
- `git diff --check`：通过。
- 尚未配置真实 Supabase 项目，数据库/RLS/匿名认证端到端验收待完成。
- 本地浏览器冒烟检查被运行环境的浏览器安全策略阻止，未绕过。

### 项目初始化

- 建立项目说明与代理开发规则。
- 建立数据模型、路线图、决策、测试和 backlog 文档。
- 明确商品与库存批次分离的核心建模原则。
- 明确 v0.1 为手动录入与库存数量更新闭环。
- 明确 v0.2 进入扫码和条形码商品信息自动填充。

### 验证

- 已检查必需文件是否创建。
- 已检查文档是否覆盖用户指定的版本范围、数据字段和手动验收样例。
- 当前尚未创建应用代码和测试框架，因此没有可运行的自动化测试。
