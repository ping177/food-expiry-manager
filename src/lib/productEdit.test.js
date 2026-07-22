import { describe, expect, it } from 'vitest'
import {
  applyProductUpdateToBatches,
  createProductEditForm,
  normalizeProductEditForm,
} from './productEdit'

describe('createProductEditForm', () => {
  it('creates editable fields without exposing barcode as an editable value', () => {
    expect(
      createProductEditForm({
        barcode: '1234567890123',
        name: '旧商品名',
        brand: '旧品牌',
        size_value: 170,
        size_unit: 'g',
        category: '旧分类',
        image_url: 'https://example.com/old.jpg',
      }),
    ).toEqual({
      name: '旧商品名',
      brand: '旧品牌',
      sizeValue: 170,
      sizeUnit: 'g',
      category: '旧分类',
      imageUrl: 'https://example.com/old.jpg',
    })
  })

  it('defaults the size unit to g for products without a saved size', () => {
    expect(createProductEditForm({ name: '未标规格商品' })).toMatchObject({
      sizeValue: '',
      sizeUnit: 'g',
    })
  })
})

describe('normalizeProductEditForm', () => {
  it('normalizes the product update payload for products table updates', () => {
    expect(
      normalizeProductEditForm({
        name: '  新商品名  ',
        brand: '  新品牌  ',
        sizeValue: '  170 ',
        sizeUnit: ' g ',
        category: '  猫罐头  ',
        imageUrl: '  https://example.com/new.jpg  ',
        barcode: 'should-not-be-saved',
      }),
    ).toEqual({
      name: '新商品名',
      brand: '新品牌',
      size_value: 170,
      size_unit: 'g',
      category: '猫罐头',
      image_url: 'https://example.com/new.jpg',
    })
  })

  it('stores empty optional fields as null', () => {
    expect(
      normalizeProductEditForm({
        name: '新商品名',
        brand: ' ',
        sizeValue: '',
        sizeUnit: '',
        category: '',
        imageUrl: '',
      }),
    ).toEqual({
      name: '新商品名',
      brand: null,
      size_value: null,
      size_unit: null,
      category: null,
      image_url: null,
    })
  })

  it('preserves a changed size unit in the product update payload', () => {
    expect(
      normalizeProductEditForm({
        name: '新商品名',
        brand: '',
        sizeValue: '1.5',
        sizeUnit: 'kg',
        category: '',
        imageUrl: '',
      }),
    ).toMatchObject({
      size_value: 1.5,
      size_unit: 'kg',
    })
  })

  it('does not include user_image_url in external-link form updates', () => {
    expect(normalizeProductEditForm({ name: '商品', brand: '', category: '', imageUrl: '' })).not.toHaveProperty('user_image_url')
  })

  it('rejects an empty product name before saving', () => {
    expect(() =>
      normalizeProductEditForm({
        name: ' ',
        brand: '品牌',
        category: '分类',
        imageUrl: 'https://example.com/product.jpg',
      }),
    ).toThrow('商品名不能为空')
  })
})

describe('applyProductUpdateToBatches', () => {
  it('updates every visible batch that shares the same product', () => {
    const batches = [
      {
        id: 'batch-1',
        product: { id: 'product-1', name: '旧商品名', brand: '旧品牌' },
      },
      {
        id: 'batch-2',
        product: { id: 'product-1', name: '旧商品名', brand: '旧品牌' },
      },
      {
        id: 'batch-3',
        product: { id: 'product-2', name: '其他商品', brand: '其他品牌' },
      },
    ]

    expect(
      applyProductUpdateToBatches(batches, {
        id: 'product-1',
        name: '新商品名',
        brand: '新品牌',
        category: '猫罐头',
        image_url: 'https://example.com/new.jpg',
      }),
    ).toEqual([
      {
        id: 'batch-1',
        product: {
          id: 'product-1',
          name: '新商品名',
          brand: '新品牌',
          category: '猫罐头',
          image_url: 'https://example.com/new.jpg',
        },
      },
      {
        id: 'batch-2',
        product: {
          id: 'product-1',
          name: '新商品名',
          brand: '新品牌',
          category: '猫罐头',
          image_url: 'https://example.com/new.jpg',
        },
      },
      {
        id: 'batch-3',
        product: { id: 'product-2', name: '其他商品', brand: '其他品牌' },
      },
    ])
  })

  it('leaves the original batch display unchanged until a successful update is applied', () => {
    const batches = [
      {
        id: 'batch-1',
        product: { id: 'product-1', name: '旧商品名', brand: '旧品牌' },
      },
    ]

    expect(batches[0].product.name).toBe('旧商品名')
    expect(batches[0].product.brand).toBe('旧品牌')
  })
})
