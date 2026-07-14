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
