import { useEffect, useRef, useState } from 'react'
import { validateProductImageFile } from '../lib/productImage'

export default function ProductImagePicker({ onChange, disabled = false }) {
  const [error, setError] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')
  const cameraRef = useRef(null)
  const albumRef = useRef(null)

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  function choose(file) {
    const validationError = validateProductImageFile(file)
    if (validationError) {
      setError(validationError)
      return
    }
    setError('')
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current)
      return URL.createObjectURL(file)
    })
    onChange(file)
  }

  function clear() {
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current)
      return ''
    })
    if (cameraRef.current) cameraRef.current.value = ''
    if (albumRef.current) albumRef.current.value = ''
    setError('')
    onChange(null)
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <button className="rounded-xl border border-leaf px-3 py-2.5 text-sm font-semibold text-leaf disabled:opacity-50" disabled={disabled} type="button" onClick={() => cameraRef.current?.click()}>
          拍照
        </button>
        <button className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-50" disabled={disabled} type="button" onClick={() => albumRef.current?.click()}>
          从相册选择
        </button>
      </div>
      <input ref={cameraRef} accept="image/*" capture="environment" className="sr-only" type="file" onChange={(event) => choose(event.target.files?.[0])} />
      <input ref={albumRef} accept="image/*" className="sr-only" type="file" onChange={(event) => choose(event.target.files?.[0])} />
      {previewUrl && (
        <div className="flex items-start gap-3">
          <img alt="待上传商品图片预览" className="h-28 w-28 rounded-2xl border border-slate-100 object-cover" src={previewUrl} />
          <button className="rounded-xl px-2 py-2 text-sm font-semibold text-slate-500" disabled={disabled} type="button" onClick={clear}>删除待上传图片</button>
        </div>
      )}
      {error && <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">{error}</p>}
    </div>
  )
}
