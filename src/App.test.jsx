import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { APP_DISPLAY_NAME } from './App'
import { createAuthSessionController } from './lib/auth'

describe('App display name', () => {
  it('shows the product as 库存保质期管理 in the UI', () => {
    expect(APP_DISPLAY_NAME).toBe('库存保质期管理')
  })
})

describe('App auth integration source guards', () => {
  const appSource = fs.readFileSync(
    path.join(process.cwd(), 'src/App.jsx'),
    'utf8',
  )

  it('does not create anonymous users when no session exists', () => {
    expect(appSource).not.toContain('signInAnonymously')
    expect(appSource).toContain('restoreExistingSession')
    expect(appSource).toContain('verifyEmailOtp')
    expect(appSource).not.toContain('emailRedirectTo')
  })

  it('registers and cleans up the Supabase auth state listener', () => {
    expect(appSource).toContain('onAuthStateChange')
    expect(appSource).toContain('subscription.unsubscribe()')
  })

  it('clears account-scoped state when the session user changes or signs out', () => {
    expect(appSource).toContain('clearAccountScopedState()')
    expect(appSource).toContain('applySession(null)')
  })

  it('does not clear an existing fallback image when a form image input is empty', () => {
    expect(appSource).not.toContain('image_url: form.imageUrl.trim() || null')
    expect(appSource).toContain('if (imageUrl) productValues.image_url = imageUrl')
  })

  it('uses size as part of the no-barcode product reuse key', () => {
    expect(appSource).toContain('const size = normalizeProductSize(form)')
    expect(appSource).toContain(".eq('size_value', size.size_value).eq('size_unit', size.size_unit)")
  })

  it('keeps authenticated navigation limited to inventory and account tabs', () => {
    expect(appSource).toContain(
      "import BottomTabNav from './components/BottomTabNav'",
    )
    expect(appSource).toContain("const [activeTab, setActiveTab] = useState('inventory')")
    expect(appSource).toContain("view === 'account'")
    expect(appSource).toContain('提醒设置')
    expect(appSource).toContain('数据导出')
    expect(appSource).toContain('偏好设置')
  })

  it('uses the bottom navigation as the only inventory add entry', () => {
    expect(appSource).toContain('onAdd={handleOpenAdd}')
    expect(appSource).not.toContain('+ 添加商品')
  })

  it('keeps the inventory header focused on its page title', () => {
    expect(appSource).toContain("view !== 'home' &&")
    expect(appSource).not.toContain(
      '每张卡片都是一个独立库存批次，按到期日从近到远排列。',
    )
  })

  it('wires inventory operation callbacks into BatchDetail without changing product edits', () => {
    expect(appSource).toContain('onUpdateProduct={handleUpdateProduct}')
    expect(appSource).toContain('onAddInventory={handleOpenAddInventory}')
    expect(appSource).toContain('onConsume={handleConsume}')
    expect(appSource).toContain('onMarkConsumed={handleMarkConsumed}')
    expect(appSource).toContain('onDeleteBatch={handleDeleteBatch}')
    expect(appSource).toContain('planInventoryAddition')
    expect(appSource).toContain("view === 'add-inventory'")
    expect(appSource).toContain(".update({ quantity: plan.quantity })")
    expect(appSource).toContain(".update({ quantity: normalizeQuantity(nextQuantity) })")
    expect(appSource).not.toContain('onUpdateQuantity={handleUpdateQuantity}')
    expect(appSource).not.toContain('onDecrement={handleDecrement}')
    expect(appSource).not.toContain('function handleUpdateQuantity')
    expect(appSource).not.toContain('function handleDecrement')
  })

  it('discards the current owned inventory batch instead of hard deleting it', () => {
    const deleteBatchSource = appSource.slice(
      appSource.indexOf('async function discardBatch'),
      appSource.indexOf('async function deleteArchivedBatch'),
    )

    expect(deleteBatchSource).toContain(".from('inventory_batches')")
    expect(deleteBatchSource).toContain(".update({ status: 'discarded' })")
    expect(deleteBatchSource).not.toContain('.delete()')
    expect(deleteBatchSource).toContain(".eq('id', batchId)")
    expect(deleteBatchSource).toContain(".eq('user_id', session.user.id)")
    expect(deleteBatchSource).toContain(".eq('status', 'active')")
    expect(deleteBatchSource).toContain(".select('id')")
    expect(deleteBatchSource).toContain('.maybeSingle()')
    expect(deleteBatchSource).toContain('批次已不存在或无权删除')
    expect(deleteBatchSource).toContain('删除库存批次失败：${updateError.message}')
    expect(deleteBatchSource).toContain('setSelectedBatchId(null)')
    expect(deleteBatchSource).toContain("setView('home')")
    expect(appSource).toContain('async function deleteArchivedBatch')
    expect(appSource).toContain('.delete()')
    expect(appSource).toContain(".in('status', ['consumed', 'discarded'])")
    const archivedDeleteSource = appSource.slice(
      appSource.indexOf('async function deleteArchivedBatch'),
      appSource.indexOf('function handleDeleteBatch'),
    )
    expect(archivedDeleteSource).toContain('.delete()')
    expect(archivedDeleteSource).toContain(".in('status', ['consumed', 'discarded'])")
    expect(archivedDeleteSource).not.toContain(".update({ status: 'discarded' })")
  })

  it('keeps Archive in a separate consumed and discarded query and navigation state', () => {
    expect(appSource).toContain('archivedBatches')
    expect(appSource).toContain("statuses: ['consumed', 'discarded']")
    expect(appSource).toContain("orderBy: 'updated_at'")
    expect(appSource).toContain("view === 'archive'")
    expect(appSource).toContain('SidebarDrawer')
    expect(appSource).toContain("onDeleteBatch={handleDeleteArchivedBatch}")
  })

  it('guards product deletion with an authoritative RPC and refreshes both lists', () => {
    expect(appSource).toContain("from './lib/productDeletion'")
    expect(appSource).toContain('checkProductActiveStatus')
    expect(appSource).toContain('deleteProductWithHistory')
    expect(appSource).toContain('retryProductImageCleanup')
    expect(appSource).toContain('deleteProductWithHistory({')
    expect(appSource).toContain('blocked_active')
    expect(appSource).toContain('cleanup_pending')
    expect(appSource).toContain('setSelectedArchiveBatchId(null)')
    expect(appSource).toContain('await loadArchivedBatches()')
    expect(appSource).toContain('await loadBatches()')
    expect(appSource).toContain('onDeleteProduct={handleDeleteProduct}')
  })

  it('keeps standalone image cleanup failures visible and retryable when a path is safe', () => {
    expect(appSource).toContain('cleanupStatus: result.cleanupStatus')
    expect(appSource).toContain('cleanupReason: result.cleanupReason')
    expect(appSource).toContain('pendingProductCleanup?.imagePath')
    expect(appSource).toContain('无法安全定位旧上传图片')
    expect(appSource).toContain('可在本次会话中重试')
  })

  it('hardens consume and mark-consumed writes against zero-row updates', () => {
    expect(appSource).toContain(".eq('quantity', 0)")
    expect(appSource).toContain('requireAffectedBatch(updatedBatch)')
    expect(appSource).toContain('requireAffectedBatch(consumedBatch)')
  })
})

