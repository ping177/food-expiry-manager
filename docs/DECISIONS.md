# 决策记录

用于记录影响产品范围、数据模型或技术架构的重要决策。

## D-001：优先开发 Web App / PWA

- 状态：已决定
- 日期：2026-06-23
- 决策：先做移动端优先的 Web App，并逐步支持 PWA，不直接开发原生 iOS / Android App。
- 原因：优先建立可用闭环，降低早期开发和维护成本。

## D-002：商品与库存批次分开建模

- 状态：已决定
- 日期：2026-06-23
- 决策：商品信息存储在 `products`，实际持有的每一批库存存储在 `inventory_batches`。
- 原因：同款商品可能拥有不同数量、生产日期和到期日。

## D-003：同款商品的不同批次不得合并

- 状态：已决定
- 日期：2026-06-23
- 决策：同款商品的不同批次必须分别管理，不能只累加为一个总库存数字。
- 原因：合并后会丢失批次级到期信息，无法正确提醒和扣减。

## D-004：首页与临期判断以库存批次为单位

- 状态：已决定
- 日期：2026-06-23
- 决策：首页排序、过期判断和状态标签基于 `inventory_batches.expiry_date`，而不是仅基于 `products`。

## D-005：v0.1 聚焦手动闭环

- 状态：已决定
- 日期：2026-06-23
- 决策：v0.1 实现手动添加商品、手动添加批次、保质期计算、到期状态展示和库存数量更新。

## D-006：v0.2 尽快加入扫码

- 状态：已决定
- 日期：2026-06-23
- 决策：v0.2 开始摄像头扫码、手动条形码录入和开放商品数据库查询。扫码不是长期 backlog。

## D-007：所有录入方式最终生成 expiry_date

- 状态：已决定
- 日期：2026-06-23
- 决策：无论用户输入“生产日期 + 保质期时长”还是直接输入“保质期至”，保存后的批次都必须具有 `expiry_date`。
- 原因：统一首页排序、状态计算和后续提醒逻辑。

## D-008：库存数量更新属于 MVP

- 状态：已决定
- 日期：2026-06-23
- 决策：快捷减少 1、手动修改数量和归零后的已消耗状态属于 v0.1 必需功能，不作为后续优化。

## D-009：v0.1 使用 Supabase Anonymous Sign-in

- 状态：已决定
- 日期：2026-06-23
- 决策：首次打开且没有 session 时自动匿名登录，不展示强制登录页。
- 原因：保持打开即用，同时通过 `auth.uid()`、`user_id` 和 RLS 保证数据隔离。
- 限制：清除浏览器数据、退出或更换设备后，用户可能无法恢复原匿名账号。
- 后续：设计绑定邮箱/升级账号入口，用于恢复、备份和跨设备同步。

## D-010：按商品名和品牌复用 products

- 状态：已决定
- 日期：2026-06-23
- 决策：v0.1 在同一用户下，按去除首尾空格后的完全相同商品名和品牌复用
  `products`。
- 原因：减少重复商品主数据，同时保持实现简单、行为可预测。
- 约束：每次添加库存必须新建 `inventory_batches`，绝不合并批次数量。
- 后续：v0.2 引入条形码后，优先使用条形码识别和复用商品。

## D-011：零库存批次等待用户确认 consumed

- 状态：已决定
- 日期：2026-06-23
- 决策：数量降到 0 后批次暂时保持 `active` 并继续显示，直到用户点击
  “标记为已消耗”。
- 原因：确保用户能够看到并确认状态变化，避免数量归零后入口立即消失。
- 结果：`consumed` 批次不在首页默认查询中，但不会被物理删除。

## D-012：v0.2 使用 ZXing 扫码并保留手动降级路径

- 状态：已决定
- 日期：2026-06-23
- 决策：使用 `@zxing/browser` 访问摄像头和识别条形码，不只依赖浏览器
  原生 `BarcodeDetector`。
