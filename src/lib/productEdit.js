export function createProductEditForm(product = {}) {
  return {
    name: product.name || '',
    brand: product.brand || '',
    category: product.category || '',
    imageUrl: product.image_url || '',
  }
}

export function normalizeProductEditForm(form) {
  const name = String(form.name ?? '').trim()

  if (!name) {
    throw new Error('商品名不能为空')
  }

  return {
    name,
    brand: String(form.brand ?? '').trim() || null,
    category: String(form.category ?? '').trim() || null,
    image_url: String(form.imageUrl ?? '').trim() || null,
  }
}

export function applyProductUpdateToBatches(batches, updatedProduct) {
  return batches.map((batch) => {
    if (batch.product?.id !== updatedProduct.id) {
      return batch
    }

    return {
      ...batch,
      product: {
        ...batch.product,
        ...updatedProduct,
      },
    }
  })
}
