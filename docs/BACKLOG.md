# Backlog

本文件记录近期执行优先级、下一步候选任务和暂不实施事项。长期版本方向放在
`docs/ROADMAP.md`；条码 API 的详细评估放在
`docs/BARCODE_API_EVALUATION.md`；数据模型约束放在 `docs/DATA_MODEL.md`。

以下功能有价值，但暂不纳入当前版本路线的近期交付范围：

- 家庭共享
- 原生 iOS / Android App
- AI 图片识别
- 电商比价
- 营养分析
- 复杂购物清单
- 多人权限管理
- v0.2.1 手机浏览器相机兼容性修补（仅在真实扫码验收发现问题时启动）
- PocketBase 迁移
- IndexedDB-only 改造
- 购买 NAS / VPS
- 自托管 Supabase
- 升级 Supabase Pro
- 手机直接拍照或从相册选择商品图片；后续可能使用 Supabase Storage，实施前需评估
  图片压缩、Storage RLS、上传 / 替换 / 删除和孤立文件清理。该事项不属于
  v0.2.8，建议在 Supabase 运维 / 保活策略之后再排期。

## 后续优先事项

### v0.2.12-B2：库存消耗确认

v0.2.12-B1 已将商品编辑与库存操作拆开。下一步只在库存操作模式中恢复库存消耗能力，并加入二次确认。

候选目标：

- 消耗操作在写入前明确显示确认与取消。
- 保持数量扣减和 `consumed` 状态仅作用于选中的 `inventory_batches`。
- 继续遵循数量为 0 后由用户确认才标记为 `consumed` 的既有规则。

当前非目标：

- 不把 quantity 输入重新放回商品编辑。
- 不重构新增库存流程。
- 不修改 `products` / `inventory_batches` 数据模型、Supabase schema、migration、Auth 或 RLS。

### 下一候选：手机拍照 / 相册选择 / Supabase Storage 商品图片

v0.2.9 Supabase 轻度保活已完成。下一候选是改善商品图片录入体验，但实施前需要
先做独立方案设计，不强行指定未经确认的具体版本号。

候选目标：

- 支持手机直接拍照或从相册选择商品图片。
- 替代目前只能手工填写图片 URL 的体验。
- 评估 Supabase Storage、图片压缩、Storage RLS、上传 / 替换 / 删除和孤立文件清理。

当前非目标：

- 不在本轮实现图片上传。
- 不把 PWA、通知、导出或其他库存产品功能混入图片方案。
- 不读取或提交任何本地图片、备份或 secret。

### v0.2.9：Supabase 轻度保活与运维策略

已完成：Vercel Cron 每天一次调用 `/api/supabase-keepalive`，经服务端
`CRON_SECRET` 鉴权后连续执行 3 次只读 `keepalive_ping()` RPC。

已验收：

- Cron Path 为 `/api/supabase-keepalive`。
- Schedule 为 `17 4 * * *`；Hobby 按 UTC 04:00-04:59 窗口执行一次理解。
- `CRON_SECRET` 只配置在 Vercel Production 服务端环境变量中，不进入文档实际值。
- Supabase migration 已执行，RPC 只返回固定 boolean，不读取或修改业务数据。
- 浏览器无授权访问 endpoint 返回 401 / `{"ok":false}`。
- Supabase API Logs 已确认首次自动保活连续 3 条
  `POST /rest/v1/rpc/keepalive_ping` 200。
- 不使用 service role key，不调用 Go-UPC，不创建 anonymous user，不放宽 RLS。
- 保活降低 inactivity pause 风险，但不保证 Supabase 永不暂停。

### v0.2.8：Vercel 公网部署与手机验收

已完成：在不混入 Cron / 保活的前提下，把当前版本部署到 Vercel 公网 HTTPS，
并完成电脑端和手机端真实验收。

部署配置：

- GitHub 仓库已连接 Vercel。
- Framework：Vite。
- Root Directory：`.`。
- Build Command：`npm run build`。
- Output Directory：`dist`。
- Production URL：`https://food-expiry-manager-two.vercel.app/`。
- Vercel 前端只配置：
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- 未向前端暴露 Supabase service role key、数据库密码、Dashboard token 或
  Go-UPC API key。

已验收：