- 约束：扫码成功、取消扫码和组件卸载时都停止摄像头；权限拒绝、无摄像头
  或扫码失败时，手动输入条形码和完全手动添加仍然可用。

## D-013：开放商品数据库只用于商品信息预填

- 状态：已决定
- 日期：2026-06-23
- 决策：优先使用带 `product_type=all` 的 Open Food Facts universal lookup
  预填条形码、名称、品牌、图片和分类；随后按需尝试 Open Pet Food Facts 和
  普通 Open Food Facts endpoint。任一前置 endpoint 未找到、HTTP 异常、解析
  异常或只返回不完整商品时，都不会阻止后续查询。
- 约束：不从商品数据库推断保质期；未找到、网络错误或字段缺失不能阻塞
  用户添加库存。
- 错误语义：正常未找到、网络异常、HTTP 异常和响应解析异常必须分别处理，
  不得把 `not_found` 误报为网络问题。
- 结果语义：区分 `found`、`partial_found`、`not_found`、
  `network_error`、`http_error` 和 `parse_error`。`partial_found` 表示商品
  记录存在但缺少名称，已知字段继续预填，名称由用户补充。
- 汇总优先级：完整商品优先于 partial 商品；partial 商品优先于错误；只要有
  endpoint 明确返回未找到且没有商品结果，最终优先返回 `not_found`。
- 批次原则：同一 barcode 可以复用 `products`，但每次保存必须新建独立
  `inventory_batches` 记录。

## D-014：条形码商品查询优先使用用户本地 products

- 状态：已决定
- 日期：2026-06-23
- 决策：扫码或手动输入 barcode 后，先按当前 `user_id` 和 barcode 查询
  Supabase `products`。本地命中时直接复用名称、品牌、图片、分类和来源，
  不请求外部 API。
- fallback：只有本地明确没有匹配 barcode 时，才执行开放商品数据库查询。
  本地查询本身失败时应提示重试，不得当作未命中并静默访问外部服务。
- 持久化：首次外部查询或手动补全的商品资料保存到 `products`，供后续扫码
  直接复用。
- 批次约束：复用 product 不代表合并库存；每次添加仍必须创建新的
  `inventory_batches`。

## D-015：国内条码 API 与图片上传不纳入 v0.2

- 状态：已决定
- 日期：2026-06-23
- 决策：v0.2 以扫码、本地商品复用和开放商品库查询作为技术底座。真实猫罐头
  覆盖率不足的问题在 v0.2.1 评估商品条码 API，不继续扩大当前版本。
- 密钥约束：国内商业 API 的 key 不得进入 Vite 前端，应由 Supabase Edge
  Function 代理。
- 评估方式：接入前先用 5–10 个真实猫罐头 barcode 比较候选 API 覆盖率。
- 图片范围：v0.2 只保留可选图片链接和已有图片预览，不实现上传或拍照。
  Supabase Storage、压缩、上传权限和 Storage RLS 留待后续版本统一设计。

## D-016：商品条码 API 接入前先评估，并通过 Edge Function 代理

- 状态：已决定
- 日期：2026-06-23
- 决策：v0.2.1 不直接选择或接入供应商。先用 5–10 个用户真实持有的猫罐头
  barcode 比较候选 API 的命中率、字段完整度、图片稳定性、价格和接口限制。
- 安全：第三方 API key 只能保存在服务端，不得写入前端源码，不得使用
  `VITE_` 前缀暴露给浏览器。正式接入时由 Supabase Edge Function
  `lookup-barcode-product` 代理调用。
- 查询顺序：本地 `products` → Go-UPC → Barcode Lookup → EAN-Search /
  EAN-Suche → Open Food Facts universal → Open Pet Food Facts → 普通
  Open Food Facts → 手动填写。
- 适配边界：Edge Function 将供应商响应转换为现有统一商品查询格式与
  `found`、`partial_found`、`not_found`、`network_error`、`http_error`、
  `parse_error` 状态。
