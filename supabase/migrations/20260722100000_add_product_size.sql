-- v0.2.12-D 首版 legacy 商品容量字段；远程已执行，后续由结构化字段 migration 取代。

alter table public.products
  add column if not exists size text;
