# 食品过期管理

一个自用优先、移动端优先的食品与宠物食品库存/过期管理 Web App。项目首先服务于猫罐头、猫条和日常食品的管理，用来替代订阅制的同类软件。

核心建模原则是将“商品”和“库存批次”分开：同一商品可以有多个批次，每个批次独立记录数量、生产日期和到期日，不能因为商品相同就合并库存。

## 项目目标

- 清楚记录手头有哪些食品、分别有多少。
- 以库存批次为单位管理生产日期、保质期和到期日。
- 优先展示已过期和即将过期的库存，降低遗忘和浪费。
- 支持日常消耗时快捷扣减库存数量。
- 在手动录入闭环稳定后，尽快加入扫码与商品信息自动填充。

## 技术栈

当前使用：

- React
- Vite
- Tailwind CSS
- Supabase Email OTP Auth / Postgres
- Supabase Edge Functions
- `@zxing/browser`
- Go-UPC API via server-side Edge Function
- Open Food Facts universal product lookup / Open Pet Food Facts
- 移动端优先的响应式 Web UI
- 后续支持 PWA

v0.1 直接接入 Supabase，不使用 `localStorage` 作为主数据层。Storage
将在后续需要商品图片时接入。

## 启动方式

### 1. 创建 Supabase 数据表

在 Supabase SQL Editor 中执行：

```text
supabase/schema.sql
```

然后在 Supabase 控制台的 Authentication 设置中启用 Email Provider，并将登录
邮件模板配置为包含 `{{ .Token }}` 的 8 位验证码。当前正式账号体系使用邮箱
OTP，不再自动创建新的 anonymous user。

### 2. 配置环境变量

复制示例文件：

```bash
cp .env.example .env.local
```

填写：

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

不要把 `.env.local` 或真实密钥提交到 Git。

### 3. 安装并启动

```bash
npm install
npm run dev
```

生产构建和测试：

```bash
npm run build
npm test
```

## 认证方式

- 页面首次打开时会先恢复已有 Supabase session。
- 如果没有 session，前端先发送邮箱验证码，再在同一页面输入验证码登录；不再
  静默创建新的 anonymous user。
- 永久邮箱账号是正式库存 owner；旧匿名库存已迁移到邮箱账号。
- `products` 和 `inventory_batches` 都使用当前 `auth.uid()` 作为
  `user_id`，并由 RLS 隔离用户数据。
- 如果缺少 Supabase 环境变量，页面会显示配置提示而不是白屏。

匿名账号存在重要限制：清除浏览器数据、主动退出或更换设备后，可能无法再访问原
匿名账号及其数据。v0.2.7 已完成永久邮箱账号、旧匿名库存迁移和无业务数据
anonymous users 清理；后续主要使用可恢复的邮箱账号。

## 当前版本范围

当前已完成 v0.2.8 Vercel 公网部署和手机 HTTPS 验收。Production URL：

```text
https://food-expiry-manager-two.vercel.app/
```

当前已在提交 `7585fb2` 的 v0.1 稳定基线上完成 v0.2 代码实现：

- 使用摄像头扫描商品条形码，扫码成功后立即停止摄像头。
- 支持取消扫码、摄像头不可用时降级到手动输入条形码。
- 优先使用 Open Food Facts universal lookup 预填商品名、品牌、图片和分类；
  无论首个 endpoint 是未找到还是服务异常，都会继续尝试 Open Pet Food Facts
  和普通 Open Food Facts endpoint。
- 商品查询失败或字段缺失时仍可手动填写并保存。
- 同一条形码可复用商品主数据，但每次添加都会创建独立库存批次。
- 保质期继续由用户手动填写，不从商品数据库推断。
- 图片链接为可选字段，通常由扫码自动填入；v0.2 不包含图片上传或拍照。

