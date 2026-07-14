import { describe, expect, it, vi } from 'vitest'
import {
  EMAIL_OTP_COOLDOWN_SECONDS,
  createAuthSessionController,
  getAccountStatus,
  isAnonymousUser,
  loadInventoryBatchesForSession,
  maskEmail,
  restoreExistingSession,
  sendEmailOtp,
  signOutCurrentUser,
  startEmailOtpCooldown,
  validateEmailOtp,
  validateEmail,
  verifyEmailOtp,
} from './auth'

function createSession(user) {
  return { user }
}

function createDeferred() {
  let resolve
  const promise = new Promise((innerResolve) => {
    resolve = innerResolve
  })
  return { promise, resolve }
}

function createQueryFromPromise(promise) {
  promise.select = vi.fn(() => promise)
  promise.eq = vi.fn(() => promise)
  promise.order = vi.fn(() => promise)
  return promise
}

describe('auth helpers', () => {
  it('identifies anonymous users from Supabase user metadata instead of only missing email', () => {
    expect(isAnonymousUser({ id: 'anon', is_anonymous: true })).toBe(true)
    expect(
      isAnonymousUser({
        id: 'anon',
        app_metadata: { provider: 'anonymous' },
      }),
    ).toBe(true)
    expect(
      isAnonymousUser({
        id: 'anon',
        identities: [{ provider: 'anonymous' }],
      }),
    ).toBe(true)
    expect(isAnonymousUser({ id: 'email-user', email: 'me@example.com' })).toBe(
      false,
    )
  })

  it('builds account status labels for anonymous and email sessions', () => {
    expect(getAccountStatus(null)).toEqual({
      type: 'signed_out',
      label: '未登录',
    })
    expect(getAccountStatus(createSession({ is_anonymous: true })).type).toBe(
      'anonymous',
    )
    expect(
      getAccountStatus(createSession({ email: 'alice@example.com' })),
    ).toEqual({
      type: 'email',
      label: '邮箱账号已登录：a***@example.com',
    })
  })

  it('masks email without exposing the full mailbox name', () => {
    expect(maskEmail('a@example.com')).toBe('*@example.com')
    expect(maskEmail('alex@example.com')).toBe('a***@example.com')
  })

  it('validates only the minimal email shape before sending email OTPs', () => {
    expect(validateEmail('')).toBe('请输入邮箱地址。')
    expect(validateEmail('not-an-email')).toBe('请输入有效的邮箱地址。')
    expect(validateEmail(' user@example.com ')).toBe('')
  })

  it('restores existing sessions without creating anonymous users', async () => {
    const session = createSession({ id: 'email-user', email: 'me@example.com' })
    const supabaseClient = {
      auth: {
        getSession: vi.fn(async () => ({ data: { session }, error: null })),
        signInAnonymously: vi.fn(),
      },
    }

    await expect(restoreExistingSession(supabaseClient)).resolves.toEqual({
      session,
      errorMessage: '',
    })
    expect(supabaseClient.auth.signInAnonymously).not.toHaveBeenCalled()
  })

  it('updates same-user sessions without treating them as account changes', () => {
    const sessionUpdates = []
    const userChanges = []
    const controller = createAuthSessionController({
      onSessionUpdate: (nextSession) => sessionUpdates.push(nextSession),
      onUserChange: (transition) => userChanges.push(transition.nextUserId),
    })

    controller.applySession(createSession({ id: 'user-a', email: 'a@example.com' }))
    controller.applySession(
      createSession({ id: 'user-a', email: 'a@example.com', refreshed: true }),
    )

    expect(sessionUpdates).toHaveLength(2)
    expect(userChanges).toEqual(['user-a'])
    expect(controller.getSession().user.refreshed).toBe(true)
  })

  it('tracks account changes for null, user switching, and anonymous-to-email transitions', () => {
    const userChanges = []
    const controller = createAuthSessionController({
      onUserChange: (transition) =>
        userChanges.push([transition.previousUserId, transition.nextUserId]),
    })

    controller.applySession(createSession({ id: 'user-a', email: 'a@example.com' }))
    controller.applySession(null)
    controller.applySession(createSession({ id: 'anon-a', is_anonymous: true }))
    controller.applySession(createSession({ id: 'email-b', email: 'b@example.com' }))

    expect(userChanges).toEqual([
      [null, 'user-a'],
      ['user-a', null],
      [null, 'anon-a'],
      ['anon-a', 'email-b'],
    ])
  })

  it('returns a generic restore error without leaking auth internals', async () => {
    const supabaseClient = {
      auth: {
        getSession: vi.fn(async () => ({
          data: { session: null },
          error: { message: 'internal auth detail' },
        })),
      },
    }

    await expect(restoreExistingSession(supabaseClient)).resolves.toEqual({
      session: null,
      errorMessage: '读取登录状态失败，请稍后重试。',
    })
  })

  it('sends email OTPs without a redirect and allows first-time email users', async () => {
    const signInWithOtp = vi.fn(async () => ({ error: null }))
    const supabaseClient = { auth: { signInWithOtp } }

    await expect(
      sendEmailOtp(supabaseClient, ' user@example.com '),
    ).resolves.toEqual({ ok: true, errorMessage: '' })

    expect(signInWithOtp).toHaveBeenCalledWith({
      email: 'user@example.com',
      options: {
        shouldCreateUser: true,
      },
    })
  })

  it('does not call Supabase when email OTP email validation fails', async () => {
    const signInWithOtp = vi.fn()
    const supabaseClient = { auth: { signInWithOtp } }

    await expect(sendEmailOtp(supabaseClient, 'bad')).resolves.toEqual(
      {
        ok: false,
        errorMessage: '请输入有效的邮箱地址。',
      },
    )
    expect(signInWithOtp).not.toHaveBeenCalled()
  })

  it('uses a generic email OTP send failure message', async () => {
    const supabaseClient = {
      auth: {
        signInWithOtp: vi.fn(async () => ({
          error: { message: 'user not found or provider disabled' },
        })),
      },
    }

    await expect(
      sendEmailOtp(supabaseClient, 'user@example.com'),
    ).resolves.toEqual({
      ok: false,
      errorMessage: '发送验证码失败，请稍后重试。',
    })
  })

  it('uses a generic email OTP send failure message when Supabase rejects', async () => {
    const supabaseClient = {
      auth: {
        signInWithOtp: vi.fn(async () => {
          throw new Error('network detail')
        }),
      },
    }

    await expect(sendEmailOtp(supabaseClient, 'user@example.com')).resolves.toEqual({
      ok: false,
      errorMessage: '发送验证码失败，请稍后重试。',
    })
  })

  it('validates eight-digit email OTPs before verification', () => {
    expect(validateEmailOtp('')).toBe('请输入 8 位验证码。')
    expect(validateEmailOtp('1234567')).toBe('请输入 8 位验证码。')
    expect(validateEmailOtp('123456789')).toBe('请输入 8 位验证码。')
    expect(validateEmailOtp('12a45678')).toBe('请输入 8 位验证码。')
    expect(validateEmailOtp(' 12345678 ')).toBe('')
  })

  it('verifies an email OTP and returns the established session', async () => {
    const session = createSession({ id: 'email-user', email: 'me@example.com' })
    const verifyOtp = vi.fn(async () => ({ data: { session }, error: null }))
    const supabaseClient = { auth: { verifyOtp } }

    await expect(
      verifyEmailOtp(supabaseClient, ' me@example.com ', ' 12345678 '),
    ).resolves.toEqual({ ok: true, errorMessage: '', session })

    expect(verifyOtp).toHaveBeenCalledWith({
      email: 'me@example.com',
      token: '12345678',
      type: 'email',
    })
  })

  it('does not call Supabase when the email OTP format is invalid', async () => {
    const verifyOtp = vi.fn()

    await expect(
      verifyEmailOtp({ auth: { verifyOtp } }, 'me@example.com', '1234567'),
    ).resolves.toEqual({
      ok: false,
      errorMessage: '请输入 8 位验证码。',
      session: null,
    })
    expect(verifyOtp).not.toHaveBeenCalled()
  })

  it('uses a generic email OTP verification failure message', async () => {
    const supabaseClient = {
      auth: {
        verifyOtp: vi.fn(async () => ({
          data: { session: null },
          error: { message: 'token expired' },
        })),
      },
    }

    await expect(
      verifyEmailOtp(supabaseClient, 'me@example.com', '12345678'),
    ).resolves.toEqual({
      ok: false,
      errorMessage: '验证码无效或已过期，请重新发送。',
      session: null,
    })
  })

  it('uses a generic email OTP verification failure message when Supabase rejects', async () => {
    const supabaseClient = {
      auth: {
        verifyOtp: vi.fn(async () => {
          throw new Error('network detail')
        }),
      },
    }

    await expect(
      verifyEmailOtp(supabaseClient, 'me@example.com', '12345678'),
    ).resolves.toEqual({
      ok: false,
      errorMessage: '验证码无效或已过期，请重新发送。',
      session: null,
    })
  })

  it('signs out with a generic failure message', async () => {
    await expect(
      signOutCurrentUser({
        auth: { signOut: vi.fn(async () => ({ error: null })) },
      }),
    ).resolves.toEqual({ ok: true, errorMessage: '' })

    await expect(
      signOutCurrentUser({
        auth: {
          signOut: vi.fn(async () => ({ error: { message: 'token detail' } })),
        },
      }),
    ).resolves.toEqual({
      ok: false,
      errorMessage: '退出登录失败，请稍后重试。',
    })
  })

  it('guards inventory loads against stale user responses', async () => {
    const rows = [{ id: 'batch-1' }]
    const query = Promise.resolve({ data: rows, error: null })
    query.select = vi.fn(() => query)
    query.eq = vi.fn(() => query)
    query.order = vi.fn(() => query)
    const supabaseClient = {
      from: vi.fn(() => query),
    }

    await expect(
      loadInventoryBatchesForSession({
        supabaseClient,
        session: createSession({ id: 'old-user' }),
        getCurrentUserId: () => 'new-user',
      }),
    ).resolves.toEqual({
      data: rows,
      error: null,
      stale: true,
    })
  })

  it('lets the current user inventory win when an older request returns later', async () => {
    const oldDeferred = createDeferred()
    const newDeferred = createDeferred()
    const queries = [
      createQueryFromPromise(oldDeferred.promise),
      createQueryFromPromise(newDeferred.promise),
    ]
    const supabaseClient = {
      from: vi.fn(() => queries.shift()),
    }
    let currentUserId = 'user-a'
    let appliedRows = []
    let appliedError = ''

    async function runLoad(session) {
      const result = await loadInventoryBatchesForSession({
        supabaseClient,
        session,
        getCurrentUserId: () => currentUserId,
      })

      if (!result.stale) {
        appliedRows = result.data
        appliedError = result.error?.message ?? ''
      }
    }

    const oldLoad = runLoad(createSession({ id: 'user-a' }))
    currentUserId = 'user-b'
    const newLoad = runLoad(createSession({ id: 'user-b' }))

    newDeferred.resolve({ data: [{ id: 'batch-b' }], error: null })
    await newLoad
    oldDeferred.resolve({
      data: [{ id: 'batch-a' }],
      error: { message: 'old user error' },
    })
    await oldLoad

    expect(appliedRows).toEqual([{ id: 'batch-b' }])
    expect(appliedError).toBe('')
  })

  it('counts down email OTP cooldown with fake timers and clears the interval', () => {
    vi.useFakeTimers()
    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval')
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval')
    let cooldownSeconds = 0
    const setCooldownSeconds = (nextValue) => {
      cooldownSeconds =
        typeof nextValue === 'function' ? nextValue(cooldownSeconds) : nextValue
    }

    const cleanup = startEmailOtpCooldown({ setCooldownSeconds })

    expect(cooldownSeconds).toBe(60)
    expect(setIntervalSpy).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(1000)
    expect(cooldownSeconds).toBe(59)

    vi.advanceTimersByTime(59_000)
    expect(cooldownSeconds).toBe(0)
    expect(clearIntervalSpy).toHaveBeenCalled()

    cleanup()
    expect(clearIntervalSpy).toHaveBeenCalled()

    vi.useRealTimers()
    setIntervalSpy.mockRestore()
    clearIntervalSpy.mockRestore()
  })

  it('does not start a cooldown when email OTP sending fails', async () => {
    vi.useFakeTimers()
    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval')
    const supabaseClient = {
      auth: {
        signInWithOtp: vi.fn(async () => ({
          error: { message: 'provider unavailable' },
        })),
      },
    }

    const result = await sendEmailOtp(supabaseClient, 'user@example.com')

    expect(result.ok).toBe(false)
    expect(setIntervalSpy).not.toHaveBeenCalled()

    vi.useRealTimers()
    setIntervalSpy.mockRestore()
  })

  it('keeps the email OTP resend cooldown at 60 seconds', () => {
    expect(EMAIL_OTP_COOLDOWN_SECONDS).toBe(60)
  })
})
