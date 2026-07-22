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

## D-019：第三方分类不自动保存，商品主数据需要可编辑

- 状态：已决定
- 日期：2026-06-26
- 背景：Go-UPC 线上验收中，barcode `4255634604636` 能正确预填商品名、品牌
  和图片，但返回的 category 被保存为 `Snack Foods`，对宠物食品场景不准确。
  同时，商品一旦保存后当前无法编辑，后续本地 barcode 复用会持续展示第一次
  保存的信息。
- 决策：第三方 API 返回的 category 不自动保存为 `products.category`，也不预填
  到分类选择控件；分类由用户从项目内置列表中手动选择，并允许留空。本地
  Supabase `products` 命中时继续复用用户之前手动保存的 `category`。
- 补充决策：商品主数据允许用户编辑商品名、品牌、分类和图片链接；条形码继续
  只读，不在本轮开放编辑。
- 影响范围：编辑 `products` 后，所有引用同一 product / 同 barcode 的库存批次
  展示同步更新；但不得合并、删除或重写既有 `inventory_batches`。
- 约束：继续保持 `products` 与 `inventory_batches` 分离；分类校正不改变批次
  独立保存原则，不新增分类表，不修改 Supabase schema / RLS，不修改 Go-UPC
  Edge Function。

## D-020：v0.2.5 部署 readiness 首选 Vercel

- 状态：已决定
- 日期：2026-06-28
- 决策：v0.2.5 部署 readiness 阶段推荐 Vercel 作为首选公网 HTTPS 部署平台。
  Netlify 作为备选；GitHub Pages 暂不优先。
- 原因：当前项目是标准 React + Vite 静态前端，生产构建输出 `dist` 静态资源。
  Vercel 的部署流程、默认 HTTPS、环境变量管理和 preview URL 管理更适合当前
  手机 smoke test 阶段。Netlify 也适合静态前端部署，可作为备选。GitHub Pages
  可部署静态站点，但通常需要额外处理构建流程、环境变量和子路径配置，不作为
  当前首选。
- 前端公开变量边界：`VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY` 可以配置为
  前端公开环境变量，因为浏览器需要它们连接 Supabase；数据安全依赖 Supabase
  Auth、`auth.uid()` 和 RLS。
- 服务端 secret 边界：`GO_UPC_API_KEY` 只能保留在 Supabase Edge Function
  服务端 secret 中，由 `lookup-barcode-product` 读取；禁止新增
  `VITE_GO_UPC_API_KEY`。
- 禁止暴露：不得把 Supabase service role key、数据库密码、Dashboard token、
  第三方商业 API key 或其他 private credentials 放入前端环境变量、源码、
  文档示例值或构建产物。
- 非目标：本决策不执行真实部署，不修改 Supabase schema / RLS，不修改
  Go-UPC Edge Function，不改变现有 Anonymous Sign-in 行为。

## D-021：继续使用 Supabase Free，并在 Vercel 部署后再决定是否实施轻度保活

- 状态：已决定
- 日期：2026-07-08
- 背景：Supabase 项目 `food-expiry-manager` 曾因 Free Tier inactivity 自动暂停，
  用户已于 2026-07-07 在 Supabase Dashboard 手动 Resume。
- 决策：当前继续使用 Supabase Free，不迁移 PocketBase、IndexedDB-only、自托管
  Supabase、NAS 或 VPS，也暂不升级 Pro。
- 顺序：先完成 Resume 后恢复核验、备份说明和 Vercel 部署；部署后观察真实使用
  活动，再判断是否需要轻度保活。
- 保活边界：只有在仍存在重复暂停风险且需要持续可用时，才设计每日或每 3-5 天
  一次的无副作用 Cron 健康查询。保活不能被描述为绝对保证 Supabase 永不暂停。
- 禁止方式：不使用业务写入、垃圾数据、Go-UPC 调用、匿名账号创建、放宽业务表
  RLS 或修改库存 / 条码业务逻辑作为保活方式。
- 凭据边界：如未来实施 Cron，凭据必须存放在部署平台 secrets 中，不得写入
  前端代码、Git、文档示例值或构建产物。

## D-022：v0.2.7 永久邮箱账号优先，不再创建新的 anonymous user

- 状态：已决定
- 日期：2026-07-08
- 背景：Supabase Resume 后确认旧业务数据仍存在，但当前浏览器恢复的是另一个
  anonymous user，因此 RLS 正常隔离导致页面看不到旧数据。继续默认创建
  anonymous user 会让跨浏览器、跨设备和清浏览器数据后的恢复问题继续扩大。
