export default function ConfigNotice({ missingVariables }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg items-center px-5 py-12">
      <section className="w-full rounded-3xl bg-white p-6 shadow-card">
        <p className="mb-2 text-sm font-semibold text-amber">需要完成配置</p>
        <h1 className="text-2xl font-bold text-ink">还差一点就能开饭了</h1>
        <p className="mt-3 leading-7 text-slate-600">
          应用没有读取到 Supabase 配置。请复制
          <code className="mx-1 rounded bg-slate-100 px-1.5 py-0.5">.env.example</code>
          为
          <code className="mx-1 rounded bg-slate-100 px-1.5 py-0.5">.env.local</code>
          ，然后填写：
        </p>
        <ul className="mt-4 space-y-2">
          {missingVariables.map((variable) => (
            <li
              key={variable}
              className="rounded-xl bg-amber-50 px-4 py-3 font-mono text-sm text-amber-900"
            >
              缺少 {variable}
            </li>
          ))}
        </ul>
        <p className="mt-5 text-sm leading-6 text-slate-500">
          配置后请重启开发服务器。不要把真实密钥提交到 Git。
        </p>
      </section>
    </main>
  )
}

