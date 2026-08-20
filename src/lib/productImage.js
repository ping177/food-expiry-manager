export const PRODUCT_IMAGE_BUCKET = 'product-images'
export const MAX_SOURCE_IMAGE_BYTES = 10 * 1024 * 1024
export const MAX_OUTPUT_IMAGE_BYTES = 1.5 * 1024 * 1024

export function getProductImageUrl(product = {}) {
  return product.user_image_url || product.image_url || ''
}

export function validateProductImageFile(file) {
  if (!file) return '请选择图片。'
  if (!String(file.type || '').startsWith('image/')) {
    return '请选择 JPG、PNG 或 WebP 图片。'
  }
  if (file.size > MAX_SOURCE_IMAGE_BYTES) return '图片原文件不能超过 10 MB。'
  return ''
}

function randomUuid() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function createProductImagePath(userId, productId, uuid = randomUuid()) {
  if (!userId || !productId) throw new Error('缺少图片所属用户或商品。')
  return `${userId}/${productId}/${uuid}.jpg`
}

function canvasBlob(canvas, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
}

async function decodeImage(file) {
  if (globalThis.createImageBitmap) return globalThis.createImageBitmap(file)
  const url = URL.createObjectURL(file)
  try {
    const image = await new Promise((resolve, reject) => {
      const element = new Image()
      element.onload = () => resolve(element)
      element.onerror = reject
      element.src = url
    })
    return image
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function compressProductImage(file) {
  const validationError = validateProductImageFile(file)
  if (validationError) throw new Error(validationError)
  let image
  try {
    image = await decodeImage(file)
  } catch {
    throw new Error('无法读取这张图片。HEIC 等格式请先转换为 JPG、PNG 或 WebP。')
  }
  const longest = Math.max(image.width, image.height)
  const scale = longest > 1600 ? 1600 / longest : 1
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(image.width * scale))
  canvas.height = Math.max(1, Math.round(image.height * scale))
  canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height)
  let blob = await canvasBlob(canvas, 0.82)
  if (blob?.size > MAX_OUTPUT_IMAGE_BYTES) blob = await canvasBlob(canvas, 0.72)
  image.close?.()
  if (!blob || blob.size > MAX_OUTPUT_IMAGE_BYTES) {
    throw new Error('压缩后图片仍超过 1.5 MB，请选择更小的图片。')
  }
  return new File([blob], 'product-image.jpg', { type: 'image/jpeg' })
}

function invalidProductImagePath(error = new Error('无法安全确认用户图片路径。')) {
  return { status: 'invalid', path: '', error }
}

export function resolveOwnProductImagePath(
  url,
  userId,
  productId,
  expectedSupabaseUrl,
) {
  if (!url) return { status: 'none', path: '', error: null }
  if (!userId || !productId || !expectedSupabaseUrl) {
    return invalidProductImagePath()
  }

  try {
    const parsedUrl = new URL(url)
    const expectedOrigin = new URL(expectedSupabaseUrl).origin
    if (parsedUrl.origin !== expectedOrigin) return invalidProductImagePath()

    const path = decodeURIComponent(parsedUrl.pathname)
    const marker = `/storage/v1/object/public/${PRODUCT_IMAGE_BUCKET}/`
    if (!path.startsWith(marker)) return invalidProductImagePath()

    const objectPath = path.slice(marker.length)
    const segments = objectPath.split('/')
    if (
      segments.length !== 3 ||
      segments[0] !== userId ||
      segments[1] !== productId ||
      segments.some((segment) => !segment || segment === '.' || segment === '..')
    ) {
      return invalidProductImagePath()
    }

    return { status: 'valid', path: objectPath, error: null }
  } catch {
    return invalidProductImagePath()
  }
}

export function getOwnProductImagePath(
  url,
  userId,
  productId,
  expectedSupabaseUrl,
) {
  const result = resolveOwnProductImagePath(
    url,
    userId,
    productId,
    expectedSupabaseUrl,
  )
  return result.status === 'valid' ? result.path : ''
}

