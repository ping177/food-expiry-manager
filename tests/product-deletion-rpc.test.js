import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const migrationPath = path.join(
  process.cwd(),
  'supabase/migrations/20260820120000_add_product_deletion_rpc.sql',
)

describe('delete_product_with_history migration contract', () => {
  it('defines an owner-scoped invoker RPC with an atomic active guard', () => {
    const source = fs.readFileSync(migrationPath, 'utf8')

    expect(source).toContain(
      'create or replace function public.delete_product_with_history',
    )
    expect(source).toContain('security invoker')
    expect(source).toContain("set search_path = ''")
    expect(source).toContain('auth.uid()')
    expect(source).toContain('for update')
    expect(source).toContain("status = 'active'")
    expect(source).toContain("'blocked_active'")
    expect(source).toContain("'not_found'")
    expect(source).toContain("status in ('consumed', 'discarded')")
    expect(source).toContain('get diagnostics')
    expect(source).toContain('raise exception')
    expect(source).toContain("'deleted'")
  })

  it('restricts execution to authenticated callers', () => {
    const source = fs.readFileSync(migrationPath, 'utf8')

    expect(source).toContain(
      'revoke execute on function public.delete_product_with_history(uuid) from public',
    )
    expect(source).toContain(
      'revoke execute on function public.delete_product_with_history(uuid) from anon',
    )
    expect(source).toContain(
      'grant execute on function public.delete_product_with_history(uuid) to authenticated',
    )
  })

  it('keeps the canonical schema on restrict and records the RPC contract', () => {
    const schema = fs.readFileSync(
      path.join(process.cwd(), 'supabase/schema.sql'),
      'utf8',
    )

    expect(schema).toContain(
      'references public.products(id) on delete restrict',
    )
    expect(schema).toContain(
      'create or replace function public.delete_product_with_history',
    )
  })
})