- 决策：应用启动时只恢复已有 Supabase session；没有 session 时显示邮箱
  Magic Link 登录界面，不再默认或显式创建新的 anonymous user。
- 已有 anonymous session：作为迁移过渡兼容读取其当前数据，页面显示“访客账号”
  状态、session 丢失风险提示和“退出访客并使用邮箱登录”操作；不实现
  anonymous-to-permanent identity linking。迁移和清理完成后，正式库存 owner
  为永久邮箱账号。
- 永久账号：使用 Supabase Email Magic Link / OTP API 发送登录链接，并允许
  首次邮箱创建账号。Magic Link redirect 使用发起登录时的
  `window.location.origin`。
- 旧数据归属：不尝试直接恢复旧 anonymous user 或手工修改 Auth identity。
  先创建新的永久邮箱账号，再用受控 SQL 事务把旧用户的 `products.user_id`
  和 `inventory_batches.user_id` 迁移到新永久账号；不重建 product 或 batch 主键，
  不修改 batch 的 `product_id`。
- 安全边界：不使用 service role key 或 Admin API 于前端；不关闭或放宽 RLS；
  不把真实 UUID、邮箱、token、dump 或一次性 SQL 提交 Git；Go-UPC secret
  边界不变。
- 操作边界：迁移前必须有本地备份；删除 anonymous user 前必须确认其业务数据为
  0；不得删除永久邮箱账号。
- 数量解释：首页只显示 active batches，consumed batches 保留在数据库中；迁移
  完整性以数据库总数和关系校验为准，不以首页可见数量判断。
- Origin 边界：`localhost` 和 `127.0.0.1` 是不同 origin，拥有独立 localStorage
  和 Supabase session；测试和 Redirect URL 配置必须明确区分。
- 非目标：本决策不执行 Vercel 部署或 Cron 配置。

## D-023：v0.2.8 只做公网部署和手机验收，保活延后决策

- 状态：已决定
- 日期：2026-07-08
- 决策：v0.2.8 只处理 Vercel 公网部署、Production Site URL / Redirect URL、
  生产 Magic Link、手机同邮箱登录、库存恢复、扫码、Go-UPC fallback 和核心库存
  smoke。
- 保活边界：Supabase Cron / 轻度保活不混入 v0.2.8。是否实施保活留到 v0.2.9，
  根据公网部署后的真实使用频率和暂停风险再决定。
- 安全边界：Vercel 前端环境变量只配置 `VITE_SUPABASE_URL` 和
  `VITE_SUPABASE_ANON_KEY`；不得配置 service role key、数据库密码、Dashboard
  token 或 Go-UPC API key 到前端。
- 后续范围：v0.3 以后仍为候选方向，具体顺序不在当前阶段锁定。

## D-024：v0.2.10 使用 Email OTP，移除 Magic Link 回跳依赖

- 状态：已决定
- 日期：2026-07-14
- 背景：iOS 主屏幕 standalone Web App 可能在点击 Magic Link 后跳转到 Safari，导致
  session 建立在不同容器中，无法回到 PWA 内的原始 session storage。
- 决策：保留 `signInWithOtp()` 作为验证码发送 API，并保持 `shouldCreateUser: true`；
  不再传递 `emailRedirectTo`。前端在同一页面收集 8 位验证码，并使用
  `verifyOtp({ email, token, type: 'email' })` 建立 session。
- 会话边界：保留既有 `getSession()`、`onAuthStateChange`、user ID 变化检测、库存
  stale guard 和退出清理。`detectSessionInUrl` 暂不修改，供未来独立 Auth flow 使用，
  但 OTP 登录不再依赖 URL callback。
- 数据边界：不修改 Auth 用户、`products`、`inventory_batches`、`user_id`、schema、
  migration 或 RLS；不会恢复或创建 anonymous user，也不改变既有 anonymous user
  清理结果。

## D-025：v0.2.11 使用 Public Storage 保存单张用户商品主图

- 状态：已决定
- 日期：2026-07-19
- 决策：使用 Public bucket `product-images`，对象路径必须以当前 `auth.uid()` 为首段；
  每个 product 仅以 `products.user_image_url` 记录一张用户上传主图。
- 显示优先级：`user_image_url` 优先于保留的 `image_url`；删除用户图后回退 API /
  历史外部图，均为空时显示既有占位。
