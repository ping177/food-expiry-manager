export function decrementQuantity(quantity) {
  const current = normalizeQuantity(quantity)
  return Math.max(0, current - 1)
}

export function normalizeQuantity(quantity) {
  const next = Number(quantity)
  if (!Number.isFinite(next) || next < 0) {
    throw new Error('库存数量不能小于 0')
  }
  return next
}

function normalizePositiveQuantity(quantity, message) {
  const next = normalizeQuantity(quantity)
  if (next <= 0) {
    throw new Error(message)
  }
  return next
}

export function consumeQuantity(quantity, amount = 1) {
  const current = normalizeQuantity(quantity)
  const consumed = normalizePositiveQuantity(amount, '消耗数量必须大于 0')

  if (consumed > current) {
    throw new Error('消耗数量不能超过当前库存')
  }

  return current - consumed
}

function getBatchProductId(batch) {
  return batch.product_id ?? batch.product?.id
}

export function planInventoryAddition({
  batches,
  productId,
  expiryDate,
  quantity,
  unit,
  storageLocation,
}) {
  const addedQuantity = normalizePositiveQuantity(
    quantity,
    '新增库存数量必须大于 0',
  )
  const existingBatch = batches.find(
    (batch) =>
      batch.status === 'active' &&
      getBatchProductId(batch) === productId &&
      batch.expiry_date === expiryDate,
  )

  if (existingBatch) {
    return {
      action: 'merge',
      batchId: existingBatch.id,
      quantity: normalizeQuantity(existingBatch.quantity) + addedQuantity,
    }
  }

  return {
    action: 'create',
    values: {
      product_id: productId,
      quantity: addedQuantity,
      unit,
      production_date: null,
      shelf_life_value: null,
      shelf_life_unit: null,
      expiry_date: expiryDate,
      storage_location: storageLocation || null,
      note: null,
      status: 'active',
    },
  }
}

export function createConsumedStatusUpdate(quantity) {
  if (normalizeQuantity(quantity) !== 0) {
    throw new Error('只有库存为 0 时才能标记为已消耗')
  }

  return { status: 'consumed' }
}

export function prepareInventoryOperationUpdate(
  batch,
  operation,
  consumptionAmount,
) {
  if (!operation) return null

  if (operation === 'consume') {
    return { quantity: consumeQuantity(batch.quantity, consumptionAmount) }
  }

  if (operation === 'mark-consumed') {
    return createConsumedStatusUpdate(batch.quantity)
  }

  if (operation === 'delete-batch') {
    if (!batch?.id) {
      throw new Error('找不到要删除的库存批次')
    }
    return { id: batch.id }
  }

  throw new Error('不支持的库存操作')
}
