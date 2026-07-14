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
5. Email Magic Link 登录正常，App 不主动创建 anonymous user。
6. 永久邮箱账号 session 能否恢复并读取原数据。
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
- 桌面 JSON 只是 v0.2.7 旧迁移前备份，不是持续数据库备份。

### 轻度保活当前状态

- v0.2.9 已完成，Production 保活链路已验收通过。
- Vercel Cron 目标为 `/api/supabase-keepalive`，`17 4 * * *` 在 Hobby 下表示
  每天于 UTC 04:00-04:59 窗口内执行一次，不保证精确在 04:17。
- endpoint 由 Vercel Production 的服务端 `CRON_SECRET` 保护；该变量
  不使用 `VITE_` 前缀，不进入 Git、文档实际值、浏览器响应或日志。
- endpoint 使用公开 Supabase URL 和 anon key 连续调用 3 次 `keepalive_ping()`。
- anon RPC 本身不是私有接口，但它只返回固定 boolean，不读取业务数据、不写入数据，
  因此接受这一最小权限方案，不引入 service role key。
- 浏览器直接访问 endpoint 返回 401 / `{"ok":false}` 是正常保护行为。
- Cron 失败只影响本次保活调用，不阻断网站部署，也不影响 App 登录、库存和扫码。
- 保活降低 inactivity pause 风险，但不能描述为保证 Supabase 永不暂停。

### 已完成的部署与首次验收

1. 已在 Supabase 部署 tracked migration，函数为 `security invoker`，且执行权限
   只授予 `anon`。
2. 已在 Vercel Production 设置服务端 `CRON_SECRET`；不要把实际值写入命令历史、
   文档、截图或聊天。
3. 已从提交并 push 的 Git 版本触发 Production 部署，不用 Vercel CLI 部署未提交代码。
4. 浏览器直接访问 endpoint 已返回 401 / `{"ok":false}`。
5. Vercel Cron 已注册，每日一次。
6. 首次自动执行已在 Supabase API Logs 确认连续 3 条相邻
   `POST /rest/v1/rpc/keepalive_ping`，status 均为 200。
7. Production App 最小 smoke 已确认页面正常打开、session / 邮箱登录正常、库存正常读取。

### 故障排查与关闭

- 401：确认 Production 已设置服务端 `CRON_SECRET`，并在修改后重新部署；不要
  输出或比对实际值。
- 502：检查 Vercel Production 是否仍配置公开 Supabase URL 和 anon key 的变量名；
  再根据 Runtime Logs 中的失败请求序号检查 Supabase 是否 Paused、migration 是否
  已部署、函数权限和项目网络状态。
- Supabase Paused：先在 Dashboard 手动 Resume，再执行本指南的 Resume 后最小检查。
- 临时关闭：在 Vercel `Settings -> Cron Jobs` 使用 Disable Cron Jobs。恢复时重新
  Enable，并确认下一次窗口执行。
- 永久关闭：从 `vercel.json` 移除对应 Cron 后重新部署；删除配置前需先走代码变更
  和 review，不在 Dashboard 留下与 Git 不一致的长期状态。
- 更换 `CRON_SECRET`：在 Vercel Production 生成并替换服务端值，重新部署，再用新值
  做一次 401/200 验收；旧值不得记录或复用。

## v0.2.8 Vercel Production 运维记录

### Vercel 配置

- GitHub 仓库已连接 Vercel。
- Framework：Vite。
- Root Directory：`.`。
- Build Command：`npm run build`。
- Output Directory：`dist`。
- Production URL：`https://food-expiry-manager-two.vercel.app/`。
- 前端环境变量只配置：
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- 不得把 Supabase service role key、数据库密码、Dashboard token 或 Go-UPC API key
  配置到前端。

### Supabase Auth 正式域名

- Production Site URL 已配置为 Vercel Production URL。
- Production Redirect URL 已加入。
- `http://localhost:5177/**` 和 `http://127.0.0.1:5177/**` 本地 Redirect 继续
  保留，用于本地开发和复测。

### 生产 smoke 结果

- 电脑端 Production URL 正常打开。
- 电脑端 Magic Link 登录成功。
- 手机端 Magic Link 登录成功。
- 刷新和重新打开后 session 保持。
- 退出后库存立即清空。
- 手机 HTTPS 摄像头可以启动。
- 手机扫描此前未录入的真实猫罐头条码后，生产远程查询成功并自动填写商品信息。
- 第三方数据此次没有返回图片，但不阻塞部署。
- 新增真实商品数据刷新后仍然存在。
- 页面无明显报错。

