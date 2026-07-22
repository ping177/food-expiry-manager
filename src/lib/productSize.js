export const PRODUCT_SIZE_UNITS = ['g', 'kg', 'ml', 'L']

function normalizeUnit(value) {
  const unit = String(value ?? '').trim()
  if (!unit) return ''
  if (unit === 'l') return 'L'
  return unit
}

export function normalizeProductSize({ sizeValue, sizeUnit }) {
  const rawValue = String(sizeValue ?? '').trim()
  const unit = normalizeUnit(sizeUnit)

  if (!rawValue) return { size_value: null, size_unit: null }
  if (!unit) throw new Error('请选择容量单位')
  if (!PRODUCT_SIZE_UNITS.includes(unit)) throw new Error('容量单位无效')

  const value = Number(rawValue)
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error('容量数值必须大于 0')
  }

  return { size_value: value, size_unit: unit }
}

export function formatProductSize(product = {}) {
  const value = product.size_value
  const unit = normalizeUnit(product.size_unit)
  if (value === null || value === undefined || !unit) return ''
  return `${value}${unit}`
}

export function parseExternalProductSize(value) {
  const match = String(value ?? '').trim().match(/^(\d+(?:\.\d+)?)\s*(g|kg|ml|l)$/i)
  if (!match) return { sizeValue: '', sizeUnit: '' }

  return {
    sizeValue: Number(match[1]),
    sizeUnit: normalizeUnit(match[2]),
  }
}
