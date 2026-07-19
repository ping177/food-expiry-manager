import { useCallback, useMemo, useState } from 'react'
import BarcodeScanner from './BarcodeScanner'
import DateInput from './DateInput'
import { calculateExpiryDate, normalizeDateInput } from '../lib/expiry'
import { PRODUCT_CATEGORIES } from '../lib/categories'
import { normalizeBarcode } from '../lib/productLookup'
import ProductImagePicker from './ProductImagePicker'
import { getProductImageUrl } from '../lib/productImage'

const initialForm = {
  barcode: '',
  productName: '',
  brand: '',
  imageUrl: '',
  category: '',
  source: 'manual',
  quantity: '1',
  unit: '罐',
  expiryMode: 'calculate',
  productionDate: '',
  shelfLifeValue: '',
  shelfLifeUnit: 'month',
  expiryDate: '',
  storageLocation: '',
  note: '',
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">
        {label}
      </span>
      {children}
    </label>
  )
}

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-ink placeholder:text-slate-400'

export default function AddBatchForm({
  busy,
  onSave,
  onCancel,
  onLookupBarcode,
}) {
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState('')
  const [scannerOpen, setScannerOpen] = useState(false)
  const [lookupStatus, setLookupStatus] = useState('idle')
  const [lookupMessage, setLookupMessage] = useState('')
  const [pendingImageFile, setPendingImageFile] = useState(null)
  const [imagePickerKey, setImagePickerKey] = useState(0)

  const calculatedExpiry = useMemo(() => {
    if (
      form.expiryMode !== 'calculate' ||
      !form.productionDate ||
      !form.shelfLifeValue
    ) {
      return ''
    }
    try {
      return calculateExpiryDate(
        form.productionDate,
        Number(form.shelfLifeValue),
        form.shelfLifeUnit,
      )
    } catch {
      return ''
    }
  }, [
    form.expiryMode,
    form.productionDate,
    form.shelfLifeValue,
    form.shelfLifeUnit,
  ])

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const handleBarcodeLookup = useCallback(async (barcode) => {
    const normalizedBarcode = normalizeBarcode(barcode)
    if (!normalizedBarcode) {
      setLookupStatus('error')
      setLookupMessage('请输入条形码。')
      return
    }

    setScannerOpen(false)
    setLookupStatus('loading')
    setLookupMessage('正在查询商品信息…')
    setForm((current) => ({ ...current, barcode: normalizedBarcode }))

    let result
    try {
      result = await onLookupBarcode(normalizedBarcode)
    } catch {
      setLookupStatus('local_error')
      setLookupMessage(
        '读取本地商品信息失败，请稍后重试，或直接手动填写。',
      )
      return
    }

    if (result.ok) {
      setForm((current) => ({
        ...current,
        barcode: result.product.barcode,
        productName: result.product.name,
        brand: result.product.brand,
        imageUrl: result.product.imageUrl,
        category: result.product.category,
        source: result.product.source,
      }))
      setLookupStatus(result.status)
      if (result.origin === 'local') {
        setLookupMessage(
          result.status === 'found'
            ? '已从本地商品库找到信息，可继续补充数量和保质期。'
            : '已从本地商品库找到条形码，但商品名称缺失，请手动补充。',
        )
      } else {
        setLookupMessage(
          result.status === 'found'
            ? '已找到商品信息，可继续补充数量和保质期。'
            : '已找到条形码，但商品名称缺失，请手动补充。',
        )
      }
      return
    }

    setForm((current) => ({
      ...current,
      barcode: result.barcode || normalizedBarcode,
      source: 'manual',
    }))
    setLookupStatus(result.status)
    if (result.status === 'not_found') {
      setLookupMessage('未找到商品信息，请手动填写。')
    } else if (result.status === 'network_error') {
      setLookupMessage(
        '商品信息查询失败，请检查网络后重试，或直接手动填写。',
      )
    } else {
      setLookupMessage('商品信息服务暂时不可用，请直接手动填写。')
    }
  }, [onLookupBarcode])

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    let expiryDate
    try {
      expiryDate =
        form.expiryMode === 'calculate'
          ? calculatedExpiry
          : normalizeDateInput(form.expiryDate)
      if (!expiryDate) {
        throw new Error('请填写完整的保质期信息')
      }
    } catch (dateError) {
      setError(dateError.message)
      return
    }

    const saved = await onSave({ ...form, expiryDate, pendingImageFile })
    if (saved) {
      setForm(initialForm)
      setPendingImageFile(null)
      setImagePickerKey((current) => current + 1)
    }
  }

  return (
    <section className="rounded-3xl bg-white p-5 shadow-card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-leaf">新增库存</p>
          <h2 className="mt-1 text-2xl font-bold">商品与批次</h2>
        </div>
        <button className="text-sm text-slate-500" type="button" onClick={onCancel}>
          返回首页
        </button>
      </div>

      <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
        <fieldset className="space-y-4">
          <legend className="mb-3 font-bold text-ink">商品信息</legend>
          <div className="grid grid-cols-2 gap-3">
            <button
              className="rounded-xl bg-leaf px-4 py-3 font-semibold text-white"
              type="button"
              onClick={() => {
                setLookupMessage('')
                setScannerOpen(true)
              }}
            >
              扫码添加
            </button>
            <button
              className="rounded-xl border border-slate-200 px-4 py-3 font-semibold text-slate-700"
              type="button"
              onClick={() => {
                setScannerOpen(false)
                setLookupMessage('')
              }}
            >
              手动填写
            </button>
          </div>

          {scannerOpen && (
            <BarcodeScanner
              onCancel={() => setScannerOpen(false)}
              onDetected={handleBarcodeLookup}
            />
          )}

          <Field label="条形码">
            <div className="flex gap-2">
              <input
                className={`${inputClass} min-w-0 flex-1`}
                inputMode="numeric"
                placeholder="可扫码或手动输入"
                value={form.barcode}
                onChange={(event) => {
                  setLookupStatus('idle')
                  setLookupMessage('')
                  setForm((current) => ({
                    ...current,
                    barcode: event.target.value,
                    source: 'manual',
                  }))
                }}
              />
              <button
                className="shrink-0 rounded-xl border border-leaf px-4 py-2.5 font-semibold text-leaf disabled:opacity-50"
                disabled={lookupStatus === 'loading'}
                type="button"
                onClick={() => handleBarcodeLookup(form.barcode)}
              >
                {lookupStatus === 'loading' ? '查询中…' : '查询'}
              </button>
            </div>
          </Field>

          {lookupMessage && (
            <p
              className={`rounded-xl px-4 py-3 text-sm leading-6 ${
                ['found', 'partial_found'].includes(lookupStatus)
                  ? 'bg-mint text-leaf'
                  : lookupStatus === 'loading'
                    ? 'bg-cream text-slate-600'
                    : 'bg-amber-50 text-amber-800'
              }`}
            >
              {lookupMessage}
            </p>
          )}

          <Field label="商品名 *">
            <input
              required
              className={inputClass}
              placeholder="例如：猫罐头 A"
              value={form.productName}
              onChange={(event) => update('productName', event.target.value)}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="品牌">
              <input
                className={inputClass}
                value={form.brand}
                onChange={(event) => update('brand', event.target.value)}
              />
            </Field>
            <Field label="分类">
              <select
                className={inputClass}
                value={form.category}
                onChange={(event) => update('category', event.target.value)}
              >
                <option value="">未选择分类</option>
                {PRODUCT_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="外部兜底图片链接（可选）">
            <input
              className={inputClass}
              inputMode="url"
              placeholder="通常由扫码自动填入，可留空"
              type="url"
              value={form.imageUrl}
              onChange={(event) => update('imageUrl', event.target.value)}
            />
            <span className="mt-1.5 block text-xs leading-5 text-slate-500">
              通常由扫码自动填入，可留空。
            </span>
          </Field>
          {getProductImageUrl({ image_url: form.imageUrl }) && (
            <img
              alt={form.productName || '商品图片预览'}
              className="h-32 w-32 rounded-2xl border border-slate-100 object-cover"
              src={getProductImageUrl({ image_url: form.imageUrl })}
            />
          )}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-700">用户上传主图（可选）</p>
            <p className="text-xs leading-5 text-slate-500">保存前仅本地预览；保存库存后才上传。</p>
            <ProductImagePicker key={imagePickerKey} disabled={busy} onChange={setPendingImageFile} />
          </div>
        </fieldset>

        <fieldset className="space-y-4 border-t border-slate-100 pt-5">
          <legend className="mb-3 font-bold text-ink">库存批次</legend>
          <div className="grid grid-cols-2 gap-3">
            <Field label="数量 *">
              <input
                required
                className={inputClass}
                min="0"
                step="1"
                type="number"
                value={form.quantity}
                onChange={(event) => update('quantity', event.target.value)}
              />
            </Field>
            <Field label="单位 *">
              <input
                required
                className={inputClass}
                value={form.unit}
                onChange={(event) => update('unit', event.target.value)}
              />
            </Field>
          </div>

          <div>
            <span className="mb-2 block text-sm font-semibold text-slate-700">
              保质期录入方式
            </span>
            <div className="grid grid-cols-2 rounded-xl bg-cream p-1">
              <button
                className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                  form.expiryMode === 'calculate'
                    ? 'bg-white text-leaf shadow-sm'
                    : 'text-slate-500'
                }`}
                type="button"
                onClick={() => update('expiryMode', 'calculate')}
              >
                自动计算
              </button>
              <button
                className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                  form.expiryMode === 'direct'
                    ? 'bg-white text-leaf shadow-sm'
                    : 'text-slate-500'
                }`}
                type="button"
                onClick={() => update('expiryMode', 'direct')}
              >
                直接填写
              </button>
            </div>
          </div>

          {form.expiryMode === 'calculate' ? (
            <>
              <Field label="生产日期 *">
                <DateInput
                  required
                  className={inputClass}
                  value={form.productionDate}
                  onChange={(value) => update('productionDate', value)}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="保质期 *">
                  <input
                    required
                    className={inputClass}
                    min="1"
                    step="1"
                    type="number"
                    value={form.shelfLifeValue}
                    onChange={(event) =>
                      update('shelfLifeValue', event.target.value)
                    }
                  />
                </Field>
                <Field label="单位 *">
                  <select
                    className={inputClass}
                    value={form.shelfLifeUnit}
                    onChange={(event) =>
                      update('shelfLifeUnit', event.target.value)
                    }
                  >
                    <option value="day">天</option>
                    <option value="month">个月</option>
                    <option value="year">年</option>
                  </select>
                </Field>
              </div>
              {calculatedExpiry && (
                <p className="rounded-xl bg-mint px-4 py-3 text-sm font-semibold text-leaf">
                  自动计算到期日：{calculatedExpiry}
                </p>
              )}
            </>
          ) : (
            <Field label="保质期至 *">
              <DateInput
                required
                className={inputClass}
                value={form.expiryDate}
                onChange={(value) => update('expiryDate', value)}
              />
            </Field>
          )}

          <Field label="储存位置">
            <input
              className={inputClass}
              placeholder="例如：厨房柜子"
              value={form.storageLocation}
              onChange={(event) => update('storageLocation', event.target.value)}
            />
          </Field>
          <Field label="备注">
            <textarea
              className={`${inputClass} min-h-20 resize-y`}
              value={form.note}
              onChange={(event) => update('note', event.target.value)}
            />
          </Field>
        </fieldset>

        {error && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-danger">
            {error}
          </p>
        )}

        <button
          className="w-full rounded-xl bg-leaf px-4 py-3.5 font-bold text-white disabled:opacity-50"
          disabled={busy}
          type="submit"
        >
          {busy ? '保存中…' : '保存商品和库存批次'}
        </button>
      </form>
    </section>
  )
}