describe('App auth session behavior model', () => {
  function createSession(user) {
    return { user }
  }

  it('loads inventory once when getSession and the listener provide the same user', () => {
    const loadUserIds = []
    const controller = createAuthSessionController({
      onUserChange: ({ nextUserId }) => {
        if (nextUserId) loadUserIds.push(nextUserId)
      },
    })

    controller.applySession(createSession({ id: 'user-a', email: 'a@example.com' }))
    controller.applySession(
      createSession({ id: 'user-a', email: 'a@example.com', access_token: 'new' }),
    )

    expect(loadUserIds).toEqual(['user-a'])
  })

  it('clears account state for user switching, sign-out, and anonymous-to-email transitions', () => {
    const clearedForTransitions = []
    const loadUserIds = []
    const controller = createAuthSessionController({
      onUserChange: ({ previousUserId, nextUserId }) => {
        clearedForTransitions.push([previousUserId, nextUserId])
        if (nextUserId) loadUserIds.push(nextUserId)
      },
    })

    controller.applySession(createSession({ id: 'user-a', email: 'a@example.com' }))
    controller.applySession(createSession({ id: 'user-b', email: 'b@example.com' }))
    controller.applySession(null)
    controller.applySession(createSession({ id: 'anon-a', is_anonymous: true }))
    controller.applySession(createSession({ id: 'email-c', email: 'c@example.com' }))

    expect(clearedForTransitions).toEqual([
      [null, 'user-a'],
      ['user-a', 'user-b'],
      ['user-b', null],
      [null, 'anon-a'],
      ['anon-a', 'email-c'],
    ])
    expect(loadUserIds).toEqual(['user-a', 'user-b', 'anon-a', 'email-c'])
  })
})
