import { describe, expect, it, vi } from 'vitest'
import {
  checkProductActiveStatus,
  deleteProductWithHistory,
  retryProductImageCleanup,
} from './productDeletion'

const userId = 'user-1'
const productId = 'product-1'
const ownedImageUrl =
  'https://project.supabase.co/storage/v1/object/public/product-images/user-1/product-1/image.jpg'

function createClient({
  rpcData = [{
    outcome: 'deleted',
    deleted_product_id: productId,
    deleted_batch_count: 2,
    user_image_url: ownedImageUrl,
  }],
  rpcError = null,
  removeError = null,
} = {}) {
  const remove = vi.fn().mockResolvedValue({ error: removeError })
  return {
    supabaseUrl: 'https://project.supabase.co',
    rpc: vi.fn().mockResolvedValue({ data: rpcData, error: rpcError }),
    storage: {
      from: vi.fn(() => ({ remove })),
    },
    remove,
  }
}

function product(overrides = {}) {
  return {
    id: productId,
    user_image_url: ownedImageUrl,
    image_url: 'https://cdn.example.com/fallback.jpg',
    ...overrides,
  }
}

describe('deleteProductWithHistory', () => {
  it('does not remove storage when the database reports an active guard', async () => {
    const client = createClient({
      rpcData: [{
        outcome: 'blocked_active',
        deleted_product_id: productId,
        deleted_batch_count: 0,
        user_image_url: null,
      }],
    })

    const result = await deleteProductWithHistory({
      supabaseClient: client,
      userId,
      product: product(),
    })

    expect(result.outcome).toBe('blocked_active')
    expect(client.remove).not.toHaveBeenCalled()
  })

  it('does not remove storage for not-found or RPC failures', async () => {
    const notFoundClient = createClient({
      rpcData: [{
        outcome: 'not_found',
        deleted_product_id: null,
        deleted_batch_count: 0,
        user_image_url: null,
      }],
    })
    const errorClient = createClient({ rpcData: null, rpcError: new Error('db failed') })

    await expect(deleteProductWithHistory({
      supabaseClient: notFoundClient,
      userId,
      product: product(),
    })).resolves.toMatchObject({ outcome: 'not_found' })
    await expect(deleteProductWithHistory({
      supabaseClient: errorClient,
      userId,
      product: product(),
    })).resolves.toMatchObject({ outcome: 'error' })

    expect(notFoundClient.remove).not.toHaveBeenCalled()
    expect(errorClient.remove).not.toHaveBeenCalled()
  })

  it('removes only the verified owned object after database deletion', async () => {
    const client = createClient()

    const result = await deleteProductWithHistory({
      supabaseClient: client,
      userId,
      product: product(),
    })

    expect(result.outcome).toBe('deleted')
    expect(result.cleanupStatus).toBe('completed')
    expect(client.remove).toHaveBeenCalledWith(['user-1/product-1/image.jpg'])
  })

  it('uses the locked database image URL instead of a stale client snapshot', async () => {
    const client = createClient({
      rpcData: [{
        outcome: 'deleted',
        deleted_product_id: productId,
        deleted_batch_count: 2,
        user_image_url:
          'https://project.supabase.co/storage/v1/object/public/product-images/user-1/product-1/new.jpg',
      }],
    })

    await deleteProductWithHistory({
      supabaseClient: client,
      userId,
      product: product({
        user_image_url:
          'https://project.supabase.co/storage/v1/object/public/product-images/user-1/product-1/stale.jpg',
      }),
    })

    expect(client.remove).toHaveBeenCalledWith(['user-1/product-1/new.jpg'])
  })

  it('never removes an external, wrong-user, or wrong-product image URL', async () => {
    const cases = [
      { user_image_url: '', image_url: 'https://cdn.example.com/fallback.jpg' },
      { user_image_url: 'https://cdn.example.com/user.jpg' },
      { user_image_url: 'https://project.supabase.co/storage/v1/object/public/product-images/user-2/product-1/image.jpg' },
      { user_image_url: 'https://project.supabase.co/storage/v1/object/public/product-images/user-1/product-2/image.jpg' },
    ]

    for (const overrides of cases) {
      const client = createClient({
        rpcData: [{
          outcome: 'deleted',
          deleted_product_id: productId,
          deleted_batch_count: 1,
          user_image_url: overrides.user_image_url || null,
        }],
      })
      const result = await deleteProductWithHistory({
        supabaseClient: client,
        userId,
        product: product(overrides),
      })

      expect(result.outcome).toBe('deleted')
      expect(client.remove).not.toHaveBeenCalled()
    }
  })

  it('fails safely on malformed deleted results without removing storage', async () => {
    const client = createClient({
      rpcData: [{
        outcome: 'deleted',
        deleted_product_id: 'other-product',
        deleted_batch_count: 1,
        user_image_url: ownedImageUrl,
      }],
    })

    const result = await deleteProductWithHistory({
      supabaseClient: client,
      userId,
      product: product(),
    })

    expect(result.outcome).toBe('error')
    expect(client.remove).not.toHaveBeenCalled()
  })

  it('fails safely on zero-row or inconsistent RPC results', async () => {
    const cases = [
      {
        outcome: 'deleted',
        deleted_product_id: productId,
        deleted_batch_count: -1,
        user_image_url: ownedImageUrl,
      },
      {
        outcome: 'blocked_active',
        deleted_product_id: productId,
        deleted_batch_count: 1,
        user_image_url: null,
      },
    ]

    for (const rpcData of cases) {
      const client = createClient({ rpcData: [rpcData] })
      const result = await deleteProductWithHistory({
        supabaseClient: client,
        userId,
        product: product(),
      })

      expect(result.outcome).toBe('error')
      expect(client.remove).not.toHaveBeenCalled()
    }
  })

  it('reports cleanup_pending without disguising a successful DB deletion', async () => {
    const client = createClient({ removeError: new Error('storage failed') })

    const result = await deleteProductWithHistory({
      supabaseClient: client,
      userId,
      product: product(),
    })

    expect(result.outcome).toBe('cleanup_pending')
    expect(result.imagePath).toBe('user-1/product-1/image.jpg')
    expect(result.cleanupError).toMatchObject({ message: 'storage failed' })
  })
})