同 barcode 本地 product 复用、两个独立批次保存及刷新后持久化已通过真实
Supabase 手动验收。开放商品库对真实猫罐头覆盖不足的问题留到 v0.2.1，通过
商品条码 API 增强首次扫码命中率。

v0.2.1 已完成 Go-UPC Edge Function 接入：前端仍然先查询当前用户的本地
`products`，本地未命中后调用 Supabase Edge Function 代理 Go-UPC；Go-UPC
未命中或失败时继续走 Open Food Facts universal、Open Pet Food Facts 和普通
Open Food Facts fallback。Go-UPC API key 只允许配置为 Supabase Edge Function
服务端 secret `GO_UPC_API_KEY`，不得写入前端环境变量或代码。

## 录入方式

- 扫码或手动输入条形码后查询商品信息。
- 条形码查询先读取当前用户的 Supabase `products`；本地命中时直接复用已保存
  的名称、品牌、图片和分类，不再请求外部商品库。
- 只有本地没有该 barcode 时，才查询 Go-UPC Edge Function；Go-UPC 未命中或
  失败后继续查询 Open Food Facts / Open Pet Food Facts。
- 不使用条形码时可继续完全手动添加商品。
- 使用“生产日期 + 保质期时长”自动计算到期日。
- 直接填写“保质期至”。
- 无论使用哪种录入方式，最终都生成 `expiry_date`。

摄像头访问需要安全上下文。本地使用固定地址
`http://127.0.0.1:5177`，线上部署必须使用 HTTPS。

Vercel 部署使用 Vite preset，Root Directory 为仓库根目录，Build Command 为
`npm run build`，Output Directory 为 `dist`。前端只配置
`VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY`；Supabase service role key 和
Go-UPC API key 不得配置到前端。

Open Food Facts 和 Open Pet Food Facts 仅用于商品信息预填，不负责提供或推断
保质期。正常未找到与网络、HTTP、返回解析异常会显示不同提示，任何查询失败
都不会阻塞手动添加。查询结果区分 `found`、`partial_found`、`not_found`、
`network_error`、`http_error` 和 `parse_error`；找到条形码但缺少商品名时，
会保留其他已知字段并允许用户手动补全后保存。

带 barcode 保存的商品会写入或复用 `products`，因此用户第一次手动补全后，
下次扫码可以直接使用自己的本地商品资料。复用商品只影响主数据，每次添加库存
仍然创建新的 `inventory_batches` 记录。

### Go-UPC Edge Function secret

Go-UPC 的 API key 只配置在 Supabase Edge Function 服务端 secret 中：

```bash
supabase secrets set GO_UPC_API_KEY=你的本地或线上密钥 --project-ref <project-ref>
```

也可以在 Supabase Dashboard 的 Edge Functions Secrets 中添加
`GO_UPC_API_KEY`。不要创建 `VITE_GO_UPC_API_KEY`，不要把真实 key 写入
`.env.local`、源码、文档或前端构建产物。

后续图片上传/拍照将单独设计 Supabase Storage、图片压缩和 Storage RLS；当前
版本不会把图片链接作为必填项。

## 项目文档

README 只作为项目入口，记录使用方式、当前能力和关键文档入口；专项评估与历史
细节不在这里重复维护。

- `docs/PROJECT_STATE.md`：project-command-center 使用的人工状态摘要，只放当前
  状态、结论和下一步。
- `docs/ROADMAP.md`：长期版本路线图和版本范围。
- `docs/BACKLOG.md`：近期执行优先级、下一步候选任务和暂不实施事项。
- `docs/DECISIONS.md`：关键产品、架构、API、数据模型和工作流决策日志。
- `docs/DATA_MODEL.md`：`products` / `inventory_batches` 数据模型与业务约束。
- `docs/BARCODE_API_EVALUATION.md`：条码 API 专项评估与 Go-UPC 接入结论。
- `docs/TESTING.md`：自动化测试策略与手动验收清单。
- `docs/DEVLOG.md`：按日期倒序记录已完成工作和验证结果。
