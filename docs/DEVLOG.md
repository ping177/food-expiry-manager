# 开发日志

记录已完成的项目工作，按日期倒序维护。

## 2026-06-23

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
- 真实猫罐头测试表明 Open Food Facts / Open Pet Food Facts 覆盖率不足，国内
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
