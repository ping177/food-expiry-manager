import { useState } from 'react'
import { PRODUCT_CATEGORIES } from '../lib/categories'
import { getExpiryWindow } from '../lib/expiryWindows'
import {
  createProductEditForm,
  normalizeProductEditForm,
} from '../lib/productEdit'
import ProductImagePicker from './ProductImagePicker'
import { getProductImageUrl } from '../lib/productImage'
import { getArchiveStatusLabel } from '../lib/inventory'
import { formatProductSize, PRODUCT_SIZE_UNITS } from '../lib/productSize'
import ArchiveBatchActions from './ArchiveBatchActions'
import InventoryOperationPanel from './InventoryOperationPanel'
import useSwipeNavigation from '../hooks/useSwipeNavigation'
import useProtectedExit, { hasFormChanges } from '../hooks/useProtectedExit'
import DiscardChangesConfirmation from './DiscardChangesConfirmation'

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
  onDeleteProduct = async () => ({ outcome: 'error' }),
  productDeleteGuard = { status: 'loading' },
  productDeleteBusy = false,
  defaultMode = 'view',
  archiveMode = false,
  swipeClickGuard,
}) {
  const [mode, setMode] = useState(archiveMode ? 'view' : defaultMode)
  const [productForm, setProductForm] = useState(() =>
    createProductEditForm(batch.product),
  )
  const [detailError, setDetailError] = useState('')
  const expiryWindow = getExpiryWindow(batch.expiry_date)
  const product = batch.product
  const imageUrl = getProductImageUrl(product)
  const size = formatProductSize(product)
  const archiveStatusLabel = getArchiveStatusLabel(batch.status)
  const [pendingImageFile, setPendingImageFile] = useState(null)
  const [imagePickerKey, setImagePickerKey] = useState(0)
  const [productSubmitting, setProductSubmitting] = useState(false)
  const [operationExitBlocked, setOperationExitBlocked] = useState(false)
  const exitBusy = busy || productDeleteBusy || productSubmitting
  const exit = useProtectedExit({
    dirty: mode === 'product-edit' &&
      (hasFormChanges(productForm, createProductEditForm(product)) || Boolean(pendingImageFile)),
    busy: exitBusy,
    onExit: mode === 'view' ? onBack : closeCurrentMode,
  })
  const backGesture = useSwipeNavigation({
    enabled: !exitBusy && !operationExitBlocked && !exit.confirming,
    scope: `${batch.id}:${archiveMode}:${mode}`,
    direction: 'right',
    onSwipe: exit.requestExit,
    clickGuard: swipeClickGuard,
  })

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
    if (exitBusy || exit.confirming) return
    setDetailError('')

    let productValues
    try {
      productValues = normalizeProductEditForm(productForm)
    } catch (editError) {
      setDetailError(editError.message)
      return
    }

    setProductSubmitting(true)
    try {
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
        sizeValue: productValues.size_value ?? '',
        sizeUnit: productValues.size_unit || 'g',
        category: productValues.category || '',
        imageUrl: productValues.image_url || '',
      })
      setMode('view')
    } finally {
      setProductSubmitting(false)
    }
  }

  return (
    <section className="space-y-4" {...backGesture}>
      <div className="flex items-center justify-between gap-3">
        <button
          data-swipe-start
          className="rounded-xl px-1 py-2 text-sm font-semibold text-slate-500"
          type="button"
          disabled={exitBusy}
          onClick={exit.requestExit}
        >
          {mode === 'view'
            ? archiveMode
              ? '返回已归档'
              : '返回首页'
            : '返回详情'}
        </button>
      </div>

      {exit.confirming && (
        <DiscardChangesConfirmation busy={exitBusy} onCancel={exit.cancel} onDiscard={exit.discard} />
      )}

      <article className="rounded-3xl bg-white p-5 shadow-card">
        <div className="flex gap-4">
          {imageUrl ? (
            <img
              data-swipe-start
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
            {size && (
              <p className="mt-1 text-sm text-slate-500">{size}</p>
            )}
            {product?.barcode && (
              <p className="mt-3 text-xs text-slate-500">
                条形码：{product.barcode}
              </p>
            )}
            {archiveMode && (
              <span className="mt-3 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                {archiveStatusLabel}
              </span>
            )}
          </div>
        </div>
      </article>

      {mode === 'product-edit' && !archiveMode && (
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
          <div className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-3">
            <label className="block min-w-0">
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
            <label className="block min-w-0">
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                容量/规格（可选）
              </span>
              <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_4rem] gap-2">
                <input
                  aria-label="容量数值"
                  className="min-w-0 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-ink"
                  inputMode="decimal"
                  min="0"
                  placeholder="170"
                  step="any"
                  type="number"
                  value={productForm.sizeValue}
                  onChange={(event) =>
                    updateProductField('sizeValue', event.target.value)
                  }
                />
                <select aria-label="容量单位" className="min-w-0 w-full rounded-xl border border-slate-200 bg-white px-2 py-2.5 text-ink" value={productForm.sizeUnit} onChange={(event) => updateProductField('sizeUnit', event.target.value)}>
                  {PRODUCT_SIZE_UNITS.map((unit) => (
                    <option key={unit} value={unit}>{unit}</option>
                  ))}
                </select>
              </div>
            </label>
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2">
            <label className="block min-w-0">
              <span className="mb-1.5 block whitespace-nowrap text-xs font-semibold text-slate-700 sm:text-sm">
                分类
              </span>
              <select
                className="min-w-0 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-ink"
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
            <label className="block min-w-0">
              <span className="mb-1.5 block whitespace-nowrap text-xs font-semibold text-slate-700 sm:text-sm">
                外部图片链接（可选）
              </span>
              <input
                className="min-w-0 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-ink"
                inputMode="url"
                placeholder="可留空"
                type="url"
                value={productForm.imageUrl}
                onChange={(event) =>
                  updateProductField('imageUrl', event.target.value)
                }
              />
            </label>
          </div>
          <div className="space-y-2" data-no-swipe>
            <p className="text-sm font-semibold text-slate-700">用户上传主图</p>
            <ProductImagePicker key={imagePickerKey} disabled={exitBusy || exit.confirming} onChange={setPendingImageFile} />
            {product?.user_image_url && (
              <button className="rounded-xl px-2 py-2 text-sm font-semibold text-danger disabled:opacity-50" disabled={exitBusy || exit.confirming} type="button" onClick={() => onDeleteProductImage(batch.id, product)}>
                删除用户图片
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              className="rounded-xl bg-leaf px-4 py-3 font-semibold text-white disabled:opacity-50"
              disabled={exitBusy || exit.confirming}
              type="submit"
            >
              保存修改
            </button>
            <button
              data-swipe-start
              className="rounded-xl border border-slate-200 px-4 py-3 font-semibold text-slate-700"
              disabled={exitBusy}
              type="button"
              onClick={exit.requestExit}
            >
              取消
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white p-4 shadow-card">
          <p className="text-xs text-slate-500">{archiveMode ? '原保质期至' : '保质期至'}</p>
          <p className="mt-1 font-bold text-ink">{batch.expiry_date}</p>
          {archiveMode ? (
            <span className="mt-3 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
              {archiveStatusLabel}
            </span>
          ) : (
            <span
              className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-bold ${expiryWindowStyles[expiryWindow.value]}`}
            >
              {expiryWindow.label}
            </span>
          )}
          <p className="mt-2 text-xs text-slate-500">
            {archiveMode ? '这条批次已归档。' : daysRemainingText(expiryWindow.daysRemaining)}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-card">
          <p className="text-xs text-slate-500">{archiveMode ? '归档时数量' : '当前库存'}</p>
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

      {mode === 'view' && !archiveMode && (
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

      {mode === 'inventory-operation' && !archiveMode && (
        <InventoryOperationPanel
          onExitBlockedChange={setOperationExitBlocked}
          batch={batch}
          busy={busy}
          onAddInventory={onAddInventory}
          onConsume={onConsume}
          onMarkConsumed={onMarkConsumed}
          onDeleteBatch={onDeleteBatch}
        />
      )}

      {archiveMode && mode === 'view' && (
        <ArchiveBatchActions
          onExitBlockedChange={setOperationExitBlocked}
          batch={batch}
          busy={busy}
          onDeleteBatch={onDeleteBatch}
          onDeleteProduct={onDeleteProduct}
          productDeleteBusy={productDeleteBusy}
          productDeleteGuard={productDeleteGuard}
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
