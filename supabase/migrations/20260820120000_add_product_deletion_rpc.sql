-- v0.3.2 Product deletion: atomically remove owned historical batches and Product.
-- The product row lock closes the race between the active guard and a new batch insert.

create or replace function public.delete_product_with_history(p_product_id uuid)
returns table (
  outcome text,
  deleted_product_id uuid,
  deleted_batch_count bigint,
  user_image_url text
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  product_row public.products%rowtype;
  deleted_batches bigint := 0;
begin
  if current_user_id is null or p_product_id is null then
    return query
    select 'not_found'::text, null::uuid, 0::bigint, null::text;
    return;
  end if;

  select p.*
  into product_row
  from public.products as p
  where p.id = p_product_id
    and p.user_id = current_user_id
  for update;

  if not found then
    return query
    select 'not_found'::text, null::uuid, 0::bigint, null::text;
    return;
  end if;

  if exists (
    select 1
    from public.inventory_batches as b
    where b.product_id = p_product_id
      and b.user_id = current_user_id
      and b.status = 'active'
  ) then
    return query
    select 'blocked_active'::text, product_row.id, 0::bigint, null::text;
    return;
  end if;

  delete from public.inventory_batches as b
  where b.product_id = p_product_id
    and b.user_id = current_user_id
    and b.status in ('consumed', 'discarded');

  get diagnostics deleted_batches = row_count;

  delete from public.products as p
  where p.id = p_product_id
    and p.user_id = current_user_id;

  if not found then
    raise exception 'Product deletion affected an unexpected number of rows';
  end if;

  return query
  select
    'deleted'::text,
    product_row.id,
    deleted_batches,
    product_row.user_image_url;
end;
$$;

revoke execute on function public.delete_product_with_history(uuid) from public;
revoke execute on function public.delete_product_with_history(uuid) from anon;
grant execute on function public.delete_product_with_history(uuid) to authenticated;