describe('checkProductActiveStatus', () => {
  it('reports an active batch from an exact owner-scoped query', async () => {
    const limit = vi.fn().mockResolvedValue({ data: [{ id: 'batch-1' }], error: null })
    const eqStatus = vi.fn(() => ({ limit }))
    const eqProduct = vi.fn(() => ({ eq: eqStatus }))
    const eqOwner = vi.fn(() => ({ eq: eqProduct }))
    const select = vi.fn(() => ({ eq: eqOwner }))
    const client = { from: vi.fn(() => ({ select })) }

    const result = await checkProductActiveStatus({
      supabaseClient: client,
      userId,
      productId,
    })

    expect(result).toEqual({ status: 'active' })
    expect(client.from).toHaveBeenCalledWith('inventory_batches')
    expect(select).toHaveBeenCalledWith('id')
    expect(eqOwner).toHaveBeenCalledWith('user_id', userId)
    expect(eqProduct).toHaveBeenCalledWith('product_id', productId)
    expect(eqStatus).toHaveBeenCalledWith('status', 'active')
    expect(limit).toHaveBeenCalledWith(1)
  })

  it('fails closed when the guard query fails', async () => {
    const limit = vi.fn().mockResolvedValue({
      data: null,
      error: new Error('query failed'),
    })
    const eqStatus = vi.fn(() => ({ limit }))
    const eqProduct = vi.fn(() => ({ eq: eqStatus }))
    const eqOwner = vi.fn(() => ({ eq: eqProduct }))
    const select = vi.fn(() => ({ eq: eqOwner }))
    const client = { from: vi.fn(() => ({ select })) }

    await expect(checkProductActiveStatus({
      supabaseClient: client,
      userId,
      productId,
    })).resolves.toMatchObject({ status: 'error' })
  })
})

describe('retryProductImageCleanup', () => {
  it('retries the same verified object path without invoking Product deletion', async () => {
    const client = createClient({ removeError: null })

    const result = await retryProductImageCleanup({
      supabaseClient: client,
      userId,
      productId,
      imagePath: 'user-1/product-1/image.jpg',
    })

    expect(result).toEqual({ ok: true, error: null })
    expect(client.remove).toHaveBeenCalledWith(['user-1/product-1/image.jpg'])
    expect(client.rpc).not.toHaveBeenCalled()
  })

  it('rejects an unverified retry path without calling Storage', async () => {
    const client = createClient()
    const result = await retryProductImageCleanup({
      supabaseClient: client,
      userId,
      productId,
      imagePath: 'user-2/product-1/image.jpg',
    })

    expect(result.ok).toBe(false)
    expect(client.remove).not.toHaveBeenCalled()
  })
})