### 测试库存清理边界

- 原迁移过来的测试库存已由用户在 Supabase 中主动清空。
- 清空只删除永久邮箱账号名下的 `products` 和 `inventory_batches`。
- 永久邮箱 Auth 用户保留。
- 清理后只读验收为 `products = 0`、`inventory_batches = 0`。
- 桌面迁移前 JSON 备份继续保留在仓库外。
- 不在文档中记录完整用户 UUID、邮箱、备份内容或敏感数据。

## v0.2.7 Email Magic Link 配置

本节记录已完成的本地配置检查点和后续复核原则。不在代码或文档中写入真实
secret、邮箱、token 或完整 UUID。

### Dashboard 配置

1. 在 Supabase Dashboard `Authentication -> Providers -> Email` 确认 Email
   Provider 已启用。
2. 确认 Confirm email 开启，邮件模板使用 Magic Link，而不是六位 OTP 输入码。
3. 本地开发阶段 Site URL 使用实际主要开发 origin。
4. Redirect allow list 加入：
   - `http://localhost:5177/**`
   - `http://127.0.0.1:5177/**`
5. App 使用 `window.location.origin` 作为 Magic Link `emailRedirectTo`，确保回到
   发起登录的 origin。
6. Vercel Production Redirect 已在 v0.2.8 加入；本地 Redirect 继续保留。
7. 不启用 manual identity linking。
8. 不把 service role key、数据库密码或 Dashboard token 配置到前端。

`localhost` 和 `127.0.0.1` 是不同 origin，拥有独立 localStorage 和 Supabase
session。测试登录、退出、跨浏览器和 Redirect URL 时必须明确当前使用的 origin。

### Magic Link smoke

v0.2.7 本地 smoke 已通过。后续复测时：

1. 启动本地开发服务。
2. 在无 session 浏览器打开本地 App，确认显示邮箱登录界面。
3. 输入真实邮箱发送 Magic Link。
4. 确认页面显示“登录链接已发送，请检查邮箱”，并进入 60 秒冷却。
5. 点击邮件链接后回到发起登录的本地 origin。
6. 确认页面显示邮箱账号状态，刷新后仍保持登录。

## v0.2.10 Email OTP 验收

1. 在无 session 的浏览器或 iOS 主屏幕 Web App 打开登录页，输入邮箱并发送验证码。
2. 确认邮件显示 8 位验证码，不依赖登录链接或页面回跳。
3. 在同一 Web App 容器输入验证码，确认登录、库存读取和刷新后的 session 恢复。
4. 退出后确认库存立即不可见；使用同一邮箱再次验证码登录，确认恢复同一账号数据。
5. 输入无效或过期验证码，确认只显示通用错误，不泄露内部 Auth 信息。
7. 点击退出登录后，库存立即不可见并回到邮箱登录界面。

如果 Supabase 默认邮件服务触发短时间发送频率限制，等待限额恢复后只重新发送一次，
并使用最新邮件链接。不要反复点击发送；不要把临时限额视为应用代码缺陷。

## v0.2.7 旧 anonymous 数据迁移 runbook

v0.2.7 迁移已完成。本节保留脱敏模板和未来同类操作原则。不要提交真实 UUID、
邮箱、dump、CSV、product ID 列表、batch ID 列表、备份内容或一次性 SQL。

### 迁移前条件

- 新永久邮箱账号已经通过真实 Magic Link 登录。
- 已确认新永久账号 UUID，且该账号不是 anonymous user。
- 新账号在 `products` 和 `inventory_batches` 中均为 0 条记录。
- 迁移期间停止在 App 中新增、编辑、消耗或删除库存。
- 已导出旧用户相关数据备份，备份文件不进入 Git。v0.2.7 迁移前已生成本地
  JSON 备份并由用户保留在仓库外。
- 已保存本次 8 个 product ID 和 12 个 batch ID 到本地私密记录。
- 真实 UUID、邮箱、备份和 ID 列表不得进入 Git、文档或聊天记录。
- 不关闭或放宽 RLS，不直接修改 `auth.users`，不在前端使用 Admin API 或
  service role key。

### Fail-closed 迁移 SQL 模板

在 Supabase SQL Editor 中执行。执行前把占位符替换为本地私密记录中的真实值；
不要把替换后的 SQL 保存进仓库。

