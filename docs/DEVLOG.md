# 开发日志

记录已完成的项目工作，按日期倒序维护。

## 2026-07-08

### v0.2.8 Vercel production deployment and phone smoke

- 已将 GitHub 仓库连接到 Vercel，并以 Vite 作为 Framework 部署当前静态前端。
- Vercel Root Directory 为 `.`，Build Command 为 `npm run build`，Output
  Directory 为 `dist`。
- Production URL 为 `https://food-expiry-manager-two.vercel.app/`。
- Vercel 前端只配置 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY`；未向前端
  暴露 Supabase service role key、数据库密码、Dashboard token 或 Go-UPC API key。
- Supabase Auth 已配置 Production Site URL 和 Production Redirect URL；
  `localhost:5177` 与 `127.0.0.1:5177` 本地 Redirect 继续保留。
- 电脑端 Production URL 正常打开，Magic Link 登录成功。
- 手机端 Magic Link 登录成功；刷新和重新打开后 session 保持。
- 退出后库存立即清空。
- 手机 HTTPS 环境下摄像头可以启动。
- 手机扫描此前未录入的真实猫罐头条码后，生产远程查询成功并自动填写商品信息。
- 第三方数据此次没有返回图片，但不阻塞部署；后续图片体验作为独立候选事项处理。
- 新增真实商品数据刷新后仍然存在，页面无明显报错。
- 原迁移过来的测试库存已由用户在 Supabase 中主动清空；清空仅删除永久邮箱账号
  名下的 `products` 和 `inventory_batches`，永久邮箱 Auth 用户保留。
- 清理后只读验收为 `products = 0`、`inventory_batches = 0`，随后开始录入真实库存。
- 桌面迁移前 JSON 备份继续保留在仓库外；本次文档不记录完整 UUID、邮箱或敏感数据。
- 本轮未修改业务代码、测试、package / lockfile、Supabase schema / RLS、
  Edge Function、Vercel 配置或 `.env` / secrets。

### v0.2.7 Permanent Email Auth final acceptance and migration closure

- 已完成 Supabase Email Provider、Confirm email、本地 Site URL 和本地 Redirect URL
  配置，并使用默认 Supabase 邮件服务完成真实 Magic Link 登录。
- Magic Link 曾因默认邮件服务短时间发送频率限制出现一次临时发送失败；等待额度
  恢复后重新发送并使用最新邮件链接登录成功，该问题不属于应用代码缺陷。
- 永久邮箱账号已建立，刷新后 session 保持；同一邮箱跨浏览器登录确认是同一账号。
- 退出邮箱账号后页面库存立即清空并返回登录页；再次使用同一邮箱登录后库存恢复。
- 迁移前已生成本地 JSON 备份并由用户保留在仓库外；备份内容、完整 UUID 和邮箱
  未写入文档或 Git。
- 已通过 fail-closed 单事务将旧 anonymous 库存迁移到永久邮箱账号，只更新
  `products.user_id` 和 `inventory_batches.user_id`，product 主键和 batch 的
  `product_id` 保持不变。
- 迁移数量验收通过：8 个 products、12 个 inventory batches，其中 active 9、
  consumed 3、active quantity 27，invalid product refs = 0，owner mismatches = 0。
- 首页只显示 9 个 active 批次是正确行为；3 个 consumed 批次保留在数据库中。
- 迁移后旧 anonymous session 无权访问已迁移库存，邮箱账号可正常读取库存，说明
  RLS 隔离、页面缓存清理和账号切换保护均按预期工作。
- 已确认三个无业务数据 anonymous users 的 products、batches 和 active quantity
  均为 0，随后通过 Supabase Dashboard 删除。
- 删除后最终只读验收通过：永久邮箱账号存在且不是 anonymous，已删除 anonymous
  users 不再存在，业务数据仍为 8 / 12 / 9 / 3 / 27，关系校验为 0 异常。
- 本次最终收口未修改 Supabase schema、RLS、Edge Function 或业务数据结构。

### v0.2.7 Permanent Email Auth implementation Phase 1

- 将 App 启动认证流程从“无 session 自动 anonymous sign-in”改为“只恢复已有
  Supabase session；无 session 显示邮箱 Magic Link 登录界面”。
- 本轮不再调用 `signInAnonymously()`，也不提供“以访客身份继续”按钮。
- 已有 anonymous session 继续兼容读取当前访客数据，并显示“访客账号”状态、
  清浏览器数据 / 换浏览器 / 换设备后可能无法恢复的风险提示，以及“退出访客并
  使用邮箱登录”入口。
- 永久邮箱账号显示脱敏邮箱状态，并提供退出登录。
- 登录、退出或 user ID 切换时立即清空上一账号的库存、详情和筛选状态；库存加载
  增加 user ID stale guard，防止旧用户延迟返回的数据污染新用户视图。
- 新增 `AuthPanel` 和 Auth helper，Magic Link 使用 `window.location.origin`
  作为 redirect，并设置 `shouldCreateUser: true`。
- 新增 Auth 自动化测试，覆盖 anonymous session 识别、Magic Link 参数、发送
  成功 / 失败 / cooldown、退出登录、旧库存请求 stale guard 和生产代码不再创建
  anonymous user。
- Review fixes：库存加载改为由稳定 `sessionUserId` 触发，同一 user 的 initial
  auth event 或 token refresh 不重复加载；补充 mocked Auth state-machine 行为测试、
  stale request 顺序测试和 fake timer cooldown 测试。
- 更新 README、决策记录、测试文档、运维指南、backlog 和项目状态。
- 运维指南新增 Supabase Dashboard Magic Link 配置说明、真实 smoke checklist、
  fail-closed 旧数据迁移 SQL 模板和精确 ID 回滚模板。
- 本轮未执行真实 Dashboard 配置、未发送真实 Magic Link、未执行真实 SQL、未删除
  Auth 用户、未修改 Supabase schema / RLS、未部署、未读取或打印 secrets。

### v0.2.6 Supabase Free Tier 运行风险与恢复说明

- 收到 Supabase Free Tier inactivity pause 相关通知，项目 `food-expiry-manager`
  曾因 inactivity 自动暂停。
- 用户已于 2026-07-07 在 Supabase Dashboard 手动 Resume。
- 新增 Pause / Resume、Resume 后恢复 smoke、备份边界和未来轻度保活说明。
- 当前尚未实施 Vercel Cron 或任何自动保活。
- 当前尚未部署 Vercel。
- 当前策略是继续使用 Supabase Free，先完成恢复核验、备份说明和 Vercel 部署，
  再根据真实使用情况决定是否增加轻度 Cron 健康查询。
- 本轮只修改文档，不修改业务代码、Supabase schema / RLS、Realtime 配置、
  Go-UPC Edge Function 或部署配置，未读取、展示或提交 secrets。

## 2026-06-28

### v0.2.5 Deployment readiness docs

- 完成部署 readiness 只读检查，并进行 docs-only readiness 文档更新。
- 当前判断：项目是标准 React + Vite 静态前端，已具备先部署到公网 HTTPS
  做手机 smoke test 的条件。
- 推荐 Vercel 作为首选部署平台；Netlify 作为备选；GitHub Pages 暂不优先。
- 记录部署环境变量边界：`VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY`
  可以作为前端公开变量；`GO_UPC_API_KEY` 必须继续只保留在 Supabase Edge
  Function 服务端 secret 中，禁止新增 `VITE_GO_UPC_API_KEY`。
- 记录 Anonymous Sign-in 风险：手机首次访问可能创建新的 anonymous user；
  Mac 本地匿名账号数据不会自动出现在手机；清浏览器数据、换手机、换浏览器、
  无痕模式都可能导致无法访问原匿名账号数据。
- 建议：可以先部署做手机 smoke test，但长期正式使用前建议补邮箱 /
  Magic Link 绑定或匿名账号升级入口，用于账号恢复和跨设备连续性。
- 本轮只修改文档，不修改业务代码、Supabase schema / RLS、Go-UPC Edge
  Function，不部署，不 commit / push，未读取或打印 secrets。

### v0.2.4 首页库存卡片 UI refresh

- 将首页库存批次卡片调整为更紧凑的移动端库存列表样式：左侧固定商品图片区域，
  右侧突出商品名、分类、剩余数量、保质期日期和到期时间窗口。
- 首页卡片不再展示品牌；barcode 仍只在详情页等完整信息场景展示。
- 分类和当前库存数量改为 pill 展示，首页库存数量文案统一为“剩余 N 件”。
- 图片缺失时展示固定尺寸占位，避免不同卡片因有无图片产生明显高度跳动。
- 到期时间窗口继续复用 v0.2.3 的统一区间与文案，并作为卡片右侧醒目 badge。
- 本轮只修改首页卡片展示层，未修改 Supabase schema / RLS，未修改 Go-UPC
  Edge Function，未修改 barcode 查询流程，未新增依赖，未读取或打印 secrets。
- 更新 BatchCard 渲染测试，覆盖首页卡片不展示品牌 / barcode、剩余数量 pill
  和缺图占位。
- `npm test -- src/components/BatchCard.test.jsx`：6 个测试通过。
- `npm test`：10 个测试文件、79 个测试全部通过。
- `npm run build`：生产构建成功。
- `git diff --check`：通过。

### v0.2.3 手动分类选择与首页筛选

- 新增项目内置商品分类列表，覆盖猫罐头、猫粮、猫条 / 宠物零食、宠物用品、
  食品、冷冻 / 冷藏、饮品、调味品 / 干货、日用品、清洁用品、药品 / 保健品、
  美妆个护和其他。
- 新增商品表单的分类字段从自由文本改为分类选择控件，并允许留空。
- 批次详情页编辑商品信息时复用同一套分类选择控件；已有非内置分类会保留为
  当前可选值，避免编辑时意外清空旧数据。
- 第三方商品查询返回的 category 不再写入正式分类，也不再预填到分类选择控件；
  Supabase 本地 `products` 命中时仍保留用户之前手动保存的 `category`。
- 首页新增轻量筛选：到期时间窗口（全部、已过期、1个月、6个月、1年、2年、
  > 2年）、分类和搜索关键词。
- 到期时间筛选使用互斥剩余天数区间：已过期为小于 0 天，1个月为 0-30 天，
  6个月为 31-180 天，1年为 181-365 天，2年为 366-730 天，> 2年为大于
  730 天。
- 首页库存卡片和详情页到期 badge 复用同一套到期时间窗口文案，不再展示旧的
  “正常 / 临期 / 已过期”三段式文案。
- 首页筛选组合生效，搜索范围为商品名和品牌；筛选只作用于已加载的 active
  批次，并保持原本最近到期优先排序。
- consumed 批次仍由默认 active 查询隐藏，筛选 helper 也不会重新显示 consumed
  批次。
- 用户界面展示名从“食品过期管理”调整为“库存保质期管理”；未修改本地目录、
  GitHub remote 或 package name。
- 本轮未修改 Supabase schema / RLS，未修改 Go-UPC Edge Function，未新增依赖，
  未读取或打印 secrets。
- 新增分类列表、库存筛选 helper、表单渲染测试、到期时间窗口组合测试和展示名
  测试；更新商品查询测试，覆盖外部 category 不预填、本地 category 继续复用。
- `npm test`：10 个测试文件、76 个测试全部通过。
- `npm run build`：生产构建成功。
- `git diff --check`：通过。

### v0.2.2 第一小步：保存后编辑商品信息

- 将首页库存批次卡片调整为轻量摘要列表项：只展示商品图片、商品名、品牌 /
  分类、库存数量、保质期至和到期状态。
- 新增轻量详情视图：点击首页库存批次后进入详情页，集中展示商品、到期和库存
  信息。
- 详情页右上提供商品资料编辑入口，支持编辑对应 `products` 记录的商品名、品牌、
  分类和图片链接。
- 详情页底部提供“消耗 1”入口，用于日常使用时直接将当前库存批次数量减少 1；
  数量为 0 时不会继续减少。
- 详情页编辑表单分为“商品信息”和“当前批次”两个区块；当前批次区块允许修改
  当前库存登记数量。
- 条形码仅作为只读信息展示，不开放编辑。
- 保存商品信息只更新 `products` 表，不修改 `inventory_batches` 的数量、到期日
  或 consumed 状态。
- “消耗 1”和编辑表单中的当前库存更新都只更新当前 `inventory_batches` 记录，
  不合并不同批次。
- 保存成功后会刷新库存展示；同一个 product 下的多个独立库存批次会同步展示
  更新后的商品信息。
- 取消编辑不会保存改动；更新失败会显示错误，并保留原展示。
- 已确认当前 `supabase/schema.sql` 已包含 `Users can update own products`
  RLS policy，本次未修改 Supabase schema / RLS。
- 新增商品编辑 helper、BatchCard 摘要测试和 BatchDetail 静态渲染测试，覆盖首页
  不展示编辑按钮、详情展示、商品编辑字段、当前库存字段、barcode 不可编辑、
  `消耗 1` 文案、payload 规范化、取消/失败前展示不变，以及同 product 多批次
  同步更新。
- `npm test`：6 个测试文件、49 个测试全部通过。
- `npm run build`：生产构建成功。

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
