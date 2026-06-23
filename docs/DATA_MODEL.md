# 数据模型

## 建模原则

- `products` 表示“这是什么商品”。
- `inventory_batches` 表示“我手里某一批这个商品有多少、什么时候过期”。
- 一个商品可以关联零个或多个库存批次。
- 同款商品的不同批次必须保存为不同的 `inventory_batches` 记录，不得因商品相同而合并。
- 首页展示、到期排序和临期判断都以库存批次为单位。
- 无论保质期采用哪种录入方式，批次保存前都必须生成 `expiry_date`。

## 关系概览

```text
products (1) ──────< inventory_batches (N)
```

两张业务表都通过 `user_id` 归属于 Supabase Auth 用户。v0.1 使用匿名用户，
但匿名用户同样具有稳定的 `auth.uid()`，并受 RLS 约束。

## products

商品主数据，描述可复用的商品身份和展示信息。

| 字段 | 建议类型 | 是否必填 | 说明 |
| --- | --- | --- | --- |
| `id` | `uuid` | 是 | 主键 |
| `user_id` | `uuid` | 是 | 外键，关联 `auth.users.id` |
| `barcode` | `text` | 否 | 条形码；有值时建议建立唯一索引 |
| `name` | `text` | 是 | 商品名称 |
| `brand` | `text` | 否 | 品牌 |
| `image_url` | `text` | 否 | 商品图片地址 |
| `category` | `text` | 否 | 分类，如猫罐头、猫条、食品 |
| `source` | `text` | 是 | 信息来源，如 `manual`、`open_food_facts_universal`、`open_pet_food_facts`、`open_food_facts` |
| `created_at` | `timestamptz` | 是 | 创建时间 |
| `updated_at` | `timestamptz` | 是 | 最后更新时间 |

建议约束：

- `name` 去除首尾空格后不能为空。
- `source` 默认值为 `manual`。
- `barcode` 允许为空；非空时应规范化并避免重复商品记录。
- 无条形码时，前端在同一用户下按“完全相同的商品名 + 品牌”查找可复用商品。
- 有条形码时，前端优先按同一用户的 `barcode` 查找和复用商品，并可用用户
  确认后的预填内容更新商品展示字段。
- 扫码或手输 barcode 的预填查询同样遵循本地优先：先查询当前用户的
  `products`，本地未命中才访问外部商品库。
- 商品复用只复用 `products`，每次添加库存仍创建新的批次。
- Open Food Facts universal lookup 预填的信息将 `source` 记录为
  `open_food_facts_universal`；Open Pet Food Facts fallback 记录为
  `open_pet_food_facts`；普通 Open Food Facts fallback 记录为
  `open_food_facts`；手动录入记录为 `manual`。
- `partial_found` 是查询流程状态，不是数据库字段值。它表示 barcode 对应商品
  存在但名称缺失；保存前用户仍必须补充满足 `products.name` 非空约束的名称。
- 商品数据库字段缺失时允许用户补充，不会自动推断保质期。

## inventory_batches

库存批次数据。每次购买或每个具有独立生产/到期信息的库存都应单独创建批次。

| 字段 | 建议类型 | 是否必填 | 说明 |
| --- | --- | --- | --- |
| `id` | `uuid` | 是 | 主键 |
| `user_id` | `uuid` | 是 | 外键，关联 `auth.users.id` |
| `product_id` | `uuid` | 是 | 外键，关联 `products.id` |
| `quantity` | `numeric` | 是 | 当前库存数量，不得小于 0 |
| `unit` | `text` | 是 | 单位，如罐、条、袋、盒 |
| `production_date` | `date` | 否 | 生产日期 |
| `shelf_life_value` | `integer` | 否 | 保质期数值 |
| `shelf_life_unit` | `text` | 否 | 保质期单位，如 `day`、`month`、`year` |
| `expiry_date` | `date` | 是 | 最终到期日，首页排序和状态计算依据 |
| `storage_location` | `text` | 否 | 储存位置 |
| `note` | `text` | 否 | 批次备注 |
| `status` | `text` | 是 | 建议值：`active`、`consumed`、`discarded` |
| `created_at` | `timestamptz` | 是 | 创建时间 |
| `updated_at` | `timestamptz` | 是 | 最后更新时间 |

建议约束：

- `product_id` 必须引用有效商品。
- `user_id` 必须等于当前 `auth.uid()`。
- RLS 写入策略会确认关联商品也属于当前用户。
- `quantity >= 0`。
- `status` 默认值为 `active`。
- `shelf_life_value` 有值时必须大于 0。
- `shelf_life_unit` 仅允许受支持的单位。
- 使用自动计算方式时，`production_date`、`shelf_life_value` 和 `shelf_life_unit` 必须同时存在。
- 直接填写“保质期至”时，允许保质期时长相关字段为空。
- `quantity = 0` 时允许用户将 `status` 更新为 `consumed`，但不自动删除批次。

## 到期日录入规则

### 方式 A：生产日期 + 保质期时长

用户输入：

- `production_date`
- `shelf_life_value`
- `shelf_life_unit`

系统计算并保存 `expiry_date`。例如：

```text
2026-06-01 + 24 months = 2028-06-01
```

### 方式 B：直接填写保质期至

用户直接输入 `expiry_date`。`production_date` 和保质期时长字段可以为空。

### 统一结果

两种方式最终都必须得到非空的 `expiry_date`。未来提醒、首页排序和筛选不得依赖某一种录入方式的专属字段。

## 首页状态计算

仅对需要展示的库存批次计算状态。默认首页查询 `status = active` 的记录，
并按 `expiry_date` 升序排列。

数量为 0 的 active 批次仍短暂显示，以便用户明确点击“标记为已消耗”。
标记后状态变为 `consumed`，默认首页不再展示，但记录不会被物理删除。

以本地日期的“今天”为基准：

- `expiry_date < today`：已过期
- `today <= expiry_date <= today + 7 days`：7 天内到期
- `today + 7 days < expiry_date <= today + 30 days`：30 天内到期
- `expiry_date > today + 30 days`：正常

到期展示状态是根据日期动态计算的派生值，不建议与批次生命周期字段 `status` 混为一谈。

## Supabase 实现

- schema 位于 `supabase/schema.sql`。
- `products.user_id` 和 `inventory_batches.user_id` 关联 `auth.users.id`。
- 两张表均启用 RLS，只允许 `user_id = auth.uid()` 的访问。
- 批次的 insert/update 策略额外验证关联商品属于当前用户。
- `inventory_batches.product_id` 使用 `on delete restrict`，避免误删库存历史。
- `updated_at` 由轻量数据库触发器维护。
- v0.2 保存 Open Food Facts 或 Open Pet Food Facts 返回的远程图片 URL，
  不上传图片，也不接入 Supabase Storage。

## v0.2 数据模型检查

- 当前 `supabase/schema.sql` 已包含 nullable 的 `barcode`、`brand`、
  `image_url`、`category` 字段和带默认值的 `source` 字段。
- 当前 schema 已包含用户维度的非空 barcode 唯一索引。
- 本轮无需新增 migration，也未修改 v0.1 已验证的 RLS 策略。
- 条形码只用于识别或复用 `products`，绝不用于合并
  `inventory_batches`。
