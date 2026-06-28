import { describe, expect, it } from 'vitest'
import { filterInventoryBatches } from './inventoryFilters'

const batches = [
  {
    id: 'expired-cat-can',
    expiry_date: '2026-06-20',
    product: {
      name: 'MjAMjAM 鸡肉猫罐头',
      brand: 'MjAMjAM',
      category: '猫罐头',
    },
  },
  {
    id: 'within30-cat-can',
    expiry_date: '2026-07-02',
    product: {
      name: 'MjAMjAM 火鸡猫罐头',
      brand: 'MjAMjAM',
      category: '猫罐头',
    },
  },
  {
    id: 'within180-cat-food',
    expiry_date: '2026-08-15',
    product: {
      name: '室内猫粮',
      brand: 'Happy Cat',
      category: '猫粮',
    },
  },
  {
    id: 'within365-drink',
    expiry_date: '2027-03-01',
    product: {
      name: '气泡水',
      brand: 'Water Brand',
      category: '饮品',
    },
  },
  {
    id: 'within730-supply',
    expiry_date: '2028-01-01',
    product: {
      name: '清洁湿巾',
      brand: 'Clean Brand',
      category: '清洁用品',
    },
  },
  {
    id: 'over730-supply',
    expiry_date: '2028-08-01',
    product: {
      name: '长期保健品',
      brand: 'Long Brand',
      category: '药品 / 保健品',
    },
  },
]

const today = new Date('2026-06-28T12:00:00')

describe('filterInventoryBatches', () => {
  it('keeps all active batches in the original expiry order by default', () => {
    expect(
      filterInventoryBatches(batches, {
        expiryWindow: 'all',
        category: 'all',
        search: '',
        today,
      }).map((batch) => batch.id),
    ).toEqual([
      'expired-cat-can',
      'within30-cat-can',
      'within180-cat-food',
      'within365-drink',
      'within730-supply',
      'over730-supply',
    ])
  })

  it('filters batches by product category', () => {
    expect(
      filterInventoryBatches(batches, {
        expiryWindow: 'all',
        category: '猫罐头',
        search: '',
        today,
      }).map((batch) => batch.id),
    ).toEqual(['expired-cat-can', 'within30-cat-can'])
  })

  it.each([
    ['expired', ['expired-cat-can']],
    ['within30', ['within30-cat-can']],
    ['within180', ['within180-cat-food']],
    ['within365', ['within365-drink']],
    ['within730', ['within730-supply']],
    ['over730', ['over730-supply']],
  ])(
    'filters batches by the %s expiry window using canonical remaining days',
    (expiryWindow, expectedIds) => {
      expect(
        filterInventoryBatches(batches, {
          expiryWindow,
          category: 'all',
          search: '',
          today,
        }).map((batch) => batch.id),
      ).toEqual(expectedIds)
    },
  )

  it('combines category and expiry window filters', () => {
    expect(
      filterInventoryBatches(batches, {
        expiryWindow: 'within30',
        category: '猫罐头',
        search: '',
        today,
      }).map((batch) => batch.id),
    ).toEqual(['within30-cat-can'])
  })

  it('combines search with category and expiry window filters', () => {
    expect(
      filterInventoryBatches(batches, {
        expiryWindow: 'within30',
        category: '猫罐头',
        search: 'mjamjam',
        today,
      }).map((batch) => batch.id),
    ).toEqual(['within30-cat-can'])
  })

  it('searches product name and brand', () => {
    expect(
      filterInventoryBatches(batches, {
        expiryWindow: 'within180',
        category: 'all',
        search: 'happy',
        today,
      }).map((batch) => batch.id),
    ).toEqual(['within180-cat-food'])
  })

  it('does not show consumed batches through filtering', () => {
    expect(
      filterInventoryBatches(
        [
          ...batches,
          {
            id: 'consumed-cat-can',
            status: 'consumed',
            expiry_date: '2026-07-01',
            product: {
              name: '已消耗猫罐头',
              brand: 'MjAMjAM',
              category: '猫罐头',
            },
          },
        ],
        {
          expiryWindow: 'within30',
          category: '猫罐头',
          search: 'mjamjam',
          today,
        },
      ).map((batch) => batch.id),
    ).toEqual(['within30-cat-can'])
  })
})
