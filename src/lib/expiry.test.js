import { describe, expect, it } from 'vitest'
import {
  calculateExpiryDate,
  formatDateInput,
  getExpiryStatus,
  normalizeDateInput,
} from './expiry'

describe('date input helpers', () => {
  it('formats eight continuous digits as an ISO date', () => {
    expect(formatDateInput('20260630')).toBe('2026-06-30')
  })

  it('formats progressively without requiring cursor movement', () => {
    expect(formatDateInput('2026')).toBe('2026')
    expect(formatDateInput('202606')).toBe('2026-06')
    expect(formatDateInput('2026063')).toBe('2026-06-3')
  })

  it('accepts a pasted ISO date', () => {
    expect(normalizeDateInput('2026-06-30')).toBe('2026-06-30')
  })

  it('rejects incomplete and impossible dates', () => {
    expect(() => normalizeDateInput('202606')).toThrow('请输入 8 位日期')
    expect(() => normalizeDateInput('20260230')).toThrow('请输入有效日期')
  })
})

describe('calculateExpiryDate', () => {
  it('calculates the acceptance example with months', () => {
    expect(calculateExpiryDate('2026-06-01', 24, 'month')).toBe('2028-06-01')
  })

  it('clamps a month-end date to the target month', () => {
    expect(calculateExpiryDate('2026-01-31', 1, 'month')).toBe('2026-02-28')
  })

  it('handles leap day when adding a year', () => {
    expect(calculateExpiryDate('2024-02-29', 1, 'year')).toBe('2025-02-28')
  })

  it('adds days without timezone drift', () => {
    expect(calculateExpiryDate('2026-12-31', 1, 'day')).toBe('2027-01-01')
  })
})

describe('getExpiryStatus', () => {
  const today = new Date(2026, 5, 23)

  it.each([
    ['2026-06-22', 'expired'],
    ['2026-06-23', 'within7'],
    ['2026-06-30', 'within7'],
    ['2026-07-01', 'within30'],
    ['2026-07-23', 'within30'],
    ['2026-07-24', 'normal'],
  ])('classifies %s as %s', (date, expected) => {
    expect(getExpiryStatus(date, today).key).toBe(expected)
  })
})
