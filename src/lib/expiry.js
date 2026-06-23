const DAY_IN_MS = 24 * 60 * 60 * 1000

function parseDateParts(dateString) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString)
  if (!match) {
    throw new Error('日期格式必须为 YYYY-MM-DD')
  }

  const parts = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  }

  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day))
  if (
    date.getUTCFullYear() !== parts.year ||
    date.getUTCMonth() !== parts.month - 1 ||
    date.getUTCDate() !== parts.day
  ) {
    throw new Error('请输入有效日期')
  }

  return parts
}

function formatDateParts(year, monthIndex, day) {
  return [
    String(year).padStart(4, '0'),
    String(monthIndex + 1).padStart(2, '0'),
    String(day).padStart(2, '0'),
  ].join('-')
}

function daysInMonth(year, monthIndex) {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate()
}

export function formatDateInput(value) {
  const digits = String(value).replace(/\D/g, '').slice(0, 8)

  if (digits.length <= 4) return digits
  if (digits.length <= 6) {
    return `${digits.slice(0, 4)}-${digits.slice(4)}`
  }
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`
}

export function normalizeDateInput(value) {
  const formatted = formatDateInput(value)
  if (formatted.length !== 10) {
    throw new Error('请输入 8 位日期，例如 20260630')
  }

  parseDateParts(formatted)
  return formatted
}

export function calculateExpiryDate(productionDate, shelfLifeValue, shelfLifeUnit) {
  const value = Number(shelfLifeValue)
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error('保质期必须是大于 0 的整数')
  }

  const normalizedProductionDate = normalizeDateInput(productionDate)
  const { year, month, day } = parseDateParts(normalizedProductionDate)
  const sourceMonthIndex = month - 1

  if (shelfLifeUnit === 'day') {
    const date = new Date(Date.UTC(year, sourceMonthIndex, day + value))
    return formatDateParts(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
    )
  }

  if (!['month', 'year'].includes(shelfLifeUnit)) {
    throw new Error('不支持的保质期单位')
  }

  const monthsToAdd = shelfLifeUnit === 'year' ? value * 12 : value
  const totalMonths = sourceMonthIndex + monthsToAdd
  const targetYear = year + Math.floor(totalMonths / 12)
  const targetMonthIndex = ((totalMonths % 12) + 12) % 12
  const targetDay = Math.min(day, daysInMonth(targetYear, targetMonthIndex))

  return formatDateParts(targetYear, targetMonthIndex, targetDay)
}

export function getExpiryStatus(expiryDate, today = new Date()) {
  const expiry = parseDateParts(expiryDate)
  const expiryTime = Date.UTC(expiry.year, expiry.month - 1, expiry.day)
  const todayTime = Date.UTC(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  )
  const daysRemaining = Math.round((expiryTime - todayTime) / DAY_IN_MS)

  if (daysRemaining < 0) {
    return { key: 'expired', label: '已过期', daysRemaining }
  }
  if (daysRemaining <= 7) {
    return { key: 'within7', label: '7 天内到期', daysRemaining }
  }
  if (daysRemaining <= 30) {
    return { key: 'within30', label: '30 天内到期', daysRemaining }
  }
  return { key: 'normal', label: '正常', daysRemaining }
}
