# Operator Guide

本文件记录少量人工运维步骤和安全边界。不要在这里写入真实 secret、API key、
数据库密码、Dashboard token 或 `.env` 内容。

## Supabase Free Tier Pause / Resume

### 状态确认

- 进入 Supabase Dashboard。
- 确认项目 `food-expiry-manager` 当前是 Active 还是 Paused。
- 不在文档、截图、提交记录或聊天记录中记录真实 secret。

### Resume

- 项目 Paused 时，由用户在 Supabase Dashboard 手动 Resume。
- 记录实际 Resume 日期。
- 原暂停通知邮件提到可在 90 天窗口内恢复；具体通知日期和恢复截止日期以真实邮件
  或 Dashboard 为准，不自行推算或写死截止日期。

### Resume 后最小检查

1. 项目 Dashboard 显示 Active。
2. 数据库可以访问。
3. 原有 `products` 数据仍在。
4. 原有 `inventory_batches` 数据仍在。
5. Anonymous Sign-in 仍启用。
6. 原浏览器 session 能否读取原数据。
7. 新增、编辑、数量修改是否正常。
8. “消耗 1”是否正常。
9. RLS 隔离是否正常。
10. `lookup-barcode-product` Edge Function 是否能调用。
11. Go-UPC secret 只确认“已配置”，不得读取或记录真实值。

### 备份边界

- Edge Function 源码和 migration 已由 Git 保存。
- 数据库业务数据仍需另行备份。
- Anonymous user 和 `user_id` 关系是恢复重点。
- 仅导出 CSV 不能完整解决 Anonymous Auth 身份恢复。
- 后续需要设计可执行的完整备份 / 恢复方案。
- dump、CSV、备份文件不得提交 Git。
- 不把 service role key、数据库密码或 Go-UPC key 写入文档或仓库。

### 轻度保活当前状态

- 当前尚未实施自动保活。
- 当前计划先部署 Vercel，并观察真实使用。
- 如后续需要，再设计每日或每 3-5 天一次的无副作用查询。
- 保活查询不得新增垃圾记录、修改业务数据、调用 Go-UPC、创建新的 anonymous
  user，或放宽业务表 RLS。
- 凭据必须存放在部署平台 secrets 中。
- 保活不能被描述为绝对保证 Supabase 永不暂停。
