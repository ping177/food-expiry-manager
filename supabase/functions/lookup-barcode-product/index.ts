import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

const GO_UPC_API = 'https://go-upc.com/api/v1/code'
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const messages = {
  not_found: '未找到商品信息，请手动填写',
  network_error: '商品信息查询失败，请检查网络后重试，或直接手动填写',
  http_error: '商品信息服务暂时不可用，请稍后重试，或直接手动填写',
  parse_error: '商品信息返回异常，请直接手动填写',
}

function normalizeBarcode(barcode: unknown) {
  return String(barcode ?? '').replace(/\s+/g, '').trim()
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
}

function errorResult(status: keyof typeof messages, barcode: string) {
  return {
    ok: false,
    status,
    barcode,
    message: messages[status],
  }
}

function firstValue(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item ?? '').trim()).find(Boolean) ?? ''
  }
  return String(value ?? '')
    .split(',')
    .map((item) => item.trim())
    .find(Boolean) ?? ''
}

function imageUrl(product: Record<string, unknown>) {
  return firstValue(
    product.imageUrl ??
      product.image_url ??
      product.image ??
      product.images ??
      product.image_front_url,
  )
}

function categoryValue(product: Record<string, unknown>) {
  const category = product.category
  if (typeof category === 'object' && category !== null) {
    return firstValue((category as Record<string, unknown>).name)
  }
  return firstValue(category ?? product.categories ?? product.category_name)
}

function sizeValue(product: Record<string, unknown>) {
  const match = firstValue(product.size ?? product.quantity).match(/^(\d+(?:\.\d+)?)\s*(g|kg|ml|l)$/i)
  if (!match) return { sizeValue: '', sizeUnit: '' }
  return { sizeValue: Number(match[1]), sizeUnit: match[2].toLowerCase() === 'l' ? 'L' : match[2].toLowerCase() }
}

function productResult(barcode: string, product: Record<string, unknown>) {
  const size = sizeValue(product)
  const normalizedProduct = {
    barcode,
    name: firstValue(product.name ?? product.product_name),
    brand: firstValue(product.brand ?? product.brands),
    ...size,
    imageUrl: imageUrl(product),
    category: categoryValue(product),
    source: 'go_upc',
  }

  return {
    ok: true,
    status: normalizedProduct.name ? 'found' : 'partial_found',
    product: normalizedProduct,
  }
}

serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  let barcode = ''
  try {
    const body = await request.json()
    barcode = normalizeBarcode(body?.barcode)
  } catch {
    console.warn('go_upc_lookup parse_error: invalid request body')
    return jsonResponse(errorResult('parse_error', barcode))
  }

  if (!barcode) {
    return jsonResponse(errorResult('not_found', barcode))
  }

  const apiKey = Deno.env.get('GO_UPC_API_KEY')
  if (!apiKey) {
    console.warn('go_upc_lookup http_error: missing GO_UPC_API_KEY')
    return jsonResponse(errorResult('http_error', barcode))
  }

  let response: Response
  try {
    response = await fetch(`${GO_UPC_API}/${encodeURIComponent(barcode)}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
    })
  } catch {
    console.warn('go_upc_lookup network_error: vendor request failed')
    return jsonResponse(errorResult('network_error', barcode))
  }

  if (response.status === 404) {
    return jsonResponse(errorResult('not_found', barcode))
  }

  if (!response.ok) {
    if (response.status === 401) {
      console.warn('go_upc_lookup http_error: unauthorized')
    } else if (response.status === 429) {
      console.warn('go_upc_lookup http_error: rate_limited')
    } else if (response.status >= 500) {
      console.warn('go_upc_lookup http_error: vendor_error')
    } else {
      console.warn(`go_upc_lookup http_error: status_${response.status}`)
    }
    return jsonResponse(errorResult('http_error', barcode))
  }

  let data: Record<string, unknown>
  try {
    data = await response.json()
  } catch {
    console.warn('go_upc_lookup parse_error: invalid vendor JSON')
    return jsonResponse(errorResult('parse_error', barcode))
  }

  const product = data?.product
  if (!product || typeof product !== 'object') {
    return jsonResponse(errorResult('not_found', barcode))
  }

  return jsonResponse(productResult(barcode, product as Record<string, unknown>))
})
