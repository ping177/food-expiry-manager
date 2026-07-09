import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { GET } from '../api/supabase-keepalive.js'

function request(authorization) {
  return new Request('https://example.test/api/supabase-keepalive', {
    headers: authorization ? { Authorization: authorization } : {},
  })
}

describe('supabase keepalive endpoint', () => {
  beforeEach(() => {
    vi.stubEnv('CRON_SECRET', 'test-cron-secret')
    vi.stubEnv('VITE_SUPABASE_URL', 'https://project.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('returns 401 for missing or incorrect authorization', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    for (const authorization of [undefined, 'Bearer wrong-secret']) {
      const response = await GET(request(authorization))
      expect(response.status).toBe(401)
      expect(await response.json()).toEqual({ ok: false })
    }
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('calls the RPC three times sequentially and returns 200', async () => {
    const consoleInfo = vi.spyOn(console, 'info').mockImplementation(() => {})
    let activeRequests = 0
    let maxActiveRequests = 0
    const fetchMock = vi.fn(async () => {
      activeRequests += 1
      maxActiveRequests = Math.max(maxActiveRequests, activeRequests)
      await Promise.resolve()
      activeRequests -= 1
      return { ok: true }
    })
    vi.stubGlobal('fetch', fetchMock)

    const response = await GET(request('Bearer test-cron-secret'))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      ok: true,
      successfulRequests: 3,
    })
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(maxActiveRequests).toBe(1)
    expect(consoleInfo).toHaveBeenCalledWith(
      'supabase_keepalive requests succeeded: 3',
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://project.supabase.co/rest/v1/rpc/keepalive_ping',
      expect.objectContaining({
        method: 'POST',
        body: '{}',
      }),
    )
  })

  it('returns 502 and stops when any RPC response is not successful', async () => {
    for (const failureRequest of [1, 2, 3]) {
      const fetchMock = vi.fn()
      for (let call = 1; call <= failureRequest; call += 1) {
        fetchMock.mockResolvedValueOnce({ ok: call !== failureRequest })
      }
      vi.stubGlobal('fetch', fetchMock)

      const response = await GET(request('Bearer test-cron-secret'))

      expect(response.status).toBe(502)
      expect(fetchMock).toHaveBeenCalledTimes(failureRequest)
    }
  })

  it('returns 502 when fetch throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')))

    const response = await GET(request('Bearer test-cron-secret'))

    expect(response.status).toBe(502)
    expect(await response.json()).toEqual({
      ok: false,
      successfulRequests: 0,
    })
  })

  it('does not expose credentials in the response or failure log', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))

    const response = await GET(request('Bearer test-cron-secret'))
    const output = JSON.stringify({
      response: await response.json(),
      logs: consoleError.mock.calls,
    })

    expect(output).not.toContain('test-cron-secret')
    expect(output).not.toContain('test-anon-key')
    expect(output).not.toContain('project.supabase.co')
  })
})
