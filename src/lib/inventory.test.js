import { describe, expect, it } from 'vitest'
import {
  createConsumedStatusUpdate,
  decrementQuantity,
  prepareInventoryOperationUpdate,
  planInventoryAddition,
  consumeQuantity,
  normalizeQuantity,
} from './inventory'

describe('decrementQuantity', () => {
  it('decrements only the supplied batch quantity', () => {
    expect(decrementQuantity(12)).toBe(11)
  })

  it('never goes below zero', () => {
    expect(decrementQuantity(0)).toBe(0)
  })

  it('can be applied to only the selected inventory batch', () => {
    const batches = [
      { id: 'batch-1', quantity: 6 },
      { id: 'batch-2', quantity: 6 },
    ]
    const updated = batches.map((batch) =>
      batch.id === 'batch-1'
        ? { ...batch, quantity: decrementQuantity(batch.quantity) }
        : batch,
    )

    expect(updated).toEqual([
      { id: 'batch-1', quantity: 5 },
      { id: 'batch-2', quantity: 6 },
    ])
  })
})

describe('normalizeQuantity', () => {
  it('accepts zero and positive values', () => {
    expect(normalizeQuantity('6')).toBe(6)
    expect(normalizeQuantity(0)).toBe(0)
  })

  it('rejects negative values', () => {
    expect(() => normalizeQuantity(-1)).toThrow('库存数量不能小于 0')
  })
})

describe('planInventoryAddition', () => {
  const batches = [
    {
      id: 'batch-same-date',
      quantity: 4,
      status: 'active',
      expiry_date: '2026-12-01',
      product: { id: 'product-1' },
    },
    {
      id: 'batch-consumed',
      quantity: 8,
      status: 'consumed',
      expiry_date: '2026-12-01',
      product: { id: 'product-1' },
    },
  ]

  it('merges quantity into the active batch for the same product and expiry date', () => {
    expect(
      planInventoryAddition({
        batches,
        productId: 'product-1',
        expiryDate: '2026-12-01',
        quantity: '3',
        unit: '罐',
        storageLocation: '厨房柜子',
      }),
    ).toEqual({
      action: 'merge',
      batchId: 'batch-same-date',
      quantity: 7,
    })
  })

  it('creates a new batch for a different expiry date without changing the product', () => {
    expect(
      planInventoryAddition({
        batches,
        productId: 'product-1',
        expiryDate: '2027-01-01',
        quantity: 2,
        unit: '罐',
        storageLocation: '厨房柜子',
      }),
    ).toEqual({
      action: 'create',
      values: {
        product_id: 'product-1',
        quantity: 2,
        unit: '罐',
        production_date: null,
        shelf_life_value: null,
        shelf_life_unit: null,
        expiry_date: '2027-01-01',
        storage_location: '厨房柜子',
        note: null,
        status: 'active',
      },
    })
  })
})

describe('consumeQuantity', () => {
  it('uses the default consumption amount of one', () => {
    expect(consumeQuantity(6)).toBe(5)
  })

  it('allows a confirmed amount only up to the current quantity', () => {
    expect(consumeQuantity(6, 2)).toBe(4)
    expect(() => consumeQuantity(1, 2)).toThrow('消耗数量不能超过当前库存')
  })

  it('allows quantity to reach zero without changing status', () => {
    expect(consumeQuantity(1, 1)).toBe(0)
  })
})

describe('createConsumedStatusUpdate', () => {
  it('only creates a consumed status update after quantity reaches zero', () => {
    expect(createConsumedStatusUpdate(0)).toEqual({ status: 'consumed' })
    expect(() => createConsumedStatusUpdate(1)).toThrow(
      '只有库存为 0 时才能标记为已消耗',
    )
  })
})

describe('prepareInventoryOperationUpdate', () => {
  it('returns no write payload while an operation is cancelled', () => {
    expect(
      prepareInventoryOperationUpdate({ quantity: 6 }, null, 1),
    ).toBeNull()
  })

  it('returns the current batch id only after delete confirmation', () => {
    expect(
      prepareInventoryOperationUpdate({ id: 'batch-1', quantity: 6 }, 'delete-batch'),
    ).toEqual({ id: 'batch-1' })
  })

  it('returns a quantity-only payload after consumption confirmation', () => {
    expect(
      prepareInventoryOperationUpdate({ quantity: 6 }, 'consume', 2),
    ).toEqual({ quantity: 4 })
  })

  it('returns a status-only payload after zero-inventory confirmation', () => {
    expect(
      prepareInventoryOperationUpdate({ quantity: 0 }, 'mark-consumed'),
    ).toEqual({ status: 'consumed' })
  })
})
