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

## v0.2.7 Email Magic Link 配置

本节只记录后续人工配置，不在代码或文档中写入真实 secret、邮箱、token 或完整
UUID。

### Dashboard 配置

1. 在 Supabase Dashboard 确认 Email Auth / Passwordless 已启用。
2. 确认邮件模板使用 Magic Link，而不是六位 OTP 输入码。
3. 本地开发阶段 Site URL 使用实际主要开发 origin。
4. Redirect allow list 加入：
   - `http://localhost:5177/**`
   - `http://127.0.0.1:5177/**`
5. App 使用 `window.location.origin` 作为 Magic Link `emailRedirectTo`，确保回到
   发起登录的 origin。
6. 暂不加入 Vercel production 或 preview URL；Vercel redirect 留到 v0.2.8。
7. 不启用 manual identity linking。
8. 不把 service role key、数据库密码或 Dashboard token 配置到前端。

### Magic Link smoke

1. 启动本地开发服务。
2. 在无 session 浏览器打开本地 App，确认显示邮箱登录界面。
3. 输入真实邮箱发送 Magic Link。
4. 确认页面显示“登录链接已发送，请检查邮箱”，并进入 60 秒冷却。
5. 点击邮件链接后回到发起登录的本地 origin。
6. 确认页面显示邮箱账号状态，刷新后仍保持登录。
7. 点击退出登录后，库存立即不可见并回到邮箱登录界面。

## v0.2.7 旧 anonymous 数据迁移 runbook

本节只提供模板和流程。本轮不执行真实 SQL，不提交真实 UUID、邮箱、dump、CSV、
product ID 列表、batch ID 列表或一次性 SQL。

### 迁移前条件

- 新永久邮箱账号已经通过真实 Magic Link 登录。
- 已确认新永久账号 UUID，且该账号不是 anonymous user。
- 新账号在 `products` 和 `inventory_batches` 中均为 0 条记录。
- 迁移期间停止在 App 中新增、编辑、消耗或删除库存。
- 已导出旧用户相关数据备份，备份文件不进入 Git。
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

删除旧 Auth 用户是最后一步，本轮不执行。只有在永久账号登录、跨浏览器 smoke、
迁移数量、RLS 隔离、旧 user ID 残留和备份可用性全部验证完成后，才可以另行评估
是否删除旧 anonymous Auth 用户。
