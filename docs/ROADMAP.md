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

- 状态：下一步
- 连接 GitHub 仓库到 Vercel
- 配置前端公开 Supabase 环境变量
- 配置 Production Site URL / Redirect URL
- 验证生产 Magic Link、手机同邮箱登录和库存恢复
- 验证手机 HTTPS 摄像头扫码、Go-UPC fallback 和核心库存 smoke
- 不混入 Cron / Supabase 自动保活

## v0.2.9：Supabase 轻度保活与运维策略

- 状态：候选
- 先观察 v0.2.8 公网部署后的真实使用频率
- 如确有需要，再设计无副作用健康查询
- 不默认实施 Cron，不用业务写入或 anonymous user 创建作为保活方式

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
