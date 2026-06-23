export function decrementQuantity(quantity) {
  const current = Number(quantity)
  if (!Number.isFinite(current) || current < 0) {
    throw new Error('库存数量必须是非负数')
  }
  return Math.max(0, current - 1)
}

export function normalizeQuantity(quantity) {
  const next = Number(quantity)
  if (!Number.isFinite(next) || next < 0) {
    throw new Error('库存数量不能小于 0')
  }
  return next
}

