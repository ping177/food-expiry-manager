import { getExpiryStatus } from './expiry'

export const EXPIRY_WINDOW_OPTIONS = [
  { value: 'all', label: '全部' },
  { value: 'expired', label: '已过期' },
  { value: 'within30', label: '1个月' },
  { value: 'within180', label: '6个月' },
  { value: 'within365', label: '1年' },
  { value: 'within730', label: '2年' },
  { value: 'over730', label: '> 2年' },
]

export const EXPIRY_WINDOWS = EXPIRY_WINDOW_OPTIONS.filter(
  (option) => option.value !== 'all',
)

function windowForDays(daysRemaining) {
  if (daysRemaining < 0) return EXPIRY_WINDOWS[0]
  if (daysRemaining <= 30) return EXPIRY_WINDOWS[1]
  if (daysRemaining <= 180) return EXPIRY_WINDOWS[2]
  if (daysRemaining <= 365) return EXPIRY_WINDOWS[3]
  if (daysRemaining <= 730) return EXPIRY_WINDOWS[4]
  return EXPIRY_WINDOWS[5]
}

export function getExpiryWindow(expiryDate, today = new Date()) {
  const { daysRemaining } = getExpiryStatus(expiryDate, today)
  const window = windowForDays(daysRemaining)

  return {
    ...window,
    daysRemaining,
  }
}

