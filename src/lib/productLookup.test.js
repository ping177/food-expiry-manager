import { describe, expect, it, vi } from 'vitest'
import {
  lookupBarcodeInput,
  lookupProductLocalFirst,
  lookupProductByBarcode,
} from './productLookup'

function jsonResponse(data, options = {}) {
  return {
    ok: options.ok ?? true,
    status: options.status ?? 200,
    json: options.json ?? (async () => data),
  }
}

describe('lookupProductByBarcode', () => {
  it('finds a product through the Open Food Facts universal endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        status: 1,
        product: {
          product_name_zh: '金枪鱼猫罐头',
          brands: '示例品牌, 次要品牌',
          image_front_url: 'https://example.com/can.jpg',
          categories: '宠物食品, 猫粮',
        },
      }),
    )

    await expect(
      lookupProductByBarcode(' 1234567890123 ', fetchMock),
    ).resolves.toEqual({
      ok: true,
      status: 'found',
      product: {
        barcode: '1234567890123',
        name: '金枪鱼猫罐头',
        brand: '示例品牌',
        imageUrl: 'https://example.com/can.jpg',
        category: '宠物食品',
        source: 'open_food_facts_universal',
      },
    })
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(fetchMock.mock.calls[0][0]).toContain('product_type=all')
  })

  it('falls back to Open Pet Food Facts after universal lookup misses', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ status: 0 }))
      .mockResolvedValueOnce(
        jsonResponse({
          status: 1,
          product: {
            product_name: 'Chicken Cat Food',
            brands: 'Pet Brand',
            categories_tags: ['en:cat-food'],
          },
        }),
      )

    const result = await lookupProductByBarcode('1234567890123', fetchMock)

    expect(result).toMatchObject({
      ok: true,
      status: 'found',
      product: {
        name: 'Chicken Cat Food',
        brand: 'Pet Brand',
        category: 'cat-food',
        source: 'open_pet_food_facts',
      },
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[1][0]).toContain(
      'world.openpetfoodfacts.org',
    )
  })

  it('returns not_found only after all endpoints miss', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ status: 0 }))
      .mockResolvedValueOnce(jsonResponse({ status: 0 }))
      .mockResolvedValueOnce(jsonResponse({ status: 0 }))

    const result = await lookupProductByBarcode('1234567890123', fetchMock)

    expect(result).toEqual({
      ok: false,
      status: 'not_found',
      barcode: '1234567890123',
      message: '未找到商品信息，请手动填写',
    })
    expect(result.message).not.toContain('网络')
  })

  it('continues after universal HTTP 500 and finds the pet food product', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(null, { ok: false, status: 500 }))
      .mockResolvedValueOnce(
        jsonResponse({
          status: 1,
          product: { product_name: 'Recovered Pet Food' },
        }),
      )

    await expect(
      lookupProductByBarcode('1234567890123', fetchMock),
    ).resolves.toMatchObject({
      ok: true,
      status: 'found',
      product: {
        name: 'Recovered Pet Food',
        source: 'open_pet_food_facts',
      },
    })
  })

  it('continues after universal parse error and finds the pet food product', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(null, {
          json: async () => {
            throw new SyntaxError('Invalid JSON')
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          status: 1,
          product: { product_name: 'Parsed Pet Food' },
        }),
      )

    await expect(
      lookupProductByBarcode('1234567890123', fetchMock),
    ).resolves.toMatchObject({
      ok: true,
      status: 'found',
      product: {
        name: 'Parsed Pet Food',
        source: 'open_pet_food_facts',
      },
    })
  })

  it('prefers not_found when an HTTP error is followed by explicit misses', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(null, { ok: false, status: 500 }))
      .mockResolvedValueOnce(jsonResponse({ status: 0 }))
      .mockResolvedValueOnce(jsonResponse({ status: 0 }))

    await expect(
      lookupProductByBarcode('1234567890123', fetchMock),
    ).resolves.toMatchObject({
      ok: false,
      status: 'not_found',
      barcode: '1234567890123',
    })
  })

  it('returns network_error when every fetch rejects', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('offline'))

    await expect(
      lookupProductByBarcode('1234567890123', fetchMock),
    ).resolves.toMatchObject({
      ok: false,
      status: 'network_error',
      barcode: '1234567890123',
    })
  })

  it('returns http_error when every endpoint returns HTTP 500', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse(null, { ok: false, status: 500 }))

    await expect(
      lookupProductByBarcode('1234567890123', fetchMock),
    ).resolves.toMatchObject({
      ok: false,
      status: 'http_error',
      barcode: '1234567890123',
    })
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('returns parse_error when every response contains invalid JSON', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(null, {
        json: async () => {
          throw new SyntaxError('Invalid JSON')
        },
      }),
    )

    await expect(
      lookupProductByBarcode('1234567890123', fetchMock),
    ).resolves.toMatchObject({
      ok: false,
      status: 'parse_error',
      barcode: '1234567890123',
    })
  })

  it('returns partial_found with editable fields when the product name is missing', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          status: 1,
          product: {
            brands: 'Partial Brand',
            image_url: 'https://example.com/partial.jpg',
            categories: '猫罐头',
          },
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ status: 0 }))
      .mockResolvedValueOnce(jsonResponse({ status: 0 }))

    await expect(
      lookupProductByBarcode('1234567890123', fetchMock),
    ).resolves.toEqual({
      ok: true,
      status: 'partial_found',
      product: {
        barcode: '1234567890123',
        name: '',
        brand: 'Partial Brand',
        imageUrl: 'https://example.com/partial.jpg',
        category: '猫罐头',
        source: 'open_food_facts_universal',
      },
    })
  })
})

