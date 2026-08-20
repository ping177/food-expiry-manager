import { useCallback, useEffect, useRef, useState } from 'react'
import AddBatchForm from './components/AddBatchForm'
import AddInventoryForm from './components/AddInventoryForm'
import ArchivePage from './components/ArchivePage'
import AuthPanel from './components/AuthPanel'
import BatchCard from './components/BatchCard'
import BatchDetail from './components/BatchDetail'
import BottomTabNav from './components/BottomTabNav'
import ConfigNotice from './components/ConfigNotice'
import SidebarDrawer from './components/SidebarDrawer'
import {
  getAccountStatus,
  getSessionTransition,
  loadInventoryBatchesForSession,
  maskEmail,
  restoreExistingSession,
  sendEmailOtp,
  signOutCurrentUser,
  startEmailOtpCooldown,
  verifyEmailOtp,
} from './lib/auth'
import { PRODUCT_CATEGORIES } from './lib/categories'
import { EXPIRY_WINDOW_OPTIONS } from './lib/expiryWindows'
import { filterInventoryBatches } from './lib/inventoryFilters'
import {
  createConsumedStatusUpdate,
  planInventoryAddition,
  normalizeQuantity,
  requireAffectedBatch,
} from './lib/inventory'
import { applyProductUpdateToBatches } from './lib/productEdit'
import { normalizeProductSize } from './lib/productSize'
import {
  lookupProductByBarcode,
  lookupProductLocalFirst,
  normalizeBarcode,
} from './lib/productLookup'
import {
  missingSupabaseVariables,
  supabase,
} from './lib/supabase'
import {
  deleteProductUserImage,
  uploadAndReplaceProductImage,
} from './lib/productImage'
import {
  checkProductActiveStatus,
  deleteProductWithHistory,
  retryProductImageCleanup,
} from './lib/productDeletion'

export const APP_DISPLAY_NAME = '库存保质期管理'

