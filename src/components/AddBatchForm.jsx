import { useMemo, useState } from 'react'
import DateInput from './DateInput'
import { calculateExpiryDate, normalizeDateInput } from '../lib/expiry'

const initialForm = {
  productName: '',
  brand: '',
  category: '',
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

export default function AddBatchForm({ busy, onSave, onCancel }) {
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState('')

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

    const saved = await onSave({ ...form, expiryDate })
    if (saved) {
      setForm(initialForm)
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
              <input
                className={inputClass}
                placeholder="猫罐头"
                value={form.category}
                onChange={(event) => update('category', event.target.value)}
              />
            </Field>
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