- Supabase Auth Production Site URL 已配置。
- Supabase Auth Production Redirect URL 已加入。
- `localhost:5177` 和 `127.0.0.1:5177` 本地 Redirect 继续保留。
- 电脑端 Production URL 正常打开，Magic Link 登录成功。
- 手机端 Magic Link 登录成功，刷新和重新打开后 session 保持。
- 退出后库存立即清空。
- 手机 HTTPS 摄像头可以启动。
- 手机扫描此前未录入的真实猫罐头条码，生产远程查询成功并自动填写商品信息。
- 第三方数据此次没有返回图片，但不阻塞部署。
- 新增真实商品数据刷新后仍然存在。
- 页面无明显报错。
- 原迁移测试库存已由用户在 Supabase 中主动清空；清空仅针对永久邮箱账号名下
  `products` 和 `inventory_batches`，永久邮箱 Auth 用户保留。
- 清理后只读验收：`products = 0`、`inventory_batches = 0`。
- 桌面迁移前 JSON 备份继续保留在仓库外。

当前非目标：

- 不配置 Cron，不实施 Supabase 自动保活。
- 不修改 schema / RLS / Edge Function。
- 不引入新的账号迁移或用户清理任务。
- 不把 PWA、通知、导出或图片上传列入 v0.2.8 已完成范围。

### v0.2.7：永久邮箱登录与旧匿名数据安全迁移

已完成：

- 应用启动时只恢复已有 Supabase session，不再在无 session 时自动创建新的
  anonymous user。
- 无 session 时显示邮箱 Magic Link 登录界面。
- 已有 anonymous session 继续兼容读取当前数据，并显示访客状态、恢复风险和
  退出切换入口。
- 邮箱账号显示账号状态并支持退出登录。
- 登录、退出或 user ID 切换时清空上一账号的库存和详情状态，库存加载增加旧请求
  防污染保护。
- 同一 user 的 initial auth event 或 token refresh 不会重复触发库存加载。
- 新增 Auth helper、Auth UI、mocked Auth state-machine 测试、stale request 顺序测试
  和 fake timer cooldown 测试。
- 在 Supabase Dashboard 启用并核对 Email Magic Link 配置。
- 将 redirect allow list 加入 `http://localhost:5177/**` 和
  `http://127.0.0.1:5177/**`。
- 使用真实邮箱完成本地 Magic Link smoke，刷新后 session 保持。
- 永久邮箱账号已建立，并确认为正式库存 owner。
- 同一邮箱跨浏览器登录后确认是同一个账号。
- 迁移前已生成并保留本地 JSON 备份，备份不进入 Git。
- 旧 anonymous 库存已通过 fail-closed 单事务迁移到永久邮箱账号。
- 迁移后验收通过：8 个 products、12 个 batches，其中 active 9、consumed 3、
  active quantity 27。
- 页面显示 9 个 active 批次是正确行为；consumed 3 个批次保留在数据库中。
- 退出后页面库存立即清空，重新登录后库存恢复。
- 旧 anonymous session 无法读取已迁移库存，RLS 隔离正常。
- 三个无业务数据 anonymous users 已通过 Dashboard 删除。
- 删除后最终只读验收通过，业务数据数量和 product / batch 关系保持正确。

当前非目标：

- 不恢复旧 anonymous identity。
- 不在浏览器执行跨用户迁移。
- 不使用 service role key、Admin API 或 manual identity linking。
- 不部署 Vercel、不配置 Cron。

v0.3 以后仍只是候选方向，具体顺序不在当前阶段锁定。

### v0.2.6：Supabase Free Tier 运行风险与恢复说明

已完成：

- 记录 Supabase Free 项目 `food-expiry-manager` 曾因 inactivity 自动暂停，用户已于
  2026-07-07 在 Dashboard 手动 Resume。
- 新增 Pause / Resume 操作说明、Resume 后恢复 smoke checklist、备份边界和未来
  轻度保活策略。
- 明确当前继续使用 Supabase Free，不迁移后端、不升级 Pro。

后续：

- Vercel 公网部署和手机 HTTPS smoke 已在 v0.2.8 完成。
- Supabase 轻度保活是否实施已转入 v0.2.9，根据真实使用频率决定。

当前非目标：

