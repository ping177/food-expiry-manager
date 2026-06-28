import { getExpiryWindow } from './expiryWindows'

function matchesExpiryWindow(batch, expiryWindow, today) {
  if (expiryWindow === 'all') return true

  return getExpiryWindow(batch.expiry_date, today).value === expiryWindow
}

function matchesCategory(batch, category) {
  if (category === 'all') return true
  return (batch.product?.category || '') === category
}

function matchesSearch(batch, search) {
  const query = String(search ?? '').trim().toLowerCase()
  if (!query) return true

  const productName = String(batch.product?.name ?? '').toLowerCase()
  const brand = String(batch.product?.brand ?? '').toLowerCase()
  return productName.includes(query) || brand.includes(query)
}

export function filterInventoryBatches(
  batches,
  {
    expiryWindow = 'all',
    category = 'all',
    search = '',
    today = new Date(),
  } = {},
) {
  return batches.filter(
    (batch) =>
      (batch.status ?? 'active') === 'active' &&
      matchesExpiryWindow(batch, expiryWindow, today) &&
      matchesCategory(batch, category) &&
      matchesSearch(batch, search),
  )
}
