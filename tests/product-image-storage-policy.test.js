import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const migration = fs.readFileSync(
  path.join(
    process.cwd(),
    'supabase/migrations/20260820130000_add_product_image_select_policy.sql',
  ),
  'utf8',
)
const schema = fs.readFileSync(
  path.join(process.cwd(), 'supabase/schema.sql'),
  'utf8',
)

describe('product image Storage policy contract', () => {
  it('allows authenticated owners to select their own product image objects', () => {
    for (const source of [migration, schema]) {
      expect(source).toContain('Users can read own product images')
      expect(source).toContain('on storage.objects for select to authenticated')
      expect(source).toContain("bucket_id = 'product-images'")
      expect(source).toContain('(storage.foldername(name))[1] = (select auth.uid()::text)')
    }
  })

  it('does not grant public or anon object select through the owner policy', () => {
    expect(migration).not.toContain('for select to public')
    expect(migration).not.toContain('for select to anon')
  })
})
