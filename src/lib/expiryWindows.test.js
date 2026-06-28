import { describe, expect, it } from 'vitest'
import { getExpiryWindow } from './expiryWindows'

const today = new Date('2026-06-28T12:00:00')

describe('getExpiryWindow', () => {
  it.each([
    ['2026-06-27', 'expired', '已过期'],
    ['2026-06-28', 'within30', '1个月'],
    ['2026-07-28', 'within30', '1个月'],
    ['2026-07-29', 'within180', '6个月'],
    ['2026-12-25', 'within180', '6个月'],
    ['2026-12-26', 'within365', '1年'],
    ['2027-06-28', 'within365', '1年'],
    ['2027-06-29', 'within730', '2年'],
    ['2028-06-27', 'within730', '2年'],
    ['2028-06-28', 'over730', '> 2年'],
  ])(
    'maps %s to the %s expiry window',
    (expiryDate, expectedValue, expectedLabel) => {
      expect(getExpiryWindow(expiryDate, today)).toMatchObject({
        value: expectedValue,
        label: expectedLabel,
      })
    },
  )
})