- 非目标：不以电商爬虫作为第一方案，不在本阶段实现图片上传、拍照或 AI
  图片识别。

## D-017：v0.2.1 优先评估全球 / 欧洲 EAN 条码服务

- 状态：已决定
- 日期：2026-06-24
- 决策：v0.2.1 的选型重点从“国内商品条码 API”调整为“全球 / 欧洲 EAN
  商品条码 API”，优先覆盖德国 / 欧洲进口猫罐头。
- 原因：用户短期主要管理德国 / 欧洲进口猫罐头，条形码多为 `4` 开头。探数
  API 对 3 个真实猫罐头样本 0/3 命中；Go-UPC、Barcode Lookup 和
  EAN-Search / EAN-Suche 对 7 个当前样本明显更有效。
- 当前优先级：Go-UPC 第一候选，Barcode Lookup 第二 fallback，EAN-Search /
  EAN-Suche 第三 fallback，Open Food Facts / Open Pet Food Facts 保留免费
  兜底，国内商品条码 API 暂不优先。
- 最小可用版本：建议先只接 Go-UPC，降低复杂度；Barcode Lookup 和
  EAN-Search / EAN-Suche 后续再作为 fallback 增强。
- 状态语义：未来可区分 `exact_found`、`partial_found`、`suggested_match`
  和 `not_found`。`suggested_match` 只表示相近 pack 或同品牌疑似商品，必须
  经用户确认后才能保存为当前 barcode 的 `product`。

## D-018：v0.2.1 最小接入 Go-UPC Edge Function

- 状态：已决定
- 日期：2026-06-25
- 决策：v0.2.1 最小可用版本只接入 Go-UPC，由 Supabase Edge Function
  `lookup-barcode-product` 代理调用。前端仍先查询当前用户本地 `products`；
  本地未命中后进入统一外部查询链路：Go-UPC → Open Food Facts universal →
  Open Pet Food Facts → 普通 Open Food Facts。
- 职责边界：`App.jsx` 负责本地 `products` 查询、商品和库存批次保存；外部
  fallback 编排集中在 `src/lib/productLookup.js`。
- 安全：Go-UPC API key 只读取服务端 secret `GO_UPC_API_KEY`，不得写入前端
  代码、文档示例值或 `VITE_` 环境变量。Edge Function 保持 Supabase 默认 JWT
  校验，不作为公开无鉴权 API 代理。
- 错误语义：Edge Function 对前端继续返回 `found`、`partial_found`、
  `not_found`、`network_error`、`http_error`、`parse_error`。内部日志可区分
  secret 缺失、401、429 和供应商 5xx，但不得记录 key 或 Authorization header。
- 非目标：本轮不接 Barcode Lookup、不接 EAN-Search、不实现 `suggested_match`，
  不修改数据库 schema。

## D-019：第三方分类只作参考，商品主数据需要可编辑

- 状态：候选决策
- 日期：2026-06-26
- 背景：Go-UPC 线上验收中，barcode `4255634604636` 能正确预填商品名、品牌
  和图片，但返回的 category 被保存为 `Snack Foods`，对宠物食品场景不准确。
  同时，商品一旦保存后当前无法编辑，后续本地 barcode 复用会持续展示第一次
  保存的信息。
- 候选决策：v0.2.2 设计“商品信息编辑与分类校正”。第三方 API 返回的 category
  只能作为参考，不应把泛化或低置信度分类自动保存为用户本地分类；商品主数据
  应允许用户编辑商品名、品牌、分类和图片链接。
- 影响范围：编辑 `products` 后，所有引用同一 product / 同 barcode 的库存批次
  展示同步更新；但不得合并、删除或重写既有 `inventory_batches`。
- 约束：继续保持 `products` 与 `inventory_batches` 分离；分类校正不改变批次
  独立保存原则。
