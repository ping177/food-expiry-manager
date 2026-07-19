import { describe, expect, it, vi } from 'vitest'
import {
  createProductImagePath,
  deleteProductUserImage,
  getOwnProductImagePath,
  getProductImageUrl,
  uploadAndReplaceProductImage,
  validateProductImageFile,
} from './productImage'

const userId = 'user-1'
const productId = 'product-1'

function storageMock({ uploadError = null, removeError = null } = {}) {
  const upload = vi.fn().mockResolvedValue({ error: uploadError })
  const remove = vi.fn().mockResolvedValue({ error: removeError })
  const bucket = { upload, remove, getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://project.supabase.co/storage/v1/object/public/product-images/user-1/product-1/new.jpg' } })) }
  return { from: vi.fn(() => bucket), upload, remove }
}

function clientMock({ updateError = null, removeError = null } = {}) {
  const storage = storageMock({ removeError })
  const single = vi.fn().mockResolvedValue({ data: updateError ? null : { id: productId, user_image_url: 'https://project.supabase.co/storage/v1/object/public/product-images/user-1/product-1/new.jpg' }, error: updateError })
  const select = vi.fn(() => ({ single }))
  const eq = vi.fn(() => ({ select }))
  const update = vi.fn(() => ({ eq }))
  return { storage, from: vi.fn(() => ({ update })), single }
}

describe('product image helpers', () => {
  it('prioritizes user image then API image then empty placeholder signal', () => {
    expect(getProductImageUrl({ user_image_url: 'user.jpg', image_url: 'api.jpg' })).toBe('user.jpg')
    expect(getProductImageUrl({ image_url: 'api.jpg' })).toBe('api.jpg')
    expect(getProductImageUrl({})).toBe('')
  })

  it('validates type and source size', () => {
    expect(validateProductImageFile({ type: 'text/plain', size: 1 })).toContain('JPG')
    expect(validateProductImageFile({ type: 'image/jpeg', size: 11 * 1024 * 1024 })).toContain('10 MB')
    expect(validateProductImageFile({ type: 'image/jpeg', size: 1 })).toBe('')
  })

  it('places every object under the current user id', () => {
    expect(createProductImagePath(userId, productId, 'uuid')).toBe('user-1/product-1/uuid.jpg')
    expect(getOwnProductImagePath('https://project.supabase.co/storage/v1/object/public/product-images/user-1/product-1/old.jpg', userId)).toBe('user-1/product-1/old.jpg')
    expect(getOwnProductImagePath('https://project.supabase.co/storage/v1/object/public/product-images/user-2/product-1/old.jpg', userId)).toBe('')
  })

  it('cleans a newly uploaded object when database pointer update fails', async () => {
    const client = clientMock({ updateError: { message: 'db failed' } })
    await expect(uploadAndReplaceProductImage({ supabaseClient: client, userId, productId, file: {}, compress: vi.fn().mockResolvedValue({}) })).rejects.toThrow('图片资料保存失败')
    expect(client.storage.remove).toHaveBeenCalledTimes(1)
  })

  it('replaces first and then deletes the old owned object', async () => {
    const client = clientMock()
    await uploadAndReplaceProductImage({
      supabaseClient: client, userId, productId, file: {}, compress: vi.fn().mockResolvedValue({}),
      previousUserImageUrl: 'https://project.supabase.co/storage/v1/object/public/product-images/user-1/product-1/old.jpg',
    })
    expect(client.storage.upload).toHaveBeenCalledWith(expect.stringMatching(/^user-1\/product-1\/.+\.jpg$/), {}, expect.objectContaining({ upsert: false }))
    expect(client.storage.remove).toHaveBeenCalledWith(['user-1/product-1/old.jpg'])
  })

  it('clears database pointer before reporting a storage cleanup failure', async () => {
    const client = clientMock({ removeError: { message: 'cleanup failed' } })
    const result = await deleteProductUserImage({
      supabaseClient: client, userId,
      product: { id: productId, user_image_url: 'https://project.supabase.co/storage/v1/object/public/product-images/user-1/product-1/old.jpg' },
    })
    expect(result.product.user_image_url).toBeTruthy()
    expect(result.cleanupError).toEqual({ message: 'cleanup failed' })
    expect(client.storage.remove).toHaveBeenCalledWith(['user-1/product-1/old.jpg'])
  })
})
