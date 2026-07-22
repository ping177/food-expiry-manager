import { useState } from 'react'
import DateInput from './DateInput'
import { normalizeDateInput } from '../lib/expiry'
import { normalizeQuantity } from '../lib/inventory'

const initialForm = {
  quantity: '1',
  expiryDate: '',
}

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-ink placeholder:text-slate-400'

export default function AddInventoryForm({
  busy,
  onSave,
  onCancel,
  product,
  unit,
}) {
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState('')

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    try {
      const quantity = normalizeQuantity(form.quantity)
      if (quantity <= 0) {
        throw new Error('新增库存数量必须大于 0')
      }

      const expiryDate = normalizeDateInput(form.expiryDate)
      const saved = await onSave({
        quantity,
        expiryDate,
      })

      if (saved) setForm(initialForm)
    } catch (submitError) {
      setError(submitError.message)
    }
  }

  return (
    <section className="rounded-3xl bg-white p-5 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-leaf">新增库存</p>
          <h2 className="mt-1 text-2xl font-bold text-ink">当前商品</h2>
        </div>
        <button
          className="text-sm text-slate-500"
          type="button"
          onClick={onCancel}
        >
          返回库存操作
        </button>
      </div>

      <div className="mt-5 rounded-2xl bg-cream px-4 py-3">
        <p className="text-xs font-semibold text-slate-500">商品</p>
        <p className="mt-1 font-bold text-ink">{product?.name}</p>
        {product?.brand && (
          <p className="mt-1 text-sm text-slate-500">{product.brand}</p>
        )}
        <p className="mt-2 text-xs text-slate-500">单位：{unit}</p>
      </div>

      <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-slate-700">
            数量 *
          </span>
          <input
            required
            className={inputClass}
            min="1"
            step="1"
            type="number"
            value={form.quantity}
            onChange={(event) => update('quantity', event.target.value)}
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-slate-700">
            保质期至 *
          </span>
          <DateInput
            required
            className={inputClass}
            value={form.expiryDate}
            onChange={(value) => update('expiryDate', value)}
          />
        </label>

        {error && (
          <p
            role="alert"
            className="rounded-xl bg-red-50 px-4 py-3 text-sm text-danger"
          >
            {error}
          </p>
        )}

        <button
          className="w-full rounded-xl bg-leaf px-4 py-3.5 font-bold text-white disabled:opacity-50"
          disabled={busy}
          type="submit"
        >
          {busy ? '保存中…' : '保存新增库存'}
        </button>
      </form>
    </section>
  )
}
