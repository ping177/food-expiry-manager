const RPC_COUNT = 3
const REQUEST_TIMEOUT_MS = 8_000

export async function GET(request) {
  const secret = process.env.CRON_SECRET
  if (
    !secret ||
    request.headers.get('authorization') !== `Bearer ${secret}`
  ) {
    return Response.json({ ok: false }, { status: 401 })
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY
  if (!supabaseUrl || !anonKey) {
    console.error('supabase_keepalive request failed: 0')
    return Response.json(
      { ok: false, successfulRequests: 0 },
      { status: 502 },
    )
  }

  const rpcUrl = `${supabaseUrl.replace(/\/+$/, '')}/rest/v1/rpc/keepalive_ping`
  let successfulRequests = 0

  for (let requestNumber = 1; requestNumber <= RPC_COUNT; requestNumber += 1) {
    try {
      const rpcResponse = await fetch(rpcUrl, {
        method: 'POST',
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
          'Content-Type': 'application/json',
        },
        body: '{}',
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })

      if (!rpcResponse.ok) {
        console.error(`supabase_keepalive request failed: ${requestNumber}`)
        return Response.json(
          { ok: false, successfulRequests },
          { status: 502 },
        )
      }
    } catch {
      console.error(`supabase_keepalive request failed: ${requestNumber}`)
      return Response.json(
        { ok: false, successfulRequests },
        { status: 502 },
      )
    }

    successfulRequests += 1
  }

  console.info('supabase_keepalive requests succeeded: 3')
  return Response.json({ ok: true, successfulRequests })
}
