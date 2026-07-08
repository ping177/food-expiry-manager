import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import AuthPanel from './AuthPanel'

function renderAuthPanel(props = {}) {
  return renderToStaticMarkup(
    <AuthPanel onSendMagicLink={vi.fn()} {...props} />,
  )
}

describe('AuthPanel', () => {
  it('renders the email magic link sign-in UI without a guest mode action', () => {
    const html = renderAuthPanel()

    expect(html).toContain('使用邮箱登录')
    expect(html).toContain('邮箱')
    expect(html).toContain('发送登录链接')
    expect(html).not.toContain('以访客身份继续')
  })

  it('shows magic link success and generic error states', () => {
    const html = renderAuthPanel({
      message: '登录链接已发送，请检查邮箱。',
      error: '发送登录链接失败，请稍后重试。',
    })

    expect(html).toContain('登录链接已发送，请检查邮箱。')
    expect(html).toContain('发送登录链接失败，请稍后重试。')
  })

  it('disables the button while sending', () => {
    const html = renderAuthPanel({ busy: true })

    expect(html).toContain('发送中…')
    expect(html).toContain('disabled=""')
  })

  it('disables resend during cooldown', () => {
    const html = renderAuthPanel({ cooldownSeconds: 42 })

    expect(html).toContain('42 秒后可重发')
    expect(html).toContain('disabled=""')
    expect(html).toContain('登录链接发送冷却时间为 60 秒')
  })
})