describe('lookupBarcodeInput', () => {
  it('sends manual barcode input through the shared lookup flow', async () => {
    const lookup = vi.fn().mockResolvedValue({ ok: false, status: 'not_found' })

    await lookupBarcodeInput(' 690 1234 567890 ', lookup)

    expect(lookup).toHaveBeenCalledOnce()
    expect(lookup).toHaveBeenCalledWith('6901234567890')
  })
})

describe('lookupProductLocalFirst', () => {
  it('returns a stored product without calling the external lookup', async () => {
    const lookupLocal = vi.fn().mockResolvedValue({
      barcode: '1234567890123',
      name: '本地猫罐头',
      brand: '本地品牌',
      image_url: 'https://example.com/local.jpg',
      category: '猫罐头',
      source: 'manual',
    })
    const lookupExternal = vi.fn()

    await expect(
      lookupProductLocalFirst(
        ' 1234567890123 ',
        lookupLocal,
        lookupExternal,
      ),
    ).resolves.toEqual({
      ok: true,
      status: 'found',
      origin: 'local',
      product: {
        barcode: '1234567890123',
        name: '本地猫罐头',
        brand: '本地品牌',
        imageUrl: 'https://example.com/local.jpg',
        category: '猫罐头',
        source: 'manual',
      },
    })
    expect(lookupLocal).toHaveBeenCalledWith('1234567890123')
    expect(lookupExternal).not.toHaveBeenCalled()
  })

  it('calls the external lookup only after the local product is absent', async () => {
    const lookupLocal = vi.fn().mockResolvedValue(null)
    const externalResult = {
      ok: false,
      status: 'not_found',
      barcode: '1234567890123',
    }
    const lookupExternal = vi.fn().mockResolvedValue(externalResult)

    await expect(
      lookupProductLocalFirst(
        '1234567890123',
        lookupLocal,
        lookupExternal,
      ),
    ).resolves.toBe(externalResult)
    expect(lookupLocal).toHaveBeenCalledOnce()
    expect(lookupExternal).toHaveBeenCalledWith('1234567890123')
  })

  it('returns a partial local product without calling the external lookup', async () => {
    const lookupLocal = vi.fn().mockResolvedValue({
      name: '',
      brand: '已保存品牌',
      image_url: null,
      category: '猫罐头',
      source: 'manual',
    })
    const lookupExternal = vi.fn()

    await expect(
      lookupProductLocalFirst(
        '1234567890123',
        lookupLocal,
        lookupExternal,
      ),
    ).resolves.toMatchObject({
      ok: true,
      status: 'partial_found',
      origin: 'local',
      product: {
        barcode: '1234567890123',
        name: '',
        brand: '已保存品牌',
        category: '猫罐头',
      },
    })
    expect(lookupExternal).not.toHaveBeenCalled()
  })
})