export async function removeProductImagePath(storage, path) {
  if (!storage || !path) {
    return { data: null, error: new Error('图片路径无效。') }
  }

  try {
    const response = await storage.from(PRODUCT_IMAGE_BUCKET).remove([path])
    if (!response || typeof response !== 'object') {
      return { data: null, error: new Error('图片清理结果无效。') }
    }
    return {
      data: response.data ?? null,
      error: response.error ?? null,
    }
  } catch (error) {
    return { data: null, error }
  }
}

export async function removeOwnProductImage({
  storage,
  url,
  userId,
  productId,
  expectedSupabaseUrl,
}) {
  const target = resolveOwnProductImagePath(
    url,
    userId,
    productId,
    expectedSupabaseUrl,
  )

  if (target.status === 'none') {
    return {
      cleanupStatus: 'not_needed',
      cleanupReason: null,
      cleanupPath: null,
      cleanupError: null,
      data: null,
    }
  }

  if (target.status !== 'valid') {
    return {
      cleanupStatus: 'pending',
      cleanupReason: 'invalid_path',
      cleanupPath: null,
      cleanupError: target.error,
      data: null,
    }
  }

  const { data, error } = await removeProductImagePath(storage, target.path)
  return {
    cleanupStatus: error ? 'pending' : 'completed',
    cleanupReason: error ? 'storage_error' : null,
    cleanupPath: target.path,
    cleanupError: error,
    data,
  }
}

export async function uploadAndReplaceProductImage({
  supabaseClient, userId, productId, file, previousUserImageUrl = '',
  compress = compressProductImage,
}) {
  const image = await compress(file)
  const path = createProductImagePath(userId, productId)
  const storage = supabaseClient.storage
  const { error: uploadError } = await storage
    .from(PRODUCT_IMAGE_BUCKET)
    .upload(path, image, { contentType: 'image/jpeg', upsert: false })
  if (uploadError) throw new Error('图片上传失败，请稍后重试。')

  const { data: publicUrlData } = storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(path)
  const userImageUrl = publicUrlData.publicUrl
  const { data: product, error: updateError } = await supabaseClient
    .from('products')
    .update({ user_image_url: userImageUrl })
    .eq('id', productId)
    .select('id, barcode, name, brand, size_value, size_unit, image_url, user_image_url, category, source')
    .single()
  if (updateError) {
    await removeProductImagePath(storage, path)
    throw new Error('图片资料保存失败，请稍后重试。')
  }

  const cleanup = await removeOwnProductImage({
    storage,
    url: previousUserImageUrl,
    userId,
    productId,
    expectedSupabaseUrl: supabaseClient.supabaseUrl,
  })
  return {
    product,
    cleanupError: cleanup.cleanupError,
    cleanupStatus: cleanup.cleanupStatus,
    cleanupReason: cleanup.cleanupReason,
    cleanupPath: cleanup.cleanupPath,
  }
}

export async function deleteProductUserImage({ supabaseClient, userId, product }) {
  const previousUserImageUrl = product?.user_image_url || ''
  const { data: updatedProduct, error: updateError } = await supabaseClient
    .from('products')
    .update({ user_image_url: null })
    .eq('id', product.id)
    .select('id, barcode, name, brand, size_value, size_unit, image_url, user_image_url, category, source')
    .single()
  if (updateError) throw new Error('图片资料保存失败，请稍后重试。')
  const cleanup = await removeOwnProductImage({
    storage: supabaseClient.storage,
    url: previousUserImageUrl,
    userId,
    productId: product.id,
    expectedSupabaseUrl: supabaseClient.supabaseUrl,
  })
  return {
    product: updatedProduct,
    cleanupError: cleanup.cleanupError,
    cleanupStatus: cleanup.cleanupStatus,
    cleanupReason: cleanup.cleanupReason,
    cleanupPath: cleanup.cleanupPath,
  }
}
