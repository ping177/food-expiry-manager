# 测试与验收

## 测试原则

- 首页排序、到期状态和库存操作都应以库存批次为测试单位。
- 同款商品的多个批次必须分别验证，防止误合并。
- 到期日计算应覆盖月、年、闰日和月末等边界情况。
- 库存数量不得小于 0。
- 自动化测试框架建立后，应把以下核心样例转为单元测试或端到端测试。

## 自动化测试

使用 Vitest。v0.2.7 最终代码验收时结果为 12 个测试文件、105 个测试通过。
核心测试文件包括：

- `src/lib/expiry.test.js`
- `src/lib/inventory.test.js`
- `src/lib/productLookup.test.js`
- `src/lib/auth.test.js`
- `src/components/AuthPanel.test.jsx`
- `src/App.test.jsx`

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

## v0.2.8 部署后 smoke test checklist

1. 手机 HTTPS 访问页面，确认无白屏。
2. 无 session 时显示邮箱登录 UI，不自动创建 anonymous user。
3. 邮箱 Magic Link 登录后进入同一永久账号。
4. 同一邮箱在手机浏览器可恢复已迁移库存。
5. 新增商品成功。
6. 扫码可打开后置摄像头。
7. 扫码失败时可手输 barcode。
8. Go-UPC 可命中真实 barcode，并预填名称、品牌和图片。
9. Go-UPC 未命中或失败时仍可手动填写。
10. 保存库存批次后首页出现独立 batch。
11. 首页到期窗口、分类、搜索组合筛选生效。
12. 详情页编辑商品信息和库存数量成功。
13. 另一 anonymous user 看不到永久账号数据。
14. 同 barcode 保存两个不同到期日，确认不合并批次。
15. 刷新页面后数据仍存在。

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

- 手机浏览器摄像头权限、后置摄像头选择和真实包装扫码仍待 v0.2.8 公网 HTTPS
  环境验收。
- 生产环境 Magic Link、手机同邮箱登录、库存恢复、Go-UPC Edge Function 和
  Open Food Facts fallback 需要在 v0.2.8 部署后重新 smoke。

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
