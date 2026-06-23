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
- Supabase Anonymous Auth / Postgres
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

然后在 Supabase 控制台的 Authentication 设置中开启 Anonymous Sign-ins。

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

- 页面首次打开时，如果没有现有 session，会自动调用 Supabase Anonymous Sign-in。
- 前端不显示强制登录页。
- `products` 和 `inventory_batches` 都使用当前 `auth.uid()` 作为
  `user_id`，并由 RLS 隔离用户数据。
- 如果缺少 Supabase 环境变量，页面会显示配置提示而不是白屏。

匿名账号存在重要限制：清除浏览器数据、主动退出或更换设备后，可能无法再访问原匿名账号及其数据。后续版本需要提供绑定邮箱/升级正式账号的入口，用于账号恢复、备份和跨设备同步。

## 当前版本范围

当前处于 v0.1 可运行 MVP 阶段：

- 已完成 React/Vite/Tailwind 应用骨架。
- 已完成 Supabase schema、匿名认证和 RLS。
- 已完成商品与独立库存批次录入。
- 已完成到期日计算、首页排序和批次数量更新。
- 已完成纯函数自动化测试。
- 仍需使用真实 Supabase 项目完成端到端联调和手动验收。

## v0.1 MVP 功能边界

v0.1 聚焦手动录入和库存更新的完整闭环：

- 手动添加商品。
- 在商品下手动添加多个独立库存批次。
- 使用“生产日期 + 保质期时长”自动计算到期日。
- 直接填写“保质期至”。
- 无论使用哪种录入方式，最终都生成 `expiry_date`。
- 首页按库存批次的到期日排序。
- 展示“已过期”“7 天内到期”“30 天内到期”“正常”等状态。
- 对单个库存批次快捷减少 1。
- 手动修改单个库存批次数量。
- 数量归零后可标记为已消耗，默认不再出现在 active 库存中。

v0.1 不包含扫码；扫码与条形码商品信息自动填充是紧随其后的 v0.2 核心范围，而不是远期待办。

## 项目文档

- `docs/DATA_MODEL.md`：数据模型与业务约束。
- `docs/ROADMAP.md`：版本路线和范围。
- `docs/DECISIONS.md`：重要产品与技术决策。
- `docs/DEVLOG.md`：开发记录。
- `docs/BACKLOG.md`：暂不实施的后续功能。
- `docs/TESTING.md`：测试策略与手动验收清单。
