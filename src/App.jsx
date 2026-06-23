import { useCallback, useEffect, useState } from 'react'
import AddBatchForm from './components/AddBatchForm'
import BatchCard from './components/BatchCard'
import ConfigNotice from './components/ConfigNotice'
import { decrementQuantity, normalizeQuantity } from './lib/inventory'
import {
  lookupProductLocalFirst,
  normalizeBarcode,
} from './lib/productLookup'
import {
  missingSupabaseVariables,
  supabase,
} from './lib/supabase'

export default function App() {
  const [session, setSession] = useState(null)
  const [batches, setBatches] = useState([])
  const [view, setView] = useState('home')
  const [authLoading, setAuthLoading] = useState(true)
  const [loading, setLoading] = useState(false)
  const [busyBatchId, setBusyBatchId] = useState(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const loadBatches = useCallback(async () => {
    if (!supabase) return

    setLoading(true)
    setError('')
    const { data, error: queryError } = await supabase
      .from('inventory_batches')
      .select(
        `
          id,
          quantity,
          unit,
          production_date,
          shelf_life_value,
          shelf_life_unit,
          expiry_date,
          storage_location,
          note,
          status,
          product:products (
            id,
            barcode,
            name,
            brand,
            image_url,
            category,
            source
          )
        `,
      )
      .eq('status', 'active')
      .order('expiry_date', { ascending: true })

    if (queryError) {
      setError(`读取库存失败：${queryError.message}`)
    } else {
      setBatches(data ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!supabase) return undefined

    let active = true

    async function ensureAnonymousSession() {
      const {
        data: { session: existingSession },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (!active) return
      if (sessionError) {
        setError(`读取登录状态失败：${sessionError.message}`)
        setAuthLoading(false)
        return
      }

      if (existingSession) {
        setSession(existingSession)
        setAuthLoading(false)
        return
      }

      const { data, error: signInError } =
        await supabase.auth.signInAnonymously()
      if (!active) return

      if (signInError) {
        setError(
          `匿名登录失败：${signInError.message}。请确认 Supabase 已开启 Anonymous Sign-ins。`,
        )
      } else {
        setSession(data.session)
      }
      setAuthLoading(false)
    }

    ensureAnonymousSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) {
        setSession(nextSession)
      }
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (session) {
      loadBatches()
    }
  }, [session, loadBatches])

  async function findOrCreateProduct(form) {
    const barcode = normalizeBarcode(form.barcode) || null
    const name = form.productName.trim()
    const brand = form.brand.trim()
    const productValues = {
      name,
      brand: brand || null,
      image_url: form.imageUrl.trim() || null,
      category: form.category.trim() || null,
      source: form.source || 'manual',
    }

    if (barcode) {
      const { data: existingProducts, error: lookupError } = await supabase
        .from('products')
        .select('id')
        .eq('barcode', barcode)
        .limit(1)

      if (lookupError) throw lookupError
      if (existingProducts?.[0]) {
        const existingProduct = existingProducts[0]
        const { error: updateError } = await supabase
          .from('products')
          .update(productValues)
          .eq('id', existingProduct.id)

        if (updateError) throw updateError
        return existingProduct
      }
    } else {
      let query = supabase
        .from('products')
        .select('id')
        .eq('name', name)

      query = brand ? query.eq('brand', brand) : query.is('brand', null)

      const { data: existingProducts, error: lookupError } =
        await query.limit(1)
      if (lookupError) throw lookupError
      if (existingProducts?.[0]) return existingProducts[0]
    }

    const { data: product, error: createError } = await supabase
      .from('products')
      .insert({
        user_id: session.user.id,
        barcode,
        ...productValues,
      })
      .select('id')
      .single()

    if (createError) throw createError
    return product
  }

  function lookupBarcodeProduct(barcode) {
    return lookupProductLocalFirst(barcode, async (normalizedBarcode) => {
      const { data: existingProducts, error: lookupError } = await supabase
        .from('products')
        .select('barcode, name, brand, image_url, category, source')
        .eq('user_id', session.user.id)
        .eq('barcode', normalizedBarcode)
        .limit(1)

      if (lookupError) throw lookupError
      return existingProducts?.[0] ?? null
    })
  }

  async function handleSave(form) {
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const product = await findOrCreateProduct(form)
      const isCalculated = form.expiryMode === 'calculate'
      const { error: batchError } = await supabase
        .from('inventory_batches')
        .insert({
          user_id: session.user.id,
          product_id: product.id,
          quantity: normalizeQuantity(form.quantity),
          unit: form.unit.trim(),
          production_date: isCalculated ? form.productionDate : null,
          shelf_life_value: isCalculated
            ? Number(form.shelfLifeValue)
            : null,
          shelf_life_unit: isCalculated ? form.shelfLifeUnit : null,
          expiry_date: form.expiryDate,
          storage_location: form.storageLocation.trim() || null,
          note: form.note.trim() || null,
          status: 'active',
        })

      if (batchError) throw batchError

      setMessage('库存批次已保存。')
      setView('home')
      await loadBatches()
      return true
    } catch (saveError) {
      setError(`保存失败：${saveError.message}`)
      return false
    } finally {
      setLoading(false)
    }
  }

  async function updateBatch(batchId, values) {
    setBusyBatchId(batchId)
    setError('')
    const { error: updateError } = await supabase
      .from('inventory_batches')
      .update(values)
      .eq('id', batchId)

    if (updateError) {
      setError(`更新库存失败：${updateError.message}`)
      setBusyBatchId(null)
      return false
    }

    await loadBatches()
    setBusyBatchId(null)
    return true
  }

  function handleDecrement(batch) {
    return updateBatch(batch.id, {
      quantity: decrementQuantity(batch.quantity),
    })
  }

  function handleUpdateQuantity(batchId, quantity) {
    try {
      return updateBatch(batchId, {
        quantity: normalizeQuantity(quantity),
      })
    } catch (quantityError) {
      setError(quantityError.message)
      return false
    }
  }

  function handleConsume(batchId) {
    return updateBatch(batchId, { status: 'consumed' })
  }

  if (missingSupabaseVariables.length > 0) {
    return <ConfigNotice missingVariables={missingSupabaseVariables} />
  }

  if (authLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-cream px-5">
        <p className="text-sm font-semibold text-leaf">正在准备你的库存空间…</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-cream pb-28">
      <div className="mx-auto max-w-xl px-4 pb-8 pt-6 sm:px-6">
        <header className="mb-5">
          <p className="text-xs font-semibold text-leaf">食品过期管理</p>
          {view === 'add' && (
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">
              添加一批库存
            </h1>
          )}
          {view === 'home' && (
            <p className="mt-2 text-sm leading-6 text-slate-500">
              每张卡片都是一个独立库存批次，按到期日从近到远排列。
            </p>
          )}
        </header>

        {error && (
          <div className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm leading-6 text-danger">
            {error}
          </div>
        )}
        {message && (
          <div className="mb-4 rounded-2xl bg-mint px-4 py-3 text-sm text-leaf">
            {message}
          </div>
        )}

        {view === 'add' ? (
          <AddBatchForm
            busy={loading}
            onCancel={() => setView('home')}
            onLookupBarcode={lookupBarcodeProduct}
            onSave={handleSave}
          />
        ) : (
          <section className="space-y-4">
            {loading && batches.length === 0 ? (
              <p className="py-12 text-center text-sm text-slate-500">
                正在读取库存…
              </p>
            ) : batches.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white/60 px-6 py-12 text-center">
                <p className="text-lg font-bold">还没有 active 库存</p>
                <p className="mt-2 text-sm text-slate-500">
                  添加第一批猫罐头、猫条或食品吧。
                </p>
              </div>
            ) : (
              batches.map((batch) => (
                <BatchCard
                  key={batch.id}
                  batch={batch}
                  busy={busyBatchId === batch.id}
                  onConsume={handleConsume}
                  onDecrement={handleDecrement}
                  onUpdateQuantity={handleUpdateQuantity}
                />
              ))
            )}
          </section>
        )}
      </div>

      {view === 'home' && (
        <div className="fixed inset-x-0 bottom-0 border-t border-white/80 bg-cream/90 px-4 py-4 backdrop-blur">
          <button
            className="mx-auto block w-full max-w-xl rounded-2xl bg-leaf px-5 py-4 text-center font-bold text-white shadow-card"
            type="button"
            onClick={() => {
              setError('')
              setMessage('')
              setView('add')
            }}
          >
            + 添加商品和库存批次
          </button>
        </div>
      )}
    </main>
  )
}