export default function App() {
  const [session, setSession] = useState(null)
  const [sessionUserId, setSessionUserId] = useState(null)
  const sessionRef = useRef(null)
  const cooldownCleanupRef = useRef(null)
  const [batches, setBatches] = useState([])
  const [archivedBatches, setArchivedBatches] = useState([])
  const [view, setView] = useState('home')
  const [activeTab, setActiveTab] = useState('inventory')
  const [selectedBatchId, setSelectedBatchId] = useState(null)
  const [selectedArchiveBatchId, setSelectedArchiveBatchId] = useState(null)
  const [expiryWindowFilter, setExpiryWindowFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [archiveCategoryFilter, setArchiveCategoryFilter] = useState('all')
  const [archiveSearchQuery, setArchiveSearchQuery] = useState('')
  const [authLoading, setAuthLoading] = useState(true)
  const [loading, setLoading] = useState(false)
  const [archiveLoading, setArchiveLoading] = useState(false)
  const [archiveError, setArchiveError] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [busyBatchId, setBusyBatchId] = useState(null)
  const [productDeleteBusy, setProductDeleteBusy] = useState(false)
  const [productDeleteGuard, setProductDeleteGuard] = useState({
    productId: null,
    status: 'idle',
    error: null,
  })
  const [pendingProductCleanup, setPendingProductCleanup] = useState(null)
  const [productCleanupBusy, setProductCleanupBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [authBusy, setAuthBusy] = useState(false)
  const [emailOtpCooldown, setEmailOtpCooldown] = useState(0)
  const [pendingOtpEmail, setPendingOtpEmail] = useState('')
  const productDeleteGuardRequestRef = useRef(0)
  const handleCloseSidebar = useCallback(() => {
    setSidebarOpen(false)
  }, [])

  const clearAccountScopedState = useCallback(() => {
    setBatches([])
    setArchivedBatches([])
    setView('home')
    setActiveTab('inventory')
    setSelectedBatchId(null)
    setSelectedArchiveBatchId(null)
    setExpiryWindowFilter('all')
    setCategoryFilter('all')
    setSearchQuery('')
    setArchiveCategoryFilter('all')
    setArchiveSearchQuery('')
    setBusyBatchId(null)
    setProductDeleteBusy(false)
    setProductDeleteGuard({ productId: null, status: 'idle', error: null })
    setPendingProductCleanup(null)
    setProductCleanupBusy(false)
    setMessage('')
    setArchiveLoading(false)
    setArchiveError('')
    setSidebarOpen(false)
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

  const loadArchivedBatches = useCallback(
    async (targetSession = sessionRef.current) => {
      if (!supabase) return

      if (!targetSession?.user?.id) {
        setArchivedBatches([])
        setArchiveLoading(false)
        return
      }

      setArchiveLoading(true)
      setArchiveError('')
      const { data, error: queryError, stale } =
        await loadInventoryBatchesForSession({
          supabaseClient: supabase,
          session: targetSession,
          getCurrentUserId: () => sessionRef.current?.user?.id ?? null,
          statuses: ['consumed', 'discarded'],
          orderBy: 'updated_at',
          ascending: false,
        })

      if (stale) return

      if (queryError) {
        setArchiveError(`读取已归档失败：${queryError.message}`)
      } else {
        setArchivedBatches(data ?? [])
      }
      setArchiveLoading(false)
    },
    [],
  )

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

  function handleTabChange(nextTab) {
    setError('')
    setMessage('')
    setSelectedBatchId(null)
    setSelectedArchiveBatchId(null)
    productDeleteGuardRequestRef.current += 1
    setProductDeleteGuard({ productId: null, status: 'idle', error: null })
    setSidebarOpen(false)
    setActiveTab(nextTab)
    setView(nextTab === 'account' ? 'account' : 'home')
  }

  function handleSidebarNavigate(nextSection) {
    setError('')
    setMessage('')
    setSelectedBatchId(null)
    setSelectedArchiveBatchId(null)
    productDeleteGuardRequestRef.current += 1
    setProductDeleteGuard({ productId: null, status: 'idle', error: null })
    setSidebarOpen(false)
    setActiveTab('inventory')

    if (nextSection === 'archive') {
      setView('archive')
      loadArchivedBatches()
      return
    }

    setView('home')
  }

  async function handleOpenArchiveDetail(batchId) {
    setError('')
    setMessage('')
    setSelectedArchiveBatchId(batchId)
    setSidebarOpen(false)
    setView('archive-detail')

    const selectedBatch = archivedBatches.find((batch) => batch.id === batchId)
    const productId = selectedBatch?.product?.id
    const userId = sessionRef.current?.user?.id
    const requestId = productDeleteGuardRequestRef.current + 1
    productDeleteGuardRequestRef.current = requestId

    if (!productId || !userId) {
      setProductDeleteGuard({ productId: null, status: 'error', error: new Error('商品状态检查参数无效。') })
      return
    }

    setProductDeleteGuard({ productId, status: 'loading', error: null })
    const result = await checkProductActiveStatus({
      supabaseClient: supabase,
      userId,
      productId,
    })
    if (
      requestId !== productDeleteGuardRequestRef.current ||
      sessionRef.current?.user?.id !== userId
    ) {
      return
    }
    setProductDeleteGuard({
      productId,
      status: result.status,
      error: result.error ?? null,
    })
  }

  function handleBackToArchive() {
    productDeleteGuardRequestRef.current += 1
    setProductDeleteGuard({ productId: null, status: 'idle', error: null })
    setSelectedArchiveBatchId(null)
    setView('archive')
  }

  function handleOpenAdd() {
    setError('')
    setMessage('')
    setSelectedBatchId(null)
    setSelectedArchiveBatchId(null)
    productDeleteGuardRequestRef.current += 1
    setProductDeleteGuard({ productId: null, status: 'idle', error: null })
    setSidebarOpen(false)
    setActiveTab('inventory')
    setView('add')
  }

  function handleOpenAddInventory(batch) {
    setError('')
    setMessage('')
    setSelectedArchiveBatchId(null)
    productDeleteGuardRequestRef.current += 1
    setProductDeleteGuard({ productId: null, status: 'idle', error: null })
    setSidebarOpen(false)
    setActiveTab('inventory')
    setSelectedBatchId(batch.id)
    setView('add-inventory')
  }

  async function findOrCreateProduct(form) {
    const barcode = normalizeBarcode(form.barcode) || null
    const name = form.productName.trim()
    const brand = form.brand.trim()
    const size = normalizeProductSize(form)
    const productValues = {
      name,
      brand: brand || null,
      ...size,
      category: form.category.trim() || null,
      source: form.source || 'manual',
    }
    const imageUrl = form.imageUrl.trim()
    if (imageUrl) productValues.image_url = imageUrl

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
      query = size.size_value === null
        ? query.is('size_value', null).is('size_unit', null)
        : query.eq('size_value', size.size_value).eq('size_unit', size.size_unit)

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
          .select('barcode, name, brand, size_value, size_unit, image_url, user_image_url, category, source')
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

      if (form.pendingImageFile) {
        try {
          const result = await uploadAndReplaceProductImage({
            supabaseClient: supabase,
            userId: session.user.id,
            productId: product.id,
            file: form.pendingImageFile,
          })
          if (result.cleanupError) {
            setMessage('库存批次已保存，图片已更新；旧图片清理失败，可稍后重试。')
          } else {
            setMessage('库存批次和商品图片已保存。')
          }
        } catch {
          setMessage('库存已保存，图片未上传，可在详情页重试。')
        }
      } else {
        setMessage('库存批次已保存。')
      }
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

  async function handleAddInventory(form) {
    const currentBatch = batches.find((batch) => batch.id === selectedBatchId)
    if (!currentBatch?.product?.id) return false

    setLoading(true)
    setError('')
    setMessage('')

    try {
      const plan = planInventoryAddition({
        batches,
        productId: currentBatch.product.id,
        expiryDate: form.expiryDate,
        quantity: form.quantity,
        unit: currentBatch.unit,
        storageLocation: currentBatch.storage_location,
      })

      if (plan.action === 'merge') {
        const { error: updateError } = await supabase
          .from('inventory_batches')
          .update({ quantity: plan.quantity })
          .eq('id', plan.batchId)
          .eq('status', 'active')

        if (updateError) throw updateError
        setMessage('新增库存已合并到现有批次。')
      } else {
        const { error: createError } = await supabase
          .from('inventory_batches')
          .insert({
            user_id: session.user.id,
            ...plan.values,
          })

        if (createError) throw createError
        setMessage('新增库存批次已保存。')
      }

      setView('detail')
      await loadBatches()
      return true
    } catch (saveError) {
      setError(`新增库存失败：${saveError.message}`)
      return false
    } finally {
      setLoading(false)
    }
  }

  async function handleUpdateProduct(batchId, productId, values) {
    setBusyBatchId(batchId)
    setError('')
    setMessage('')

    const { data: product, error: updateError } = await supabase
      .from('products')
      .update(values)
      .eq('id', productId)
      .select('id, barcode, name, brand, size_value, size_unit, image_url, user_image_url, category, source')
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

  async function handleConsume(batchId, nextQuantity) {
    setBusyBatchId(batchId)
    setError('')
    setMessage('')

    try {
      const { data: updatedBatch, error: updateError } = await supabase
        .from('inventory_batches')
        .update({ quantity: normalizeQuantity(nextQuantity) })
        .eq('id', batchId)
        .eq('status', 'active')
        .select('id')
        .maybeSingle()

      if (updateError) throw updateError
      requireAffectedBatch(updatedBatch)

      await loadBatches()
      setMessage('库存已更新。')
      return true
    } catch (updateError) {
      setError(`消耗库存失败：${updateError.message}`)
      return false
    } finally {
      setBusyBatchId(null)
    }
  }

  async function handleMarkConsumed(batchId) {
    setBusyBatchId(batchId)
    setError('')
    setMessage('')

    try {
      const currentBatch = batches.find((batch) => batch.id === batchId)
      const statusUpdate = createConsumedStatusUpdate(currentBatch?.quantity)
      const { data: consumedBatch, error: updateError } = await supabase
        .from('inventory_batches')
        .update(statusUpdate)
        .eq('id', batchId)
        .eq('status', 'active')
        .eq('quantity', 0)
        .select('id')
        .maybeSingle()

      if (updateError) throw updateError
      requireAffectedBatch(consumedBatch)

      setSelectedBatchId(null)
      setView('home')
      await loadBatches()
      setMessage('批次已标记为已消耗。')
      return true
    } catch (updateError) {
      setError(`标记已消耗失败：${updateError.message}`)
      return false
    } finally {
      setBusyBatchId(null)
    }
  }

  async function discardBatch(batchId) {
    setBusyBatchId(batchId)
    setError('')
    setMessage('')

    try {
      const { data: discardedBatch, error: updateError } = await supabase
        .from('inventory_batches')
        .update({ status: 'discarded' })
        .eq('id', batchId)
        .eq('user_id', session.user.id)
        .eq('status', 'active')
        .select('id')
        .maybeSingle()

      if (updateError) throw updateError
      if (!discardedBatch) {
        throw new Error('批次已不存在或无权删除')
      }

      setBatches((currentBatches) =>
        currentBatches.filter((batch) => batch.id !== batchId),
      )
      setSelectedBatchId(null)
      setView('home')
      setMessage('库存批次已移入已归档并标记为已删除；商品信息和图片已保留。')
      await Promise.all([loadBatches(), loadArchivedBatches()])
      return true
    } catch (updateError) {
      setError(`删除库存批次失败：${updateError.message}`)
      return false
    } finally {
      setBusyBatchId(null)
    }
  }

  async function deleteArchivedBatch(batchId) {
    setBusyBatchId(batchId)
    setError('')
    setMessage('')

    try {
      const { data: deletedBatch, error: deleteError } = await supabase
        .from('inventory_batches')
        .delete()
        .eq('id', batchId)
        .eq('user_id', session.user.id)
        .in('status', ['consumed', 'discarded'])
        .select('id')
        .maybeSingle()

      if (deleteError) throw deleteError
      if (!deletedBatch) {
        throw new Error('批次已不存在或无权删除')
      }

      setArchivedBatches((currentBatches) =>
        currentBatches.filter((batch) => batch.id !== batchId),
      )
      setSelectedArchiveBatchId(null)
      setView('archive')
      setMessage('历史库存批次已删除；商品信息和图片已保留。')
      await loadArchivedBatches()
      return true
    } catch (deleteError) {
      setError(`删除库存批次失败：${deleteError.message}`)
      return false
    } finally {
      setBusyBatchId(null)
    }
  }

  function handleDeleteBatch(batchId) {
    return discardBatch(batchId)
  }

  function handleDeleteArchivedBatch(batchId) {
    return deleteArchivedBatch(batchId)
  }

  async function handleDeleteProduct(product) {
    const userId = sessionRef.current?.user?.id
    if (!userId || !product?.id) {
      return { outcome: 'error', error: new Error('商品删除参数无效。') }
    }
    if (
      productDeleteGuard.productId !== product.id ||
      productDeleteGuard.status !== 'clear'
    ) {
      return {
        outcome: 'error',
        error: new Error('当前库存状态尚未确认，暂不能删除整个商品。'),
      }
    }

    setProductDeleteBusy(true)
    setError('')
    setMessage('')

    try {
      const result = await deleteProductWithHistory({
        supabaseClient: supabase,
        userId,
        product,
      })

      if (sessionRef.current?.user?.id !== userId) {
        return {
          outcome: 'error',
          error: new Error('登录状态已变化，请重新打开已归档详情。'),
        }
      }

      if (result.outcome === 'blocked_active') {
        setProductDeleteGuard({
          productId: product.id,
          status: 'active',
          error: null,
        })
        await Promise.all([loadBatches(), loadArchivedBatches()])
        setError('该商品仍有当前库存，请先处理当前库存后再删除整个商品。')
        return result
      }

      if (result.outcome === 'not_found') {
        await Promise.all([loadBatches(), loadArchivedBatches()])
        setError('商品不存在或无权删除。')
        return result
      }

      if (result.outcome !== 'deleted' && result.outcome !== 'cleanup_pending') {
        setError('删除整个商品失败，请稍后重试。')
        return result
      }

      setArchivedBatches((currentBatches) =>
        currentBatches.filter((batch) => batch.product?.id !== product.id),
      )
      setSelectedArchiveBatchId(null)
      setProductDeleteGuard({ productId: null, status: 'idle', error: null })
      setView('archive')

      if (result.outcome === 'cleanup_pending') {
        setPendingProductCleanup({
          userId,
          productId: product.id,
          imagePath: result.imagePath ?? null,
          cleanupReason: result.cleanupReason ?? 'storage_error',
        })
        setMessage(
          result.cleanupReason === 'invalid_path'
            ? '商品及历史批次已删除，但无法安全定位用户图片；未尝试删除，请检查 Storage。'
            : '商品及历史批次已删除，但用户图片清理失败；可在本次会话中重试。',
        )
      } else {
        setPendingProductCleanup(null)
        setMessage('整个商品及历史批次已删除。')
      }

      await Promise.all([loadArchivedBatches(), loadBatches()])
      return result
    } catch (deleteError) {
      setError('删除整个商品失败，请稍后重试。')
      return { outcome: 'error', error: deleteError }
    } finally {
      setProductDeleteBusy(false)
    }
  }

  async function handleRetryProductCleanup() {
    if (!pendingProductCleanup?.imagePath || productCleanupBusy) return false

    const retryUserId = pendingProductCleanup.userId
    setProductCleanupBusy(true)
    setError('')
    const result = await retryProductImageCleanup({
      supabaseClient: supabase,
      ...pendingProductCleanup,
    })

    if (sessionRef.current?.user?.id !== retryUserId) {
      setProductCleanupBusy(false)
      return false
    }

    if (result.ok) {
      setPendingProductCleanup(null)
      setMessage('用户图片已清理。')
    } else {
      setError('商品删除已完成，但用户图片清理仍失败，请稍后重试。')
    }
    setProductCleanupBusy(false)
    return result.ok
  }

  async function handleUpdateProductImage(batchId, product, file) {
    setBusyBatchId(batchId)
    setError('')
    try {
      const result = await uploadAndReplaceProductImage({
        supabaseClient: supabase,
        userId: session.user.id,
        productId: product.id,
        file,
        previousUserImageUrl: product.user_image_url,
      })
      setBatches((current) => applyProductUpdateToBatches(current, result.product))
      if (result.cleanupError) {
        setPendingProductCleanup({
          userId: session.user.id,
          productId: product.id,
          imagePath: result.cleanupPath ?? null,
          cleanupReason: result.cleanupReason ?? 'storage_error',
        })
        setMessage(
          result.cleanupReason === 'invalid_path'
            ? '图片已更换，但无法安全定位旧图片；未尝试删除，请检查 Storage。'
            : '图片已更换，但旧图片清理失败；可在本次会话中重试。',
        )
      } else {
        setPendingProductCleanup(null)
        setMessage('商品图片已更新。')
      }
      await loadBatches()
      return {
        ok: true,
        cleanupError: result.cleanupError,
        cleanupStatus: result.cleanupStatus,
      }
    } catch (imageError) {
      setError(imageError.message)
      return { ok: false }
    } finally {
      setBusyBatchId(null)
    }
  }

  async function handleDeleteProductImage(batchId, product) {
    setBusyBatchId(batchId)
    setError('')
    try {
      const result = await deleteProductUserImage({
        supabaseClient: supabase,
        userId: session.user.id,
        product,
      })
      setBatches((current) => applyProductUpdateToBatches(current, result.product))
      if (result.cleanupError) {
        setPendingProductCleanup({
          userId: session.user.id,
          productId: product.id,
          imagePath: result.cleanupPath ?? null,
          cleanupReason: result.cleanupReason ?? 'storage_error',
        })
        setMessage(
          result.cleanupReason === 'invalid_path'
            ? '已恢复外部图片，但无法安全定位旧上传图片；未尝试删除，请检查 Storage。'
            : '已恢复外部图片，但旧上传图片清理失败；可在本次会话中重试。',
        )
      } else {
        setPendingProductCleanup(null)
        setMessage('已删除用户图片。')
      }
      await loadBatches()
      return {
        ok: true,
        cleanupError: result.cleanupError,
        cleanupStatus: result.cleanupStatus,
      }
    } catch (imageError) {
      setError(imageError.message)
      return { ok: false }
    } finally {
      setBusyBatchId(null)
    }
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
  const selectedArchivedBatch = archivedBatches.find(
    (batch) => batch.id === selectedArchiveBatchId,
  )
  const accountStatus = getAccountStatus(session)
  const accountEmailLabel =
    accountStatus.type === 'email' && session.user.email
      ? maskEmail(session.user.email)
      : accountStatus.label

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
    <main className="min-h-screen bg-cream pb-[calc(5rem+env(safe-area-inset-bottom))]">
      <div className="mx-auto max-w-xl px-4 pb-8 pt-6 sm:px-6">
        <header className="mb-5">
          {view !== 'home' && view !== 'archive' && (
            <p className="text-xs font-semibold text-leaf">{APP_DISPLAY_NAME}</p>
          )}
          {(view === 'home' || view === 'archive') && (
            <div className="flex items-center gap-3">
              <button
                aria-label="打开菜单"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl text-slate-600 transition hover:bg-white/70 active:scale-95"
                type="button"
                onClick={() => setSidebarOpen(true)}
              >
                <span aria-hidden="true">☰</span>
              </button>
              <h1 className="text-2xl font-bold tracking-tight text-ink">
                {view === 'archive' ? '已归档' : '库存'}
              </h1>
            </div>
          )}
          {view === 'add' && (
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">
              添加一批库存
            </h1>
          )}
          {view === 'add-inventory' && (
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">
              新增库存
            </h1>
          )}
          {view === 'detail' && (
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">
              库存详情
            </h1>
          )}
          {view === 'archive-detail' && (
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">
              已归档详情
            </h1>
          )}
          {view === 'account' && (
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">
              我的
            </h1>
          )}
          {view === 'account' && (
            <p className="mt-2 text-sm leading-6 text-slate-500">
              管理当前账号，并查看后续设置入口。
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
            <p>{message}</p>
            {pendingProductCleanup?.imagePath && (
              <button
                className="mt-3 rounded-xl border border-leaf px-3 py-2 font-semibold text-leaf disabled:opacity-50"
                disabled={productCleanupBusy}
                type="button"
                onClick={handleRetryProductCleanup}
              >
                {productCleanupBusy ? '清理中…' : '重试清理用户图片'}
              </button>
            )}
          </div>
        )}

        {view === 'account' ? (
          <section className="space-y-4">
            <section className="rounded-3xl border border-white/70 bg-white p-5 shadow-card">
              <p className="text-sm font-semibold text-leaf">账号</p>
              <p className="mt-4 text-xs font-semibold text-slate-500">
                当前登录邮箱
              </p>
              <p className="mt-1 break-all text-lg font-bold text-ink">
                {accountEmailLabel}
              </p>
              {accountStatus.type === 'anonymous' && (
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  访客数据可能因清浏览器数据、换浏览器或换设备而无法恢复。退出访客不会自动迁移数据。
                </p>
              )}
              <button
                className="mt-5 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
                type="button"
                onClick={handleSignOut}
              >
                {accountStatus.type === 'anonymous'
                  ? '退出访客并使用邮箱登录'
                  : '退出登录'}
              </button>
            </section>

            <section className="rounded-3xl border border-white/70 bg-white p-5 shadow-card">
              <h2 className="font-bold text-ink">更多设置</h2>
              <div className="mt-3 divide-y divide-slate-100">
                {['提醒设置', '数据导出', '偏好设置'].map((item) => (
                  <button
                    key={item}
                    className="flex w-full items-center justify-between gap-3 py-3 text-left text-sm font-semibold text-slate-400 disabled:cursor-not-allowed"
                    disabled
                    type="button"
                  >
                    <span>{item}</span>
                    <span className="text-xs font-medium text-slate-400">
                      开发中
                    </span>
                  </button>
                ))}
              </div>
            </section>
          </section>
        ) : view === 'archive' ? (
          <ArchivePage
            batches={archivedBatches}
            categoryFilter={archiveCategoryFilter}
            error={archiveError}
            loading={archiveLoading}
            onCategoryChange={setArchiveCategoryFilter}
            onRetry={() => loadArchivedBatches()}
            onSearchChange={setArchiveSearchQuery}
            onSelect={handleOpenArchiveDetail}
            searchQuery={archiveSearchQuery}
          />
        ) : view === 'archive-detail' && selectedArchivedBatch ? (
          <BatchDetail
            archiveMode
            batch={selectedArchivedBatch}
            busy={busyBatchId === selectedArchivedBatch.id}
            onDeleteProduct={handleDeleteProduct}
            onBack={handleBackToArchive}
            onDeleteBatch={handleDeleteArchivedBatch}
            productDeleteBusy={productDeleteBusy}
            productDeleteGuard={productDeleteGuard}
          />
        ) : view === 'archive-detail' ? (
          <section className="rounded-3xl bg-white p-6 text-center shadow-card">
            <p className="font-bold text-ink">这条历史批次当前不在已归档列表中。</p>
            <button
              className="mt-4 rounded-xl bg-leaf px-4 py-3 font-semibold text-white"
              type="button"
              onClick={handleBackToArchive}
            >
              返回已归档
            </button>
          </section>
        ) : view === 'add' ? (
          <AddBatchForm
            busy={loading}
            onCancel={() => setView('home')}
            onLookupBarcode={lookupBarcodeProduct}
            onSave={handleSave}
          />
        ) : view === 'add-inventory' && selectedBatch ? (
          <AddInventoryForm
            busy={loading}
            onCancel={() => setView('detail')}
            onSave={handleAddInventory}
            product={selectedBatch.product}
            unit={selectedBatch.unit}
          />
        ) : view === 'detail' && selectedBatch ? (
          <BatchDetail
            batch={selectedBatch}
            busy={busyBatchId === selectedBatch.id}
            onBack={() => {
              setSelectedBatchId(null)
              setView('home')
            }}
            onUpdateProduct={handleUpdateProduct}
            onUpdateProductImage={handleUpdateProductImage}
            onDeleteProductImage={handleDeleteProductImage}
            onAddInventory={handleOpenAddInventory}
            onConsume={handleConsume}
            onMarkConsumed={handleMarkConsumed}
            onDeleteBatch={handleDeleteBatch}
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

      {(view === 'home' || view === 'archive') && (
        <SidebarDrawer
          activeSection={view === 'archive' ? 'archive' : 'inventory'}
          onClose={handleCloseSidebar}
          onNavigate={handleSidebarNavigate}
          open={sidebarOpen}
        />
      )}

      {(view === 'home' || view === 'archive' || view === 'account') && (
        <BottomTabNav
          activeTab={activeTab}
          onAdd={handleOpenAdd}
          onChange={handleTabChange}
        />
      )}
    </main>
  )
}