- 不迁移 PocketBase。
- 不改 IndexedDB-only。
- 不购买 NAS / VPS。
- 不自托管 Supabase。
- 不升级 Pro。
- 不实施自动保活。
- 不修改库存或条码业务逻辑。

### v0.2.5：Deployment readiness

已完成：

- 只读检查当前 React + Vite + Supabase 项目部署 readiness。
- 确认项目适合先部署到公网 HTTPS，并用真实手机做 smoke test。
- 推荐 Vercel 作为首选部署平台；Netlify 作为备选；GitHub Pages 暂不优先。
- 确认前端只需要公开 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY`。
- 确认 Go-UPC key 应继续只保留在 Supabase Edge Function 服务端 secret
  `GO_UPC_API_KEY`，不得新增 `VITE_GO_UPC_API_KEY`。
- 明确 Anonymous Sign-in 的跨设备和 session 丢失风险。

下一步：

- P0：真实 Vercel 部署 + 手机 HTTPS smoke test。
- P1：邮箱 / Magic Link 绑定或匿名账号升级，用于长期数据连续性和跨设备恢复。
- P1/P2：部署后根据真实手机体验再决定 PWA polish。

非目标：

- 不在 readiness 文档更新中直接部署。
- 不修改业务代码、Supabase schema / RLS 或 Go-UPC Edge Function。
- 不读取、打印或提交 `.env` / secrets。

### v0.2.4：首页库存卡片 UI refresh

已完成：

- 首页库存批次卡片改为更紧凑的移动端库存列表样式，左侧固定商品图片区域，右侧
  优先展示商品名。
- 首页卡片不展示品牌和 barcode；完整商品信息仍保留在库存详情页。
- 分类和剩余数量使用 pill 展示，首页剩余数量文案为“剩余 N 件”。
- 保质期日期保留在卡片下方，到期时间窗口作为右侧 badge 展示。
- 图片缺失时展示固定尺寸占位，保持卡片高度稳定。

非目标：

- 不修改数据模型、Supabase schema / RLS、Go-UPC Edge Function 或 barcode
  查询流程。
- 不新增依赖，不调整首页整体浅色视觉体系。

后续候选：

- 根据真实使用截图微调卡片图片尺寸、文字行数和 badge 对齐。
- 如首页列表继续变长，再评估分组、排序切换或批量操作，不纳入 v0.2.4。

### v0.2.3：手动分类选择与首页筛选

已完成：

- 分类改为用户手动选择：新增和编辑商品信息时都使用同一套项目内置分类列表，
  并允许留空。
- 第三方 API 返回的 category 不再自动保存，也不再预填到分类选择控件；本地
  `products` 命中时继续复用用户手动保存的分类。
- 首页增加组合筛选：到期时间窗口、分类和搜索关键词同时生效，默认仍展示全部
  active 批次并保持最近到期优先。
- 首页库存卡片和详情页到期 badge 复用同一套到期时间窗口文案。
- consumed 批次仍默认隐藏，不因筛选功能重新显示。

后续候选：

- 根据真实使用频率微调内置分类列表。
- 如分类列表明显不足，再评估是否需要分类管理能力；当前不新增分类表或后台。

### v0.2.2：商品信息编辑与分类校正

Go-UPC Edge Function 线上验收已确认 barcode `4255634604636` 可以成功预填
商品名、品牌和图片；保存后再次输入同 barcode 能本地复用，同 barcode 不同
到期日也能创建独立库存批次。验收同时暴露两个后续体验问题，建议作为 v0.2.2
候选处理。

目标：

- 已完成第一小步：首页库存批次卡片保持轻量摘要；点击批次进入详情视图后，
  允许用户修正已保存的 `products` 商品主数据，包括商品名、品牌、分类和图片
  链接。
- 避免把第三方 API 返回的泛化分类自动保存为不准确的本地分类。
- 保持商品编辑只影响 `products`，不改变 `inventory_batches` 的独立批次模型。

已完成：

- 商品信息编辑：允许编辑商品名、品牌、分类和图片链接。
- 同 barcode 的库存批次继续引用同一个 `product`；修改 `products` 后，所有同
  barcode 库存批次展示同步更新。
- 条形码暂不开放编辑，仅可只读展示。
- 首页卡片不承载编辑操作；详情页承载商品资料编辑、当前库存登记数量编辑和
  “消耗 1”日常扣减。
- 分类校正已在 v0.2.3 收束：第三方 category 不自动保存、不预填，由用户从
  内置列表中手动选择。

非目标：

- 不合并同 barcode 的库存批次。
- 不改变 `products` 与 `inventory_batches` 分离的数据模型。
- 不在本事项中接 Barcode Lookup、EAN-Search 或 `suggested_match`。

### v0.2.1：商品条码 API 增强：优先覆盖德国进口猫罐头

Open Food Facts / Open Pet Food Facts 对中文商品、进口猫罐头和宠物食品覆盖率
不足。v0.2 已建立扫码、本地商品复用和外部查询底座，但第一次扫码的自动匹配率
仍需提升。

用户短期主要管理德国 / 欧洲进口猫罐头，条形码多为 `4` 开头。探数 API
此前 3 个真实猫罐头样本 0/3 命中，暂不作为优先接入供应商；Go-UPC、Barcode
Lookup 和 EAN-Search / EAN-Suche 对当前 7 个样本更有效。

目标：

- 提高德国 / 欧洲进口猫罐头第一次扫码自动匹配商品名、品牌和图片的成功率。
- 接入前先使用用户手头 5–10 个真实猫罐头 barcode 测试候选服务覆盖率。

长期建议查询顺序：

1. Supabase 本地 `products`
2. Go-UPC
3. Barcode Lookup
4. EAN-Search / EAN-Suche
5. Open Food Facts universal
6. Open Pet Food Facts
7. 普通 Open Food Facts
8. 手动填写

当前 v0.2.1 最小接入方向：

- Go-UPC：已作为第一接入供应商，用于提高德国进口猫罐头的商品名和图片命中率。
- Open Food Facts / Open Pet Food Facts：保留免费兜底。

后续候选方向：

- Barcode Lookup：第二 fallback，用于补 Go-UPC 未命中的精确商品，暂不接入。
- EAN-Search / EAN-Suche：第三 fallback，用于 `suggested_match`，不自动当成
  精确命中，暂不接入。
- 国内商品条码 API：当前样本表现较弱，暂不优先。

商业商品条码 API 通常需要 API key。密钥不得放入 Vite 前端代码，后续应通过
Supabase Edge Function 代理调用第三方条码 API。

v0.2.1 最小可用版本先只接 Go-UPC，降低复杂度。Barcode Lookup 和
EAN-Search / EAN-Suche 可作为后续 fallback 增强。

实施拆分：

- `v0.2.1-a`：使用
  `docs/BARCODE_API_EVALUATION.md` 完成候选全球 / 欧洲 EAN 商品条码 API 覆盖率评估。
- `v0.2.1-b`：确定供应商、成本边界、错误语义和统一字段映射。
- `v0.2.1-c`：实现 Supabase Edge Function `lookup-barcode-product`，由服务端
  secret `GO_UPC_API_KEY` 提供 API key。
- `v0.2.1-d`：前端在本地 `products` 未命中后接入 Edge Function，并保留现有
  开放商品库 fallback。
- `v0.2.1-e`：使用真实猫罐头 barcode 做命中率、字段完整性和多批次回归测试。

当前进入 `v0.2.1-c` / `v0.2.1-d`：供应商已确定为 Go-UPC，正式接入通过
Supabase Edge Function 完成；Barcode Lookup、EAN-Search / EAN-Suche 和
`suggested_match` 仍留待后续。

### 商品图片上传 / 拍照

手动填写图片 URL 不符合主要使用习惯。后续版本可实现：

```text
用户拍照或选择图片
↓
前端压缩图片
↓
上传到 Supabase Storage
↓
保存图片 URL 到 products.image_url
↓
下次同 barcode 本地命中时复用图片
```

该能力需要设计 Storage bucket、上传权限、图片压缩、Storage RLS、上传 /
替换 / 删除和孤立文件清理，不属于 v0.2.8；建议在 Supabase 运维 / 保活策略
之后再排期。

## 说明

扫码不属于长期 backlog。摄像头扫描条形码、手动输入条形码和商品信息自动
填充已在 v0.2 实现；真实设备特有的兼容性问题再进入 v0.2.1。
