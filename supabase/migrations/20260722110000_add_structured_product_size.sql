-- v0.2.12-D 结构化容量/规格。保留已部署的 legacy products.size，不删除或回填。

alter table public.products
  add column if not exists size_value numeric,
  add column if not exists size_unit text;
