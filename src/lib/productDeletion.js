import {
  removeOwnProductImage,
  removeProductImagePath,
} from './productImage'

const PRODUCT_DELETE_OUTCOMES = new Set([
  'deleted',
  'blocked_active',
  'not_found',
])

export async function checkProductActiveStatus({
  supabaseClient,
  userId,
  productId,
}) {
  if (!supabaseClient || !userId || !productId) {
    return { status: 'error', error: new Error('库存检查参数无效。') }
  }

  try {
    const { data, error } = await supabaseClient
      .from('inventory_batches')
      .select('id')
      .eq('user_id', userId)
      .eq('product_id', productId)
      .eq('status', 'active')
      .limit(1)

    if (error) return { status: 'error', error }
    return { status: data?.length ? 'active' : 'clear' }
  } catch (error) {
    return { status: 'error', error }
  }
}

function isObject(value) {
  return value !== null && typeof value === 'object'
}

function isValidBatchCount(value) {
  return Number.isInteger(value) && value >= 0
}

function parseProductDeletionRow(data, productId) {
  if (!Array.isArray(data) || data.length !== 1 || !isObject(data[0])) {
    throw new Error('商品删除结果无效。')
  }

  const row = data[0]
  if (!PRODUCT_DELETE_OUTCOMES.has(row.outcome)) {
    throw new Error('商品删除结果无效。')
  }
  if (!isValidBatchCount(row.deleted_batch_count)) {
    throw new Error('商品删除结果无效。')
  }
  if (row.user_image_url !== null && typeof row.user_image_url !== 'string') {
    throw new Error('商品删除结果无效。')
  }

  if (row.outcome === 'deleted' && row.deleted_product_id !== productId) {
    throw new Error('商品删除结果无效。')
  }
  if (
    row.outcome === 'blocked_active' &&
    (row.deleted_product_id !== productId || row.deleted_batch_count !== 0)
  ) {
    throw new Error('商品删除结果无效。')
  }
  if (
    row.outcome === 'not_found' &&
    (row.deleted_product_id !== null || row.deleted_batch_count !== 0)
  ) {
    throw new Error('商品删除结果无效。')
  }

  return row
}

function isVerifiedProductImagePath(path, userId, productId) {
  if (!path || !userId || !productId) return false
  const segments = String(path).split('/')
  return (
    segments.length === 3 &&
    segments[0] === userId &&
    segments[1] === productId &&
    segments.every((segment) => segment && segment !== '.' && segment !== '..')
  )
}

export async function deleteProductWithHistory({
  supabaseClient,
  userId,
  product,
}) {
  if (!supabaseClient || !userId || !product?.id) {
    return { outcome: 'error', error: new Error('商品删除参数无效。') }
  }

  let rpcResponse
  try {
    rpcResponse = await supabaseClient.rpc('delete_product_with_history', {
      p_product_id: product.id,
    })
  } catch (error) {
    return { outcome: 'error', error }
  }

  if (rpcResponse?.error) {
    return { outcome: 'error', error: rpcResponse.error }
  }

  let row
  try {
    row = parseProductDeletionRow(rpcResponse?.data, product.id)
  } catch (error) {
    return { outcome: 'error', error }
  }

  if (row.outcome !== 'deleted') {
    return { ...row, outcome: row.outcome }
  }

  const cleanup = await removeOwnProductImage({
    storage: supabaseClient.storage,
    url: row.user_image_url,
    userId,
    productId: product.id,
    expectedSupabaseUrl: supabaseClient.supabaseUrl,
  })

  if (cleanup.cleanupStatus === 'not_needed') {
    return { ...row, outcome: 'deleted', cleanupStatus: 'not_needed' }
  }

  if (cleanup.cleanupStatus === 'pending') {
    return {
      ...row,
      outcome: 'cleanup_pending',
      cleanupStatus: 'pending',
      cleanupReason: cleanup.cleanupReason,
      imagePath: cleanup.cleanupPath,
      cleanupError: cleanup.cleanupError,
    }
  }

  return {
    ...row,
    outcome: 'deleted',
    cleanupStatus: 'completed',
    imagePath: cleanup.cleanupPath,
  }
}

export async function retryProductImageCleanup({
  supabaseClient,
  userId,
  productId,
  imagePath,
}) {
  if (!isVerifiedProductImagePath(imagePath, userId, productId)) {
    return { ok: false, error: new Error('图片路径无效。') }
  }

  const { data, error } = await removeProductImagePath(
    supabaseClient.storage,
    imagePath,
  )
  return { ok: !error, error, data }
}
