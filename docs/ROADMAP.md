# 版本路线

本文件是长期路线图，记录版本级方向和范围边界。近期执行优先级和下一步候选任务
放在 `docs/BACKLOG.md`；专项评估细节不在路线图中重复维护。

版本范围按“先建立可用闭环，再快速扩展录入效率”的原则安排。

v0.3 及以后为候选方向，具体顺序会根据真实使用反馈调整，不作为当前锁定计划。

## v0.1：手动录入 MVP

- 状态：已完成并通过真实 Supabase 验收
- 稳定基线：`7585fb2 feat: complete v0.1 food expiry management MVP`
- 手动添加商品
- 手动添加库存批次
- 支持生产日期 + 保质期计算到期日
- 支持直接填写保质期至
- 首页按库存批次的到期日排序
- 显示已过期、7 天内到期、30 天内到期、正常等状态
- 支持某个库存批次快捷减少 1
- 支持手动修改库存批次数量
- 数量为 0 时可标记为已消耗
- 使用 Supabase Anonymous Sign-in 打开即用
- 使用 `user_id` 和 RLS 隔离匿名用户数据

## v0.2：扫码和商品信息自动填充

- 状态：核心闭环已实现；本地商品复用和同 barcode 多批次独立保存已通过手动验收
- 使用 `@zxing/browser` 扫描条形码
- 支持手动输入条形码并进入相同查询流程
- 通过 Open Food Facts 预填商品名、品牌、图片和分类
- 查不到、网络错误或字段缺失时允许手动补充
- 查询到的商品信息保存到 `products`
- 同一条形码可复用商品，但每次添加仍新建独立 `inventory_batch`
- 保质期仍由用户填写，不从开放商品数据库推断

## v0.2.1：商品条码 API 增强：优先覆盖德国进口猫罐头

- 状态：Go-UPC Edge Function 最小接入阶段
- 目标：提高德国 / 欧洲进口猫罐头第一次扫码自动匹配商品名、品牌和图片的成功率
- 背景：用户短期主要管理德国 / 欧洲进口猫罐头，条码多为 `4` 开头；探数 API
  当前样本 0/3 命中，暂不优先
- 查询顺序保持 Supabase 本地 `products` 优先
- 通过 Supabase Edge Function `lookup-barcode-product` 代理 Go-UPC
- API key 不进入 Vite 前端代码
- 当前接入顺序：Go-UPC → Open Food Facts universal → Open Pet Food Facts →
  普通 Open Food Facts
- Barcode Lookup 和 EAN-Search / EAN-Suche 可作为后续 fallback 增强，但不在
  本轮实现
- 图片上传/拍照另行设计，不与条码 API 接入捆绑实现
- 评估记录：`docs/BARCODE_API_EVALUATION.md`

非目标：

- 不做淘宝、京东或其他电商爬虫
- 不做图片上传或拍照
- 不做 AI 图片识别
- 不改变库存批次独立保存原则

## v0.2.7：永久邮箱账号与旧数据迁移

- 状态：已完成并通过本地真实验收
- 使用邮箱 Magic Link 作为正式账号体系
- 不再为无 session 用户自动创建新的 anonymous user
- 旧 anonymous 库存已迁移到永久邮箱账号
- 迁移保持 product 主键和 batch `product_id` 不变
- 迁移后数据库数量验收通过：8 个 products、12 个 batches，其中 active 9、
  consumed 3
- 无业务数据 anonymous users 已清理

## v0.2.8：Vercel 公网部署与手机验收

- 状态：已完成并通过生产与手机验收
- GitHub 仓库已连接 Vercel
- Vercel 使用 Vite，Root Directory 为 `.`
- Build Command 为 `npm run build`，Output Directory 为 `dist`
- Production URL 为 `https://food-expiry-manager-two.vercel.app/`
- 前端只配置 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY`
- Supabase Production Site URL / Redirect URL 已配置，本地 Redirect 继续保留
- 电脑端和手机端 Magic Link 登录通过
- 刷新 / 重新打开后 session 保持，退出后库存立即清空
- 手机 HTTPS 摄像头可启动，真实条码远程查询成功并可保存真实库存
- 原迁移测试库存已由用户清空，永久邮箱 Auth 用户保留
- 不混入 Cron / Supabase 自动保活

## v0.2.9：Supabase 轻度保活与运维策略

- 状态：已完成并通过 Production 保活链路验收
- Vercel Cron 每天一次调用 `/api/supabase-keepalive`
- Schedule 为 `17 4 * * *`；Hobby 按 UTC 04:00-04:59 窗口执行一次理解
- endpoint 使用服务端 `CRON_SECRET` 鉴权
- 连续调用 3 次只读 `keepalive_ping()` RPC
- RPC 只返回固定 boolean，不读取或修改 `products`、`inventory_batches`、Auth 或其他业务数据
- 不使用 service role key，不调用 Go-UPC，不创建 anonymous user，不放宽 RLS
- 首次自动保活已在 Supabase API Logs 确认 3 条 `POST /rest/v1/rpc/keepalive_ping` 200

## 后续候选：商品图片上传体验

- 支持手机直接拍照或从相册选择商品图片
- 替代当前只能手工填写图片 URL 的体验
- 可能使用 Supabase Storage
- 实施前需评估图片压缩、Storage RLS、上传 / 替换 / 删除和孤立文件清理
- 建议在 Supabase 运维 / 保活策略之后再排期，不强行绑定到当前 v0.3 顺序

## v0.3：批次和筛选体验优化

- 商品详情页展示该商品下所有库存批次
- 支持按分类、储存位置、到期时间窗口筛选
- 支持搜索商品名
- 支持编辑批次信息

## v0.4：提醒能力

- 支持 PWA
- 支持临期提醒设置
- 可考虑 Bark / ntfy / 浏览器通知

## v0.5：备份和导入导出

- CSV 导出
- JSON 备份
- 批量导入
