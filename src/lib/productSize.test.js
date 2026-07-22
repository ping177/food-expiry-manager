import { describe, expect, it } from 'vitest'
import {
  formatProductSize,
  normalizeProductSize,
  parseExternalProductSize,
} from './productSize'

describe('normalizeProductSize', () => {
  it('trims and converts a numeric size with its selected unit', () => {
    expect(normalizeProductSize({ sizeValue: ' 1.5 ', sizeUnit: ' kg ' })).toEqual({
      size_value: 1.5,
      size_unit: 'kg',
    })
  })

  it('stores an empty size as two null fields', () => {
    expect(normalizeProductSize({ sizeValue: '', sizeUnit: '' })).toEqual({
      size_value: null,
      size_unit: null,
    })
  })

  it('keeps an empty optional size null when the UI defaults its unit to g', () => {
    expect(normalizeProductSize({ sizeValue: '', sizeUnit: 'g' })).toEqual({
      size_value: null,
      size_unit: null,
    })
  })

  it('keeps different units distinct for product identity', () => {
    expect(normalizeProductSize({ sizeValue: '1', sizeUnit: 'g' })).not.toEqual(
      normalizeProductSize({ sizeValue: '1', sizeUnit: 'kg' }),
    )
  })

  it('requires a unit when a numeric size is entered', () => {
    expect(() => normalizeProductSize({ sizeValue: '170', sizeUnit: '' })).toThrow(
      '请选择容量单位',
    )
  })
})

describe('product size display and API parsing', () => {
  it('combines a stored numeric value and unit without spaces', () => {
    expect(formatProductSize({ size_value: 170, size_unit: 'g' })).toBe('170g')
  })

  it('parses an explicit external size but never reads a product name', () => {
    expect(parseExternalProductSize('1.5 kg')).toEqual({
      sizeValue: 1.5,
      sizeUnit: 'kg',
    })
  })
})
