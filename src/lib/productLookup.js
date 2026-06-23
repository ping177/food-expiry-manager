const OPEN_FOOD_FACTS_API = 'https://world.openfoodfacts.org/api/v2/product'
const OPEN_PET_FOOD_FACTS_API =
  'https://world.openpetfoodfacts.org/api/v2/product'
const PRODUCT_FIELDS = [
  'code',
  'product_name',
  'product_name_zh',
  'brands',
  'image_front_url',
  'image_url',
  'categories',
  'categories_tags',
  'product_type',
].join(',')

const messages = {
  not_found: '未找到商品信息，请手动填写',
  network_error: '商品信息查询失败，请检查网络后重试，或直接手动填写',
  http_error: '商品信息服务暂时不可用，请稍后重试，或直接手动填写',
  parse_error: '商品信息返回异常，请直接手动填写',
}

export function normalizeBarcode(barcode) {
  return String(barcode ?? '').replace(/\s+/g, '').trim()
}

function firstValue(value) {
  if (Array.isArray(value)) {
    return value.find(Boolean) ?? ''
  }
  return String(value ?? '')
    .split(',')
    .map((item) => item.trim())
    .find(Boolean) ?? ''
}

function categoryValue(product) {
  const category = firstValue(product.categories)
  if (category) return category

  return firstValue(product.categories_tags).replace(/^[a-z]{2}:/, '')
}

function errorResult(status, barcode) {
  return {
    ok: false,
    status,
    barcode,
    message: messages[status],
  }
}

function productResult(barcode, product, source) {
  const normalizedProduct = {
    barcode,
    name: product.product_name_zh || product.product_name || '',
    brand: firstValue(product.brands),
    imageUrl: product.image_front_url || product.image_url || '',
    category: categoryValue(product),
    source,
  }

  return {
    ok: true,
    status: normalizedProduct.name ? 'found' : 'partial_found',
    product: normalizedProduct,
  }
}

export function storedProductResult(barcode, product) {
  const normalizedProduct = {
    barcode,
    name: product.name || '',
    brand: product.brand || '',
    imageUrl: product.image_url || '',
    category: product.category || '',
    source: product.source || 'manual',
  }

  return {
    ok: true,
    status: normalizedProduct.name ? 'found' : 'partial_found',
    origin: 'local',
    product: normalizedProduct,
  }
}

async function requestProduct(url, barcode, source, fetchImpl) {
  let response
  try {
    response = await fetchImpl(url)
  } catch {
    return errorResult('network_error', barcode)
  }

  if (!response?.ok) {
    return errorResult('http_error', barcode)
  }

  let data
  try {
    data = await response.json()
  } catch {
    return errorResult('parse_error', barcode)
  }

  if (Number(data?.status) !== 1 || !data.product) {
    return errorResult('not_found', barcode)
  }

  return productResult(barcode, data.product, source)
}

export async function lookupProductByBarcode(barcode, fetchImpl = fetch) {
  const normalizedBarcode = normalizeBarcode(barcode)

  if (!normalizedBarcode) {
    return errorResult('not_found', normalizedBarcode)
  }

  const encodedBarcode = encodeURIComponent(normalizedBarcode)
  const endpoints = [
    {
      source: 'open_food_facts_universal',
      url:
        `${OPEN_FOOD_FACTS_API}/${encodedBarcode}.json` +
        `?product_type=all&fields=${PRODUCT_FIELDS}`,
    },
    {
      source: 'open_pet_food_facts',
      url:
        `${OPEN_PET_FOOD_FACTS_API}/${encodedBarcode}.json` +
        `?fields=${PRODUCT_FIELDS}`,
    },
    {
      source: 'open_food_facts',
      url:
        `${OPEN_FOOD_FACTS_API}/${encodedBarcode}.json` +
        `?fields=${PRODUCT_FIELDS}`,
    },
  ]
  const attempts = []
  let partialResult = null

  for (const endpoint of endpoints) {
    const result = await requestProduct(
      endpoint.url,
      normalizedBarcode,
      endpoint.source,
      fetchImpl,
    )
    attempts.push(result)

    if (result.status === 'found') {
      return result
    }
    if (result.status === 'partial_found' && !partialResult) {
      partialResult = result
    }
  }

  if (partialResult) return partialResult
  if (attempts.some((attempt) => attempt.status === 'not_found')) {
    return errorResult('not_found', normalizedBarcode)
  }
  if (attempts.every((attempt) => attempt.status === 'network_error')) {
    return errorResult('network_error', normalizedBarcode)
  }
  if (attempts.some((attempt) => attempt.status === 'http_error')) {
    return errorResult('http_error', normalizedBarcode)
  }
  return errorResult('parse_error', normalizedBarcode)
}

export async function lookupProductLocalFirst(
  barcode,
  lookupLocalProduct,
  lookupExternalProduct = lookupProductByBarcode,
) {
  const normalizedBarcode = normalizeBarcode(barcode)
  if (!normalizedBarcode) {
    return errorResult('not_found', normalizedBarcode)
  }

  const localProduct = await lookupLocalProduct(normalizedBarcode)
  if (localProduct) {
    return storedProductResult(normalizedBarcode, localProduct)
  }

  return lookupExternalProduct(normalizedBarcode)
}

export function lookupBarcodeInput(barcode, lookup = lookupProductByBarcode) {
  return lookup(normalizeBarcode(barcode))
}
