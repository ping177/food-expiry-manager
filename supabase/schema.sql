-- 食品过期管理 v0.1 初始 schema
-- 在 Supabase SQL Editor 中执行本文件。

create extension if not exists pgcrypto;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  barcode text,
  name text not null check (length(trim(name)) > 0),
  brand text,
  image_url text,
  user_image_url text,
  category text,
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inventory_batches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity numeric not null check (quantity >= 0),
  unit text not null check (length(trim(unit)) > 0),
  production_date date,
  shelf_life_value integer check (
    shelf_life_value is null or shelf_life_value > 0
  ),
  shelf_life_unit text check (
    shelf_life_unit is null or shelf_life_unit in ('day', 'month', 'year')
  ),
  expiry_date date not null,
  storage_location text,
  note text,
  status text not null default 'active'
    check (status in ('active', 'consumed', 'discarded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shelf_life_fields_complete check (
    (
      production_date is null
      and shelf_life_value is null
      and shelf_life_unit is null
    )
    or (
      production_date is not null
      and shelf_life_value is not null
      and shelf_life_unit is not null
    )
  )
);

create index if not exists products_user_id_idx
  on public.products(user_id);

create index if not exists products_user_name_brand_idx
  on public.products(user_id, name, brand);

create unique index if not exists products_user_barcode_unique_idx
  on public.products(user_id, barcode)
  where barcode is not null;

create index if not exists inventory_batches_user_status_expiry_idx
  on public.inventory_batches(user_id, status, expiry_date);

create index if not exists inventory_batches_product_id_idx
  on public.inventory_batches(product_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists inventory_batches_set_updated_at
  on public.inventory_batches;
create trigger inventory_batches_set_updated_at
before update on public.inventory_batches
for each row execute function public.set_updated_at();

alter table public.products enable row level security;
alter table public.inventory_batches enable row level security;

drop policy if exists "Users can read own products" on public.products;
create policy "Users can read own products"
on public.products for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own products" on public.products;
create policy "Users can insert own products"
on public.products for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own products" on public.products;
create policy "Users can update own products"
on public.products for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own products" on public.products;
create policy "Users can delete own products"
on public.products for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can read own batches"
  on public.inventory_batches;
create policy "Users can read own batches"
on public.inventory_batches for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own batches"
  on public.inventory_batches;
create policy "Users can insert own batches"
on public.inventory_batches for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.products
    where products.id = product_id
      and products.user_id = (select auth.uid())
  )
);

drop policy if exists "Users can update own batches"
  on public.inventory_batches;
create policy "Users can update own batches"
on public.inventory_batches for update
to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.products
    where products.id = product_id
      and products.user_id = (select auth.uid())
  )
);

drop policy if exists "Users can delete own batches"
  on public.inventory_batches;
create policy "Users can delete own batches"
on public.inventory_batches for delete
to authenticated
using ((select auth.uid()) = user_id);

-- 商品用户图片。Bucket 为 Public，读取链接公开；写入、覆盖和删除按首段 user_id 隔离。
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

drop policy if exists "Users can upload own product images" on storage.objects;
create policy "Users can upload own product images"
on storage.objects for insert to authenticated
with check (bucket_id = 'product-images' and (storage.foldername(name))[1] = (select auth.uid()::text));

drop policy if exists "Users can update own product images" on storage.objects;
create policy "Users can update own product images"
on storage.objects for update to authenticated
using (bucket_id = 'product-images' and (storage.foldername(name))[1] = (select auth.uid()::text))
with check (bucket_id = 'product-images' and (storage.foldername(name))[1] = (select auth.uid()::text));

drop policy if exists "Users can delete own product images" on storage.objects;
create policy "Users can delete own product images"
on storage.objects for delete to authenticated
using (bucket_id = 'product-images' and (storage.foldername(name))[1] = (select auth.uid()::text));
