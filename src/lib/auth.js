export const EMAIL_OTP_COOLDOWN_SECONDS = 60

export function isAnonymousUser(user) {
  if (!user) return false

  return (
    user.is_anonymous === true ||
    user.app_metadata?.provider === 'anonymous' ||
    user.app_metadata?.providers?.includes?.('anonymous') ||
    user.identities?.some?.((identity) => identity.provider === 'anonymous') ===
      true
  )
}

export function getAccountStatus(session) {
  const user = session?.user
  if (!user) return { type: 'signed_out', label: '未登录' }
  if (isAnonymousUser(user)) {
    return { type: 'anonymous', label: '访客账号' }
  }

  return {
    type: 'email',
    label: user.email ? `邮箱账号已登录：${maskEmail(user.email)}` : '邮箱账号已登录',
  }
}

export function getSessionUserId(session) {
  return session?.user?.id ?? null
}

export function getSessionTransition(previousSession, nextSession) {
  const previousUserId = getSessionUserId(previousSession)
  const nextUserId = getSessionUserId(nextSession)

  return {
    previousUserId,
    nextUserId,
    userChanged: previousUserId !== nextUserId,
  }
}

export function createAuthSessionController({
  initialSession = null,
  onSessionUpdate = () => {},
  onUserChange = () => {},
} = {}) {
  let currentSession = initialSession

  return {
    getSession() {
      return currentSession
    },
    applySession(nextSession) {
      const transition = getSessionTransition(currentSession, nextSession)
      currentSession = nextSession
      onSessionUpdate(nextSession, transition)
      if (transition.userChanged) {
        onUserChange(transition)
      }
      return transition
    },
  }
}

export function startEmailOtpCooldown({
  setCooldownSeconds,
  setIntervalFn = globalThis.setInterval,
  clearIntervalFn = globalThis.clearInterval,
}) {
  let intervalId

  setCooldownSeconds(EMAIL_OTP_COOLDOWN_SECONDS)
  intervalId = setIntervalFn(() => {
    setCooldownSeconds((currentSeconds) => {
      if (currentSeconds <= 1) {
        clearIntervalFn(intervalId)
        return 0
      }

      return currentSeconds - 1
    })
  }, 1000)

  return () => clearIntervalFn(intervalId)
}

export function maskEmail(email) {
  const trimmedEmail = email.trim()
  const [name, domain] = trimmedEmail.split('@')
  if (!name || !domain) return ''

  const maskedName =
    name.length <= 1
      ? '*'
      : `${name[0]}${'*'.repeat(Math.min(name.length - 1, 3))}`
  return `${maskedName}@${domain}`
}

export function validateEmail(email) {
  const trimmedEmail = email.trim()
  if (!trimmedEmail) return '请输入邮箱地址。'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    return '请输入有效的邮箱地址。'
  }
  return ''
}

export async function restoreExistingSession(supabaseClient) {
  const {
    data: { session },
    error,
  } = await supabaseClient.auth.getSession()

  if (error) {
    return {
      session: null,
      errorMessage: '读取登录状态失败，请稍后重试。',
    }
  }

  return { session: session ?? null, errorMessage: '' }
}

export function validateEmailOtp(token) {
  return /^\d{8}$/.test(token.trim()) ? '' : '请输入 8 位验证码。'
}

export async function sendEmailOtp(supabaseClient, email) {
  const trimmedEmail = email.trim()
  const validationError = validateEmail(trimmedEmail)
  if (validationError) {
    return { ok: false, errorMessage: validationError }
  }

  let error
  try {
    const response = await supabaseClient.auth.signInWithOtp({
      email: trimmedEmail,
      options: {
        shouldCreateUser: true,
      },
    })
    error = response.error
  } catch {
    error = true
  }

  if (error) {
    return {
      ok: false,
      errorMessage: '发送验证码失败，请稍后重试。',
    }
  }

  return { ok: true, errorMessage: '' }
}

export async function verifyEmailOtp(supabaseClient, email, token) {
  const trimmedEmail = email.trim()
  const trimmedToken = token.trim()
  const tokenValidationError = validateEmailOtp(trimmedToken)
  if (tokenValidationError) {
    return { ok: false, errorMessage: tokenValidationError, session: null }
  }

  let session = null
  let error
  try {
    const response = await supabaseClient.auth.verifyOtp({
      email: trimmedEmail,
      token: trimmedToken,
      type: 'email',
    })
    session = response.data.session
    error = response.error
  } catch {
    error = true
  }

  if (error || !session) {
    return {
      ok: false,
      errorMessage: '验证码无效或已过期，请重新发送。',
      session: null,
    }
  }

  return { ok: true, errorMessage: '', session }
}

export async function signOutCurrentUser(supabaseClient) {
  const { error } = await supabaseClient.auth.signOut()
  if (error) {
    return {
      ok: false,
      errorMessage: '退出登录失败，请稍后重试。',
    }
  }

  return { ok: true, errorMessage: '' }
}

export function createInventoryBatchesQuery(supabaseClient) {
  return supabaseClient
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
}

export async function loadInventoryBatchesForSession({
  supabaseClient,
  session,
  getCurrentUserId,
}) {
  const userId = getSessionUserId(session)
  if (!userId) {
    return { data: [], error: null, stale: true }
  }

  const { data, error } = await createInventoryBatchesQuery(supabaseClient)

  return {
    data: data ?? [],
    error,
    stale: getCurrentUserId() !== userId,
  }
}