- 安全与隐私：Public URL 获得者可读取图片；Storage INSERT、UPDATE、DELETE policy
  仅允许 authenticated 用户操作自己 user_id 目录。替换一律上传新随机路径，不 upsert。
- 非目标：多图、OCR、AI、裁剪、图库和服务端图片处理不纳入本版本。

## D-026：v0.2.12-A 使用双 Tab 承载首页与账号入口

- 状态：已决定
- 日期：2026-07-22
- 决策：登录后的顶层页面只保留“库存”和“我的”两个底部 Tab。居中的无文字 `+` 是新增商品操作，不是第三个 Tab；库存页承载商品列表、搜索和筛选，“我的”页承载当前账号状态、脱敏邮箱和退出登录。
- 移动端呈现：底栏与页面背景融合，使用内置 SVG 图标、短文字标签、细分隔线和 underline active 状态；默认入口色统一灰色，选中 Tab 使用现有绿色，不使用白色圆角卡片或明显阴影；导航和内容底部都保留 `safe-area-inset-bottom`。
- 任务流边界：新增商品、库存详情和编辑状态不显示底部 Tab，继续使用原有返回首页流程，避免打断未完成操作。
- 预留入口：提醒设置、数据导出、偏好设置只展示为“开发中”禁用项，不创建空页面或第三个 Tab。
- 数据与安全边界：不修改 Supabase Auth flow、schema、RLS、环境变量、库存 API、`products` / `inventory_batches` 数据模型或既有库存批次逻辑。

## D-027：商品详情按商品编辑与库存操作拆分状态

- 状态：已决定
- 日期：2026-07-22
- 决策：库存批次详情默认使用查看模式，并将“编辑商品”和“库存操作”作为独立入口。商品编辑模式只允许更新 `products` 的展示信息和图片相关字段；库存操作模式承载批次级操作。
- 原因：避免商品保存与库存消耗在同一视觉和提交路径中出现，降低误操作风险，并明确 `products` 与 `inventory_batches` 的职责边界。
- B1 范围：库存操作模式仅展示当前库存和后续消耗确认位置，不执行 quantity、status 或新增库存写入。
- 后续：B2 在库存操作模式中加入带二次确认的消耗操作，继续只影响选中的 `inventory_batches`，并保持零库存后显式确认 `consumed` 的既有规则。
- 数据与安全边界：不修改 schema、migration、Auth、RLS 或 `products` / `inventory_batches` 数据模型。

## D-028：v0.2.12-B2 在详情页完成家庭库存操作

- 状态：已决定并完成本地实现
- 日期：2026-07-22
- 决策：库存操作只在 `inventory-operation` 状态执行。新增库存自动沿用当前商品的 `product_id`；同 `product_id`、同 `expiry_date`、`active` 的批次直接累加 quantity，不同日期创建新的 `inventory_batches`。
- 决策：消耗库存先进入本地确认状态，默认数量为 1；取消不写入，确认后只更新选中批次的 quantity。数量不得小于 0，也不得超过确认前当前库存；提交期间禁用重复提交。
- 决策：quantity 降为 0 不自动改变 status。只有用户显式点击并确认“标记为已消耗”后，才更新 `status='consumed'`。
- 原因：家庭食品库存需要快速补货和日常消耗，但仍要保留批次到期日，降低误操作和重复商品的风险。
- 边界：不修改 products 数据结构、Supabase schema、migration、Auth、RLS、Storage 或环境变量；商品信息不重新扫码、不重新填写。

## D-029：v0.2.12-C 允许物理删除错误库存批次

- 状态：已决定并完成本地实现
- 日期：2026-07-22
- 决策：在 `inventory-operation` 的危险操作区允许用户删除当前 `inventory_batches` 记录；删除前必须二次确认，取消不写入，确认期间禁止重复提交。
- 数据边界：删除请求按当前 batch id 与 `auth.uid()` 对应的 user id 限定。删除不触及 `products`、`user_image_url`、Storage 图片或其他 batch；0 行删除视为失败，不能报成功。
- 状态：成功后从本地 active batches 移除当前记录、清除选择、返回库存列表并刷新；失败保留详情并显示错误。
- 原因：错误录入和测试库存需要可清理，同时必须保留可复用商品档案和图片，避免影响同商品的独立库存批次。
- 边界：不修改 schema、migration、Auth、RLS、Storage、环境变量或依赖。
