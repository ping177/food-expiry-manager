import { useEffect, useRef, useState } from 'react'

function getCameraErrorMessage(error) {
  if (error?.name === 'NotAllowedError') {
    return '摄像头权限被拒绝。你仍然可以手动输入条形码。'
  }
  if (error?.name === 'NotFoundError') {
    return '没有找到可用摄像头。你仍然可以手动输入条形码。'
  }
  if (error?.name === 'NotReadableError') {
    return '摄像头暂时无法使用，可能正被其他应用占用。'
  }
  return '无法启动摄像头。你仍然可以手动输入条形码。'
}

export default function BarcodeScanner({ onDetected, onCancel }) {
  const videoRef = useRef(null)
  const controlsRef = useRef(null)
  const detectedRef = useRef(false)
  const [status, setStatus] = useState('正在请求摄像头权限…')
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    function stopCamera() {
      controlsRef.current?.stop()
      controlsRef.current = null

      const stream = videoRef.current?.srcObject
      if (stream?.getTracks) {
        stream.getTracks().forEach((track) => track.stop())
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
    }

    async function startScanner() {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        setError('当前浏览器环境不支持摄像头访问。请使用 HTTPS 或本地地址，并手动输入条形码。')
        setStatus('')
        return
      }

      try {
        const { BrowserMultiFormatReader } = await import('@zxing/browser')
        if (!active) return
        const reader = new BrowserMultiFormatReader()
        const controls = await reader.decodeFromConstraints(
          {
            audio: false,
            video: { facingMode: { ideal: 'environment' } },
          },
          videoRef.current,
          (result) => {
            if (!result || detectedRef.current || !active) return

            detectedRef.current = true
            setStatus('扫码成功，正在查询商品信息…')
            stopCamera()
            onDetected(result.getText())
          },
        )

        if (!active) {
          controls.stop()
          return
        }
        controlsRef.current = controls
        setStatus('正在扫码，请将商品条形码放入画面中。')
      } catch (cameraError) {
        if (!active) return
        stopCamera()
        setError(getCameraErrorMessage(cameraError))
        setStatus('')
      }
    }

    startScanner()

    return () => {
      active = false
      stopCamera()
    }
  }, [onDetected])

  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-950 p-3 text-white">
      <div className="overflow-hidden rounded-xl bg-black">
        <video
          ref={videoRef}
          className="aspect-[4/3] w-full object-cover"
          muted
          playsInline
        />
      </div>

      {status && <p className="mt-3 text-sm leading-6">{status}</p>}
      {error && (
        <p className="mt-3 rounded-xl bg-red-950/70 px-3 py-2 text-sm leading-6 text-red-100">
          {error}
        </p>
      )}

      <button
        className="mt-3 w-full rounded-xl bg-white px-4 py-3 font-semibold text-slate-800"
        type="button"
        onClick={onCancel}
      >
        取消扫码
      </button>
    </section>
  )
}
