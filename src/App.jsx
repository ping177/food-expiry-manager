import { useCallback, useEffect, useRef, useState } from 'react'
import AddBatchForm from './components/AddBatchForm'
import AuthPanel from './components/AuthPanel'
import BatchCard from './components/BatchCard'
import BatchDetail from './components/BatchDetail'
import ConfigNotice from './components/ConfigNotice'
import {
  getAccountStatus,
  getSessionTransition,
  loadInventoryBatchesForSession,
  restoreExistingSession,
  sendEmailOtp,
  signOutCurrentUser,
  startEmailOtpCooldown,
  verifyEmailOtp,
} from './lib/auth'
import { PRODUCT_CATEGORIES } from './lib/categories'
import { EXPIRY_WINDOW_OPTIONS } from './lib/expiryWindows'
import { filterInventoryBatches } from './lib/inventoryFilters'
import { decrementQuantity, normalizeQuantity } from './lib/inventory'
import { applyProductUpdateToBatches } from './lib/productEdit'
import {
  lookupProductByBarcode,
  lookupProductLocalFirst,
  normalizeBarcode,
} from './lib/productLookup'
import {
  missingSupabaseVariables,
  supabase,
} from './lib/supabase'

export const APP_DISPLAY_NAME = '库存保质期管理'

export default function App() {
  const [session, setSession] = useState(null)
  const [sessionUserId, setSessionUserId] = useState(null)
  const sessionRef = useRef(null)
  const cooldownCleanupRef = useRef(null)
  const [batches, setBatches] = useState([])
  const [view, setView] = useState('home')
  const [selectedBatchId, setSelectedBatchId] = useState(null)
  const [expiryWindowFilter, setExpiryWindowFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [authLoading, setAuthLoading] = useState(true)
  const [loading, setLoading] = useState(false)
  const [busyBatchId, setBusyBatchId] = useState(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [authBusy, setAuthBusy] = useState(false)
  const [emailOtpCooldown, setEmailOtpCooldown] = useState(0)
  const [pendingOtpEmail, setPendingOtpEmail] = useState('')

  const clearAccountScopedState = useCallback(() => {
    setBatches([])
    setView('home')
    setSelectedBatchId(null)
    setExpiryWindowFilter('all')
    setCategoryFilter('all')
    setSearchQuery('')
    setBusyBatchId(null)
    setMessage('')
  }, [])

  const applySession = useCallback(
    (nextSession) => {
      const { nextUserId, userChanged } = getSessionTransition(
        sessionRef.current,
        nextSession,
      )

      if (userChanged) {
        clearAccountScopedState()
        setLoading(false)
        setSessionUserId(nextUserId)
      }

      sessionRef.current = nextSession
      setSession(nextSession)
    },
    [clearAccountScopedState],
  )

  const loadBatches = useCallback(async (targetSession = sessionRef.current) => {
    if (!supabase) return

    if (!targetSession?.user?.id) {
      clearAccountScopedState()
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')
    const { data, error: queryError, stale } =
      await loadInventoryBatchesForSession({
        supabaseClient: supabase,
        session: targetSession,
        getCurrentUserId: () => sessionRef.current?.user?.id ?? null,
      })

    if (stale) return

    if (queryError) {
      setError(`读取库存失败：${queryError.message}`)
    } else {
      setBatches(data ?? [])
    }
    setLoading(false)
  }, [clearAccountScopedState])

  useEffect(() => {
    if (!supabase) return undefined

    let active = true
    let authEventSeen = false

    async function initializeSession() {
      const { session: existingSession, errorMessage } =
        await restoreExistingSession(supabase)

      if (!active) return
      if (errorMessage && !authEventSeen) setError(errorMessage)
      if (!authEventSeen) {
        applySession(existingSession)
      }
      setAuthLoading(false)
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) {
        authEventSeen = true
        applySession(nextSession)
        setAuthLoading(false)
      }
    })

    initializeSession()

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [applySession])

  useEffect(() => {
    if (sessionUserId) {
      loadBatches(sessionRef.current)
    }
  }, [sessionUserId, loadBatches])

  useEffect(
    () => () => {
      cooldownCleanupRef.current?.()
    },
    [],
  )

  async function handleSendEmailOtp(email) {
    if (!supabase || authBusy || emailOtpCooldown > 0) return false

    setAuthBusy(true)
    setError('')
    setMessage('')
    const result = await sendEmailOtp(supabase, email)

    if (result.ok) {
      setPendingOtpEmail(email.trim())
      cooldownCleanupRef.current?.()
      cooldownCleanupRef.current = startEmailOtpCooldown({
        setCooldownSeconds: setEmailOtpCooldown,
        setIntervalFn: window.setInterval.bind(window),
        clearIntervalFn: window.clearInterval.bind(window),
      })
    } else {
      setError(result.errorMessage)
    }

    setAuthBusy(false)
    return result.ok
  }

  async function handleVerifyEmailOtp(token) {
    if (!supabase || authBusy || !pendingOtpEmail) return false

    setAuthBusy(true)
    setError('')
    setMessage('')
    const result = await verifyEmailOtp(supabase, pendingOtpEmail, token)

    if (result.ok) {
      setPendingOtpEmail('')
      applySession(result.session)
    } else {
      setError(result.errorMessage)
    }

    setAuthBusy(false)
    return result.ok
  }

  async function handleSignOut() {
    if (!supabase) return false

    clearAccountScopedState()
    setLoading(false)
    setError('')
    setPendingOtpEmail('')
    const result = await signOutCurrentUser(supabase)
    if (!result.ok) {
      setError(result.errorMessage)
      return false
    }

    applySession(null)
    return true
  }

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
    return lookupProductLocalFirst(
      barcode,
      async (normalizedBarcode) => {
        const { data: existingProducts, error: lookupError } = await supabase
          .from('products')
          .select('barcode, name, brand, image_url, category, source')
          .eq('user_id', session.user.id)
          .eq('barcode', normalizedBarcode)
          .limit(1)

        if (lookupError) throw lookupError
        return existingProducts?.[0] ?? null
      },
      (normalizedBarcode) =>
        lookupProductByBarcode(normalizedBarcode, {
          invokeFunction: supabase.functions.invoke.bind(supabase.functions),
        }),
    )
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

  async function handleUpdateProduct(batchId, productId, values) {
    setBusyBatchId(batchId)
    setError('')
    setMessage('')

    const { data: product, error: updateError } = await supabase
      .from('products')
      .update(values)
      .eq('id', productId)
      .select('id, barcode, name, brand, image_url, category, source')
      .single()

    if (updateError) {
      setError(`更新商品信息失败：${updateError.message}`)
      setBusyBatchId(null)
      return false
    }

    setBatches((currentBatches) =>
      applyProductUpdateToBatches(currentBatches, product),
    )
    await loadBatches()
    setMessage('商品信息已更新。')
    setBusyBatchId(null)
    return true
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

  function handleDecrement(batch) {
    return updateBatch(batch.id, {
      quantity: decrementQuantity(batch.quantity),
    })
  }

  const filteredBatches = filterInventoryBatches(batches, {
    expiryWindow: expiryWindowFilter,
    category: categoryFilter,
    search: searchQuery,
  })
  const hasActiveBatches = batches.length > 0
  const hasActiveFilters =
    expiryWindowFilter !== 'all' ||
    categoryFilter !== 'all' ||
    searchQuery.trim() !== ''
  const selectedBatch = batches.find((batch) => batch.id === selectedBatchId)
  const accountStatus = getAccountStatus(session)

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

  if (!session) {
    return (
      <AuthPanel
        busy={authBusy}
        cooldownSeconds={emailOtpCooldown}
        error={error}
        message={message}
        onSendEmailOtp={handleSendEmailOtp}
        onVerifyEmailOtp={handleVerifyEmailOtp}
        pendingOtpEmail={pendingOtpEmail}
      />
    )
  }

  return (
    <main className="min-h-screen bg-cream pb-28">
      <div className="mx-auto max-w-xl px-4 pb-8 pt-6 sm:px-6">
        <header className="mb-5">
          <p className="text-xs font-semibold text-leaf">{APP_DISPLAY_NAME}</p>
          {view === 'add' && (
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">
              添加一批库存
            </h1>
          )}
          {view === 'detail' && (
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">
              库存详情
            </h1>
          )}
          {view === 'home' && (
            <p className="mt-2 text-sm leading-6 text-slate-500">
              每张卡片都是一个独立库存批次，按到期日从近到远排列。
            </p>
          )}
        </header>

        <section className="mb-4 rounded-3xl border border-white/70 bg-white p-4 shadow-card">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold text-ink">
                {accountStatus.label}
              </p>
              {accountStatus.type === 'anonymous' && (
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  访客数据可能因清浏览器数据、换浏览器或换设备而无法恢复。退出访客不会自动迁移数据。
                </p>
              )}
            </div>
            <button
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700"
              type="button"
              onClick={handleSignOut}
            >
              {accountStatus.type === 'anonymous'
                ? '退出访客并使用邮箱登录'
                : '退出登录'}
            </button>
          </div>
        </section>

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
        ) : view === 'detail' && selectedBatch ? (
          <BatchDetail
            batch={selectedBatch}
            busy={busyBatchId === selectedBatch.id}
            onBack={() => {
              setSelectedBatchId(null)
              setView('home')
            }}
            onConsume={async (batchId) => {
              const saved = await handleConsume(batchId)
              if (saved) {
                setSelectedBatchId(null)
                setView('home')
              }
              return saved
            }}
            onDecrement={handleDecrement}
            onUpdateProduct={handleUpdateProduct}
            onUpdateQuantity={handleUpdateQuantity}
          />
        ) : view === 'detail' ? (
          <section className="rounded-3xl bg-white p-6 text-center shadow-card">
            <p className="font-bold text-ink">这批库存当前不在 active 列表中。</p>
            <button
              className="mt-4 rounded-xl bg-leaf px-4 py-3 font-semibold text-white"
              type="button"
              onClick={() => {
                setSelectedBatchId(null)
                setView('home')
              }}
            >
              返回首页
            </button>
          </section>
        ) : (
          <section className="space-y-4">
            {hasActiveBatches && (
              <div className="space-y-3 rounded-3xl border border-white/70 bg-white p-4 shadow-card">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                    搜索
                  </span>
                  <input
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-ink placeholder:text-slate-400"
                    placeholder="商品名或品牌"
                    type="search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                  />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                      到期时间
                    </span>
                    <select
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-ink"
                      value={expiryWindowFilter}
                      onChange={(event) =>
                        setExpiryWindowFilter(event.target.value)
                      }
                    >
                      {EXPIRY_WINDOW_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                      分类
                    </span>
                    <select
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-ink"
                      value={categoryFilter}
                      onChange={(event) => setCategoryFilter(event.target.value)}
                    >
                      <option value="all">全部分类</option>
                      {PRODUCT_CATEGORIES.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            )}
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
            ) : filteredBatches.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white/60 px-6 py-10 text-center">
                <p className="text-lg font-bold">没有符合筛选的库存</p>
                <p className="mt-2 text-sm text-slate-500">
                  调整状态、分类或搜索关键词后再试。
                </p>
                {hasActiveFilters && (
                  <button
                    className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700"
                    type="button"
                    onClick={() => {
                      setExpiryWindowFilter('all')
                      setCategoryFilter('all')
                      setSearchQuery('')
                    }}
                  >
                    清除筛选
                  </button>
                )}
              </div>
            ) : (
              filteredBatches.map((batch) => (
                <BatchCard
                  key={batch.id}
                  batch={batch}
                  onSelect={(batchId) => {
                    setError('')
                    setMessage('')
                    setSelectedBatchId(batchId)
                    setView('detail')
                  }}
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