```sql
do $$
declare
  old_user_id uuid := '<OLD_ANONYMOUS_USER_ID>'::uuid;
  new_user_id uuid := '<NEW_PERMANENT_USER_ID>'::uuid;
  source_products integer;
  source_batches integer;
  source_active_batches integer;
  source_consumed_batches integer;
  source_active_quantity numeric;
  target_products integer;
  target_batches integer;
  updated_products integer;
  updated_batches integer;
  remaining_source_products integer;
  remaining_source_batches integer;
  target_products_after integer;
  target_batches_after integer;
  target_active_batches_after integer;
  target_consumed_batches_after integer;
  target_active_quantity_after numeric;
  invalid_product_refs integer;
  owner_mismatch integer;
begin
  if not exists (select 1 from auth.users where id = old_user_id) then
    raise exception 'Source Auth user does not exist';
  end if;

  if not exists (select 1 from auth.users where id = new_user_id) then
    raise exception 'Target Auth user does not exist';
  end if;

  if exists (
    select 1
    from auth.users
    where id = new_user_id
      and coalesce(is_anonymous, false) = true
  ) then
    raise exception 'Target Auth user must be a permanent email account';
  end if;

  select count(*) into source_products
  from public.products
  where user_id = old_user_id;

  select
    count(*),
    count(*) filter (where status = 'active'),
    count(*) filter (where status = 'consumed'),
    coalesce(sum(quantity) filter (where status = 'active'), 0)
  into
    source_batches,
    source_active_batches,
    source_consumed_batches,
    source_active_quantity
  from public.inventory_batches
  where user_id = old_user_id;

  select count(*) into target_products
  from public.products
  where user_id = new_user_id;

  select count(*) into target_batches
  from public.inventory_batches
  where user_id = new_user_id;

  if source_products <> 8 then
    raise exception 'Expected 8 source products, got %', source_products;
  end if;
  if source_batches <> 12 then
    raise exception 'Expected 12 source batches, got %', source_batches;
  end if;
  if source_active_batches <> 9 then
    raise exception 'Expected 9 source active batches, got %', source_active_batches;
  end if;
  if source_consumed_batches <> 3 then
    raise exception 'Expected 3 source consumed batches, got %', source_consumed_batches;
  end if;
  if source_active_quantity <> 27 then
    raise exception 'Expected active quantity 27, got %', source_active_quantity;
  end if;
  if target_products <> 0 then
    raise exception 'Target account must have 0 products, got %', target_products;
  end if;
  if target_batches <> 0 then
    raise exception 'Target account must have 0 batches, got %', target_batches;
  end if;

  update public.products
  set user_id = new_user_id
  where user_id = old_user_id;
  get diagnostics updated_products = row_count;

  update public.inventory_batches
  set user_id = new_user_id
  where user_id = old_user_id;
  get diagnostics updated_batches = row_count;

  if updated_products <> 8 then
    raise exception 'Expected to update 8 products, updated %', updated_products;
  end if;
  if updated_batches <> 12 then
    raise exception 'Expected to update 12 batches, updated %', updated_batches;
  end if;

  select count(*) into remaining_source_products
  from public.products
  where user_id = old_user_id;

  select count(*) into remaining_source_batches
  from public.inventory_batches
  where user_id = old_user_id;

  select
    count(*),
    count(*) filter (where status = 'active'),
    count(*) filter (where status = 'consumed'),
    coalesce(sum(quantity) filter (where status = 'active'), 0)
  into
    target_batches_after,
    target_active_batches_after,
    target_consumed_batches_after,
    target_active_quantity_after
  from public.inventory_batches
  where user_id = new_user_id;

  select count(*) into target_products_after
  from public.products
  where user_id = new_user_id;

  select count(*) into invalid_product_refs
  from public.inventory_batches b
  left join public.products p on p.id = b.product_id
  where b.user_id = new_user_id
    and p.id is null;

  select count(*) into owner_mismatch
  from public.inventory_batches b
  join public.products p on p.id = b.product_id
  where b.user_id = new_user_id
    and p.user_id <> b.user_id;

  if remaining_source_products <> 0 then
    raise exception 'Source products remain after migration: %', remaining_source_products;
  end if;
  if remaining_source_batches <> 0 then
    raise exception 'Source batches remain after migration: %', remaining_source_batches;
  end if;
  if target_products_after <> 8 then
    raise exception 'Expected 8 target products after migration, got %', target_products_after;
  end if;
  if target_batches_after <> 12 then
    raise exception 'Expected 12 target batches after migration, got %', target_batches_after;
  end if;
  if target_active_batches_after <> 9 then
    raise exception 'Expected 9 target active batches after migration, got %', target_active_batches_after;
  end if;
  if target_consumed_batches_after <> 3 then
    raise exception 'Expected 3 target consumed batches after migration, got %', target_consumed_batches_after;
  end if;
  if target_active_quantity_after <> 27 then
    raise exception 'Expected target active quantity 27 after migration, got %', target_active_quantity_after;
  end if;
  if invalid_product_refs <> 0 then
    raise exception 'Invalid product references after migration: %', invalid_product_refs;
  end if;
  if owner_mismatch <> 0 then
    raise exception 'Product and batch owner mismatch after migration: %', owner_mismatch;
  end if;
end $$;
```

