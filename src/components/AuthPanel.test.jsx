import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import AuthPanel from './AuthPanel'

function renderAuthPanel(props = {}) {
  return renderToStaticMarkup(
    <AuthPanel
      onSendEmailOtp={vi.fn()}
      onVerifyEmailOtp={vi.fn()}
      {...props}
    />,
  )
}

describe('AuthPanel', () => {
  it('renders the email OTP request UI without a guest mode action', () => {
    const html = renderAuthPanel()

    expect(html).toContain('使用邮箱登录')
    expect(html).toContain('邮箱')
    expect(html).toContain('发送验证码')
    expect(html).not.toContain('以访客身份继续')
  })

  it('renders the email OTP verification UI after a code has been sent', () => {
    const html = renderAuthPanel({ pendingOtpEmail: 'me@example.com' })

    expect(html).toContain('验证码已发送到邮箱')
    expect(html).toContain('8 位验证码')
    expect(html).toContain('maxLength="8"')
    expect(html).toContain('验证登录')
    expect(html).toContain('inputMode="numeric"')
  })

  it('shows email OTP success and generic error states', () => {
    const html = renderAuthPanel({
      message: '验证码已发送到邮箱。',
      error: '验证码无效或已过期，请重新发送。',
    })

    expect(html).toContain('验证码已发送到邮箱。')
    expect(html).toContain('验证码无效或已过期，请重新发送。')
  })

  it('shows a submitting state while verifying an email OTP', () => {
    const html = renderAuthPanel({ busy: true, pendingOtpEmail: 'me@example.com' })

    expect(html).toContain('验证中…')
    expect(html).toContain('disabled=""')
  })

  it('disables email OTP resend during cooldown without disabling verification', () => {
    const html = renderAuthPanel({
      cooldownSeconds: 42,
      pendingOtpEmail: 'me@example.com',
    })

    expect(html).toContain('42 秒后可重发验证码')
    expect(html).toContain('验证登录')
    expect(html).toContain('disabled=""')
    expect(html).toContain('验证码发送冷却时间为 60 秒')
  })
})
