import { useState } from 'react'
import { PRODUCT_CATEGORIES } from '../lib/categories'
import { getExpiryWindow } from '../lib/expiryWindows'
import {
  createProductEditForm,
  normalizeProductEditForm,
} from '../lib/productEdit'
import ProductImagePicker from './ProductImagePicker'
import { getProductImageUrl } from '../lib/productImage'
import InventoryOperationPanel from './InventoryOperationPanel'

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
  onUpdateProduct,
  onUpdateProductImage,
  onDeleteProductImage,
  onAddInventory = () => {},
  onConsume = async () => true,
  onMarkConsumed = async () => true,
  onDeleteBatch = async () => true,
  defaultMode = 'view',
}) {
  const [mode, setMode] = useState(defaultMode)
  const [productForm, setProductForm] = useState(() =>
    createProductEditForm(batch.product),
  )
  const [detailError, setDetailError] = useState('')
  const expiryWindow = getExpiryWindow(batch.expiry_date)
  const product = batch.product
  const imageUrl = getProductImageUrl(product)
  const [pendingImageFile, setPendingImageFile] = useState(null)
  const [imagePickerKey, setImagePickerKey] = useState(0)

  function updateProductField(field, value) {
    setProductForm((current) => ({ ...current, [field]: value }))
  }

  function openProductEdit() {
    setDetailError('')
    setProductForm(createProductEditForm(product))
    setPendingImageFile(null)
    setImagePickerKey((current) => current + 1)
    setMode('product-edit')
  }

  function closeCurrentMode() {
    setDetailError('')
    setProductForm(createProductEditForm(product))
    setPendingImageFile(null)
    setImagePickerKey((current) => current + 1)
    setMode('view')
  }

  function openInventoryOperation() {
    setDetailError('')
    setMode('inventory-operation')
  }

  async function handleProductEditSubmit(event) {
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

    if (pendingImageFile) {
      const imageResult = await onUpdateProductImage(batch.id, product, pendingImageFile)
      if (!imageResult.ok) return
      setPendingImageFile(null)
      setImagePickerKey((current) => current + 1)
    }
    setProductForm({
      name: productValues.name,
      brand: productValues.brand || '',
      category: productValues.category || '',
      imageUrl: productValues.image_url || '',
    })
    setMode('view')
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <button
          className="rounded-xl px-1 py-2 text-sm font-semibold text-slate-500"
          type="button"
          onClick={mode === 'view' ? onBack : closeCurrentMode}
        >
          {mode === 'view' ? '返回首页' : '返回详情'}
        </button>
      </div>

      <article className="rounded-3xl bg-white p-5 shadow-card">
        <div className="flex gap-4">
          {imageUrl ? (
            <img
              alt=""
              className="h-24 w-24 shrink-0 rounded-2xl border border-slate-100 object-cover"
              src={imageUrl}
            />
          ) : (
            <div aria-label="库存图片占位" className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl border border-slate-100 bg-cream text-xs font-semibold text-slate-400" role="img">
              无图
            </div>
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

      {mode === 'product-edit' && (
        <form
          className="space-y-3 rounded-3xl border border-slate-100 bg-white p-5 shadow-card"
          onSubmit={handleProductEditSubmit}
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
              外部兜底图片链接（可选）
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
          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-700">用户上传主图</p>
            <ProductImagePicker key={imagePickerKey} disabled={busy} onChange={setPendingImageFile} />
            {product?.user_image_url && (
              <button className="rounded-xl px-2 py-2 text-sm font-semibold text-danger disabled:opacity-50" disabled={busy} type="button" onClick={() => onDeleteProductImage(batch.id, product)}>
                删除用户图片
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              className="rounded-xl bg-leaf px-4 py-3 font-semibold text-white disabled:opacity-50"
              disabled={busy}
              type="submit"
            >
              保存修改
            </button>
            <button
              className="rounded-xl border border-slate-200 px-4 py-3 font-semibold text-slate-700"
              disabled={busy}
              type="button"
              onClick={closeCurrentMode}
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

      {mode === 'view' && (
        <div className="grid grid-cols-2 gap-3">
          <button
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700 disabled:opacity-50"
            disabled={busy}
            type="button"
            onClick={openProductEdit}
          >
            编辑商品
          </button>
          <button
            className="rounded-2xl bg-leaf px-4 py-3 font-semibold text-white disabled:opacity-50"
            disabled={busy}
            type="button"
            onClick={openInventoryOperation}
          >
            库存操作
          </button>
        </div>
      )}

      {mode === 'inventory-operation' && (
        <InventoryOperationPanel
          batch={batch}
          busy={busy}
          onAddInventory={onAddInventory}
          onConsume={onConsume}
          onMarkConsumed={onMarkConsumed}
          onDeleteBatch={onDeleteBatch}
        />
      )}

      {detailError && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-danger">
          {detailError}
        </p>
      )}
    </section>
  )
}
