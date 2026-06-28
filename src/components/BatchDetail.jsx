import { useState } from 'react'
import { PRODUCT_CATEGORIES } from '../lib/categories'
import { getExpiryWindow } from '../lib/expiryWindows'
import {
  createProductEditForm,
  normalizeProductEditForm,
} from '../lib/productEdit'

const expiryWindowStyles = {
  expired: 'bg-red-100 text-danger',
  within30: 'bg-amber-100 text-amber-800',
  within180: 'bg-mint text-leaf',
  within365: 'bg-mint text-leaf',
  within730: 'bg-mint text-leaf',
  over730: 'bg-mint text-leaf',
}

function daysRemainingText(daysRemaining) {
  if (daysRemaining < 0) {
    return `已过期 ${Math.abs(daysRemaining)} 天`
  }
  if (daysRemaining === 0) return '今天到期'
  return `剩余 ${daysRemaining} 天`
}

function categoryOptions(currentCategory) {
  if (
    currentCategory &&
    !PRODUCT_CATEGORIES.includes(currentCategory)
  ) {
    return [currentCategory, ...PRODUCT_CATEGORIES]
  }
  return PRODUCT_CATEGORIES
}

export default function BatchDetail({
  batch,
  busy,
  onBack,
  onConsume,
  onDecrement,
  onUpdateProduct,
  onUpdateQuantity,
  defaultProductEditing = false,
}) {
  const [isProductEditing, setIsProductEditing] = useState(
    defaultProductEditing,
  )
  const [quantity, setQuantity] = useState(String(batch.quantity))
  const [productForm, setProductForm] = useState(() =>
    createProductEditForm(batch.product),
  )
  const [detailError, setDetailError] = useState('')
  const expiryWindow = getExpiryWindow(batch.expiry_date)
  const product = batch.product

  function updateProductField(field, value) {
    setProductForm((current) => ({ ...current, [field]: value }))
  }

  async function handleEditSubmit(event) {
    event.preventDefault()
    setDetailError('')

    let productValues
    try {
      productValues = normalizeProductEditForm(productForm)
    } catch (editError) {
      setDetailError(editError.message)
      return
    }

    const productSaved = await onUpdateProduct(batch.id, product.id, productValues)
    if (!productSaved) {
      setProductForm(createProductEditForm(product))
      setDetailError('商品信息保存失败，请稍后重试。')
      return
    }

    const quantitySaved = await onUpdateQuantity(batch.id, quantity)
    if (quantitySaved) {
      setProductForm({
        name: productValues.name,
        brand: productValues.brand || '',
        category: productValues.category || '',
        imageUrl: productValues.image_url || '',
      })
      setIsProductEditing(false)
      return
    }

    setQuantity(String(batch.quantity))
    setDetailError('库存数量保存失败，请稍后重试。')
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <button
          className="rounded-xl px-1 py-2 text-sm font-semibold text-slate-500"
          type="button"
          onClick={onBack}
        >
          返回首页
        </button>
        <button
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
          disabled={busy}
          type="button"
          onClick={() => {
            setDetailError('')
            setProductForm(createProductEditForm(product))
            setQuantity(String(batch.quantity))
            setIsProductEditing(true)
          }}
        >
          编辑
        </button>
      </div>

      <article className="rounded-3xl bg-white p-5 shadow-card">
        <div className="flex gap-4">
          {product?.image_url && (
            <img
              alt=""
              className="h-24 w-24 shrink-0 rounded-2xl border border-slate-100 object-cover"
              src={product.image_url}
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              {product?.category || '未分类'}
            </p>
            <h2 className="mt-1 text-xl font-bold leading-snug text-ink">
              {product?.name}
            </h2>
            {product?.brand && (
              <p className="mt-1 text-sm text-slate-500">{product.brand}</p>
            )}
            {product?.barcode && (
              <p className="mt-3 text-xs text-slate-500">
                条形码：{product.barcode}
              </p>
            )}
          </div>
        </div>
      </article>

      {isProductEditing && (
        <form
          className="space-y-3 rounded-3xl border border-slate-100 bg-white p-5 shadow-card"
          onSubmit={handleEditSubmit}
        >
          <h3 className="font-bold text-ink">商品信息</h3>
          {product?.barcode && (
            <p className="rounded-xl bg-cream px-3 py-2 text-xs text-slate-500">
              条形码：{product.barcode}
            </p>
          )}
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">
              商品名 *
            </span>
            <input
              required
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-ink"
              value={productForm.name}
              onChange={(event) =>
                updateProductField('name', event.target.value)
              }
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                品牌
              </span>
              <input
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-ink"
                value={productForm.brand}
                onChange={(event) =>
                  updateProductField('brand', event.target.value)
                }
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                分类
              </span>
              <select
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-ink"
                value={productForm.category}
                onChange={(event) =>
                  updateProductField('category', event.target.value)
                }
              >
                <option value="">未选择分类</option>
                {categoryOptions(productForm.category).map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">
              图片链接
            </span>
            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-ink"
              inputMode="url"
              type="url"
              value={productForm.imageUrl}
              onChange={(event) =>
                updateProductField('imageUrl', event.target.value)
              }
            />
          </label>
          <div className="border-t border-slate-100 pt-3">
            <h3 className="font-bold text-ink">当前批次</h3>
            <label className="mt-3 block">
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                当前库存
              </span>
              <input
                aria-label="当前库存"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-ink"
                min="0"
                step="1"
                type="number"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              className="rounded-xl bg-leaf px-4 py-3 font-semibold text-white disabled:opacity-50"
              disabled={busy}
              type="submit"
            >
              保存
            </button>
            <button
              className="rounded-xl border border-slate-200 px-4 py-3 font-semibold text-slate-700"
              disabled={busy}
              type="button"
              onClick={() => {
                setDetailError('')
                setProductForm(createProductEditForm(product))
                setQuantity(String(batch.quantity))
                setIsProductEditing(false)
              }}
            >
              取消
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white p-4 shadow-card">
          <p className="text-xs text-slate-500">保质期至</p>
          <p className="mt-1 font-bold text-ink">{batch.expiry_date}</p>
          <span
            className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-bold ${expiryWindowStyles[expiryWindow.value]}`}
          >
            {expiryWindow.label}
          </span>
          <p className="mt-2 text-xs text-slate-500">
            {daysRemainingText(expiryWindow.daysRemaining)}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-card">
          <p className="text-xs text-slate-500">当前库存</p>
          <p className="mt-1 text-2xl font-bold text-ink">
            {batch.quantity}
            <span className="ml-1 text-sm font-medium text-slate-500">
              {batch.unit}
            </span>
          </p>
          {batch.storage_location && (
            <p className="mt-2 text-xs text-slate-500">
              {batch.storage_location}
            </p>
          )}
        </div>
      </div>

      <button
        className="w-full rounded-2xl bg-leaf px-5 py-4 font-bold text-white shadow-card disabled:cursor-not-allowed disabled:opacity-40"
        disabled={busy || Number(batch.quantity) === 0}
        type="button"
        onClick={() => {
          setDetailError('')
          onDecrement(batch)
        }}
      >
        消耗 1
      </button>

      {Number(batch.quantity) === 0 && (
        <button
          className="w-full rounded-2xl bg-slate-800 px-5 py-3 font-semibold text-white disabled:opacity-50"
          disabled={busy}
          type="button"
          onClick={() => onConsume(batch.id)}
        >
          标记为已消耗
        </button>
      )}

      {detailError && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-danger">
          {detailError}
        </p>
      )}
    </section>
  )
}
