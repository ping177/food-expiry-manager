-- v0.3.2 Storage cleanup correction: authenticated owners need SELECT visibility
-- for Storage remove() to delete and return their own product image objects.

drop policy if exists "Users can read own product images" on storage.objects;
create policy "Users can read own product images"
on storage.objects for select to authenticated
using (
  bucket_id = 'product-images'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);