### 精确 ID 回滚模板

只能在旧 Auth 用户尚未删除时使用。迁移和验收期间禁止业务写入。不要使用
`where user_id = '<NEW_PERMANENT_USER_ID>'` 对目标账号全部数据做无差别反向迁移；
必须仅针对迁移前记录的 8 个 product ID 和 12 个 batch ID。

```sql
do $$
declare
  old_user_id uuid := '<OLD_ANONYMOUS_USER_ID>'::uuid;
  new_user_id uuid := '<NEW_PERMANENT_USER_ID>'::uuid;
  product_ids uuid[] := array[
    '<PRODUCT_ID_1>'::uuid
    -- repeat until 8 product IDs are listed
  ];
  batch_ids uuid[] := array[
    '<BATCH_ID_1>'::uuid
    -- repeat until 12 batch IDs are listed
  ];
  updated_products integer;
  updated_batches integer;
  restored_products integer;
  restored_batches integer;
  owner_mismatch integer;
begin
  if array_length(product_ids, 1) <> 8 then
    raise exception 'Rollback requires exactly 8 product IDs';
  end if;
  if array_length(batch_ids, 1) <> 12 then
    raise exception 'Rollback requires exactly 12 batch IDs';
  end if;
  if not exists (select 1 from auth.users where id = old_user_id) then
    raise exception 'Old Auth user no longer exists; rollback is not available';
  end if;
  if not exists (select 1 from auth.users where id = new_user_id) then
    raise exception 'New Auth user does not exist';
  end if;

  update public.products
  set user_id = old_user_id
  where id = any(product_ids)
    and user_id = new_user_id;
  get diagnostics updated_products = row_count;

  update public.inventory_batches
  set user_id = old_user_id
  where id = any(batch_ids)
    and user_id = new_user_id;
  get diagnostics updated_batches = row_count;

  if updated_products <> 8 then
    raise exception 'Expected to rollback 8 products, updated %', updated_products;
  end if;
  if updated_batches <> 12 then
    raise exception 'Expected to rollback 12 batches, updated %', updated_batches;
  end if;

  select count(*) into restored_products
  from public.products
  where user_id = old_user_id
    and id = any(product_ids);

  select count(*) into restored_batches
  from public.inventory_batches
  where user_id = old_user_id
    and id = any(batch_ids);

  select count(*) into owner_mismatch
  from public.inventory_batches b
  join public.products p on p.id = b.product_id
  where b.id = any(batch_ids)
    and p.user_id <> b.user_id;

  if restored_products <> 8 then
    raise exception 'Expected 8 restored products, got %', restored_products;
  end if;
  if restored_batches <> 12 then
    raise exception 'Expected 12 restored batches, got %', restored_batches;
  end if;
  if owner_mismatch <> 0 then
    raise exception 'Owner mismatch after rollback: %', owner_mismatch;
  end if;
end $$;
```

### Anonymous user 清理原则

v0.2.7 已在迁移和只读验收后，通过 Supabase Dashboard
`Authentication -> Users` 删除三个无业务数据 anonymous users。未来如需清理
Auth 用户，必须遵守：

- 删除前先只读确认待删除 anonymous user 的 `products = 0`、`batches = 0`、
  `active quantity = 0`。
- 同时确认永久邮箱账号仍拥有预期 products、batches、active / consumed 数量和
  active quantity。
- 不得删除正式邮箱账号。
- 不直接修改 `auth.users`。
- 不关闭或放宽 RLS。
- 删除后必须复核 Auth 用户、`products`、`inventory_batches`、active /
  consumed 数量、active quantity、invalid product refs 和 owner mismatches。
- 本地备份不得放入 Git。

### v0.2.7 最终验收标准

最终只读验收已通过，标准如下：

- 永久邮箱账号存在，且不是 anonymous。
- 已删除 anonymous users 不再存在。
- 正式账号拥有 8 个 products、12 个 batches，其中 active 9、consumed 3、
  active quantity 27。
- 被删除 owner 的 products 和 batches 均为 0。
- invalid product refs = 0。
- owner mismatches = 0。
