import { useEffect, useState } from 'react'
import {
  EMAIL_OTP_COOLDOWN_SECONDS,
  validateEmail,
  validateEmailOtp,
} from '../lib/auth'

export default function AuthPanel({
  busy = false,
  cooldownSeconds = 0,
  error = '',
  message = '',
  onSendEmailOtp,
  onVerifyEmailOtp,
  pendingOtpEmail = '',
}) {
  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const [localError, setLocalError] = useState('')
  const isVerifying = Boolean(pendingOtpEmail)

  useEffect(() => {
    if (!error) return
    setLocalError('')
  }, [error])

  async function handleSendEmailOtp(event) {
    event.preventDefault()
    const validationError = validateEmail(email)
    if (validationError) {
      setLocalError(validationError)
      return
    }

    setLocalError('')
    await onSendEmailOtp(email)
  }

  async function handleVerifyEmailOtp(event) {
    event.preventDefault()
    const validationError = validateEmailOtp(token)
    if (validationError) {
      setLocalError(validationError)
      return
    }

    setLocalError('')
    await onVerifyEmailOtp(token)
  }

  async function handleResendEmailOtp() {
    if (busy || cooldownSeconds > 0) return

    setLocalError('')
    await onSendEmailOtp(pendingOtpEmail)
  }

  const sendDisabled = busy || cooldownSeconds > 0

  return (
    <main className="min-h-screen bg-cream px-4 py-10">
      <section className="mx-auto max-w-xl rounded-3xl bg-white p-6 shadow-card">
        <p className="text-xs font-semibold text-leaf">库存保质期管理</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">
          使用邮箱登录
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          登录后可以在同一邮箱下恢复账号，并为后续跨浏览器和手机使用做准备。
        </p>

        {isVerifying ? (
          <form className="mt-6 space-y-4" onSubmit={handleVerifyEmailOtp}>
            <p className="rounded-2xl bg-mint px-4 py-3 text-sm leading-6 text-leaf">
              验证码已发送到邮箱。
            </p>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                8 位验证码
              </span>
              <input
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-center text-lg tracking-[0.35em] text-ink placeholder:tracking-normal placeholder:text-slate-400"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={8}
                pattern="[0-9]{8}"
                type="text"
                value={token}
                placeholder="12345678"
                onChange={(event) => setToken(event.target.value.replace(/\D/g, ''))}
              />
            </label>

            {(localError || error) && (
              <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm leading-6 text-danger">
                {localError || error}
              </p>
            )}
            {message && (
              <p className="rounded-2xl bg-mint px-4 py-3 text-sm leading-6 text-leaf">
                {message}
              </p>
            )}

            <button
              className="w-full rounded-2xl bg-leaf px-5 py-4 text-center font-bold text-white shadow-card disabled:cursor-not-allowed disabled:opacity-60"
              disabled={busy}
              type="submit"
            >
              {busy ? '验证中…' : '验证登录'}
            </button>
            <button
              className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-3 text-center text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={sendDisabled}
              type="button"
              onClick={handleResendEmailOtp}
            >
              {cooldownSeconds > 0
                ? `${cooldownSeconds} 秒后可重发验证码`
                : '重新发送验证码'}
            </button>
          </form>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={handleSendEmailOtp}>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                邮箱
              </span>
              <input
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-ink placeholder:text-slate-400"
                inputMode="email"
                autoComplete="email"
                type="email"
                value={email}
                placeholder="you@example.com"
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>

            {(localError || error) && (
              <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm leading-6 text-danger">
                {localError || error}
              </p>
            )}
            {message && (
              <p className="rounded-2xl bg-mint px-4 py-3 text-sm leading-6 text-leaf">
                {message}
              </p>
            )}

            <button
              className="w-full rounded-2xl bg-leaf px-5 py-4 text-center font-bold text-white shadow-card disabled:cursor-not-allowed disabled:opacity-60"
              disabled={sendDisabled}
              type="submit"
            >
              {busy
                ? '发送中…'
                : cooldownSeconds > 0
                  ? `${cooldownSeconds} 秒后可重发验证码`
                  : '发送验证码'}
            </button>
          </form>
        )}

        <p className="mt-4 text-xs leading-5 text-slate-400">
          验证码有效期由 Supabase Auth 配置控制。本页面不会显示该邮箱是否已注册。
        </p>
        <p className="sr-only">
          验证码发送冷却时间为 {EMAIL_OTP_COOLDOWN_SECONDS} 秒。
        </p>
      </section>
    </main>
  )
}
