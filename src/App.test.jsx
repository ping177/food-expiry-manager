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

  it('deletes only the current owned inventory batch and treats zero rows as a failure', () => {
    expect(appSource).toContain('function handleDeleteBatch(batchId)')
    expect(appSource).toContain(".from('inventory_batches')")
    expect(appSource).toContain('.delete()')
    expect(appSource).toContain(".eq('id', batchId)")
    expect(appSource).toContain(".eq('user_id', session.user.id)")
    expect(appSource).toContain(".select('id')")
    expect(appSource).toContain('.maybeSingle()')
    expect(appSource).toContain('批次已不存在或无权删除')
    expect(appSource).toContain('删除库存批次失败：${deleteError.message}')
    expect(appSource).toContain('setSelectedBatchId(null)')
    expect(appSource).toContain("setView('home')")
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
