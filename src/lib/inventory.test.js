import { describe, expect, it } from 'vitest'
import { decrementQuantity, normalizeQuantity } from './inventory'

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
